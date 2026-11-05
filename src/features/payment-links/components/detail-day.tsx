import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QK_ACRED,listBatchesV2,saveSelection } from "@/features/payment-links/credits.supabase";
import { useMemo } from "react";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Amount,date,errMsg } from "@/features/payment-links/components/credits-common";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Send } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { agruparByMerchant } from "@/features/payment-links/credits.rules";
import { type RowMerchant } from "@/features/payment-links/credits.types";
import { ReconciliationCard } from "./reconciliation-card";

export function DetailDay({
  fechaPago: datePayment,
  onComercio: onMerchant,
}: {
  fechaPago: string;
  onComercio: (id: string) => void;
}) {
  const navigate = useNavigate();
  const batchesQ = useQuery({
    queryKey: [...QK_ACRED, "lotes-dia", datePayment],
    queryFn: () =>
      listBatchesV2({ desde: datePayment, hasta: datePayment, origen: "archivo" }, 0, 1000),
  });
  const rows = useMemo(() => agruparByMerchant(batchesQ.data?.rows ?? []), [batchesQ.data]);
  const eligibles = rows.flatMap((f) => f.elegibles);

  const llevar = (ids: string[]) => {
    saveSelection(ids);
    void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
  };

  const columns: Column<RowMerchant>[] = [
    {
      key: "comercio",
      label: "Comercio",
      render: (f) => (
        <div className="leading-tight">
          <div className="text-sm font-semibold">{f.comercio}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{f.legajo}</div>
        </div>
      ),
    },
    { key: "lotes", label: "Lotes", render: (f) => f.lotes },
    { key: "bruto", label: "Bruto", render: (f) => <Amount v={f.bruto} /> },
    { key: "neto_payway", label: "Neto Payway", render: (f) => <Amount v={f.neto_payway} /> },
    { key: "descuentos", label: "Descuentos MoliPay", render: (f) => <Amount v={-f.descuentos} /> },
    {
      key: "compensaciones",
      label: "Compensaciones",
      hint: "Adelantos y deudas (contracargos / negativos) que se descuentan.",
      render: (f) => <Amount v={-f.compensaciones} />,
    },
    {
      key: "neto_a_acreditar",
      label: "Neto a acreditar",
      render: (f) => <Amount v={f.neto_a_acreditar} strong />,
    },
    { key: "acreditado", label: "Acreditado", render: (f) => <Amount v={f.acreditado} /> },
    {
      key: "estado",
      label: "Estado",
      render: (f) => (
        <Badge
          tone={
            f.estado === "Acreditado"
              ? "success"
              : f.estado === "No conciliado"
                ? "warn"
                : "neutral"
          }
        >
          {f.estado}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <ReconciliationCard fechaPago={datePayment} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Comercios del {date(datePayment)}</h3>
        <BtnPrimary onClick={() => llevar(eligibles)} disabled={eligibles.length === 0}>
          <Send size={15} /> Llevar a ejecución masiva ({eligibles.length})
        </BtnPrimary>
      </div>
      {batchesQ.isError ? (
        <Card className="text-sm text-red-700">{errMsg(batchesQ.error)}</Card>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(f) => f.comercio_id}
          loading={batchesQ.isLoading}
          pageSize={20}
          showDownloadButton={false}
          actions={(f) => (
            <div className="flex gap-1">
              <BtnOutline className="h-8 text-xs px-2" onClick={() => onMerchant(f.comercio_id)}>
                Ver lotes
              </BtnOutline>
              <BtnOutline
                className="h-8 text-xs px-2"
                disabled={f.elegibles.length === 0}
                onClick={() => llevar(f.elegibles)}
              >
                <Send size={12} /> Ejecutar
              </BtnOutline>
            </div>
          )}
        />
      )}
    </div>
  );
}
