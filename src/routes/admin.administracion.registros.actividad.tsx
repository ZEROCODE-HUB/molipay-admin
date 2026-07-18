import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

type Evento = { evento: string; tipo: string; usuario: string; recurso: string; accion: string; fecha: string; detalle: string };

const mock: Evento[] = [
  { evento: "Inicio de sesión", tipo: "Auth", usuario: "mrodriguez", recurso: "Sistema", accion: "Login", fecha: "2026-07-16 08:30:00", detalle: "IP: 192.168.1.100 — Éxito" },
  { evento: "Edición de usuario", tipo: "CRUD", usuario: "lfernandez", recurso: "Usuarios", accion: "Update", fecha: "2026-07-16 09:15:00", detalle: "Modificó estado de BL-003 a Resuelto" },
  { evento: "Creación de alerta", tipo: "Alerta", usuario: "Sistema", recurso: "Alertas", accion: "Create", fecha: "2026-07-16 09:22:00", detalle: "Alerta automática: Volumen anormal en cuenta JP-001" },
  { evento: "Exportación de reporte", tipo: "Reporte", usuario: "psanchez", recurso: "Reportes", accion: "Export", fecha: "2026-07-16 10:00:00", detalle: "Exportó conciliación 20260715.csv" },
  { evento: "Cambio de rol", tipo: "Admin", usuario: "mrodriguez", recurso: "Backoffice", accion: "Update", fecha: "2026-07-15 14:00:00", detalle: "Cambió rol de amartinez: Accounting → Reader" },
  { evento: "Bloqueo de cuenta", tipo: "Bloqueo", usuario: "Sistema", recurso: "Usuarios", accion: "Block", fecha: "2026-07-15 13:45:00", detalle: "Bloqueo automático por límite excedido — BL-006" },
  { evento: "Resolución de bloqueo", tipo: "Bloqueo", usuario: "lfernandez", recurso: "Usuarios", accion: "Unblock", fecha: "2026-07-15 11:30:00", detalle: "Resolvió BL-003 con comentario" },
  { evento: "Configuración modificada", tipo: "Config", usuario: "mrodriguez", recurso: "Configuración", accion: "Update", fecha: "2026-07-14 16:20:00", detalle: "Modificó parámetros de alertas" },
  { evento: "Envío de difusión", tipo: "Comms", usuario: "psanchez", recurso: "Incidentes", accion: "Send", fecha: "2026-07-14 09:15:00", detalle: "Envió: Demora en procesamiento COELSA" },
  { evento: "Nuevo usuario backoffice", tipo: "Admin", usuario: "mrodriguez", recurso: "Backoffice", accion: "Create", fecha: "2026-07-13 10:00:00", detalle: "Creó usuario sgarcia con rol User" },
  { evento: "Creación de rol", tipo: "Admin", usuario: "mrodriguez", recurso: "Roles", accion: "Create", fecha: "2026-07-12 15:00:00", detalle: "Creó rol Auditor" },
  { evento: "Verificación KYC", tipo: "KYC", usuario: "lfernandez", recurso: "Usuarios", accion: "Review", fecha: "2026-07-11 09:00:00", detalle: "Aprobó documento de Juan Pérez" },
  { evento: "Sincronización CVU", tipo: "CVU", usuario: "Sistema", recurso: "COELSA", accion: "Sync", fecha: "2026-07-11 08:00:00", detalle: "Sincronización CVU completada: 3 nuevos" },
  { evento: "Error de sistema", tipo: "Error", usuario: "Sistema", recurso: "API", accion: "Error", fecha: "2026-07-10 22:15:00", detalle: "Timeout en endpoint /api/transactions (5s)" },
  { evento: "Prueba de conexión Telegram", tipo: "Config", usuario: "mrodriguez", recurso: "Telegram", accion: "Test", fecha: "2026-07-10 17:00:00", detalle: "Prueba exitosa" },
];

export const Route = createFileRoute("/admin/administracion/registros/actividad")({
  head: () => [{ title: "Actividad en backoffice — Admin Panel" }],
  component: Page,
});

function Page() {
  const [detalle, setDetalle] = useState<Evento | null>(null);
  const columns: Column<Evento>[] = [
    { key: "evento", label: "Evento", sortable: true, filterable: true, render: (r) => r.evento },
    { key: "tipo", label: "Tipo", sortable: true, filterable: true, render: (r) => <Badge>{r.tipo}</Badge> },
    { key: "usuario", label: "Usuario", sortable: true, filterable: true, render: (r) => r.usuario },
    { key: "recurso", label: "Recurso", sortable: true, filterable: true, render: (r) => r.recurso },
    { key: "accion", label: "Acción", filterable: true, render: (r) => r.accion },
    { key: "fecha", label: "Fecha", sortable: true, render: (r) => r.fecha },
  ];
  return (
    <>
      <PageHeader title="Actividad en backoffice" description="Registro de eventos del panel administrativo" />
      <DataTable columns={columns} data={mock} keyExtractor={(r) => r.evento + r.fecha} pageSize={10}
        actions={(r) => <button onClick={() => setDetalle(r)} className="p-1.5 rounded hover:bg-muted" title="Ver detalles"><Eye size={14} /></button>}
      />
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetalle(null)}>
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Detalle del evento</h3>
              <button onClick={() => setDetalle(null)} className="p-1 hover:opacity-70"><X size={18} /></button>
            </div>
            <p className="text-sm p-3 bg-muted rounded-lg">{detalle.detalle}</p>
          </div>
        </div>
      )}
    </>
  );
}
