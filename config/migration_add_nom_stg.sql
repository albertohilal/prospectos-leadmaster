USE iunaorg_dyd;

ALTER TABLE la_stg_prospectos
  ADD COLUMN nom VARCHAR(255) NULL
  COMMENT 'Nombre comercial/empresa para exportación a llxbx_societe.nom'
  AFTER palabra_clave;

CREATE INDEX idx_stg_nom ON la_stg_prospectos (nom);
