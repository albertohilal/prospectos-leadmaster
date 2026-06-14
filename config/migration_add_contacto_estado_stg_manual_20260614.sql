-- YA APLICADO MANUALMENTE EN MYSQL WORKBENCH EL 2026-06-14
-- ARCHIVO DOCUMENTAL
-- NO EJECUTAR SIN VERIFICAR DESCRIBE/SHOW INDEX

-- Refleja lo aplicado manualmente en MySQL Workbench sobre la tabla real.
/*
ALTER TABLE iunaorg_dyd.la_stg_prospectos
ADD COLUMN contacto_estado ENUM(
  'pendiente',
  'corregido_manual',
  'sin_email',
  'descartado',
  'validado_manual',
  'error_tecnico'
) NOT NULL DEFAULT 'pendiente' AFTER error_msg,
ADD COLUMN contacto_validado_at DATETIME NULL AFTER contacto_estado,
ADD COLUMN contacto_validado_note TEXT NULL AFTER contacto_validado_at;

CREATE INDEX idx_la_stg_contacto_estado
ON iunaorg_dyd.la_stg_prospectos (contacto_estado);

CREATE INDEX idx_la_stg_contacto_validado_at
ON iunaorg_dyd.la_stg_prospectos (contacto_validado_at);
*/