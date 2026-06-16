# Revit 2024 Electrical Tools Add-in

An enhanced Revit 2024 add-in for automated electrical modeling.

## New Features
- **Custom Ribbon Tab**: Access tools via the "Manus Tools" tab in the Revit ribbon.
- **Conduit Fittings**: Automatically creates elbow fittings at the turns between connected lines.
- **Color Matching**: New conduits and fittings inherit the color of the original lines or wires.
- **Size Selection UI**: Choose the conduit diameter before conversion.
- **Flex Conduit Connection**: A new tool to connect junction boxes to light fixtures using flex conduit, with a customizable vertical distance threshold.

## Installation
1. Build the project in Visual Studio (ensure you have Revit 2024 installed for references).
2. Copy `RevitConduitAddin.dll` and `RevitConduitAddin.addin` to:
   `%AppData%\Autodesk\Revit\Addins\2024\`

## Usage
### 1. Convert Lines
- Go to **Manus Tools** > **Convert Lines**.
- Choose the conduit size in the popup.
- Select the lines/wires to convert.
- The tool creates conduits, adds fittings, and matches colors.

### 2. Connect Flex
- Go to **Manus Tools** > **Connect Flex**.
- Set the maximum vertical distance for connection.
- The tool finds light fixtures directly below junction boxes and connects them with flex conduit if within the distance limit.

## Technical Notes
- **Fittings**: Uses `doc.Create.NewElbowFitting` to join conduits sharing an endpoint.
- **Graphics**: Uses `OverrideGraphicSettings` to match the source element's line color in the active view.
- **Flex Logic**: Uses `ReferenceIntersector` for ray-casting to find fixtures below boxes.

