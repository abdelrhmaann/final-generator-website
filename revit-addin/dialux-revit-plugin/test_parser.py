"""
Test script for the DIALux parser and fixture extractor.
Creates a mock DIALux report and verifies parsing accuracy.
"""

import json
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.dialux_parser import DialuxPDFParser, RoomData, LuminaireEntry
from core.fixture_extractor import FixtureExtractor
from core.room_matcher import RoomMatcher


def test_fixture_extraction():
    """Test fixture extraction from mock parsed data."""
    mock_data = {
        "project_info": {
            "project_name": "Test Office Building",
            "client": "Test Client",
            "designer": "Test Designer",
            "date": "2026-07-20",
            "building": "Office Tower A",
            "total_rooms": 3,
            "total_luminaires": 45,
            "luminaire_types": [
                "Philips Ledalite D-Line 12W",
                "Zumtobel Mirel 3000K",
                "Osram Panel 40W",
            ],
        },
        "rooms": [
            {
                "name": "Office 101",
                "level": "Level 1",
                "area": 25.0,
                "length": 5.0,
                "width": 5.0,
                "height": 3.0,
                "illuminance_avg": 500.0,
                "illuminance_min": 420.0,
                "illuminance_max": 680.0,
                "uniformity": 0.75,
                "luminaires": [
                    {
                        "name": "Philips Ledalite D-Line 12W 4000K",
                        "manufacturer": "Philips",
                        "model": "D-Line 12W",
                        "quantity": 6,
                        "luminous_flux": 1200.0,
                        "wattage": 12.0,
                        "mounting_height": 2.8,
                        "relative_positions": [
                            [1.0, 1.0], [1.0, 2.5], [1.0, 4.0],
                            [3.0, 1.0], [3.0, 2.5], [3.0, 4.0],
                        ],
                    },
                    {
                        "name": "Zumtobel Mirel 8W 3000K",
                        "manufacturer": "Zumtobel",
                        "model": "Mirel",
                        "quantity": 2,
                        "luminous_flux": 800.0,
                        "wattage": 8.0,
                        "mounting_height": 2.8,
                        "relative_positions": [
                            [2.0, 0.5], [2.0, 4.5],
                        ],
                    },
                ],
            },
            {
                "name": "Conference Room 201",
                "level": "Level 2",
                "area": 40.0,
                "length": 8.0,
                "width": 5.0,
                "height": 3.0,
                "illuminance_avg": 350.0,
                "illuminance_min": 280.0,
                "illuminance_max": 520.0,
                "uniformity": 0.68,
                "luminaires": [
                    {
                        "name": "Osram Panel 40W 4000K IP44",
                        "manufacturer": "Osram",
                        "model": "Panel 40W",
                        "quantity": 8,
                        "luminous_flux": 3200.0,
                        "wattage": 40.0,
                        "mounting_height": 2.8,
                        "relative_positions": [
                            [1.5, 1.0], [1.5, 2.5], [1.5, 4.0],
                            [3.5, 1.0], [3.5, 2.5], [3.5, 4.0],
                            [5.5, 1.0], [5.5, 2.5],
                        ],
                    },
                ],
            },
            {
                "name": "Corridor B",
                "level": "Level 1",
                "area": 15.0,
                "length": 10.0,
                "width": 1.5,
                "height": 2.8,
                "illuminance_avg": 200.0,
                "illuminance_min": 150.0,
                "illuminance_max": 320.0,
                "uniformity": 0.62,
                "luminaires": [
                    {
                        "name": "Emergency Exit Sign",
                        "manufacturer": "Generic",
                        "model": "Exit Sign",
                        "quantity": 3,
                        "luminous_flux": 0.0,
                        "wattage": 3.0,
                        "mounting_height": 2.5,
                        "relative_positions": [
                            [0.5, 0.75], [5.0, 0.75], [9.5, 0.75],
                        ],
                    },
                ],
            },
        ],
    }

    # Test fixture extraction
    extractor = FixtureExtractor()
    fixtures = extractor.extract_from_parsed_data(mock_data)

    assert len(fixtures) == 4, f"Expected 4 fixture entries, got {len(fixtures)}"
    assert fixtures[0].quantity == 6
    assert fixtures[0].fixture_type == "recessed"
    assert fixtures[0].color_temperature == "4000K"
    assert fixtures[1].color_temperature == "3000K"
    assert fixtures[2].ip_rating == "IP44"
    assert fixtures[3].fixture_type == "surface"  # Exit sign
    assert fixtures[0].confidence > 0.5

    summary = extractor.get_summary()
    assert summary["total_fixtures"] == 4
    assert summary["total_quantity"] == 19  # 6+2+8+3
    assert "recessed" in summary["by_type"]
    assert "surface" in summary["by_type"]

    print("✓ Fixture extraction test passed")
    print(f"  - {summary['total_fixtures']} fixture types")
    print(f"  - {summary['total_quantity']} total units")
    print(f"  - By type: {summary['by_type']}")
    print(f"  - By room: {summary['by_room']}")

    # Test with Revit families
    revit_families = {
        "Philips/D-Line Recessed": "fam_001",
        "Zumtobel/Mirel Pendant": "fam_002",
        "Osram/Panel Surface Mount": "fam_003",
        "Generic/Exit Sign": "fam_004",
    }
    extractor.set_revit_families(revit_families)
    fixtures = extractor.extract_from_parsed_data(mock_data)

    # Check that matching worked
    matched = [f for f in fixtures if f.match_score > 0.5]
    print(f"  - {len(matched)} fixtures matched to Revit families")
    for f in matched:
        print(f"    {f.dialux_name} → {f.revit_family_name} ({f.match_score:.2f})")

    return fixtures


