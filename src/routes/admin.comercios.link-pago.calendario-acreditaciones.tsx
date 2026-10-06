import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Store, X, Loader2 } from "lucide-react";
import { PageHeader, Badge, Card, Label } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useQuery } from "@tanstack/react-query";
import { listCalendarioAcreditaciones, getLotesPorFecha, type CalendarioAcreditacion } from "@/lib/api/calendario-acreditaciones";
import { useComercios } from "@/hooks/useComercios";

export const Route = createFileRoute("/admin/comercios/link-pago/calendario-acreditaciones")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Calendario de Acreditaciones — Links de Pago — Admin — Moli" },
      { name: "description", content: "Vista calendarizada de cuándo se acreditarán los lotes de venta." },
    ],
  }),
});

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ESTADO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  acreditado: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Acreditado" },
  programado: { bg: "bg-blue-100", text: "text-blue-700", label: "Programado" },
  pendiente: { bg: "bg-amber-100", text: "text-amber-700", label: "Pendiente" },
  contracargo: { bg: "bg-red-100", text: "text-red-700", label: "Contracargo" },
};

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function DiaDetalleModal({ fecha, items, onClose }: { fecha: string; items: CalendarioAcreditacion[]; onClose: () => void }) {
  const totalBruto = items.reduce((sum, i) => sum + i.importeBruto, 0);
  const totalOps = items.reduce((sum, i) => sum + i.cantidadOperaciones, 0);
  const fechaFormateada = parseDateLocal(fecha).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const { data: lotesDetalle, isLoading } = useQuery({
    queryKey: ["lotes-detalle", fecha],
    queryFn: () => getLotesPorFecha(fecha),
  });

  const itemsConDetalle = useMemo(() => {
    if (!lotesDetalle) return items.map(i => ({ ...i, lote: null }));
    return items.map(item => {
      const lote = lotesDetalle.find(l => 
        l.comercioId === item.comercioId && 
        l.bandera === item.bandera
      );
      return { ...item, lote };
    });
  }, [items, lotesDetalle]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de Acreditación</h3>
            <p className="text-sm text-muted-foreground capitalize">{fechaFormateada}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="text-sm font-semibold">{fmt(totalBruto)}</div>
              <div className="text-xs text-muted-foreground">{totalOps} ops · {items.length} lote{items.length !== 1 ? "s" : ""}</div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && itemsConDetalle.map((item) => {
            const color = ESTADO_COLORS[item.estado] ?? ESTADO_COLORS.pendiente;
            return (
              <Card key={`${item.comercioId}-${item.bandera}`} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-sm">{item.comercioNombre}</div>
                      <div className="text-xs text-muted-foreground">{item.comercioLegajo}</div>
                    </div>
                  </div>
                  <Badge className={`${color.bg} ${color.text}`}>{color.label}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Bandera</div>
                    <div className="font-medium">{item.bandera}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Operaciones</div>
                    <div className="font-medium">{item.cantidadOperaciones}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fecha Venta</div>
                    <div className="font-medium text-xs">{parseDateLocal(item.fechaVenta).toLocaleDateString("es-AR")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Días Hábiles</div>
                    <div className="font-medium text-xs">{item.diasHabiles}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Importe Bruto</div>
                    <div className="font-mono font-medium">{fmt(item.importeBruto)}</div>
                  </div>
                  {item.lote && (
                    <>
                      <div>
                        <div className="text-xs text-muted-foreground">Tasa MoliPay</div>
                        <div className="font-mono text-xs">-{fmt(item.lote.tasaMolipayMonto)} ({item.lote.tasaMolipayPct}%)</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Tasa PayWay</div>
                        <div className="font-mono text-xs">-{fmt(item.lote.tasaPaywayMonto)} ({item.lote.tasaPaywayPct}%)</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Impuestos</div>
                        <div className="font-mono text-xs">-{fmt(item.lote.impuestos)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Importe Neto</div>
                        <div className="font-mono font-medium text-emerald-700">{fmt(item.lote.importeNeto)}</div>
                      </div>
                      {item.lote.contracargoMonto > 0 && (
                        <div className="col-span-2">
                          <div className="text-xs text-red-600 font-medium">Contracargo: -{fmt(item.lote.contracargoMonto)}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {item.lote && (
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-mono">{item.lote.codigo}</span>
                    <a
                      href="/admin/comercios/link-pago/lotes"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Ver en lotes
                    </a>
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

function Page() {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [anio, setAnio] = useState(today.getFullYear());
  const [comercioFilter, setComercioFilter] = useState("");
  const [banderaFilter, setBanderaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"programado" | "pendiente" | "acreditado" | "contracargo" | "">("");
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<CalendarioAcreditacion[]>([]);

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 100 });

  const { data: acreditaciones, isLoading } = useQuery({
    queryKey: ["calendario-acreditaciones", mes, anio, comercioFilter, banderaFilter, estadoFilter],
    queryFn: () =>
      listCalendarioAcreditaciones({
        mes,
        anio,
        comercioId: comercioFilter || undefined,
        bandera: banderaFilter || undefined,
        estado: estadoFilter || undefined,
      }),
  });

  const diasDelMes = useMemo(() => {
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    const dias: { fecha: Date; esActual: boolean; esPasado: boolean; esOtroMes: boolean }[] = [];

    let diaSemana = primerDia.getDay();
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;

    for (let i = diaSemana - 1; i >= 0; i--) {
      const fecha = new Date(anio, mes - 1, -i);
      dias.push({ fecha, esActual: false, esPasado: false, esOtroMes: true });
    }

    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(anio, mes - 1, d);
      const esHoy =
        d === today.getDate() &&
        mes === today.getMonth() + 1 &&
        anio === today.getFullYear();
      dias.push({ fecha, esActual: esHoy, esPasado: fecha < today && !esHoy, esOtroMes: false });
    }

    const restante = 7 - (dias.length % 7);
    if (restante < 7) {
      for (let i = 1; i <= restante; i++) {
        const fecha = new Date(anio, mes, i);
        dias.push({ fecha, esActual: false, esPasado: false, esOtroMes: true });
      }
    }

    return dias;
  }, [mes, anio]);

  const acreditacionesPorFecha = useMemo(() => {
    const map = new Map<string, CalendarioAcreditacion[]>();
    for (const a of acreditaciones ?? []) {
      const key = a.fechaEstimadaAcreditacion;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [acreditaciones]);

  const stats = useMemo(() => {
    const items = Array.from(acreditacionesPorFecha.values()).flat();
    return {
      total: items.reduce((sum, a) => sum + a.importeBruto, 0),
      programadas: items.filter((a) => a.estado === "programado").length,
      pendientes: items.filter((a) => a.estado === "pendiente").length,
      acreditados: items.filter((a) => a.estado === "acreditado").length,
      contracargos: items.filter((a) => a.estado === "contracargo").length,
    };
  }, [acreditacionesPorFecha]);

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAnio(anio - 1); }
    else { setMes(mes - 1); }
  };

  const mesSiguiente = () => {
    if (mes === 12) { setMes(1); setAnio(anio + 1); }
    else { setMes(mes + 1); }
  };

  const nombreMes = new Date(anio, mes - 1).toLocaleDateString("es-AR", { month: "long" });

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
        description="Vista de cuándo se acreditarán los lotes de venta según los días hábiles de cada bandera."
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <button onClick={mesAnterior} className="h-8 w-8 rounded-md border bg-card hover:bg-muted flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold min-w-[140px] text-center capitalize">
              {nombreMes} {anio}
            </span>
            <button onClick={mesSiguiente} className="h-8 w-8 rounded-md border bg-card hover:bg-muted flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => { setMes(today.getMonth() + 1); setAnio(today.getFullYear()); }}
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
              className="h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              {comerciosOptions.map((c: any) => (
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
              onChange={(e) => setEstadoFilter(e.target.value as typeof estadoFilter)}
              className="h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              <option value="programado">Programado</option>
              <option value="pendiente">Pendiente</option>
              <option value="acreditado">Acreditado</option>
              <option value="contracargo">Contracargo</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total del mes</div>
          <div className="font-mono text-xl font-semibold mt-1">{fmt(stats.total)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Programados</div>
          <div className="font-mono text-xl font-semibold mt-1 text-blue-600">{stats.programadas}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Pendientes</div>
          <div className="font-mono text-xl font-semibold mt-1 text-amber-600">{stats.pendientes}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Acreditados</div>
          <div className="font-mono text-xl font-semibold mt-1 text-emerald-600">{stats.acreditados}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Contracargos</div>
          <div className="font-mono text-xl font-semibold mt-1 text-red-600">{stats.contracargos}</div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando calendario…
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/50"
              >
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {diasDelMes.map((dia, idx) => {
              const fechaKey = dia.fecha.toISOString().slice(0, 10);
              const items = acreditacionesPorFecha.get(fechaKey) ?? [];
              const esMesActual = !dia.esOtroMes;
              const tieneItems = items.length > 0;

              const showDay = !estadoFilter || items.some((a) => a.estado === estadoFilter);

              if (!showDay && estadoFilter) {
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
                <div
                  key={idx}
                  onClick={() => tieneItems && handleDiaClick(fechaKey)}
                  className={`min-h-[120px] border-b border-r p-2 transition-colors ${
                    !esMesActual
                      ? "bg-muted/30 text-muted-foreground"
                      : dia.esPasado
                      ? "bg-green-50/30 hover:bg-green-50/50"
                      : "hover:bg-muted/30"
                  } ${dia.esActual ? "bg-primary/5 ring-2 ring-primary/20" : ""} ${tieneItems ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-sm font-semibold ${
                        dia.esActual ? "text-primary" : ""
                      }`}
                    >
                      {dia.fecha.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {items.reduce((sum, a) => sum + a.cantidadOperaciones, 0)} ops
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 2).map((item, i) => {
                      const color = ESTADO_COLORS[item.estado] ?? ESTADO_COLORS.pendiente;
                      return (
                        <div
                          key={i}
                          className={`text-[10px] p-1 rounded truncate ${color.bg} ${color.text}`}
                          title={`${item.comercioNombre} - ${item.bandera} - ${fmt(item.importeBruto)}`}
                        >
                          <Store size={8} className="inline mr-0.5" />
                          {item.bandera} · {fmt(item.importeBruto)}
                        </div>
                      );
                    })}
                    {items.length > 2 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{items.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(ESTADO_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${val.bg}`} />
            <span>{val.label}</span>
          </div>
        ))}
      </div>

      {selectedFecha && selectedItems.length > 0 && (
        <DiaDetalleModal
          fecha={selectedFecha}
          items={selectedItems}
          onClose={() => { setSelectedFecha(null); setSelectedItems([]); }}
        />
      )}
    </PermissionGuard>
  );
}
