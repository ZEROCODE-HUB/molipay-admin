import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, FilterX, AlertTriangle, Inbox, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { FormDialog } from "@/components/form-dialog";
import { Input, Label } from "@/components/portal-shell";
import { useMovimientos } from "@/hooks/useMovimientos";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCambiarEstadoMovimiento } from "@/hooks/useMovimientoActions";
import { useEstadosMovimiento } from "@/hooks/useEstados";
import { calcularDesglose, fmtARS } from "@/lib/aranceles";
import { DataAccessError } from "@/lib/api/errors";
import {
  ESTADOS_MOVIMIENTO,
  type EstadoMovimiento,
  type Movimiento as MovimientoDB,
} from "@/lib/api/types";
import { resolverEstadoMovimiento } from "@/lib/estados";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { z } from "zod";

export const Route = createFileRoute("/admin/general/movimientos/")({
  validateSearch: z.object({ legajo: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Todos los movimientos — Movimientos — Admin Molly" },
      { name: "description", content: "Historial completo de movimientos de la plataforma." },
    ],
  }),
  component: TodosPage,
});

const PAGE_SIZE = 25;

// Tipos de movimiento: label visible en la UI -> código real en BD.
// Únicos valores que existen en movimientos.tipo (coinciden con
// estados_por_tipo.tipo_movimiento). No se agregan opciones sin
// correspondencia real para evitar filtros que devuelvan vacío silencioso.
const TIPO_OPCIONES: { label: string; code: string }[] = [
  { label: "Depósito", code: "deposito" },
  { label: "Retiro", code: "retiro" },
  { label: "Pago con tarjeta", code: "tarjeta" },
  { label: "Pago PCT", code: "pago_pct" },
  { label: "Cobro PCT", code: "cobro_pct" },
];
const TIPO_LABEL = new Map(TIPO_OPCIONES.map((o) => [o.code, o.label]));

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toViewMovimiento(m: MovimientoDB, catalogo: EstadoMovimiento[]): Movimiento {
  const pctImpuesto = m.comision > 0 ? (m.impuesto / m.comision) * 100 : 0;
  const estado = resolverEstadoMovimiento(m, catalogo).codigo;
  return {
    clienteId: m.clienteId,
    legajo: m.legajo,
    id: m.idTxn,
    tipo: m.tipo,
    cvu: m.cvu ?? "",
    usuario: m.cliente?.correo ?? "—",
    nombreOrigen: m.cliente?.nombre ?? "—",
    nombreDestino: "MoliPay",
    cuit: m.cliente?.cuit ?? "—",
    monto: fmtARS(m.montoOperacion),
    fecha: fmtFecha(m.fecha),
    estado,
    desglose: calcularDesglose(m.comision, pctImpuesto),
  };
}

