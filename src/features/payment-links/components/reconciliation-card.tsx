import { useCan } from "@/features/rbac/rbac.hooks";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import {
QK_ACRED,
conciliar,
reconciliationDelDay,
type ReconciliationBrand,
} from "@/features/payment-links/credits.supabase";
import { useState } from "react";
import { parseAmount } from "@/features/payment-links/settlements-parse";
import { toast } from "sonner";
import { Amount,date,errMsg } from "@/features/payment-links/components/credits-common";
import { Card } from "@/shared/ui/card";
import { Loader2,Scale } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import { Input } from "@/shared/ui/form-controls";
import { BtnOutline } from "@/shared/ui/button";

export function ReconciliationCard({ fechaPago: datePayment }: { fechaPago: string }) {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [...QK_ACRED, "conciliacion", datePayment],
    queryFn: () => reconciliationDelDay(datePayment),
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const send = async (m: ReconciliationBrand) => {
    const raw = (values[m.marca] ?? "").trim();
    const v = parseAmount(raw);
    if (!raw || !Number.isFinite(v)) {
      toast.error("Ingresá el importe que entró a la recaudadora (ej.: 2407,13).");
      return;
    }
    setSending(m.marca);
    try {
      const r = await conciliar(datePayment, m.marca, Math.round(v * 100) / 100);
      if (r.estado === "conciliado")
        toast.success(
          `${m.marca}: conciliado. ${r.lotes_conciliados} lote(s) listos para acreditar.`,
        );
      else
        toast.error(
          `${m.marca}: diferencia de ${r.diferencia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}. No se concilió.`,
        );
      qc.invalidateQueries({ queryKey: QK_ACRED });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(null);
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={16} />
        <h3 className="text-sm font-semibold">
          Conciliación con la recaudadora de Payway · {date(datePayment)}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Por cada bandera, cargá lo que ingresó a la recaudadora según el extracto. Si coincide con
        el neto del archivo (incluidas las excepciones), los lotes quedan conciliados. No se
        acredita lo que no está en la cuenta.
      </p>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-700">{errMsg(q.error)}</p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay renglones del archivo para esta fecha.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-3">Bandera</th>
                <th className="py-1.5 pr-3 text-right">Neto del archivo</th>
                <th className="py-1.5 pr-3">Lotes sin conciliar</th>
                <th className="py-1.5 pr-3">Última conciliación</th>
                <th className="py-1.5 pr-3">Ingresó a la recaudadora</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(q.data ?? []).map((m) => (
                <tr key={m.marca}>
                  <td className="py-2 pr-3 font-semibold">{m.marca}</td>
                  <td className="py-2 pr-3 text-right">
                    <Amount v={m.neto_archivo} strong />
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {m.sin_conciliar > 0 ? (
                      <Badge tone="warn">
                        {m.sin_conciliar} de {m.lotes}
                      </Badge>
                    ) : (
                      <Badge tone="success">Todos conciliados</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {m.ultima ? (
                      <span>
                        <Badge tone={m.ultima.estado === "conciliado" ? "success" : "danger"}>
                          {m.ultima.estado === "conciliado" ? "Conciliado" : "Con diferencia"}
                        </Badge>{" "}
                        <Amount v={m.ultima.ingresado} /> · {formatDateTime(m.ultima.created_at)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      inputMode="decimal"
                      className="h-9 w-40"
                      placeholder={m.neto_archivo.toFixed(2).replace(".", ",")}
                      value={values[m.marca] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [m.marca]: e.target.value }))}
                      disabled={!puede || m.sin_conciliar === 0}
                    />
                  </td>
                  <td className="py-2">
                    <BtnOutline
                      className="h-9 text-xs px-3"
                      disabled={!puede || m.sin_conciliar === 0 || sending !== null}
                      onClick={() => void send(m)}
                    >
                      {sending === m.marca ? <Loader2 size={13} className="animate-spin" /> : null}{" "}
                      Conciliar
                    </BtnOutline>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
