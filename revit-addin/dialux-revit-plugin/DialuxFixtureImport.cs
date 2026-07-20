// ============================================================
// DIALux Fixture Import Command
// Revit Add-in - Distributes lighting fixtures from DIALux reports
// into Revit BIM model rooms automatically.
// ============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.DB.Electrical;
using Autodesk.Revit.UI;
using Autodesk.Revit.UI.Selection;

namespace RevitConduitAddin
{
    /// <summary>
    /// Revit external command that imports DIALux fixture data
    /// and distributes fixtures into Revit rooms automatically.
    /// </summary>
    [Transaction(TransactionMode.Manual)]
    public class DialuxFixtureImportCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData,
            ref string message, ElementSet elements)
        {
            UIDocument uiDoc = commandData.Application.ActiveUIDocument;
            Document doc = uiDoc.Document;

            try
            {
                // Step 1: Show settings dialog
                DialuxFixtureSettings settings = new DialuxFixtureSettings();
                if (settings.ShowDialog() != true)
                    return Result.Cancelled;

                // Step 2: Select DIALux fixture data JSON file
                var openDialog = new System.Windows.Forms.OpenFileDialog();
                openDialog.Filter = "JSON Files (*.json)|*.json|All Files (*.*)|*.*";
                openDialog.Title = "Select Parsed DIALux Fixture Data";
                openDialog.InitialDirectory = Environment.GetFolderPath(
                    Environment.SpecialFolder.MyDocuments);

                if (openDialog.ShowDialog() != System.Windows.Forms.DialogResult.OK)
                    return Result.Cancelled;

                // Step 3: Load and parse the data
                string jsonData = File.ReadAllText(openDialog.FileName);
                var fixtureData = JsonSerializer.Deserialize<FixtureImportData>(jsonData,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (fixtureData == null || fixtureData.RoomMappings == null ||
                    fixtureData.RoomMappings.Count == 0)
                {
                    message = "Invalid or empty fixture data file.";
                    return Result.Failed;
                }

                // Calculate totals
                int totalFixtures = 0;
                foreach (var mapping in fixtureData.RoomMappings)
                {
                    if (mapping.Fixtures != null)
                        foreach (var f in mapping.Fixtures)
                            totalFixtures += f.Quantity;
                }

                // Step 4: Confirmation
                var confirmResult = TaskDialog.Show(
                    "DIALux Fixture Import",
                    $"Import Summary:\n\n" +
                    $"  Fixture Data: {Path.GetFileName(openDialog.FileName)}\n" +
                    $"  Rooms: {fixtureData.RoomMappings.Count}\n" +
                    $"  Total Fixtures: {totalFixtures}\n" +
                    $"  Match Threshold: {settings.FuzzyThreshold:F2}\n" +
                    $"  Mounting Height: {settings.MountingHeight:F1}m\n\n" +
                    "Proceed with automatic fixture placement?",
                    TaskDialogCommonButtons.Yes | TaskDialogCommonButtons.No);

                if (confirmResult != TaskDialogResult.Yes)
                    return Result.Cancelled;

                // Step 5: Initialize resolver and placer
                FamilyResolver resolver = new FamilyResolver(doc);
                FixturePlacer placer = new FixturePlacer(
                    doc, resolver, settings.MountingHeight,
                    settings.SkipExisting, settings.AutoGrid);

                // Step 6: Execute placement in transaction
                using (Transaction trans = new Transaction(doc, "DIALux Fixture Import"))
                {
                    trans.Start();

                    var results = placer.PlaceAll(fixtureData.RoomMappings);

                    trans.Commit();

                    // Step 7: Show results
                    StringBuilder report = new StringBuilder();
                    report.AppendLine("DIALux Fixture Import - Complete");
                    report.AppendLine(new string('-', 40));
                    report.AppendLine($"  Fixtures Placed:    {results.Placed}");
                    report.AppendLine($"  Fixtures Skipped:   {results.Skipped}");
                    report.AppendLine($"  Errors:             {results.Errors}");
                    report.AppendLine(new string('-', 40));
                    report.AppendLine($"  Match Rate:         " +
                        $"{fixtureData.RoomMappings.Count} rooms processed");

                    if (results.Log.Count > 0 && results.Log.Count <= 50)
                    {
                        report.AppendLine(new string('-', 40));
                        report.AppendLine("  Recent Actions:");
                        foreach (var log in results.Log.Take(30))
                        {
                            string icon = log.Contains("Placed") ? "[+] " :
                                         log.Contains("Skip") ? "[o] " : "[!] ";
                            report.AppendLine($"    {icon}{log}");
                        }
                    }

                    TaskDialog.Show("DIALux Fixture Import", report.ToString());
                }

                return Result.Succeeded;
            }
            catch (JsonException ex)
            {
                message = $"Invalid JSON format: {ex.Message}";
                return Result.Failed;
            }
            catch (Exception ex)
            {
                message = ex.Message;
                return Result.Failed;
            }
        }
    }

    // ============================================================
    // Data Models for JSON Deserialization
    // ============================================================

    public class FixtureImportData
    {
        public List<RoomMappingJson> RoomMappings { get; set; }
        public SummaryJson Summary { get; set; }
    }

    public class RoomMappingJson
    {
        public string DialuxRoomName { get; set; }
        public string RevitRoomName { get; set; }
        public int RevitElementId { get; set; }
        public double MatchScore { get; set; }
        public List<FixtureEntryJson> Fixtures { get; set; }
        public double RoomArea { get; set; }
        public List<double> RoomCenter { get; set; }
        public List<double> Origin { get; set; }
    }

    public class FixtureEntryJson
    {
        public string Name { get; set; }
        public string Manufacturer { get; set; }
        public int Quantity { get; set; }
        public List<List<double>> Positions { get; set; }
    }

    public class SummaryJson
    {
        public int TotalFixtures { get; set; }
        public int TotalQuantity { get; set; }
    }

    // ============================================================
    // Family Resolver
    // ============================================================

    public class FamilyResolver
    {
        private Document _doc;
        private Dictionary<int, FamilySymbol> _cache;
        private List<string> _availableNames;

        public FamilyResolver(Document doc)
        {
            _doc = doc;
            _cache = new Dictionary<int, FamilySymbol>();
            _availableNames = new List<string>();
            LoadAllLightingFamilies();
        }

        private void LoadAllLightingFamilies()
        {
            var collector = new FilteredElementCollector(_doc)
                .OfCategory(BuiltInCategory.OST_LightingFixtures)
                .OfClass(typeof(FamilyInstance));

            foreach (FamilyInstance fi in collector)
            {
                FamilySymbol symbol = fi.Symbol;
                if (symbol != null && !_cache.ContainsKey(symbol.Id.IntegerValue))
                {
                    _cache[symbol.Id.IntegerValue] = symbol;
                    _availableNames.Add($"{symbol.Family.Name}/{symbol.Name}");
                }
            }
        }

        public FamilySymbol FindFamily(string fixtureName)
        {
            if (string.IsNullOrEmpty(fixtureName))
                return null;

            string lowerName = fixtureName.ToLower().Trim();

            // Exact match on symbol name
            foreach (var kvp in _cache)
            {
                if (kvp.Value.Name.ToLower() == lowerName)
                    return kvp.Value;
                if (kvp.Value.Family.Name.ToLower() == lowerName)
                    return kvp.Value;
            }

            // Containment check
            foreach (var kvp in _cache)
            {
                string symLower = kvp.Value.Name.ToLower();
                string famLower = kvp.Value.Family.Name.ToLower();

                if (symLower.Contains(lowerName) || lowerName.Contains(symLower))
                    return kvp.Value;
                if (famLower.Contains(lowerName) || lowerName.Contains(famLower))
                    return kvp.Value;
            }

            // Fuzzy match using character overlap
            FamilySymbol bestMatch = null;
            double bestScore = 0;

            foreach (var kvp in _cache)
            {
                double symScore = CharacterOverlap(lowerName, kvp.Value.Name.ToLower());
                double famScore = CharacterOverlap(lowerName, kvp.Value.Family.Name.ToLower());
                double maxScore = Math.Max(symScore, famScore);

                if (maxScore > bestScore)
                {
                    bestScore = maxScore;
                    bestMatch = kvp.Value;
                }
            }

            if (bestMatch != null && bestScore >= 0.4)
                return bestMatch;

            return null;
        }

        private double CharacterOverlap(string s1, string s2)
        {
            if (string.IsNullOrEmpty(s1) || string.IsNullOrEmpty(s2))
                return 0;

            int common = 0;
            int maxLen = Math.Max(s1.Length, s2.Length);

            // Count common characters
            var s2Chars = s2.ToCharArray();
            foreach (char c in s1)
            {
                int idx = Array.IndexOf(s2Chars, c);
                if (idx >= 0)
                {
                    common++;
                    s2Chars[idx] = '\0'; // Mark as used
                }
            }

            return (double)common / maxLen;
        }

        public List<string> GetAvailableFamilies()
        {
            return _availableNames;
        }
    }

    // ============================================================
    // Fixture Placer
    // ============================================================

    public class FixturePlacer
    {
        private Document _doc;
        private FamilyResolver _resolver;
        private double _mountingHeight;
        private bool _skipExisting;
        private bool _autoGrid;

        public int PlacedCount { get; private set; }
        public int SkippedCount { get; private set; }
        public int ErrorCount { get; private set; }
        public List<string> Log { get; private set; } = new List<string>();

        public FixturePlacer(Document doc, FamilyResolver resolver,
            double mountingHeight, bool skipExisting, bool autoGrid)
        {
            _doc = doc;
            _resolver = resolver;
            _mountingHeight = mountingHeight; // in meters
            _skipExisting = skipExisting;
            _autoGrid = autoGrid;
        }

        public PlacementResult PlaceAll(List<RoomMappingJson> mappings)
        {
            PlacedCount = 0;
            SkippedCount = 0;
            ErrorCount = 0;
            Log.Clear();

            foreach (var mapping in mappings)
            {
                PlaceInMapping(mapping);
            }

            return new PlacementResult
            {
                Placed = PlacedCount,
                Skipped = SkippedCount,
                Errors = ErrorCount,
                Log = Log
            };
        }

        private void PlaceInMapping(RoomMappingJson mapping)
        {
            // Get room element
            Element roomElement = _doc.GetElement(
                new ElementId(mapping.RevitElementId));
            Room room = roomElement as Room;

            if (room == null)
            {
                ErrorCount++;
                Log.Add($"Room {mapping.RevitElementId} not found");
                return;
            }

            double[] origin = mapping.Origin != null
                ? mapping.Origin.ToArray()
                : new double[] { 0, 0 };

            if (mapping.Fixtures == null) return;

            foreach (var fixture in mapping.Fixtures)
            {
                PlaceFixture(room, origin, fixture);
            }
        }

        private void PlaceFixture(Room room, double[] origin, FixtureEntryJson fixture)
        {
            FamilySymbol symbol = _resolver.FindFamily(fixture.Name);
            if (symbol == null)
            {
                ErrorCount++;
                Log.Add($"No family for: {fixture.Name}");
                return;
            }

            var positions = fixture.Positions ?? new List<List<double>>();
            int count = Math.Min(fixture.Quantity, positions.Count);

            if (count == 0 && _autoGrid)
            {
                // Auto-generate grid positions
                var autoPositions = GenerateGridPositions(room, fixture.Quantity);
                foreach (var pos in autoPositions)
                {
                    PlaceSingleFixture(room, symbol, fixture.Name,
                        pos[0], pos[1]);
                }
            }
            else
            {
                for (int i = 0; i < count; i++)
                {
                    double x = origin[0] + positions[i][0];
                    double y = origin[1] + positions[i][1];
                    PlaceSingleFixture(room, symbol, fixture.Name, x, y);
                }
            }
        }

        private void PlaceSingleFixture(Room room, FamilySymbol symbol,
            string name, double x, double y)
        {
            XYZ point = new XYZ(x, y, _mountingHeight);

            if (_skipExisting && FixtureExistsAt(point, symbol))
            {
                SkippedCount++;
                return;
            }

            try
            {
                FamilyInstance newFixture = _doc.Create
                    .NewFamilyInstance(point, symbol, room);

                if (newFixture != null)
                {
                    PlacedCount++;
                    Log.Add($"Placed: {name} at ({x:F2}, {y:F2})");
                }
            }
            catch (Exception ex)
            {
                ErrorCount++;
                Log.Add($"Error placing {name}: {ex.Message}");
            }
        }

        private List<double[]> GenerateGridPositions(Room room, int quantity)
        {
            if (quantity <= 0) return new List<double[]>();

            BoundingBoxXYZ bbox = room.get_BoundingBox(null);
            if (bbox == null)
                return new List<double[]> { new double[] { 0, 0 } };

            double width = bbox.Max.X - bbox.Min.X;
            double depth = bbox.Max.Y - bbox.Min.Y;

            int rows = (int)Math.Sqrt(quantity * width / Math.Max(depth, 0.1));
            int cols = (int)Math.Ceiling((double)quantity / rows);

            double marginX = width * 0.15;
            double marginY = depth * 0.15;
            double usableX = width - 2 * marginX;
            double usableY = depth - 2 * marginY;

            var positions = new List<double[]>();
            int placed = 0;

            for (int r = 0; r < rows && placed < quantity; r++)
            {
                for (int c = 0; c < cols && placed < quantity; c++)
                {
                    double x = bbox.Min.X + marginX +
                               (usableX * c / Math.Max(cols - 1, 1));
                    double y = bbox.Min.Y + marginY +
                               (usableY * r / Math.Max(rows - 1, 1));
                    positions.Add(new double[] { x, y });
                    placed++;
                }
            }

            return positions;
        }

        private bool FixtureExistsAt(XYZ point, FamilySymbol symbol)
        {
            var collector = new FilteredElementCollector(_doc)
                .OfCategory(BuiltInCategory.OST_LightingFixtures)
                .OfClass(typeof(FamilyInstance));

            foreach (FamilyInstance fi in collector)
            {
                LocationPoint loc = fi.Location as LocationPoint;
                if (loc != null)
                {
                    double dist = loc.Point.DistanceTo(point);
                    if (dist < 0.5 && fi.Symbol.Id == symbol.Id)
                        return true;
                }
            }
            return false;
        }
    }

    // ============================================================
    // Result Types
    // ============================================================

    public class PlacementResult
    {
        public int Placed { get; set; }
        public int Skipped { get; set; }
        public int Errors { get; set; }
        public List<string> Log { get; set; }
    }
}
