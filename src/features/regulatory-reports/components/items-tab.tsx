import { useQuery,useQueryClient } from "@tanstack/react-query";
import { listItems,type BcraItem } from "@/features/regulatory-reports/bcra.supabase";
import { useState } from "react";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { AlertTriangle,Settings2 } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { QK,RULES,errMsg,summaryParams } from "@/features/regulatory-reports/bcra-reports.rules";
import { ParametersEntityCard } from "./parameters-entity-card";
import { ItemDialog } from "./item-dialog";

export function ItemsTab() {
  const queryClient = useQueryClient();
  const itemsQ = useQuery({ queryKey: [...QK, "partidas"], queryFn: listItems });
  const [apartado, setApartado] = useState<"" | "A" | "B" | "I">("");
  const [edit, setEdit] = useState<BcraItem | null>(null);
  const data = (itemsQ.data ?? []).filter((p) => !apartado || p.apartado === apartado);
  const aConfirm = (itemsQ.data ?? []).filter((p) => p.activa && !p.confirmada).length;

  const columns: Column<BcraItem>[] = [
    {
      key: "apartado",
      label: "Apartado",
      minWidth: 90,
      render: (p) => <Badge>{p.apartado === "I" ? "Intra" : p.apartado}</Badge>,
    },
    {
      key: "codigo",
      label: "Código",
      minWidth: 110,
      render: (p) => (
        <span className="font-mono tabular-nums">
          {p.apartado === "A" ? `${p.codigo.slice(0, 5)}dd` : p.codigo}
        </span>
      ),
    },
    {
      key: "descripcion",
      label: "Descripción",
      minWidth: 280,
      maxWidth: 420,
      tooltip: (p) => p.descripcion,
      render: (p) => (
        <div>
          <div className="truncate">{p.descripcion}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {summaryParams(p) || RULES[p.regla]?.label}
          </div>
        </div>
      ),
    },
    {
      key: "regla",
      label: "Regla",
      minWidth: 200,
      render: (p) => <span className="text-xs">{RULES[p.regla]?.label ?? p.regla}</span>,
    },
    {
      key: "medio",
      label: "Medio / Esquema",
      minWidth: 120,
      render: (p) => (
        <span className="font-mono text-xs">
          {p.medioPago || p.esquema ? `${p.medioPago ?? "—"} / ${p.esquema ?? "—"}` : "—"}
        </span>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      minWidth: 130,
      render: (p) =>
        !p.activa ? (
          <Badge>Inactiva</Badge>
        ) : !p.confirmada ? (
          <Badge tone="warn">A confirmar</Badge>
        ) : (
          <Badge tone="success">Confirmada</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <ParametersEntityCard />

      {aConfirm > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {aConfirm} partida(s) activas tienen la definición <strong>a confirmar</strong> por
            Compliance. Se calculan igual, pero los archivos que las incluyen muestran un aviso
            hasta que se confirmen.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["", "Todas"],
            ["A", "Apartado A"],
            ["B", "Apartado B"],
            ["I", "Intraentidades"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setApartado(k)}
            className={`h-8 px-3 rounded-full border text-xs font-semibold ${
              apartado === k
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {itemsQ.isError ? (
        <Card className="p-5 text-sm text-red-700">{errMsg(itemsQ.error)}</Card>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(p) => p.id}
          loading={itemsQ.isLoading}
          pageSize={20}
          showDownloadButton={false}
          actions={(p) => (
            <ActionsDropdown
              actions={[{ label: "Editar", icon: Settings2, onClick: () => setEdit(p) }]}
            />
          )}
        />
      )}

      {edit && (
        <ItemDialog
          partida={edit}
          onClose={() => setEdit(null)}
          onDone={() => void queryClient.invalidateQueries({ queryKey: [...QK, "partidas"] })}
        />
      )}
    </div>
  );
}
