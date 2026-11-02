import type { Alicuota, FuenteAlicuota } from "@/lib/api/types";
import { ETIQUETA_DIRECCION, formatValor, vigenteHoy } from "@/lib/impuestos-format";

/**
 * Alicuotas vigentes hoy, segun la fuente del impuesto. `direccion` filtra las
 * que aplican a una sola direccion (las de "Ambas" siempre aplican).
 */
export function ResumenAlicuota({
  fuente,
  alicuotas,
  direccion,
}: {
  fuente: FuenteAlicuota;
  alicuotas: Alicuota[];
  direccion?: "Entrante" | "Saliente";
}) {
  if (fuente === "Padrón")
    return (
      <span className="text-xs text-muted-foreground">
        {direccion === "Saliente" ? "0% (el padrón solo aplica a Pay-In)" : "Según padrón"}
      </span>
    );
  if (fuente === "Manual")
    return <span className="text-xs text-muted-foreground">Por cliente</span>;
  const vigentes = alicuotas
    .filter(vigenteHoy)
    .filter((a) => !direccion || a.direccion === direccion || a.direccion === "Ambas");
  if (vigentes.length === 0)
    return <span className="text-xs text-amber-700">Sin alícuota vigente</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {vigentes.map((a) => (
        <span
          key={a.id}
          className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
          title={`${a.codigo} · ${ETIQUETA_DIRECCION[a.direccion]}`}
        >
          {formatValor(a)}
          {a.direccion !== "Ambas" && (
            <span className="text-muted-foreground">
              {a.direccion === "Entrante" ? "IN" : "OUT"}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
