-- ============================================================
-- Verificación: palabra_clave en la_prospectos
--                vs
--                la_cat_geo_keywords_ar
-- Archivo:  config/verify_keyword_geo_capture.sql
-- Fecha:    2026-07-08
-- Bloque:   LM-003A-B — Brokers / productores / organizadores
-- Estado:   LISTO PARA REVISIÓN / NO EJECUTADO
-- ============================================================
-- Objetivo:
--   Verificar que la_prospectos.palabra_clave captura la
--   palabra clave base más el modificador geográfico, y que
--   la_cat_geo_keywords_ar funciona como catálogo de
--   modificadores para búsquedas territoriales.
--
-- Contexto del flujo:
--
--   ll_keywords_leadmaster.keyword       (ej: "broker de seguros")
--            +
--   la_cat_geo_keywords_ar.modificador_busqueda  (ej: "Cordoba")
--            =
--   query_google = "broker de seguros Cordoba"
--            ↓
--   scraper-local.js recibe query como argumento
--            ↓
--   POST /api/prospectos { keyword: query }
--            ↓
--   la_prospectos.palabra_clave = query
--
-- Brecha actual (2026-07-08):
--   run-db-batch.js NO lee la_cat_geo_keywords_ar. Pasa solo
--   la keyword base al scraper. run-geo-db-batch.js (CROSS JOIN)
--   está planeado pero no implementado.
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin revisión humana previa.
--   - Son queries de solo lectura (SELECT).
--   - No modifican datos.
-- ============================================================
-- IMPORTANTE (alcance de esta verificación):
--   Las secciones 1 a 4 solo validan trazabilidad geográfica
--   embebida dentro de la_prospectos.palabra_clave (vía LIKE).
--   NO validan primera aparición ni localidad estructurada.
--   Para "primera aparición del prospecto con keyword base +
--   localidad de búsqueda" se usan las columnas estructuradas
--   (keyword_base, localidad_busqueda, geo_keyword_id_first,
--   geo_key_first): ver SECCIÓN 5. El matching por LIKE puede
--   producir falsos positivos y no identifica qué geo originó
--   realmente la búsqueda.
-- ============================================================

USE iunaorg_dyd;

-- ============================================================
-- SECCIÓN 1: Prospectos con trazabilidad geográfica positiva
--
-- Muestra prospectos cuyo palabra_clave contiene al menos un
-- modificador geográfico activo del catálogo. Si palabra_clave
-- fue armada como "keyword + modificador_busqueda", estos
-- prospectos deberían aparecer aquí.
-- ============================================================

SELECT
    p.id               AS prospecto_id,
    p.palabra_clave,
    p.url_landing,
    p.created_at,
    geo.modificador_busqueda,
    geo.modificador_normalizado,
    geo.tipo_ubicacion,
    geo.geo_key
FROM la_prospectos p
INNER JOIN la_cat_geo_keywords_ar geo
    ON p.palabra_clave LIKE CONCAT('%', geo.modificador_busqueda, '%')
WHERE geo.activa = 1
ORDER BY p.created_at DESC
LIMIT 50;

-- ============================================================
-- SECCIÓN 2: Prospectos SIN trazabilidad geográfica
--
-- Muestra prospectos cuyo palabra_clave NO contiene ningún
-- modificador del catálogo activo. Indica capturas hechas con
-- solo la keyword base (run-db-batch.js actual) o con
-- modificadores no catalogados.
-- ============================================================

SELECT
    p.id               AS prospecto_id,
    p.palabra_clave,
    p.url_landing,
    p.created_at
FROM la_prospectos p
WHERE NOT EXISTS (
    SELECT 1
    FROM la_cat_geo_keywords_ar geo
    WHERE geo.activa = 1
      AND p.palabra_clave LIKE CONCAT('%', geo.modificador_busqueda, '%')
)
ORDER BY p.created_at DESC
LIMIT 50;

-- ============================================================
-- SECCIÓN 3: Cobertura de modificadores geográficos
--
-- Cuántos prospectos se capturaron con cada modificador
-- geográfico activo. Permite ver qué zonas geográficas están
-- generando prospectos y cuáles no.
-- ============================================================

SELECT
    geo.modificador_busqueda,
    geo.tipo_ubicacion,
    geo.prioridad_busqueda,
    COUNT(p.id) AS prospectos_capturados
FROM la_cat_geo_keywords_ar geo
LEFT JOIN la_prospectos p
    ON p.palabra_clave LIKE CONCAT('%', geo.modificador_busqueda, '%')
WHERE geo.activa = 1
GROUP BY geo.id, geo.modificador_busqueda, geo.tipo_ubicacion, geo.prioridad_busqueda
ORDER BY prospectos_capturados DESC;

-- ============================================================
-- SECCIÓN 4: Resumen estadístico rápido
-- ============================================================

