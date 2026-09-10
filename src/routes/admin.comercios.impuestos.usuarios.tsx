import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Eye, Power, PowerOff, Edit3, Trash2, Plus, AlertTriangle, Inbox } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnPrimary, Input, Label, Card } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useImpuestosAsignaciones, useImpuestosForAsignacion } from "@/hooks/useImpuestos";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useClientesForSelect } from "@/hooks/useComercios";
import { Search } from "lucide-react";
import {
  createImpuestoAsignacion,
  updateImpuestoAsignacion,
  setImpuestoAsignacionEstado,
  deleteImpuestoAsignacion,
} from "@/lib/api/impuestos";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { ImpuestoAsignacion, TipoImpuesto } from "@/lib/api/types";
import { MOCK_IMPUESTOS_POR_COBRAR, formatImpuestoMonto, type ImpuestoPorCobrar } from "@/data/impuestos-por-cobrar";

export const Route = createFileRoute("/admin/comercios/impuestos/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios con impuestos — Admin — Moli" }] }),
  component: Page,
});

const PAGE_SIZE = 10;

const TIPOS_IMPUESTO: TipoImpuesto[] = ["Porcentaje", "Fijo", "Otro"];

function formatTasa(tasa: number) {
  return Number.isInteger(tasa) ? String(tasa) : tasa.toFixed(2);
}

function montoLabel(asig: ImpuestoAsignacion) {
  if (asig.monto === null) return "—";
  return asig.tipo === "Porcentaje" ? `${formatTasa(asig.monto)}%` : `$ ${formatTasa(asig.monto)}`;
}

function MensajeEstado({
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
          <p className="font-semibold">Ocurrió un error al cargar las asignaciones</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay asignaciones que coincidan con la búsqueda.</p>
    </div>
  );
}

type AsignacionForm = {
  clienteLegajo: string;
  impuestoId: string;
  monto: string;
  estado: "Activo" | "Inactivo";
};

