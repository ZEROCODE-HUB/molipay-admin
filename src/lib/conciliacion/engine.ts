import type { BankRow } from "./parse";
import type { Movimiento } from "@/lib/api/types";

export type CruceEstado = "conciliado" | "no_encontrado" | "monto_diferencia" | "no_completada" | "solo_plataforma";

export type CruceItem = {
  bankRow: BankRow;
  movimiento: Movimiento | null;
  estado: CruceEstado;
  detalle: string;
  diffMonto?: number;
};

export type AnalisisResumen = {
  total: number; // filas banco (excluyendo vacías)
  encontrados: number; // conciliados exactos
  noEncontrados: number; // banco sin match en plataforma
  noCompletados: number; // ESTADO_COELSA = NO COMPLETADA
  diferenciasMonto: number;
  soloPlataforma: number; // en plataforma no está en banco
  depositos: { total: number; encontrados: number };
  retiros: { total: number; encontrados: number };
  idsDepositosNoEncontrados: string[]; // ID_DEBIN
  idsRetirosNoEncontrados: string[];
  idsDiferenciaMonto: string[];
  soloPlataformaIds: string[]; // id_txn plataforma sin banco
  items: CruceItem[]; // para tabla detalle
  fechaAnalisis: string;
};

function absMonto(n: number): number {
  return Math.abs(n);
}

function montoIgual(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(absMonto(a) - absMonto(b)) <= tol;
}

function isCredito(tipo: string): boolean {
  return tipo.trim().toUpperCase() === "CREDITO";
}
function isDebito(tipo: string): boolean {
  return tipo.trim().toUpperCase() === "DEBITO";
}

