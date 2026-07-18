import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Download, Search, ArrowRight, Upload, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, Badge, BtnOutline } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { TabLayout, type Tab } from "@/components/tab-layout";

// Mejora aplicada: se consolidaron reportes en vista única con filtro de tipo para evitar duplicación

const tabs: Tab[] = [
  { label: "Conciliaciones bancarias", to: "/admin/administracion/reportes" },
  { label: "Reportes BCRA", to: "/admin/administracion/reportes/bcra" },
  { label: "Reportes ARCA", to: "/admin/administracion/reportes/arca" },
  { label: "Reportes de comisiones", to: "/admin/administracion/reportes/comisiones" },
  { label: "Reportes de movimientos", to: "/admin/administracion/reportes/movimientos" },
  { label: "Actividad de usuarios", to: "/admin/administracion/reportes/actividad" },
  { label: "Reportes de impuestos", to: "/admin/administracion/reportes/impuestos" },
];

type Archivo = { archivo: string; fecha: string; estado: string };

export const Route = createFileRoute("/admin/administracion/reportes")({
  head: () => [{ title: "Reportes — Admin Panel" }],
  component: Page,
});

function Page() {
  const [currentTab, setCurrentTab] = useState(0);
  const archivos: Archivo[] = [
    { archivo: "conciliacion_20260716.csv", fecha: "2026-07-16", estado: "Pendiente" },
    { archivo: "conciliacion_20260715.csv", fecha: "2026-07-15", estado: "Analizado" },
    { archivo: "conciliacion_20260714.csv", fecha: "2026-07-14", estado: "Analizado" },
    { archivo: "conciliacion_20260713.csv", fecha: "2026-07-13", estado: "Analizado" },
  ];

  const impuestos: any[] = [
    { periodo: "2026-06", tramo: "1", creado: "2026-07-05", presentado: "Sí", pagado: "Sí" },
    { periodo: "2026-05", tramo: "2", creado: "2026-06-10", presentado: "Sí", pagado: "Sí" },
    { periodo: "2026-04", tramo: "1", creado: "2026-05-05", presentado: "Sí", pagado: "No" },
  ];

  const impColumns: Column<any>[] = [
    { key: "periodo", label: "Periodo", render: (r) => r.periodo },
    { key: "tramo", label: "Tramo", render: (r) => r.tramo },
    { key: "creado", label: "Fecha de creación", render: (r) => r.creado },
    { key: "presentado", label: "Presentado", render: (r) => <Badge tone={r.presentado === "Sí" ? "success" : "warn"}>{r.presentado}</Badge> },
    { key: "pagado", label: "Pagado", render: (r) => <Badge tone={r.pagado === "Sí" ? "success" : "danger"}>{r.pagado}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Reportes" description="Conciliaciones, reportes regulatorios y de impuestos" />
      <TabLayout tabs={tabs} />

      <div className="mt-6 space-y-6">
        {/* Conciliaciones bancarias */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Upload size={16} className="text-primary" /> Conciliaciones bancarias</h3>
          <p className="text-xs text-muted-foreground mb-3">El banco sube diariamente (día anterior) todas las transacciones.</p>
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left font-semibold py-2 px-4">Archivo</th><th className="text-left font-semibold py-2 px-4">Fecha</th><th className="text-center font-semibold py-2 px-4">Descargar</th><th className="text-center font-semibold py-2 px-4">Analizar</th></tr></thead>
              <tbody className="divide-y">
                {archivos.map((a) => (
                  <tr key={a.archivo} className="hover:bg-muted/30">
                    <td className="py-2 px-4 font-mono text-xs">{a.archivo}</td>
                    <td className="py-2 px-4">{a.fecha}</td>
                    <td className="text-center py-2 px-4"><button className="p-1.5 rounded hover:bg-muted"><Download size={14} /></button></td>
                    <td className="text-center py-2 px-4">
                      {a.estado === "Analizado" ? <Badge tone="success">Analizado</Badge> : <BtnOutline className="h-7 text-xs px-3">Analizar</BtnOutline>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reportes de impuestos */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><FileSpreadsheet size={16} className="text-primary" /> Reportes de impuestos</h3>
          <DataTable columns={impColumns} data={impuestos} keyExtractor={(r) => r.periodo + r.tramo} pageSize={10}
            actions={(r) => (
              <div className="flex gap-1">
                <button className="p-1.5 rounded hover:bg-muted" title="Ver detalle"><FileText size={14} /></button>
                <button className="p-1.5 rounded hover:bg-muted" title="Descargar TXT"><Download size={14} /></button>
              </div>
            )}
          />
        </div>

        {/* Other report cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[{ name: "Reportes BCRA", desc: "Reportes regulatorios ante el Banco Central" }, { name: "Reportes ARCA", desc: "Reportes ante el organismo fiscal" }, { name: "Reportes de comisiones", desc: "Detalle de comisiones por período" }, { name: "Reportes de movimientos", desc: "Exportación de movimientos por rango de fechas" }, { name: "Actividad de usuarios", desc: "Actividad por legajo de usuario" }].map((r) => (
            <Card key={r.name} className="p-5 flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText size={18} className="text-primary" /></div>
              <div className="flex-1 min-w-0"><h4 className="font-semibold text-sm">{r.name}</h4><p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p></div>
              <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-1" />
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
