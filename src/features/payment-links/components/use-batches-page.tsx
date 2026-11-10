import { batchRowActions, BatchRowButton, type BatchRowHandlers } from "./batch-row-actions";
import { BATCH_COLUMNS, SUMMARY_COLUMNS } from "./batches-columns";
import { batchesToCsvLines } from "@/features/payment-links/batches-csv";
import { summarizeBatchesByMerchant } from "@/features/payment-links/batches-summary.rules";
import { downloadBlob } from "@/shared/lib/download";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { type BatchCredit, type StatusBatch } from "@/infrastructure/supabase/legacy/types";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useMerchants } from "@/features/merchants/merchants.hooks";
import {
  exportBatchesCredit,
  getBatch,
  listBatches,
  summaryBatches,
} from "@/features/payment-links/batches.supabase";
import { listBrands } from "@/features/merchants/card-brands.supabase";
import { toast } from "sonner";
import { QK_ACRED } from "@/features/payment-links/credits.supabase";
import { isAppError, userMessage } from "@/shared/lib/errors";
import { route } from "@/features/payment-links/batches.rules";
import { type SummaryMerchant } from "@/features/payment-links/batches.types";

/** Estado y acciones de BatchesPage: el componente solo dibuja. */
export function useBatchesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search_ = route.useSearch();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusBatch | "">("");
  const [brandFilter, setBrandFilter] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState<"lotes" | "resumen">("lotes");
  const [detail, setDetail] = useState<BatchCredit | null>(null);
  const [merchantDetail, setMerchantDetail] = useState<SummaryMerchant | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string } | null>(null);
  // Cargar CSV: null = cerrado. Si trae `lote`, modo per-lote; si no, modo general.
  const [loadCsv, setLoadCsv] = useState<{ lote: BatchCredit | null } | null>(null);
  const [simulateCc, setSimulateCc] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [confirmCredit, setConfirmCredit] = useState<BatchCredit | null>(null);
  const [exporting, setExporting] = useState(false);
  const { can } = useCan();
  const canGestionar = can("modificar", "comercios");

  const { rows: merchantsOptions } = useMerchants({ page: 0, pageSize: 100 });

  // ?lote=<uuid>: abre el detalle (lo usan Ejecucion masiva, Contracargos y Lotes de venta).
  useEffect(() => {
    if (!search_.lote) return;
    let vivo = true;
    getBatch(search_.lote)
      .then((l) => vivo && l && setDetail(l))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [search_.lote]);

  // Banderas dinámicas desde el catálogo (no hardcodeadas). Si la
  // tabla no existe / falla, se cae al set de fallback que tenía la
  // pantalla vieja.
  const { data: brandsCatalog } = useQuery({
    queryKey: ["banderas", "Activo"],
    queryFn: () => listBrands("Activo"),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const optionsBrand = (brandsCatalog ?? []).map((b) => b.nombre);

  const filters = {
    page,
    pageSize,
    search: search || undefined,
    estado: statusFilter || undefined,
    bandera: brandFilter || undefined,
    comercioId: merchantFilter || undefined,
    fechaDesde: dateFrom || undefined,
    fechaHasta: dateTo || undefined,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["lotes", filters],
    queryFn: () => listBatches(filters),
  });

  const batches = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // KPIs. Se invalidan junto con ["lotes", ...] al hacer cualquier
  // mutación, así que las cards se refrescan solas.
  const summaryQuery = useQuery({
    queryKey: ["lotes-resumen", dateFrom, dateTo],
    queryFn: () =>
      summaryBatches({ fechaDesde: dateFrom || undefined, fechaHasta: dateTo || undefined }),
  });
  const summary = summaryQuery.data;

  const summaryData = useMemo(() => summarizeBatchesByMerchant(batches), [batches]);

  const onSubirCsv = (batch: BatchCredit) => {
    if (!canGestionar) return;
    setDetail(null);
    setLoadCsv({ lote: batch });
  };

  const handleCsvCargado = (r: { aplicados: number; sinMatch: number }) => {
    if (r.aplicados > 0) {
      toast.success(
        `${r.aplicados} lote(s) del archivo quedaron Pendiente.${r.sinMatch > 0 ? ` ${r.sinMatch} renglón(es) fueron a Excepciones.` : ""} Falta conciliar con la recaudadora para poder acreditar.`,
      );
    } else {
      toast.warning(
        `Ningún renglón se pudo asignar a un comercio.${r.sinMatch > 0 ? ` ${r.sinMatch} quedaron en Excepciones.` : ""}`,
      );
    }
    queryClient.invalidateQueries({ queryKey: QK_ACRED });
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-detalle"] });
    setLoadCsv(null);
  };

  const handleCredited = () => {
    toast.success(`Lote ${confirmCredit?.codigo ?? ""} acreditado`);
    queryClient.invalidateQueries({ queryKey: QK_ACRED });
    queryClient.invalidateQueries({ queryKey: ["lotes"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["lotes-detalle"] });
    queryClient.invalidateQueries({ queryKey: ["lote-detalle-recalculado"] });
    queryClient.invalidateQueries({ queryKey: ["lote-movimientos"] });
    setConfirmCredit(null);
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = await exportBatchesCredit({
        search: search || undefined,
        estado: statusFilter || undefined,
        bandera: brandFilter || undefined,
        comercioId: merchantFilter || undefined,
        fechaDesde: dateFrom || undefined,
        fechaHasta: dateTo || undefined,
      });
      if (rows.length === 0) {
        toast.warning("No hay lotes para exportar con esos filtros.");
        return;
      }
      const csv = "\uFEFF" + batchesToCsvLines(rows).join("\r\n");
      downloadBlob(
        `lotes_acreditacion_${new Date().toISOString().slice(0, 10)}.csv`,
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      toast.success(`${rows.length} lotes exportados.`);
    } catch (e) {
      toast.error(`Error al exportar: ${userMessage(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const rowHandlers: BatchRowHandlers = {
    canManage: canGestionar,
    onDetail: setDetail,
    onUploadCsv: onSubirCsv,
    onCredit: (batch) => {
      setDetail(null);
      setConfirmCredit(batch);
    },
    onReconcile: (batch) =>
      void navigate({
        to: "/admin/comercios/link-pago/acreditaciones",
        search: { fecha: batch.fecha },
      }),
    onChargeback: () => void navigate({ to: "/admin/comercios/link-pago/contracargos" }),
  };
  const getActions = (r: BatchCredit) => batchRowActions(r, rowHandlers);
  const buttonAction = (r: BatchCredit) => <BatchRowButton r={r} h={rowHandlers} />;

  const err = isAppError(error) ? error : null;
  return {
    navigate,
    search_,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    brandFilter,
    setBrandFilter,
    merchantFilter,
    setMerchantFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    tab,
    setTab,
    detail,
    setDetail,
    merchantDetail,
    setMerchantDetail,
    confirm,
    setConfirm,
    loadCsv,
    setLoadCsv,
    simulateCc,
    setSimulateCc,
    testOpen,
    setTestOpen,
    confirmCredit,
    setConfirmCredit,
    exporting,
    canGestionar,
    merchantsOptions,
    optionsBrand,
    filters,
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    batches,
    total,
    totalPages,
    summary,
    summaryData,
    onSubirCsv,
    handleCsvCargado,
    handleCredited,
    exportCsv,
    getActions,
    buttonAction,
    columns: BATCH_COLUMNS,
    summaryColumns: SUMMARY_COLUMNS,
    err,
  };
}

export type BatchesPageVm = ReturnType<typeof useBatchesPage>;
