USE leadmaster;

SET @has_telefono := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stg_prospectos'
    AND COLUMN_NAME = 'telefono_extraido'
);

SET @sql_telefono := IF(
  @has_telefono = 0,
  'ALTER TABLE stg_prospectos ADD COLUMN telefono_extraido VARCHAR(50) NULL AFTER direccion_extraida',
  'SELECT 1'
);
PREPARE stmt_telefono FROM @sql_telefono;
EXECUTE stmt_telefono;
DEALLOCATE PREPARE stmt_telefono;

SET @has_whatsapp := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stg_prospectos'
    AND COLUMN_NAME = 'whatsapp_extraido'
);

SET @sql_whatsapp := IF(
  @has_whatsapp = 0,
  'ALTER TABLE stg_prospectos ADD COLUMN whatsapp_extraido VARCHAR(50) NULL AFTER telefono_extraido',
  'SELECT 1'
);
PREPARE stmt_whatsapp FROM @sql_whatsapp;
EXECUTE stmt_whatsapp;
DEALLOCATE PREPARE stmt_whatsapp;