function TodosPage() {
  const { legajo } = Route.useSearch();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estado, setEstado] = useState<(typeof ESTADOS_MOVIMIENTO)[number] | "">("");
  const [tipo, setTipo] = useState<string>("");
  const [legajoInput, setLegajoInput] = useState(legajo ?? "");

  useEffect(() => {
    setLegajoInput(legajo ?? "");
  }, [legajo]);

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useMovimientos({
    page,
    pageSize: PAGE_SIZE,
    search: search || legajo || undefined,
    estadoCodigo: estado || undefined,
    tipo: tipo || undefined,
    legajo: legajo,
    countMode: "estimated",
  });

  const { data: estados = [] } = useEstadosMovimiento();
  const catalogoEstados = estados;
  const [detail, setDetail] = useState<Movimiento | null>(null);
  const [estadoTarget, setEstadoTarget] = useState<{
    dbId: string;
    estadoActual: string;
    nuevoId: number;
  } | null>(null);
  const cambiarEstado = useCambiarEstadoMovimiento();

  const { can } = useCan();
  const puedeModificar = can("modificar", "movimientos");

  const byTxn = new Map(rows.map((r) => [r.idTxn, r]));
  const data: Movimiento[] = rows.map((m) => toViewMovimiento(m, catalogoEstados));

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
    {
      label: "Cambiar estado",
      icon: ShieldAlert,
      disabled: !puedeModificar,
      onClick: () => {
        const db = byTxn.get(row.id);
        if (db)
          setEstadoTarget({
            dbId: db.id,
            estadoActual: row.estado,
            nuevoId: db.estadoId,
          });
      },
    },
    {
      label: "Ver movimientos del cliente",
      icon: FilterX,
      onClick: () => navigate({ to: "/admin/general/movimientos", search: { legajo: row.legajo } }),
    },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  return (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Todos los movimientos"
        description="Historial completo de transacciones (paginación server-side sobre la base de datos)."
      />

      <div className="rounded-lg border bg-card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <Label htmlFor="buscar">Buscar</Label>
            <Input
              id="buscar"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(0);
              }}
              placeholder="ID, legajo, correo o nombre…"
            />
          </div>
          <div className="w-[200px]">
            <Label htmlFor="f-legajo">Legajo</Label>
            <Input
              id="f-legajo"
              value={legajoInput}
              onChange={(e) => {
                setLegajoInput(e.target.value);
                setPage(0);
                navigate({
                  to: "/admin/general/movimientos",
                  search: e.target.value ? { legajo: e.target.value } : {},
                });
              }}
              placeholder="LPF-… / LPJ-…"
            />
          </div>
          <div>
            <Label htmlFor="f-estado">Estado</Label>
            <select
              id="f-estado"
              className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value as (typeof ESTADOS_MOVIMIENTO)[number] | "");
                setPage(0);
              }}
            >
              <option value="">Todos</option>
              {ESTADOS_MOVIMIENTO.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="f-tipo">Tipo</Label>
            <select
              id="f-tipo"
              className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todos</option>
              {TIPO_OPCIONES.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {legajo && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm mb-4">
          Mostrando movimientos del cliente con legajo{" "}
          <span className="font-mono font-semibold tabular-nums">{legajo}</span>.{" "}
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/general/movimientos", search: {} })}
            className="ml-1 text-xs font-semibold text-primary underline underline-offset-2"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando movimientos…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <div>
            <p className="font-semibold">
              {err?.permission
                ? "No tenés permiso para ver esto"
                : "Ocurrió un error al cargar los movimientos"}
            </p>
            <p className="mt-1">{err?.message ?? "Error desconocido"}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay movimientos que coincidan con los filtros aplicados.</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            showGlobalFilter={false}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total === 0 || total ? `${total} movimiento(s) · ` : ""}página {page + 1} de{" "}
              {totalPaginas}
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

      {detail && <MovimientoDetail m={detail} onClose={() => setDetail(null)} />}

      {estadoTarget && (
        <FormDialog
          open
          onClose={() => setEstadoTarget(null)}
          title="Cambiar estado del movimiento"
          description={`Transición atómica registrada en el historial (origen = manual). Estado actual: ${estadoTarget.estadoActual}.`}
          onSubmit={async () => {
            await cambiarEstado.mutateAsync({
              movimientoId: estadoTarget.dbId,
              nuevoEstadoId: estadoTarget.nuevoId,
              observaciones: "Cambio manual desde backoffice",
            });
            setEstadoTarget(null);
          }}
          submitLabel={cambiarEstado.isPending ? "Guardando…" : "Confirmar cambio"}
          size="md"
        >
          {cambiarEstado.isError && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{(cambiarEstado.error as Error).message}</span>
            </div>
          )}
          <div>
            <Label htmlFor="nuevo-estado">Nuevo estado</Label>
            <select
              id="nuevo-estado"
              className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
              value={estadoTarget.nuevoId}
              onChange={(e) =>
                setEstadoTarget((s) => (s ? { ...s, nuevoId: Number(e.target.value) } : s))
              }
            >
              {estados.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </FormDialog>
      )}
    </PermissionGuard>
  );
}

const columns: Column<Movimiento>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "id",
    label: "ID",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.id}</span>,
  },
  {
    key: "tipo",
    label: "Tipo de movimiento",
    filterable: false,
    render: (r) => TIPO_LABEL.get(r.tipo) ?? r.tipo,
  },
  {
    key: "cvu",
    label: "CVU",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.cvu}</span>,
  },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "nombreOrigen",
    label: "Nombre empresa/persona",
    filterable: true,
    render: (r) => r.nombreOrigen,
  },
  {
    key: "nombreDestino",
    label: "Nombre destino",
    filterable: true,
    render: (r) => r.nombreDestino,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span>,
  },
  {
    key: "monto",
    label: "Monto",
    render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
  },
  {
    key: "fecha",
    label: "Fecha",
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: [...ESTADOS_MOVIMIENTO],
    render: (row) => estadoBadge(row.estado),
  },
];
