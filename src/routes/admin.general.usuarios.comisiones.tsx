import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Eye, Edit3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BtnPrimary, Badge, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { desgloseDesdeConfig, fmtARS, fmtPct, type Desglose } from "@/lib/aranceles";
import type { ModalidadComision } from "@/data/clientes";

export const Route = createFileRoute("/admin/general/usuarios/comisiones")({
  head: () => ({
    meta: [
      { title: "Carga de comisiones — Usuarios — Admin Molly" },
      {
        name: "description",
        content: "Gestión de comisiones asignadas a usuarios de la plataforma.",
      },
    ],
  }),
  component: ComisionesPage,
});

type Comision = {
  legajo: string;
  correo: string;
  operacion: string;
  tipo: string;
  modalidad: ModalidadComision;
  estado: "Habilitado" | "Deshabilitado";
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  descripcion: string;
};

// Monto de referencia usado para previsualizar el desglose de cobro.
const MONTO_OPERACION_REF = 100000;

const montoBase = (c: Pick<Comision, "modalidad" | "porcentaje" | "montoFijo">) =>
  c.modalidad === "Fijo" ? (c.montoFijo ?? 0) : null;

const desgloseDe = (
  c: Pick<Comision, "modalidad" | "porcentaje" | "montoFijo" | "porcentajeImpuesto">,
): Desglose =>
  desgloseDesdeConfig(
    {
      operacion: "",
      modalidad: c.modalidad,
      porcentaje: c.porcentaje,
      montoFijo: c.montoFijo,
      porcentajeImpuesto: c.porcentajeImpuesto,
    },
    MONTO_OPERACION_REF,
  );

const configLabel = (c: Comision) =>
  c.modalidad === "Fijo" ? fmtARS(c.montoFijo ?? 0) : fmtPct(c.porcentaje ?? 0);

const initialData: Comision[] = [
  {
    legajo: "LPF-0001",
    correo: "juan.perez@email.com",
    operacion: "DEP-2024-001",
    tipo: "Depósito",
    modalidad: "Fijo",
    estado: "Habilitado",
    porcentaje: null,
    montoFijo: 150,
    porcentajeImpuesto: 21,
    descripcion: "Comisión por depósito estándar",
  },
  {
    legajo: "LPF-0002",
    correo: "maria.lopez@email.com",
    operacion: "RET-2024-015",
    tipo: "Retiro",
    modalidad: "Porcentaje",
    estado: "Habilitado",
    porcentaje: 0.5,
    montoFijo: null,
    porcentajeImpuesto: 21,
    descripcion: "Comisión por retiro express",
  },
  {
    legajo: "LPF-0021",
    correo: "carlos.martinez@email.com",
    operacion: "LNK-2024-032",
    tipo: "Link de pago",
    modalidad: "Porcentaje",
    estado: "Deshabilitado",
    porcentaje: 1.9,
    montoFijo: null,
    porcentajeImpuesto: 21,
    descripcion: "Comisión por link de pago",
  },
  {
    legajo: "LPF-0022",
    correo: "ana.garcia@email.com",
    operacion: "ECO-2024-008",
    tipo: "E-commerce",
    modalidad: "Porcentaje",
    estado: "Habilitado",
    porcentaje: 1,
    montoFijo: null,
    porcentajeImpuesto: 21,
    descripcion: "Comisión por transacción e-commerce",
  },
  {
    legajo: "LPF-0023",
    correo: "pedro.rodriguez@email.com",
    operacion: "DEP-2024-056",
    tipo: "Depósito",
    modalidad: "Fijo",
    estado: "Habilitado",
    porcentaje: null,
    montoFijo: 95,
    porcentajeImpuesto: 21,
    descripcion: "Comisión por depósito prioritario",
  },
  {
    legajo: "LPF-0024",
    correo: "lucia.mendoza@email.com",
    operacion: "RET-2024-089",
    tipo: "Retiro",
    modalidad: "Porcentaje",
    estado: "Deshabilitado",
    porcentaje: 0.75,
    montoFijo: null,
    porcentajeImpuesto: 21,
    descripcion: "Comisión por retiro programado",
  },
  {
    legajo: "LPF-0025",
    correo: "gabriel.rios@email.com",
    operacion: "LNK-2024-112",
    tipo: "Link de pago",
    modalidad: "Fijo",
    estado: "Habilitado",
    porcentaje: null,
    montoFijo: 60,
    porcentajeImpuesto: 21,
    descripcion: "Comisión por link recurrente",
  },
];

