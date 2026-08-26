import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Edit3, X, CheckCircle, Unlock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AlertaGestionModal, type GestionAlerta } from "@/components/alerta-gestion";

type Bloqueo = {
  legajo: string;
  usuario: string;
  nombre: string;
  tipo: string;
  estado: string;
  compliance: string;
  fecha: string;
  fechaAceptacion?: string;
  idCoelsa: string;
  monto: string;
  resolucion?: string;
  fechaResolucion?: string;
};

const todayISO = new Date().toISOString().slice(0, 10);

const mock: Bloqueo[] = [
  {
    legajo: "BL-001",
    usuario: "jperez",
    nombre: "Juan Pérez",
    tipo: "Volumen anormal",
    estado: "Aceptado",
    compliance: "M. Rodríguez",
    fecha: "2026-07-15",
    fechaAceptacion: "2026-07-15",
    idCoelsa: "COE-8823",
    monto: "$ 12,450.00",
  },
  {
    legajo: "BL-002",
    usuario: "mgarcia",
    nombre: "María García",
    tipo: "Múltiples intentos fallidos",
    estado: "Aceptado",
    compliance: "L. Fernández",
    fecha: "2026-07-14",
    fechaAceptacion: "2026-07-14",
    idCoelsa: "COE-8824",
    monto: "$ 0.00",
  },
  {
    legajo: "BL-003",
    usuario: "carlosm",
    nombre: "Carlos Martínez",
    tipo: "Límite de depósito excedido",
    estado: "Desbloqueado",
    compliance: "M. Rodríguez",
    fecha: "2026-07-10",
    fechaAceptacion: "2026-07-10",
    idCoelsa: "COE-8810",
    monto: "$ 450,000.00",
    resolucion: "Cliente justificó origen de fondos",
    fechaResolucion: "2026-07-12",
  },
  {
    legajo: "BL-004",
    usuario: "analopez",
    nombre: "Ana López",
    tipo: "Frecuencia anómala",
    estado: "Aceptado",
    compliance: "P. Sánchez",
    fecha: "2026-07-13",
    fechaAceptacion: "2026-07-13",
    idCoelsa: "COE-8815",
    monto: "$ 89,200.00",
  },
  {
    legajo: "BL-005",
    usuario: "robertod",
    nombre: "Roberto Díaz",
    tipo: "Afinidad entre cuentas",
    estado: "Desbloqueado",
    compliance: "L. Fernández",
    fecha: "2026-07-08",
    fechaAceptacion: "2026-07-08",
    idCoelsa: "COE-8790",
    monto: "$ 23,100.00",
    resolucion: "Cuentas validadas como grupo económico",
    fechaResolucion: "2026-07-11",
  },
  {
    legajo: "BL-006",
    usuario: "sofiar",
    nombre: "Sofía Romero",
    tipo: "CUIT en lista de control",
    estado: "Aceptado",
    compliance: "M. Rodríguez",
    fecha: "2026-07-16",
    fechaAceptacion: "2026-07-16",
    idCoelsa: "COE-8830",
    monto: "$ 567,800.00",
  },
  {
    legajo: "BL-007",
    usuario: "diegoh",
    nombre: "Diego Hernández",
    tipo: "Movimiento en horario inusual",
    estado: "Bloqueado",
    compliance: "—",
    fecha: "2026-07-16",
    idCoelsa: "COE-8832",
    monto: "$ 3,250.00",
  },
  {
    legajo: "BL-008",
    usuario: "laura v",
    nombre: "Laura Vargas",
    tipo: "Volumen anormal",
    estado: "Desbloqueado",
    compliance: "P. Sánchez",
    fecha: "2026-07-05",
    fechaAceptacion: "2026-07-05",
    idCoelsa: "COE-8760",
    monto: "$ 1,200,000.00",
    resolucion: "Cliente presentó documentación respaldatoria",
    fechaResolucion: "2026-07-07",
  },
];

