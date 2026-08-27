import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

export type HistorialCambio = {
  id: string;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
  hora: string | null;
  usuario: string | null;
};

export type Validacion = {
  id: string;
  proveedor: string;
  estado: string;
  fecha: string;
};

export type Alerta = {
  id: string;
  tipo: string;
  fecha: string;
  estado: string;
};

export type Bloqueo = {
  id: string;
  parametro: string;
  valor: string | null;
  estado?: string | null;
};

export type ClienteModulo = {
  id: string;
  clave: "pct" | "blp" | "api";
  titulo: string;
  cantidad: number;
  detalle: string | null;
};

export type ParametroConfig = {
  id: string;
  cliente_legajo: string;
  clave: string;
  habilitado: boolean;
  valor: string | null;
  periodo: string | null;
};

export type ComercioPst = {
  id: string;
  cliente_legajo: string;
  nombre: string;
  email: string | null;
  legajo_comercio: string | null;
};

export type LinkPago = {
  id: string;
  cliente_legajo: string;
  comercio_nombre: string;
  url: string | null;
  monto: number | null;
  estado: string | null;
};

type HistorialCambioRow = {
  id: string;
  cliente_legajo: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  fecha: string;
  hora: string | null;
  usuario: string | null;
};

type ValidacionRow = {
  id: string;
  cliente_legajo: string;
  proveedor: string;
  estado: string;
  fecha: string;
};

type AlertaRow = {
  id: string;
  cliente_legajo: string;
  tipo: string;
  fecha: string;
  estado: string;
};

type BloqueoRow = {
  id: string;
  cliente_legajo: string;
  parametro: string;
  valor: string | null;
};

type ClienteModuloRow = {
  id: string;
  cliente_legajo: string;
  clave: "pct" | "blp" | "api";
  titulo: string;
  cantidad: number;
  detalle: string | null;
};

type ParametroConfigRow = {
  id: string;
  cliente_legajo: string;
  clave: string;
  habilitado: boolean;
  valor: string | null;
  periodo: string | null;
};

type ComercioPstRow = {
  id: string;
  cliente_legajo: string;
  nombre: string;
  email: string | null;
  legajo_comercio: string | null;
};

type LinkPagoRow = {
  id: string;
  cliente_legajo: string;
  comercio_nombre: string;
  url: string | null;
  monto: number | null;
  estado: string | null;
};

const HISTORIAL_COLUMNS =
  "id, cliente_legajo, campo, valor_anterior, valor_nuevo, fecha, hora, usuario";
const VALIDACIONES_COLUMNS = "id, cliente_legajo, proveedor, estado, fecha";
const ALERTAS_COLUMNS = "id, cliente_legajo, tipo, fecha, estado";
const BLOQUEOS_COLUMNS = "id, cliente_legajo, parametro, valor";
const MODULOS_COLUMNS = "id, cliente_legajo, clave, titulo, cantidad, detalle";
const PARAM_ALERTAS_COLUMNS = "id, cliente_legajo, clave, habilitado, valor, periodo";
const PARAM_BLOQUEOS_COLUMNS = "id, cliente_legajo, clave, habilitado, valor, periodo";
const COMERCIOS_PST_COLUMNS = "id, cliente_legajo, nombre, email, legajo_comercio";
const LINKS_PAGO_COLUMNS = "id, cliente_legajo, comercio_nombre, url, monto, estado";

export async function listHistorialCambios(clienteLegajo: string): Promise<HistorialCambio[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("historial_cambios")
    .select(HISTORIAL_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("fecha", { ascending: false });
  if (error) throw new DataAccessError(error);
  const rows = (data as HistorialCambioRow[] | null) ?? [];
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

export async function listValidaciones(clienteLegajo: string): Promise<Validacion[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("validaciones")
    .select(VALIDACIONES_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("fecha", { ascending: false });
  if (error) throw new DataAccessError(error);
  const rows = (data as ValidacionRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    proveedor: r.proveedor,
    estado: r.estado,
    fecha: r.fecha,
  }));
}

export async function listAlertas(clienteLegajo: string): Promise<Alerta[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("alertas")
    .select(ALERTAS_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("fecha", { ascending: false });
  if (error) throw new DataAccessError(error);
  const rows = (data as AlertaRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    fecha: r.fecha,
    estado: r.estado,
  }));
}

export async function listBloqueos(clienteLegajo: string): Promise<Bloqueo[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("bloqueos")
    .select(BLOQUEOS_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("parametro", { ascending: true });
  if (error) throw new DataAccessError(error);
  const rows = (data as BloqueoRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    parametro: r.parametro,
    valor: r.valor,
  }));
}

