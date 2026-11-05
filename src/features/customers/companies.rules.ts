export const PAGE_SIZES = [10, 20, 50];

/**
 * Etiqueta corta del tipo societario a partir de `clientes.tipo_sociedad`.
 * Si no matchea ninguno conocido, devuelve el texto original truncado.
 */
export function kindCompanyToLabel(kind: string | null | undefined): string {
  if (!kind) return "—";
  const t = kind.trim().toLowerCase();
  if (t.includes("srl") || t.includes("responsabilidad limitada")) return "SRL";
  if (t.includes("sas")) return "SAS";
  if (
    t.includes(" sa") ||
    t.startsWith("sa") ||
    t.includes("sociedad anonima") ||
    t.includes("sociedad anónima")
  )
    return "SA";
  if (t.includes("sca") || t.includes("colectiva")) return "SCA";
  if (t.includes("scpa") || t.includes("comandita por acciones")) return "SCpA";
  if (t.includes("sc") || t.includes("comandita simple")) return "SC";
  if (t.includes("civil")) return "SCivil";
  // Fallback: truncar a 6 caracteres para no romper el ancho de la columna.
  return kind.length > 6 ? kind.slice(0, 6) : kind;
}
