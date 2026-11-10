import { getAdvanceMerchantId } from "@/features/payment-links/advances.supabase";
import { useEffect, useMemo, useState } from "react";
import {
  aprobarAdvance,
  calcularCapAvailable,
  creditAdvance,
  obtenerPoolRecaudacion,
  rechazarAdvance,
  type PoolRecaudacion,
} from "@/features/payment-links/advances.supabase";
import { moneyInputToNumber } from "@/shared/lib/money";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatMoney } from "@/shared/lib/format";
import { userMessage } from "@/shared/lib/errors";
import { type AdvanceUI } from "@/features/payment-links/advances.types";

/** Estado y acciones de Detail: el componente solo dibuja. */
export function useAdvanceDetail({
  a,
  onClose,
  onSave,
  onAcreditado: onCredited,
}: {
  a: AdvanceUI;
  onClose: () => void;
  onSave: (u: AdvanceUI) => void;
  onAcreditado: () => void;
}) {
  // El modal hace cosas distintas según el estado:
  //  - Solicitado (Pendiente): el usuario maestro oferta (monto + tasa) o rechaza.
  //  - Ofertado (Aprobado): espera que la empresa acepte o cancele.
  //  - Aceptado: el usuario maestro acredita (sale de la recaudadora de Payway).
  //  - Acreditado / Compensado: solo lectura, con lo compensado.
  const [rateInteres, setRateInteres] = useState<string>(
    a.tasaInteresPct != null ? String(a.tasaInteresPct) : "",
  );
  const [notes, setNotes] = useState<string>("");
  const [amountOferta, setAmountOferta] = useState<string>(
    String(a.montoOfertado ?? a.importeSolicitado),
  );
  const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState<number | null>(null);

  // Sólo se muestra el tope cuando el adelanto está en revisión
  // (Pendiente o Aprobado). Es informativo: le dice al admin cuánto le
  // queda al comercio para pedir más adelantos.
  useEffect(() => {
    if (a.estado !== "Pendiente" && a.estado !== "Aprobado" && a.estado !== "Aceptado") {
      setCap(null);
      return;
    }
    // Necesitamos el comercioId (UUID), no el legajo ni el nombre.
    // El join del nombre se hace en la grilla pasando fullId; acá lo
    // derivamos del AdelantoUI (fullId) buscando el comercio en un
    // cache que armamos arriba. Para simplificar, hacemos un query
    // directo: de las filas que ya tenemos, sacamos el comercio_id.
    let cancelled = false;
    (async () => {
      const merchantId = await getAdvanceMerchantId(a.fullId);
      if (cancelled || !merchantId) return;
      const t = await calcularCapAvailable(merchantId, a.fullId);
      if (!cancelled) setCap(t);
    })();
    return () => {
      cancelled = true;
    };
  }, [a.fullId, a.estado]);

  const ratePctNum = useMemo(() => {
    if (rateInteres.trim() === "") return null;
    const v = parseFloat(rateInteres.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }, [rateInteres]);

  const amountOfertaNum = useMemo(() => {
    return moneyInputToNumber(amountOferta);
  }, [amountOferta]);

  // Tasa = descuento unico sobre el monto (no TNA / TEM).
  const interesEstimated = useMemo(() => {
    if (ratePctNum == null) return 0;
    return Math.round(((amountOfertaNum * ratePctNum) / 100) * 100) / 100;
  }, [amountOfertaNum, ratePctNum]);

  const netEstimated = useMemo(
    () => Math.max(0, amountOfertaNum - interesEstimated),
    [amountOfertaNum, interesEstimated],
  );

  const amountCredit = a.montoOfertado ?? a.importeSolicitado;

  // Pool de Recaudación: se consulta solo cuando el modal está abierto
  // y el adelanto está en estado Aprobado (es el único caso donde el
  // botón "Acreditar" podría habilitarse). La RPC devuelve los 3 KPIs.
  const { data: pool } = useQuery<PoolRecaudacion>({
    queryKey: ["pool-recaudacion", a.fullId],
    queryFn: () => obtenerPoolRecaudacion(),
    enabled: a.estado === "Aceptado",
    refetchInterval: 30_000, // refresca cada 30s mientras el modal está abierto
  });
  const poolInsuficiente =
    a.estado === "Aceptado" && (pool?.cupoDisponiblePool ?? 0) < amountCredit;

  const handleAprobar = async () => {
    if (ratePctNum == null) {
      toast.error("Cargá la tasa de interés (0-100%)");
      return;
    }
    if (ratePctNum < 0 || ratePctNum > 100) {
      toast.error("Tasa fuera de rango (0-100%)");
      return;
    }
    setBusy(true);
    try {
      if (!(amountOfertaNum > 0)) {
        toast.error("Cargá el monto aprobado");
        setBusy(false);
        return;
      }
      if (cap != null && amountOfertaNum > cap) {
        toast.error("El monto aprobado supera el tope del comercio");
        setBusy(false);
        return;
      }
      const r = await aprobarAdvance(a.fullId, ratePctNum, notes.trim() || undefined, {
        monto: amountOfertaNum,
      });
      onSave({
        ...a,
        estado: "Aprobado",
        tasaInteresPct: r.tasaPct,
        motivo: notes.trim() || a.motivo,
      });
      toast.success(
        `Oferta enviada: ${formatMoney(r.netoARecibir)} netos al ${r.tasaPct}%. La empresa tiene que aceptarla.`,
      );
      if (!r.alcanza)
        toast.warning(
          "Hoy la recaudadora no alcanza para este monto: no se va a poder acreditar hasta que haya disponible.",
        );
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRechazar = async () => {
    if (!notes.trim()) {
      toast.error("Cargá un motivo de rechazo en el campo de notas");
      return;
    }
    setBusy(true);
    try {
      await rechazarAdvance(a.fullId, notes.trim());
      onSave({ ...a, estado: "Rechazado", rechazoMotivo: notes.trim() });
      toast.success("Adelanto rechazado");
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCredit = async () => {
    if (a.estado !== "Aceptado") {
      toast.error("Solo se acreditan adelantos que la empresa aceptó");
      return;
    }
    setBusy(true);
    try {
      const r = await creditAdvance(a.fullId, notes.trim() || undefined);
      toast.success(
        `Adelanto acreditado. Depósito neto: ${formatMoney(r.montoNetoDepositado)} (descuento ${formatMoney(r.interes)}).`,
      );
      onCredited();
      onClose();
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const readOnly = ["Acreditado", "Compensado", "Cancelado", "Rechazado"].includes(a.estado);
  return {
    a,
    onClose,
    onSave,
    rateInteres,
    setRateInteres,
    notes,
    setNotes,
    amountOferta,
    setAmountOferta,
    busy,
    cap,
    ratePctNum,
    interesEstimated,
    netEstimated,
    amountCredit,
    pool,
    poolInsuficiente,
    handleAprobar,
    handleRechazar,
    handleCredit,
    readOnly,
  };
}

export type DetailVm = ReturnType<typeof useAdvanceDetail>;