function AsignacionFormModal({
  asignacion,
  onClose,
  onSave,
}: {
  asignacion: ImpuestoAsignacion | null;
  onClose: () => void;
  onSave: (form: AsignacionForm) => void;
}) {
  const { rows: impuestosDisponibles } = useImpuestosForAsignacion();
  const [form, setForm] = useState<AsignacionForm>(() => ({
    clienteLegajo: asignacion?.clienteLegajo ?? "",
    impuestoId: asignacion?.impuestoId ?? "",
    monto: asignacion?.monto === null || asignacion?.monto === undefined ? "" : String(asignacion.monto),
    estado: asignacion?.estado ?? "Activo",
  }));
  const [clienteSearchInput, setClienteSearchInput] = useState(form.clienteLegajo);
  const debouncedClienteSearch = useDebouncedValue(clienteSearchInput, 350);
  const { data: clientesFiltrados } = useClientesForSelect(asignacion ? undefined : debouncedClienteSearch);
  const clientesOptions = clientesFiltrados ?? [];
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const legajoValido = /^[A-Z]{3}-\d{11}$/.test(form.clienteLegajo.trim());
  const montoValido = form.monto.trim() === "" || (!isNaN(Number(form.monto)) && Number(form.monto) >= 0);
  const valido =
    form.clienteLegajo.trim() !== "" &&
    (!asignacion ? legajoValido : true) &&
    form.impuestoId !== "" &&
    montoValido;

  const guardar = () => {
    if (!valido) return;
    onSave(form);
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={asignacion ? "Editar asignación" : "Nueva asignación de impuesto"}
      description={
        asignacion
          ? `Modificá la asignación de ${asignacion.clienteLegajo}.`
          : "Asigná un impuesto activo a un cliente por su legajo."
      }
      onSubmit={guardar}
      submitLabel={asignacion ? "Guardar cambios" : "Crear asignación"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="as-legajo">Usuario (correo / legajo)</Label>
          {asignacion ? (
            <>
              <Input id="as-legajo" value={form.clienteLegajo} disabled />
              <p className="text-[11px] text-muted-foreground mt-1">
                El legajo no se puede modificar.
              </p>
            </>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="as-legajo"
                  value={clienteSearchInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClienteSearchInput(v);
                    // si escribe legajo directo, sincroniza form
                    if (/^[A-Z]{3}-\d{11}$/i.test(v.trim())) {
                      setForm({ ...form, clienteLegajo: v.toUpperCase() });
                    } else if (!v.trim()) {
                      setForm({ ...form, clienteLegajo: "" });
                    }
                    setComboboxOpen(true);
                  }}
                  onFocus={() => setComboboxOpen(true)}
                  onBlur={() => setTimeout(() => setComboboxOpen(false), 150)}
                  placeholder="Buscar por correo o legajo…"
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              {comboboxOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-card shadow-lg max-h-60 overflow-auto">
                  {(clientesOptions ?? []).length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {debouncedClienteSearch ? "Sin resultados." : "Escribí correo o legajo para buscar (máx. 20)."}
                    </div>
                  ) : (
                    (clientesOptions ?? []).map((c) => (
                      <button
                        key={c.legajo}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm({ ...form, clienteLegajo: c.legajo });
                          setClienteSearchInput(`${c.correo} · ${c.legajo}`);
                          setComboboxOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col ${c.legajo === form.clienteLegajo ? "bg-accent" : ""}`}
                      >
                        <span className="font-medium">{c.correo}</span>
                        <span className="text-xs text-muted-foreground font-mono">{c.legajo} · {c.nombre}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Buscable por correo o legajo. Seleccioná un usuario de la lista.
              </p>
              {form.clienteLegajo && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Seleccionado: <span className="font-mono">{form.clienteLegajo}</span>
                </p>
              )}
              {form.clienteLegajo.trim() !== "" && !legajoValido && (
                <p className="text-xs text-red-600 mt-1">Formato inválido. Ej: LPF-20111111111.</p>
              )}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="as-impuesto">Impuesto</Label>
          <select
            id="as-impuesto"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.impuestoId}
            onChange={(e) => setForm({ ...form, impuestoId: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {impuestosDisponibles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} — {i.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="as-estado">Estado</Label>
          <select
            id="as-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div>
          <Label htmlFor="as-monto">% del impuesto</Label>
          <Input
            id="as-monto"
            type="number"
            step="any"
            min="0"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            placeholder="Ej: 3.5"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Editable por asignación — sobrescribe el % base del impuesto.</p>
        </div>
      </div>
      {!valido && (
        <p className="text-xs text-muted-foreground">
          Completá el legajo y el impuesto para poder guardar.
        </p>
      )}
    </FormDialog>
  );
}

function ImpuestosPorCobrarTab() {
  const [subTab, setSubTab] = useState<"por_cobrar" | "historial">("por_cobrar");

  const filtrados = useMemo(() => {
    return MOCK_IMPUESTOS_POR_COBRAR;
  }, []);

  const columns: Column<ImpuestoPorCobrar>[] = [
    { key: "usuario", label: "Usuario", filterable:true, render: (r)=> <span className="text-xs font-medium">{r.usuario}</span> },
    { key: "legajo", label: "Legajo", render: (r)=> <span className="font-mono text-xs">{r.legajo}</span> },
    { key: "loteId", label: "Lote", filterable:true, render: (r)=> <span className="font-mono text-xs font-semibold">{r.loteId}</span> },
    { key: "bandera", label: "Bandera", filterable:"enum", filterOptions:["Visa","Mastercard","Amex","Cabal"], render: (r)=> <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-muted/50">{r.bandera}</span> },
    { key: "impuesto", label: "Impuesto", filterable:true, render: (r)=> r.impuesto },
    { key: "monto", label: "Monto", render: (r)=> <span className="font-mono tabular-nums">{formatImpuestoMonto(r.monto)}</span> },
    { key: "estado", label: "Estado", filterable:"enum", filterOptions:["pendiente","pagado"], render: (r)=> <Badge tone={r.estado==="pendiente"?"warn":"success"}>{r.estado}</Badge> },
    { key: "fechaLote", label: "Fecha lote", render: (r)=> <span className="font-mono text-xs">{r.fechaLote}</span> },
  ];

  const loteActualIds = ["LOTE-2026-09-07-001","LOTE-2026-09-07-002","LOTE-2026-09-07-003","LOTE-2026-09-07-004","LOTE-2026-09-07-005"];
  const loteActual = filtrados.filter(r=> loteActualIds.includes(r.loteId));
  const historial = filtrados.filter(r=> !loteActualIds.includes(r.loteId));
  const totalPendiente = filtrados.filter(r=>r.estado==="pendiente").reduce((a,b)=>a+b.monto,0);
  const totalPagado = filtrados.filter(r=>r.estado==="pagado").reduce((a,b)=>a+b.monto,0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <button onClick={()=> setSubTab("por_cobrar")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab==="por_cobrar" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Impuestos por cobrar</button>
        <button onClick={()=> setSubTab("historial")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab==="historial" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Historial</button>
      </div>
      <div className="text-xs text-muted-foreground">{filtrados.length} registro(s) · pendiente {formatImpuestoMonto(totalPendiente)} · pagado {formatImpuestoMonto(totalPagado)}</div>
      {subTab==="por_cobrar" ? (
        <>
          <Card className="p-3"><div className="text-xs text-muted-foreground">Impuestos por cobrar lote actual</div><div className="font-mono text-lg font-semibold mt-1">{formatImpuestoMonto(loteActual.filter(r=>r.estado==="pendiente").reduce((a,b)=>a+b.monto,0))}</div><div className="text-[11px] text-muted-foreground">Lote completo al corte y por bandera · {loteActual.length} items</div></Card>
          <DataTable columns={columns} data={loteActual} keyExtractor={(r)=> r.id} />
        </>
      ) : (
        <>
          <Card className="p-3"><div className="text-xs text-muted-foreground">Historial pagado</div><div className="font-mono text-lg font-semibold mt-1 text-emerald-700">{formatImpuestoMonto(totalPagado)}</div><div className="text-[11px] text-muted-foreground">Cuándo se pagaron · {historial.length} items</div></Card>
          <DataTable columns={columns} data={historial} keyExtractor={(r)=> r.id} />
        </>
      )}
    </div>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"asignaciones" | "por_cobrar">("asignaciones");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<"Activo" | "Inactivo" | "">("");
  const [searchDesde, setSearchDesde] = useState("");
  const [searchHasta, setSearchHasta] = useState("");

  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");
  const puedeModificar = can("modificar", "impuestos");
  const puedeBorrar = can("borrar", "impuestos");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } =
    useImpuestosAsignaciones({
      page,
      pageSize: PAGE_SIZE,
      search,
      estado: estadoFilter || undefined,
    });

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [editTarget, setEditTarget] = useState<ImpuestoAsignacion | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ImpuestoAsignacion | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["impuestos_asignaciones"] });

  const toggleEstado = async (row: ImpuestoAsignacion) => {
    try {
      await setImpuestoAsignacionEstado(row.id, row.estado === "Activo" ? "Inactivo" : "Activo");
      invalidar();
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

  const guardar = async (form: AsignacionForm) => {
    try {
      if (editTarget) {
        await updateImpuestoAsignacion(editTarget.id, {
          impuesto_id: form.impuestoId || undefined,
          tipo: "Porcentaje" as any,
          monto: form.monto.trim() === "" ? null : Number(form.monto),
          estado: form.estado,
        } as any);
      } else {
        await createImpuestoAsignacion({
          cliente_legajo: form.clienteLegajo.trim(),
          impuesto_id: form.impuestoId,
          tipo: "Porcentaje" as any,
          monto: form.monto.trim() === "" ? null : Number(form.monto),
          estado: form.estado,
        } as any);
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const dErr = e as DataAccessError;
      const esFk = dErr.code === "23503" || /foreign key/i.test(dErr.message);
      setConfirmAction({
        title: "No se pudo guardar",
        message: esFk
          ? `El legajo "${form.clienteLegajo.trim()}" no existe en la tabla de clientes. Verificá el formato (LPF/LPJ-CUIT).`
          : (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteImpuestoAsignacion(confirmDelete.id);
      invalidar();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo eliminar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmDelete(null);
  };

  const getActions = (row: ImpuestoAsignacion): ActionItem[] => [
    {
      label: row.estado === "Activo" ? "Desactivar" : "Activar",
      icon: row.estado === "Activo" ? PowerOff : Power,
      disabled: !puedeModificar,
      onClick: () => toggleEstado(row),
    },
    { label: "Editar", icon: Edit3, disabled: !puedeModificar, onClick: () => setEditTarget(row) },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      disabled: !puedeBorrar,
      onClick: () => setConfirmDelete(row),
    },
  ];

  const columns: Column<ImpuestoAsignacion>[] = [
    {
      key: "clienteLegajo",
      label: "Legajo",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.clienteLegajo}</span>,
    },
    {
      key: "clienteNombre",
      label: "Cliente",
      render: (r) =>
        r.cliente ? (
          <div className="leading-tight">
            <div className="font-medium">{r.cliente.nombre}</div>
            <div className="text-xs text-muted-foreground font-mono">{r.cliente.cuit}</div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "impuesto",
      label: "Impuesto aplicado",
      render: (r) =>
        r.impuesto ? (
          <div className="leading-tight">
            <div className="font-medium">{r.impuesto.nombre}</div>
            <div className="text-xs text-muted-foreground font-mono">{r.impuesto.codigo}</div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      render: (r) => r.tipo,
    },
    {
      key: "monto",
      label: "Monto",
      render: (r) => <span className="font-mono tabular-nums">{montoLabel(r)}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    {
      key: "fechaAsignacion",
      label: "Fecha de asignación",
      sortable: true,
      render: (r) =>
        r.fechaAsignacion ? (
          <span className="font-mono tabular-nums">
            {new Date(r.fechaAsignacion).toLocaleDateString("es-AR")}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Usuarios con impuestos"
        description="Asignaciones de impuestos a clientes."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nueva asignación
          </BtnPrimary>
        }
      />

      <div className="flex gap-2 mb-4 border-b">
        <button onClick={()=> setTab("asignaciones")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab==="asignaciones" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Asignaciones</button>
        <button onClick={()=> setTab("por_cobrar")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab==="por_cobrar" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Impuestos por cobrar</button>
      </div>

      {tab==="por_cobrar" ? (
        <ImpuestosPorCobrarTab />
      ) : (
        <>
            <div className="mb-4 bg-card border rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Código o nombre del impuesto…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as "Activo" | "Inactivo" | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div>
          <Label htmlFor="f-desde">Fecha desde</Label>
          <Input id="f-desde" type="date" value={searchDesde} onChange={(e)=> {setSearchDesde(e.target.value); setPage(0);}} className="h-9" />
        </div>
        <div>
          <Label htmlFor="f-hasta">Fecha hasta</Label>
          <Input id="f-hasta" type="date" value={searchHasta} onChange={(e)=> {setSearchHasta(e.target.value); setPage(0);}} className="h-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando asignaciones…
        </div>
      ) : isError ? (
        <MensajeEstado
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <MensajeEstado tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} asignacion(es) · página {page + 1} de {totalPaginas}
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
        </>
      )}

      {(showNew || editTarget) && (
        <AsignacionFormModal
          asignacion={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={guardar}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar asignación"
        message={`¿Eliminar la asignación de ${confirmDelete?.clienteLegajo ?? ""}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={eliminar}
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
    </PermissionGuard>
  );
}