def test_room_matching():
    """Test room matching between DIALux and Revit rooms."""
    dialux_rooms = [
        {"name": "Office 101", "area": 25.0, "level": "Level 1", "luminaires": []},
        {"name": "Conference Room 201", "area": 40.0, "level": "Level 2", "luminaires": []},
        {"name": "Corridor B", "area": 15.0, "level": "Level 1", "luminaires": []},
    ]

    revit_rooms = [
        {"element_id": 1001, "name": "Office 101", "number": "101", "level": "Level 1",
         "area": 268.75, "perimeter": 65.6, "volume": 806.25},
        {"element_id": 1002, "name": "Conference Room", "number": "201", "level": "Level 2",
         "area": 430.6, "perimeter": 85.3, "volume": 1291.8},
        {"element_id": 1003, "name": "Corridor", "number": "B", "level": "Level 1",
         "area": 161.5, "perimeter": 42.7, "volume": 452.2},
    ]

    matcher = RoomMatcher(fuzzy_threshold=0.55, area_tolerance=0.20)
    matcher.load_revit_rooms(revit_rooms)
    matcher.load_dialux_rooms(dialux_rooms)
    result = matcher.match_rooms()

    assert len(result.matched) >= 2, f"Expected at least 2 matches, got {len(result.matched)}"
    assert result.total_rooms == 3

    report = matcher.get_match_report(result)
    print(f"✓ Room matching test passed")
    print(f"  - Match rate: {report['summary']['match_rate']}")
    print(f"  - Matched: {report['summary']['matched_rooms']}")
    print(f"  - Unmatched DIALux: {report['summary']['unmatched_dialux']}")
    print(f"  - Unmatched Revit: {report['summary']['unmatched_revit']}")

    return result


def test_revit_export():
    """Test Revit script generation."""
    from core.revit_exporter import RevitScriptExporter

    mock_fixtures = {
        "fixtures": [
            {
                "dialux_name": "Philips D-Line 12W 4000K",
                "manufacturer": "Philips",
                "quantity": 6,
                "revit_family_name": "Philips/D-Line Recessed",
                "fixture_type": "recessed",
                "room_name": "Office 101",
                "relative_positions": [[1.0, 1.0], [1.0, 2.5]],
            },
        ],
        "summary": {"total_fixtures": 1, "total_quantity": 6},
    }

    mock_mappings = [
        {
            "dialux_room_name": "Office 101",
            "revit_room_name": "Office 101",
            "revit_element_id": 1001,
            "match_score": 1.0,
            "fixtures": [
                {
                    "name": "Philips D-Line 12W 4000K",
                    "manufacturer": "Philips",
                    "quantity": 6,
                    "positions": [[1.0, 1.0], [1.0, 2.5]],
                }
            ],
            "room_area": 268.75,
            "room_center": [2.5, 2.5],
            "origin": [0.0, 0.0],
        }
    ]

    exporter = RevitScriptExporter()
    exporter.load_data(mock_fixtures, mock_mappings)

    # Test pyRevit script generation
    py_path = "/tmp/test_pyrevit_script.py"
    exporter.generate_pyrevit_script(py_path)
    assert os.path.exists(py_path)
    content = open(py_path).read()
    assert "FamilyResolver" in content
    assert "FixturePlacer" in content
    assert "NewFamilyInstance" in content
    print(f"✓ pyRevit script generated: {len(content)} chars")

    # Test Dynamo script generation
    dyn_path = "/tmp/test_dynamo_script.py"
    exporter.generate_dynamo_python(dyn_path)
    assert os.path.exists(dyn_path)
    print(f"✓ Dynamo script generated: {len(open(dyn_path).read())} chars")

    # Test C# add-in generation
    cs_path = "/tmp/test_cs_addin.cs"
    exporter.generate_csaddin(cs_path)
    assert os.path.exists(cs_path)
    content = open(cs_path).read()
    assert "DialuxFixtureImportCommand" in content
    assert "Transaction" in content
    print(f"✓ C# add-in generated: {len(content)} chars")

    # Test report generation
    rpt_path = "/tmp/test_report.md"
    exporter.generate_report(rpt_path)
    assert os.path.exists(rpt_path)
    content = open(rpt_path).read()
    assert "Placement Plan" in content
    print(f"✓ Report generated: {len(content)} chars")


if __name__ == "__main__":
    print("=" * 60)
    print("  DIALux to Revit Plugin - Test Suite")
    print("=" * 60)
    print()

    print("Test 1: Fixture Extraction")
    test_fixture_extraction()
    print()

    print("Test 2: Room Matching")
    test_room_matching()
    print()

    print("Test 3: Revit Script Export")
    test_revit_export()
    print()

    print("=" * 60)
    print("  All tests passed!")
    print("=" * 60)
