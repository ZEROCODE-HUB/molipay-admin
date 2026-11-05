import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";

export type HistoryChange = {
  id: string;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
  hora: string | null;
  usuario: string | null;
};

export type Validation = {
  id: string;
  proveedor: string;
  estado: string;
  fecha: string;
};

export type Alert = {
  id: string;
  tipo: string;
  fecha: string;
  estado: string;
};

export type Block = {
  id: string;
  parametro: string;
  valor: string | null;
  estado?: string | null;
};

export type CustomerModule = {
  id: string;
  clave: "pct" | "blp" | "api";
  titulo: string;
  cantidad: number;
  detalle: string | null;
};

export type ParameterConfig = {
  id: string;
  cliente_legajo: string;
  clave: string;
  habilitado: boolean;
  valor: string | null;
  periodo: string | null;
};

export type MerchantPst = {
  id: string;
  cliente_legajo: string;
  nombre: string;
  email: string | null;
  legajo_comercio: string | null;
};

export type LinkPayment = {
  id: string;
  cliente_legajo: string;
  comercio_nombre: string;
  url: string | null;
  monto: number | null;
  estado: string | null;
};

type HistoryChangeRow = {
  id: string;
  cliente_legajo: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  fecha: string;
  hora: string | null;
  usuario: string | null;
};

type ValidationRow = {
  id: string;
  cliente_legajo: string;
  proveedor: string;
  estado: string;
  fecha: string;
};

// Alertas y bloqueos reales del cliente (vistas v_alerts / v_account_blocks).
type AlertRow = { id: string; type: string; created_at: string; status: string };

type BlockRow = {
  id: string;
  reason: string;
  scope: "client" | "subaccount";
  subcuenta_nombre: string | null;
  block_status: "active" | "released";
};

const STATUS_ALERT: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Resuelta",
  dismissed: "Descartada",
};

type CustomerModuleRow = {
  id: string;
  cliente_legajo: string;
  clave: "pct" | "blp" | "api";
  titulo: string;
  cantidad: number;
  detalle: string | null;
};

type ParameterConfigRow = {
  id: string;
  cliente_legajo: string;
  clave: string;
  habilitado: boolean;
  valor: string | null;
  periodo: string | null;
};

type MerchantPstRow = {
  id: string;
  cliente_legajo: string;
  nombre: string;
  email: string | null;
  legajo_comercio: string | null;
};

type LinkPaymentRow = {
  id: string;
  cliente_legajo: string;
  comercio_nombre: string;
  url: string | null;
  monto: number | null;
  estado: string | null;
};

const HISTORY_COLUMNS =
  "id, cliente_legajo, campo, valor_anterior, valor_nuevo, fecha, hora, usuario";
const VALIDATIONS_COLUMNS = "id, cliente_legajo, proveedor, estado, fecha";
const ALERTS_COLUMNS = "id, type, created_at, status";
const BLOCKS_COLUMNS = "id, reason, scope, subcuenta_nombre, block_status";
const MODULES_COLUMNS = "id, cliente_legajo, clave, titulo, cantidad, detalle";
const PARAM_ALERTS_COLUMNS = "id, cliente_legajo, clave, habilitado, valor, periodo";
const PARAM_BLOCKS_COLUMNS = "id, cliente_legajo, clave, habilitado, valor, periodo";
const MERCHANTS_PST_COLUMNS = "id, cliente_legajo, nombre, email, legajo_comercio";
const LINKS_PAYMENT_COLUMNS = "id, cliente_legajo, comercio_nombre, url, monto, estado";

export async function listHistoryChanges(customerLegajo: string): Promise<HistoryChange[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("historial_cambios")
    .select(HISTORY_COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .order("fecha", { ascending: false });
  if (error) throw toAppError(error);
  const rows = (data as HistoryChangeRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    campo: r.campo,
    valorAnterior: r.valor_anterior,
    valorNuevo: r.valor_nuevo,
    fecha: r.fecha,
    hora: r.hora,
    usuario: r.usuario,
  }));
}

