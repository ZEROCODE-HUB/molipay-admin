import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Download, Search, Upload, FileSpreadsheet, Banknote, Receipt, BarChart3, Activity, Users, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, Badge, BtnOutline } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";

type ReportTab = {
  label: string;
  icon: typeof FileText;
  key: string;
};

const tabs: ReportTab[] = [
  { label: "Conciliaciones bancarias", icon: Banknote, key: "conciliaciones" },
  { label: "Reportes BCRA", icon: Receipt, key: "bcra" },
  { label: "Reportes ARCA", icon: FileText, key: "arca" },
  { label: "Reportes de comisiones", icon: DollarSign, key: "comisiones" },
  { label: "Reportes de movimientos", icon: BarChart3, key: "movimientos" },
  { label: "Actividad de usuarios", icon: Activity, key: "actividad" },
  { label: "Reportes de impuestos", icon: FileSpreadsheet, key: "impuestos" },
];

type Archivo = { archivo: string; fecha: string; estado: string };

export const Route = createFileRoute("/admin/administracion/reportes")({
  head: () => ({ meta: [{ title: "Reportes — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [currentTab, setCurrentTab] = useState("conciliaciones");

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

      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => {
          const active = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                active
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-6">
        {currentTab === "conciliaciones" && (
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
        )}

        {currentTab === "bcra" && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Receipt size={16} className="text-primary" /> Reportes BCRA</h3>
            <p className="text-sm text-muted-foreground">Reportes regulatorios enviados al Banco Central de la República Argentina.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-5"><h4 className="font-semibold text-sm">SISCEN — Régimen informativo mensual</h4><p className="text-xs text-muted-foreground mt-1">Período actual: Junio 2026 — Presentado el 15/07/2026</p><div className="mt-2"><Badge tone="success">Presentado</Badge></div></Card>
              <Card className="p-5"><h4 className="font-semibold text-sm">Régimen de transparencia</h4><p className="text-xs text-muted-foreground mt-1">Tasas activas y pasivas — Julio 2026</p><div className="mt-2"><Badge tone="warn">Pendiente</Badge></div></Card>
              <Card className="p-5"><h4 className="font-semibold text-sm">Información de clientes (SIC)</h4><p className="text-xs text-muted-foreground mt-1">Base consolidada al 30/06/2026 — 12,458 registros</p><div className="mt-2"><BtnOutline className="h-7 text-xs px-3">Exportar TXT</BtnOutline></div></Card>
              <Card className="p-5"><h4 className="font-semibold text-sm">Central de deudores</h4><p className="text-xs text-muted-foreground mt-1">Reporte trimestral — Q2 2026</p><div className="mt-2"><Badge tone="success">Presentado</Badge></div></Card>
            </div>
          </div>
        )}

        {currentTab === "arca" && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><FileText size={16} className="text-primary" /> Reportes ARCA</h3>
            <p className="text-sm text-muted-foreground">Reportes al organismo fiscal (ex AFIP).</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-5"><h4 className="font-semibold text-sm">RG 3685 — Régimen de información de operaciones</h4><p className="text-xs text-muted-foreground mt-1">Período Junio 2026 — Generado el 10/07/2026</p><div className="mt-2"><BtnOutline className="h-7 text-xs px-3">Descargar TXT</BtnOutline></div></Card>
              <Card className="p-5"><h4 className="font-semibold text-sm">RG 5450 — Información de beneficiarios finales</h4><p className="text-xs text-muted-foreground mt-1">Vencimiento: 31/08/2026</p><div className="mt-2"><Badge tone="warn">En preparación</Badge></div></Card>
              <Card className="p-5"><h4 className="font-semibold text-sm">RG 4613 — Impuesto al cheque (sobre CBU)</h4><p className="text-xs text-muted-foreground mt-1">Base imponible mensual — Julio 2026</p><div className="mt-2"><BtnOutline className="h-7 text-xs px-3">Calcular</BtnOutline></div></Card>
            </div>
          </div>
        )}

        {currentTab === "comisiones" && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><DollarSign size={16} className="text-primary" /> Reportes de comisiones</h3>
            <p className="text-sm text-muted-foreground">Detalle de comisiones por período y tipo de operación.</p>
            <DataTable
              columns={[
                { key: "periodo", label: "Período", render: (r: any) => r.periodo },
                { key: "tipo", label: "Tipo", render: (r: any) => r.tipo },
                { key: "cantidad", label: "Cantidad", render: (r: any) => r.cantidad },
                { key: "monto", label: "Monto cobrado", render: (r: any) => r.monto },
                { key: "comision", label: "Comisión", render: (r: any) => r.comision },
              ]}
              data={[
                { periodo: "2026-06", tipo: "Depósitos", cantidad: 1245, monto: "$ 12.450.000", comision: "$ 186.750" },
                { periodo: "2026-06", tipo: "Retiros", cantidad: 892, monto: "$ 8.920.000", comision: "$ 133.800" },
                { periodo: "2026-06", tipo: "Transferencias", cantidad: 3456, monto: "$ 34.560.000", comision: "$ 518.400" },
                { periodo: "2026-05", tipo: "Depósitos", cantidad: 1187, monto: "$ 11.870.000", comision: "$ 178.050" },
                { periodo: "2026-05", tipo: "Retiros", cantidad: 845, monto: "$ 8.450.000", comision: "$ 126.750" },
              ]}
              keyExtractor={(r: any) => r.periodo + r.tipo}
            />
          </div>
        )}

        {currentTab === "movimientos" && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><BarChart3 size={16} className="text-primary" /> Reportes de movimientos</h3>
            <p className="text-sm text-muted-foreground">Exportación de movimientos por rango de fechas y tipo.</p>
            <div className="flex gap-3 items-end flex-wrap">
              <div><label className="text-xs font-semibold block mb-1">Desde</label><input type="date" className="h-10 px-3 rounded-md border border-input bg-card text-sm" /></div>
              <div><label className="text-xs font-semibold block mb-1">Hasta</label><input type="date" className="h-10 px-3 rounded-md border border-input bg-card text-sm" /></div>
              <div><label className="text-xs font-semibold block mb-1">Tipo</label><select className="h-10 px-3 rounded-md border border-input bg-card text-sm"><option>Todos</option><option>Depósitos</option><option>Retiros</option><option>Transferencias</option></select></div>
              <BtnOutline className="h-10">Generar reporte</BtnOutline>
            </div>
            <DataTable
              columns={[
                { key: "fecha", label: "Fecha", render: (r: any) => r.fecha },
                { key: "tipo", label: "Tipo", render: (r: any) => r.tipo },
                { key: "cantidad", label: "Cantidad", render: (r: any) => r.cantidad },
                { key: "volumen", label: "Volumen", render: (r: any) => r.volumen },
              ]}
              data={[
                { fecha: "15/07/2026", tipo: "Depósitos", cantidad: 42, volumen: "$ 3.250.000" },
                { fecha: "15/07/2026", tipo: "Retiros", cantidad: 28, volumen: "$ 1.890.000" },
                { fecha: "14/07/2026", tipo: "Depósitos", cantidad: 56, volumen: "$ 4.120.000" },
                { fecha: "14/07/2026", tipo: "Retiros", cantidad: 31, volumen: "$ 2.050.000" },
              ]}
              keyExtractor={(r: any) => r.fecha + r.tipo}
            />
          </div>
        )}

        {currentTab === "actividad" && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Users size={16} className="text-primary" /> Actividad de usuarios</h3>
            <p className="text-sm text-muted-foreground">Actividad registrada por legajo de usuario backoffice.</p>
            <DataTable
              columns={[
                { key: "legajo", label: "Legajo", render: (r: any) => r.legajo },
                { key: "usuario", label: "Usuario", render: (r: any) => r.usuario },
                { key: "accion", label: "Acción", render: (r: any) => r.accion },
                { key: "ip", label: "IP", render: (r: any) => r.ip },
                { key: "fecha", label: "Fecha", render: (r: any) => r.fecha },
              ]}
              data={[
                { legajo: "ADM-001", usuario: "M. Rodríguez", accion: "Aprobó bloqueo BL-001", ip: "192.168.1.45", fecha: "15/07/2026 14:32" },
                { legajo: "ADM-002", usuario: "L. Fernández", accion: "Editó parámetros de alertas", ip: "192.168.1.23", fecha: "15/07/2026 11:15" },
                { legajo: "ADM-003", usuario: "P. Sánchez", accion: "Descargó reporte BCRA", ip: "190.210.33.12", fecha: "14/07/2026 16:48" },
                { legajo: "ADM-001", usuario: "M. Rodríguez", accion: "Creó usuario backoffice", ip: "192.168.1.45", fecha: "14/07/2026 09:00" },
              ]}
              keyExtractor={(r: any) => r.legajo + r.fecha}
            />
          </div>
        )}

        {currentTab === "impuestos" && (
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><FileSpreadsheet size={16} className="text-primary" /> Reportes de impuestos</h3>
            <DataTable columns={impColumns} data={impuestos} keyExtractor={(r) => r.periodo + r.tramo} pageSize={10}
              actions={() => (
                <div className="flex gap-1">
                  <button className="p-1.5 rounded hover:bg-muted" title="Ver detalle"><FileText size={14} /></button>
                  <button className="p-1.5 rounded hover:bg-muted" title="Descargar TXT"><Download size={14} /></button>
                </div>
              )}
            />
          </div>
        )}
      </div>
    </>
  );
}
