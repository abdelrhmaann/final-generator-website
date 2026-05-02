import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { Shell } from "./components/noir/Shell";
import OverviewPage from "./pages/OverviewPage";
import SizingPage from "./pages/SizingPage";
import VoltageDipPage from "./pages/VoltageDipPage";
import FuelPage from "./pages/FuelPage";
import AtsPage from "./pages/AtsPage";
import VentilationPage from "./pages/VentilationPage";

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Shell>
          <Switch>
            <Route path="/" component={OverviewPage} />
            <Route path="/sizing" component={SizingPage} />
            <Route path="/voltage-dip" component={VoltageDipPage} />
            <Route path="/fuel" component={FuelPage} />
            <Route path="/ats" component={AtsPage} />
            <Route path="/ventilation" component={VentilationPage} />
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
