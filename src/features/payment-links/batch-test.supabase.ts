import { env } from "@/app/env";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";

// Accesos de la prueba de punta a punta de lotes. El pago pasa por la misma ruta
// de simulacion que usa el checkout: registra el cobro con la RPC real.

const PAY_ORIGIN = "https://molly-pay-enterprises.vercel.app";

export type TestMerchant = { id: string; nombre: string; legajo: string };
export type TestBrand = { id: string; bandera: string };
export type TestProduct = { id: string; nombre: string; precio: number };
export type TestLink = { id: string; code: string; url: string; monto: number };
export type TestLot = {
  id: string;
  codigo: string;
  origen: string;
  estado: string;
  fecha: string;
  conciliado: boolean;
  marca_norm: string | null;
};

export async function listTestMerchants(): Promise<TestMerchant[]> {
  const { data, error } = await requireSupabase()
    .from("comercios")
    .select("id, nombre_comercio, legajo")
    .eq("estado", "Activado")
    .order("nombre_comercio");
  if (error) throw toAppError(error);
  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre_comercio ?? c.legajo ?? c.id,
    legajo: c.legajo ?? "",
  }));
}

export async function listTestBrands(merchantId: string): Promise<TestBrand[]> {
  const { data, error } = await requireSupabase()
    .from("comercio_banderas")
    .select("id, bandera")
    .eq("comercio_id", merchantId)
    .eq("estado", "Activo")
    .order("bandera");
  if (error) throw toAppError(error);
  return (data ?? []).map((b) => ({ id: b.id, bandera: b.bandera ?? b.id }));
}

export async function createTestProduct(
  legajo: string,
  nombre: string,
  precio: number,
): Promise<TestProduct> {
  const { data, error } = await requireSupabase().rpc(
    "lote_prueba_crear_producto" as never,
    {
      p_legajo: legajo,
      p_nombre: nombre,
      p_precio: precio,
    } as never,
  );
  if (error) throw toAppError(error);
  return data as unknown as TestProduct;
}

function linkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "LP-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function createTestLink(args: {
  merchant: TestMerchant;
  brand: TestBrand;
  products: TestProduct[];
  monto: number;
  reference: string;
}): Promise<TestLink> {
  const sb = requireSupabase();
  const code = linkCode();
  const url = `${PAY_ORIGIN}/p/${code}`;
  const { data, error } = await sb
    .from("cliente_links_pago")
    .insert({
      cliente_legajo: args.merchant.legajo,
      comercio_id: args.merchant.id,
      comercio_nombre: args.merchant.nombre,
      url,
      monto: args.monto,
      estado: "Activo",
      referencia: args.reference,
      notas: "Creado por la prueba de punta a punta de lotes",
      pagos_parciales: false,
      metodos_pago: [args.brand.id],
    })
    .select("id")
    .single();
  if (error) throw toAppError(error);

  const details = await sb.from("cliente_links_pago_detalle").insert(
    args.products.map((p) => ({
      link_id: data.id,
      producto_id: p.id,
      producto_nombre: p.nombre,
      cantidad: 1,
      precio_unitario: p.precio,
    })),
  );
  if (details.error) {
    await sb.from("cliente_links_pago").delete().eq("id", data.id);
    throw toAppError(details.error);
  }
  return { id: data.id, code, url, monto: args.monto };
}

export type TestPayment = { pagoId: string; paywayPaymentId: string; amount: number };

export async function simulateTestPayment(args: {
  code: string;
  brandId: string;
  monto: number;
  siteTransactionId: string;
}): Promise<TestPayment> {
  let res: Response;
  try {
    res = await fetch(`${env.BACKEND_URL}/api/payway/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Transaction-Id": args.siteTransactionId,
      },
      body: JSON.stringify({
        linkCode: args.code,
        banderaId: args.brandId,
        installments: 1,
        amount: args.monto,
        siteTransactionId: args.siteTransactionId,
        cardholder: { name: "Prueba MoliPay", email: "prueba@molipay.test" },
      }),
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${env.BACKEND_URL}`);
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 202 || !res.ok || body.ok !== true) {
    throw new Error(String(body.message ?? `El backend respondió ${res.status}`));
  }
  return {
    pagoId: String(body.pagoId ?? ""),
    paywayPaymentId: String(body.paywayPaymentId ?? ""),
    amount: Number(body.amount),
  };
}

/** Lotes en los que esta el pago: la venta se identifica por el id del pago. */
export async function listLotsOfPayment(pagoId: string): Promise<TestLot[]> {
  const sb = requireSupabase();
  const tx = await sb
    .from("transactions")
    .select("id")
    .eq("id_txn", `PAYWAY-${pagoId}`)
    .maybeSingle();
  if (tx.error) throw toAppError(tx.error);
  if (!tx.data) return [];
  const links = await sb.from("lote_movimientos").select("lote_id").eq("movimiento_id", tx.data.id);
  if (links.error) throw toAppError(links.error);
  const ids = (links.data ?? []).map((l) => l.lote_id);
  if (ids.length === 0) return [];
  const lots = await sb
    .from("lotes_acreditacion")
    .select("id, codigo, origen, estado, fecha, conciliado, marca_norm")
    .in("id", ids);
  if (lots.error) throw toAppError(lots.error);
  return (lots.data ?? []) as unknown as TestLot[];
}
