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
import { useQuery } from "@tanstack/react-query";
import { exportLotesVenta, listLotesVenta, listOperacionesLote } from "@/lib/api/lotes-venta";
import { listBanderas } from "@/lib/api/banderas";
import { useComercios } from "@/hooks/useComercios";
import type { LoteVenta, Movimiento } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes-venta")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Lotes de Venta — Links de Pago — Admin — Moli" },
      { name: "description", content: "Venta bruta acumulada del día por comercio, bandera y fecha (v_lotes_venta)." },
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

function estadoTone(codigo?: string): "success" | "warn" | "danger" | "neutral" {
  if (!codigo) return "neutral";
  if (codigo === "APROBADO") return "success";
  if (codigo === "PENDIENTE" || codigo === "PROCESADO") return "warn";
  if (codigo === "RECHAZADO" || codigo === "CANCELADO" || codigo === "ERROR") return "danger";
  return "neutral";
}

function Page() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [banderaFilter, setBanderaFilter] = useState("");
  const [comercioFilter, setComercioFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [detalle, setDetalle] = useState<LoteVenta | null>(null);
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
      listLotesVenta({
        page,
        pageSize,
        search: search || undefined,
        bandera: banderaFilter || undefined,
        comercioId: comercioFilter || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      }),
  });

  const lotes = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filtrosExport = {
    search: search || undefined,
    bandera: banderaFilter || undefined,
    comercioId: comercioFilter || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const rows = await exportLotesVenta(filtrosExport);
      const escape = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ["Fecha Venta", "Comercio", "Legajo", "Bandera", "Ops", "Bruto", "Impuestos Est.", "Comisión Est.", "Neto Estimado"];
      const lines = rows.map((r) => [
        parseDateLocal(r.fecha).toLocaleDateString("es-AR"),
        r.comercio?.nombreComercio ?? r.comercio?.usuario ?? "—",
        r.comercio?.legajo ?? r.comercioId,
        r.bandera,
        r.cantidadOperaciones,
        r.importeBruto.toFixed(2),
        r.impuestos.toFixed(2),
        r.comision.toFixed(2),
        r.netoEstimado.toFixed(2),
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

  const columns: Column<LoteVenta>[] = [
    {
      key: "fecha",
      label: "Fecha Venta",
      minWidth: 120,
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">
          {parseDateLocal(r.fecha).toLocaleDateString("es-AR")}
        </span>
      ),
    },
    {
      key: "comercio",
      label: "Comercio / Legajo",
      minWidth: 200,
      maxWidth: 320,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[180px]">
            {r.comercio?.nombreComercio ?? r.comercio?.usuario ?? "—"}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {r.comercio?.legajo ?? r.comercioId}
          </div>
        </div>
      ),
    },
    {
      key: "bandera",
      label: "Bandera",
      minWidth: 130,
      render: (r) => (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">
          {r.bandera}
        </span>
      ),
    },
    {
      key: "cantidadOperaciones",
      label: "Ops",
      minWidth: 80,
      render: (r) => <span className="font-mono tabular-nums">{r.cantidadOperaciones}</span>,
    },
    {
      key: "importeBruto",
      label: "Bruto",
      minWidth: 130,
      render: (r) => <span className="font-mono tabular-nums">{fmt(r.importeBruto)}</span>,
    },
    {
      key: "impuestos",
      label: "Impuestos Est.",
      minWidth: 130,
      render: (r) => (
        <span className="font-mono tabular-nums text-red-600">- {fmt(r.impuestos)}</span>
      ),
    },
    {
      key: "comision",
      label: "Comisión Est.",
      minWidth: 130,
      render: (r) => (
        <span className="font-mono tabular-nums text-red-600">- {fmt(r.comision)}</span>
      ),
    },
    {
      key: "netoEstimado",
      label: "Neto Estimado",
      minWidth: 140,
      render: (r) => (
        <span className="font-mono tabular-nums font-semibold text-emerald-700">
          {fmt(r.netoEstimado)}
        </span>
      ),
    },
  ];

  const err = error as Error | null;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Lotes de Venta"
        description="Venta bruta acumulada del día por comercio, bandera y fecha (desde v_lotes_venta). Información de proyección, la liquidación real vive en Lotes de Acreditación."
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
                placeholder="Comercio, legajo o bandera…"
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
            keyExtractor={(r) => `${r.comercioId}-${r.bandera}-${r.fecha}`}
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
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{total} registros · </span>
              <span className="whitespace-nowrap">Filas por página:</span>
              <select
                className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs outline-none focus:ring-2 focus:ring-ring/40"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-muted-foreground text-xs sm:text-sm">
                Pág. {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0 || isFetching}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-9 px-3 rounded-md border bg-card disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  disabled={page + 1 >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-9 px-3 rounded-md border bg-card disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {detalle && <DetalleLoteModal lote={detalle} onClose={() => setDetalle(null)} />}
    </PermissionGuard>
  );
}

