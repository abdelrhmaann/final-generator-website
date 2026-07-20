"""
DIALux Fixture Distributor - pyRevit Extension Script
=====================================================

This script can be placed in a pyRevit extension bundle folder to run
directly from the Revit ribbon.

Installation:
    Copy this entire bundle folder to:
    %AppData%/pyRevit/extensions/

    Folder structure:
        DIALuxRevit.extension/
        ├── extension.json
        └── DIALuxDistributor.script/
            ├── dialux_distributor.py   (this file)
            └── dialux_distributor.pushbutton/
                ├── dialux_distributor.py   (copy of this file)
                └── script_config.yaml
"""

# -*- coding: utf-8 -*-
__title__ = "DIALux\nDistributor"
__author__ = "Manus AI"
__doc__ = "Import lighting fixtures from DIALux reports into Revit rooms."

import sys
import os
import json
import difflib
from datetime import datetime

import Autodesk.Revit.DB as DB
from Autodesk.Revit.DB import (
    Transaction, TransactionGroup, SubTransaction,
    FamilyInstance, FamilySymbol, FilteredElementCollector,
    BuiltInCategory, BuiltInParameter,
    Room, SpatialElement, ElementId,
    XYZ, Level,
)
from Autodesk.Revit.DB.Electrical import *
from Autodesk.Revit.UI import TaskDialog, TaskDialogCommonButtons, TaskDialogResult
from Autodesk.Revit.UI.Selection import ObjectType

try:
    from pyrevit import revit, forms, script
    output = script.get_output()
    doc = revit.doc
    uidoc = revit.uidoc
except ImportError:
    # Fallback for non-pyRevit environments
    doc = __revit__.ActiveUIDocument.Document
    uidoc = __revit__.ActiveUIDocument
    output = None

# ============================================================
# CONFIGURATION
# ============================================================

CONFIG = {
    "mounting_height": 2.5,       # meters above floor level
    "default_level_offset": 0.0,  # additional offset from floor
    "skip_existing": True,        # skip fixtures that already exist
    "proximity_tolerance": 0.5,   # feet - distance tolerance for duplicates
    "round_to_mm": True,          # round coordinates to nearest mm
    "auto_generate_grid": True,   # generate grid layout if no positions available
}

# ============================================================
# FIXTURE FAMILY RESOLVER
# ============================================================

class FamilyResolver:
    """Resolves DIALux fixture names to Revit FamilySymbol elements."""
    
    def __init__(self, doc):
        self.doc = doc
        self._cache = {}
        self._load_all_lighting_families()
    
    def _load_all_lighting_families(self):
        """Load all lighting fixture families in the project."""
        collector = FilteredElementCollector(self.doc)\
            .OfCategory(BuiltInCategory.OST_LightingFixtures)\
            .OfClass(FamilyInstance)
        
        for fi in collector:
            symbol = fi.Symbol
            if symbol and symbol.Id.IntegerValue not in self._cache:
                self._cache[symbol.Id.IntegerValue] = {
                    "name": symbol.Name,
                    "family": symbol.Family.Name,
                    "element": symbol,
                }
    
    def find_family(self, fixture_name, fixture_type="recessed"):
        """Find the best matching Revit family for a fixture name."""
        if not fixture_name:
            return None
            
        fixture_lower = fixture_name.lower().strip()
        
        # Exact match
        for sym_id, info in self._cache.items():
            if info["name"].lower() == fixture_lower:
                return info["element"]
            if info["family"].lower() == fixture_lower:
                return info["element"]
        
        # Containment check (higher priority)
        for sym_id, info in self._cache.items():
            if fixture_lower in info["name"].lower():
                return info["element"]
            if info["name"].lower() in fixture_lower:
                return info["element"]
        
        # Fuzzy match
        best_match = None
        best_score = 0.0
        
        for sym_id, info in self._cache.items():
            score = difflib.SequenceMatcher(
                None, fixture_lower, info["name"].lower()
            ).ratio()
            family_score = difflib.SequenceMatcher(
                None, fixture_lower, info["family"].lower()
            ).ratio()
            max_score = max(score, family_score)
            
            # Boost score if words are contained
            if fixture_lower in info["name"].lower() or \
               info["name"].lower() in fixture_lower:
                max_score = max(max_score, 0.75)
            
            if max_score > best_score:
                best_score = max_score
                best_match = info["element"]
        
        if best_match and best_score >= 0.4:
            return best_match
        
        # Type-based fallback
        type_keywords = {
            "recessed": ["downlight", "recessed", "panel", "troffer"],
            "surface": ["surface", "mount"],
            "pendant": ["pendant", "hanging", "chandelier"],
            "wall": ["wall", "sconce", "bracket"],
            "track": ["track", "rail"],
        }
        
        keywords = type_keywords.get(fixture_type, ["downlight"])
        for sym_id, info in self._cache.items():
            name_lower = info["name"].lower()
            for kw in keywords:
                if kw in name_lower:
                    return info["element"]
        
        return None
    
    def get_available_families(self):
        """Get list of all available lighting families."""
        return [
            {"name": info["name"], "family": info["family"]}
            for info in self._cache.values()
        ]


