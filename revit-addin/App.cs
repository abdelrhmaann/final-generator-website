using System;
using System.Reflection;
using Autodesk.Revit.UI;
using System.Windows.Media.Imaging;

namespace RevitConduitAddin
{
    public class App : IExternalApplication
    {
        public Result OnStartup(UIControlledApplication application)
        {
            string tabName = "Manus Tools";
            application.CreateRibbonTab(tabName);

            RibbonPanel panel = application.CreateRibbonPanel(tabName, "Electrical");

            string assemblyPath = Assembly.GetExecutingAssembly().Location;

            // Button 1: Convert Lines
            PushButtonData btn1Data = new PushButtonData(
                "ConvertLines",
                "Convert\nLines",
                assemblyPath,
                "RevitConduitAddin.ConvertLinesToConduitCommand"
            );
            PushButton btn1 = panel.AddItem(btn1Data) as PushButton;
            btn1.ToolTip = "Convert selected lines/wires to conduit with fittings and color matching.";

            // Button 2: Connect Flex
            PushButtonData btn2Data = new PushButtonData(
                "ConnectFlex",
                "Connect\nFlex",
                assemblyPath,
                "RevitConduitAddin.ConnectFlexCommand"
            );
            PushButton btn2 = panel.AddItem(btn2Data) as PushButton;
            btn2.ToolTip = "Connect junction boxes to light fixtures using flex conduit.";

            return Result.Succeeded;
        }

        public Result OnShutdown(UIControlledApplication application)
        {
            return Result.Succeeded;
        }
    }
}
