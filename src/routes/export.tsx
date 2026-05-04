import { createFileRoute } from "@tanstack/react-router";
import { FileDown, Printer, Download } from "lucide-react";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { getSessions } from "@/lib/sessions";

export const Route = createFileRoute("/export")({
  head: () => ({ meta: [{ title: "Export — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const exportJson = () => {
    const data = JSON.stringify(getSessions(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gensizer-sessions-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<FileDown className="w-5 h-5" />} tone="var(--primary)" title="Export" subtitle="Export saved sessions for submittal documentation" />

      <div className="grid md:grid-cols-2 gap-4">
        <button className="noir-card p-6 text-left hover:border-primary/60 transition-colors" onClick={exportJson}>
          <Download className="w-6 h-6 text-primary mb-3" />
          <div className="font-display text-lg font-semibold">Download Session JSON</div>
          <p className="text-sm text-muted-foreground mt-1">Export all saved calculations as a JSON archive.</p>
        </button>
        <button className="noir-card p-6 text-left hover:border-primary/60 transition-colors" onClick={() => window.print()}>
          <Printer className="w-6 h-6 text-primary mb-3" />
          <div className="font-display text-lg font-semibold">Print Current Page</div>
          <p className="text-sm text-muted-foreground mt-1">Print or save the active module's results to PDF.</p>
        </button>
      </div>
    </>
  );
}