# ============================================================
# FIXTURE PLACEMENT ENGINE
# ============================================================

class FixturePlacer:
    """Places lighting fixtures into Revit rooms based on DIALux data."""
    
    def __init__(self, doc, resolver):
        self.doc = doc
        self.resolver = resolver
        self.placed_count = 0
        self.skipped_count = 0
        self.error_count = 0
        self.log_entries = []
    
    def place_fixtures_from_file(self, json_path):
        """Load fixture data from JSON and place fixtures."""
        with open(json_path, "r") as f:
            data = json.load(f)
        
        mappings = data.get("room_mappings", data.get("mappings", []))
        if not mappings:
            return self._get_results()
        
        for mapping in mappings:
            self._place_in_mapping(mapping)
        
        return self._get_results()
    
    def _place_in_mapping(self, mapping):
        """Place fixtures for a single room mapping."""
        # Get room element
        room = self._get_room_element(mapping.get("revit_element_id"))
        if not room:
            self.error_count += 1
            self.log_entries.append({
                "action": "ERROR",
                "detail": f"Room element {mapping.get('revit_element_id')} not found"
            })
            return
        
        origin = mapping.get("origin", [0.0, 0.0])
        
        for fixture_info in mapping.get("fixtures", []):
            self._place_fixture(room, origin, fixture_info)
    
    def _get_room_element(self, element_id):
        """Get a Revit Room element by ID."""
        if not element_id:
            return None
        try:
            elem = self.doc.GetElement(ElementId(int(element_id)))
            if elem and isinstance(elem, Room):
                return elem
        except:
            pass
        
        # Search by ID in all rooms
        rooms = FilteredElementCollector(self.doc)\
            .OfCategory(BuiltInCategory.OST_Rooms)\
            .OfClass(SpatialElement)
        for r in rooms:
            if r.Id.IntegerValue == int(element_id):
                return r
        return None
    
    def _place_fixture(self, room, origin, fixture_info):
        """Place a single fixture type in a room."""
        fixture_name = fixture_info.get("name", "")
        quantity = fixture_info.get("quantity", 1)
        positions = fixture_info.get("positions", [])
        
        # Find the family symbol
        symbol = self.resolver.find_family(fixture_name, fixture_info.get("type", "recessed"))
        if not symbol:
            self.error_count += 1
            self.log_entries.append({
                "action": "SKIP",
                "fixture": fixture_name,
                "room": room.Name or "Unknown",
                "reason": "No matching Revit family found",
            })
            return
        
        # Calculate insertion points
        insertion_points = self._calculate_points(room, origin, positions, quantity)
        
        # Place each fixture
        for point in insertion_points:
            if CONFIG["skip_existing"] and self._fixture_exists_at(point, symbol):
                self.skipped_count += 1
                continue
            
            try:
                new_fixture = self.doc.Create.NewFamilyInstance(point, symbol, room)
                if new_fixture:
                    self.placed_count += 1
                    self.log_entries.append({
                        "action": "PLACE",
                        "fixture": fixture_name,
                        "room": room.Name or "Unknown",
                        "position": [point.X, point.Y, point.Z],
                    })
            except Exception as e:
                self.error_count += 1
                self.log_entries.append({
                    "action": "ERROR",
                    "fixture": fixture_name,
                    "room": room.Name or "Unknown",
                    "error": str(e),
                })
    
    def _calculate_points(self, room, origin, positions, quantity):
        """Calculate XYZ insertion points."""
        room_loc = room.Location
        if not room_loc or not hasattr(room_loc, 'Point'):
            return []
        
        room_point = room_loc.Point
        
        if positions and len(positions) > 0:
            points = []
            for pos in positions[:quantity]:
                x = origin[0] + pos[0]
                y = origin[1] + pos[1]
                z = room_point.Z + CONFIG["mounting_height"]
                if CONFIG["round_to_mm"]:
                    # Revit uses feet internally
                    x_mm = x * 304.8
                    y_mm = y * 304.8
                    x_mm = round(x_mm)
                    y_mm = round(y_mm)
                    x = x_mm / 304.8
                    y = y_mm / 304.8
                points.append(XYZ(x, y, z))
            return points
        else:
            # Auto-generate grid layout
            return self._generate_grid(room, room_point, quantity)
    
    def _generate_grid(self, room, center, quantity):
        """Generate a grid layout for fixtures."""
        import math
        
        if quantity <= 0:
            return []
        
        bbox = room.get_BoundingBox(self.doc.ActiveView)
        if not bbox:
            return [XYZ(center.X, center.Y, center.Z + CONFIG["mounting_height"])]
        
        width = bbox.Max.X - bbox.Min.X
        depth = bbox.Max.Y - bbox.Min.Y
        
        rows = max(1, int(math.sqrt(quantity * width / max(depth, 0.1))))
        cols = max(1, int(math.ceil(quantity / rows)))
        
        margin_x = width * 0.15
        margin_y = depth * 0.15
        usable_x = width - 2 * margin_x
        usable_y = depth - 2 * margin_y
        
        points = []
        placed = 0
        for r in range(rows):
            for c in range(cols):
                if placed >= quantity:
                    break
                x = bbox.Min.X + margin_x + (usable_x * c / max(cols - 1, 1))
                y = bbox.Min.Y + margin_y + (usable_y * r / max(rows - 1, 1))
                z = center.Z + CONFIG["mounting_height"]
                points.append(XYZ(x, y, z))
                placed += 1
            if placed >= quantity:
                break
        
        return points
    
    def _fixture_exists_at(self, point, symbol):
        """Check if a fixture already exists near the target point."""
        collector = FilteredElementCollector(self.doc)\
            .OfCategory(BuiltInCategory.OST_LightingFixtures)\
            .OfClass(FamilyInstance)
        
        for fi in collector:
            loc = fi.Location
            if loc and hasattr(loc, 'Point'):
                dist = loc.Point.DistanceTo(point)
                if dist < CONFIG["proximity_tolerance"]:
                    if fi.Symbol.Id == symbol.Id:
                        return True
        return False
    
    def _get_results(self):
        """Get placement results summary."""
        return {
            "placed": self.placed_count,
            "skipped": self.skipped_count,
            "errors": self.error_count,
            "log": self.log_entries,
        }


