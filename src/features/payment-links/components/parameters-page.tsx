import { Select } from "@/shared/ui/form-controls";
import { useEffect,useState } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2,Save } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { errMsg } from "@/features/payment-links/components/credits-common";
import {
QK_ACRED,
saveParameterCredit,
historyParameters,
listParametersCredit,
type ParameterCredit,
} from "@/features/payment-links/credits.supabase";
import { formatDateTime } from "@/shared/lib/format";
import { useCan } from "@/features/rbac/rbac.hooks";
import { PermissionGuard } from "@/features/rbac/access-gate";

type Def = {
  clave: string;
  titulo: string;
  ayuda: string;
  tipo: "pct" | "num" | "entero" | "bool" | "hora" | "opcion";
  opciones?: { v: string; l: string }[];
  sufijo?: string;
};

const DEFS: Def[] = [
  {
    clave: "comision_cierre_lote_pct",
    titulo: "Cierre de lote",
    tipo: "pct",
    sufijo: "%",
    ayuda: "Comisión por cierre de lote, IVA incluido. Se cobra al acreditar.",
  },
  {
    clave: "iva_sobre_tasa_molipay_pct",
    titulo: "IVA sobre la tasa MoliPay",
    tipo: "pct",
    sufijo: "%",
    ayuda: "IVA que se suma a la tasa por bandera. En 0 no se cobra IVA sobre la tasa.",
  },
  {
    clave: "iva_cierre_lote_incluido_pct",
    titulo: "IVA incluido en el cierre",
    tipo: "pct",
    sufijo: "%",
    ayuda: "Solo separa la parte de IVA del cierre en el asiento contable; no cambia el importe.",
  },
  {
    clave: "impuestos_link_aplicar",
    titulo: "Aplicar impuestos asignados",
    tipo: "bool",
    ayuda:
      "Si está activo, los impuestos asignados al comercio (Comercios › Impuestos › Usuarios) se descuentan al acreditar. Por defecto no: los impuestos del lote son los que informa Payway en el CSV.",
  },
  {
    clave: "impuestos_link_base",
    titulo: "Base de los impuestos asignados",
    tipo: "opcion",
    opciones: [
      { v: "neto_payway", l: "Neto de Payway" },
      { v: "bruto", l: "Bruto" },
    ],
    ayuda:
      "Base de los impuestos de tipo Porcentaje asignados al comercio para Link de pago (Comercios › Impuestos › Usuarios).",
  },
  {
    clave: "liquidacion_tolerancia_centavos",
    titulo: "Tolerancia de cuadre",
    tipo: "num",
    sufijo: "$",
    ayuda:
      "Diferencia aceptada al validar bruto + costo + impuestos = neto y al conciliar con la recaudadora.",
  },
  {
    clave: "adelanto_antiguedad_min_dias",
    titulo: "Antigüedad mínima para adelantos",
    tipo: "entero",
    sufijo: "días",
    ayuda: "Días desde el alta del comercio para poder pedir un adelanto.",
  },
  {
    clave: "bloquear_retiros_con_deuda",
    titulo: "Bloquear retiros con deuda",
    tipo: "bool",
    ayuda: "Si el comercio debe contracargos o lotes negativos, no puede retirar fondos [A-14].",
  },
  {
    clave: "hora_corte_ventas",
    titulo: "Hora de corte de ventas",
    tipo: "hora",
    ayuda:
      "Lo vendido después de esta hora (Argentina) entra en el lote del día siguiente. 24:00 = sin corte.",
  },
];

export function ParametersPage() {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const q = useQuery({ queryKey: [...QK_ACRED, "parametros"], queryFn: listParametersCredit });
  const hist = useQuery({
    queryKey: [...QK_ACRED, "parametros-historial"],
    queryFn: () => historyParameters(50),
  });
  const byKey = new Map((q.data ?? []).map((p) => [p.clave, p]));

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Parámetros de acreditación"
        description="Valores que usa el cálculo de cada lote. Un cambio afecta a los lotes que todavía no se acreditaron; los acreditados conservan el valor con el que se calcularon."
      />
      {q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {DEFS.map((d) => (
            <ParameterCard key={d.clave} def={d} p={byKey.get(d.clave)} puede={puede} />
          ))}
        </div>
      )}
      <Card className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Historial de cambios</h3>
        {(hist.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hist.isError ? errMsg(hist.error) : "Sin cambios registrados."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-3">Fecha</th>
                <th className="py-1.5 pr-3">Parámetro</th>
                <th className="py-1.5 pr-3">Antes</th>
                <th className="py-1.5 pr-3">Después</th>
                <th className="py-1.5">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(hist.data ?? []).map((h) => (
                <tr key={h.id}>
                  <td className="py-1.5 pr-3 text-xs">{formatDateTime(h.cambiado_at)}</td>
                  <td className="py-1.5 pr-3 text-xs">
                    {DEFS.find((d) => d.clave === h.clave)?.titulo ?? h.clave}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{h.valor_anterior ?? "—"}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{h.valor_nuevo}</td>
                  <td className="py-1.5 font-mono text-[11px] text-muted-foreground">
                    {h.cambiado_by?.slice(0, 8) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PermissionGuard>
  );
}

function ParameterCard({ def, p, puede: can }: { def: Def; p?: ParameterCredit; puede: boolean }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(p?.valor ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(p?.valor ?? ""), [p?.valor]);
  const change = value.trim() !== (p?.valor ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await saveParameterCredit(def.clave, value.trim().replace(",", "."));
      toast.success(`${def.titulo}: guardado.`);
      qc.invalidateQueries({ queryKey: QK_ACRED });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const input =
    def.tipo === "bool" ? (
      <Select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!can}
        className="px-2"
      >
        <option value="true">Sí</option>
        <option value="false">No</option>
      </Select>
    ) : def.tipo === "opcion" ? (
      <Select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!can}
        className="px-2"
      >
        {def.opciones!.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </Select>
    ) : (
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!can}
          inputMode={def.tipo === "hora" ? "text" : "decimal"}
          placeholder={def.tipo === "hora" ? "HH:MM" : ""}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
        />
        {def.sufijo && <span className="text-xs text-muted-foreground">{def.sufijo}</span>}
      </div>
    );

  return (
    <Card className="space-y-2">
      <div>
        <div className="text-sm font-semibold">{def.titulo}</div>
        <p className="text-xs text-muted-foreground">{def.ayuda}</p>
      </div>
      {!p ? (
        <p className="text-xs text-red-700">
          El parámetro no existe (¿se aplicaron las migraciones de acreditaciones?).
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1">{input}</div>
            <BtnPrimary
              className="h-10"
              onClick={() => void save()}
              disabled={!can || !change || saving}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
            </BtnPrimary>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Último cambio: {formatDateTime(p.updated_at)}
          </div>
        </>
      )}
    </Card>
  );
}
