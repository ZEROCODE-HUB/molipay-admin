/**
 * [SOLO DEMO] Simula un deposito (PAY-IN): le pide al backend que procese una
 * notificacion igual a la que manda Banco de Comercio, para poder mostrar el
 * circuito completo (acreditacion + movimiento en el historial) sin esperar una
 * transferencia real.
 *
 * En produccion el deposito lo genera el webhook real del banco; este archivo y
 * su boton se pueden borrar sin tocar nada mas.
 */
export type SimulacionDepositoInput = {
  cbu: string;
  importe: number;
  titular?: string;
  idCoelsa?: string;
};

export type SimulacionDepositoResult = {
  ok?: boolean;
  acreditado: boolean;
  ya_registrado?: boolean;
  saldo_actualizado?: boolean;
  saldo_anterior?: number;
  saldo_nuevo?: number;
  importe?: number;
  legajo?: string;
  motivo?: string;
  message?: string;
  id_coelsa?: string;
};

export async function simularDeposito(
  input: SimulacionDepositoInput,
): Promise<SimulacionDepositoResult> {
  const base = (import.meta.env.VITE_BDC_BACKEND_URL as string | undefined)?.replace(/\/+$/, "");
  if (!base) throw new Error("Falta VITE_BDC_BACKEND_URL (backend BDC) en el .env del admin");

  const res = await fetch(`${base}/webhooks/simular`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => null)) as SimulacionDepositoResult | null;
  if (!res.ok || !json) {
    throw new Error(json?.message ?? `No se pudo simular el deposito (HTTP ${res.status})`);
  }
  return json;
}
