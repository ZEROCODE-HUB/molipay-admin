import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye, Edit3, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";

type Bloqueo = {
  legajo: string;
  usuario: string;
  nombre: string;
  tipo: string;
  estado: string;
  compliance: string;
  fecha: string;
  idCoelsa: string;
  monto: string;
  resolucion?: string;
  fechaResolucion?: string;
};

const mock: Bloqueo[] = [
  { legajo: "BL-001", usuario: "jperez", nombre: "Juan Pérez", tipo: "Volumen anormal", estado: "Activo", compliance: "M. Rodríguez", fecha: "2026-07-15", idCoelsa: "COE-8823", monto: "$ 12,450.00" },
  { legajo: "BL-002", usuario: "mgarcia", nombre: "María García", tipo: "Múltiples intentos fallidos", estado: "Activo", compliance: "L. Fernández", fecha: "2026-07-14", idCoelsa: "COE-8824", monto: "$ 0.00" },
  { legajo: "BL-003", usuario: "carlosm", nombre: "Carlos Martínez", tipo: "Límite de depósito excedido", estado: "Resuelto", compliance: "M. Rodríguez", fecha: "2026-07-10", idCoelsa: "COE-8810", monto: "$ 450,000.00", resolucion: "Cliente justificó origen de fondos", fechaResolucion: "2026-07-12" },
  { legajo: "BL-004", usuario: "analopez", nombre: "Ana López", tipo: "Frecuencia anómala", estado: "Activo", compliance: "P. Sánchez", fecha: "2026-07-13", idCoelsa: "COE-8815", monto: "$ 89,200.00" },
  { legajo: "BL-005", usuario: "robertod", nombre: "Roberto Díaz", tipo: "Afinidad entre cuentas", estado: "Resuelto", compliance: "L. Fernández", fecha: "2026-07-08", idCoelsa: "COE-8790", monto: "$ 23,100.00", resolucion: "Cuentas validadas como grupo económico", fechaResolucion: "2026-07-11" },
  { legajo: "BL-006", usuario: "sofiar", nombre: "Sofía Romero", tipo: "CUIT en lista de control", estado: "Activo", compliance: "M. Rodríguez", fecha: "2026-07-16", idCoelsa: "COE-8830", monto: "$ 567,800.00" },
  { legajo: "BL-007", usuario: "diegoh", nombre: "Diego Hernández", tipo: "Movimiento en horario inusual", estado: "Pendiente", compliance: "—", fecha: "2026-07-16", idCoelsa: "COE-8832", monto: "$ 3,250.00" },
  { legajo: "BL-008", usuario: "laura v", nombre: "Laura Vargas", tipo: "Volumen anormal", estado: "Resuelto", compliance: "P. Sánchez", fecha: "2026-07-05", idCoelsa: "COE-8760", monto: "$ 1,200,000.00", resolucion: "Cliente presentó documentación respaldatoria", fechaResolucion: "2026-07-07" },
];

function BloqueoDetail({ b, onClose }: { b: Bloqueo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Detalle del bloqueo</h3>
          <button onClick={onClose} className="p-1 hover:opacity-70"><X size={18} /></button>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Bloqueo</dt><dd className="font-semibold">{b.legajo}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Usuario</dt><dd>{b.usuario}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">ID COELSA</dt><dd className="font-mono text-xs">{b.idCoelsa}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Monto</dt><dd className="font-semibold">{b.monto}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Tipo</dt><dd>{b.tipo}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Estado</dt><dd><Badge tone={b.estado === "Resuelto" ? "success" : b.estado === "Activo" ? "danger" : "warn"}>{b.estado}</Badge></dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Fecha</dt><dd>{b.fecha}</dd></div>
          {b.resolucion && <div className="flex justify-between"><dt className="text-muted-foreground">Resolución</dt><dd className="text-right max-w-[200px]">{b.resolucion}</dd></div>}
        </dl>
      </div>
    </div>
  );
}

function GestionarBloqueo({ b, onClose }: { b: Bloqueo; onClose: () => void }) {
  const [resolucion, setResolucion] = useState(b.resolucion ?? "");
  const [fecha, setFecha] = useState(b.fechaResolucion ?? new Date().toISOString().slice(0, 10));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Gestionar bloqueo — {b.legajo}</h3>
          <button onClick={onClose} className="p-1 hover:opacity-70"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Comentario de resolución</label>
            <textarea value={resolucion} onChange={(e) => setResolucion(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="Agregar comentario..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de resolución</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Guardar</button>
            <button onClick={onClose} className="flex-1 h-10 rounded-md border border-input text-sm font-semibold hover:bg-muted">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/general/alertas/bloqueos")({
  head: () => ({ meta: [{ title: "Listado de bloqueos — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [detail, setDetail] = useState<Bloqueo | null>(null);
  const [gestionar, setGestionar] = useState<Bloqueo | null>(null);

  const getActions = (r: Bloqueo): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(r) },
    { label: "Gestionar", icon: Edit3, onClick: () => setGestionar(r) },
  ];

  const columns: Column<Bloqueo>[] = [
    { key: "legajo", label: "Legajo", sortable: true, filterable: true, render: (r) => <span className="font-mono text-xs">{r.legajo}</span> },
    { key: "usuario", label: "Usuario", sortable: true, filterable: true, render: (r) => r.usuario },
    { key: "nombre", label: "Nombre", sortable: true, filterable: true, render: (r) => r.nombre },
    { key: "tipo", label: "Tipo", sortable: true, filterable: true, render: (r) => r.tipo },
    { key: "estado", label: "Estado", sortable: true, filterable: true, render: (r) => <Badge tone={r.estado === "Resuelto" ? "success" : r.estado === "Activo" ? "danger" : "warn"}>{r.estado}</Badge> },
    { key: "compliance", label: "Compliance", filterable: true, render: (r) => r.compliance },
    { key: "fecha", label: "Fecha", sortable: true, filterable: true, render: (r) => r.fecha },
  ];

  return (
    <>
      <PageHeader title="Listado de bloqueos" description="Gestión de cuentas bloqueadas automáticamente" action={
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-input text-sm font-semibold hover:bg-muted"><Download size={14} /> Descargar CSV</button>
      } />
      <DataTable
        columns={columns}
        data={mock}
        keyExtractor={(r) => r.legajo}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <BloqueoDetail b={detail} onClose={() => setDetail(null)} />}
      {gestionar && <GestionarBloqueo b={gestionar} onClose={() => setGestionar(null)} />}
    </>
  );
}
