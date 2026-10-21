import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, XCircle, RotateCcw, Trash2, AlertTriangle, Inbox, ShieldCheck, Ban, CheckCircle, Building2, Store } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column, type TableServerFilters } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { useClientes } from "@/hooks/useClientes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  aprobarDocumentacionCliente,
  activarCliente,
  suspenderCliente,
  reactivarCliente,
  deshabilitarCliente,
  eliminarCliente,
  getClienteByLegajo,
  getClientesEnrichment,
  formatCuit,
  type ClienteEnrichment,
} from "@/lib/api/clientes";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Cliente, EstadoCliente } from "@/lib/api/types";
import { ESTADO_LABEL, ESTADO_TONE, normalizarEstado, FILTRO_ESTADOS_OPCIONES, LABEL_A_ESTADO } from "@/lib/cliente-estados";
import { toast } from "sonner";
import { Pagination } from "@/components/pagination";

export const Route = createFileRoute("/admin/general/usuarios/juridicas")({
  head: () => ({
    meta: [
      { title: "Personas jurídicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas jurídicas registradas en la plataforma." },
    ],
  }),
  component: JuridicasPage,
});

const PAGE_SIZES = [10, 20, 50];

/**
 * Etiqueta corta del tipo societario a partir de `clientes.tipo_sociedad`.
 * Si no matchea ninguno conocido, devuelve el texto original truncado.
 */
function tipoSociedadToLabel(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  const t = tipo.trim().toLowerCase();
  if (t.includes("srl") || t.includes("responsabilidad limitada")) return "SRL";
  if (t.includes("sas")) return "SAS";
  if (t.includes(" sa") || t.startsWith("sa") || t.includes("sociedad anonima") || t.includes("sociedad anónima")) return "SA";
  if (t.includes("sca") || t.includes("colectiva")) return "SCA";
  if (t.includes("scpa") || t.includes("comandita por acciones")) return "SCpA";
  if (t.includes("sc") || t.includes("comandita simple")) return "SC";
  if (t.includes("civil")) return "SCivil";
  // Fallback: truncar a 6 caracteres para no romper el ancho de la columna.
  return tipo.length > 6 ? tipo.slice(0, 6) : tipo;
}

type JuridicaRow = {
  id: string;
  legajo: string;
  correo: string;
  cuit: string;
  cuitFormatted: string;
  razonSocial: string;
  nombreFantasia: string | null;
  tipoSociedadRaw: string | null;
  tipoLabel: string;
  estadoRaw: EstadoCliente;
  estadoLabel: string;
  estadoTone: "success" | "warn" | "danger" | "neutral";
  fechaRegistro: string;
  esPep: boolean;
  comerciosCount: number;
  cvuCount: number;
};

function EstadoMensaje({
  tipo,
  mensaje,
  onRetry,
}: {
  tipo: "error" | "vacio" | "permiso";
  mensaje: string;
  onRetry?: () => void;
}) {
  if (tipo === "permiso")
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <p className="font-semibold">No tenés permiso para ver esto</p>
        <p className="mt-1">{mensaje}</p>
      </div>
    );
  if (tipo === "error")
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <p className="font-semibold">Ocurrió un error al cargar las personas jurídicas</p>
        <p className="mt-1">{mensaje}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Reintentar
          </button>
        )}
      </div>
    );
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay personas jurídicas que coincidan con la búsqueda.</p>
    </div>
  );
}

function JuridicasPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filtroEstado, setFiltroEstado] = useState("");
  const estadoFiltroDb = filtroEstado ? (LABEL_A_ESTADO[filtroEstado] as EstadoCliente | undefined) : undefined;

  // Buscar de la card: server-side contra toda la base (no solo la página).
  const [filtrosPanel, setFiltrosPanel] = useState<TableServerFilters>({
    global: "",
    enums: {},
    dates: {},
  });
  const search = useDebouncedValue(filtrosPanel.global.trim(), 350);
  const aplicarFiltros = (f: TableServerFilters) => {
    setPage(0);
    setFiltrosPanel(f);
  };

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useClientes({
    page,
    pageSize,
    estado: estadoFiltroDb,
    tipoPersona: "juridica",
    search: search || undefined,
  });

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const { can } = useCan();
  const puedeModificar = can("modificar", "usuarios");
  const puedeBorrar = can("borrar", "usuarios");

  // Enrichment paralelo: comercios y CVUs por legajo (mismo patrón que Personas Físicas).
  const enrichmentQuery = useQuery<Record<string, ClienteEnrichment>>({
    queryKey: ["clientes-enrichment-juridicas", rows.map((r) => r.legajo).join("|")],
    queryFn: async () => getClientesEnrichment(rows.map((r) => r.legajo)),
    enabled: rows.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const enrichmentMap = enrichmentQuery.data ?? {};

  const data: JuridicaRow[] = rows.map((c: Cliente) => {
    const norm = normalizarEstado(c.estado);
    const e = enrichmentMap[c.legajo] ?? {};
    return {
      id: c.id,
      legajo: c.legajo,
      correo: c.correo,
      cuit: c.cuit,
      cuitFormatted: formatCuit(c.cuit),
      razonSocial: c.nombre,
      nombreFantasia: c.nombreFantasia ?? null,
      tipoSociedadRaw: c.tipoSociedad ?? null,
      tipoLabel: tipoSociedadToLabel(c.tipoSociedad),
      estadoRaw: c.estado,
      estadoLabel: ESTADO_LABEL[norm],
      estadoTone: ESTADO_TONE[norm] as JuridicaRow["estadoTone"],
      fechaRegistro: c.fechaAlta,
      esPep: Boolean(c.esPep),
      comerciosCount: e.comerciosCount ?? 0,
      cvuCount: e.cvuCount ?? 0,
    };
  });

  const ejecutar = async (legajo: string, accion: "aprobar" | "activar" | "suspender" | "reactivar" | "deshabilitar" | "eliminar") => {
    try {
      const cliente = await getClienteByLegajo(legajo);
      if (!cliente) throw new Error("Cliente no encontrado");
      let res: { ok: boolean; motivo?: string } = { ok: false, motivo: "" };
      if (accion === "aprobar") res = await aprobarDocumentacionCliente(cliente);
      else if (accion === "activar") res = await activarCliente(cliente);
      else if (accion === "suspender") res = await suspenderCliente(cliente);
      else if (accion === "reactivar") res = await reactivarCliente(cliente);
      else if (accion === "deshabilitar") res = await deshabilitarCliente(cliente);
      else if (accion === "eliminar") res = await eliminarCliente(cliente);
      if (!res.ok) {
        toast.error(res.motivo ?? "No se pudo completar");
        setConfirmAction({ title: "No se pudo completar", message: res.motivo ?? "Error", confirmLabel: "Cerrar", variant: "danger", onConfirm: () => setConfirmAction(null) });
        return;
      }
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setConfirmAction(null);
    } catch (e) {
      toast.error((e as Error).message);
      setConfirmAction({ title: "Error", message: (e as Error).message, confirmLabel: "Cerrar", variant: "danger", onConfirm: () => setConfirmAction(null) });
    }
  };

  const verDetalle = (row: JuridicaRow) => navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } });

  const getActions = (row: JuridicaRow): ActionItem[] => {
    const norm = normalizarEstado(row.estadoRaw);
    const items: ActionItem[] = [{ label: "Ver detalle", icon: Eye, onClick: () => verDetalle(row) }];
    if (norm === "registrado")
      items.push({
        label: "Preactivar (aprobar documentación)",
        icon: ShieldCheck,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Aprobar documentación",
            message: `¿Aprobar la documentación de ${row.razonSocial}?`,
            confirmLabel: "Aprobar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "aprobar"),
          }),
      });
    if (norm === "preactivado")
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Activar persona jurídica",
            message: `¿Activar a ${row.razonSocial}? Requiere CVU y comisión.`,
            confirmLabel: "Activar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "activar"),
          }),
      });
    if (norm === "activado")
      items.push({
        label: "Suspender",
        icon: XCircle,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Suspender persona jurídica",
            message: `¿Suspender a ${row.razonSocial}?`,
            confirmLabel: "Suspender",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "suspender"),
          }),
      });
    if (norm === "suspendido")
      items.push({
        label: "Reactivar",
        icon: RotateCcw,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Reactivar persona jurídica",
            message: `¿Reactivar a ${row.razonSocial}?`,
            confirmLabel: "Reactivar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "reactivar"),
          }),
      });
    if (norm !== "deshabilitado" && norm !== "eliminado") {
      items.push({
        label: "Deshabilitar",
        icon: Ban,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Deshabilitar",
            message: `¿Deshabilitar a ${row.razonSocial}? Se cancelará CVU y se conservará historial.`,
            confirmLabel: "Deshabilitar",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "deshabilitar"),
          }),
      });
      items.push({
        label: "Eliminar",
        icon: Trash2,
        disabled: !puedeBorrar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Eliminar",
            message: `¿Eliminar a ${row.razonSocial}? Solo si nunca tuvo movimientos.`,
            confirmLabel: "Eliminar",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "eliminar"),
          }),
      });
    }
    return items;
  };

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader title="Personas jurídicas" description="Empresas y organizaciones — flujo homologado con personas físicas." />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando…
        </div>
      ) : isError ? (
        <EstadoMensaje tipo={err?.permission ? "permiso" : "error"} mensaje={err?.message ?? "Error desconocido"} onRetry={() => refetch()} />
      ) : isEmpty ? (
        <EstadoMensaje tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.legajo}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            hidePagination
            serverFilterState={filtrosPanel}
            onServerFilterChange={aplicarFiltros}
            serverResultCount={total}
            extraFilters={
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => {
                    setFiltroEstado(e.target.value);
                    setPage(0);
                  }}
                  className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Todos</option>
                  {FILTRO_ESTADOS_OPCIONES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <Pagination
            page={page + 1}
            totalPages={totalPaginas}
            pageSize={pageSize}
            total={total}
            countLabel="resultado(s)"
            pageSizes={PAGE_SIZES}
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
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

const columns: Column<JuridicaRow>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    minWidth: 110,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    minWidth: 130,
    render: (r) => (
      <span className="font-mono text-xs tabular-nums" title={`Legajo: ${r.legajo}`}>
        {r.cuitFormatted}
      </span>
    ),
  },
  {
    key: "razonSocial",
    label: "Razón social / Fantasía",
    filterable: true,
    minWidth: 220,
    maxWidth: 360,
    render: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground" title={r.razonSocial}>
          {r.razonSocial}
        </span>
        {r.nombreFantasia ? (
          <span className="text-xs italic text-muted-foreground">*{r.nombreFantasia}*</span>
        ) : null}
        <span className="text-xs text-muted-foreground">{r.correo}</span>
      </div>
    ),
  },
  {
    key: "tipoLabel",
    label: "Tipo",
    minWidth: 80,
    render: (r) => (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-card text-xs font-semibold">
        <Building2 size={12} className="text-muted-foreground" />
        {r.tipoLabel}
      </span>
    ),
  },
  {
    key: "estadoLabel",
    label: "Estado",
    minWidth: 120,
    render: (r) => <Badge tone={r.estadoTone}>{r.estadoLabel}</Badge>,
  },
  {
    key: "esPep",
    label: "PEP",
    minWidth: 70,
    render: (r) =>
      r.esPep ? (
        <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border text-xs font-semibold bg-red-100 text-red-800 border-red-200">
          Sí
        </span>
      ) : (
        <span className="text-xs text-muted-foreground text-center w-7 inline-block">No</span>
      ),
  },
  {
    key: "comerciosCount",
    label: "Comercios / CVUs",
    minWidth: 160,
    render: (r) => (
      <div className="flex items-center gap-3 text-xs font-medium tabular-nums">
        <span
          className={`inline-flex items-center gap-1 ${r.comerciosCount > 0 ? "text-foreground" : "text-muted-foreground"}`}
          title="Comercios asociados"
        >
          <Store size={12} />
          {r.comerciosCount} {r.comerciosCount === 1 ? "Comercio" : "Comercios"}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span
          className={`inline-flex items-center gap-1 ${r.cvuCount > 0 ? "text-foreground" : "text-muted-foreground"}`}
          title="CVUs / Subcuentas"
        >
          {r.cvuCount} {r.cvuCount === 1 ? "CVU" : "CVUs"}
        </span>
      </div>
    ),
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    minWidth: 130,
    render: (r) => <span className="font-mono tabular-nums">{r.fechaRegistro}</span>,
  },
];
