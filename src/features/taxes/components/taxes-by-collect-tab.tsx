import { useMemo,useState } from "react";
import {
MOCK_TAXES_BY_COLLECT,
formatTaxAmount,
type TaxByCollect,
} from "@/features/taxes/receivable-taxes.data";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

export function TaxesByCollectTab() {
  const [subTab, setSubTab] = useState<"por_cobrar" | "historial">("por_cobrar");

  const filtrados = useMemo(() => {
    return MOCK_TAXES_BY_COLLECT;
  }, []);

  const columns: Column<TaxByCollect>[] = [
    {
      key: "usuario",
      label: "Usuario",
      filterable: true,
      render: (r) => <span className="text-xs font-medium">{r.usuario}</span>,
    },
    {
      key: "legajo",
      label: "Legajo",
      render: (r) => <span className="font-mono text-xs">{r.legajo}</span>,
    },
    {
      key: "loteId",
      label: "Lote",
      filterable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.loteId}</span>,
    },
    {
      key: "bandera",
      label: "Bandera",
      filterable: "enum",
      filterOptions: ["Visa", "Mastercard", "Amex", "Cabal"],
      render: (r) => (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-muted/50">
          {r.bandera}
        </span>
      ),
    },
    { key: "impuesto", label: "Impuesto", filterable: true, render: (r) => r.impuesto },
    {
      key: "monto",
      label: "Monto",
      render: (r) => <span className="font-mono tabular-nums">{formatTaxAmount(r.monto)}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: ["pendiente", "pagado"],
      render: (r) => <Badge tone={r.estado === "pendiente" ? "warn" : "success"}>{r.estado}</Badge>,
    },
    {
      key: "fechaLote",
      label: "Fecha lote",
      render: (r) => <span className="font-mono text-xs">{r.fechaLote}</span>,
    },
  ];

  const batchCurrentIds = [
    "LOTE-2026-09-07-001",
    "LOTE-2026-09-07-002",
    "LOTE-2026-09-07-003",
    "LOTE-2026-09-07-004",
    "LOTE-2026-09-07-005",
  ];
  const batchCurrent = filtrados.filter((r) => batchCurrentIds.includes(r.loteId));
  const history = filtrados.filter((r) => !batchCurrentIds.includes(r.loteId));
  const totalPending = filtrados
    .filter((r) => r.estado === "pendiente")
    .reduce((a, b) => a + b.monto, 0);
  const totalPaid = filtrados.filter((r) => r.estado === "pagado").reduce((a, b) => a + b.monto, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setSubTab("por_cobrar")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === "por_cobrar" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Impuestos por cobrar
        </button>
        <button
          onClick={() => setSubTab("historial")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === "historial" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Historial
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        {filtrados.length} registro(s) · pendiente {formatTaxAmount(totalPending)} · pagado{" "}
        {formatTaxAmount(totalPaid)}
      </div>
      {subTab === "por_cobrar" ? (
        <>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Impuestos por cobrar lote actual</div>
            <div className="font-mono text-lg font-semibold mt-1">
              {formatTaxAmount(
                batchCurrent
                  .filter((r) => r.estado === "pendiente")
                  .reduce((a, b) => a + b.monto, 0),
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Lote completo al corte y por bandera · {batchCurrent.length} items
            </div>
          </Card>
          <DataTable columns={columns} data={batchCurrent} keyExtractor={(r) => r.id} />
        </>
      ) : (
        <>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Historial pagado</div>
            <div className="font-mono text-lg font-semibold mt-1 text-emerald-700">
              {formatTaxAmount(totalPaid)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Cuándo se pagaron · {history.length} items
            </div>
          </Card>
          <DataTable columns={columns} data={history} keyExtractor={(r) => r.id} />
        </>
      )}
    </div>
  );
}
