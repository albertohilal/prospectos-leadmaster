-- ============================================================
-- Migración: atribución de prospecto/evidencia en ll_envios_email
-- Archivo:  config/migration_add_campaign_attribution_to_ll_envios_email.sql
-- Fecha:    2026-07-09
-- Bloque:   LM-003A-B — Brokers / productores / organizadores
-- Estado:   LISTO PARA REVISIÓN / NO EJECUTADO
-- ============================================================
-- Objetivo:
--   Agregar a ll_envios_email las columnas que permiten persistir
--   la atribución de prospecto y evidencia desde el pipeline de
--   prospección LeadMaster, cerrando la trazabilidad entre envíos
--   de email (Dolibarr CRM) y prospectos capturados (la_prospectos).
--
--   La tabla ya referencia campaña mediante campania_email_id
--   (bigint, indexado). No se agrega una nueva columna de campaña.
--
--   Columnas agregadas (todas NULLABLE, referencias lógicas sin FK):
--     - prospecto_id         INT NULL
--     - origen_prospecto     VARCHAR(100) NULL
--     - url_landing_hash     CHAR(64) NULL
--     - metadata_atribucion  LONGTEXT NULL
--
--   prospecto_id es referencia lógica → la_prospectos.id (int).
--   No se crean foreign keys físicas.
--
--   metadata_atribucion usa LONGTEXT (no JSON nativo) por
--   compatibilidad con hosting compartido. El contenido será
--   JSON serializado a nivel aplicación.
--
--   No se crean índices UNIQUE en esta migración.
--
-- Referencias:
--   docs/05-REPORTES/2026-07/SEED-KEYWORDS-SEGUROS-LM-003A-B-2026-07-04.md
--   docs/reportes/auto-2026-06-28-remediacion-cliente-id-staging-leadmaster.md
-- ============================================================
-- Esquema verificado (SHOW CREATE TABLE ll_envios_email, 2026-07-09):
--   columnas existentes: id (bigint), societe_id, campania_email_id
--   (bigint, indexado), keyword_id, palabra_clave, vertical.
--   No existe columna prospecto_id, origen_prospecto,
--   url_landing_hash ni metadata_atribucion.
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin revisión humana previa y aprobación explícita.
--   - Idempotente: cada columna se agrega solo si no existe.
--   - Las columnas nuevas son NULLABLE: no rompen registros existentes
--     ni requieren backfill.
--   - prospecto_id es FK lógica, sin constraint físico.
--   - No se crean índices UNIQUE.
--   - Ejecución manual en MySQL Workbench. No apto para runner
--     automático (usa PREPARE/EXECUTE multi-statement).
-- ============================================================

USE iunaorg_dyd;

SET @schema_name := DATABASE();

-- ------------------------------------------------------------
-- 0) Pre-checks (solo lectura) — ejecutar primero en Workbench
-- ------------------------------------------------------------

-- 0.1) Verificar esquema real de la tabla
-- Descomentar y ejecutar manualmente en Workbench antes del ALTER:
-- SHOW CREATE TABLE ll_envios_email;

-- 0.2) Conteo de filas antes de la migración
SELECT COUNT(*) AS total_filas_antes FROM ll_envios_email;

-- 0.3) Confirmar ausencia de columnas a crear
SELECT column_name
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'll_envios_email'
  AND column_name IN (
    'prospecto_id',
    'origen_prospecto',
    'url_landing_hash',
    'metadata_atribucion'
  );
-- Debe devolver 0 filas (o solo las que ya existieran; la migración es idempotente).

-- ------------------------------------------------------------
-- 1) prospecto_id
-- ------------------------------------------------------------
SET @sql_prospecto_id := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'll_envios_email'
        AND column_name = 'prospecto_id'
    ),
    'SELECT ''ℹ️ Columna prospecto_id ya existe'' AS info',
    'ALTER TABLE ll_envios_email
       ADD COLUMN prospecto_id INT NULL
       COMMENT ''FK lógica a la_prospectos.id''
       AFTER campania_email_id'
  )
);
PREPARE stmt_prospecto_id FROM @sql_prospecto_id;
EXECUTE stmt_prospecto_id;
DEALLOCATE PREPARE stmt_prospecto_id;

