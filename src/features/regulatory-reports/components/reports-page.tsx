import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { reports } from "@/features/regulatory-reports/reports.rules";
import { views } from "./reports-views";

export function ReportsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const current = reports.find((r) => r.key === selected);
  const View = current ? views[current.key] : undefined;

  if (current && View) {
    return (
      <>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 mb-4"
        >
          <ChevronLeft size={16} /> Volver a Reportes
        </button>
        <PageHeader title={current.name} description={current.description} />
        <View />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Conciliaciones, reportes regulatorios y de impuestos"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => setSelected(r.key)}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-lg shadow-sm transition-all"
            >
              <Icon size={28} className={`${r.color} mb-3`} strokeWidth={1.75} />
              <div className="font-semibold text-foreground text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.description}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}
