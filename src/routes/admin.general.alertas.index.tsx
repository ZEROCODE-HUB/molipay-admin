import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Edit3, XCircle, CheckCircle, ChevronDown } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AlertaGestionModal, type GestionAlerta } from "@/components/alerta-gestion";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, PageHeader } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/alertas/")({
  head: () => ({
    meta: [{ title: "Listado de alertas — Admin" }],
  }),
  component: ListadoAlertas,
});

type TransaccionOrigen = {
  email: string;
  cvu: string;
  legajo: string;
};

type TransaccionDestino = {
  nombreCompleto: string;
  cuitCuil: string;
  cvu: string;
};

type Transaccion = {
  tipo: string;
  monto: string;
  codigo: string;
  origen: TransaccionOrigen;
  destino: TransaccionDestino;
};

type Alerta = {
  legajo: string;
  correo: string;
  nombre: string;
  tipo: string;
  estado: string;
  activo: string;
  fechaAlerta: string;
  fechaAceptacion?: string;
  transacciones: Transaccion[];
};

const todayISO = new Date().toISOString().slice(0, 10);

const initialData: Alerta[] = [
  {
    legajo: "LEG-001",
    correo: "jperez@empresa.com",
    nombre: "Juan Pérez",
    tipo: "Depósito excedido",
    estado: "Pendiente",
    activo: "Sí",
    fechaAlerta: "2026-07-15",
    transacciones: [
      {
        tipo: "Depósito",
        monto: "$ 520,000.00",
        codigo: "Z4K6DVNOP1YRZXVE95J8LQ",
        origen: {
          email: "jperez@empresa.com",
          cvu: "0000003100012345678901",
          legajo: "LEG-001",
        },
        destino: {
          nombreCompleto: "Juan Pérez",
          cuitCuil: "20-30123456-7",
          cvu: "0000003100012345678901",
        },
      },
      {
        tipo: "Depósito",
        monto: "$ 180,000.00",
        codigo: "A1B2C3D4E5F6G7H8I9J0K",
        origen: {
          email: "jperez@empresa.com",
          cvu: "0000003100012345678901",
          legajo: "LEG-001",
        },
        destino: {
          nombreCompleto: "Juan Pérez",
          cuitCuil: "20-30123456-7",
          cvu: "0000003100012345678901",
        },
      },
    ],
  },
  {
    legajo: "LEG-002",
    correo: "mgarcia@corp.com",
    nombre: "María García",
    tipo: "Intento fallido",
    estado: "Revisado",
    activo: "Sí",
    fechaAlerta: "2026-07-14",
    fechaAceptacion: "2026-07-15",
    transacciones: [
      {
        tipo: "Retiro",
        monto: "$ 0.00",
        codigo: "K8Q7W6E5R4T3Y2U1I0O9P",
        origen: {
          email: "mgarcia@corp.com",
          cvu: "0000003100019876543210",
          legajo: "LEG-002",
        },
        destino: {
          nombreCompleto: "María García",
          cuitCuil: "27-28987654-3",
          cvu: "0000003100015566778899",
        },
      },
    ],
  },
  {
    legajo: "LEG-003",
    correo: "clopez@firm.com",
    nombre: "Carlos López",
    tipo: "Transferencia repetida",
    estado: "Pendiente",
    activo: "No",
    fechaAlerta: "2026-07-13",
    transacciones: [
      {
        tipo: "Transferencia",
        monto: "$ 45,000.00",
        codigo: "PLOKIJUHGYFTFRDESWAQ",
        origen: {
          email: "clopez@firm.com",
          cvu: "0000003100011122334455",
          legajo: "LEG-003",
        },
        destino: {
          nombreCompleto: "Inversiones López SA",
          cuitCuil: "30-71112223-4",
          cvu: "0000003100019988776655",
        },
      },
      {
        tipo: "Transferencia",
        monto: "$ 45,000.00",
        codigo: "MNBVCXZASDFGHJKLPOIU",
        origen: {
          email: "clopez@firm.com",
          cvu: "0000003100011122334455",
          legajo: "LEG-003",
        },
        destino: {
          nombreCompleto: "Inversiones López SA",
          cuitCuil: "30-71112223-4",
          cvu: "0000003100019988776655",
        },
      },
    ],
  },
  {
    legajo: "LEG-004",
    correo: "lrodriguez@sa.com",
    nombre: "Laura Rodríguez",
    tipo: "Horario inusual",
    estado: "Resuelto",
    activo: "Sí",
    fechaAlerta: "2026-07-12",
    fechaAceptacion: "2026-07-13",
    transacciones: [
      {
        tipo: "Transferencia",
        monto: "$ 789,749.00",
        codigo: "QWERTYUIOPASDFGHJKLZ",
        origen: {
          email: "lrodriguez@sa.com",
          cvu: "0000003100013344556677",
          legajo: "LEG-004",
        },
        destino: {
          nombreCompleto: "Ricardo Gómez",
          cuitCuil: "20-33445566-8",
          cvu: "0000003100018877665544",
        },
      },
    ],
  },
  {
    legajo: "LEG-005",
    correo: "mfernandez@corp.com",
    nombre: "Martín Fernández",
    tipo: "Volumen anormal",
    estado: "Pendiente",
    activo: "Sí",
    fechaAlerta: "2026-07-11",
    transacciones: [
      {
        tipo: "Transferencia",
        monto: "$ 1,250,000.00",
        codigo: "ZXCVBNMLKJHGFDSAPOIU",
        origen: {
          email: "mfernandez@corp.com",
          cvu: "0000003100017766554433",
          legajo: "LEG-005",
        },
        destino: {
          nombreCompleto: "Fernández Holding SA",
          cuitCuil: "30-71665544-2",
          cvu: "0000003100012233445566",
        },
      },
    ],
  },
  {
    legajo: "LEG-006",
    correo: "gmartinez@firm.com",
    nombre: "Gabriela Martínez",
    tipo: "Intento fallido",
    estado: "Revisado",
    activo: "No",
    fechaAlerta: "2026-07-10",
    fechaAceptacion: "2026-07-11",
    transacciones: [
      {
        tipo: "Retiro",
        monto: "$ 0.00",
        codigo: "LKJHGFDSAPOIUYTREWQ",
        origen: {
          email: "gmartinez@firm.com",
          cvu: "0000003100016655443322",
          legajo: "LEG-006",
        },
        destino: {
          nombreCompleto: "Gabriela Martínez",
          cuitCuil: "27-29221122-5",
          cvu: "0000003100011122112233",
        },
      },
    ],
  },
  {
    legajo: "LEG-007",
    correo: "dperez@sa.com",
    nombre: "Diego Pérez",
    tipo: "Transferencia repetida",
    estado: "Pendiente",
    activo: "Sí",
    fechaAlerta: "2026-07-09",
    transacciones: [
      {
        tipo: "Transferencia",
        monto: "$ 12,500.00",
        codigo: "POIUYTREWQASDFGHJKL",
        origen: {
          email: "dperez@sa.com",
          cvu: "0000003100015544332211",
          legajo: "LEG-007",
        },
        destino: {
          nombreCompleto: "Diego Pérez",
          cuitCuil: "20-29556677-1",
          cvu: "0000003100014433221100",
        },
      },
      {
        tipo: "Transferencia",
        monto: "$ 12,500.00",
        codigo: "MJUYTREWQZXCVBNMASD",
        origen: {
          email: "dperez@sa.com",
          cvu: "0000003100015544332211",
          legajo: "LEG-007",
        },
        destino: {
          nombreCompleto: "Diego Pérez",
          cuitCuil: "20-29556677-1",
          cvu: "0000003100014433221100",
        },
      },
    ],
  },
  {
    legajo: "LEG-008",
    correo: "agonzalez@corp.com",
    nombre: "Ana González",
    tipo: "Horario inusual",
    estado: "Pendiente",
    activo: "Sí",
    fechaAlerta: "2026-07-08",
    transacciones: [
      {
        tipo: "Transferencia",
        monto: "$ 25,000.00",
        codigo: "NBVCXZLKJHGFDSAQWER",
        origen: {
          email: "agonzalez@corp.com",
          cvu: "0000003100010099887766",
          legajo: "LEG-008",
        },
        destino: {
          nombreCompleto: "Ana González",
          cuitCuil: "27-28112233-9",
          cvu: "0000003100015566112233",
        },
      },
    ],
  },
  {
    legajo: "LEG-009",
    correo: "rmendoza@firm.com",
    nombre: "Roberto Mendoza",
    tipo: "Intento fallido",
    estado: "Revisado",
    activo: "Sí",
    fechaAlerta: "2026-07-07",
    fechaAceptacion: "2026-07-08",
    transacciones: [
      {
        tipo: "Retiro",
        monto: "$ 0.00",
        codigo: "ASDFGHJKLZXCVBNMQWE",
        origen: {
          email: "rmendoza@firm.com",
          cvu: "0000003100015566778899",
          legajo: "LEG-009",
        },
        destino: {
          nombreCompleto: "Roberto Mendoza",
          cuitCuil: "20-27223344-0",
          cvu: "0000003100019988776655",
        },
      },
    ],
  },
  {
    legajo: "LEG-010",
    correo: "csuarez@empresa.com",
    nombre: "Camila Suárez",
    tipo: "Depósito excedido",
    estado: "Pendiente",
    activo: "Sí",
    fechaAlerta: "2026-07-06",
    transacciones: [
      {
        tipo: "Depósito",
        monto: "$ 610,000.00",
        codigo: "QAZXSWEDCVFRTGBNHYU",
        origen: {
          email: "csuarez@empresa.com",
          cvu: "0000003100011234432112",
          legajo: "LEG-010",
        },
        destino: {
          nombreCompleto: "Camila Suárez",
          cuitCuil: "27-26998877-6",
          cvu: "0000003100011234432112",
        },
      },
    ],
  },
  {
    legajo: "LEG-011",
    correo: "fcastro@corp.com",
    nombre: "Federico Castro",
    tipo: "Transferencia repetida",
    estado: "Pendiente",
    activo: "Sí",
    fechaAlerta: "2026-07-05",
    transacciones: [
      {
        tipo: "Transferencia",
        monto: "$ 8,900.00",
        codigo: "WSXEDCRFVTGBYHNUJMI",
        origen: {
          email: "fcastro@corp.com",
          cvu: "0000003100016677889900",
          legajo: "LEG-011",
        },
        destino: {
          nombreCompleto: "Federico Castro",
          cuitCuil: "20-26556644-2",
          cvu: "0000003100012233445566",
        },
      },
      {
        tipo: "Transferencia",
        monto: "$ 8,900.00",
        codigo: "EDCRFVTGBYHNUJMIKOL",
        origen: {
          email: "fcastro@corp.com",
          cvu: "0000003100016677889900",
          legajo: "LEG-011",
        },
        destino: {
          nombreCompleto: "Federico Castro",
          cuitCuil: "20-26556644-2",
          cvu: "0000003100012233445566",
        },
      },
    ],
  },
  {
    legajo: "LEG-012",
    correo: "vmolina@firm.com",
    nombre: "Valentina Molina",
    tipo: "Horario inusual",
    estado: "Resuelto",
    activo: "No",
    fechaAlerta: "2026-07-04",
    fechaAceptacion: "2026-07-05",
    transacciones: [
      {
        tipo: "Transferencia",
        monto: "$ 32,000.00",
        codigo: "RFVTGBYHNUJMIKOLPZA",
        origen: {
          email: "vmolina@firm.com",
          cvu: "0000003100017788990011",
          legajo: "LEG-012",
        },
        destino: {
          nombreCompleto: "Valentina Molina",
          cuitCuil: "27-27881199-4",
          cvu: "0000003100014455667788",
        },
      },
    ],
  },
];

