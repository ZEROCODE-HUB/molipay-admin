import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Power, PowerOff, Edit3, Trash2, Plus, AlertTriangle, Inbox, Info } from "lucide-react";
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
  previewAlicuotaAsignacion,
} from "@/lib/api/impuestos";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { ResumenAlicuota } from "@/components/impuestos/alicuota-resumen";
import { formatValor } from "@/lib/impuestos-format";
import {
  DIRECCION_DE_OPERACION,
  OPERACIONES_IMPUESTO,
  type AlicuotaPrevista,
  type FuenteAlicuota,
  type ImpuestoAsignacion,
  type ImpuestoAsignacionInput,
  type OperacionImpuesto,
  type TipoCalculoAlicuota,
} from "@/lib/api/types";
import {
  MOCK_IMPUESTOS_POR_COBRAR,
  formatImpuestoMonto,
  type ImpuestoPorCobrar,
} from "@/data/impuestos-por-cobrar";

export const Route = createFileRoute("/admin/comercios/impuestos/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios con impuestos — Admin — Moli" }] }),
  component: Page,
});

const PAGE_SIZE = 10;
const LEGAJO_RE = /^[A-Z]{3}-\d{11}$/;

const selectCls =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

const ETIQUETA_FUENTE: Record<FuenteAlicuota, string> = {
  Fija: "Alícuota fija",
  Padrón: "Padrón",
  Manual: "Manual",
};

const OPERACIONES_POR_DIRECCION = {
  Entrante: OPERACIONES_IMPUESTO.filter((o) => DIRECCION_DE_OPERACION[o] === "Entrante"),
  Saliente: OPERACIONES_IMPUESTO.filter((o) => DIRECCION_DE_OPERACION[o] === "Saliente"),
};

/** Alicuota propia de un impuesto manual. */
function alicuotaPropiaLabel(a: Pick<ImpuestoAsignacion, "tipoCalculo" | "alicuotaPropia">) {
  if (a.tipoCalculo === null || a.alicuotaPropia === null) return "Sin alícuota";
  return formatValor({ tipoCalculo: a.tipoCalculo, valor: a.alicuotaPropia });
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
  estado: "Activo" | "Inactivo";
  operacion: OperacionImpuesto | "";
  tipoCalculo: TipoCalculoAlicuota;
  alicuotaPropia: string;
};

/**
 * Que se le va a cobrar con esta asignacion, por direccion. La alicuota la
 * resuelve la base (tax_rate_preview): tax_rates en impuestos fijos, padron
 * vigente por CUIT en IIBB. En manual se muestra la alicuota del formulario.
 */
