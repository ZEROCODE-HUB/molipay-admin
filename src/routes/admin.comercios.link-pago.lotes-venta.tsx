import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  AlertTriangle,
  Inbox,
  Calendar,
  Store,
  Eye,
  Download,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card, Input, Label, BtnOutline } from "@/components/portal-shell";
import { ModalDialog } from "@/components/modal-dialog";
import { PermissionGuard } from "@/components/permission-guard";
import { Pagination } from "@/components/pagination";
import { useQuery } from "@tanstack/react-query";
import { listBanderas } from "@/lib/api/banderas";
import { useComercios } from "@/hooks/useComercios";
import { listVentasDiaPaginado, ventasDelDia, type VentaDia, type VentaDetalle } from "@/lib/api/acreditaciones";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes-venta")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Lotes de Venta — Links de Pago — Admin — Moli" },
      { name: "description", content: "Ventas brutas aprobadas por comercio y día. Informativo: no mueve dinero." },
    ],
  }),
});

const PAGE_SIZES = [10, 20, 50];

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Estado del lote de venta: Abierto (dia en curso, antes del corte) o
 * Cerrado (lote finalizado y enviado a Payway).
 */
function estadoLote(r: VentaDia): "Abierto" | "Cerrado" {
  return r.estado === "Abierto" ? "Abierto" : "Cerrado";
}

