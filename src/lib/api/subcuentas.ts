import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

export type SubcuentaTipo = "Operativa" | "Recaudacion" | "Garantias" | "Sueldos";
export type SubcuentaEstado = "Activa" | "Pausada";

export type SubcuentaParam = { label: string; valor: string };
export type SubcuentaComision = {
  id: string;
  tipo: string;
  monto: string;
  fecha: string;
  origen: string;
};
export type SubcuentaConfiguracion = {
  alertas: SubcuentaParam[];
  bloqueos: SubcuentaParam[];
  comisiones: SubcuentaComision[];
};

export type Subcuenta = {
  id: string;
  clienteLegajo: string;
  nombre: string;
  apellido: string;
  email: string;
  cbu: string | null;
  tipo: SubcuentaTipo;
  estado: SubcuentaEstado;
  saldoDisponible: number;
  saldoRetenido: number;
  saldoConciliado: number;
  ingresos: string | null;
  egresos: string | null;
  responsable: string | null;
  limite: string | null;
  retirosHabilitados: boolean;
  validada?: boolean;
  configuracion?: SubcuentaConfiguracion;
  createdAt: string;
  updatedAt: string;
};

type SubcuentaRow = {
  id: string;
  cliente_legajo: string;
  nombre: string;
  apellido: string;
  email: string;
  cbu: string | null;
  tipo: SubcuentaTipo;
  estado: SubcuentaEstado;
  saldo_disponible: number;
  saldo_retenido: number;
  saldo_conciliado: number;
  ingresos: string | null;
  egresos: string | null;
  responsable: string | null;
  limite: string | null;
  retiros_habilitados: boolean;
  validada: boolean;
  configuracion: unknown;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, cliente_legajo, nombre, apellido, email, cbu, tipo, estado, saldo_disponible, saldo_retenido, saldo_conciliado, ingresos, egresos, responsable, limite, retiros_habilitados, validada, configuracion, created_at, updated_at";

function toSubcuenta(r: SubcuentaRow): Subcuenta {
  return {
    id: r.id,
    clienteLegajo: r.cliente_legajo,
    nombre: r.nombre,
    apellido: r.apellido,
    email: r.email,
    cbu: r.cbu,
    tipo: r.tipo,
    estado: r.estado,
    saldoDisponible: Number(r.saldo_disponible),
    saldoRetenido: Number(r.saldo_retenido),
    saldoConciliado: Number(r.saldo_conciliado),
    ingresos: r.ingresos,
    egresos: r.egresos,
    responsable: r.responsable,
    limite: r.limite,
    retirosHabilitados: r.retiros_habilitados,
    validada: r.validada,
    configuracion: {
      alertas: (r.configuracion as SubcuentaConfiguracion | null)?.alertas ?? [],
      bloqueos: (r.configuracion as SubcuentaConfiguracion | null)?.bloqueos ?? [],
      comisiones: (r.configuracion as SubcuentaConfiguracion | null)?.comisiones ?? [],
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listSubcuentas(clienteLegajo: string): Promise<Subcuenta[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("subcuentas")
    .select(COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("created_at", { ascending: false });
  if (error) throw new DataAccessError(error);
  return ((data as SubcuentaRow[]) ?? []).map(toSubcuenta);
}

export type SubcuentaInput = {
  nombre: string;
  apellido?: string;
  email: string;
  cbu?: string;
  tipo?: SubcuentaTipo;
  estado?: SubcuentaEstado;
  saldoDisponible?: number;
  saldoRetenido?: number;
  saldoConciliado?: number;
  responsable?: string;
  limite?: string;
  retirosHabilitados?: boolean;
};

export async function createSubcuenta(
  clienteLegajo: string,
  input: SubcuentaInput,
): Promise<Subcuenta> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("subcuentas")
    .insert({
      cliente_legajo: clienteLegajo,
      nombre: input.nombre,
      apellido: input.apellido ?? "",
      email: input.email,
      cbu: input.cbu ?? null,
      tipo: input.tipo ?? "Operativa",
      estado: input.estado ?? "Activa",
      saldo_disponible: input.saldoDisponible ?? 0,
      saldo_retenido: input.saldoRetenido ?? 0,
      saldo_conciliado: input.saldoConciliado ?? 0,
      responsable: input.responsable ?? null,
      limite: input.limite ?? null,
      retiros_habilitados: input.retirosHabilitados ?? true,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toSubcuenta(data as SubcuentaRow);
}

export type SubcuentaUpdate = {
  nombre?: string;
  apellido?: string;
  email?: string;
  cbu?: string | null;
  tipo?: SubcuentaTipo;
  estado?: SubcuentaEstado;
  saldoDisponible?: number;
  saldoRetenido?: number;
  saldoConciliado?: number;
  responsable?: string | null;
  limite?: string | null;
  retirosHabilitados?: boolean;
  validada?: boolean;
  configuracion?: SubcuentaConfiguracion;
};

export async function updateSubcuenta(
  clienteLegajo: string,
  id: string,
  input: SubcuentaUpdate,
): Promise<Subcuenta> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("subcuentas")
    .update({ ...input })
    .eq("id", id)
    .eq("cliente_legajo", clienteLegajo)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toSubcuenta(data as SubcuentaRow);
}

export async function deleteSubcuenta(
  clienteLegajo: string,
  id: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("subcuentas")
    .delete()
    .eq("id", id)
    .eq("cliente_legajo", clienteLegajo);
  if (error) throw new DataAccessError(error);
}