export async function listValidations(customerLegajo: string): Promise<Validation[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("validaciones")
    .select(VALIDATIONS_COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .order("fecha", { ascending: false });
  if (error) throw toAppError(error);
  const rows = (data as ValidationRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    proveedor: r.proveedor,
    estado: r.estado,
    fecha: r.fecha,
  }));
}

export async function listAlerts(customerLegajo: string): Promise<Alert[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("v_alerts")
    .select(ALERTS_COLUMNS)
    .eq("legajo", customerLegajo)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw toAppError(error);
  const rows = (data as AlertRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    tipo: r.type,
    fecha: r.created_at,
    estado: STATUS_ALERT[r.status] ?? r.status,
  }));
}

export async function listBlocks(customerLegajo: string): Promise<Block[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("v_account_blocks")
    .select(BLOCKS_COLUMNS)
    .eq("legajo", customerLegajo)
    .order("blocked_at", { ascending: false })
    .limit(100);
  if (error) throw toAppError(error);
  const rows = (data as BlockRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    parametro: r.reason,
    valor: r.scope === "client" ? "Toda la cuenta" : `Subcuenta ${r.subcuenta_nombre ?? ""}`.trim(),
    estado: r.block_status === "active" ? "Bloqueado" : "Desbloqueado",
  }));
}

export async function listCustomerModules(customerLegajo: string): Promise<CustomerModule[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_modulos")
    .select(MODULES_COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .order("clave", { ascending: true });
  if (error) throw toAppError(error);
  const rows = (data as CustomerModuleRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    clave: r.clave,
    titulo: r.titulo,
    cantidad: Number(r.cantidad),
    detalle: r.detalle,
  }));
}

export async function listParametersAlerts(customerLegajo: string): Promise<ParameterConfig[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_parametros_alertas")
    .select(PARAM_ALERTS_COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .order("clave", { ascending: true });
  if (error) throw toAppError(error);
  const rows = (data as ParameterConfigRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    clave: r.clave,
    habilitado: r.habilitado,
    valor: r.valor,
    periodo: r.periodo,
  }));
}

export async function upsertParameterAlert(
  customerLegajo: string,
  key: string,
  input: { habilitado: boolean; valor?: string | null; periodo?: string | null },
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("cliente_parametros_alertas").upsert(
    {
      cliente_legajo: customerLegajo,
      clave: key,
      habilitado: input.habilitado,
      valor: input.valor ?? null,
      periodo: input.periodo ?? null,
    },
    { onConflict: "cliente_legajo,clave" },
  );
  if (error) throw toAppError(error);
}

export async function listParametersBlocks(customerLegajo: string): Promise<ParameterConfig[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_parametros_bloqueos")
    .select(PARAM_BLOCKS_COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .order("clave", { ascending: true });
  if (error) throw toAppError(error);
  const rows = (data as ParameterConfigRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    clave: r.clave,
    habilitado: r.habilitado,
    valor: r.valor,
    periodo: r.periodo,
  }));
}

export async function upsertParameterBlock(
  customerLegajo: string,
  key: string,
  input: { habilitado: boolean; valor?: string | null; periodo?: string | null },
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("cliente_parametros_bloqueos").upsert(
    {
      cliente_legajo: customerLegajo,
      clave: key,
      habilitado: input.habilitado,
      valor: input.valor ?? null,
      periodo: input.periodo ?? null,
    },
    { onConflict: "cliente_legajo,clave" },
  );
  if (error) throw toAppError(error);
}

export async function listMerchantsPst(customerLegajo: string): Promise<MerchantPst[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_comercios_pst")
    .select(MERCHANTS_PST_COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .order("nombre", { ascending: true });
  if (error) throw toAppError(error);
  const rows = (data as MerchantPstRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    nombre: r.nombre,
    email: r.email,
    legajo_comercio: r.legajo_comercio,
  }));
}