function BloqueoDetail({ b, onClose }: { b: Bloqueo; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Detalle del bloqueo</h3>
          <button onClick={onClose} className="p-1 hover:opacity-70">
            <X size={18} />
          </button>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Bloqueo</dt>
            <dd className="font-mono tabular-nums font-semibold">{b.legajo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Usuario</dt>
            <dd>{b.usuario}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">ID COELSA</dt>
            <dd className="font-mono tabular-nums text-xs">{b.idCoelsa}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Monto</dt>
            <dd className="font-mono tabular-nums font-semibold">{b.monto}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tipo</dt>
            <dd>{b.tipo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estado</dt>
            <dd>
              <Badge
                tone={
                  b.estado === "Desbloqueado"
                    ? "success"
                    : b.estado === "Bloqueado"
                      ? "danger"
                      : "warn"
                }
              >
                {b.estado}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fecha del bloqueo</dt>
            <dd>
              <span className="font-mono tabular-nums">{b.fecha}</span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fecha de aceptación del bloqueo</dt>
            <dd>
              <span className="font-mono tabular-nums">{b.fechaAceptacion ?? "—"}</span>
            </dd>
          </div>
          {b.resolucion && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Resolución</dt>
              <dd className="text-right max-w-[200px]">{b.resolucion}</dd>
            </div>
          )}
          {b.fechaResolucion && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fecha de resolución</dt>
              <dd>
                <span className="font-mono tabular-nums">{b.fechaResolucion}</span>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/general/alertas/bloqueos")({
  head: () => ({ meta: [{ title: "Listado de bloqueos — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState(mock);
  const [detail, setDetail] = useState<Bloqueo | null>(null);
  const [gestionTarget, setGestionTarget] = useState<Bloqueo | null>(null);
  const [gestiones, setGestiones] = useState<Record<string, GestionAlerta>>({});
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (r: Bloqueo): ActionItem[] => {
    const actions: ActionItem[] = [
      { label: "Ver detalles", icon: Eye, onClick: () => setDetail(r) },
      { label: "Gestionar", icon: Edit3, onClick: () => setGestionTarget({ ...r }) },
    ];
    if (r.estado === "Bloqueado") {
      actions.push({
        label: "Aceptar bloqueo",
        icon: CheckCircle,
        onClick: () =>
          setConfirmAction({
            title: "Aceptar bloqueo",
            message: `¿Estás seguro de aceptar el bloqueo de ${r.nombre}? Se registrará la fecha de aceptación del bloqueo.`,
            confirmLabel: "Aceptar bloqueo",
            variant: "default",
            onConfirm: () =>
              setData((prev) =>
                prev.map((bl) =>
                  bl.legajo === r.legajo
                    ? { ...bl, estado: "Aceptado", fechaAceptacion: todayISO }
                    : bl,
                ),
              ),
          }),
      });
    }
    if (r.estado === "Aceptado") {
      actions.push({
        label: "Desbloquear usuario",
        icon: Unlock,
        onClick: () =>
          setConfirmAction({
            title: "Desbloquear usuario",
            message: `¿Estás seguro de desbloquear a ${r.nombre}? El bloqueo pasará a estado Desbloqueado.`,
            confirmLabel: "Desbloquear usuario",
            variant: "default",
            onConfirm: () =>
              setData((prev) =>
                prev.map((bl) =>
                  bl.legajo === r.legajo
                    ? { ...bl, estado: "Desbloqueado", fechaResolucion: todayISO }
                    : bl,
                ),
              ),
          }),
      });
    }
    return actions;
  };

  const columns: Column<Bloqueo>[] = [
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.legajo}</span>,
    },
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => r.usuario,
    },
    { key: "nombre", label: "Nombre", sortable: true, filterable: true, render: (r) => r.nombre },
    { key: "tipo", label: "Tipo", sortable: true, filterable: true, render: (r) => r.tipo },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Bloqueado", "Aceptado", "Desbloqueado"],
      render: (r) => (
        <Badge
          tone={
            r.estado === "Desbloqueado" ? "success" : r.estado === "Bloqueado" ? "danger" : "warn"
          }
        >
          {r.estado}
        </Badge>
      ),
    },
    { key: "compliance", label: "Compliance", filterable: true, render: (r) => r.compliance },
    {
      key: "fecha",
      label: "Fecha del bloqueo",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
    },
    {
      key: "fechaAceptacion",
      label: "Fecha de aceptación del bloqueo",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaAceptacion ?? "—"}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Listado de bloqueos"
        description="Gestión de cuentas bloqueadas automáticamente"
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        dateFilterColumns={["fecha", "fechaAceptacion"]}
      />
      {detail && <BloqueoDetail b={detail} onClose={() => setDetail(null)} />}
      <AlertaGestionModal
        open={!!gestionTarget}
        onClose={() => setGestionTarget(null)}
        title="Gestión de bloqueo"
        resumen={gestionTarget ? `${gestionTarget.tipo} · ${gestionTarget.nombre}` : ""}
        onGuardar={(g) => {
          if (gestionTarget) {
            setGestiones((prev) => ({ ...prev, [gestionTarget.legajo]: g }));
            setData((prev) =>
              prev.map((bl) =>
                bl.legajo === gestionTarget.legajo
                  ? { ...bl, estado: "Aceptado", fechaAceptacion: g.fecha }
                  : bl,
              ),
            );
          }
        }}
      />
      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </>
  );
}