-- ------------------------------------------------------------
-- 2) origen_prospecto
-- ------------------------------------------------------------
SET @sql_origen := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'll_envios_email'
        AND column_name = 'origen_prospecto'
    ),
    'SELECT ''ℹ️ Columna origen_prospecto ya existe'' AS info',
    'ALTER TABLE ll_envios_email
       ADD COLUMN origen_prospecto VARCHAR(100) NULL
       COMMENT ''Mecanismo de identificación del prospecto (ej: geo_keyword_match, url_landing_hash_match)''
       AFTER prospecto_id'
  )
);
PREPARE stmt_origen FROM @sql_origen;
EXECUTE stmt_origen;
DEALLOCATE PREPARE stmt_origen;

-- ------------------------------------------------------------
-- 3) url_landing_hash
-- ------------------------------------------------------------
SET @sql_url_hash := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'll_envios_email'
        AND column_name = 'url_landing_hash'
    ),
    'SELECT ''ℹ️ Columna url_landing_hash ya existe'' AS info',
    'ALTER TABLE ll_envios_email
       ADD COLUMN url_landing_hash CHAR(64) NULL
       COMMENT ''Hash SHA-256 del landing URL, vincula con la_prospectos.url_landing_hash''
       AFTER origen_prospecto'
  )
);
PREPARE stmt_url_hash FROM @sql_url_hash;
EXECUTE stmt_url_hash;
DEALLOCATE PREPARE stmt_url_hash;

-- ------------------------------------------------------------
-- 4) metadata_atribucion
-- ------------------------------------------------------------
SET @sql_metadata := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'll_envios_email'
        AND column_name = 'metadata_atribucion'
    ),
    'SELECT ''ℹ️ Columna metadata_atribucion ya existe'' AS info',
    'ALTER TABLE ll_envios_email
       ADD COLUMN metadata_atribucion LONGTEXT NULL
       COMMENT ''JSON serializado por aplicación con datos de atribución (score, evidencia, fuente). LONGTEXT por compatibilidad con hosting compartido.''
       AFTER url_landing_hash'
  )
);
PREPARE stmt_metadata FROM @sql_metadata;
EXECUTE stmt_metadata;
DEALLOCATE PREPARE stmt_metadata;

-- ------------------------------------------------------------
-- 5) Verificación final (solo lectura)
-- ------------------------------------------------------------
SELECT
  column_name,
  column_type,
  is_nullable,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'll_envios_email'
  AND column_name IN (
    'prospecto_id',
    'origen_prospecto',
    'url_landing_hash',
    'metadata_atribucion'
  )
ORDER BY ordinal_position;

-- ------------------------------------------------------------
-- Rollback (solo si fuese necesario, ANTES de que la aplicación
-- escriba datos productivos en estas columnas):
-- ------------------------------------------------------------
-- La migración es aditiva y las columnas son NULLABLE.
-- El rollback elimina las 4 columnas sin pérdida de datos
-- productivos porque son nuevas y sin datos escritos aún.
--
-- ⚠️  NO EJECUTAR el rollback si la aplicación ya escribió
--     datos en estas columnas.
--
-- ALTER TABLE ll_envios_email
--   DROP COLUMN metadata_atribucion,
--   DROP COLUMN url_landing_hash,
--   DROP COLUMN origen_prospecto,
--   DROP COLUMN prospecto_id;

-- ============================================================
-- Nota de ejecución:
--   - Canal: MySQL Workbench (manual).
--   - La migración es multi-statement (PREPARE/EXECUTE):
--     ejecutar el script completo o bloque por bloque.
--   - El SHOW CREATE TABLE está comentado para ejecutarlo manualmente
--     antes del ALTER. Los SELECT de conteo y columnas existentes
--     se ejecutan como parte del script.
--   - No apto para mysql2.execute() ni runners automáticos.
-- ============================================================
