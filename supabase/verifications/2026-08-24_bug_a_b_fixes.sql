-- ============================================================================
-- VERIFICACIÓN: BUG A (count exacto con filtros en Movimientos)
--              BUG B (legajo en buscador de Impuestos-Asignaciones)
-- FECHA: 2026-08-24 | Mismo commit que los fixes (movimientos.ts / impuestos.ts)
-- ============================================================================
--
-- Contexto de los fixes:
--   * BUG A (Opción 1): listMovimientos usa count=exact cuando hay CUALQUIER
--     filtro/search/fecha; estimated solo en la query base sin filtros.
--   * BUG B: el .or() del buscador de impuestos_asignaciones ahora incluye
--     legajo.ilike (antes solo impuestos.codigo / impuestos.nombre).
--
-- No requiere credenciales distintas: son consultas de lectura sobre las
-- mismas tablas que la app consulta.

-- ── BUG A: el conteo filtrado debe ser EXACTO (no el estimado del planner) ──
-- 1) Conteo REAL filtrado (fuente de verdad que ahora devuelve la UI):
SELECT count(*) AS total_real
FROM movimientos
WHERE legajo = 'LPF-TULEGAJO';

-- 2) Estimado del planner que ANTES devolvía count=estimated (sub-estimaba →
--    paginación desincronizada, "3 páginas" en lugar de decenas de miles):
EXPLAIN (FORMAT JSON) SELECT 1 FROM movimientos WHERE legajo = 'LPF-TULEGAJO';
--    Comparar: total_real (punto 1) es lo que la UI muestra; el "Plan Rows"
--    del EXPLAIN suele ser menor y era la causa del bug. Con filtros más
--    restrictivos la brecha crece.

-- ── BUG B: el buscador de impuestos_asignaciones ahora cubre legajo ──
-- 3) Legajos que SÍ tienen asignaciones (usar uno de estos para probar el
--    buscador y ver > 0 resultados):
SELECT legajo, count(*) AS asignaciones
FROM impuestos_asignaciones
GROUP BY legajo
ORDER BY asignaciones DESC
LIMIT 10;

-- 4) Con un legajo real con datos, el buscador (legajo.ilike) debe devolver > 0
--    (reemplazar 'LPF-XXXXXXXXXXX' por un legajo del punto 3):
SELECT count(*) AS encontrados
FROM impuestos_asignaciones
WHERE legajo ILIKE '%LPF-XXXXXXXXXXX%';
--    Antes del fix esto devolvía 0 (el .or() solo cubría impuestos.codigo /
--    impuestos.nombre). LPF-20000002603: si ese legajo no tiene asignaciones,
--    el buscador correctamente devuelve 0 — NO es bug. Para ver > 0 usar un
--    legajo del punto 3.

-- ── Movimientos: el buscador ya funcionaba (legajo.ilike presente) ──
-- 5) Confirma que pegar un legajo real completo encuentra resultados:
SELECT count(*) AS encontrados
FROM movimientos
WHERE legajo ILIKE '%LPF-TULEGAJO%'
   OR id_txn ILIKE '%LPF-TULEGAJO%';
--    Si > 0, el buscador de Movimientos siempre estuvo bien; la percepción de
--    "no busca" era el efecto visual de BUG A (encontraba pero no dejaba
--    navegar hasta verlos).
