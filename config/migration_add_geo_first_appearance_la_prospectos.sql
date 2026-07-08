-- ============================================================
-- Migración: columnas de PRIMERA APARICIÓN (keyword base + geo)
-- Archivo:  config/migration_add_geo_first_appearance_la_prospectos.sql
-- Fecha:    2026-07-08
-- Bloque:   LM-003A-B — Brokers / productores / organizadores
-- Estado:   LISTO PARA REVISIÓN / NO EJECUTADO
-- ============================================================
-- Objetivo:
--   Agregar a la_prospectos las columnas estructuradas de la
--   primera aparición del prospecto, según la regla:
--     "una fila por landing, con la primera keyword base +
--      localidad de búsqueda + geo con que apareció".
--
--   Columnas agregadas (todas NULLABLE, no rompen el flujo actual
--   sin geo de run-db-batch.js):
--     - keyword_base          VARCHAR(255)
--     - localidad_busqueda    VARCHAR(150)
--     - geo_keyword_id_first  INT
--     - geo_key_first         VARCHAR(180)
--
--   created_at actúa como marca de primera aparición (no se agrega
--   first_seen_at).
--
-- Referencias:
--   docs/02-ARQUITECTURA/ADR-2026-07-08-identidad-prospecto-por-landing.md
--   docs/05-REPORTES/2026-07/2026-07-08-lm-grill-verificacion-primera-aparicion-keyword-geo.md
-- ============================================================
-- Esquema real verificado (SHOW CREATE TABLE la_prospectos, 2026-07-08):
--   columnas: id, palabra_clave, url_anuncio, url_landing,
--             texto_extraido, fecha_hora, es_valido, metadata,
--             created_at, updated_at, url_landing_hash (STORED)
--   índice único actual: uq_prospectos_keyword_url_hash
--                        (palabra_clave, url_landing_hash)
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin revisión humana previa y aprobación explícita.
--   - Idempotente: cada columna se agrega solo si no existe.
--   - NO toca el índice único uq_prospectos_keyword_url_hash.
--     Migrar a unicidad por landing es un paso destructivo aparte
--     y gated (requiere auditar/deduplicar datos existentes).
-- ============================================================

USE iunaorg_dyd;

SET @schema_name := DATABASE();

-- ------------------------------------------------------------
-- 1) keyword_base
-- ------------------------------------------------------------
SET @sql_kw_base := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'la_prospectos'
        AND column_name = 'keyword_base'
    ),
    'SELECT ''ℹ️ Columna keyword_base ya existe'' AS info',
    'ALTER TABLE la_prospectos
       ADD COLUMN keyword_base VARCHAR(255) NULL
       COMMENT ''Keyword base sin modificador geográfico, primera aparición''
       AFTER palabra_clave'
  )
);
PREPARE stmt_kw_base FROM @sql_kw_base;
EXECUTE stmt_kw_base;
DEALLOCATE PREPARE stmt_kw_base;

-- ------------------------------------------------------------
-- 2) localidad_busqueda
-- ------------------------------------------------------------
SET @sql_localidad := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'la_prospectos'
        AND column_name = 'localidad_busqueda'
    ),
    'SELECT ''ℹ️ Columna localidad_busqueda ya existe'' AS info',
    'ALTER TABLE la_prospectos
       ADD COLUMN localidad_busqueda VARCHAR(150) NULL
       COMMENT ''Localidad de búsqueda de la primera aparición''
       AFTER keyword_base'
  )
);
PREPARE stmt_localidad FROM @sql_localidad;
EXECUTE stmt_localidad;
DEALLOCATE PREPARE stmt_localidad;

-- ------------------------------------------------------------
-- 3) geo_keyword_id_first
-- ------------------------------------------------------------
SET @sql_geo_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'la_prospectos'
        AND column_name = 'geo_keyword_id_first'
    ),
    'SELECT ''ℹ️ Columna geo_keyword_id_first ya existe'' AS info',
    'ALTER TABLE la_prospectos
       ADD COLUMN geo_keyword_id_first INT NULL
       COMMENT ''la_cat_geo_keywords_ar.id de la primera aparición''
       AFTER localidad_busqueda'
  )
);
PREPARE stmt_geo_id FROM @sql_geo_id;
EXECUTE stmt_geo_id;
DEALLOCATE PREPARE stmt_geo_id;

-- ------------------------------------------------------------
-- 4) geo_key_first
-- ------------------------------------------------------------
SET @sql_geo_key := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'la_prospectos'
        AND column_name = 'geo_key_first'
    ),
    'SELECT ''ℹ️ Columna geo_key_first ya existe'' AS info',
    'ALTER TABLE la_prospectos
       ADD COLUMN geo_key_first VARCHAR(180) NULL
       COMMENT ''la_cat_geo_keywords_ar.geo_key de la primera aparición''
       AFTER geo_keyword_id_first'
  )
);
PREPARE stmt_geo_key FROM @sql_geo_key;
EXECUTE stmt_geo_key;
DEALLOCATE PREPARE stmt_geo_key;

-- ------------------------------------------------------------
-- 5) Verificación final (solo lectura)
-- ------------------------------------------------------------
SELECT
  column_name,
  column_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'la_prospectos'
  AND column_name IN (
    'keyword_base',
    'localidad_busqueda',
    'geo_keyword_id_first',
    'geo_key_first'
  )
ORDER BY ordinal_position;
