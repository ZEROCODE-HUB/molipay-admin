import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, History, Eye, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

type Mensaje = { id: string; asunto: string; segmento: string; fecha: string; estado: string; contenido: string };

const historialMock: Mensaje[] = [
  { id: "MSG-001", asunto: "Mantenimiento programado — QR", segmento: "Módulo QR", fecha: "2026-07-15 14:30", estado: "Enviado", contenido: "Informamos que el servicio QR estará en mantenimiento el 17/07 de 02:00 a 04:00 hs." },
  { id: "MSG-002", asunto: "Demora en procesamiento COELSA", segmento: "Todos", fecha: "2026-07-14 09:15", estado: "Enviado", contenido: "Estamos experimentando demoras en la confirmación de transacciones por COELSA. Disculpe las molestias." },
  { id: "MSG-003", asunto: "Nueva funcionalidad — Link de pago", segmento: "Comercios", fecha: "2026-07-10 11:00", estado: "Enviado", contenido: "Ya está disponible la nueva funcionalidad de Link de pago con soporte para cuotas." },
  { id: "MSG-004", asunto: "Incidente resuelto — Transferencias", segmento: "Todos", fecha: "2026-07-08 16:45", estado: "Enviado", contenido: "El incidente con transferencias ha sido resuelto. El servicio funciona con normalidad." },
  { id: "MSG-005", asunto: "Programa de referidos", segmento: "Usuarios activos", fecha: "2026-07-05 10:00", estado: "Borrador", contenido: "Lanzamos nuestro programa de referidos. Compartí el link y obtené beneficios." },
];

export const Route = createFileRoute("/admin/incidentes")({
  head: () => ({ meta: [{ title: "Comunicación de incidentes — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [asunto, setAsunto] = useState("");
  const [contenido, setContenido] = useState("");
  const [segmento, setSegmento] = useState("Todos");
  const [ver, setVer] = useState<Mensaje | null>(null);

  const columns: Column<Mensaje>[] = [
    { key: "id", label: "ID", sortable: true, filterable: true, render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "asunto", label: "Asunto", sortable: true, filterable: true, render: (r) => r.asunto },
    { key: "segmento", label: "Segmento", filterable: true, render: (r) => r.segmento },
    { key: "fecha", label: "Fecha", sortable: true, filterable: "date", render: (r) => r.fecha },
    { key: "estado", label: "Estado", filterable: true, render: (r) => <Badge tone={r.estado === "Enviado" ? "success" : "warn"}>{r.estado}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Sistema de comunicación de incidentes" description="Notificación proactiva a clientes ante incidentes o mantenimientos" />

      <div className="bg-card border rounded-lg p-6 mb-8 max-w-2xl">
        <h3 className="font-semibold mb-4">Nuevo mensaje de difusión</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Asunto</label>
            <input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej: Mantenimiento programado"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Segmento</label>
            <select value={segmento} onChange={(e) => setSegmento(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
              <option>Todos</option>
              <option>Módulo QR</option>
              <option>Módulo Link de pago</option>
              <option>Comercios</option>
              <option>Usuarios activos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Mensaje</label>
            <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={4} placeholder="Escribí el mensaje de difusión..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <div className="flex justify-end">
            <button className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
              <Send size={14} /> Enviar difusión
            </button>
          </div>
        </div>
      </div>

      <PageHeader title="Historial de comunicaciones" />
      <DataTable columns={columns} data={historialMock} keyExtractor={(r) => r.id} pageSize={5}
        actions={(r) => <button onClick={() => setVer(r)} className="p-1.5 rounded hover:bg-muted" title="Ver"><Eye size={14} /></button>}
      />

      {ver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setVer(null)}>
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{ver.asunto}</h3>
              <button onClick={() => setVer(null)} className="p-1 hover:opacity-70"><X size={18} /></button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">ID</dt><dd className="font-mono text-xs">{ver.id}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Segmento</dt><dd>{ver.segmento}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Fecha</dt><dd>{ver.fecha}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Estado</dt><dd><Badge tone={ver.estado === "Enviado" ? "success" : "warn"}>{ver.estado}</Badge></dd></div>
            </dl>
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">{ver.contenido}</div>
          </div>
        </div>
      )}
    </>
  );
}
