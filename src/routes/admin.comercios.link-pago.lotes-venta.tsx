import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, AlertTriangle, Inbox, Calendar, Store, Receipt } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, Card, Input, Label } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useQuery } from "@tanstack/react-query";
import { listLotesVenta } from "@/lib/api/lotes-venta";
import { useComercios } from "@/hooks/useComercios";
import type { LoteVenta } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes-venta")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Lotes de Venta — Links de Pago — Admin — Moli" },
      { name: "description", content: "Vista de lotes de venta agregados por comercio, bandera y fecha." },
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

function Page() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [banderaFilter, setBanderaFilter] = useState("");
  const [comercioFilter, setComercioFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 100 });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["lotes-venta", page, pageSize, search, banderaFilter, comercioFilter, fechaDesde, fechaHasta],
    queryFn: () => listLotesVenta({
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

  const columns: Column<LoteVenta>[] = [
    { key: "fecha", label: "Fecha", minWidth: 120, render: (r) => <span className="font-mono text-xs tabular-nums">{parseDateLocal(r.fecha).toLocaleDateString("es-AR")}</span> },
    { key: "comercio", label: "Comercio / Legajo", minWidth: 200, maxWidth: 320, render: (r) => <div><div className="font-semibold text-sm truncate max-w-[160px]">{r.comercio?.nombreComercio ?? r.comercio?.usuario ?? "—"}</div><div className="font-mono text-xs text-muted-foreground">{r.comercio?.legajo ?? r.comercioId}</div></div> },
    { key: "bandera", label: "Bandera", minWidth: 100, render: (r) => <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/50">{r.bandera}</span> },
    { key: "cantidadOperaciones", label: "Ops", minWidth: 80, render: (r) => <span className="font-mono tabular-nums">{r.cantidadOperaciones}</span> },
    { key: "importeBruto", label: "Bruto", minWidth: 130, render: (r) => <span className="font-mono tabular-nums">{fmt(r.importeBruto)}</span> },
    { key: "impuestos", label: "Impuestos", minWidth: 120, render: (r) => <span className="font-mono tabular-nums text-red-600">- {fmt(r.impuestos)}</span> },
    { key: "comision", label: "Comisión", minWidth: 120, render: (r) => <span className="font-mono tabular-nums text-red-600">- {fmt(r.comision)}</span> },
    { key: "importeNeto", label: "Neto", minWidth: 130, render: (r) => <span className="font-mono tabular-nums font-semibold text-emerald-700">{fmt(r.importeNeto)}</span> },
  ];

  const err = error as Error | null;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Lotes de Venta" description="Vista agregada de movimientos por comercio, bandera y fecha (desde v_lotes_venta)." />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <Label>Buscar</Label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Bandera..." className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label>Bandera</Label>
            <select value={banderaFilter} onChange={(e) => { setBanderaFilter(e.target.value); setPage(0); }} className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs">
              <option value="">Todas</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">Amex</option>
              <option value="Cabal">Cabal</option>
              <option value="Diners">Diners</option>
            </select>
          </div>
          <div>
            <Label>Comercio</Label>
            <select value={comercioFilter} onChange={(e) => { setComercioFilter(e.target.value); setPage(0); }} className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border bg-background text-xs">
              <option value="">Todos</option>
              {comerciosOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.nombreComercio ?? c.usuario} · {c.legajo}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPage(0); }} className="h-8 text-xs" />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPage(0); }} className="h-8 text-xs" />
          </div>
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
          <button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button>
        </div>
      ) : lotes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay lotes de venta que coincidan con los filtros.</p>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={lotes} keyExtractor={(r) => `${r.comercioId}-${r.bandera}-${r.fecha}`} hidePagination showGlobalFilter={false} />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{total} registros · </span>
              <span className="text-muted-foreground whitespace-nowrap">Filas por página:</span>
              <select
                className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs outline-none focus:ring-2 focus:ring-ring/40"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              >
                {PAGE_SIZES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-muted-foreground text-xs sm:text-sm">Pág. {page + 1} de {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Anterior</button>
                <button disabled={page + 1 >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          </div>
        </>
      )}
    </PermissionGuard>
  );
}