function Page() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [banderaFilter, setBanderaFilter] = useState("");
  const [comercioFilter, setComercioFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [detalle, setDetalle] = useState<VentaDia | null>(null);
  const [exportando, setExportando] = useState(false);

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 100 });
  const { data: banderas = [] } = useQuery({
    queryKey: ["banderas", "activas"],
    queryFn: () => listBanderas("Activo"),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["lotes-venta", page, pageSize, search, banderaFilter, comercioFilter, fechaDesde, fechaHasta],
    queryFn: () =>
      listVentasDiaPaginado({
        page,
        pageSize,
        search: search || undefined,
        bandera: banderaFilter || undefined,
        comercioId: comercioFilter || undefined,
        desde: fechaDesde || undefined,
        hasta: fechaHasta || undefined,
      }),
  });

  const lotes = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportar = async () => {
    setExportando(true);
    try {
      const rows: VentaDia[] = [];
      for (let p = 0; p < 50; p++) {
        const r = await listVentasDiaPaginado({
          page: p,
          pageSize: 1000,
          search: search || undefined,
          bandera: banderaFilter || undefined,
          comercioId: comercioFilter || undefined,
          desde: fechaDesde || undefined,
          hasta: fechaHasta || undefined,
        });
        rows.push(...r.rows);
        if (rows.length >= r.total || r.rows.length === 0) break;
      }
      const escape = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ["Fecha de venta", "Comercio", "Legajo", "Ventas", "Monto bruto vendido", "Por bandera", "Estado"];
      const lines = rows.map((r) => [
        parseDateLocal(r.fecha).toLocaleDateString("es-AR"),
        r.comercio_nombre ?? "—",
        r.comercio_legajo,
        r.ventas,
        Number(r.bruto).toFixed(2),
        Object.entries(r.por_bandera ?? {})
          .map(([b, v]) => `${b}: ${Number(v).toFixed(2)}`)
          .join(" | "),
        estadoLote(r),
      ]);
      const csv = [header, ...lines].map((row) => row.map(escape).join(";")).join("\n");
      // BOM para que Excel interprete UTF-8 correctamente.
      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lotes-venta-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[lotes-venta] export error:", e);
    } finally {
      setExportando(false);
    }
  };

  const columns: Column<VentaDia>[] = [
    {
      key: "fecha",
      label: "Fecha de venta",
      hint: "Día en que se realizaron las compras en el comercio.",
      minWidth: 120,
      render: (r) => <span className="font-mono text-xs tabular-nums">{parseDateLocal(r.fecha).toLocaleDateString("es-AR")}</span>,
    },
    {
      key: "comercio",
      label: "Comercio",
      hint: "Nombre de fantasía y legajo del cliente.",
      minWidth: 200,
      maxWidth: 320,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[180px]">{r.comercio_nombre ?? "—"}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.comercio_legajo}</div>
        </div>
      ),
    },
    {
      key: "ventas",
      label: "Ventas (cant.)",
      hint: "Cantidad total de transacciones aprobadas en el día.",
      minWidth: 100,
      render: (r) => <span className="font-mono tabular-nums">{r.ventas}</span>,
    },
    {
      key: "bruto",
      label: "Monto bruto vendido",
      hint: "Suma total bruta cobrada al cliente final.",
      minWidth: 150,
      render: (r) => <span className="font-mono tabular-nums font-semibold">{fmt(Number(r.bruto))}</span>,
    },
    {
      key: "por_bandera",
      label: "Por bandera",
      hint: "Desglose bruto por marca de tarjeta procesada.",
      minWidth: 200,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          {Object.entries(r.por_bandera ?? {}).map(([b, v]) => (
            <span key={b} className="text-xs">
              <span className="text-muted-foreground">{b}:</span> <span className="font-mono">{fmt(Number(v))}</span>
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado del lote",
      hint: "Abierto: día en curso antes del horario de corte. Cerrado: lote finalizado y enviado a Payway.",
      minWidth: 120,
      render: (r) => <Badge tone={estadoLote(r) === "Abierto" ? "warn" : "neutral"}>{estadoLote(r)}</Badge>,
    },
  ];

  const err = error as Error | null;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Lotes de Venta"
        description="Volumen bruto de ventas aprobadas por comercio y día. Es informativo y no mueve dinero: lo cobrado vive en Lotes de Acreditación."
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label>Buscar</Label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Comercio o legajo…"
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label>Bandera</Label>
            <div className="relative">
              <Store size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                value={banderaFilter}
                onChange={(e) => {
                  setBanderaFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full sm:min-w-[160px] h-8 pl-8 pr-2 rounded-md border bg-background text-xs"
              >
                <option value="">Todas</option>
                {banderas.map((b) => (
                  <option key={b.id} value={b.nombre}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Comercio</Label>
            <select
              value={comercioFilter}
              onChange={(e) => {
                setComercioFilter(e.target.value);
                setPage(0);
              }}
              className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              {comerciosOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercio ?? c.usuario} · {c.legajo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Desde</Label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPage(0);
                }}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label>Hasta</Label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPage(0);
                }}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <BtnOutline onClick={exportar} disabled={exportando || isLoading}>
            <Download size={16} />
            {exportando ? "Exportando…" : "Descargar CSV"}
          </BtnOutline>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando lotes de venta…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <p>{err?.message ?? "Error"}</p>
          <button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">
            Reintentar
          </button>
        </div>
      ) : lotes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay lotes de venta que coincidan con los filtros.</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={lotes}
            keyExtractor={(r) => `${r.comercio_id}-${r.fecha}`}
            hidePagination
            showGlobalFilter={false}
            showDownloadButton={false}
            actions={(r) => (
              <button
                type="button"
                onClick={() => setDetalle(r)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-input bg-card text-xs font-semibold hover:bg-accent transition"
              >
                <Eye size={14} />
                Ver detalle
              </button>
            )}
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="registros"
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

      {detalle && <DetalleLoteModal lote={detalle} onClose={() => setDetalle(null)} />}
    </PermissionGuard>
  );
}

// ============================ Detalle del lote ============================

function DetalleLoteModal({ lote, onClose }: { lote: VentaDia; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["lote-venta-ops", lote.comercio_id, lote.fecha],
    queryFn: () => ventasDelDia(lote.comercio_id, lote.fecha),
  });

  const filtradas = (data ?? []).filter((v) => {
    const q = search.trim().toLowerCase();
    return !q || v.id_txn.toLowerCase().includes(q) || (v.bandera ?? "").toLowerCase().includes(q);
  });
  const total = filtradas.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const ops = filtradas.slice(page * pageSize, page * pageSize + pageSize);

  const columns: Column<VentaDetalle>[] = [
    {
      key: "fecha",
      label: "Hora",
      minWidth: 130,
      render: (r) => <span className="font-mono text-xs tabular-nums">{fmtDateTime(r.fecha)}</span>,
    },
    {
      key: "idTxn",
      label: "ID Transacción",
      minWidth: 180,
      maxWidth: 240,
      render: (r) => (
        <span className="font-mono text-xs truncate block" title={r.id_txn}>
          {r.id_txn}
        </span>
      ),
    },
    {
      key: "bandera",
      label: "Bandera",
      minWidth: 110,
      render: (r) => (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">{r.bandera ?? "—"}</span>
      ),
    },
    {
      key: "cuotas",
      label: "Cuotas",
      minWidth: 70,
      render: (r) => <span className="font-mono tabular-nums">{r.cuotas ?? 1}</span>,
    },
    {
      key: "montoOperacion",
      label: "Monto",
      minWidth: 110,
      render: (r) => <span className="font-mono tabular-nums">{fmt(Number(r.monto_operacion))}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      minWidth: 110,
      render: () => <Badge tone="success">Autorizada</Badge>,
    },
    {
      key: "lote",
      label: "Lote de acreditación",
      minWidth: 180,
      render: (r) =>
        r.lote ? (
          <span className="font-mono text-xs">
            {r.lote.codigo} · {r.lote.estado}
            {r.lote.origen === "venta" ? ` (est. ${parseDateLocal(r.lote.fecha).toLocaleDateString("es-AR")})` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <ModalDialog
      open
      onClose={onClose}
      title="Detalle del lote de venta"
      description={`${parseDateLocal(lote.fecha).toLocaleDateString("es-AR")} · ${lote.comercio_nombre ?? "—"} · ${lote.comercio_legajo} · ${estadoLote(lote)}`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Ventas</div>
            <div className="font-mono font-semibold text-lg">{lote.ventas}</div>
          </div>
          <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <div className="text-xs text-muted-foreground">Monto bruto vendido</div>
            <div className="font-mono font-semibold text-lg text-emerald-700">{fmt(Number(lote.bruto))}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
            <div className="text-xs text-muted-foreground">Por bandera</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(lote.por_bandera ?? {}).map(([b, v]) => (
                <span key={b} className="text-sm">
                  <span className="text-muted-foreground">{b}:</span> <span className="font-mono font-semibold">{fmt(Number(v))}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por ID o bandera…"
            className="pl-8 h-8 text-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border bg-card py-12 text-sm text-muted-foreground">
            <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
            Cargando operaciones…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            <AlertTriangle size={24} />
            <p>No se pudieron cargar las operaciones del lote.</p>
            <button
              onClick={() => refetch()}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground"
            >
              Reintentar
            </button>
          </div>
        ) : ops.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            <Inbox size={24} />
            <p>No hay operaciones que coincidan.</p>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={ops}
              keyExtractor={(r) => r.id}
              hidePagination
              showGlobalFilter={false}
              showDownloadButton={false}
            />
            <Pagination
              page={page + 1}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              countLabel="operaciones"
              pageSizes={PAGE_SIZES}
              onPageChange={(p) => setPage(p - 1)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(0);
              }}
            />
          </>
        )}
      </div>
    </ModalDialog>
  );
}