import { useNavigate } from "@tanstack/react-router";
import { useMemo,useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QK_ACRED,calendarioV3,saveSelection } from "@/features/payment-links/credits.supabase";
import {
Amount,
MerchantPicker,
date,
errMsg,
} from "@/features/payment-links/components/credits-common";
import { downloadXlsx } from "@/shared/lib/download";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline } from "@/shared/ui/button";
import { ChevronLeft,ChevronRight,Download } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BatchBreakdown } from "@/features/payment-links/components/batch-breakdown";
import { type Capa } from "@/features/payment-links/credit-calendar.types";
import { CAPAS,DAYS,iso } from "@/features/payment-links/credit-calendar.rules";
import { MONTHS } from "@/shared/lib/months";
import { Celda } from "./credit-calendar-parts";
import { BatchesDelDay } from "./batches-del-day";

export function CreditCalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [merchant, setMerchant] = useState("");
  const [capas, setCapas] = useState<Record<Capa, boolean>>({
    programado: true,
    pendiente: true,
    acreditado: true,
    vencido: true,
  });
  const [day, setDay] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<string | null>(null);

  const from = iso(month);
  const to = iso(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const q = useQuery({
    queryKey: [...QK_ACRED, "calendario", from, to, merchant],
    queryFn: () => calendarioV3(from, to, merchant || null),
  });
  const byDate = useMemo(() => new Map((q.data?.dias ?? []).map((d) => [d.fecha, d])), [q.data]);

  const tot = (q.data?.dias ?? []).reduce(
    (a, d) => ({
      programado: a.programado + Number(d.programado),
      pendiente: a.pendiente + Number(d.pendiente),
      acreditado: a.acreditado + Number(d.acreditado),
      vencido: a.vencido + Number(d.vencido),
    }),
    { programado: 0, pendiente: 0, acreditado: 0, vencido: 0 },
  );
  const todayDato = byDate.get(iso(today));

  // Grilla lunes a domingo.
  const celdas = useMemo(() => {
    const primero = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (primero.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= days; i++)
      out.push(iso(new Date(month.getFullYear(), month.getMonth(), i)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const exportar = () => {
    const data = (q.data?.dias ?? []).map((d) => ({
      Fecha: date(d.fecha),
      "No hábil": d.no_habil ? "Sí" : "",
      Programado: Number(d.programado),
      Pendiente: Number(d.pendiente),
      Acreditado: Number(d.acreditado),
      Vencido: Number(d.vencido),
      Total: Number(d.total),
    }));
    downloadXlsx(`calendario_acreditaciones_${from.slice(0, 7)}.xlsx`, data, {
      sheetName: "Calendario",
    });
  };

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Calendario de acreditaciones"
        description="Por día hábil: cuánto se espera cobrar, cuánto llegó en el archivo de Payway y cuánto ya se acreditó."
        action={
          <BtnOutline onClick={exportar} disabled={!q.data}>
            <Download size={15} /> Exportar el mes
          </BtnOutline>
        }
      />

      <Card className="p-4 mb-3 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-input bg-background text-foreground shadow-sm hover:bg-muted"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="min-w-[150px] text-center font-semibold">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </div>
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-input bg-background text-foreground shadow-sm hover:bg-muted"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-w-[260px]">
          <MerchantPicker value={merchant} onChange={(id) => setMerchant(id)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {CAPAS.map((c) => (
            <label key={c.k} className="flex items-center gap-1.5" title={c.ayuda}>
              <input
                type="checkbox"
                checked={capas[c.k]}
                onChange={(e) => setCapas({ ...capas, [c.k]: e.target.checked })}
              />
              <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} /> {c.label}
            </label>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 text-xs">
        {CAPAS.map((c) => (
          <Card key={c.k} className="p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${c.color}`} /> {c.label} del mes
            </div>
            <Amount v={tot[c.k]} strong />
            <div className="text-[10px] text-muted-foreground">
              Hoy: <Amount v={todayDato ? Number(todayDato[c.k]) : 0} />
            </div>
          </Card>
        ))}
      </div>

      {q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : (
        <Card className="p-2">
          <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
            {DAYS.map((d) => (
              <div key={d} className="px-1 font-semibold">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((f, i) =>
              f ? (
                <Celda
                  key={f}
                  f={f}
                  d={byDate.get(f)}
                  capas={capas}
                  activo={day === f}
                  esHoy={f === iso(today)}
                  onClick={() => setDay(f)}
                />
              ) : (
                <div key={`v${i}`} />
              ),
            )}
          </div>
        </Card>
      )}

      {day && (
        <BatchesDelDay
          f={day}
          comercio={merchant}
          onClose={() => setDay(null)}
          onApertura={setBreakdown}
          onEjecutar={(ids) => {
            saveSelection(ids);
            void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
          }}
        />
      )}
      <div className="relative z-[80]">
        <BatchBreakdown loteId={breakdown} onClose={() => setBreakdown(null)} />
      </div>
    </PermissionGuard>
  );
}
