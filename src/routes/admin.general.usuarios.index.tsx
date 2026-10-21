import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, XCircle, RotateCcw, AlertTriangle, Inbox, ShieldCheck, Ban, Trash2, CheckCircle, AlertOctagon } from "lucide-react";
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
  type RiesgoPLD,
} from "@/lib/api/clientes";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Cliente, EstadoCliente } from "@/lib/api/types";
import { ESTADO_LABEL, ESTADO_TONE, normalizarEstado, FILTRO_ESTADOS_OPCIONES, LABEL_A_ESTADO } from "@/lib/cliente-estados";
import { toast } from "sonner";
import { Pagination } from "@/components/pagination";
import { SHOW_PLAFT_COLUMNS } from "@/lib/feature-flags";

export const Route = createFileRoute("/admin/general/usuarios/")({
  head: () => ({
    meta: [
      { title: "Personas físicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas físicas registradas en la plataforma." },
    ],
  }),
  component: UsuariosPage,
});

const PAGE_SIZES = [10, 20, 50];

type Usuario = {
  id: string;
  legajo: string;
  correo: string;
  nombres: string;
  cuit: string;
  cuitFormatted: string;
  estadoRaw: EstadoCliente;
  estadoLabel: string;
  estadoTone: "success" | "warn" | "danger" | "neutral";
  fechaRegistro: string;
  // Enrichment
  esPep: boolean;
  riesgo: RiesgoPLD | null;
  riesgoMotivo: string | null;
  kycCompleto: boolean;
  cvuCount: number;
  consumoMensualPct: number | null;
  limiteTransferencia: number | null;
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
          <p className="font-semibold">Ocurrió un error al cargar los usuarios</p>
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
      <p>No hay usuarios que coincidan con la búsqueda.</p>
    </div>
  );
}

// --- Helpers de presentación para las columnas nuevas ---------------------

