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

export function cruzarConciliacion(bankRows: BankRow[], movimientos: Movimiento[]): AnalisisResumen {
  const total = bankRows.length;
  const byIdTxn = new Map<string, Movimiento>();
  for (const m of movimientos) {
    // id_txn exacto; también indexar sin trim para robustez
    byIdTxn.set(m.idTxn.trim(), m);
    byIdTxn.set(m.idTxn.trim().toUpperCase(), m);
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
    const mov = byIdTxn.get(b.idDebin.trim()) ?? byIdTxn.get(b.idDebin.trim().toUpperCase()) ?? null;

    if (!mov) {
      noEncontrados++;
      if (credito) idsDepositosNoEncontrados.push(b.idDebin);
      if (debito) idsRetirosNoEncontrados.push(b.idDebin);
      items.push({ bankRow: b, movimiento: null, estado: "no_encontrado", detalle: "Sin match por ID_DEBIN en plataforma" });
      continue;
    }

    // Existe mov: comparar monto (abs)
    if (!montoIgual(b.importeCoelsa, mov.montoOperacion)) {
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

    // (opcional) validar tipo compatible: CREDITO~deposito/cobro, DEBITO~retiro/pago
    // no bloqueante: solo warning si no coincide, pero se considera conciliado si monto ok
    encontrados++;
    if (credito) depEncontrados++;
    if (debito) retEncontrados++;
    items.push({ bankRow: b, movimiento: mov, estado: "conciliado", detalle: "Conciliado por ID_DEBIN + monto" });
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
