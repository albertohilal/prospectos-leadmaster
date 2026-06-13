USE iunaorg_dyd;

DROP TRIGGER IF EXISTS trg_stg_prospectos_url_normalize_bi;
DROP TRIGGER IF EXISTS trg_stg_prospectos_url_normalize_bu;

DELIMITER $$

CREATE TRIGGER trg_stg_prospectos_url_normalize_bi
BEFORE INSERT ON la_stg_prospectos
FOR EACH ROW
BEGIN
  IF NEW.url_landing IS NOT NULL THEN
    SET NEW.url_landing = NULLIF(
      TRIM(
        SUBSTRING_INDEX(
          SUBSTRING_INDEX(NEW.url_landing, '#', 1),
          '?',
          1
        )
      ),
      ''
    );
  END IF;
END$$

CREATE TRIGGER trg_stg_prospectos_url_normalize_bu
BEFORE UPDATE ON la_stg_prospectos
FOR EACH ROW
BEGIN
  IF NEW.url_landing IS NOT NULL THEN
    SET NEW.url_landing = NULLIF(
      TRIM(
        SUBSTRING_INDEX(
          SUBSTRING_INDEX(NEW.url_landing, '#', 1),
          '?',
          1
        )
      ),
      ''
    );
  END IF;
END$$

DELIMITER ;

UPDATE la_stg_prospectos
SET url_landing = NULLIF(
  TRIM(
    SUBSTRING_INDEX(
      SUBSTRING_INDEX(url_landing, '#', 1),
      '?',
      1
    )
  ),
  ''
)
WHERE url_landing IS NOT NULL;
