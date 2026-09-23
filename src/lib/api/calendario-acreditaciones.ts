import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { metodosPagoIniciales } from "@/data/metodos-pago";

export type CalendarioAcreditacion = {
  fechaVenta: string;
  fechaEstimadaAcreditacion: string;
  comercioId: string;
  comercioNombre: string;
  comercioLegajo: string;
  bandera: string;
  diasHabiles: number;
  importeBruto: number;
  estado: "pendiente" | "acreditado";
};

export type CalendarioFilters = {
  mes: number; // 1-12
  anio: number;
  comercioId?: string;
  bandera?: string;
};

const diasHabilesPorMarca: Record<string, number> = metodosPagoIniciales.reduce(
  (acc, m) => {
    const marca = m.nombre.split(" ")[0].toUpperCase();
    if (!acc[marca] || m.diasHabiles > acc[marca]) {
      acc[marca] = m.diasHabiles;
    }
    return acc;
  },
  {} as Record<string, number>
);

function obtenerDiasHabiles(bandera: string): number {
  const marca = bandera.toUpperCase().replace(/[^A-Z]/g, "");
  return diasHabilesPorMarca[marca] ?? 20;
}

export async function listCalendarioAcreditaciones(
  filters: CalendarioFilters
): Promise<CalendarioAcreditacion[]> {
  const sb = requireSupabase();
  const { mes, anio, comercioId, bandera } = filters;

  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);

  let query = sb
    .from("v_lotes_venta")
    .select(
      "fecha, comercio_id, bandera, cantidad_operaciones, importe_bruto, importe_neto, comercios(id, usuario, legajo, nombre_comercio)"
    )
    .gte("fecha", primerDia.toISOString().slice(0, 10))
    .lte("fecha", ultimoDia.toISOString().slice(0, 10));

  if (comercioId) query = query.eq("comercio_id", comercioId);
  if (bandera) query = query.eq("bandera", bandera);

  const { data, error } = await query;
  if (error) throw new DataAccessError(error);

  const { data: lotesAcreditacion } = await sb
    .from("lotes_acreditacion")
    .select("fecha, comercio_id, bandera, estado")
    .gte("fecha", primerDia.toISOString().slice(0, 10))
    .lte("fecha", ultimoDia.toISOString().slice(0, 10));

  const acreditadosSet = new Set(
    (lotesAcreditacion ?? [])
      .filter((l: any) => l.estado === "Acreditado")
      .map(
        (l: any) =>
          `${l.comercio_id}-${l.bandera}-${new Date(l.fecha).toISOString().slice(0, 10)}`
      )
  );

  const result: CalendarioAcreditacion[] = [];

  for (const row of data ?? []) {
    const comercio = Array.isArray(row.comercios) ? row.comercios[0] : null;
    const diasHabiles = obtenerDiasHabiles(row.bandera);
    const fechaVenta = new Date(row.fecha);
    const fechaEstimada = agregarDiasHabiles(fechaVenta, diasHabiles);

    const key = `${row.comercio_id}-${row.bandera}-${row.fecha}`;
    const estado: "acreditado" | "pendiente" =
      acreditadosSet.has(key) || new Date() > fechaEstimada
        ? "acreditado"
        : "pendiente";

    result.push({
      fechaVenta: row.fecha,
      fechaEstimadaAcreditacion: fechaEstimada.toISOString().slice(0, 10),
      comercioId: row.comercio_id,
      comercioNombre: comercio?.nombre_comercio ?? comercio?.usuario ?? "—",
      comercioLegajo: comercio?.legajo ?? row.comercio_id,
      bandera: row.bandera,
      diasHabiles,
      importeBruto: Number(row.importe_bruto),
      estado,
    });
  }

  return result;
}

function agregarDiasHabiles(fecha: Date, dias: number): Date {
  const result = new Date(fecha);
  let diasAgregados = 0;

  while (diasAgregados < dias) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      diasAgregados++;
    }
  }

  return result;
}