export async function listLinksPayment(customerLegajo: string): Promise<LinkPayment[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_links_pago")
    .select(LINKS_PAYMENT_COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .order("comercio_nombre", { ascending: true });
  if (error) throw toAppError(error);
  const rows = (data as LinkPaymentRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    comercio_nombre: r.comercio_nombre,
    url: r.url,
    monto: r.monto === null ? null : Number(r.monto),
    estado: r.estado,
  }));
}

export async function forzarValidation(customerLegajo: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("validaciones").insert({
    cliente_legajo: customerLegajo,
    proveedor: "Manual",
    estado: "En proceso",
    fecha: new Date().toISOString().slice(0, 10),
  });
  if (error) throw toAppError(error);
}

export type ExemptionAddress = "Entrantes" | "Salientes" | "Ambos";

export type ExemptionInput = {
  cuit: string;
  direccion: ExemptionAddress;
  motivo: string;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
};

export async function createExemption(
  customerLegajo: string,
  input: ExemptionInput,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("exenciones_debito_credito").insert({
    cliente_legajo: customerLegajo,
    cuit: input.cuit,
    direccion: input.direccion,
    motivo: input.motivo,
    vigencia_desde: input.vigenciaDesde || null,
    vigencia_hasta: input.vigenciaHasta || null,
  });
  if (error) throw toAppError(error);
}

export type ComisionCliente = {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  estado: string;
};

type FeeCustomerRow = {
  id: string;
  concepto: string | null;
  monto: number | null;
  fecha: string | null;
  estado: string | null;
};

export async function listFeesCustomer(customerLegajo: string): Promise<ComisionCliente[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comisiones_cliente")
    .select("id, concepto, monto, fecha, estado")
    .eq("cliente_legajo", customerLegajo)
    .order("fecha", { ascending: false })
    .limit(10);
  if (error) throw toAppError(error);
  const rows = (data as FeeCustomerRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    concepto: r.concepto ?? "Comisión",
    monto: r.monto === null ? 0 : Number(r.monto),
    fecha: r.fecha ?? "—",
    estado: r.estado ?? "—",
  }));
}

// --- Cliente <-> API usuarios (API externa) ----------------------------------
export type CustomerApiUser = {
  id: string;
  clienteLegajo: string;
  apiUsuarioId: string;
  codigoUsuarioApi: string;
  usuario: string;
  nombreCompleto: string;
  estado: string;
  createdAt: string;
};

type CustomerApiUserRow = {
  id: string;
  cliente_legajo: string;
  api_usuario_id: string;
  created_at: string;
  api_usuarios: {
    id: string;
    codigo_usuario_api: string;
    usuario: string;
    nombre_completo: string;
    estado: string;
    created_at: string;
  } | null;
};

export async function listCustomerApiUsers(customerLegajo: string): Promise<CustomerApiUser[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_api_usuarios")
    .select(
      "id, cliente_legajo, api_usuario_id, created_at, api_usuarios(id, codigo_usuario_api, usuario, nombre_completo, estado, created_at)",
    )
    .eq("cliente_legajo", customerLegajo)
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error);
  const rows = (data as unknown as CustomerApiUserRow[] | null) ?? [];
  return rows
    .filter((r) => r.api_usuarios)
    .map((r) => ({
      id: r.api_usuarios!.id,
      clienteLegajo: r.cliente_legajo,
      apiUsuarioId: r.api_usuario_id,
      codigoUsuarioApi: r.api_usuarios!.codigo_usuario_api,
      usuario: r.api_usuarios!.usuario,
      nombreCompleto: r.api_usuarios!.nombre_completo,
      estado: r.api_usuarios!.estado,
      createdAt: r.api_usuarios!.created_at,
    }));
}

export async function vincularApiUserACustomer(
  customerLegajo: string,
  apiUserId: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("cliente_api_usuarios").insert({
    cliente_legajo: customerLegajo,
    api_usuario_id: apiUserId,
  });
  if (error) throw toAppError(error);
}

export async function desvincularApiUserDeCustomer(
  customerLegajo: string,
  apiUserId: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("cliente_api_usuarios")
    .delete()
    .eq("cliente_legajo", customerLegajo)
    .eq("api_usuario_id", apiUserId);
  if (error) throw toAppError(error);
}