function AlertaFields({ alerta, onChange }: { alerta: Alerta; onChange: (a: Alerta) => void }) {
  const set = (patch: Partial<Alerta>) => onChange({ ...alerta, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Legajo</label>
        <input
          value={alerta.legajo}
          onChange={(e) => set({ legajo: e.target.value })}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Correo</label>
        <input
          value={alerta.correo}
          onChange={(e) => set({ correo: e.target.value })}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Nombre</label>
        <input
          value={alerta.nombre}
          onChange={(e) => set({ nombre: e.target.value })}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo de alerta</label>
        <input
          value={alerta.tipo}
          onChange={(e) => set({ tipo: e.target.value })}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Estado</label>
        <select
          className="w-full h-9 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40"
          value={alerta.estado}
          onChange={(e) => set({ estado: e.target.value })}
        >
          <option>Pendiente</option>
          <option>Revisado</option>
          <option>Resuelto</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Activo</label>
        <select
          className="w-full h-9 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40"
          value={alerta.activo}
          onChange={(e) => set({ activo: e.target.value })}
        >
          <option>Sí</option>
          <option>No</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Fecha de la alerta
        </label>
        <input
          type="date"
          value={alerta.fechaAlerta}
          onChange={(e) => set({ fechaAlerta: e.target.value })}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Fecha de aceptación
        </label>
        <input
          type="date"
          value={alerta.fechaAceptacion ?? ""}
          onChange={(e) => set({ fechaAceptacion: e.target.value || undefined })}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
    </div>
  );
}

function TransaccionRow({ t }: { t: Transaccion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="font-medium text-foreground">{t.tipo}</span>
        <span className="font-mono tabular-nums font-semibold">{t.monto}</span>
        <span className="text-muted-foreground text-xs ml-auto truncate">Código: {t.codigo}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-border/60 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Código</span>
            <span className="font-mono tabular-nums font-medium">{t.codigo}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-muted/40 p-3">
              <h5 className="text-xs font-semibold text-muted-foreground mb-2">Origen</h5>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium text-right break-all">{t.origen.email}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">CVU</dt>
                  <dd className="font-mono tabular-nums text-right">{t.origen.cvu}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Legajo</dt>
                  <dd className="font-mono tabular-nums font-medium">{t.origen.legajo}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <h5 className="text-xs font-semibold text-muted-foreground mb-2">Destino</h5>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Nombre completo</dt>
                  <dd className="font-medium text-right">{t.destino.nombreCompleto}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">CUIT/CUIL</dt>
                  <dd className="font-mono tabular-nums text-right">{t.destino.cuitCuil}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">CVU</dt>
                  <dd className="font-mono tabular-nums text-right">{t.destino.cvu}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="flex justify-between pt-2 border-t border-border/60">
            <span className="text-sm text-muted-foreground">Monto</span>
            <span className="font-mono tabular-nums font-semibold">{t.monto}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ListadoAlertas() {
  const [data, setData] = useState(initialData);
  const [viewing, setViewing] = useState<Alerta | null>(null);
  const [editTarget, setEditTarget] = useState<Alerta | null>(null);
  const [gestionTarget, setGestionTarget] = useState<Alerta | null>(null);
  const [gestiones, setGestiones] = useState<Record<string, GestionAlerta>>({});
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (row: Alerta): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing({ ...row }) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget({ ...row }) },
    {
      label: "Gestionar",
      icon: Edit3,
      onClick: () => setGestionTarget(row),
    },
    ...(!row.fechaAceptacion
      ? [
          {
            label: "Aceptar alerta",
            icon: CheckCircle,
            onClick: () =>
              setConfirmAction({
                title: "Aceptar alerta",
                message: `¿Estás seguro de aceptar la alerta de ${row.nombre}? Se registrará la fecha de aceptación.`,
                confirmLabel: "Aceptar alerta",
                variant: "default" as const,
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((a) =>
                      a.legajo === row.legajo
                        ? { ...a, estado: "Revisado", fechaAceptacion: todayISO }
                        : a,
                    ),
                  ),
              }),
          },
        ]
      : []),
    {
      label: row.activo === "Sí" ? "Desactivar" : "Activar",
      icon: row.activo === "Sí" ? XCircle : CheckCircle,
      onClick: () =>
        setConfirmAction({
          title: row.activo === "Sí" ? "Desactivar alerta" : "Activar alerta",
          message: `¿Estás seguro de ${row.activo === "Sí" ? "desactivar" : "activar"} la alerta de ${row.nombre}?`,
          confirmLabel: row.activo === "Sí" ? "Desactivar" : "Activar",
          variant: row.activo === "Sí" ? "danger" : "default",
          onConfirm: () =>
            setData((prev) =>
              prev.map((a) =>
                a.legajo === row.legajo ? { ...a, activo: row.activo === "Sí" ? "No" : "Sí" } : a,
              ),
            ),
        }),
    },
  ];

  const columns: Column<Alerta>[] = [
    {
      key: "legajo",
      label: "Legajo",
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span>,
    },
    { key: "correo", label: "Correo", filterable: true, render: (r) => r.correo },
    { key: "nombre", label: "Nombre", filterable: true, render: (r) => r.nombre },
    { key: "tipo", label: "Tipo de alerta", filterable: true, render: (r) => r.tipo },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: ["Pendiente", "Revisado", "Resuelto"],
      render: (row) => {
        const tone =
          row.estado === "Resuelto" ? "success" : row.estado === "Revisado" ? "neutral" : "warn";
        return <Badge tone={tone}>{row.estado}</Badge>;
      },
    },
    {
      key: "activo",
      label: "Activo",
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (row) => (
        <Badge tone={row.activo === "Sí" ? "success" : "danger"}>{row.activo}</Badge>
      ),
    },
    {
      key: "fechaAlerta",
      label: "Fecha de la alerta",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaAlerta}</span>,
    },
    {
      key: "fechaAceptacion",
      label: "Fecha de aceptación",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaAceptacion ?? "—"}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Listado de alertas"
        description="Alertas generadas por el sistema de monitoreo."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        dateFilterColumns={["fechaAlerta", "fechaAceptacion"]}
      />

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de alerta"
          description={`Alerta de ${viewing.nombre}`}
          onSubmit={() => {
            setData((prev) => prev.map((a) => (a.legajo === viewing.legajo ? viewing : a)));
            setViewing(null);
          }}
          submitLabel="Guardar cambios"
          size="lg"
        >
          <AlertaFields alerta={viewing} onChange={setViewing} />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Detalles de transacciones que gatillaron la alerta
            </h4>
            <div className="space-y-2">
              {viewing.transacciones.map((t, i) => (
                <TransaccionRow key={i} t={t} />
              ))}
            </div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar alerta"
          description={`Editando alerta de ${editTarget.nombre}`}
          onSubmit={() => {
            setData((prev) => prev.map((a) => (a.legajo === editTarget.legajo ? editTarget : a)));
            setEditTarget(null);
          }}
          submitLabel="Guardar cambios"
        >
          <AlertaFields alerta={editTarget} onChange={setEditTarget} />
        </FormDialog>
      )}

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

      <AlertaGestionModal
        open={!!gestionTarget}
        onClose={() => setGestionTarget(null)}
        resumen={gestionTarget ? `${gestionTarget.tipo} · ${gestionTarget.nombre}` : ""}
        onGuardar={(g) => {
          if (gestionTarget) {
            setGestiones((prev) => ({ ...prev, [gestionTarget.legajo]: g }));
            setData((prev) =>
              prev.map((a) =>
                a.legajo === gestionTarget.legajo
                  ? { ...a, estado: "Resuelto", fechaAceptacion: g.fecha }
                  : a,
              ),
            );
          }
        }}
      />
    </div>
  );
}