function PrevisionAlicuota({
  clienteLegajo,
  impuestoId,
  fuente,
  operacion,
  manual,
}: {
  clienteLegajo: string;
  impuestoId: string;
  fuente: FuenteAlicuota;
  operacion: OperacionImpuesto | null;
  manual: string | null;
}) {
  const habilitado = LEGAJO_RE.test(clienteLegajo) && impuestoId !== "" && fuente !== "Manual";
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tax_rate_preview", clienteLegajo, impuestoId],
    queryFn: () => previewAlicuotaAsignacion(clienteLegajo, impuestoId),
    enabled: habilitado,
    staleTime: 60_000,
  });

  const direcciones: ("Entrante" | "Saliente")[] = operacion
    ? [DIRECCION_DE_OPERACION[operacion]]
    : ["Entrante", "Saliente"];

  const valor = (d: "Entrante" | "Saliente") => {
    if (fuente === "Manual")
      return manual ? <span className="font-mono">{manual}</span> : "Indicá la alícuota";
    if (!habilitado) return <span className="text-muted-foreground">Elegí el comercio</span>;
    if (isLoading) return <span className="text-muted-foreground">Consultando…</span>;
    if (isError) return <span className="text-red-600">{(error as Error).message}</span>;
    const p = data?.find((x: AlicuotaPrevista) => x.direccion === d);
    if (!p) return "—";
    if (p.valor <= 0)
      return (
        <span>
          <span className="font-mono">0%</span>
          {p.nota && <span className="text-muted-foreground"> · {p.nota}</span>}
        </span>
      );
    return (
      <span>
        <span className="font-mono font-semibold">{formatValor(p)}</span>
        {p.codigo && <span className="text-muted-foreground font-mono"> · {p.codigo}</span>}
      </span>
    );
  };

  return (
    <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Info size={12} /> Qué se le va a cobrar
      </div>
      <ul className="mt-2 space-y-1.5">
        {direcciones.map((d) => (
          <li key={d} className="flex flex-wrap items-baseline justify-between gap-2">
            <span>
              {d === "Entrante" ? "Pay-In" : "Pay-Out"}
              <span className="text-xs text-muted-foreground">
                {" "}
                ({(operacion ? [operacion] : OPERACIONES_POR_DIRECCION[d]).join(", ")})
              </span>
            </span>
            <span className="text-right">{valor(d)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {fuente === "Padrón"
          ? "IIBB toma la alícuota del padrón vigente por el CUIT del comercio; si no figura, es exento o no sujeto, es 0%."
          : fuente === "Fija"
            ? "Sale de las alícuotas del impuesto (Impuestos › detalle). Si cambian por ley, se actualizan ahí."
            : "Impuesto manual: la alícuota es propia de esta asignación."}
      </p>
    </div>
  );
}

function AsignacionFormModal({
  asignacion,
  onClose,
  onSave,
}: {
  asignacion: ImpuestoAsignacion | null;
  onClose: () => void;
  onSave: (input: ImpuestoAsignacionInput) => void;
}) {
  const { rows: impuestosDisponibles } = useImpuestosForAsignacion();
  const [form, setForm] = useState<AsignacionForm>(() => ({
    clienteLegajo: asignacion?.clienteLegajo ?? "",
    impuestoId: asignacion?.impuestoId ?? "",
    estado: asignacion?.estado ?? "Activo",
    operacion: asignacion?.operacion ?? "",
    tipoCalculo: asignacion?.tipoCalculo ?? "Porcentaje",
    alicuotaPropia:
      asignacion?.alicuotaPropia === null || asignacion?.alicuotaPropia === undefined
        ? ""
        : String(asignacion.alicuotaPropia),
  }));
  const [clienteSearchInput, setClienteSearchInput] = useState(form.clienteLegajo);
  const debouncedClienteSearch = useDebouncedValue(clienteSearchInput, 350);
  const { data: clientesFiltrados } = useClientesForSelect(
    asignacion ? undefined : debouncedClienteSearch,
  );
  const clientesOptions = clientesFiltrados ?? [];
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const impuesto = impuestosDisponibles.find((i) => i.id === form.impuestoId) ?? null;
  // Al editar, el impuesto puede estar inactivo (no figura en la lista).
  const fuente: FuenteAlicuota | null =
    impuesto?.fuenteAlicuota ??
    (asignacion?.impuestoId === form.impuestoId
      ? (asignacion?.impuesto?.fuenteAlicuota ?? null)
      : null);
  const esManual = fuente === "Manual";

  const legajoValido = LEGAJO_RE.test(form.clienteLegajo.trim());
  const alicuotaNum = Number(form.alicuotaPropia.replace(",", "."));
  const alicuotaValida =
    !esManual ||
    (form.alicuotaPropia.trim() !== "" &&
      Number.isFinite(alicuotaNum) &&
      alicuotaNum >= 0 &&
      (form.tipoCalculo !== "Porcentaje" || alicuotaNum <= 100));
  const valido =
    form.clienteLegajo.trim() !== "" && legajoValido && form.impuestoId !== "" && alicuotaValida;

  const guardar = () => {
    if (!valido) return;
    onSave(aInput(form, esManual));
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={asignacion ? "Editar asignación" : "Nueva asignación de impuesto"}
      description={
        asignacion
          ? `Modificá la asignación de ${asignacion.clienteLegajo}.`
          : "Mientras la asignación esté activa, el impuesto se le cobra al comercio en las operaciones elegidas."
      }
      onSubmit={guardar}
      submitLabel={asignacion ? "Guardar cambios" : "Crear asignación"}
      size="lg"
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
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  id="as-legajo"
                  value={clienteSearchInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClienteSearchInput(v);
                    // si escribe legajo directo, sincroniza form
                    if (LEGAJO_RE.test(v.trim().toUpperCase())) {
                      setForm({ ...form, clienteLegajo: v.trim().toUpperCase() });
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
                      {debouncedClienteSearch
                        ? "Sin resultados."
                        : "Escribí correo o legajo para buscar (máx. 20)."}
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
                        <span className="text-xs text-muted-foreground font-mono">
                          {c.legajo} · {c.nombre}
                        </span>
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
            className={selectCls}
            value={form.impuestoId}
            disabled={!!asignacion}
            onChange={(e) => setForm({ ...form, impuestoId: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {asignacion && !impuesto && asignacion.impuesto && (
              <option value={asignacion.impuestoId}>
                {asignacion.impuesto.codigo} — {asignacion.impuesto.nombre} (inactivo)
              </option>
            )}
            {impuestosDisponibles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} — {i.nombre} · {ETIQUETA_FUENTE[i.fuenteAlicuota]}
              </option>
            ))}
          </select>
          {asignacion && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Para otro impuesto, creá una asignación nueva.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="as-tipo-operacion">Tipo de operación</Label>
          <select
            id="as-tipo-operacion"
            className={selectCls}
            value={form.operacion}
            onChange={(e) =>
              setForm({ ...form, operacion: e.target.value as OperacionImpuesto | "" })
            }
          >
            <option value="">Todas las operaciones</option>
            {OPERACIONES_IMPUESTO.map((o) => (
              <option key={o} value={o}>
                {o} · {DIRECCION_DE_OPERACION[o] === "Saliente" ? "Pay-Out" : "Pay-In"}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Retiro cobra la alícuota saliente (Pay-Out); Depósito, Link de pago y E-commerce, la
            entrante (Pay-In).
          </p>
        </div>
        <div>
          <Label htmlFor="as-estado">Estado</Label>
          <select
            id="as-estado"
            className={selectCls}
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        {esManual && (
          <>
            <div>
              <Label htmlFor="as-calculo">Cálculo</Label>
              <select
                id="as-calculo"
                className={selectCls}
                value={form.tipoCalculo}
                onChange={(e) =>
                  setForm({ ...form, tipoCalculo: e.target.value as TipoCalculoAlicuota })
                }
              >
                <option value="Porcentaje">Porcentaje</option>
                <option value="Monto fijo">Monto fijo</option>
              </select>
            </div>
            <div>
              <Label htmlFor="as-alicuota">
                {form.tipoCalculo === "Porcentaje" ? "Alícuota (%)" : "Monto ($)"}
              </Label>
              <Input
                id="as-alicuota"
                inputMode="decimal"
                value={form.alicuotaPropia}
                onChange={(e) => setForm({ ...form, alicuotaPropia: e.target.value })}
                placeholder={form.tipoCalculo === "Porcentaje" ? "Ej: 3,5" : "Ej: 150"}
              />
              {!alicuotaValida && form.alicuotaPropia.trim() !== "" && (
                <p className="text-xs text-red-600 mt-1">
                  {form.tipoCalculo === "Porcentaje"
                    ? "Entre 0 y 100."
                    : "Debe ser mayor o igual a 0."}
                </p>
              )}
            </div>
          </>
        )}

        {fuente && (
          <PrevisionAlicuota
            clienteLegajo={form.clienteLegajo.trim()}
            impuestoId={form.impuestoId}
            fuente={fuente}
            operacion={form.operacion || null}
            manual={
              esManual && alicuotaValida && form.alicuotaPropia.trim() !== ""
                ? formatValor({ tipoCalculo: form.tipoCalculo, valor: alicuotaNum })
                : null
            }
          />
        )}
      </div>
      {!valido && (
        <p className="text-xs text-muted-foreground">
          {esManual
            ? "Completá el legajo, el impuesto y la alícuota para poder guardar."
            : "Completá el legajo y el impuesto para poder guardar."}
        </p>
      )}
    </FormDialog>
  );
}

/** Payload para la API desde el formulario. */
function aInput(form: AsignacionForm, manual: boolean): ImpuestoAsignacionInput {
  return {
    cliente_legajo: form.clienteLegajo.trim(),
    impuesto_id: form.impuestoId,
    operacion: form.operacion || null,
    estado: form.estado,
    tipo_calculo: manual ? form.tipoCalculo : null,
    alicuota_propia: manual ? Number(form.alicuotaPropia.replace(",", ".")) : null,
  };
}

function ImpuestosPorCobrarTab() {
  const [subTab, setSubTab] = useState<"por_cobrar" | "historial">("por_cobrar");

  const filtrados = useMemo(() => {
    return MOCK_IMPUESTOS_POR_COBRAR;
  }, []);

  const columns: Column<ImpuestoPorCobrar>[] = [
    {
      key: "usuario",
      label: "Usuario",
      filterable: true,
      render: (r) => <span className="text-xs font-medium">{r.usuario}</span>,
    },
    {
      key: "legajo",
      label: "Legajo",
      render: (r) => <span className="font-mono text-xs">{r.legajo}</span>,
    },
    {
      key: "loteId",
      label: "Lote",
      filterable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.loteId}</span>,
    },
    {
      key: "bandera",
      label: "Bandera",
      filterable: "enum",
      filterOptions: ["Visa", "Mastercard", "Amex", "Cabal"],
      render: (r) => (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-muted/50">
          {r.bandera}
        </span>
      ),
    },
    { key: "impuesto", label: "Impuesto", filterable: true, render: (r) => r.impuesto },
    {
      key: "monto",
      label: "Monto",
      render: (r) => <span className="font-mono tabular-nums">{formatImpuestoMonto(r.monto)}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: ["pendiente", "pagado"],
      render: (r) => <Badge tone={r.estado === "pendiente" ? "warn" : "success"}>{r.estado}</Badge>,
    },
    {
      key: "fechaLote",
      label: "Fecha lote",
      render: (r) => <span className="font-mono text-xs">{r.fechaLote}</span>,
    },
  ];

  const loteActualIds = [
    "LOTE-2026-09-07-001",
    "LOTE-2026-09-07-002",
    "LOTE-2026-09-07-003",
    "LOTE-2026-09-07-004",
    "LOTE-2026-09-07-005",
  ];
  const loteActual = filtrados.filter((r) => loteActualIds.includes(r.loteId));
  const historial = filtrados.filter((r) => !loteActualIds.includes(r.loteId));
  const totalPendiente = filtrados
    .filter((r) => r.estado === "pendiente")
    .reduce((a, b) => a + b.monto, 0);
  const totalPagado = filtrados
    .filter((r) => r.estado === "pagado")
    .reduce((a, b) => a + b.monto, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setSubTab("por_cobrar")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === "por_cobrar" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Impuestos por cobrar
        </button>
        <button
          onClick={() => setSubTab("historial")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === "historial" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Historial
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        {filtrados.length} registro(s) · pendiente {formatImpuestoMonto(totalPendiente)} · pagado{" "}
        {formatImpuestoMonto(totalPagado)}
      </div>
      {subTab === "por_cobrar" ? (
        <>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Impuestos por cobrar lote actual</div>
            <div className="font-mono text-lg font-semibold mt-1">
              {formatImpuestoMonto(
                loteActual.filter((r) => r.estado === "pendiente").reduce((a, b) => a + b.monto, 0),
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Lote completo al corte y por bandera · {loteActual.length} items
            </div>
          </Card>
          <DataTable columns={columns} data={loteActual} keyExtractor={(r) => r.id} />
        </>
      ) : (
        <>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Historial pagado</div>
            <div className="font-mono text-lg font-semibold mt-1 text-emerald-700">
              {formatImpuestoMonto(totalPagado)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Cuándo se pagaron · {historial.length} items
            </div>
          </Card>
          <DataTable columns={columns} data={historial} keyExtractor={(r) => r.id} />
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

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["tax_assignments"] });

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

  const guardar = async (input: ImpuestoAsignacionInput) => {
    try {
      if (editTarget) {
        const { cliente_legajo: _legajo, impuesto_id: _impuesto, ...cambios } = input;
        await updateImpuestoAsignacion(editTarget.id, cambios);
      } else {
        await createImpuestoAsignacion(input);
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
          ? `El legajo "${input.cliente_legajo}" no existe en la tabla de clientes. Verificá el formato (LPF/LPJ-CUIT).`
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
      label: "Impuesto",
      render: (r) =>
        r.impuesto ? (
          <div className="leading-tight">
            <div className="font-medium">{r.impuesto.nombre}</div>
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">{r.impuesto.codigo}</span> ·{" "}
              {ETIQUETA_FUENTE[r.impuesto.fuenteAlicuota]}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "operacion",
      label: "Operación",
      sortable: true,
      render: (r) =>
        r.operacion ? (
          <Badge tone="neutral">
            {r.operacion} ·{" "}
            {DIRECCION_DE_OPERACION[r.operacion] === "Saliente" ? "Pay-Out" : "Pay-In"}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Todas</span>
        ),
    },
    {
      key: "alicuota",
      label: "Alícuota que aplica",
      render: (r) => {
        if (!r.impuesto) return "—";
        if (r.impuesto.fuenteAlicuota === "Manual")
          return <span className="font-mono tabular-nums">{alicuotaPropiaLabel(r)}</span>;
        return (
          <ResumenAlicuota
            fuente={r.impuesto.fuenteAlicuota}
            alicuotas={r.impuesto.alicuotas}
            direccion={r.operacion ? DIRECCION_DE_OPERACION[r.operacion] : undefined}
          />
        );
      },
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
        description="Qué impuestos se le cobran a cada comercio. Sin asignación activa, el impuesto no se cobra."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nueva asignación
          </BtnPrimary>
        }
      />

      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab("asignaciones")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "asignaciones" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Asignaciones
        </button>
        <button
          onClick={() => setTab("por_cobrar")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "por_cobrar" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Impuestos por cobrar
        </button>
      </div>

      {tab === "por_cobrar" ? (
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
                placeholder="Legajo, código o nombre del impuesto…"
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
              <Input
                id="f-desde"
                type="date"
                value={searchDesde}
                onChange={(e) => {
                  setSearchDesde(e.target.value);
                  setPage(0);
                }}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="f-hasta">Fecha hasta</Label>
              <Input
                id="f-hasta"
                type="date"
                value={searchHasta}
                onChange={(e) => {
                  setSearchHasta(e.target.value);
                  setPage(0);
                }}
                className="h-9"
              />
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