function RiesgoBadge({ nivel, motivo }: { nivel: RiesgoPLD | null; motivo?: string | null }) {
  if (!nivel) {
    return (
      <span
        title="Cliente sin evaluación PLAFT vigente. Pendiente de revisión."
        className="inline-flex items-center gap-1 text-xs text-muted-foreground italic"
      >
        <AlertOctagon size={12} className="text-muted-foreground" />
        Sin evaluar
      </span>
    );
  }
  const tone =
    nivel === "bajo"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : nivel === "medio"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : nivel === "alto"
          ? "bg-orange-100 text-orange-800 border-orange-200"
          : "bg-red-100 text-red-800 border-red-200";
  const label = nivel.charAt(0).toUpperCase() + nivel.slice(1);
  return (
    <span
      title={motivo ?? `Nivel de riesgo PLAFT: ${label}`}
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function KycBadge({ completo }: { completo: boolean }) {
  return completo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-emerald-100 text-emerald-800 border-emerald-200">
      ✓ Validado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-amber-100 text-amber-800 border-amber-200">
      Pendiente
    </span>
  );
}

function PerfilConsumo({
  pct,
  limite,
}: {
  pct: number | null;
  limite: number | null;
}) {
  if (pct == null) {
    return (
      <span className="text-xs text-muted-foreground italic" title="Sin límite operativo configurado">
        —
      </span>
    );
  }
  const tone =
    pct >= 90
      ? "bg-red-500"
      : pct >= 75
        ? "bg-amber-500"
        : pct >= 50
          ? "bg-yellow-500"
          : "bg-emerald-500";
  const fmtLimite = limite
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(limite)
    : null;
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{pct}%</span>
        {fmtLimite && <span>${fmtLimite}</span>}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

// --- Tipos y mapeo de filas con enrichment --------------------------------

function UsuariosPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filtroEstado, setFiltroEstado] = useState<string>("");

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

  const estadoFiltroDb = filtroEstado ? (LABEL_A_ESTADO[filtroEstado] as EstadoCliente | undefined) : undefined;

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useClientes({
    page,
    pageSize,
    estado: estadoFiltroDb,
    tipoPersona: "fisica",
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

  // Enrichment paralelo: riesgo PLAFT + CVUs + KYC + consumo del mes.
  // Se cachea por legajos (no por filtros), así no se dispara en cada cambio
  // de paginación. Se invalida junto con la lista de clientes via queryClient.
  const enrichmentQuery = useQuery<Record<string, ClienteEnrichment>>({
    queryKey: ["clientes-enrichment", rows.map((r) => r.legajo).join("|")],
    queryFn: async () => getClientesEnrichment(rows.map((r) => r.legajo)),
    enabled: rows.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const enrichmentMap = enrichmentQuery.data ?? {};

  const data: Usuario[] = rows.map((c: Cliente) => {
    const norm = normalizarEstado(c.estado);
    const e = enrichmentMap[c.legajo] ?? {};
    return {
      id: c.id,
      legajo: c.legajo,
      correo: c.correo,
      nombres: c.nombre,
      cuit: c.cuit,
      cuitFormatted: formatCuit(c.cuit),
      estadoRaw: c.estado,
      estadoLabel: ESTADO_LABEL[norm],
      estadoTone: ESTADO_TONE[norm] as Usuario["estadoTone"],
      fechaRegistro: c.fechaAlta,
      esPep: Boolean(c.esPep),
      riesgo: e.riesgo ?? null,
      riesgoMotivo: e.riesgoMotivo ?? null,
      kycCompleto: Boolean(e.kycCompleto),
      cvuCount: e.cvuCount ?? 0,
      consumoMensualPct: e.consumoMensualPct ?? null,
      limiteTransferencia: c.limiteTransferencia ?? null,
    };
  });

  const ejecutar = async (
    legajo: string,
    accion: "aprobar" | "activar" | "suspender" | "reactivar" | "deshabilitar" | "eliminar",
  ) => {
    try {
      const cliente = await getClienteByLegajo(legajo);
      if (!cliente) throw new Error("Cliente no encontrado");
      let res: { ok: boolean; motivo?: string } | { ok: true } = { ok: false, motivo: "No implementado" };
      if (accion === "aprobar") res = await aprobarDocumentacionCliente(cliente);
      else if (accion === "activar") res = await activarCliente(cliente);
      else if (accion === "suspender") res = await suspenderCliente(cliente);
      else if (accion === "reactivar") res = await reactivarCliente(cliente);
      else if (accion === "deshabilitar") res = await deshabilitarCliente(cliente);
      else if (accion === "eliminar") res = await eliminarCliente(cliente);

      if (!res.ok) {
        const motivo = (res as { motivo?: string }).motivo ?? "No se pudo completar la acción";
        toast.error(motivo);
        setConfirmAction({
          title: "No se pudo completar",
          message: motivo,
          confirmLabel: "Cerrar",
          variant: "danger",
          onConfirm: () => setConfirmAction(null),
        });
        return;
      }
      toast.success("Estado actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setConfirmAction(null);
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg);
      setConfirmAction({
        title: "Error",
        message: msg,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const getActions = (row: Usuario): ActionItem[] => {
    const norm = normalizarEstado(row.estadoRaw);
    const items: ActionItem[] = [
      {
        label: "Ver / editar ficha",
        icon: Eye,
        onClick: () => navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } }),
      },
      {
        label: "Asignar / gestionar CVU",
        icon: ShieldCheck,
        disabled: !puedeModificar,
        onClick: () => navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo }, search: { tab: "cvu" } }),
      },
      {
        label: "Ver historial de movimientos",
        icon: Inbox,
        onClick: () => navigate({ to: "/admin/general/movimientos", search: { legajo: row.legajo } }),
      },
    ];

    if (norm === "registrado") {
      items.push({
        label: "Preactivar (aprobar documentación)",
        icon: ShieldCheck,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Aprobar documentación",
            message: `¿Aprobar la documentación de ${row.nombres}? Pasará a Preactivado.`,
            confirmLabel: "Aprobar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "aprobar"),
          }),
      });
    }
    if (norm === "preactivado") {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Activar usuario",
            message: `¿Activar a ${row.nombres}? Requiere CVU y comisión cargados.`,
            confirmLabel: "Activar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "activar"),
          }),
      });
    }
    if (norm === "activado") {
      items.push({
        label: "Suspender",
        icon: XCircle,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Suspender usuario",
            message: `¿Suspender a ${row.nombres}? Se conservará su historial.`,
            confirmLabel: "Suspender",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "suspender"),
          }),
      });
    }
    if (norm === "suspendido") {
      items.push({
        label: "Reactivar",
        icon: RotateCcw,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Reactivar usuario",
            message: `¿Reactivar a ${row.nombres}?`,
            confirmLabel: "Reactivar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "reactivar"),
          }),
      });
    }
    if (norm !== "deshabilitado" && norm !== "eliminado") {
      items.push({
        label: "Deshabilitar",
        icon: Ban,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Deshabilitar usuario",
            message: `¿Deshabilitar a ${row.nombres}? Se cancelará su CVU y se conservará el historial (auditoría BCRA).`,
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
            title: "Eliminar usuario",
            message: `¿Eliminar a ${row.nombres}? Solo se permite si nunca tuvo movimientos.`,
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
      <PageHeader
        title="Usuarios de la plataforma"
        description="Personas físicas — flujo homologado: Pendiente → Registrado → Preactivado → Activado."
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando usuarios…
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
            columns={visibleColumns}
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
            countLabel="usuario(s)"
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

const columns: Column<Usuario>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    minWidth: 110,
    render: (row) => <LegajoCell legajo={row.legajo} />,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    minWidth: 130,
    render: (row) => (
      <span className="font-mono text-xs tabular-nums" title={`Legajo: ${row.legajo}`}>
        {row.cuitFormatted}
      </span>
    ),
  },
  {
    key: "nombres",
    label: "Cliente / Usuario",
    filterable: true,
    minWidth: 200,
    maxWidth: 320,
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.nombres}</span>
        <span className="text-xs text-muted-foreground">{row.correo}</span>
      </div>
    ),
  },
  {
    key: "estadoLabel",
    label: "Estado",
    minWidth: 120,
    render: (row) => <Badge tone={row.estadoTone as "success" | "warn" | "danger" | "neutral"}>{row.estadoLabel}</Badge>,
  },
  {
    key: "kycCompleto",
    label: "KYC",
    minWidth: 110,
    render: (row) => <KycBadge completo={row.kycCompleto} />,
  },
  {
    key: "riesgo",
    label: "Riesgo PLAFT",
    minWidth: 130,
    render: (row) => <RiesgoBadge nivel={row.riesgo} motivo={row.riesgoMotivo} />,
  },
  {
    key: "esPep",
    label: "PEP",
    minWidth: 70,
    render: (row) =>
      row.esPep ? (
        <span className="inline-flex items-center justify-center w-7 h-5 rounded-md border text-xs font-semibold bg-red-100 text-red-800 border-red-200">
          Sí
        </span>
      ) : (
        <span className="text-xs text-muted-foreground text-center w-7 inline-block">No</span>
      ),
  },
  {
    key: "cvuCount",
    label: "CVUs",
    minWidth: 80,
    render: (row) => (
      <span
        className={`text-xs font-medium tabular-nums ${row.cvuCount > 0 ? "text-foreground" : "text-muted-foreground"}`}
      >
        {row.cvuCount} {row.cvuCount === 1 ? "CVU" : "CVUs"}
      </span>
    ),
  },
  {
    key: "consumoMensualPct",
    label: "Perfil",
    minWidth: 140,
    render: (row) => <PerfilConsumo pct={row.consumoMensualPct} limite={row.limiteTransferencia} />,
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    minWidth: 130,
    render: (row) => <span className="font-mono tabular-nums">{row.fechaRegistro}</span>,
  },
];

// Columnas PLAFT (Riesgo, PEP, Perfil) ocultadas por decisión de Compliance.
// El nivel de riesgo es 100% manual; mostrar el valor calculado automáticamente
// carece de sentido regulatorio. Ver src/lib/feature-flags.ts.
const PLAFT_KEYS = new Set(["riesgo", "esPep", "consumoMensualPct"]);
const visibleColumns: Column<Usuario>[] = SHOW_PLAFT_COLUMNS
  ? columns
  : columns.filter((c) => !PLAFT_KEYS.has(String(c.key)));
