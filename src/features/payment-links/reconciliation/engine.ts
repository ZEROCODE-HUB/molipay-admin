import type { BankRow } from "@/features/payment-links/reconciliation/parse";
import type { Movement } from "@/infrastructure/supabase/legacy/types";

export type CruceStatus =
  | "conciliado"
  | "no_encontrado"
  | "monto_diferencia"
  | "no_completada"
  | "solo_plataforma";

export type CruceItem = {
  bankRow: BankRow;
  movimiento: Movement | null;
  estado: CruceStatus;
  detalle: string;
  diffMonto?: number;
};

export type AnalysisSummary = {
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

function absAmount(n: number): number {
  return Math.abs(n);
}

function amountIgual(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(absAmount(a) - absAmount(b)) <= tol;
}

function isCredito(kind: string): boolean {
  return kind.trim().toUpperCase() === "CREDITO";
}
function isDebito(kind: string): boolean {
  return kind.trim().toUpperCase() === "DEBITO";
}

function parseBankDateHour(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?/);
  if (!m) return null;
  const d = Number(m[1]),
    mo = Number(m[2]) - 1,
    y = Number(m[3]);
  const h = m[4] ? Number(m[4]) : 0,
    mi = m[5] ? Number(m[5]) : 0,
    se = m[6] ? Number(m[6]) : 0;
  return new Date(y, mo, d, h, mi, se);
}

export function cruzarReconciliation(bankRows: BankRow[], movements: Movement[]): AnalysisSummary {
  const total = bankRows.length;
  const byIdTxn = new Map<string, Movement>();
  for (const m of movements) {
    byIdTxn.set(m.idTxn.trim(), m);
    byIdTxn.set(m.idTxn.trim().toUpperCase(), m);
  }
  // Índice secundario por |monto| + día para fallback cuando ID no matchea (títulos distintos)
  const byAmountDay = new Map<string, Movement[]>();
  for (const m of movements) {
    const dayKey = m.fecha ? new Date(m.fecha).toISOString().slice(0, 10) : "";
    const key = `${Math.abs(m.montoOperacion).toFixed(2)}|${dayKey}`;
    const arr = byAmountDay.get(key) ?? [];
    arr.push(m);
    byAmountDay.set(key, arr);
  }

  let founds = 0;
  let noFounds = 0;
  let noCompletados = 0;
  let diferenciasAmount = 0;

  let depTotal = 0;
  let retTotal = 0;
  let depFounds = 0;
  let retFounds = 0;

  const idsDepositosNoFounds: string[] = [];
  const idsRetirosNoFounds: string[] = [];
  const idsDiferenciaAmount: string[] = [];
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
      items.push({
        bankRow: b,
        movimiento: null,
        estado: "no_completada",
        detalle: "NO COMPLETADA (banco)",
      });
      continue;
    }

    // Clave exacta ID_DEBIN == id_txn
    let mov = byIdTxn.get(b.idDebin.trim()) ?? byIdTxn.get(b.idDebin.trim().toUpperCase()) ?? null;
    let fallback = false;

    if (!mov) {
      // Fallback: mismo |monto| + mismo día (FECHA_HORA_COELSA vs movimiento.fecha)
      const dBank = parseBankDateHour(b.fechaHoraCoelsa || b.fechaNegocio);
      if (dBank) {
        const dayKey = dBank.toISOString().slice(0, 10);
        const key = `${Math.abs(b.importeCoelsa).toFixed(2)}|${dayKey}`;
        const cands = byAmountDay.get(key) ?? [];
        if (cands.length === 1) {
          mov = cands[0];
          fallback = true;
        } else if (cands.length > 1) {
          const byCvu = cands.find((c) => c.cvu && b.cvu && c.cvu.trim() === b.cvu.trim());
          mov = byCvu ?? cands[0];
          fallback = true;
        }
      }
    }

    if (!mov) {
      noFounds++;
      if (credito) idsDepositosNoFounds.push(b.idDebin);
      if (debito) idsRetirosNoFounds.push(b.idDebin);
      items.push({
        bankRow: b,
        movimiento: null,
        estado: "no_encontrado",
        detalle: "Sin match por ID_DEBIN (ni fallback monto+fecha) en plataforma",
      });
      continue;
    }

    // Existe mov: comparar monto (abs) — si vino por fallback ya coincide por construcción
    if (!fallback && !amountIgual(b.importeCoelsa, mov.montoOperacion)) {
      diferenciasAmount++;
      idsDiferenciaAmount.push(b.idDebin);
      items.push({
        bankRow: b,
        movimiento: mov,
        estado: "monto_diferencia",
        detalle: `Monto difiere banco ${b.importeCoelsa} vs plataforma ${mov.montoOperacion}`,
        diffMonto: absAmount(b.importeCoelsa) - absAmount(mov.montoOperacion),
      });
      continue;
    }

    founds++;
    if (credito) depFounds++;
    if (debito) retFounds++;
    items.push({
      bankRow: b,
      movimiento: mov,
      estado: "conciliado",
      detalle: fallback
        ? "Conciliado por fallback |monto|+fecha (ID distinto)"
        : "Conciliado por ID_DEBIN + monto",
    });
  }

  // Solo en plataforma: mov cuyo id_txn no está en banco (útil para detectar faltantes del banco)
  let onlyPlataforma = 0;
  const onlyPlataformaIds: string[] = [];
  for (const m of movements) {
    if (!bankIdsSet.has(m.idTxn.trim()) && !bankIdsSet.has(m.idTxn.trim().toUpperCase())) {
      onlyPlataforma++;
      onlyPlataformaIds.push(m.idTxn);
    }
  }

  const now = new Date();
  const dateAnalysis = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    total,
    encontrados: founds,
    noEncontrados: noFounds,
    noCompletados,
    diferenciasMonto: diferenciasAmount,
    soloPlataforma: onlyPlataforma,
    depositos: { total: depTotal, encontrados: depFounds },
    retiros: { total: retTotal, encontrados: retFounds },
    idsDepositosNoEncontrados: idsDepositosNoFounds,
    idsRetirosNoEncontrados: idsRetirosNoFounds,
    idsDiferenciaMonto: idsDiferenciaAmount,
    soloPlataformaIds: onlyPlataformaIds,
    items,
    fechaAnalisis: dateAnalysis,
  };
}

// Helper para cuando no hay Supabase: resumen solo del banco (sin cruce)
export function summaryOnlyBank(bankRows: BankRow[]): AnalysisSummary {
  return cruzarReconciliation(bankRows, []);
}
