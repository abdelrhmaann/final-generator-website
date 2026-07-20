"""
Fixture Extractor - Extracts and classifies lighting fixture data.

Handles the extraction of fixture types, quantities, and spatial positions
from parsed DIALux report data. Includes fuzzy matching to correlate
DIALux luminaire names with Revit family names.
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import difflib


@dataclass
class FixtureData:
    """Normalized fixture data ready for Revit placement."""
    # Source data from DIALux
    dialux_name: str
    manufacturer: str = ""
    model: str = ""
    wattage: float = 0.0
    luminous_flux: float = 0.0
    quantity: int = 0
    
    # Revit mapping
    revit_family_name: str = ""
    revit_type_name: str = ""
    revit_family_id: str = ""
    
    # Spatial data
    room_name: str = ""
    relative_positions: List[Tuple[float, float]] = field(default_factory=list)
    
    # Classification
    fixture_type: str = "recessed"  # recessed, surface, pendant, wall, track
    beam_angle: float = 0.0
    color_temperature: str = ""  # e.g., "4000K", "3000K"
    ip_rating: str = ""
    
    # Metadata
    confidence: float = 0.0  # 0-1 confidence in fixture type classification
    match_score: float = 0.0  # 0-1 score for Revit family match


# Known luminaire name patterns for automatic classification
LUMINAIRE_PATTERNS = [
    # Pattern, fixture_type, beam_angle
    (r"(downlight|down.?light|recessed|down.?hole)", "recessed", 60.0),
    (r"(spot|spotlight|accent)", "recessed", 36.0),
    (r"(wall.?wash|wallwash|wall ?wash)", "wall", 45.0),
    (r"(wall.?sconce|sconce|bracket)", "wall", 90.0),
    (r"(pendant|chandelier|hanging)", "pendant", 360.0),
    (r"(surface.?mount|surface.?moun)", "surface", 60.0),
    (r"(track.?light|trackhead)", "track", 30.0),
    (r"(flood.?light|floodlight)", "recessed", 120.0),
    (r"(linear|strip.?light|led.?strip)", "surface", 120.0),
    (r"(panel|troffer|lay.?in)", "recessed", 120.0),
    (r"(high.?bay|high.?bay)", "pendant", 90.0),
    (r"(low.?bay|low.?bay)", "surface", 90.0),
    (r"(exit.?sign|emergency.?light)", "surface", 180.0),
    (r"(indicator|marker.?light)", "wall", 360.0),
]

# Common color temperature indicators
CT_PATTERNS = [
    (r"(\d{3,4})\s*[Kk]", "color_temperature"),
    (r"(warm\s*white)", "2700K"),
    (r"(neutral\s*white)", "4000K"),
    (r"(cool\s*white)", "6500K"),
    (r"(daylight)", "5000K"),
]

# IP rating patterns
IP_PATTERN = re.compile(r"IP\s*(\d{2})", re.IGNORECASE)


class FixtureExtractor:
    """
    Extracts and classifies fixture data from parsed DIALux report data.
    
    Performs:
    - Luminaire name normalization and classification
    - Fixture type detection (recessed, pendant, wall, surface, track)
    - Revit family name matching using fuzzy string matching
    - Coordinate extraction and validation
    - Quantity verification
    """

    def __init__(self):
        self.fixtures: List[FixtureData] = []
        self._revit_families: Dict[str, str] = {}  # name -> family_name mapping
        self._fuzzy_threshold = 0.65

    def set_revit_families(self, families: Dict[str, str]):
        """
        Set available Revit lighting fixture families for matching.
        
        Args:
            families: Dictionary mapping family names to their IDs.
        """
        self._revit_families = families

    def set_fuzzy_threshold(self, threshold: float):
        """Set the minimum fuzzy match score threshold (0.0-1.0)."""
        self._fuzzy_threshold = max(0.0, min(1.0, threshold))

    def extract_from_parsed_data(self, parsed_data: Dict[str, Any]) -> List[FixtureData]:
        """
        Extract fixture data from parsed DIALux report data.
        
        Args:
            parsed_data: Output from DialuxPDFParser.parse() or similar.
            
        Returns:
            List of FixtureData objects ready for Revit placement.
        """
        self.fixtures = []
        rooms = parsed_data.get("rooms", [])
        
        for room in rooms:
            room_name = room.get("name", "Unknown")
            room_level = room.get("level", "")
            luminaires = room.get("luminaires", [])
            
            for lum in luminaires:
                fixture = self._create_fixture(
                    lum_name=lum.get("name", ""),
                    manufacturer=lum.get("manufacturer", ""),
                    model=lum.get("model", ""),
                    wattage=lum.get("wattage", 0),
                    luminous_flux=lum.get("luminous_flux", 0),
                    quantity=lum.get("quantity", 1),
                    room_name=room_name,
                    relative_positions=lum.get("relative_positions", []),
                    room_level=room_level,
                )
                if fixture:
                    self.fixtures.append(fixture)

        return self.fixtures

    def _create_fixture(
        self,
        lum_name: str,
        manufacturer: str,
        model: str,
        wattage: float,
        luminous_flux: float,
        quantity: int,
        room_name: str,
        relative_positions: List[Tuple[float, float]],
        room_level: str = "",
    ) -> Optional[FixtureData]:
        """Create a FixtureData object from raw luminaire data."""
        if not lum_name or quantity < 1:
            return None

        fixture = FixtureData(
            dialux_name=lum_name,
            manufacturer=manufacturer,
            model=model,
            wattage=wattage,
            luminous_flux=luminous_flux,
            quantity=quantity,
            room_name=room_name,
            relative_positions=relative_positions,
        )

        # Classify fixture type
        fixture.fixture_type = self._classify_fixture_type(lum_name)
        
        # Extract color temperature
        fixture.color_temperature = self._extract_color_temperature(lum_name)
        
        # Extract IP rating
        fixture.ip_rating = self._extract_ip_rating(lum_name)
        
        # Extract beam angle from pattern
        fixture.beam_angle = self._extract_beam_angle(lum_name)

        # Generate Revit family name suggestion
        fixture.revit_family_name = self._generate_revit_name(fixture)
        fixture.revit_type_name = f"{fixture.revit_family_name}_{fixture.fixture_type}"

        # Match against available Revit families
        if self._revit_families:
            match_name, score = self._fuzzy_match_revit(fixture)
            if match_name and score >= self._fuzzy_threshold:
                fixture.revit_family_name = match_name
                fixture.revit_family_id = self._revit_families.get(match_name, "")
                fixture.match_score = score

        # Calculate confidence
        fixture.confidence = self._calculate_confidence(fixture)

        return fixture

    def _classify_fixture_type(self, name: str) -> str:
        """Classify the fixture type based on its name."""
        name_lower = name.lower()
        for pattern, fixture_type, _ in LUMINAIRE_PATTERNS:
            if re.search(pattern, name_lower):
                return fixture_type
        return "recessed"  # Default to recessed

    def _extract_color_temperature(self, name: str) -> str:
        """Extract color temperature from luminaire name."""
        for pattern, default_value in CT_PATTERNS:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                if pattern.startswith(r"(\d"):
                    return f"{match.group(1)}K"
                return default_value
        return ""

    def _extract_ip_rating(self, name: str) -> str:
        """Extract IP rating from luminaire name."""
        match = IP_PATTERN.search(name)
        if match:
            return f"IP{match.group(1)}"
        return ""

    def _extract_beam_angle(self, name: str) -> float:
        """Extract beam angle from luminaire name if present."""
        match = re.search(r'(\d{2,3})\s*[°º]?\s*beam', name, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return 0.0

    def _generate_revit_name(self, fixture: FixtureData) -> str:
        """Generate a suggested Revit family name from fixture data."""
        parts = []
        if fixture.manufacturer:
            parts.append(fixture.manufacturer)
        # Use the first meaningful word from the name
        name_words = fixture.dialux_name.split()
        if name_words:
            # Skip common manufacturer prefixes
            skip = {"led", "ip", "ce", "ip65", "ip44", "ip20", "w", "kw"}
            meaningful = [w for w in name_words if w.lower() not in skip]
            if meaningful:
                parts.append(meaningful[0])
        # Add wattage if available
        if fixture.wattage > 0:
            parts.append(f"{int(fixture.wattage)}W")
        
        return "_".join(parts) if parts else fixture.dialux_name.replace(" ", "_")

    def _fuzzy_match_revit(self, fixture: FixtureData) -> Tuple[str, float]:
        """Find the best matching Revit family using fuzzy string matching."""
        if not self._revit_families:
            return ("", 0.0)

        best_match = ("", 0.0)
        search_strings = [
            fixture.dialux_name,
            fixture.revit_family_name,
            fixture.manufacturer + " " + fixture.dialux_name,
        ]

        for search_str in search_strings:
            search_lower = search_str.lower()
            for family_name in self._revit_families:
                family_lower = family_name.lower()
                # Use difflib for fuzzy matching
                ratio = difflib.SequenceMatcher(
                    None, search_lower, family_lower
                ).ratio()
                # Also check if one contains the other
                if family_lower in search_lower or search_lower in family_lower:
                    ratio = max(ratio, 0.75)
                if ratio > best_match[1]:
                    best_match = (family_name, ratio)

        return best_match

    def _calculate_confidence(self, fixture: FixtureData) -> float:
        """Calculate confidence score for fixture classification."""
        score = 0.0
        # Has positions
        if fixture.relative_positions:
            score += 0.25
        # Has quantity
        if fixture.quantity > 0:
            score += 0.25
        # Has room assignment
        if fixture.room_name:
            score += 0.15
        # Has manufacturer
        if fixture.manufacturer:
            score += 0.15
        # Has Revit match
        if fixture.match_score > 0.5:
            score += 0.20
        # Has wattage
        if fixture.wattage > 0:
            score += 0.10
        return min(score, 1.0)

    def get_fixtures_by_room(self, room_name: str) -> List[FixtureData]:
        """Get all fixtures assigned to a specific room."""
        return [f for f in self.fixtures if f.room_name.lower() == room_name.lower()]

    def get_fixtures_by_type(self, fixture_type: str) -> List[FixtureData]:
        """Get all fixtures of a specific type."""
        return [f for f in self.fixtures if f.fixture_type == fixture_type]

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of all extracted fixtures."""
        type_counts = {}
        room_counts = {}
        total_quantity = 0
        for f in self.fixtures:
            type_counts[f.fixture_type] = type_counts.get(f.fixture_type, 0) + f.quantity
            room_counts[f.room_name] = room_counts.get(f.room_name, 0) + f.quantity
            total_quantity += f.quantity
        
        return {
            "total_fixtures": len(self.fixtures),
            "total_quantity": total_quantity,
            "by_type": type_counts,
            "by_room": room_counts,
            "unique_names": list(set(f.dialux_name for f in self.fixtures)),
        }

    def export_to_json(self, output_path: str):
        """Export fixture data to JSON for downstream processing."""
        data = {
            "fixtures": [
                {
                    "dialux_name": f.dialux_name,
                    "manufacturer": f.manufacturer,
                    "model": f.model,
                    "wattage": f.wattage,
                    "luminous_flux": f.luminous_flux,
                    "quantity": f.quantity,
                    "revit_family_name": f.revit_family_name,
                    "revit_type_name": f.revit_type_name,
                    "fixture_type": f.fixture_type,
                    "beam_angle": f.beam_angle,
                    "color_temperature": f.color_temperature,
                    "ip_rating": f.ip_rating,
                    "room_name": f.room_name,
                    "relative_positions": f.relative_positions,
                    "confidence": f.confidence,
                    "match_score": f.match_score,
                }
                for f in self.fixtures
            ],
            "summary": self.get_summary(),
        }
        Path(output_path).write_text(json.dumps(data, indent=2))
        return output_path
