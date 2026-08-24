import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Eye, Edit3, XCircle, AlertTriangle, Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BtnPrimary, Badge, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { desgloseDesdeConfig, fmtARS, fmtPct, type Desglose } from "@/lib/aranceles";
import { useComisiones } from "@/hooks/useComisiones";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { upsertComision, setComisionEstado } from "@/lib/api/comisiones";
import { getClienteByCorreo } from "@/lib/api/clientes";
import { DataAccessError } from "@/lib/api/errors";
import {
  TIPOS_OPERACION,
  type TipoOperacion,
  type ModalidadComision,
  type EstadoComision,
} from "@/lib/api/types";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";

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

const PAGE_SIZE = 25;

type Comision = {
  id: string;
  legajo: string;
  correo: string;
  cuit: string;
  tipoPersona: "fisica" | "juridica";
  operacion: string;
  tipo: TipoOperacion;
  modalidad: ModalidadComision;
  estado: EstadoComision;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  descripcion: string;
};

const MONTO_OPERACION_REF = 100000;

const desgloseDe = (
  c: Pick<Comision, "tipo" | "modalidad" | "porcentaje" | "montoFijo" | "porcentajeImpuesto">,
): Desglose =>
  desgloseDesdeConfig(
    {
      operacion: c.tipo,
      tipo: c.tipo,
      modalidad: c.modalidad,
      porcentaje: c.porcentaje,
      montoFijo: c.montoFijo,
      porcentajeImpuesto: c.porcentajeImpuesto,
    },
    MONTO_OPERACION_REF,
  );

const configLabel = (c: Comision) =>
  c.modalidad === "Fijo" ? fmtARS(c.montoFijo ?? 0) : fmtPct(c.porcentaje ?? 0);

type ComisionDraft = {
  id?: string;
  correo: string;
  cuit: string;
  tipoPersona: "fisica" | "juridica";
  tipo: TipoOperacion;
  modalidad: ModalidadComision;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  descripcion: string;
};

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
        <Label htmlFor="com-correo">Email del cliente</Label>
        <Input
          id="com-correo"
          value={draft.correo}
          onChange={(e) => onChange({ ...draft, correo: e.target.value })}
          placeholder="usuario@email.com"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          El cliente debe estar dado de alta. Su legajo (LPF/LPJ-CUIT) se resuelve desde la BD.
        </p>
      </div>
      <div>
        <Label htmlFor="com-cuit">CUIT</Label>
        <Input
          id="com-cuit"
          value={draft.cuit}
          onChange={(e) => onChange({ ...draft, cuit: e.target.value })}
          placeholder="20-12345678-9"
        />
      </div>
      <div>
        <Label htmlFor="com-operacion">Tipo de operación</Label>
        <select
          id="com-operacion"
          className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          value={draft.tipo}
          onChange={(e) => onChange({ ...draft, tipo: e.target.value as TipoOperacion })}
        >
          {TIPOS_OPERACION.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
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
    </div>
  );
}

function EstadoMensaje({
  tipo,
  mensaje,
  onRetry,
}: {
  tipo: "error" | "vacio" | "permiso";
  mensaje: string;
  onRetry?: () => void;
}) {
  if (tipo === "permiso") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{mensaje}</p>
        </div>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">Ocurrió un error al cargar las comisiones</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <BtnPrimary onClick={onRetry} className="mt-2">
            Reintentar
          </BtnPrimary>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay comisiones que coincidan con los filtros aplicados.</p>
    </div>
  );
}

function ComisionesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [tipo, setTipo] = useState<TipoOperacion | "">("");
  const [estado, setEstado] = useState<EstadoComision | "">("");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useComisiones({
    page,
    pageSize: PAGE_SIZE,
    search,
    tipo: tipo || undefined,
    estado: estado || undefined,
  });

  const [viewing, setViewing] = useState<Comision | null>(null);
  const [editTarget, setEditTarget] = useState<Comision | null>(null);
  const [showNueva, setShowNueva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const { can } = useCan();
  const puedeCrear = can("crear", "usuarios");
  const puedeModificar = can("modificar", "usuarios");

  const data: Comision[] = rows.map((c) => ({
    id: c.id,
    legajo: c.cliente?.legajo ?? "—",
    correo: c.cliente?.correo ?? "—",
    cuit: c.cliente?.cuit ?? "—",
    tipoPersona: c.cliente?.tipoPersona ?? "fisica",
    operacion: c.operacion,
    tipo: c.tipo,
    modalidad: c.modalidad,
    estado: c.estado,
    porcentaje: c.porcentaje,
    montoFijo: c.montoFijo,
    porcentajeImpuesto: c.porcentajeImpuesto,
    descripcion: c.descripcion ?? "",
  }));

  const [draft, setDraft] = useState<ComisionDraft>({
    correo: "",
    cuit: "",
    tipoPersona: "fisica",
    tipo: "Depósito",
    modalidad: "Porcentaje",
    porcentaje: 1,
    montoFijo: null,
    porcentajeImpuesto: 21,
    descripcion: "",
  });

  const getActions = (row: Comision): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, onClick: () => abrirEdicion(row), disabled: !puedeModificar },
    ...(row.estado === "Habilitado"
      ? [
          {
            label: "Deshabilitar",
            icon: XCircle,
            variant: "danger" as const,
            disabled: !puedeModificar,
            onClick: () =>
              setConfirmAction({
                title: "Deshabilitar comisión",
                message: `¿Estás seguro de deshabilitar la comisión ${row.legajo}?`,
                confirmLabel: "Deshabilitar",
                variant: "danger",
                onConfirm: () => cambiarEstado(row, "Deshabilitado"),
              }),
          },
        ]
      : [
          {
            label: "Habilitar",
            icon: Eye,
            disabled: !puedeModificar,
            onClick: () =>
              setConfirmAction({
                title: "Habilitar comisión",
                message: `¿Estás seguro de habilitar la comisión ${row.legajo}?`,
                confirmLabel: "Habilitar",
                variant: "default",
                onConfirm: () => cambiarEstado(row, "Habilitado"),
              }),
          },
        ]),
  ];

  const abrirNueva = () => {
    setDraft({
      correo: "",
      cuit: "",
      tipoPersona: "fisica",
      tipo: "Depósito",
      modalidad: "Porcentaje",
      porcentaje: 1,
      montoFijo: null,
      porcentajeImpuesto: 21,
      descripcion: "",
    });
    setFormError(null);
    setShowNueva(true);
  };

  const abrirEdicion = (c: Comision) => {
    setDraft({
      id: c.id,
      correo: c.correo,
      cuit: c.cuit,
      tipoPersona: c.tipoPersona,
      tipo: c.tipo,
      modalidad: c.modalidad,
      porcentaje: c.porcentaje,
      montoFijo: c.montoFijo,
      porcentajeImpuesto: c.porcentajeImpuesto,
      descripcion: c.descripcion,
    });
    setFormError(null);
    setEditTarget(c);
  };

  const cambiarEstado = async (row: Comision, nuevo: EstadoComision) => {
    try {
      await setComisionEstado(row.id, nuevo);
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
    } catch (e) {
      setConfirmAction({
        title: "No se pudo actualizar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const guardarDraft = async () => {
    setFormError(null);
    if (!draft.correo || !draft.cuit) {
      setFormError("Completá el correo y el CUIT del cliente.");
      return;
    }
    setSaving(true);
    try {
      const cliente = await getClienteByCorreo(draft.correo);
      if (!cliente) {
        setFormError("No existe un cliente con ese correo. Dalo de alta primero.");
        setSaving(false);
        return;
      }
      await upsertComision({
        id: draft.id,
        clienteId: cliente.id,
        operacion: draft.id
          ? (editTarget?.operacion ?? "")
          : `OP-${Date.now().toString().slice(-6)}`,
        tipo: draft.tipo,
        modalidad: draft.modalidad,
        porcentaje: draft.modalidad === "Porcentaje" ? draft.porcentaje : null,
        montoFijo: draft.modalidad === "Fijo" ? draft.montoFijo : null,
        porcentajeImpuesto: draft.porcentajeImpuesto,
        descripcion: draft.descripcion,
      });
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
      setShowNueva(false);
      setEditTarget(null);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const draftDesglose = desgloseDesdeConfig(
    {
      operacion: draft.tipo,
      tipo: draft.tipo,
      modalidad: draft.modalidad,
      porcentaje: draft.porcentaje,
      montoFijo: draft.montoFijo,
      porcentajeImpuesto: draft.porcentajeImpuesto,
    },
    MONTO_OPERACION_REF,
  );

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const err = error instanceof DataAccessError ? error : null;

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Carga de comisiones"
        description="Comisión y % Impuesto (IVA sobre la comisión) parametrizables por cliente y tipo de operación."
        action={
          <BtnPrimary onClick={abrirNueva} disabled={!puedeCrear}>
            <Plus size={16} />
            Nueva comisión
          </BtnPrimary>
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Legajo, correo, operación…"
          />
        </div>
        <div>
          <Label htmlFor="f-tipo">Tipo</Label>
          <select
            id="f-tipo"
            className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoOperacion | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {TIPOS_OPERACION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoComision | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="Habilitado">Habilitado</option>
            <option value="Deshabilitado">Deshabilitado</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando comisiones…
        </div>
      ) : isError ? (
        <EstadoMensaje
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <EstadoMensaje tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} comisión(es) · página {page + 1} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPaginas || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

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
              <span className="text-muted-foreground">CUIT:</span>{" "}
              <span className="font-mono tabular-nums">{viewing.cuit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo de operación:</span>{" "}
              <span className="font-medium">{viewing.tipo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Código de operación:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{viewing.operacion}</span>
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
          submitLabel={saving ? "Guardando…" : "Guardar"}
          size="lg"
        >
          {formError && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
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
    </PermissionGuard>
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
    key: "cuit",
    label: "CUIT",
    render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span>,
  },
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
    filterOptions: [...TIPOS_OPERACION],
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
