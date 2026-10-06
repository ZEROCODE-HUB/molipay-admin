import { requireSupabase } from "@/lib/supabase";

// Acceso a los datos que el modal de acreditacion necesita para resolver el
// archivo de Payway: que comercio corresponde a cada ESTABLECIMIENTO y los
// parametros de negocio.
//
// La tabla de establecimientos viene de la migracion 0042 y la clave del
// parametro puede no estar cargada. En ambos casos el modal tiene que poder
// seguir funcionando: el primero cae al selector manual de comercio, el
// segundo al valor por defecto.

export type Establecimiento = {
  id: string;
  /** Numero de establecimiento en Payway. */
  establecimiento: string;
  /** "VISA", "MASTERCARD", "AMEX", etc. */
  marca: string;
  comercioId: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  comercio: { id: string; usuario: string; legajo: string; nombreComercio: string | null } | null;
};

/**
 * Mapa de establecimientos de Payway.
 *
 * Devuelve `[]` si la tabla no existe todavia. No es un error: el modal cae al
 * selector manual. Se distingue uno de otro con `tablaDisponible`.
 */
export async function listEstablecimientos(): Promise<{
  rows: Establecimiento[];
  tablaDisponible: boolean;
}> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb
      .from("comercio_establecimientos")
      .select(
        "id, establecimiento, marca, comercio_id, vigente_desde, vigente_hasta, comercios(id, usuario, legajo, nombre_comercio)",
      )
      .limit(5000);

    if (error) return { rows: [], tablaDisponible: false };

    const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => {
      // PostgREST devuelve OBJECT para relaciones to-one, no array.
      const c = r.comercios as
        | { id: string; usuario: string; legajo: string; nombre_comercio: string | null }
        | null
        | undefined;
      return {
        id: String(r.id),
        establecimiento: String(r.establecimiento),
        marca: String(r.marca),
        comercioId: String(r.comercio_id),
        vigenteDesde: String(r.vigente_desde ?? ""),
        vigenteHasta: r.vigente_hasta ? String(r.vigente_hasta) : null,
        comercio: c
          ? { id: c.id, usuario: c.usuario, legajo: c.legajo, nombreComercio: c.nombre_comercio }
          : null,
      };
    });

    return { rows, tablaDisponible: true };
  } catch {
    // Sin conexion o sin permisos: se degrada igual que si la tabla no existiera
    return { rows: [], tablaDisponible: false };
  }
}

/**
 * Lee un parametro de `parametros_globales`.
 *
 * La columna `valor` es TEXT (la 0047 la forzo), asi que el numero hay que
 * castearlo y no todos los parametros son numericos: `caja_control_habilitado`
 * es 'true'. Se devuelve el string crudo y castea el que necesita numero.
 */
export async function getParametro(clave: string): Promise<string | null> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb.from("parametros_globales").select("valor").eq("clave", clave).maybeSingle();
    if (error) return null;
    const valor = (data as { valor?: unknown } | null)?.valor;
    return valor == null ? null : String(valor);
  } catch {
    return null;
  }
}

/**
 * Lee un parametro numerico con valor por defecto.
 *
 * El fallback va en el parametro y no hardcodeado en el call site para que el
 * default este siempre junto a la lectura que lo origina.
 */
export async function getParametroNumerico(clave: string, porDefecto: number): Promise<number> {
  const raw = await getParametro(clave);
  if (raw == null || raw.trim() === "") return porDefecto;
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : porDefecto;
}
