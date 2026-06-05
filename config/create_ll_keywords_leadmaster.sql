USE iunaorg_dyd;

CREATE TABLE IF NOT EXISTS ll_keywords_leadmaster (
    id INT AUTO_INCREMENT PRIMARY KEY,

    keyword VARCHAR(255) NOT NULL,
    keyword_hash CHAR(64) NOT NULL,

    sector VARCHAR(100) DEFAULT NULL,
    perfil ENUM('b2b', 'b2c', 'mixto') DEFAULT 'b2b',
    prioridad ENUM('alta', 'media', 'baja') DEFAULT 'media',
    estado ENUM('pendiente', 'activa', 'pausada', 'descartada') DEFAULT 'pendiente',

    origen VARCHAR(100) DEFAULT NULL,
    notas TEXT DEFAULT NULL,

    veces_buscada INT DEFAULT 0,
    ultima_busqueda_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_ll_keywords_leadmaster_hash (keyword_hash),
    INDEX idx_ll_keywords_estado (estado),
    INDEX idx_ll_keywords_prioridad (prioridad),
    INDEX idx_ll_keywords_sector (sector),
    INDEX idx_ll_keywords_perfil (perfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
