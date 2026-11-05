export const PAGE_SIZES = [10, 20, 50];

// Columnas PLAFT (Riesgo, PEP, Perfil) ocultadas por decisión de Compliance.
// El nivel de riesgo es 100% manual; mostrar el valor calculado automáticamente
// carece de sentido regulatorio. Ver src/lib/feature-flags.ts.
export const PLAFT_KEYS = new Set(["riesgo", "esPep", "consumoMensualPct"]);
