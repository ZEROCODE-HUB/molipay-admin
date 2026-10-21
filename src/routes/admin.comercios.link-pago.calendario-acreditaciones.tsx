import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Wallet,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Banknote,
  TrendingUp,
  MinusCircle,
  CheckCircle2,
  Clock,
  ArrowDownCircle,
  Zap,
  CalendarDays,
  Filter,
  Building2,
  Download,
} from "lucide-react";
import { PageHeader, Badge, Card, Label } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listCalendarioAcreditaciones,
  getResumenSaldosCalendario,
  getAdelantosPorDia,
  getExportDia,
  getMinMontoAdelanto,
  type CalendarioAcreditacion,
  type EstadoCalendario,
  type ResumenSaldos,
  type AdelantoParaCalendario,
  type ExportDiaRow,
} from "@/lib/api/calendario-acreditaciones";
import { useComercios } from "@/hooks/useComercios";
import { requireSupabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute(
  "/admin/comercios/link-pago/calendario-acreditaciones",
)({
  component: Page,
  head: () => ({
    meta: [
      { title: "Calendario de Acreditaciones — Links de Pago — Admin — Moli" },
      {
        name: "description",
        content:
          "Vista calendarizada de cuándo se acreditarán los lotes con KPIs de saldos y adelantos.",
      },
    ],
  }),
});

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ESTADO_COLORS: Record<
  EstadoCalendario,
  { bg: string; text: string; label: string; border: string }
> = {
  programado: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
    label: "Programado",
  },
  pendiente: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-300",
    label: "Pendiente",
  },
  acreditado: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-300",
    label: "Acreditado",
  },
  contracargo: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
    label: "Contracargo",
  },
  cancelado: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
    label: "Cancelado",
  },
};

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fechaCorta(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

// ============================================================================
// Modal de detalle del día
// ============================================================================

function DiaDetalleModal({
  fecha,
  items,
  onClose,
  minMonto,
}: {
  fecha: string;
  items: CalendarioAcreditacion[];
  onClose: () => void;
  minMonto: number;
}) {
  const navigate = useNavigate();
  const fechaFormateada = parseDateLocal(fecha).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Una sola query al backend trae los adelantos del comercio. La UI los
  // muestra como sub-tabla y como banner amarillo si hay alguno aprobado.
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  // Traemos los adelantos del comercio más representativo del día
  // (en general todos los items del día son del mismo comercio, pero
  // puede haber varios). Hacemos un map por comercioId.
  const comerciosDelDia = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(it.comercioId);
    return Array.from(set);
  }, [items]);

  const { data: adelantosPorComercio } = useQuery({
    queryKey: ["calendario-adelantos-dia", fecha, comerciosDelDia],
    queryFn: async () => {
      const out: Record<string, AdelantoParaCalendario[]> = {};
      for (const id of comerciosDelDia) {
        out[id] = await getAdelantosPorDia(id, fecha);
      }
      return out;
    },
  });

  const totalBruto = items.reduce((s, i) => s + i.importeBruto, 0);
  const totalNeto = items.reduce((s, i) => s + i.importeNeto, 0);
  const totalAdelantos = items.reduce(
    (s, i) => s + (i.adelantosReservadosTotal ?? 0),
    0,
  );

  // Por comercio del día, ¿hay adelanto aprobado?
  const tieneAdelantoAprobado = (comercioId: string): boolean => {
    const adels = adelantosPorComercio?.[comercioId] ?? [];
    return adels.some(
      (a) => a.estado === "Aprobado" || a.estado === "Pendiente",
    );
  };

  const irAAdelantos = (comercioId: string, adelantoId?: string) => {
    const search: Record<string, string> = { comercio: comercioId };
    if (adelantoId) search.adelanto = adelantoId;
    void navigate({
      to: "/admin/comercios/link-pago/adelantos",
      search,
    } as never);
  };

  const onExport = async (formato: "xlsx" | "pdf") => {
    setExporting(formato);
    try {
      const comercioId = comerciosDelDia.length === 1 ? comerciosDelDia[0] : null;
      const rows = await getExportDia(fecha, comercioId);
      if (rows.length === 0) {
        toast.error("No hay filas para exportar");
        return;
      }
      if (formato === "xlsx") exportExcel(fechaFormateada, rows);
      else exportPdf(fechaFormateada, rows);
      toast.success(`Exportación ${formato.toUpperCase()} lista`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <CalendarDays size={18} /> {fechaFormateada}
              </h3>
              <p className="text-sm text-muted-foreground">
                {items.length} lote{items.length !== 1 ? "s" : ""} · {items.reduce(
                  (s, i) => s + i.cantidadOperaciones,
                  0,
                )} operaciones
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExport("xlsx")}
                disabled={exporting !== null}
                className="h-8 px-3 rounded-md border bg-card text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted disabled:opacity-50"
              >
                {exporting === "xlsx" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={12} />
                )}
                Excel
              </button>
              <button
                onClick={() => onExport("pdf")}
                disabled={exporting !== null}
                className="h-8 px-3 rounded-md border bg-card text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted disabled:opacity-50"
              >
                {exporting === "pdf" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <FileText size={12} />
                )}
                PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-muted rounded-md"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Resumen del día */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">Total bruto</div>
              <div className="font-mono font-semibold text-base">{fmt(totalBruto)}</div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">Total neto</div>
              <div className="font-mono font-semibold text-base text-emerald-700">
                {fmt(totalNeto)}
              </div>
            </div>
            <div className="rounded-md border bg-amber-50 border-amber-200 px-3 py-2">
              <div className="text-amber-700">Adelantos reservados</div>
              <div className="font-mono font-semibold text-base text-amber-700">
                {fmt(totalAdelantos)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {items.map((it) => {
            const color = ESTADO_COLORS[it.estadoCalculado] ?? ESTADO_COLORS.pendiente;
            const tieneAd = tieneAdelantoAprobado(it.comercioId);
            const adelantosComercio = adelantosPorComercio?.[it.comercioId] ?? [];
            const netoDespuesAdelantos = Math.max(
              it.importeNeto - (it.adelantosAplicadosDia ?? 0),
              0,
            );
            const comisionCierrePct = it.importeBruto > 0
              ? (it.comisionCierreLoteMonto / it.importeBruto) * 100
              : 0;

            return (
              <Card key={it.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 size={16} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {it.comercioNombre}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {it.comercioLegajo} · {it.bandera} · {it.codigo}
                      </div>
                    </div>
                  </div>
                  <Badge className={`${color.bg} ${color.text}`}>{color.label}</Badge>
                </div>

                {/* Banner amarillo: si hay adelanto aprobado/pendiente */}
                {tieneAd && (
                  <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-700">
                      <AlertTriangle size={12} /> Adelanto comprometido
                    </div>
                    <div className="text-amber-700 mt-1">
                      {adelantosComercio
                        .filter((a) => a.estado !== "Acreditado" && a.estado !== "Rechazado" && a.estado !== "Cancelado")
                        .map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => irAAdelantos(it.comercioId, a.id)}
                            className="block w-full text-left hover:underline"
                          >
                            {a.estado} · {fmt(a.montoPorAcreditar ?? a.montoSolicitado)} · Tkt #
                            {a.id.slice(0, 8).toUpperCase()}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Tabla de desglose */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1 font-medium">Concepto</th>
                        <th className="text-right py-1 font-medium">Importe</th>
                        <th className="text-right py-1 font-medium">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr>
                        <td className="py-1">Importe bruto del lote</td>
                        <td className="text-right">{fmt(it.importeBruto)}</td>
                        <td className="text-right text-muted-foreground">
                          {it.cantidadOperaciones} ops
                        </td>
                      </tr>
                      <tr className="text-red-600">
                        <td className="py-1">
                          (-) Comisión MoliPay ({it.tasaMolipayPct.toFixed(2)}%)
                        </td>
                        <td className="text-right">-{fmt(it.tasaMolipayMonto)}</td>
                        <td className="text-right" />
                      </tr>
                      <tr className="text-red-600">
                        <td className="py-1">
                          (-) Comisión PayWay ({it.tasaPaywayPct.toFixed(2)}%)
                        </td>
                        <td className="text-right">-{fmt(it.tasaPaywayMonto)}</td>
                        <td className="text-right" />
                      </tr>
                      <tr className="text-red-600">
                        <td className="py-1">
                          (-) Comisión cierre de lote ({comisionCierrePct.toFixed(2)}%)
                        </td>
                        <td className="text-right">-{fmt(it.comisionCierreLoteMonto)}</td>
                        <td className="text-right" />
                      </tr>
                      <tr className="text-red-600">
                        <td className="py-1">(-) Impuestos</td>
                        <td className="text-right">-{fmt(it.impuestos)}</td>
                        <td className="text-right" />
                      </tr>
                      {it.contracargoMonto > 0 && (
                        <tr className="text-red-600">
                          <td className="py-1">(-) Contracargo</td>
                          <td className="text-right">-{fmt(it.contracargoMonto)}</td>
                          <td className="text-right" />
                        </tr>
                      )}
                      {it.adelantosAplicadosDia > 0 && (
                        <tr className="text-amber-700">
                          <td className="py-1">
                            (-) Adelanto aplicado a este día
                          </td>
                          <td className="text-right">-{fmt(it.adelantosAplicadosDia)}</td>
                          <td className="text-right" />
                        </tr>
                      )}
                      <tr className="border-t-2 font-semibold">
                        <td className="py-1.5">= Neto a depositar</td>
                        <td className="text-right text-emerald-700">
                          {fmt(netoDespuesAdelantos)}
                        </td>
                        <td className="text-right" />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Acciones */}
                {it.estadoCalculado === "programado" && !tieneAd && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-end gap-2">
                    <span className="text-xs text-muted-foreground mr-auto">
                      {netoDespuesAdelantos < minMonto
                        ? `Remanente < ${fmt(minMonto)} (cupo agotado)`
                        : "100% disponible para adelanto"}
                    </span>
                    <button
                      type="button"
                      onClick={() => irAAdelantos(it.comercioId)}
                      disabled={netoDespuesAdelantos < minMonto}
                      className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Zap size={12} /> Adelantar
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export helpers
// ============================================================================

function exportExcel(fechaTitulo: string, rows: ExportDiaRow[]) {
  const wb = XLSX.utils.book_new();
  const data = rows.map((r) => ({
    Lote: r.codigo,
    Comercio: r.nombreComercio ?? "—",
    Legajo: r.legajo,
    Bandera: r.bandera,
    Estado: r.estado,
    Operaciones: r.cantidadOperaciones,
    "Importe bruto": r.importeBruto,
    "Comisión MoliPay": r.tasaMolipayMonto,
    "Comisión PayWay": r.tasaPaywayMonto,
    "Comisión cierre lote": r.comisionCierreLoteMonto,
    Impuestos: r.impuestos,
    Contracargo: r.contracargoMonto,
    "Importe neto": r.importeNeto,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, fechaTitulo.slice(0, 30));
  const safe = fechaTitulo.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
  XLSX.writeFile(wb, `calendario_${safe}.xlsx`);
}

function exportPdf(fechaTitulo: string, rows: ExportDiaRow[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`Calendario de Acreditaciones — ${fechaTitulo}`, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [
      [
        "Lote",
        "Comercio",
        "Bandera",
        "Estado",
        "Ops",
        "Bruto",
        "MoliPay",
        "PayWay",
        "Cierre",
        "Impuestos",
        "Contracargo",
        "Neto",
      ],
    ],
    body: rows.map((r) => [
      r.codigo,
      r.nombreComercio ?? "—",
      r.bandera,
      r.estado,
      String(r.cantidadOperaciones),
      fmt(r.importeBruto),
      fmt(r.tasaMolipayMonto),
      fmt(r.tasaPaywayMonto),
      fmt(r.comisionCierreLoteMonto),
      fmt(r.impuestos),
      fmt(r.contracargoMonto),
      fmt(r.importeNeto),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [33, 37, 41] },
  });
  const safe = fechaTitulo.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
  doc.save(`calendario_${safe}.pdf`);
}

// ============================================================================
// Page
// ============================================================================

function Page() {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [anio, setAnio] = useState(today.getFullYear());
  const [comercioFilter, setComercioFilter] = useState("");
  const [banderaFilter, setBanderaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoCalendario | "">("");
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<CalendarioAcreditacion[]>([]);
  const [minMonto, setMinMonto] = useState<number>(100);
  const qc = useQueryClient();

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 200 });

  // Traemos el monto mínimo de una sola vez al montar (configurable).
  useEffect(() => {
    let alive = true;
    getMinMontoAdelanto()
      .then((v) => {
        if (alive) setMinMonto(v);
      })
      .catch(() => {
        /* fallback ya es 100 */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Resumen de saldos (cambia con el filtro de comercio)
  const { data: resumen, isLoading: loadingResumen } = useQuery<ResumenSaldos>({
    queryKey: ["calendario-resumen", comercioFilter || null],
    queryFn: () => getResumenSaldosCalendario(comercioFilter || null),
    staleTime: 30_000,
  });

  // Calendario del mes
  const { data: acreditaciones, isLoading } = useQuery<CalendarioAcreditacion[]>({
    queryKey: [
      "calendario-acreditaciones",
      mes,
      anio,
      comercioFilter,
      banderaFilter,
      estadoFilter,
    ],
    queryFn: () =>
      listCalendarioAcreditaciones({
        mes,
        anio,
        comercioId: comercioFilter || undefined,
        bandera: banderaFilter || undefined,
        estado: estadoFilter || undefined,
      }),
    staleTime: 60_000,
  });

  // Realtime: cualquier cambio en lotes o adelantos invalida el calendario.
  useEffect(() => {
    const sb = requireSupabase();
    if (!sb) return;
    const ch = sb
      .channel("realtime-calendario-acreditaciones")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lotes_acreditacion" },
        () => {
          qc.invalidateQueries({ queryKey: ["calendario-acreditaciones"] });
          qc.invalidateQueries({ queryKey: ["calendario-resumen"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "adelantos" },
        () => {
          qc.invalidateQueries({ queryKey: ["calendario-acreditaciones"] });
          qc.invalidateQueries({ queryKey: ["calendario-resumen"] });
          qc.invalidateQueries({ queryKey: ["calendario-adelantos-dia"] });
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [qc]);

  // Días del mes en grilla 7×N
  const diasDelMes = useMemo(() => {
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    const dias: { fecha: Date; esActual: boolean; esPasado: boolean; esOtroMes: boolean }[] = [];
    let diaSemana = primerDia.getDay();
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;
    for (let i = diaSemana - 1; i >= 0; i--) {
      dias.push({ fecha: new Date(anio, mes - 1, -i), esActual: false, esPasado: false, esOtroMes: true });
    }
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(anio, mes - 1, d);
      const esHoy =
        d === today.getDate() && mes === today.getMonth() + 1 && anio === today.getFullYear();
      dias.push({
        fecha,
        esActual: esHoy,
        esPasado: fecha < today && !esHoy,
        esOtroMes: false,
      });
    }
    const restante = 7 - (dias.length % 7);
    if (restante < 7) {
      for (let i = 1; i <= restante; i++) {
        dias.push({ fecha: new Date(anio, mes, i), esActual: false, esPasado: false, esOtroMes: true });
      }
    }
    return dias;
  }, [mes, anio]);

  // Indexar por fecha de acreditación
  const acreditacionesPorFecha = useMemo(() => {
    const map = new Map<string, CalendarioAcreditacion[]>();
    for (const a of acreditaciones ?? []) {
      const key = a.fechaAcreditacion;
      const existing = map.get(key) ?? [];
      existing.push(a);
      map.set(key, existing);
    }
    return map;
  }, [acreditaciones]);

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAnio(anio - 1);
    } else setMes(mes - 1);
  };
  const mesSiguiente = () => {
    if (mes === 12) {
      setMes(1);
      setAnio(anio + 1);
    } else setMes(mes + 1);
  };
  const nombreMes = new Date(anio, mes - 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const handleDiaClick = (fechaKey: string) => {
    const items = acreditacionesPorFecha.get(fechaKey) ?? [];
    if (items.length > 0) {
      setSelectedFecha(fechaKey);
      setSelectedItems(items);
    }
  };

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Calendario de Acreditaciones"
        description="Cuándo se acredita cada lote y cuánto tenés disponible para nuevos adelantos."
      />

      {/* Header de saldos (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Falta cobrar"
          subtitle="Ventas sin lote aún"
          amount={resumen?.faltaCobrar ?? 0}
          icon={<Clock size={14} />}
          tone="neutral"
          loading={loadingResumen}
        />
        <KpiCard
          label="Por acreditar"
          subtitle="Lotes no Acreditados"
          amount={resumen?.porAcreditar ?? 0}
          icon={<Banknote size={14} />}
          tone="info"
          loading={loadingResumen}
        />
        <KpiCard
          label="Adelantos en curso"
          subtitle="Pendiente + Aprobado"
          amount={resumen?.adelantosEnCurso ?? 0}
          icon={<MinusCircle size={14} />}
          tone="warn"
          loading={loadingResumen}
        />
        <KpiCard
          label="Disponible real"
          subtitle="Por acreditar − en curso"
          amount={resumen?.disponibleReal ?? 0}
          icon={<TrendingUp size={14} />}
          tone="success"
          loading={loadingResumen}
        />
      </div>

      {/* Toolbar */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={mesAnterior}
              className="h-8 w-8 rounded-md border bg-card hover:bg-muted flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold min-w-[160px] text-center capitalize">
              {nombreMes}
            </span>
            <button
              onClick={mesSiguiente}
              className="h-8 w-8 rounded-md border bg-card hover:bg-muted flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => {
                setMes(today.getMonth() + 1);
                setAnio(today.getFullYear());
              }}
              className="h-8 px-3 rounded-md border bg-card hover:bg-muted text-xs font-medium"
            >
              Hoy
            </button>
          </div>
          <div>
            <Label>Comercio</Label>
            <select
              value={comercioFilter}
              onChange={(e) => setComercioFilter(e.target.value)}
              className="h-8 px-2 rounded-md border bg-background text-xs min-w-[180px]"
            >
              <option value="">Todos los comercios</option>
              {comerciosOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercio ?? c.usuario} · {c.legajo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Bandera</Label>
            <select
              value={banderaFilter}
              onChange={(e) => setBanderaFilter(e.target.value)}
              className="h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todas</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">Amex</option>
              <option value="Cabal">Cabal</option>
              <option value="Diners">Diners</option>
            </select>
          </div>
          <div>
            <Label>Estado</Label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as EstadoCalendario | "")}
              className="h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              <option value="programado">Programado</option>
              <option value="pendiente">Pendiente</option>
              <option value="acreditado">Acreditado</option>
              <option value="contracargo">Contracargo</option>
            </select>
          </div>
          {(comercioFilter || banderaFilter || estadoFilter) && (
            <button
              type="button"
              onClick={() => {
                setComercioFilter("");
                setBanderaFilter("");
                setEstadoFilter("");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Grilla del calendario */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin mr-2" />
          Cargando calendario…
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="p-2 text-center text-xs font-semibold text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {diasDelMes.map((dia, idx) => {
              const fechaKey = dia.fecha.toISOString().slice(0, 10);
              const items = acreditacionesPorFecha.get(fechaKey) ?? [];
              const tieneItems = items.length > 0;
              const totalBruto = items.reduce((s, i) => s + i.importeBruto, 0);
              const totalAdelantos = items.reduce(
                (s, i) => s + (i.adelantosAplicadosDia ?? 0),
                0,
              );
              const netoDespuesAdelantos = Math.max(
                items.reduce((s, i) => s + i.importeNeto, 0) - totalAdelantos,
                0,
              );
              const tieneAdelanto = totalAdelantos > 0;
              const cupoAgotado = tieneAdelanto && netoDespuesAdelantos < minMonto;

              // Si hay filtro de estado, opacamos los días que no matchean
              if (estadoFilter && !items.some((i) => i.estadoCalculado === estadoFilter)) {
                return (
                  <div
                    key={idx}
                    className="min-h-[120px] border-b border-r p-2 bg-muted/10 opacity-50"
                  >
                    <div className="text-sm font-semibold text-muted-foreground">
                      {dia.fecha.getDate()}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => tieneItems && handleDiaClick(fechaKey)}
                  disabled={!tieneItems}
                  className={`text-left min-h-[120px] border-b border-r p-2 transition-colors ${
                    !dia.esOtroMes
                      ? dia.esPasado
                        ? "bg-green-50/30 hover:bg-green-50/50"
                        : "hover:bg-muted/30"
                      : "bg-muted/30 text-muted-foreground"
                  } ${dia.esActual ? "ring-2 ring-primary/30 bg-primary/5" : ""} ${
                    tieneItems ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-sm font-semibold ${
                        dia.esActual ? "text-primary" : ""
                      }`}
                    >
                      {fechaCorta(dia.fecha)}
                    </span>
                    {tieneItems && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {items.reduce((s, i) => s + i.cantidadOperaciones, 0)} ops
                      </span>
                    )}
                  </div>

                  {tieneItems && (
                    <div className="space-y-1">
                      <div className="font-mono text-sm font-semibold">
                        {fmt(totalBruto)}
                      </div>
                      {items.slice(0, 2).map((it) => {
                        const color = ESTADO_COLORS[it.estadoCalculado] ?? ESTADO_COLORS.pendiente;
                        return (
                          <div
                            key={it.id}
                            className={`text-[10px] p-1 rounded truncate ${color.bg} ${color.text}`}
                            title={`${it.comercioNombre} · ${it.bandera} · ${fmt(it.importeBruto)}`}
                          >
                            {it.bandera} · {it.comercioLegajo}
                          </div>
                        );
                      })}
                      {items.length > 2 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{items.length - 2} más
                        </div>
                      )}

                      {tieneAdelanto && (
                        <div className="mt-1 rounded bg-amber-100 border border-amber-300 px-1.5 py-1 text-[10px] text-amber-800">
                          <div className="font-semibold flex items-center gap-1">
                            <AlertTriangle size={10} /> Adelanto
                          </div>
                          <div className="font-mono">-{fmt(totalAdelantos)}</div>
                          <div className="font-mono">
                            Libre: {fmt(netoDespuesAdelantos)}
                          </div>
                          {cupoAgotado && (
                            <div className="text-red-700 font-semibold mt-0.5">
                              Cupo agotado
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(ESTADO_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${val.bg}`} />
            <span>{val.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          <span>Adelanto reservado</span>
        </div>
      </div>

      {selectedFecha && selectedItems.length > 0 && (
        <DiaDetalleModal
          fecha={selectedFecha}
          items={selectedItems}
          onClose={() => {
            setSelectedFecha(null);
            setSelectedItems([]);
          }}
          minMonto={minMonto}
        />
      )}
    </PermissionGuard>
  );
}

// ============================================================================
// KPI card
// ============================================================================

function KpiCard({
  label,
  subtitle,
  amount,
  icon,
  tone,
  loading,
}: {
  label: string;
  subtitle: string;
  amount: number;
  icon: React.ReactNode;
  tone: "neutral" | "info" | "warn" | "success";
  loading?: boolean;
}) {
  const toneClasses: Record<typeof tone, { card: string; text: string; icon: string }> = {
    neutral: {
      card: "bg-card",
      text: "text-foreground",
      icon: "text-muted-foreground bg-muted",
    },
    info: {
      card: "bg-card",
      text: "text-blue-700",
      icon: "text-blue-700 bg-blue-50",
    },
    warn: {
      card: "bg-card",
      text: "text-amber-700",
      icon: "text-amber-700 bg-amber-50",
    },
    success: {
      card: "bg-emerald-50/50 border-emerald-200",
      text: "text-emerald-700",
      icon: "text-emerald-700 bg-emerald-100",
    },
  };
  const t = toneClasses[tone];
  return (
    <Card className={`p-3 ${t.card}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${t.icon}`}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className={`font-mono text-xl font-semibold mt-1.5 ${t.text}`}>
        {loading ? (
          <span className="inline-block w-20 h-5 bg-muted animate-pulse rounded" />
        ) : (
          fmt(amount)
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
    </Card>
  );
}
