"""
Room Matcher - Maps DIALux room data to Revit model rooms.

Uses fuzzy matching and spatial analysis to correlate rooms from the
DIALux report with rooms in the Revit BIM model, handling naming
differences and level assignments.
"""

import re
import difflib
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field


@dataclass
class RevitRoom:
    """Representation of a room in the Revit model."""
    element_id: int
    name: str
    number: str = ""
    level: str = ""
    area: float = 0.0
    perimeter: float = 0.0
    volume: float = 0.0
    boundaries: List[Tuple[float, float]] = field(default_factory=list)
    # Normalized name for matching
    normalized_name: str = ""
    confidence: float = 0.0


@dataclass
class RoomFixtureMap:
    """Mapping between a DIALux room and a Revit room with fixtures."""
    dialux_room_name: str
    revit_room_name: str
    revit_element_id: int
    match_score: float
    fixtures: List[Dict[str, Any]] = field(default_factory=list)
    
    # Spatial data
    room_area: float = 0.0
    room_center: Tuple[float, float] = (0.0, 0.0)
    origin: Tuple[float, float] = (0.0, 0.0)


@dataclass
class MatchResult:
    """Overall room matching result."""
    matched: List[RoomFixtureMap]
    unmatched_dialux: List[str]
    unmatched_revit: List[str]
    total_fixtures: int
    total_rooms: int
    match_rate: float  # percentage of rooms matched