# ============================================================
# MAIN EXECUTION
# ============================================================

def execute():
    """Main entry point for the pyRevit script."""
    if output:
        output.print_line("=" * 50)
        output.print_line("  DIALux to Revit Fixture Distributor")
        output.print_line(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        output.print_line("=" * 50)
    
    # Select fixture data file
    json_path = forms.ask_for_open_file(
        "Select DIALux Fixture Data (JSON)",
        filter="JSON Files (*.json)|*.json|All Files (*.*)|*.*"
    )
    
    if not json_path:
        return
    
    # Initialize resolver
    resolver = FamilyResolver(doc)
    available = resolver.get_available_families()
    
    if output:
        output.print_line(f"\nAvailable lighting families: {len(available)}")
        for fam in available[:10]:
            output.print_line(f"  - {fam['family']}/{fam['name']}")
        if len(available) > 10:
            output.print_line(f"  ... and {len(available) - 10} more")
    
    # Initialize placer
    placer = FixturePlacer(doc, resolver)
    
    # Execute placement
    with Transaction(doc, "DIALux Fixture Import") as t:
        t.Start()
        try:
            results = placer.place_fixtures_from_file(json_path)
            t.Commit()
        except Exception as e:
            t.RollBack()
            if output:
                output.print_line(f"\nFATAL ERROR: {e}")
            TaskDialog.Show("DIALux Distributor", f"Error: {e}")
            return
    
    # Report results
    if output:
        output.print_line(f"\n{'='*40}")
        output.print_line(f"  RESULTS")
        output.print_line(f"{'='*40}")
        output.print_line(f"  Placed:    {results['placed']}")
        output.print_line(f"  Skipped:   {results['skipped']}")
        output.print_line(f"  Errors:    {results['errors']}")
        output.print_line(f"{'='*40}")
        
        if results["log"]:
            output.print_line(f"\n  Log (first 30):")
            for entry in results["log"][:30]:
                icon = "✓" if entry["action"] == "PLACE" else (
                    "○" if entry["action"] == "SKIP" else "✗"
                )
                output.print_line(
                    f"    {icon} {entry['action']}: "
                    f"{entry.get('fixture', 'N/A')} in {entry.get('room', 'N/A')}"
                )
        
        output.print_line(f"\nDone! Fixtures distributed into the model.")
    
    # Show summary dialog
    TaskDialog.Show(
        "DIALux Fixture Import - Complete",
        f"Fixtures Placed: {results['placed']}\n"
        f"Fixtures Skipped: {results['skipped']}\n"
        f"Errors: {results['errors']}"
    )


# Execute when loaded by pyRevit
execute()
