"""
Export Revit Room Data - pyRevit Script
=======================================

This script exports all room data from the current Revit model to a JSON file
that can be used by the DIALux-to-Revit room matcher.

Installation:
    Copy to: %AppData%/pyRevit/extensions/DIALuxRevit.extension/ExportRooms.script/

Usage:
    Run from pyRevit ribbon: DIALux Revit > Export Rooms
"""

__title__ = "Export\nRooms"
__author__ = "Manus AI"
__doc__ = "Export all room data from Revit to JSON for DIALux matching."

import json
from datetime import datetime

import Autodesk.Revit.DB as DB
from Autodesk.Revit.DB import (
    FilteredElementCollector, BuiltInCategory, Room,
    SpatialElement, ElementId, XYZ,
)
from Autodesk.Revit.UI import TaskDialog

try:
    from pyrevit import revit, forms, script
    doc = revit.doc
except ImportError:
    doc = __revit__.ActiveUIDocument.Document

def export_rooms():
    """Export all rooms to JSON."""
    rooms = []
    
    # Collect all rooms
    room_collector = FilteredElementCollector(doc)\
        .OfCategory(BuiltInCategory.OST_Rooms)\
        .OfClass(SpatialElement)
    
    for room in room_collector:
        room_data = {
            "element_id": room.Id.IntegerValue,
            "name": room.Name or "",
            "number": room.Number or "",
            "level": "",
            "area": 0.0,
            "perimeter": 0.0,
            "volume": 0.0,
            "boundaries": [],
        }
        
        # Get level
        try:
            level_id = room.LevelId
            if level_id != ElementId.InvalidElementId:
                level = doc.GetElement(level_id)
                if level:
                    room_data["level"] = level.Name or ""
        except:
            pass
        
        # Get area (Revit stores in sq ft)
        try:
            room_data["area"] = room.Area  # sq ft
            room_data["perimeter"] = room.Perimeter  # ft
        except:
            pass
        
        # Get boundaries
        try:
            boundary_segments = room.GetBoundarySegments(
                DB.SpatialElementBoundaryOptions()
            )
            if boundary_segments:
                for segment_list in boundary_segments:
                    for seg in segment_list:
                        curve = seg.GetCurve()
                        points = []
                        for pt in [curve.GetEndPoint(0), curve.GetEndPoint(1)]:
                            points.append([pt.X, pt.Y])
                        if points:
                            room_data["boundaries"].append(points[0])
        except:
            pass
        
        rooms.append(room_data)
    
    # Save to file
    if rooms:
        output_path = forms.ask_for_save_file(
            "Save Room Data",
            filter="JSON Files (*.json)|*.json",
            default_ext=".json"
        )
        
        if output_path:
            data = {
                "export_date": datetime.now().isoformat(),
                "project": doc.Title or "Unknown",
                "total_rooms": len(rooms),
                "rooms": rooms,
            }
            
            with open(output_path, "w") as f:
                json.dump(data, f, indent=2)
            
            TaskDialog.Show(
                "Room Export Complete",
                f"Exported {len(rooms)} rooms to:\n{output_path}"
            )
        else:
            # Save to temp
            import tempfile
            temp_path = tempfile.gettempdir() + "/revit_rooms_export.json"
            data = {
                "export_date": datetime.now().isoformat(),
                "project": doc.Title or "Unknown",
                "total_rooms": len(rooms),
                "rooms": rooms,
            }
            with open(temp_path, "w") as f:
                json.dump(data, f, indent=2)
            TaskDialog.Show(
                "Room Export Complete",
                f"Exported {len(rooms)} rooms to:\n{temp_path}"
            )
    else:
        TaskDialog.Show("Room Export", "No rooms found in the current model.")


# Execute
export_rooms()
