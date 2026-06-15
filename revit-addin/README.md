# Revit 2024 Conduit Conversion Add-in

This add-in converts **Detail Lines**, **Model Lines**, and **Wires** into **Conduits** and automatically connects them to nearby **Junction Boxes**.

## Features
- **Line to Conduit**: Supports conversion from various line types.
- **Auto-Connect**: Detects junction boxes within 1 foot of the line endpoints and connects the conduit to an available connector.
- **Revit 2024 Ready**: Built for the Revit 2024 API.

## Installation
1. Compile the project to generate `RevitConduitAddin.dll`.
2. Copy `RevitConduitAddin.dll` and `RevitConduitAddin.addin` to the Revit Add-ins folder:
   `%AppData%\Autodesk\Revit\Addins\2024\`

## Usage
1. In Revit, go to the **Add-ins** tab.
2. Click **Convert Lines to Conduit**.
3. Select the lines you want to convert.
4. The add-in will create conduits along the selected lines and attempt to connect them to any junction box placed above light fixtures (or anywhere else near the endpoints).

## Technical Notes
- The add-in uses a 1-foot search radius for junction boxes.
- It connects to the nearest **unconnected** conduit connector on the junction box.
- Ensure your junction box families have conduit connectors defined.