export async function listClienteModulos(clienteLegajo: string): Promise<ClienteModulo[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_modulos")
    .select(MODULOS_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("clave", { ascending: true });
  if (error) throw new DataAccessError(error);
  const rows = (data as ClienteModuloRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    clave: r.clave,
    titulo: r.titulo,
    cantidad: Number(r.cantidad),
    detalle: r.detalle,
  }));
}

export async function listParametrosAlertas(clienteLegajo: string): Promise<ParametroConfig[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_parametros_alertas")
    .select(PARAM_ALERTAS_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("clave", { ascending: true });
  if (error) throw new DataAccessError(error);
  const rows = (data as ParametroConfigRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    clave: r.clave,
    habilitado: r.habilitado,
    valor: r.valor,
    periodo: r.periodo,
  }));
}

export async function upsertParametroAlerta(
  clienteLegajo: string,
  clave: string,
  input: { habilitado: boolean; valor?: string | null; periodo?: string | null },
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("cliente_parametros_alertas").upsert(
    {
      cliente_legajo: clienteLegajo,
      clave,
      habilitado: input.habilitado,
      valor: input.valor ?? null,
      periodo: input.periodo ?? null,
    },
    { onConflict: "cliente_legajo,clave" },
  );
  if (error) throw new DataAccessError(error);
}

export async function listParametrosBloqueos(clienteLegajo: string): Promise<ParametroConfig[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_parametros_bloqueos")
    .select(PARAM_BLOQUEOS_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("clave", { ascending: true });
  if (error) throw new DataAccessError(error);
  const rows = (data as ParametroConfigRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    clave: r.clave,
    habilitado: r.habilitado,
    valor: r.valor,
    periodo: r.periodo,
  }));
}

export async function upsertParametroBloqueo(
  clienteLegajo: string,
  clave: string,
  input: { habilitado: boolean; valor?: string | null; periodo?: string | null },
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("cliente_parametros_bloqueos").upsert(
    {
      cliente_legajo: clienteLegajo,
      clave,
      habilitado: input.habilitado,
      valor: input.valor ?? null,
      periodo: input.periodo ?? null,
    },
    { onConflict: "cliente_legajo,clave" },
  );
  if (error) throw new DataAccessError(error);
}

export async function listComerciosPst(clienteLegajo: string): Promise<ComercioPst[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_comercios_pst")
    .select(COMERCIOS_PST_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("nombre", { ascending: true });
  if (error) throw new DataAccessError(error);
  const rows = (data as ComercioPstRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    nombre: r.nombre,
    email: r.email,
    legajo_comercio: r.legajo_comercio,
  }));
}

export async function listLinksPago(clienteLegajo: string): Promise<LinkPago[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("cliente_links_pago")
    .select(LINKS_PAGO_COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("comercio_nombre", { ascending: true });
  if (error) throw new DataAccessError(error);
  const rows = (data as LinkPagoRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    cliente_legajo: r.cliente_legajo,
    comercio_nombre: r.comercio_nombre,
    url: r.url,
    monto: r.monto === null ? null : Number(r.monto),
    estado: r.estado,
  }));
}

export async function forzarValidacion(clienteLegajo: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("validaciones").insert({
    cliente_legajo: clienteLegajo,
    proveedor: "Manual",
    estado: "En proceso",
    fecha: new Date().toISOString().slice(0, 10),
  });
  if (error) throw new DataAccessError(error);
}

export type ExencionDireccion = "Entrantes" | "Salientes" | "Ambos";

export type ExencionInput = {
  cuit: string;
  direccion: ExencionDireccion;
  motivo: string;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
};

export async function crearExencion(
  clienteLegajo: string,
  input: ExencionInput,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("exenciones_debito_credito").insert({
    cliente_legajo: clienteLegajo,
    cuit: input.cuit,
    direccion: input.direccion,
    motivo: input.motivo,
    vigencia_desde: input.vigenciaDesde || null,
    vigencia_hasta: input.vigenciaHasta || null,
  });
  if (error) throw new DataAccessError(error);
}

export type ComisionCliente = {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  estado: string;
};

type ComisionClienteRow = {
  id: string;
  concepto: string | null;
  monto: number | null;
  fecha: string | null;
  estado: string | null;
};

export async function listComisionesCliente(clienteLegajo: string): Promise<ComisionCliente[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comisiones_cliente")
    .select("id, concepto, monto, fecha, estado")
    .eq("cliente_legajo", clienteLegajo)
    .order("fecha", { ascending: false })
    .limit(10);
  if (error) throw new DataAccessError(error);
  const rows = (data as ComisionClienteRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    concepto: r.concepto ?? "Comisión",
    monto: r.monto === null ? 0 : Number(r.monto),
    fecha: r.fecha ?? "—",
    estado: r.estado ?? "—",
  }));
}
