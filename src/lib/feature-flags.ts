/**
 * Feature flags centralizados.
 *
 * Regla general: todos los flags que afecten al backoffice viven acá.
 * Esto permite que Compliance o legales cambien una decisión sin
 * tocar el código de las pages — se prende/apaga en un solo lugar.
 *
 * Convención: usar `false` por default cuando una funcionalidad nueva
 * no tiene una decisión formal del área responsable.
 *
 * Documentar quién pidió el cambio y cuándo, así no perdemos el
 * contexto histórico si el flag se vuelve a discutir.
 */

/**
 * PLAFT — Nivel de riesgo PEP, Perfil Transaccional.
 *
 * Decisión 2026-10-10 (Compliance): el cálculo del nivel de riesgo es
 * 100% manual. La columna PLAFT (Riesgo, PEP, Perfil) queda oculta
 * en la tabla principal del backoffice para no exponer al operador
 * un valor que el sistema no calcula.
 *
 * Los datos (tabla `cliente_perfil_riesgo`, view `v_cliente_riesgo_vigente`,
 * APIs `getClientesEnrichment`, modal de edición PLAFT en la ficha) NO se
 * borran: siguen siendo operables desde la ficha de cada cliente, donde
 * Compliance registra las evaluaciones manuales.
 *
 * Cuando Compliance defina la matriz documentada y se automatice el
 * cálculo, se cambia `SHOW_PLAFT_COLUMNS` a `true` y las columnas
 * vuelven sin tocar más código.
 */
export const SHOW_PLAFT_COLUMNS = false;
