import { StatusMessage } from "@/shared/ui/status-message";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { useState } from "react";
import { listSalesDayPaginado,type SaleDay } from "@/features/payment-links/credits.supabase";
import { useMerchants } from "@/features/merchants/merchants.hooks";
import { useQuery } from "@tanstack/react-query";
import { listBrands } from "@/features/merchants/card-brands.supabase";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { formatMoney } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { Calendar,Download,Eye,Inbox,Search,Store } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Pagination } from "@/shared/ui/pagination";
import { PAGE_SIZES,statusBatch } from "@/features/payment-links/sale-batches.rules";
import { parseDateLocal } from "@/features/payment-links/batches.rules";
import { DetailBatchModal } from "./detail-batch-modal";

export function SaleBatchesPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<SaleDay | null>(null);
  const [exporting, setExporting] = useState(false);

  const { rows: merchantsOptions } = useMerchants({ page: 0, pageSize: 100 });
  const { data: brands = [] } = useQuery({
    queryKey: ["banderas", "activas"],
    queryFn: () => listBrands("Activo"),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      "lotes-venta",
      page,
      pageSize,
      search,
      brandFilter,
      merchantFilter,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      listSalesDayPaginado({
        page,
        pageSize,
        search: search || undefined,
        bandera: brandFilter || undefined,
        comercioId: merchantFilter || undefined,
        desde: dateFrom || undefined,
        hasta: dateTo || undefined,
      }),
  });

  const batches = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportar = async () => {
    setExporting(true);
    try {
      const rows: SaleDay[] = [];
      for (let p = 0; p < 50; p++) {
        const r = await listSalesDayPaginado({
          page: p,
          pageSize: 1000,
          search: search || undefined,
          bandera: brandFilter || undefined,
          comercioId: merchantFilter || undefined,
          desde: dateFrom || undefined,
          hasta: dateTo || undefined,
        });
        rows.push(...r.rows);
        if (rows.length >= r.total || r.rows.length === 0) break;
      }
      const escape = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = [
        "Fecha de venta",
        "Comercio",
        "Legajo",
        "Ventas",
        "Monto bruto vendido",
        "Por bandera",
        "Estado",
      ];
      const lines = rows.map((r) => [
        parseDateLocal(r.fecha).toLocaleDateString("es-AR"),
        r.comercio_nombre ?? "—",
        r.comercio_legajo,
        r.ventas,
        Number(r.bruto).toFixed(2),
        Object.entries(r.por_bandera ?? {})
          .map(([b, v]) => `${b}: ${Number(v).toFixed(2)}`)
          .join(" | "),
        statusBatch(r),
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
      setExporting(false);
    }
  };

  const columns: Column<SaleDay>[] = [
    {
      key: "fecha",
      label: "Fecha de venta",
      hint: "Día en que se realizaron las compras en el comercio.",
      minWidth: 120,
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">
          {parseDateLocal(r.fecha).toLocaleDateString("es-AR")}
        </span>
      ),
    },
    {
      key: "comercio",
      label: "Comercio",
      hint: "Nombre de fantasía y legajo del cliente.",
      minWidth: 200,
      maxWidth: 320,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[180px]">
            {r.comercio_nombre ?? "—"}
          </div>
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
      render: (r) => (
        <span className="font-mono tabular-nums font-semibold">{formatMoney(Number(r.bruto))}</span>
      ),
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
              <span className="text-muted-foreground">{b}:</span>{" "}
              <span className="font-mono">{formatMoney(Number(v))}</span>
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
      render: (r) => (
        <Badge tone={statusBatch(r) === "Abierto" ? "warn" : "neutral"}>{statusBatch(r)}</Badge>
      ),
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
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
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
              <Store
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <select
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full sm:min-w-[160px] h-8 pl-8 pr-2 rounded-md border bg-background text-xs"
              >
                <option value="">Todas</option>
                {brands.map((b) => (
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
              value={merchantFilter}
              onChange={(e) => {
                setMerchantFilter(e.target.value);
                setPage(0);
              }}
              className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              {merchantsOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercio ?? c.usuario} · {c.legajo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Desde</Label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label>Hasta</Label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <BtnOutline onClick={exportar} disabled={exporting || isLoading}>
            <Download size={16} />
            {exporting ? "Exportando…" : "Descargar CSV"}
          </BtnOutline>
        </div>
      </Card>

      {isLoading ? (
        <LoadingBlock label="Cargando lotes de venta…" />
      ) : isError ? (
        <StatusMessage kind="error" message={err?.message ?? "Error"} onRetry={() => refetch()} />
      ) : batches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay lotes de venta que coincidan con los filtros.</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={batches}
            keyExtractor={(r) => `${r.comercio_id}-${r.fecha}`}
            hidePagination
            showGlobalFilter={false}
            showDownloadButton={false}
            actions={(r) => (
              <button
                type="button"
                onClick={() => setDetail(r)}
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

      {detail && <DetailBatchModal lote={detail} onClose={() => setDetail(null)} />}
    </PermissionGuard>
  );
}
