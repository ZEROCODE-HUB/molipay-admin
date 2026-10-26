import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

// Modelo de saldos — referencia rápida:
//
//   subaccounts                  →  identidad de la subcuenta (CBU, tipo,
//                                   estado, configuración). Sin saldos.
//   subaccount_balances          →  saldos 1:1 por subcuenta. La fila se
//                                   crea por trigger al insertar la
//                                   subcuenta; solo admins y RPCs la editan.
//
//   saldo_disponible             →  columna NUMERIC(18,2) que vive en la
//                                   subcuenta `Operativa` del legajo del
//                                   comercio. Es EL saldo líquido real que
//                                   el comercio ve en su panel: lo que
//                                   puede retirar o transferir.
//
//                                   El único camino que mueve plata ahí
//                                   es la RPC `acreditar_lote` (estado
//                                   Pendiente → Acreditado). El resto de
//                                   las operaciones del backoffice (cobros,
//                                   retenciones) se registran en la
//                                   bitácora `movimientos` y la vista
//                                   `v_lotes_venta`, pero NO tocan
//                                   saldo_disponible hasta que el lote
//                                   se acredita.
//
//   saldo_retenido               →  contracargos y disputas en disputa.
//   saldo_conciliado             →  acumulado conciliado contra el banco.
//
//   movimientos                  →  tabla inmutable de cada transacción
//                                   (id_txn UNIQUE). No se escribe desde
//                                   esta API ni desde la RPC de
//                                   acreditación; es de los cobros.

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

type BalanceRow = {
  saldo_disponible: number;
  saldo_retenido: number;
  saldo_conciliado: number;
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
  // Relación 1:1: PostgREST la devuelve como objeto (array en versiones viejas).
  subaccount_balances: BalanceRow | BalanceRow[] | null;
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
  "id, cliente_legajo, nombre, apellido, email, cbu, tipo, estado, ingresos, egresos, responsable, limite, retiros_habilitados, validada, configuracion, created_at, updated_at, subaccount_balances(saldo_disponible, saldo_retenido, saldo_conciliado)";

function balanceOf(r: SubcuentaRow): BalanceRow | null {
  const b = r.subaccount_balances;
  return (Array.isArray(b) ? b[0] : b) ?? null;
}

function toSubcuenta(r: SubcuentaRow): Subcuenta {
  const bal = balanceOf(r);
  return {
    id: r.id,
    clienteLegajo: r.cliente_legajo,
    nombre: r.nombre,
    apellido: r.apellido,
    email: r.email,
    cbu: r.cbu,
    tipo: r.tipo,
    estado: r.estado,
    saldoDisponible: Number(bal?.saldo_disponible ?? 0),
    saldoRetenido: Number(bal?.saldo_retenido ?? 0),
    saldoConciliado: Number(bal?.saldo_conciliado ?? 0),
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
    .from("subaccounts")
    .select(COLUMNS)
    .eq("cliente_legajo", clienteLegajo)
    .order("created_at", { ascending: false });
  if (error) throw new DataAccessError(error);
  return ((data as SubcuentaRow[]) ?? []).map(toSubcuenta);
}

export type CvuFilters = {
  page: number;
  pageSize: number;
  search?: string;
  estado?: SubcuentaEstado;
  fechaDesde?: string;
  fechaHasta?: string;
};

export type CvuRow = Subcuenta & {
  cliente?: { correo: string; nombre: string; cuit: string; tipoPersona: string } | null;
  legajo: string;
};

const COLUMNS_WITH_CLIENTE = COLUMNS + ", clientes(legajo, correo, nombre, cuit, tipo_persona)";

export async function listAllCvus(filters: CvuFilters): Promise<{ rows: CvuRow[]; total: number; page: number; pageSize: number }> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, fechaDesde, fechaHasta } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = sb.from("subaccounts").select(COLUMNS_WITH_CLIENTE, { count: "exact" });
  if (search?.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`cliente_legajo.ilike.%${q}%,email.ilike.%${q}%,nombre.ilike.%${q}%,cbu.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (fechaDesde) query = query.gte("created_at", `${fechaDesde}T00:00:00`);
  if (fechaHasta) query = query.lte("created_at", `${fechaHasta}T23:59:59`);
  query = query.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as (SubcuentaRow & { clientes?: { legajo: string; correo: string; nombre: string; cuit: string; tipo_persona: string } | null })[]).map((r) => {
    const base = toSubcuenta(r as SubcuentaRow);
    const cli = r.clientes as unknown as { legajo: string; correo: string; nombre: string; cuit: string; tipo_persona: string } | null;
    return {
      ...base,
      legajo: r.cliente_legajo,
      cliente: cli ? { correo: cli.correo, nombre: cli.nombre, cuit: cli.cuit, tipoPersona: cli.tipo_persona } : null,
    } as CvuRow;
  });
  return { rows, total: count ?? rows.length, page, pageSize };
}

export function generarCbu(): string {
  // 22 dígitos, prefijo 00000031 (banco) + 14 aleatorios
  const rand = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("");
  return `00000031${rand}`;
}

export function generarAlias(email: string): string {
  const base = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, ".") ?? "usuario";
  return `${base}.${Math.floor(100 + Math.random() * 900)}`;
}

export type SubcuentaInput = {
  nombre: string;
  apellido?: string;
  email: string;
  cbu?: string;
  tipo?: SubcuentaTipo;
  estado?: SubcuentaEstado;
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
    .from("subaccounts")
    .insert({
      cliente_legajo: clienteLegajo,
      nombre: input.nombre,
      apellido: input.apellido ?? "",
      email: input.email,
      cbu: input.cbu ?? null,
      tipo: input.tipo ?? "Operativa",
      estado: input.estado ?? "Activa",
      responsable: input.responsable ?? null,
      limite: input.limite ?? null,
      retiros_habilitados: input.retirosHabilitados ?? true,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  // La fila de saldos nace en 0 (trigger); los fondos entran con ajustarSaldoSubcuenta.
  return toSubcuenta(data as SubcuentaRow);
}

/**
 * Ajuste manual de saldo desde backoffice. Los saldos solo cambian
 * contabilizando en el ledger: la RPC registra una operación ADJ- con su motivo
 * (contra AJUSTES_MANUALES) y actualiza el saldo en la misma transacción.
 * `monto` con signo: positivo acredita, negativo debita (nunca deja < 0).
 */
export async function ajustarSaldoSubcuenta(
  subaccountId: string,
  monto: number,
  motivo: string,
  bucket: "disponible" | "retenido" = "disponible",
): Promise<{ idTxn: string }> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("ajustar_saldo_subcuenta", {
    p_subaccount_id: subaccountId,
    p_monto: monto,
    p_motivo: motivo,
    p_bucket: bucket,
  });
  if (error) throw new DataAccessError(error);
  return { idTxn: (data as { id_txn: string }).id_txn };
}

export type SubcuentaUpdate = {
  nombre?: string;
  apellido?: string;
  email?: string;
  cbu?: string | null;
  tipo?: SubcuentaTipo;
  estado?: SubcuentaEstado;
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
  const { retirosHabilitados, ...rest } = input;
  const datos: Record<string, unknown> = { ...rest };
  if (retirosHabilitados !== undefined) datos.retiros_habilitados = retirosHabilitados;

  const { data, error } = await sb
    .from("subaccounts")
    .update(datos)
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
    .from("subaccounts")
    .delete()
    .eq("id", id)
    .eq("cliente_legajo", clienteLegajo);
  if (error) throw new DataAccessError(error);
}
