import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  QK_ACRED,
  listBatchesV2,
  saveSelection,
  type BatchV2,
} from "@/features/payment-links/credits.supabase";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Amount, StatusBatch, date } from "@/features/payment-links/components/credits-common";
import { BtnPrimary } from "@/shared/ui/button";
import { Send } from "lucide-react";

export function DetailMerchant({
  fechaPago: datePayment,
  comercioId: merchantId,
}: {
  fechaPago: string;
  comercioId: string;
}) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: [...QK_ACRED, "lotes-dia-comercio", datePayment, merchantId],
    queryFn: () =>
      listBatchesV2(
        { desde: datePayment, hasta: datePayment, comercioId: merchantId, origen: "archivo" },
        0,
        500,
      ),
  });
  const batches = q.data?.rows ?? [];
  const eligibles = batches.filter((l) => l.elegible).map((l) => l.id);

  const columns: Column<BatchV2>[] = [
    {
      key: "codigo",
      label: "Lote",
      render: (l) => <span className="font-mono text-xs">{l.codigo}</span>,
    },
    { key: "bandera", label: "Bandera", render: (l) => l.bandera },
    {
      key: "establecimiento",
      label: "Establecimiento",
      render: (l) => <span className="font-mono text-xs">{l.establecimiento ?? "—"}</span>,
    },
    { key: "neto_payway", label: "Neto Payway", render: (l) => <Amount v={l.neto_payway} /> },
    {
      key: "descuentos",
      label: "Descuentos",
      render: (l) => (
        <Amount
          v={
            -(
              Number(l.tasa_molipay_monto) +
              Number(l.iva_tasa_monto ?? 0) +
              Number(l.comision_cierre_lote_monto ?? 0) +
              Number(l.impuestos ?? 0)
            )
          }
        />
      ),
    },
    {
      key: "compensaciones",
      label: "Compensaciones",
      render: (l) => (
        <Amount
          v={
            -(
              Number(l.retencion_contracargos ?? 0) +
              Number(l.compensacion_adelantos) +
              Number(l.recuperacion_deuda)
            )
          }
        />
      ),
    },
    {
      key: "neto_a_acreditar",
      label: "Neto a acreditar",
      render: (l) => <Amount v={l.neto_a_acreditar} strong />,
    },
    { key: "estado", label: "Estado", render: (l) => <StatusBatch lote={l} /> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {batches[0]?.comercio_nombre ?? batches[0]?.comercio_usuario ?? "Comercio"} ·{" "}
          {date(datePayment)}
        </h3>
        <BtnPrimary
          disabled={eligibles.length === 0}
          onClick={() => {
            saveSelection(eligibles);
            void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
          }}
        >
          <Send size={15} /> Llevar a ejecución masiva ({eligibles.length})
        </BtnPrimary>
      </div>
      <DataTable
        columns={columns}
        data={batches}
        keyExtractor={(l) => l.id}
        loading={q.isLoading}
        showDownloadButton={false}
        actions={(l) => (
          <Link
            to="/admin/comercios/link-pago/lotes"
            search={{ lote: l.id }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Apertura
          </Link>
        )}
      />
    </div>
  );
}
