USE iunaorg_dyd;

CREATE TABLE IF NOT EXISTS la_prospectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    palabra_clave VARCHAR(255) NOT NULL,
    keyword_base VARCHAR(255) DEFAULT NULL COMMENT 'Keyword base sin modificador geográfico, primera aparición',
    localidad_busqueda VARCHAR(150) DEFAULT NULL COMMENT 'Localidad de búsqueda de la primera aparición',
    geo_keyword_id_first INT DEFAULT NULL COMMENT 'la_cat_geo_keywords_ar.id de la primera aparición',
    geo_key_first VARCHAR(180) DEFAULT NULL COMMENT 'la_cat_geo_keywords_ar.geo_key de la primera aparición',
    url_anuncio TEXT,
    url_landing TEXT,
    texto_extraido LONGTEXT,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    es_valido BOOLEAN DEFAULT NULL COMMENT 'TRUE si es prospecto válido, FALSE si no, NULL si no evaluado',
    metadata JSON COMMENT 'Información adicional: posición del anuncio, título, etc.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_palabra_clave (palabra_clave),
    INDEX idx_fecha_hora (fecha_hora),
    INDEX idx_es_valido (es_valido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;