type ComisionDraft = Pick<
  Comision,
  | "correo"
  | "tipo"
  | "modalidad"
  | "porcentaje"
  | "montoFijo"
  | "porcentajeImpuesto"
  | "descripcion"
>;

function ComisionFormFields({
  draft,
  onChange,
}: {
  draft: ComisionDraft;
  onChange: (d: ComisionDraft) => void;
}) {
  return (
    <>
      <div>
        <Label htmlFor="com-correo">Email</Label>
        <Input
          id="com-correo"
          value={draft.correo}
          onChange={(e) => onChange({ ...draft, correo: e.target.value })}
          placeholder="usuario@email.com"
        />
      </div>
      <div>
        <Label htmlFor="com-tipo">Operación</Label>
        <select
          id="com-tipo"
          className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          value={draft.tipo}
          onChange={(e) => onChange({ ...draft, tipo: e.target.value })}
        >
          <option>Depósito</option>
          <option>Retiro</option>
          <option>Link de pago</option>
          <option>E-commerce</option>
        </select>
      </div>
      <div>
        <Label htmlFor="com-modalidad">Modalidad</Label>
        <select
          id="com-modalidad"
          className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          value={draft.modalidad}
          onChange={(e) => onChange({ ...draft, modalidad: e.target.value as ModalidadComision })}
        >
          <option>Porcentaje</option>
          <option>Fijo</option>
        </select>
      </div>
      {draft.modalidad === "Porcentaje" ? (
        <div>
          <Label htmlFor="com-pct">% Comisión</Label>
          <Input
            id="com-pct"
            type="number"
            step="0.01"
            min={0}
            value={draft.porcentaje ?? ""}
            onChange={(e) =>
              onChange({
                ...draft,
                porcentaje: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="Ej: 1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Porcentaje aplicado sobre el monto de la operación.
          </p>
        </div>
      ) : (
        <div>
          <Label htmlFor="com-fijo">Monto fijo por transacción</Label>
          <Input
            id="com-fijo"
            type="number"
            step="0.01"
            min={0}
            value={draft.montoFijo ?? ""}
            onChange={(e) =>
              onChange({
                ...draft,
                montoFijo: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="Ej: 100"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Modalidad alternativa (monto fijo) preparada en el modelo de datos.
          </p>
        </div>
      )}
      <div>
        <Label htmlFor="com-imp">% Impuesto (IVA sobre la comisión)</Label>
        <Input
          id="com-imp"
          type="number"
          step="0.01"
          min={0}
          value={draft.porcentajeImpuesto}
          onChange={(e) => onChange({ ...draft, porcentajeImpuesto: Number(e.target.value) || 0 })}
          placeholder="Ej: 21"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Impuesto que retiene y paga MoliPay por el servicio (hoy 21% IVA). Es distinto de las
          retenciones al cliente (Ingresos Brutos, débito/crédito).
        </p>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="com-desc">Descripción</Label>
        <textarea
          id="com-desc"
          className="w-full h-24 px-3 py-2 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring resize-none"
          value={draft.descripcion}
          onChange={(e) => onChange({ ...draft, descripcion: e.target.value })}
          placeholder="Detalle de la comisión..."
        />
      </div>
    </>
  );
}

function DesglosePreview({ desglose }: { desglose: Desglose }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Desglose del cobro (sobre $ 100.000 de operación)
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Comisión</span>
        <span className="font-mono tabular-nums">{fmtARS(desglose.comision)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Impuesto ({desglose.porcentajeImpuesto}%)</span>
        <span className="font-mono tabular-nums">{fmtARS(desglose.impuesto)}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
        <span>Monto cobrado al cliente</span>
        <span className="font-mono tabular-nums">{fmtARS(desglose.total)}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Fórmula: monto cobrado = comisión × (1 + {desglose.porcentajeImpuesto}%).
      </p>
    </div>
  );
}

function ComisionesPage() {
  const [data, setData] = useState<Comision[]>(initialData);
  const [showNueva, setShowNueva] = useState(false);
  const [viewing, setViewing] = useState<Comision | null>(null);
  const [editTarget, setEditTarget] = useState<Comision | null>(null);
  const [draft, setDraft] = useState<ComisionDraft>({
    correo: "",
    tipo: "Depósito",
    modalidad: "Porcentaje",
    porcentaje: 1,
    montoFijo: null,
    porcentajeImpuesto: 21,
    descripcion: "",
  });
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (row: Comision): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget(row) },
    ...(row.estado === "Habilitado"
      ? [
          {
            label: "Deshabilitar",
            icon: XCircle,
            variant: "danger" as const,
            onClick: () =>
              setConfirmAction({
                title: "Deshabilitar comisión",
                message: `¿Estás seguro de deshabilitar la comisión ${row.legajo}?`,
                confirmLabel: "Deshabilitar",
                variant: "danger",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((c) =>
                      c.legajo === row.legajo ? { ...c, estado: "Deshabilitado" } : c,
                    ),
                  ),
              }),
          },
        ]
      : [
          {
            label: "Habilitar",
            icon: Eye,
            onClick: () =>
              setConfirmAction({
                title: "Habilitar comisión",
                message: `¿Estás seguro de habilitar la comisión ${row.legajo}?`,
                confirmLabel: "Habilitar",
                variant: "default",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((c) => (c.legajo === row.legajo ? { ...c, estado: "Habilitado" } : c)),
                  ),
              }),
          },
        ]),
  ];

  const abrirNueva = () => {
    setDraft({
      correo: "",
      tipo: "Depósito",
      modalidad: "Porcentaje",
      porcentaje: 1,
      montoFijo: null,
      porcentajeImpuesto: 21,
      descripcion: "",
    });
    setShowNueva(true);
  };

  const abrirEdicion = (c: Comision) => {
    setDraft({
      correo: c.correo,
      tipo: c.tipo,
      modalidad: c.modalidad,
      porcentaje: c.porcentaje,
      montoFijo: c.montoFijo,
      porcentajeImpuesto: c.porcentajeImpuesto,
      descripcion: c.descripcion,
    });
    setEditTarget(c);
  };

  const guardarDraft = () => {
    if (editTarget) {
      setData((prev) => prev.map((c) => (c.legajo === editTarget.legajo ? { ...c, ...draft } : c)));
      setEditTarget(null);
    } else {
      const nueva: Comision = {
        legajo: `LPF-${String(99 + data.length)}`,
        correo: draft.correo,
        operacion: `OP-${String(data.length + 1).padStart(4, "0")}`,
        tipo: draft.tipo,
        modalidad: draft.modalidad,
        estado: "Habilitado",
        porcentaje: draft.modalidad === "Porcentaje" ? draft.porcentaje : null,
        montoFijo: draft.modalidad === "Fijo" ? draft.montoFijo : null,
        porcentajeImpuesto: draft.porcentajeImpuesto,
        descripcion: draft.descripcion,
      };
      setData((prev) => [...prev, nueva]);
      setShowNueva(false);
    }
  };

  const draftDesglose = desgloseDesdeConfig(
    {
      operacion: draft.tipo,
      modalidad: draft.modalidad,
      porcentaje: draft.porcentaje,
      montoFijo: draft.montoFijo,
      porcentajeImpuesto: draft.porcentajeImpuesto,
    },
    MONTO_OPERACION_REF,
  );

  return (
    <>
      <PageHeader
        title="Carga de comisiones"
        description="Comisión y % Impuesto (IVA sobre la comisión) parametrizables por cliente y tipo de operación."
        action={
          <BtnPrimary onClick={abrirNueva}>
            <Plus size={16} />
            Nueva comisión
          </BtnPrimary>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo + r.operacion}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de comisión"
          description={`Comisión ${viewing.legajo} — ${viewing.operacion}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <LegajoCell legajo={viewing.legajo} />
            </div>
            <div>
              <span className="text-muted-foreground">Correo:</span>{" "}
              <span className="font-medium">{viewing.correo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Operación:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{viewing.operacion}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo:</span>{" "}
              <span className="font-medium">{viewing.tipo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modalidad:</span>{" "}
              <span className="font-medium">{viewing.modalidad}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Configuración:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{configLabel(viewing)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">% Impuesto (IVA):</span>{" "}
              <span className="font-medium font-mono tabular-nums">
                {fmtPct(viewing.porcentajeImpuesto)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">
                {viewing.estado === "Habilitado" ? "Activa" : "Inactiva"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Descripción:</span>{" "}
              <span className="font-medium">{viewing.descripcion}</span>
            </div>
            <div className="col-span-2">
              <DesglosePreview desglose={desgloseDe(viewing)} />
            </div>
          </div>
        </FormDialog>
      )}

      {(editTarget || showNueva) && (
        <FormDialog
          open
          onClose={() => {
            setEditTarget(null);
            setShowNueva(false);
          }}
          title={editTarget ? "Editar comisión" : "Nueva comisión"}
          description={
            editTarget
              ? `Editando comisión ${editTarget.legajo}`
              : "Asignar una nueva comisión a un cliente."
          }
          onSubmit={guardarDraft}
          submitLabel="Guardar"
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ComisionFormFields draft={draft} onChange={setDraft} />
            <div className="sm:col-span-2">
              <DesglosePreview desglose={draftDesglose} />
            </div>
          </div>
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
    </>
  );
}

const columns: Column<Comision>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  { key: "correo", label: "Usuario", filterable: true, render: (r) => r.correo },
  {
    key: "operacion",
    label: "Código de operación",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.operacion}</span>,
  },
  {
    key: "tipo",
    label: "Operación",
    filterable: "enum",
    filterOptions: ["Depósito", "Retiro", "Link de pago", "E-commerce"],
    render: (r) => r.tipo,
  },
  {
    key: "modalidad",
    label: "Modalidad",
    filterable: "enum",
    filterOptions: ["Fijo", "Porcentaje"],
    render: (r) => r.modalidad,
  },
  {
    key: "porcentaje",
    label: "% Comisión",
    render: (r) => (
      <span className="font-mono tabular-nums">
        {r.modalidad === "Porcentaje" ? fmtPct(r.porcentaje ?? 0) : "—"}
      </span>
    ),
  },
  {
    key: "montoFijo",
    label: "Monto fijo",
    render: (r) => (
      <span className="font-mono tabular-nums">
        {r.modalidad === "Fijo" ? fmtARS(r.montoFijo ?? 0) : "—"}
      </span>
    ),
  },
  {
    key: "porcentajeImpuesto",
    label: "% Impuesto (IVA)",
    render: (r) => <span className="font-mono tabular-nums">{fmtPct(r.porcentajeImpuesto)}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["Habilitado", "Deshabilitado"],
    render: (row) => (
      <Badge tone={row.estado === "Habilitado" ? "success" : "danger"}>
        {row.estado === "Habilitado" ? "Habilitado" : "Deshabilitado"}
      </Badge>
    ),
  },
  { key: "descripcion", label: "Descripción", filterable: true, render: (r) => r.descripcion },
];
