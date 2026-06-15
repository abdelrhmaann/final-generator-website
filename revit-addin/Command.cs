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
                // 1. Select lines (Detail Lines or Model Lines) or Wire lines
                ISelectionFilter filter = new LineSelectionFilter();
                IList<Reference> selectedRefs = uiDoc.Selection.PickObjects(ObjectType.Element, filter, "Select lines to convert to conduits");

                if (selectedRefs == null || selectedRefs.Count == 0) return Result.Cancelled;

                using (Transaction trans = new Transaction(doc, "Convert Lines to Conduit"))
                {
                    trans.Start();

                    // Get default conduit type and level
                    ElementId conduitTypeId = doc.GetDefaultElementTypeId(ElementTypeGroup.ConduitType);
                    
                    // Find a level (prefer the active view's level or first available)
                    ElementId levelId = doc.ActiveView.GenLevel?.Id ?? 
                                      new FilteredElementCollector(doc).OfClass(typeof(Level)).FirstElementId();

                    foreach (Reference @ref in selectedRefs)
                    {
                        Element elem = doc.GetElement(@ref);
                        Curve curve = null;

                        if (elem is DetailLine detailLine) curve = detailLine.GeometryCurve;
                        else if (elem is ModelLine modelLine) curve = modelLine.GeometryCurve;
                        else if (elem is Wire wire)
                        {
                            // Wires can have multiple segments, but we'll take the main path if possible
                            // For simplicity, we assume the wire has a location curve
                            curve = (wire.Location as LocationCurve)?.Curve;
                        }

                        if (curve == null) continue;

                        // 2. Create Conduit
                        XYZ start = curve.GetEndPoint(0);
                        XYZ end = curve.GetEndPoint(1);

                        Conduit conduit = Conduit.Create(doc, conduitTypeId, start, end, levelId);

                        // 3. Connect to Junction Box
                        ConnectToNearestJunctionBox(doc, conduit, start);
                        ConnectToNearestJunctionBox(doc, conduit, end);
                    }

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

    public class LineSelectionFilter : ISelectionFilter
    {
        public bool AllowElement(Element elem)
        {
            return elem is DetailLine || elem is ModelLine || elem is Wire;
        }

        public bool AllowReference(Reference reference, XYZ position) => true;
    }
}