SELECT
    (SELECT COUNT(*) FROM la_prospectos)                              AS total_prospectos,
    (SELECT COUNT(*) FROM la_cat_geo_keywords_ar WHERE activa = 1)    AS total_geo_activos,
    (SELECT COUNT(DISTINCT p.id)
     FROM la_prospectos p
     INNER JOIN la_cat_geo_keywords_ar geo
         ON p.palabra_clave LIKE CONCAT('%', geo.modificador_busqueda, '%')
     WHERE geo.activa = 1)                                            AS prospectos_con_traza_geo,
    (SELECT COUNT(*)
     FROM la_prospectos p
     WHERE NOT EXISTS (
         SELECT 1 FROM la_cat_geo_keywords_ar geo
         WHERE geo.activa = 1
           AND p.palabra_clave LIKE CONCAT('%', geo.modificador_busqueda, '%')
     ))                                                               AS prospectos_sin_traza_geo;

-- ============================================================
-- SECCIÓN 5: Verificación de PRIMERA APARICIÓN (estructurada)
--
-- Requiere que la migración
--   config/migration_add_geo_first_appearance_la_prospectos.sql
-- haya agregado las columnas: keyword_base, localidad_busqueda,
-- geo_keyword_id_first, geo_key_first.
--
-- Regla: un prospecto = una fila por landing, con la primera
-- keyword base + localidad + geo con que apareció. created_at
-- actúa como marca de primera aparición.
-- ============================================================

-- 5.1 Prospectos con primera aparición estructurada completa
SELECT
    p.id               AS prospecto_id,
    p.url_landing,
    p.palabra_clave,
    p.keyword_base,
    p.localidad_busqueda,
    p.geo_keyword_id_first,
    p.geo_key_first,
    p.created_at       AS primera_aparicion_at
FROM la_prospectos p
WHERE p.keyword_base IS NOT NULL
   OR p.localidad_busqueda IS NOT NULL
   OR p.geo_keyword_id_first IS NOT NULL
   OR p.geo_key_first IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 50;

-- 5.2 Consistencia de identidad por landing:
-- landings con más de una fila. Bajo la regla de "una fila por
-- landing" el resultado esperado es 0. Si aparecen filas, son
-- duplicados previos a la regla (documentados) o inserciones que
-- saltearon la deduplicación por aplicación.
SELECT
    LOWER(TRIM(TRAILING '/' FROM SUBSTRING_INDEX(p.url_landing, '?', 1))) AS landing_key,
    COUNT(*)            AS filas,
    MIN(p.created_at)   AS primera_aparicion_at,
    MAX(p.created_at)   AS ultima_aparicion_at
FROM la_prospectos p
WHERE p.url_landing IS NOT NULL AND TRIM(p.url_landing) <> ''
GROUP BY landing_key
HAVING COUNT(*) > 1
ORDER BY filas DESC, ultima_aparicion_at DESC
LIMIT 50;

-- 5.3 Cobertura por localidad de búsqueda estructurada
SELECT
    p.localidad_busqueda,
    COUNT(DISTINCT p.id) AS prospectos
FROM la_prospectos p
WHERE p.localidad_busqueda IS NOT NULL
GROUP BY p.localidad_busqueda
ORDER BY prospectos DESC;

-- ============================================================
-- DIAGNÓSTICO (2026-07-08)
-- ============================================================
--
-- Estado actual:
--
-- | Componente                          | Estado                                        |
-- |-------------------------------------|-----------------------------------------------|
-- | la_prospectos.palabra_clave         | Almacena la query completa pasada al scraper  |
-- | ll_keywords_leadmaster              | 63 filas, 13 Perfil A seguros activas         |
-- | la_cat_geo_keywords_ar              | 10 registros (seed mínimo, provincias)        |
-- | run-db-batch.js                     | NO combina keyword+geo (solo keyword base)    |
-- | run-geo-db-batch.js                 | NO existe (plan técnico, no implementado)     |
-- | sync-geo-keywords-ar.js             | Funcional para provincias, simulación dry-run |
-- | CROSS JOIN SQL (plan sección 6)     | Sintaxis correcta, listo para implementar     |
-- | Verificación post-scraper           | Pendiente (plan la exige, código no existe)   |
--
-- Si las queries de arriba muestran prospectos_con_traza_geo = 0
-- o muy bajo, la causa más probable es que run-db-batch.js no
-- está combinando keyword + geo, y run-geo-db-batch.js aún no
-- se ha creado.
--
-- Para que palabra_clave capture efectivamente la keyword más el
-- modificador geográfico, es necesario:
--
--   1. Implementar scripts/run-geo-db-batch.js según el plan en:
--      docs/05-REPORTES/2026-07/PLAN-SCRIPT-GEO-DB-BATCH-LM-003A-SEGUROS-2026-07-07.md
--
--   2. Ampliar la_cat_geo_keywords_ar más allá de las 10
--      provincias del seed mínimo (usando sync-geo-keywords-ar.js
--      con --write-sql cuando se conecte a Georef API real).
--
--   3. Activar la verificación post-scraper: consultar COUNT(*)
--      en la_prospectos antes/después de cada ejecución; si el
--      delta es 0, no actualizar trazabilidad en
--      ll_keywords_leadmaster.
-- ============================================================
