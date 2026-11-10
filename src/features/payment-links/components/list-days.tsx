import { useQuery } from "@tanstack/react-query";
import { QK_ACRED, creditsByDay, type DayCredit } from "@/features/payment-links/credits.supabase";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Amount, date, errMsg } from "@/features/payment-links/components/credits-common";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/form-controls";
import { BtnOutline } from "@/shared/ui/button";
import { ChevronRight } from "lucide-react";
import { TONE_DAY } from "@/features/payment-links/credits.rules";
import { Tot } from "./credits-parts";

export function ListDays({
  desde: from,
  hasta: to,
  setDesde: setFrom,
  setHasta: setTo,
  onDia: onDay,
}: {
  desde: string;
  hasta: string;
  setDesde: (v: string) => void;
  setHasta: (v: string) => void;
  onDia: (f: string) => void;
}) {
  const q = useQuery({
    queryKey: [...QK_ACRED, "por-dia", from, to],
    queryFn: () => creditsByDay(from, to),
  });
  const days = q.data ?? [];
  const tot = days.reduce(
    (a, d) => ({
      neto: a.neto + Number(d.neto_payway),
      ingresado: a.ingresado + Number(d.ingresado ?? 0),
      descuentos: a.descuentos + Number(d.descuentos),
      neto_acr: a.neto_acr + Number(d.neto_a_acreditar),
      acreditado: a.acreditado + Number(d.acreditado),
      pendiente: a.pendiente + Number(d.pendiente),
    }),
    { neto: 0, ingresado: 0, descuentos: 0, neto_acr: 0, acreditado: 0, pendiente: 0 },
  );

  const columns: Column<DayCredit>[] = [
    {
      key: "fecha",
      label: "Fecha de pago",
      render: (d) => <span className="font-mono text-xs">{date(d.fecha)}</span>,
    },
    { key: "comercios", label: "Comercios", render: (d) => d.comercios },
    { key: "lotes", label: "Lotes", render: (d) => d.lotes },
    {
      key: "neto_payway",
      label: "Neto Payway",
      hint: "Suma del neto del archivo de Payway para ese día.",
      render: (d) => <Amount v={d.neto_payway} />,
    },
    {
      key: "ingresado",
      label: "Ingresó a la recaudadora",
      hint: "Lo que el operador concilió contra el extracto de la recaudadora.",
      render: (d) =>
        d.ingresado == null ? (
          <span className="text-xs text-muted-foreground">Sin conciliar</span>
        ) : (
          <Amount v={d.ingresado} />
        ),
    },
    {
      key: "diferencia",
      label: "Diferencia",
      hint: "Ingresado − neto del archivo (incluye excepciones). Debe dar 0.",
      render: (d) =>
        d.diferencia == null ? (
          "—"
        ) : (
          <Amount v={d.diferencia} className={Number(d.diferencia) !== 0 ? "text-red-600" : ""} />
        ),
    },
    {
      key: "descuentos",
      label: "Descuentos MoliPay",
      hint: "Tasa por bandera + IVA + cierre 0,45% + impuestos asignados.",
      render: (d) => <Amount v={-Number(d.descuentos)} />,
    },
    {
      key: "neto_a_acreditar",
      label: "Neto a acreditar",
      render: (d) => <Amount v={d.neto_a_acreditar} strong />,
    },
    { key: "acreditado", label: "Acreditado", render: (d) => <Amount v={d.acreditado} /> },
    { key: "pendiente", label: "Pendiente", render: (d) => <Amount v={d.pendiente} /> },
    {
      key: "estado",
      label: "Estado del día",
      hint: "Se deriva del peor estado de sus lotes.",
      render: (d) => <Badge tone={TONE_DAY[d.estado]}>{d.estado}</Badge>,
    },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold mb-1 block">Desde</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex-1" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
          <Tot label="Neto Payway" v={tot.neto} />
          <Tot label="Ingresado" v={tot.ingresado} />
          <Tot label="Descuentos" v={-tot.descuentos} />
          <Tot label="Neto a acreditar" v={tot.neto_acr} />
          <Tot label="Acreditado" v={tot.acreditado} />
          <Tot label="Pendiente" v={tot.pendiente} />
        </div>
      </Card>
      {q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : (
        <DataTable
          columns={columns}
          data={days}
          keyExtractor={(d) => d.fecha}
          loading={q.isLoading}
          pageSize={20}
          showDownloadButton={false}
          showGlobalFilter={false}
          emptyMessage="No hay lotes del archivo de Payway en el rango."
          actions={(d) => (
            <BtnOutline className="h-8 text-xs px-2" onClick={() => onDay(d.fecha)}>
              Ver día <ChevronRight size={13} />
            </BtnOutline>
          )}
        />
      )}
    </div>
  );
}
