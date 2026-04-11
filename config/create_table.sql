USE leadmaster;

CREATE TABLE IF NOT EXISTS prospectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    palabra_clave VARCHAR(255) NOT NULL,
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