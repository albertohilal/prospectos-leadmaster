-- ============================================================
-- DDL: Catálogo de modificadores geográficos para búsquedas
-- Archivo:  config/create_la_cat_geo_keywords_ar.sql
-- Fecha:    2026-07-05
-- Bloque:   LM-003A — Preparación de datos para vertical seguros
-- Estado:   PENDIENTE DE REVISIÓN / NO EJECUTADO
-- ============================================================
-- Objetivo:
--   Crear tabla la_cat_geo_keywords_ar como catálogo de
--   modificadores geográficos para generar búsquedas territoriales
--   en Google.
--
--   Esta tabla NO es una tabla de domicilios de prospectos.
--   Es un catálogo de ubicaciones para armar queries del tipo:
--     "keyword base + modificador geográfico"
--
-- Ejemplo de uso:
--   keyword base: "broker seguros corporativos"
--   modificador:  "Cordoba"
--   query:        "broker seguros corporativos Cordoba"
-- ============================================================
-- Fuentes previstas:
--   - Georef API (https://apis.datos.gob.ar/georef/api/)
--     → estructura territorial: provincias, departamentos,
--       municipios, localidades, localidades censales.
--   - INDEC (https://www.indec.gob.ar/)
--     → datos de población por localidad censal.
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin revisión humana previa.
--   - Verificar que la base de datos destino existe.
--   - Compatible con MySQL 5.7+ / MariaDB 10.2+.
-- ============================================================

USE iunaorg_dyd;

CREATE TABLE IF NOT EXISTS la_cat_geo_keywords_ar (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- ---------------------------------------------------------
    -- Clave de idempotencia
    -- ---------------------------------------------------------
    geo_key                VARCHAR(180) NOT NULL COMMENT 'Clave estable para idempotencia entre seeds y sincronizaciones.
        Formato: tipo_ubicacion:identificador
        Ejemplos:
          provincia:02
          provincia:06
          departamento:14007
          municipio:82084
          localidad:82084001
          localidad_censal:02001001
        Si falta id oficial, fallback: tipo_ubicacion:provincia_id:modificador_normalizado',

    -- ---------------------------------------------------------
    -- Identificadores territoriales (fuente: Georef API)
    -- ---------------------------------------------------------
    provincia_id           VARCHAR(10)  DEFAULT NULL COMMENT 'ID Georef de provincia',
    provincia_nombre       VARCHAR(100) DEFAULT NULL COMMENT 'Nombre oficial con tilde',

    departamento_id        VARCHAR(20)  DEFAULT NULL COMMENT 'ID Georef de departamento',
    departamento_nombre    VARCHAR(100) DEFAULT NULL COMMENT 'Nombre oficial con tilde',

    municipio_id           VARCHAR(20)  DEFAULT NULL COMMENT 'ID Georef de municipio',
    municipio_nombre       VARCHAR(100) DEFAULT NULL COMMENT 'Nombre oficial con tilde',

    localidad_id           VARCHAR(30)  DEFAULT NULL COMMENT 'ID Georef de localidad',
    localidad_nombre       VARCHAR(100) DEFAULT NULL COMMENT 'Nombre oficial con tilde',

    localidad_censal_id    VARCHAR(30)  DEFAULT NULL COMMENT 'ID Georef de localidad censal',
    localidad_censal_nombre VARCHAR(100) DEFAULT NULL COMMENT 'Nombre oficial con tilde',

    -- ---------------------------------------------------------
    -- Modificador para búsquedas
    -- ---------------------------------------------------------
    modificador_busqueda   VARCHAR(150) NOT NULL COMMENT 'Texto sin tilde para query Google',
    modificador_normalizado VARCHAR(150) NOT NULL COMMENT 'Versión normalizada para matching y deduplicación',

    -- ---------------------------------------------------------
    -- Clasificación territorial
    -- ---------------------------------------------------------
    tipo_ubicacion         VARCHAR(30)  NOT NULL COMMENT 'provincia | departamento | municipio | localidad | localidad_censal',

    -- ---------------------------------------------------------
    -- Población (fuente: INDEC — NO Georef)
    -- ---------------------------------------------------------
    poblacion              INT          DEFAULT NULL COMMENT 'Habitantes. NULL hasta confirmar fuente INDEC',
    poblacion_anio         SMALLINT     DEFAULT NULL COMMENT 'Año del dato de población',
    poblacion_fuente       VARCHAR(100) DEFAULT NULL COMMENT 'Fuente del dato de población (ej: INDEC Censo 2022)',
    poblacion_fuente_url   VARCHAR(500) DEFAULT NULL COMMENT 'URL de la fuente de población',

    -- ---------------------------------------------------------
    -- Georreferenciación
    -- ---------------------------------------------------------
    centroide_lat          DECIMAL(10,7) DEFAULT NULL COMMENT 'Latitud del centroide',
    centroide_lon          DECIMAL(10,7) DEFAULT NULL COMMENT 'Longitud del centroide',

    -- ---------------------------------------------------------
    -- Control de búsquedas
    -- ---------------------------------------------------------
    prioridad_busqueda     TINYINT      NOT NULL DEFAULT 3 COMMENT '1 (máxima) a 5 (mínima). Basada en tipo de ubicación y población',
    activa                 TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1 = disponible para búsquedas, 0 = desactivada',

    -- ---------------------------------------------------------
    -- Trazabilidad de fuentes
    -- ---------------------------------------------------------
    fuente_geo             VARCHAR(100) DEFAULT NULL COMMENT 'Origen de los datos geográficos (ej: Georef API, seed_manual_inicial)',
    fuente_poblacion       VARCHAR(100) DEFAULT NULL COMMENT 'Origen del dato de población (ej: INDEC Censo 2022)',

    -- ---------------------------------------------------------
    -- Sincronización
    -- ---------------------------------------------------------
    last_geo_sync_at       DATETIME     DEFAULT NULL COMMENT 'Última sincronización con Georef',
    last_poblacion_sync_at DATETIME     DEFAULT NULL COMMENT 'Última sincronización con INDEC',

    -- ---------------------------------------------------------
    -- Auditoría
    -- ---------------------------------------------------------
    created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ---------------------------------------------------------
    -- Índices
    -- ---------------------------------------------------------
    UNIQUE KEY uq_geo_key                (geo_key),
    INDEX idx_modificador_normalizado    (modificador_normalizado),
    INDEX idx_provincia_id               (provincia_id),
    INDEX idx_municipio_id               (municipio_id),
    INDEX idx_localidad_censal_id        (localidad_censal_id),
    INDEX idx_tipo_ubicacion             (tipo_ubicacion),
    INDEX idx_prioridad_busqueda         (prioridad_busqueda),
    INDEX idx_activa                     (activa),
    INDEX idx_geo_tipo_modificador       (tipo_ubicacion, modificador_normalizado)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de modificadores geográficos argentinos para generación de búsquedas en Google';
