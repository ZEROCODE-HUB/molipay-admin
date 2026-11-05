import { StatusMessage } from "@/shared/ui/status-message";
import {
salesDelDay,
type SaleDay,
type SaleDetail,
} from "@/features/payment-links/credits.supabase";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { formatMoney } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { Inbox,Search } from "lucide-react";
import { Input } from "@/shared/ui/form-controls";
import { Pagination } from "@/shared/ui/pagination";
import { PAGE_SIZES,fmtDateTime,statusBatch } from "@/features/payment-links/sale-batches.rules";
import { parseDateLocal } from "@/features/payment-links/batches.rules";

// ============================ Detalle del lote ============================

export function DetailBatchModal({ lote: batch, onClose }: { lote: SaleDay; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["lote-venta-ops", batch.comercio_id, batch.fecha],
    queryFn: () => salesDelDay(batch.comercio_id, batch.fecha),
  });

  const filtradas = (data ?? []).filter((v) => {
    const q = search.trim().toLowerCase();
    return !q || v.id_txn.toLowerCase().includes(q) || (v.bandera ?? "").toLowerCase().includes(q);
  });
  const total = filtradas.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const ops = filtradas.slice(page * pageSize, page * pageSize + pageSize);

  const columns: Column<SaleDetail>[] = [
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
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">
          {r.bandera ?? "—"}
        </span>
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
      render: (r) => (
        <span className="font-mono tabular-nums">{formatMoney(Number(r.monto_operacion))}</span>
      ),
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
            {r.lote.origen === "venta"
              ? ` (est. ${parseDateLocal(r.lote.fecha).toLocaleDateString("es-AR")})`
              : ""}
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
      description={`${parseDateLocal(batch.fecha).toLocaleDateString("es-AR")} · ${batch.comercio_nombre ?? "—"} · ${batch.comercio_legajo} · ${statusBatch(batch)}`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Ventas</div>
            <div className="font-mono font-semibold text-lg">{batch.ventas}</div>
          </div>
          <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <div className="text-xs text-muted-foreground">Monto bruto vendido</div>
            <div className="font-mono font-semibold text-lg text-emerald-700">
              {formatMoney(Number(batch.bruto))}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
            <div className="text-xs text-muted-foreground">Por bandera</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(batch.por_bandera ?? {}).map(([b, v]) => (
                <span key={b} className="text-sm">
                  <span className="text-muted-foreground">{b}:</span>{" "}
                  <span className="font-mono font-semibold">{formatMoney(Number(v))}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative max-w-sm">
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
          <StatusMessage
            kind="error"
            message="No se pudieron cargar las operaciones del lote."
            onRetry={() => refetch()}
          />
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