class RoomMatcher:
    """
    Matches DIALux room names to Revit room elements.
    
    Strategies used:
    1. Exact name match (case-insensitive)
    2. Fuzzy string matching with difflib
    3. Room number matching
    4. Area-based matching (within tolerance)
    5. Level-based filtering
    """

    # Common room name normalization rules
    NORMALIZE_RULES = [
        (r'\s+', ''),  # Remove all spaces
        (r'[._\-]', ''),  # Remove separators
        (r'[°º]', ''),  # Remove degree symbols
        (r'\(.*?\)', ''),  # Remove parenthetical content
    ]

    # Room number patterns
    ROOM_NUMBER_PATTERN = re.compile(r'^(?:Room\s*#?|Rm\.?\s*|Room\s*)(\d+[A-Z]?)', re.IGNORECASE)
    ROOM_NUMBER_STANDALONE = re.compile(r'^(\d{1,4}[A-Z]?)$')

    def __init__(self, fuzzy_threshold: float = 0.60, area_tolerance: float = 0.15):
        """
        Initialize the room matcher.
        
        Args:
            fuzzy_threshold: Minimum fuzzy match score (0.0-1.0).
            area_tolerance: Maximum area difference ratio (0.0-1.0).
        """
        self.fuzzy_threshold = fuzzy_threshold
        self.area_tolerance = area_tolerance
        self._revit_rooms: List[RevitRoom] = []
        self._dialux_rooms: List[Dict[str, Any]] = []

    def load_revit_rooms(self, rooms: List[Dict[str, Any]]):
        """
        Load Revit room data for matching.
        
        Args:
            rooms: List of dictionaries with keys: element_id, name, number,
                   level, area, perimeter, volume.
        """
        self._revit_rooms = []
        for r in rooms:
            revit_room = RevitRoom(
                element_id=r.get("element_id", 0),
                name=r.get("name", ""),
                number=r.get("number", ""),
                level=r.get("level", ""),
                area=r.get("area", 0.0),
                perimeter=r.get("perimeter", 0.0),
                volume=r.get("volume", 0.0),
                boundaries=r.get("boundaries", []),
            )
            revit_room.normalized_name = self._normalize_name(revit_room.name)
            self._revit_rooms.append(revit_room)

    def load_dialux_rooms(self, rooms: List[Dict[str, Any]]):
        """
        Load DIALux room data for matching.
        
        Args:
            rooms: List of room dictionaries from parsed DIALux report.
        """
        self._dialux_rooms = rooms

    def match_rooms(self) -> MatchResult:
        """
        Perform room matching between DIALux and Revit data.
        
        Returns:
            MatchResult with matched pairs, unmatched rooms, and statistics.
        """
        matched = []
        used_dialux = set()
        used_revit = set()

        # Pass 1: Exact matches
        dialux_normalized = {}
        for i, dr in enumerate(self._dialux_rooms):
            norm = self._normalize_name(dr.get("name", ""))
            dialux_normalized[norm] = i

        for j, rr in enumerate(self._revit_rooms):
            if rr.normalized_name in dialux_normalized:
                idx = dialux_normalized[rr.normalized_name]
                dr = self._dialux_rooms[idx]
                if idx not in used_dialux and j not in used_revit:
                    mapping = self._create_mapping(dr, rr, score=1.0)
                    matched.append(mapping)
                    used_dialux.add(idx)
                    used_revit.add(j)

        # Pass 2: Fuzzy matches
        for i, dr in enumerate(self._dialux_rooms):
            if i in used_dialux:
                continue
            best_match = (None, -1, 0.0)  # (revit_idx, score, area_score)
            
            for j, rr in enumerate(self._revit_rooms):
                if j in used_revit:
                    continue
                
                # String similarity
                str_score = difflib.SequenceMatcher(
                    None, 
                    self._normalize_name(dr.get("name", "")),
                    rr.normalized_name
                ).ratio()
                
                # Area similarity (bonus)
                area_score = 0.0
                if dr.get("area", 0) > 0 and rr.area > 0:
                    ratio = min(dr["area"], rr.area) / max(dr["area"], rr.area)
                    if ratio >= (1 - self.area_tolerance):
                        area_score = (ratio - (1 - self.area_tolerance)) / self.area_tolerance
                
                # Level match bonus
                level_bonus = 0.0
                dr_level = dr.get("level", "").lower()
                rr_level = rr.level.lower()
                if dr_level and rr_level and dr_level == rr_level:
                    level_bonus = 0.10
                
                combined = str_score + (area_score * 0.2) + level_bonus
                if combined > best_match[2] and str_score >= self.fuzzy_threshold:
                    best_match = (j, combined, str_score)

            if best_match[0] is not None:
                j = best_match[0]
                rr = self._revit_rooms[j]
                dr = self._dialux_rooms[i]
                mapping = self._create_mapping(dr, rr, score=best_match[2])
                matched.append(mapping)
                used_dialux.add(i)
                used_revit.add(j)

        # Pass 3: Room number matching
        for i, dr in enumerate(self._dialux_rooms):
            if i in used_dialux:
                continue
            dr_number = self._extract_room_number(dr.get("name", ""))
            if not dr_number:
                continue
            for j, rr in enumerate(self._revit_rooms):
                if j in used_revit:
                    continue
                if rr.number == dr_number:
                    mapping = self._create_mapping(dr, rr, score=0.85)
                    matched.append(mapping)
                    used_dialux.add(i)
                    used_revit.add(j)
                    break

        # Build result
        unmatched_dialux = [
            dr.get("name", "") for i, dr in enumerate(self._dialux_rooms)
            if i not in used_dialux
        ]
        unmatched_revit = [
            rr.name for j, rr in enumerate(self._revit_rooms)
            if j not in used_revit
        ]
        total_fixtures = sum(
            sum(f.get("quantity", 0) for f in m.fixtures)
            for m in matched
        )

        return MatchResult(
            matched=matched,
            unmatched_dialux=unmatched_dialux,
            unmatched_revit=unmatched_revit,
            total_fixtures=total_fixtures,
            total_rooms=len(self._dialux_rooms),
            match_rate=len(matched) / max(len(self._dialux_rooms), 1),
        )

    def _create_mapping(
        self, dialux_room: Dict[str, Any], revit_room: RevitRoom, score: float
    ) -> RoomFixtureMap:
        """Create a room mapping between DIALux and Revit."""
        fixtures = []
        for lum in dialux_room.get("luminaires", []):
            fixtures.append({
                "name": lum.get("name", ""),
                "manufacturer": lum.get("manufacturer", ""),
                "quantity": lum.get("quantity", 1),
                "positions": lum.get("relative_positions", []),
            })

        # Calculate room center from boundaries
        center = (0.0, 0.0)
        origin = (0.0, 0.0)
        if revit_room.boundaries and len(revit_room.boundaries) >= 3:
            xs = [p[0] for p in revit_room.boundaries]
            ys = [p[1] for p in revit_room.boundaries]
            center = (sum(xs) / len(xs), sum(ys) / len(ys))
            origin = (min(xs), min(ys))

        return RoomFixtureMap(
            dialux_room_name=dialux_room.get("name", ""),
            revit_room_name=revit_room.name,
            revit_element_id=revit_room.element_id,
            match_score=score,
            fixtures=fixtures,
            room_area=revit_room.area,
            room_center=center,
            origin=origin,
        )

    def _normalize_name(self, name: str) -> str:
        """Normalize a room name for comparison."""
        result = name.strip()
        for pattern, replacement in self.NORMALIZE_RULES:
            result = re.sub(pattern, replacement, result)
        return result.lower()

    def _extract_room_number(self, name: str) -> Optional[str]:
        """Extract room number from a room name string."""
        match = self.ROOM_NUMBER_PATTERN.search(name)
        if match:
            return match.group(1)
        match = self.ROOM_NUMBER_STANDALONE.match(name)
        if match:
            return match.group(1)
        return None

    def get_match_report(self, result: MatchResult) -> Dict[str, Any]:
        """Generate a detailed match report."""
        return {
            "summary": {
                "total_dialux_rooms": result.total_rooms,
                "matched_rooms": len(result.matched),
                "unmatched_dialux": len(result.unmatched_dialux),
                "unmatched_revit": len(result.unmatched_revit),
                "match_rate": f"{result.match_rate:.1%}",
                "total_fixtures": result.total_fixtures,
            },
            "matched": [
                {
                    "dialux_room": m.dialux_room_name,
                    "revit_room": m.revit_room_name,
                    "revit_element_id": m.revit_element_id,
                    "match_score": m.match_score,
                    "fixture_count": sum(f["quantity"] for f in m.fixtures),
                }
                for m in result.matched
            ],
            "unmatched_dialux_rooms": result.unmatched_dialux,
            "unmatched_revit_rooms": result.unmatched_revit,
        }