function parseBancoFechaHora(s: string): Date | null {
  // "03/09/2026 00:11:55" o "3/9/2026"
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3]);
  const h = m[4] ? Number(m[4]) : 0, mi = m[5] ? Number(m[5]) : 0, se = m[6] ? Number(m[6]) : 0;
  return new Date(y, mo, d, h, mi, se);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function cruzarConciliacion(bankRows: BankRow[], movimientos: Movimiento[]): AnalisisResumen {
  const total = bankRows.length;
  const byIdTxn = new Map<string, Movimiento>();
  for (const m of movimientos) {
    byIdTxn.set(m.idTxn.trim(), m);
    byIdTxn.set(m.idTxn.trim().toUpperCase(), m);
  }
  // Índice secundario por |monto| + día para fallback cuando ID no matchea (títulos distintos)
  const byMontoDia = new Map<string, Movimiento[]>();
  for (const m of movimientos) {
    const dayKey = m.fecha ? new Date(m.fecha).toISOString().slice(0, 10) : "";
    const key = `${Math.abs(m.montoOperacion).toFixed(2)}|${dayKey}`;
    const arr = byMontoDia.get(key) ?? [];
    arr.push(m);
    byMontoDia.set(key, arr);
  }

  let encontrados = 0;
  let noEncontrados = 0;
  let noCompletados = 0;
  let diferenciasMonto = 0;

  let depTotal = 0;
  let retTotal = 0;
  let depEncontrados = 0;
  let retEncontrados = 0;

  const idsDepositosNoEncontrados: string[] = [];
  const idsRetirosNoEncontrados: string[] = [];
  const idsDiferenciaMonto: string[] = [];
  const items: CruceItem[] = [];

  const bankIdsSet = new Set<string>();

  for (const b of bankRows) {
    bankIdsSet.add(b.idDebin.trim());
    bankIdsSet.add(b.idDebin.trim().toUpperCase());
    const credito = isCredito(b.tipoMovCoelsa);
    const debito = isDebito(b.tipoMovCoelsa);
    if (credito) depTotal++;
    if (debito) retTotal++;

    // NO COMPLETADA -> no se concilia, se cuenta aparte y no se busca en plataforma
    if (b.estadoCoelsa.trim().toUpperCase() === "NO COMPLETADA") {
      noCompletados++;
      items.push({ bankRow: b, movimiento: null, estado: "no_completada", detalle: "NO COMPLETADA (banco)" });
      continue;
    }

    // Clave exacta ID_DEBIN == id_txn
    let mov = byIdTxn.get(b.idDebin.trim()) ?? byIdTxn.get(b.idDebin.trim().toUpperCase()) ?? null;
    let fallback = false;

    if (!mov) {
      // Fallback: mismo |monto| + mismo día (FECHA_HORA_COELSA vs movimiento.fecha)
      const dBanco = parseBancoFechaHora(b.fechaHoraCoelsa || b.fechaNegocio);
      if (dBanco) {
        const dayKey = dBanco.toISOString().slice(0, 10);
        const key = `${Math.abs(b.importeCoelsa).toFixed(2)}|${dayKey}`;
        const cands = byMontoDia.get(key) ?? [];
        if (cands.length === 1) {
          mov = cands[0];
          fallback = true;
        } else if (cands.length > 1) {
          // si hay varios con mismo monto+día, desempatar por CVU si existe
          const byCvu = cands.find((c) => c.cvu && b.cvu && c.cvu.trim() === b.cvu.trim());
          if (byCvu) {
            mov = byCvu;
            fallback = true;
          }
        }
      }
    }

    if (!mov) {
      noEncontrados++;
      if (credito) idsDepositosNoEncontrados.push(b.idDebin);
      if (debito) idsRetirosNoEncontrados.push(b.idDebin);
      items.push({ bankRow: b, movimiento: null, estado: "no_encontrado", detalle: "Sin match por ID_DEBIN (ni fallback monto+fecha) en plataforma" });
      continue;
    }

    // Existe mov: comparar monto (abs) — si vino por fallback ya coincide por construcción
    if (!fallback && !montoIgual(b.importeCoelsa, mov.montoOperacion)) {
      diferenciasMonto++;
      idsDiferenciaMonto.push(b.idDebin);
      items.push({
        bankRow: b,
        movimiento: mov,
        estado: "monto_diferencia",
        detalle: `Monto difiere banco ${b.importeCoelsa} vs plataforma ${mov.montoOperacion}`,
        diffMonto: absMonto(b.importeCoelsa) - absMonto(mov.montoOperacion),
      });
      continue;
    }

    encontrados++;
    if (credito) depEncontrados++;
    if (debito) retEncontrados++;
    items.push({ bankRow: b, movimiento: mov, estado: "conciliado", detalle: fallback ? "Conciliado por fallback |monto|+fecha (ID distinto)" : "Conciliado por ID_DEBIN + monto" });
  }

  // Solo en plataforma: mov cuyo id_txn no está en banco (útil para detectar faltantes del banco)
  let soloPlataforma = 0;
  const soloPlataformaIds: string[] = [];
  for (const m of movimientos) {
    if (!bankIdsSet.has(m.idTxn.trim()) && !bankIdsSet.has(m.idTxn.trim().toUpperCase())) {
      soloPlataforma++;
      soloPlataformaIds.push(m.idTxn);
    }
  }

  const now = new Date();
  const fechaAnalisis = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    total,
    encontrados,
    noEncontrados,
    noCompletados,
    diferenciasMonto,
    soloPlataforma,
    depositos: { total: depTotal, encontrados: depEncontrados },
    retiros: { total: retTotal, encontrados: retEncontrados },
    idsDepositosNoEncontrados,
    idsRetirosNoEncontrados,
    idsDiferenciaMonto,
    soloPlataformaIds,
    items,
    fechaAnalisis,
  };
}

// Helper para cuando no hay Supabase: resumen solo del banco (sin cruce)
export function resumenSoloBanco(bankRows: BankRow[]): AnalisisResumen {
  return cruzarConciliacion(bankRows, []);
}
