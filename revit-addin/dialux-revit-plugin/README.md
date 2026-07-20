# DIALux to Revit Fixture Distributor

A high-efficiency plugin that reads DIALux lighting calculation reports and automatically distributes the exact fixture types into every room in the Revit model, matching the DIALux layout precisely room by room.

---

## Overview

This plugin bridges the gap between lighting design (DIALux) and BIM execution (Revit). It eliminates the manual, error-prone process of re-placing lighting fixtures in Revit after a DIALux calculation, ensuring that the BIM model reflects the exact lighting design with zero manual intervention.

### Key Features

| Feature | Description |
|---------|-------------|
| **PDF/CSV/XML Parsing** | Extracts fixture data from any DIALux report format |
| **AI-Assisted Matching** | Fuzzy matching correlates DIALux luminaires to Revit families |
| **Room-by-Room Placement** | Precise fixture distribution per room |
| **Coordinate Accuracy** | Maintains exact positions from DIALux layout |
| **Multi-Format Output** | Generates pyRevit scripts, Dynamo nodes, and C# add-ins |
| **Duplicate Prevention** | Skips fixtures that already exist in the model |
| **Auto-Grid Fallback** | Generates optimal grid layouts when positions are unavailable |
| **Visual Preview** | Room matching results shown before execution |

---

## Architecture

```
DIALux Report (PDF/CSV/XML)
        │
        ▼
┌─────────────────────┐
│  DIALux Parser       │ ← Extracts rooms, luminaires, positions
│  (dialux_parser.py)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Fixture Extractor   │ ← Classifies types, matches Revit families
│  (fixture_extractor) │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Room Matcher        │ ← Maps DIALux rooms ↔ Revit rooms
│  (room_matcher.py)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Revit Exporter      │ ← Generates placement scripts
│  (revit_exporter.py) │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Revit Execution     │ ← pyRevit / Dynamo / C# Add-in
│  (in Revit)          │
└─────────────────────┘
```

---

## Installation

### Prerequisites

- Python 3.9+
- Revit 2024 (or compatible version)
- pyRevit (for GUI/script mode) or Dynamo (for visual mode)

### Python Dependencies

```bash
pip install pdfplumber openpyxl xlsxwriter
```

### Installation Options

#### Option 1: pyRevit Extension (Recommended)

1. Copy the `bundle/` folder to your pyRevit extensions directory:
   ```
   %AppData%\pyRevit\extensions\DIALuxRevit.extension\
   ```
2. Restart Revit
3. A new "DIALux Revit" tab will appear in the ribbon

#### Option 2: Compiled C# Add-in

1. Add `DialuxFixtureImport.cs` and `DialuxFixtureSettings.xaml` to your Revit add-in project
2. Update the `.addin` manifest file:
   ```xml
   <AddIn Type="Command">
     <Text>DIALux Import</Text>
     <Description>Import DIALux lighting fixtures</Description>
     <FullClassName>RevitConduitAddin.DialuxFixtureImportCommand</FullClassName>
     <VendorId>MANUS</VendorId>
   </AddIn>
   ```
3. Build and deploy to `%AppData%\Autodesk\Revit\Addins\2024\`

#### Option 3: Standalone Python (CLI/GUI)

```bash
cd revit-addin/dialux-revit-plugin
python -m dialux-revit-plugin --gui          # Launch GUI
python -m dialux-revit-plugin --cli -i report.pdf  # CLI mode
```

---

## Usage Workflow

### Step 1: Export Revit Room Data

Run the **Export Rooms** script from the pyRevit ribbon to export all rooms from your Revit model to a JSON file. This creates a room inventory with names, IDs, areas, and boundary coordinates.

### Step 2: Parse DIALux Report

Use the main tool to parse your DIALux report. Supported formats:
- **PDF**: Automatic text and table extraction
- **CSV**: Structured room and luminaire data
- **XML**: Hierarchical project data

### Step 3: Match Rooms

The matcher correlates DIALux room names with Revit room elements using:
1. Exact name matching
2. Fuzzy string matching (configurable threshold)
3. Room number matching
4. Area-based verification

### Step 4: Generate Scripts

The tool generates three output formats:
- **pyRevit Script** (`dialux_fixture_import.py`): Place in pyRevit bundle
- **Dynamo Node** (`dialux_dynamo_node.py`): Use in Dynamo graph
- **C# Add-in** (`DialuxFixtureImportCommand.cs`): Compile into Revit add-in

### Step 5: Execute in Revit

Run the generated script inside Revit. The script will:
1. Load all available lighting fixture families
2. Match DIALux fixtures to Revit families
3. Place fixtures at the correct positions in each room
4. Skip existing fixtures within tolerance
5. Report results

---

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `fuzzy_threshold` | 0.60 | Minimum match score for room mapping (0.0-1.0) |
| `area_tolerance` | 15% | Maximum area difference between DIALux and Revit rooms |
| `mounting_height` | 2.5m | Height above floor for ceiling-mounted fixtures |
| `skip_existing` | true | Skip fixtures that already exist within tolerance |
| `proximity_tolerance` | 0.5ft | Distance tolerance for duplicate detection |
| `auto_generate_grid` | true | Generate grid layout when positions unavailable |
| `round_to_mm` | true | Round coordinates to nearest millimeter |

---

## Supported DIALux Report Sections

The parser extracts data from these DIALux report sections:

| Section | Data Extracted |
|---------|---------------|
| Project Overview | Project name, client, designer, date |
| Room Summary Tables | Room names, areas, dimensions, illuminance |
| Luminaire Data Sheets | Fixture names, quantities, wattage, flux |
| Layout Drawings | Coordinate positions, spacing, arrangement |
| Calculation Results | Average/Min/Max illuminance, uniformity |

---

## Revit Family Matching

The plugin uses a multi-strategy matching approach:

1. **Exact Match**: Direct string comparison (case-insensitive)
2. **Containment Check**: One string contains the other
3. **Fuzzy Match**: SequenceMatcher similarity scoring
4. **Type-Based Fallback**: Match by fixture type keywords

Example matching:
```
DIALux: "Philips Ledalite D-Line 12W 4000K"
  → Matches Revit: "Ledalite/D-Line Recessed"
  → Match Score: 0.78
```

---

## Output Files

After processing, the plugin generates:

| File | Purpose |
|------|---------|
| `dialux_fixture_import.py` | pyRevit script for direct execution |
| `dialux_dynamo_node.py` | Dynamo Python node for visual workflow |
| `DialuxFixtureImportCommand.cs` | C# source for compiled add-in |
| `placement_report.md` | Verification report with placement details |
| `fixture_data.json` | Intermediate data for programmatic use |
| `room_mappings.json` | Room-to-room mapping data |

---

## Error Handling

The plugin handles common error scenarios gracefully:

| Error | Handling |
|-------|----------|
| Missing Revit family | Skip with warning, log for manual mapping |
| Room not found | Skip room, log unmatched rooms |
| Invalid coordinates | Fall back to auto-grid generation |
| Duplicate fixtures | Skip if within proximity tolerance |
| Transaction failure | Automatic rollback with error message |

---

## License

This plugin is part of the RevitConduitAddin project. See the parent project for licensing details.