// ============================ Detalle del lote ============================

function DetalleLoteModal({ lote, onClose }: { lote: LoteVenta; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["lote-venta-ops", lote.comercioId, lote.bandera, lote.fecha, page, pageSize, search],
    queryFn: () =>
      listOperacionesLote({
        comercioId: lote.comercioId,
        bandera: lote.bandera,
        fecha: lote.fecha,
        page,
        pageSize,
        search: search || undefined,
      }),
  });

  const ops = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<Movimiento>[] = [
    {
      key: "fecha",
      label: "Fecha",
      minWidth: 130,
      render: (r) => <span className="font-mono text-xs tabular-nums">{fmtDateTime(r.fecha)}</span>,
    },
    {
      key: "idTxn",
      label: "ID Transacción",
      minWidth: 180,
      maxWidth: 240,
      render: (r) => (
        <span className="font-mono text-xs truncate block" title={r.idTxn}>
          {r.idTxn}
        </span>
      ),
    },
    {
      key: "cliente",
      label: "Cliente",
      minWidth: 200,
      render: (r) => (
        <div>
          <div className="text-sm truncate max-w-[180px]">
            {r.cliente?.nombre ?? r.legajo}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{r.legajo}</div>
        </div>
      ),
    },
    {
      key: "montoOperacion",
      label: "Monto",
      minWidth: 110,
      render: (r) => <span className="font-mono tabular-nums">{fmt(r.montoOperacion)}</span>,
    },
    {
      key: "comision",
      label: "Comisión",
      minWidth: 110,
      render: (r) => <span className="font-mono tabular-nums text-red-600">- {fmt(r.comision)}</span>,
    },
    {
      key: "impuesto",
      label: "Impuesto",
      minWidth: 110,
      render: (r) => <span className="font-mono tabular-nums text-red-600">- {fmt(r.impuesto)}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      minWidth: 110,
      render: (r) => (
        <Badge tone={estadoTone(r.estadoCodigo)}>{r.estadoNombre ?? r.estadoCodigo ?? "—"}</Badge>
      ),
    },
  ];

  return (
    <ModalDialog
      open
      onClose={onClose}
      title="Detalle del lote de venta"
      description={`${parseDateLocal(lote.fecha).toLocaleDateString("es-AR")} · ${
        lote.comercio?.nombreComercio ?? lote.comercio?.usuario ?? "—"
      } · ${lote.comercio?.legajo ?? lote.comercioId} · ${lote.bandera}`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Operaciones</div>
            <div className="font-mono font-semibold text-lg">{lote.cantidadOperaciones}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Bruto</div>
            <div className="font-mono font-semibold text-lg">{fmt(lote.importeBruto)}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Impuestos Est.</div>
            <div className="font-mono font-semibold text-lg text-red-600">
              - {fmt(lote.impuestos)}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Comisión Est.</div>
            <div className="font-mono font-semibold text-lg text-red-600">
              - {fmt(lote.comision)}
            </div>
          </div>
          <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <div className="text-xs text-muted-foreground">Neto Estimado</div>
            <div className="font-mono font-semibold text-lg text-emerald-700">
              {fmt(lote.netoEstimado)}
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
            placeholder="Buscar por ID, legajo, cliente…"
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
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{total} operaciones · </span>
                <span className="whitespace-nowrap">Filas por página:</span>
                <select
                  className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs outline-none focus:ring-2 focus:ring-ring/40"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  Pág. {page + 1} de {totalPages}
                </span>
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-8 px-3 rounded-md border bg-card disabled:opacity-50 text-xs"
                >
                  Anterior
                </button>
                <button
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-3 rounded-md border bg-card disabled:opacity-50 text-xs"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
}