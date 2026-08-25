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
};

export type ClienteModulo = {
  id: string;
  clave: "pct" | "blp" | "api";
  titulo: string;
  cantidad: number;
  detalle: string | null;
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

const HISTORIAL_COLUMNS =
  "id, cliente_legajo, campo, valor_anterior, valor_nuevo, fecha, hora, usuario";
const VALIDACIONES_COLUMNS = "id, cliente_legajo, proveedor, estado, fecha";
const ALERTAS_COLUMNS = "id, cliente_legajo, tipo, fecha, estado";
const BLOQUEOS_COLUMNS = "id, cliente_legajo, parametro, valor";
const MODULOS_COLUMNS = "id, cliente_legajo, clave, titulo, cantidad, detalle";

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
