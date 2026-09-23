import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Store } from "lucide-react";
import { PageHeader, Badge, Card, Input, Label } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useQuery } from "@tanstack/react-query";
import { listCalendarioAcreditaciones } from "@/lib/api/calendario-acreditaciones";
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

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Page() {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [anio, setAnio] = useState(today.getFullYear());
  const [comercioFilter, setComercioFilter] = useState("");
  const [banderaFilter, setBanderaFilter] = useState("");

  const { rows: comerciosOptions } = useComercios({ page: 0, pageSize: 100 });

  const { data: acreditaciones, isLoading } = useQuery({
    queryKey: ["calendario-acreditaciones", mes, anio, comercioFilter, banderaFilter],
    queryFn: () =>
      listCalendarioAcreditaciones({
        mes,
        anio,
        comercioId: comercioFilter || undefined,
        bandera: banderaFilter || undefined,
      }),
  });

  const diasDelMes = useMemo(() => {
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    const dias: { fecha: Date; esActual: boolean; esPasado: boolean }[] = [];

    // Ajustar para que la semana empiece en lunes
    let diaSemana = primerDia.getDay();
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;

    // Días del mes anterior para completar la primera semana
    for (let i = diaSemana - 1; i >= 0; i--) {
      const fecha = new Date(anio, mes - 1, -i);
      dias.push({ fecha, esActual: false, esPasado: false });
    }

    // Días del mes actual
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(anio, mes - 1, d);
      const esHoy =
        d === today.getDate() &&
        mes === today.getMonth() + 1 &&
        anio === today.getFullYear();
      dias.push({ fecha, esActual: esHoy, esPasado: fecha < today && !esHoy });
    }

    // Días del mes siguiente para completar la última semana
    const restante = 7 - (dias.length % 7);
    if (restante < 7) {
      for (let i = 1; i <= restante; i++) {
        const fecha = new Date(anio, mes, i);
        dias.push({ fecha, esActual: false, esPasado: false });
      }
    }

    return dias;
  }, [mes, anio]);

  const acreditacionesPorFecha = useMemo(() => {
    const map = new Map<string, typeof acreditaciones>();
    for (const a of acreditaciones ?? []) {
      const key = a.fechaEstimadaAcreditacion;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [acreditaciones]);

  const totalMes = useMemo(() => {
    return (acreditaciones ?? []).reduce((sum, a) => sum + a.importeBruto, 0);
  }, [acreditaciones]);

  const pendientesMes = useMemo(() => {
    return (acreditaciones ?? []).filter((a) => a.estado === "pendiente").length;
  }, [acreditaciones]);

  const acreditadosMes = useMemo(() => {
    return (acreditaciones ?? []).filter((a) => a.estado === "acreditado").length;
  }, [acreditaciones]);

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAnio(anio - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const mesSiguiente = () => {
    if (mes === 12) {
      setMes(1);
      setAnio(anio + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const nombreMes = new Date(anio, mes - 1).toLocaleDateString("es-AR", {
    month: "long",
  });

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
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total del mes</div>
          <div className="font-mono text-xl font-semibold mt-1">{fmt(totalMes)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Pendientes</div>
          <div className="font-mono text-xl font-semibold mt-1 text-amber-600">{pendientesMes}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Acreditados</div>
          <div className="font-mono text-xl font-semibold mt-1 text-emerald-600">{acreditadosMes}</div>
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
              const esMesActual =
                dia.fecha.getMonth() === mes - 1 && dia.fecha.getFullYear() === anio;

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r p-2 ${
                    !esMesActual
                      ? "bg-muted/30 text-muted-foreground"
                      : dia.esPasado
                      ? "bg-green-50/30"
                      : ""
                  } ${dia.esActual ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
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
                        {items.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className={`text-[10px] p-1 rounded truncate ${
                          item.estado === "acreditado"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                        title={`${item.comercioNombre} - ${item.bandera}`}
                      >
                        <Store size={8} className="inline mr-0.5" />
                        {item.bandera} · {fmt(item.importeBruto)}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{items.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-100" />
          <span>Acreditado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-100" />
          <span>Pendiente</span>
        </div>
      </div>
    </PermissionGuard>
  );
}
