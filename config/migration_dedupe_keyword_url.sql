USE leadmaster;

-- Migración: deduplicación por combinación palabra_clave + url_landing_hash
-- Objetivo:
-- 1) Garantizar columna url_landing_hash
-- 2) Remover unique por solo URL (si existe)
-- 3) Crear unique por palabra_clave + url_landing_hash

SET @schema_name := DATABASE();

-- 1) Crear columna hash si no existe
SET @sql_add_column := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'prospectos'
        AND column_name = 'url_landing_hash'
    ),
    'SELECT ''ℹ️ Columna url_landing_hash ya existe'' AS info',
    'ALTER TABLE prospectos
       ADD COLUMN url_landing_hash CHAR(64)
       GENERATED ALWAYS AS (
         CASE
           WHEN url_landing IS NULL OR TRIM(url_landing) = '''' THEN NULL
           ELSE SHA2(TRIM(url_landing), 256)
         END
       ) STORED'
  )
);

PREPARE stmt_add_column FROM @sql_add_column;
EXECUTE stmt_add_column;
DEALLOCATE PREPARE stmt_add_column;

-- 2) Eliminar índice único por solo URL si existe
SET @sql_drop_old_unique := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'prospectos'
        AND index_name = 'uq_prospectos_url_landing_hash'
    ),
    'ALTER TABLE prospectos DROP INDEX uq_prospectos_url_landing_hash',
    'SELECT ''ℹ️ Índice uq_prospectos_url_landing_hash no existe'' AS info'
  )
);

PREPARE stmt_drop_old_unique FROM @sql_drop_old_unique;
EXECUTE stmt_drop_old_unique;
DEALLOCATE PREPARE stmt_drop_old_unique;

-- 3) Reportar potenciales duplicados por combinación antes de crear índice
SELECT
  COUNT(*) AS duplicated_keyword_url_groups
FROM (
  SELECT palabra_clave, url_landing_hash
  FROM prospectos
  WHERE url_landing_hash IS NOT NULL
  GROUP BY palabra_clave, url_landing_hash
  HAVING COUNT(*) > 1
) d;

-- 4) Crear índice único compuesto si no existe y si no hay duplicados por combinación
SET @has_new_unique := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'prospectos'
    AND index_name = 'uq_prospectos_keyword_url_hash'
);

SET @duplicate_groups := (
  SELECT COUNT(*)
  FROM (
    SELECT palabra_clave, url_landing_hash
    FROM prospectos
    WHERE url_landing_hash IS NOT NULL
    GROUP BY palabra_clave, url_landing_hash
    HAVING COUNT(*) > 1
  ) x
);

SET @sql_add_new_unique := (
  SELECT IF(
    @has_new_unique > 0,
    'SELECT ''ℹ️ Índice uq_prospectos_keyword_url_hash ya existe'' AS info',
    IF(
      @duplicate_groups > 0,
      'SELECT ''⚠️ No se creó índice único compuesto: hay duplicados por palabra_clave + url_landing_hash'' AS warning',
      'ALTER TABLE prospectos
         ADD UNIQUE INDEX uq_prospectos_keyword_url_hash (palabra_clave, url_landing_hash)'
    )
  )
);

PREPARE stmt_add_new_unique FROM @sql_add_new_unique;
EXECUTE stmt_add_new_unique;
DEALLOCATE PREPARE stmt_add_new_unique;

SHOW INDEX FROM prospectos WHERE Key_name IN ('uq_prospectos_url_landing_hash', 'uq_prospectos_keyword_url_hash');
