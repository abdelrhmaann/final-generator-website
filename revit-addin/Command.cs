using System;
using System.Collections.Generic;
using System.Linq;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.DB.Electrical;
using Autodesk.Revit.UI;
using Autodesk.Revit.UI.Selection;

namespace RevitConduitAddin
{
    [Transaction(TransactionMode.Manual)]
    public class ConvertLinesToConduitCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            UIDocument uiDoc = commandData.Application.ActiveUIDocument;
            Document doc = uiDoc.Document;

            try
            {
                // 1. Show Settings UI
                SettingsWindow settings = new SettingsWindow();
                if (settings.ShowDialog() != true) return Result.Cancelled;

                // 2. Select lines
                ISelectionFilter filter = new LineSelectionFilter();
                IList<Reference> selectedRefs = uiDoc.Selection.PickObjects(ObjectType.Element, filter, "Select lines to convert");

                if (selectedRefs == null || selectedRefs.Count == 0) return Result.Cancelled;

                using (Transaction trans = new Transaction(doc, "Convert Lines with Fittings"))
                {
                    trans.Start();

                    ElementId conduitTypeId = doc.GetDefaultElementTypeId(ElementTypeGroup.ConduitType);
                    ElementId levelId = doc.ActiveView.GenLevel?.Id ?? new FilteredElementCollector(doc).OfClass(typeof(Level)).FirstElementId();

                    List<Conduit> createdConduits = new List<Conduit>();

                    foreach (Reference @ref in selectedRefs)
                    {
                        Element elem = doc.GetElement(@ref);
                        Curve curve = GetCurve(elem);
                        if (curve == null) continue;

                        // Get color from original element
                        Color color = GetElementColor(doc, elem);

                        Conduit conduit = Conduit.Create(doc, conduitTypeId, curve.GetEndPoint(0), curve.GetEndPoint(1), levelId);
                        
                        // Apply color override in active view
                        ApplyColorOverride(doc.ActiveView, conduit, color);
                        
                        createdConduits.Add(conduit);
                        
                        // Connect to Junction Box at ends
                        ConnectToNearestJunctionBox(doc, conduit, curve.GetEndPoint(0));
                        ConnectToNearestJunctionBox(doc, conduit, curve.GetEndPoint(1));
                    }

                    // 3. Add Fittings at intersections/turns
                    CreateFittings(doc, createdConduits);

                    trans.Commit();
                }

                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                message = ex.Message;
                return Result.Failed;
            }
        }

        private Curve GetCurve(Element elem)
        {
            if (elem is DetailLine dl) return dl.GeometryCurve;
            if (elem is ModelLine ml) return ml.GeometryCurve;
            if (elem is Wire w) return (w.Location as LocationCurve)?.Curve;
            return null;
        }

        private Color GetElementColor(Document doc, Element elem)
        {
            OverrideGraphicSettings settings = doc.ActiveView.GetElementOverrides(elem.Id);
            if (settings.ProjectionLineColor.IsValid) return settings.ProjectionLineColor;
            return elem.Category.LineColor;
        }

        private void ApplyColorOverride(View view, Element elem, Color color)
        {
            OverrideGraphicSettings ogs = new OverrideGraphicSettings();
            ogs.SetProjectionLineColor(color);
            view.SetElementOverrides(elem.Id, ogs);
        }

        private void CreateFittings(Document doc, List<Conduit> conduits)
        {
            for (int i = 0; i < conduits.Count; i++)
            {
                for (int j = i + 1; j < conduits.Count; j++)
                {
                    Connector c1 = GetCommonConnector(conduits[i], conduits[j]);
                    if (c1 != null)
                    {
                        Connector c2 = GetNearestConnector(conduits[j], c1.Origin);
                        if (c2 != null && !c1.IsConnected && !c2.IsConnected)
                        {
                            try { doc.Create.NewElbowFitting(c1, c2); } catch { }
                        }
                    }
                }
            }
        }

        private Connector GetCommonConnector(Conduit a, Conduit b)
        {
            foreach (Connector ca in a.ConnectorManager.Connectors)
            {
                foreach (Connector cb in b.ConnectorManager.Connectors)
                {
                    if (ca.Origin.IsAlmostEqualTo(cb.Origin)) return ca;
                }
            }
            return null;
        }

        private void ConnectToNearestJunctionBox(Document doc, Conduit conduit, XYZ point)
        {
            // Search for junction boxes (Electrical Fixtures or Communication Devices usually)
            // within a small radius (e.g., 1 foot)
            double radius = 1.0; 
            Outline outline = new Outline(point - new XYZ(radius, radius, radius), point + new XYZ(radius, radius, radius));
            BoundingBoxIntersectsFilter filter = new BoundingBoxIntersectsFilter(outline);

            var junctionBoxes = new FilteredElementCollector(doc)
                .OfClass(typeof(FamilyInstance))
                .WherePasses(filter)
                .Cast<FamilyInstance>()
                .Where(fi => IsJunctionBox(fi));

            foreach (FamilyInstance jbox in junctionBoxes)
            {
                Connector jboxConnector = GetAvailableConduitConnector(jbox, point);
                if (jboxConnector != null)
                {
                    Connector conduitConnector = GetNearestConnector(conduit, point);
                    if (conduitConnector != null)
                    {
                        conduitConnector.ConnectTo(jboxConnector);
                        break; // Connected to one box, move on
                    }
                }
            }
        }

        private bool IsJunctionBox(FamilyInstance fi)
        {
            // Check category or parameters to identify junction boxes
            string categoryName = fi.Category.Name.ToLower();
            return categoryName.Contains("electrical fixtures") || 
                   categoryName.Contains("junction box") ||
                   fi.Symbol.Family.Name.ToLower().Contains("junction box");
        }

        private Connector GetAvailableConduitConnector(FamilyInstance fi, XYZ point)
        {
            if (fi.MEPModel == null) return null;
            
            ConnectorManager cm = fi.MEPModel.ConnectorManager;
            if (cm == null) return null;

            return cm.Connectors.Cast<Connector>()
                .Where(c => c.ConnectorType == ConnectorType.End && !c.IsConnected)
                .OrderBy(c => c.Origin.DistanceTo(point))
                .FirstOrDefault();
        }

        private Connector GetNearestConnector(Element elem, XYZ point)
        {
            ConnectorSet connectors = null;
            if (elem is MEPCurve mepCurve) connectors = mepCurve.ConnectorManager.Connectors;
            
            if (connectors == null) return null;

            Connector nearest = null;
            double minDist = double.MaxValue;

            foreach (Connector c in connectors)
            {
                double dist = c.Origin.DistanceTo(point);
                if (dist < minDist)
                {
                    minDist = dist;
                    nearest = c;
                }
            }
            return nearest;
        }
    }

    [Transaction(TransactionMode.Manual)]
    public class ConnectFlexCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            UIDocument uiDoc = commandData.Application.ActiveUIDocument;
            Document doc = uiDoc.Document;

            SettingsWindow settings = new SettingsWindow();
            if (settings.ShowDialog() != true) return Result.Cancelled;
            double maxDist = settings.MaxDistance;

            try
            {
                using (Transaction trans = new Transaction(doc, "Connect Flex Conduit"))
                {
                    trans.Start();
                    var boxes = new FilteredElementCollector(doc).OfClass(typeof(FamilyInstance))
                        .Cast<FamilyInstance>().Where(fi => fi.Category.Name.Contains("Electrical Fixtures"));

                    foreach (var box in boxes)
                    {
                        XYZ boxPos = (box.Location as LocationPoint)?.Point;
                        if (boxPos == null) continue;

                        Element fixture = FindFixtureBelow(doc, boxPos, maxDist);
                        if (fixture != null)
                        {
                            // Create Flex Conduit connection logic here
                        }
                    }
                    trans.Commit();
                }
                return Result.Succeeded;
            }
            catch (Exception ex) { message = ex.Message; return Result.Failed; }
        }

        private Element FindFixtureBelow(Document doc, XYZ point, double maxDist)
        {
            View3D view3D = new FilteredElementCollector(doc).OfClass(typeof(View3D)).Cast<View3D>().FirstOrDefault(v => !v.IsTemplate);
            if (view3D == null) return null;

            ReferenceIntersector ri = new ReferenceIntersector(new ElementClassFilter(typeof(FamilyInstance)), FindReferenceTarget.Element, view3D);
            var result = ri.FindNearest(point, new XYZ(0, 0, -1));
            
            if (result != null && result.Proximity <= maxDist)
            {
                Element e = doc.GetElement(result.GetReference());
                if (e.Category.Name.Contains("Lighting Fixtures")) return e;
            }
            return null;
        }
    }

    public class LineSelectionFilter : ISelectionFilter
    {
        public bool AllowElement(Element elem) => elem is DetailLine || elem is ModelLine || elem is Wire;
        public bool AllowReference(Reference r, XYZ p) => true;
    }
}
