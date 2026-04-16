USE leadmaster;

-- Migración segura e idempotente para deduplicación por URL landing.
-- 1) Agrega columna generada url_landing_hash (SHA-256 normalizando espacios)
-- 2) Verifica duplicados por hash
-- 3) Crea índice único si no hay duplicados

SET @schema_name := DATABASE();

-- 1) Crear columna generada si no existe
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

-- 2) Reportar duplicados (si los hay)
SELECT
  COUNT(*) AS duplicated_hash_groups
FROM (
  SELECT url_landing_hash
  FROM prospectos
  WHERE url_landing_hash IS NOT NULL
  GROUP BY url_landing_hash
  HAVING COUNT(*) > 1
) d;

-- 3) Crear índice único solo si no existe y si no hay duplicados
SET @has_unique_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'prospectos'
    AND index_name = 'uq_prospectos_url_landing_hash'
);

SET @duplicate_groups := (
  SELECT COUNT(*)
  FROM (
    SELECT url_landing_hash
    FROM prospectos
    WHERE url_landing_hash IS NOT NULL
    GROUP BY url_landing_hash
    HAVING COUNT(*) > 1
  ) x
);

SET @sql_add_unique := (
  SELECT IF(
    @has_unique_index > 0,
    'SELECT ''ℹ️ Índice único uq_prospectos_url_landing_hash ya existe'' AS info',
    IF(
      @duplicate_groups > 0,
      'SELECT ''⚠️ No se creó índice único: hay duplicados por url_landing_hash'' AS warning',
      'ALTER TABLE prospectos
         ADD UNIQUE INDEX uq_prospectos_url_landing_hash (url_landing_hash)'
    )
  )
);

PREPARE stmt_add_unique FROM @sql_add_unique;
EXECUTE stmt_add_unique;
DEALLOCATE PREPARE stmt_add_unique;

-- Estado final
SHOW INDEX FROM prospectos WHERE Key_name = 'uq_prospectos_url_landing_hash';
