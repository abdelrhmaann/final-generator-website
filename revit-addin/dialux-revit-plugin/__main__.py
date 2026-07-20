"""
DIALux to Revit Fixture Distributor - Main Entry Point
======================================================

This tool reads DIALux PDF/CSV/XML lighting reports and automatically
generates Revit placement scripts for distributing lighting fixtures
into BIM model rooms with high accuracy.

Usage:
    python -m dialux-revit-plugin          # Launch GUI
    python -m dialux-revit-plugin --cli    # Command-line mode
    python -m dialux-revit-plugin --batch  # Batch processing mode
"""

import sys
import argparse
import json
from pathlib import Path

from .core.dialux_parser import DialuxPDFParser, DialuxCSVParser, DialuxXMLParser
from .core.fixture_extractor import FixtureExtractor
from .core.room_matcher import RoomMatcher
from .core.revit_exporter import RevitScriptExporter


def run_cli(args):
    """Run in command-line mode."""
    if not args.input:
        print("Error: --input is required")
        sys.exit(1)

    # Parse DIALux report
    input_path = Path(args.input)
    ext = input_path.suffix.lower()

    if ext == ".pdf":
        parser = DialuxPDFParser()
    elif ext == ".csv":
        parser = DialuxCSVParser()
    elif ext == ".xml":
        parser = DialuxXMLParser()
    else:
        print(f"Unsupported format: {ext}")
        sys.exit(1)

    print(f"Parsing DIALux report: {input_path}")
    parsed_data = parser.parse(str(input_path))
    print(f"  Found {parsed_data['project_info']['total_rooms']} rooms")
    print(f"  Found {parsed_data['project_info']['total_luminaires']} luminaires")
    print(f"  Fixture types: {', '.join(parsed_data['project_info']['luminaire_types'][:10])}")

    # Extract fixtures
    extractor = FixtureExtractor()
    fixtures = extractor.extract_from_parsed_data(parsed_data)
    print(f"  Extracted {len(fixtures)} fixture entries")

    summary = extractor.get_summary()
    print(f"  Total quantity: {summary['total_quantity']}")
    print(f"  By type: {summary['by_type']}")

    # Load Revit room data if provided
    mappings = []
    if args.revit_rooms:
        with open(args.revit_rooms, "r") as f:
            revit_data = json.load(f)
        
        revit_rooms = revit_data.get("rooms", revit_data)
        matcher = RoomMatcher(
            fuzzy_threshold=args.threshold,
            area_tolerance=args.area_tolerance / 100,
        )
        matcher.load_revit_rooms(revit_rooms)
        matcher.load_dialux_rooms(parsed_data["rooms"])
        result = matcher.match_rooms()

        print(f"\nRoom Matching Results:")
        print(f"  Matched: {len(result.matched)}/{len(parsed_data['rooms'])} rooms")
        print(f"  Unmatched DIALux: {len(result.unmatched_dialux)}")
        print(f"  Unmatched Revit: {len(result.unmatched_revit)}")

        mappings = [
            {
                "dialux_room_name": m.dialux_room_name,
                "revit_room_name": m.revit_room_name,
                "revit_element_id": m.revit_element_id,
                "match_score": m.match_score,
                "fixtures": m.fixtures,
                "room_area": m.room_area,
                "room_center": list(m.room_center),
                "origin": list(m.origin),
            }
            for m in result.matched
        ]

    # Generate output
    output_dir = Path(args.output) if args.output else input_path.parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    exporter = RevitScriptExporter()
    fixture_export_data = {
        "fixtures": [
            {
                "dialux_name": f.dialux_name,
                "manufacturer": f.manufacturer,
                "quantity": f.quantity,
                "revit_family_name": f.revit_family_name,
                "fixture_type": f.fixture_type,
                "room_name": f.room_name,
                "relative_positions": f.relative_positions,
            }
            for f in fixtures
        ],
        "summary": summary,
    }

    exporter.load_data(fixture_export_data, mappings)

    py_path = exporter.generate_pyrevit_script(str(output_dir / "dialux_fixture_import.py"))
    dyn_path = exporter.generate_dynamo_python(str(output_dir / "dialux_dynamo_node.py"))
    cs_path = exporter.generate_csaddin(str(output_dir / "DialuxFixtureImportCommand.cs"))
    rpt_path = exporter.generate_report(str(output_dir / "placement_report.md"))

    # Save intermediate JSON for programmatic use
    json_path = output_dir / "fixture_data.json"
    with open(json_path, "w") as f:
        json.dump(fixture_export_data, f, indent=2)
    json_mappings_path = output_dir / "room_mappings.json"
    with open(json_mappings_path, "w") as f:
        json.dump(mappings, f, indent=2)

    print(f"\nGenerated output files in: {output_dir}")
    print(f"  - {py_path}")
    print(f"  - {dyn_path}")
    print(f"  - {cs_path}")
    print(f"  - {rpt_path}")
    print(f"  - {json_path}")
    print(f"  - {json_mappings_path}")


def run_gui():
    """Run the GUI application."""
    from .ui.main_window import DialuxRevitApp
    app = DialuxRevitApp()
    app.run()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="DIALux to Revit Fixture Distributor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m dialux_revit_plugin --input report.pdf
  python -m dialux_revit_plugin --input report.pdf --revit-rooms rooms.json
  python -m dialux_revit_plugin --gui
  python -m dialux_revit_plugin --input report.csv --output ./results --threshold 0.7
        """,
    )
    parser.add_argument("--input", "-i", help="Path to DIALux report (PDF, CSV, XML)")
    parser.add_argument("--revit-rooms", "-r", help="Path to Revit room data JSON")
    parser.add_argument("--output", "-o", help="Output directory for generated scripts")
    parser.add_argument("--threshold", type=float, default=0.60,
                       help="Fuzzy match threshold (0.0-1.0)")
    parser.add_argument("--area-tolerance", type=float, default=15,
                       help="Room area tolerance percentage")
    parser.add_argument("--gui", action="store_true", help="Launch GUI")
    parser.add_argument("--cli", action="store_true", help="Run in CLI mode")
    parser.add_argument("--batch", help="Batch process multiple files (JSON list)")

    args = parser.parse_args()

    if args.gui or (not args.input and not args.cli):
        run_gui()
    elif args.input:
        run_cli(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
