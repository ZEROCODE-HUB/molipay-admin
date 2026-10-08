import type { LoteAcreditacion } from "@/lib/api/types";
import type { RenglonLiquidacion } from "./parse";
import { marcaCoincide, normalizaMarca } from "./acreditacion";

// Match del archivo de liquidación contra todos los lotes Programado.
//
// En el modo "general" (botón Subir CSV de la página) un único archivo
// puede matchear contra varios lotes a la vez: distintos comercios, distintas
// banderas, distintos días. La pregunta es "¿este renglón del archivo
// corresponde a este lote Programado?", y la respuesta es sí cuando:
//
//   - El mapa de establecimientos (ESTABLECIMIENTO + MARCA) está vigente
//     para la fecha del renglón.
//   - El comercio resuelto coincide con el del lote.
//   - La marca del renglón matchea con la bandera del lote (mismo prefijo).
//
// Cuando hay varios lotes Programado que cumplen las tres condiciones para
// el mismo renglón (caso típico: varios días consecutivos del mismo comercio
// y bandera) el renglón se asigna al lote cuya fecha estimada está más
// cerca de la fecha del renglón. El desempate es por menor diferencia de
// bruto.
//
// Es un módulo puro: no toca Supabase ni React. Recibe los renglones ya
// parseados, los lotes Programado y el mapa de establecimientos; devuelve
// la asignación lista para calcular totales con `calcularAcreditacion` y
// la lista de renglones que no encontraron lote.

export type EstablecimientoEntrada = {
  establecimiento: string;
  marca: string;
  comercioId: string;
  /** null = vigente sin fecha de fin. */
  vigenteHasta: string | null;
  /**
   * Nombre comercial del comercio asociado. Lo usa `calcularAcreditacion`
   * para mostrarlo en el preview de renglones; no afecta el matching
   * (que sólo mira `comercioId` y `vigenteHasta`).
   */
  comercioNombre?: string;
};

export type LoteMatcheado = {
  lote: LoteAcreditacion;
  renglones: RenglonLiquidacion[];
};

export type ResultadoMatchGeneral = {
  /** Lotes con al menos un renglón asignado, en el orden en que llegan los lotes. */
  conMatch: LoteMatcheado[];
  /** Renglones usables que no matchearon contra ningún lote. */
  sinMatch: RenglonLiquidacion[];
};

function diffDias(a: string, b: string): number {
  // a, b son YYYY-MM-DD. Pasamos por Date local para no pelearnos con la TZ
  // del server: la diferencia de días es la misma en cualquier zona horaria.
  const fa = a.split("-").map(Number);
  const fb = b.split("-").map(Number);
  const da = new Date(fa[0], fa[1] - 1, fa[2]).getTime();
  const db = new Date(fb[0], fb[1] - 1, fb[2]).getTime();
  return Math.abs(da - db) / 86_400_000;
}

function vigente(f: EstablecimientoEntrada, fecha: string): boolean {
  if (!fecha) return true;
  if (!f.vigenteHasta) return true;
  return f.vigenteHasta >= fecha;
}

export function calcularMatchGeneral(args: {
  renglones: RenglonLiquidacion[];
  lotes: LoteAcreditacion[];
  establecimientos: EstablecimientoEntrada[];
  /**
   * Fallback por `site_id` para cuando el mapa de establecimientos
   * todavía no está cargado. Si el `ESTABLECIMIENTO` del renglón
   * coincide con un `sitioId` y el `comercioId` matchea con un lote
   * Programado, el renglón se asigna a ese lote.
   */
  sitios?: { sitioId: string; comercioId: string }[];
}): ResultadoMatchGeneral {
  // Índices: (ESTABLECIMIENTO|MARCA) y (ESTABLECIMIENTO solo). El primero
  // gana cuando hay match exacto con la marca del CSV; el segundo es el
  // fallback cuando la marca del CSV no es exactamente la que está mapeada.
  const porMarca = new Map<string, EstablecimientoEntrada>();
  const solo = new Map<string, EstablecimientoEntrada>();
  for (const f of args.establecimientos) {
    const e = f.establecimiento.trim();
    if (!e) continue;
    const k = `${e}|${normalizaMarca(f.marca)}`;
    if (!porMarca.has(k)) porMarca.set(k, f);
    if (!solo.has(e)) solo.set(e, f);
  }

  // Índice por site_id (fallback final).
  const porSitio = new Map<string, string>();
  for (const s of args.sitios ?? []) {
    const k = s.sitioId.trim();
    if (k && !porSitio.has(k)) porSitio.set(k, s.comercioId);
  }

  // Mapa de renglones asignados por lote, en orden de aparición.
  const porLote = new Map<string, RenglonLiquidacion[]>();
  const sinMatch: RenglonLiquidacion[] = [];

  for (const r of args.renglones) {
    // Renglones con error de formato o renglones "sin movimiento" no se
    // asignan a ningún lote: son ruido del archivo. El modal los muestra
    // aparte en la lista de "sin match" para que el operador no se
    // confunda.
    if (r.error || r.sinMovimiento) continue;

    const lookup =
      porMarca.get(`${r.establecimiento}|${normalizaMarca(r.marca)}`) ??
      solo.get(r.establecimiento);
    let comercioIdDelRenglon: string | null = lookup && vigente(lookup, r.fecha) ? lookup.comercioId : null;

    // Fallback por site_id: si el mapa no lo resolvió, probamos con el
    // site_id del comercio. No valida la marca porque el CSV trae sólo
    // un campo MARCA, y la bandera del lote es lo que decide.
    if (!comercioIdDelRenglon) {
      const cidPorSitio = porSitio.get(r.establecimiento);
      if (cidPorSitio) comercioIdDelRenglon = cidPorSitio;
    }

    if (!comercioIdDelRenglon) {
      sinMatch.push(r);
      continue;
    }

    const candidatos = args.lotes.filter(
      (l) => l.comercioId === comercioIdDelRenglon && marcaCoincide(r.marca, l.bandera),
    );
    if (candidatos.length === 0) {
      sinMatch.push(r);
      continue;
    }

    // Un solo candidato: asignación trivial.
    let mejor = candidatos[0];
    if (candidatos.length > 1) {
      let mejorScore = Number.POSITIVE_INFINITY;
      for (const c of candidatos) {
        const df = r.fecha ? diffDias(r.fecha, c.fecha) : 0;
        const db = Math.abs(r.totalBruto - c.importeBruto);
        // Peso de la fecha muy por encima del bruto: la cercanía temporal
        // es la señal más fuerte de que el renglón va a ese lote.
        const score = df * 1_000_000 + db;
        if (score < mejorScore) {
          mejorScore = score;
          mejor = c;
        }
      }
    }

    const arr = porLote.get(mejor.id) ?? [];
    arr.push(r);
    porLote.set(mejor.id, arr);
  }

  // Resultado en el orden de entrada de los lotes, así el modal muestra
  // los mismos lotes que están en la grilla de Programado.
  const conMatch: LoteMatcheado[] = [];
  for (const l of args.lotes) {
    const rs = porLote.get(l.id);
    if (rs && rs.length > 0) conMatch.push({ lote: l, renglones: rs });
  }

  return { conMatch, sinMatch };
}
