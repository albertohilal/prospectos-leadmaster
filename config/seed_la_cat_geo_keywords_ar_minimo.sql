-- ============================================================
-- Seed mínimo: Catálogo geográfico inicial (prueba)
-- Archivo:  config/seed_la_cat_geo_keywords_ar_minimo.sql
-- Fecha:    2026-07-05
-- Bloque:   LM-003A — Preparación de datos para vertical seguros
-- Estado:   PENDIENTE DE REVISIÓN / NO EJECUTADO
-- ============================================================
-- Objetivo:
--   Poblar la_cat_geo_keywords_ar con un conjunto mínimo de
--   ubicaciones de prueba para validar el generador de queries
--   de Google.
--
--   Este seed NO es exhaustivo. Es solo para prueba.
--   La cobertura completa vendrá de Georef API vía script.
-- ============================================================
-- Reglas aplicadas:
--   - modificador_busqueda: sin tilde (forma operativa principal).
--   - Nombres oficiales: con tilde cuando corresponda.
--   - fuente_geo = 'seed_manual_inicial'.
--   - poblacion = NULL (pendiente de INDEC).
--   - poblacion_fuente = NULL.
--   - prioridad_busqueda: basada solo en tipo de ubicación.
--     Se recalculará cuando haya población de INDEC.
-- ============================================================
-- IMPORTANTE:
--   - La población (poblacion, poblacion_anio, poblacion_fuente,
--     poblacion_fuente_url) DEBE venir de INDEC posteriormente.
--     NO se debe usar Georef como fuente de habitantes.
--   - Las prioridades actuales son provisorias y se basan solo
--     en tipo de ubicación. Cuando INDEC esté disponible, se
--     recalcularán combinando tipo + habitantes.
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin revisión humana previa.
--   - Verificar que la tabla la_cat_geo_keywords_ar existe.
-- ============================================================

USE iunaorg_dyd;

-- ============================================================
-- CABA — Ciudad Autónoma de Buenos Aires
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('02', 'Ciudad Autónoma de Buenos Aires',
     'CABA', 'caba',
     'provincia',
     NULL, NULL, NULL, NULL,
     -34.6144, -58.4458,
     1, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Buenos Aires
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('06', 'Buenos Aires',
     'Buenos Aires', 'buenos aires',
     'provincia',
     NULL, NULL, NULL, NULL,
     -36.5000, -60.0000,
     1, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Córdoba
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('14', 'Córdoba',
     'Cordoba', 'cordoba',
     'provincia',
     NULL, NULL, NULL, NULL,
     -32.0000, -64.0000,
     1, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Rosario (Santa Fe)
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre, departamento_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('82', 'Santa Fe', 'Rosario',
     'Rosario', 'rosario',
     'municipio',
     NULL, NULL, NULL, NULL,
     -32.9468, -60.6393,
     1, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Santa Fe (provincia)
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('82', 'Santa Fe',
     'Santa Fe', 'santa fe',
     'provincia',
     NULL, NULL, NULL, NULL,
     -30.5000, -61.0000,
     1, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Mendoza
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('50', 'Mendoza',
     'Mendoza', 'mendoza',
     'provincia',
     NULL, NULL, NULL, NULL,
     -35.5000, -68.5000,
     1, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Neuquén
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('58', 'Neuquén',
     'Neuquen', 'neuquen',
     'provincia',
     NULL, NULL, NULL, NULL,
     -39.0000, -70.0000,
     2, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Tucumán
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('90', 'Tucumán',
     'Tucuman', 'tucuman',
     'provincia',
     NULL, NULL, NULL, NULL,
     -27.0000, -65.5000,
     2, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Entre Ríos
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('30', 'Entre Ríos',
     'Entre Rios', 'entre rios',
     'provincia',
     NULL, NULL, NULL, NULL,
     -32.0000, -59.5000,
     2, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Santa Cruz
-- ============================================================
INSERT IGNORE INTO la_cat_geo_keywords_ar
    (provincia_id, provincia_nombre,
     modificador_busqueda, modificador_normalizado,
     tipo_ubicacion,
     poblacion, poblacion_anio, poblacion_fuente, poblacion_fuente_url,
     centroide_lat, centroide_lon,
     prioridad_busqueda, activa,
     fuente_geo, fuente_poblacion,
     last_geo_sync_at, last_poblacion_sync_at)
VALUES
    ('78', 'Santa Cruz',
     'Santa Cruz', 'santa cruz',
     'provincia',
     NULL, NULL, NULL, NULL,
     -49.0000, -70.0000,
     2, 1,
     'seed_manual_inicial', NULL,
     NULL, NULL);

-- ============================================================
-- Verificación sugerida (NO EJECUTAR — solo referencia):
--
-- SELECT COUNT(*) AS total FROM la_cat_geo_keywords_ar
-- WHERE fuente_geo = 'seed_manual_inicial';
-- -- Esperado: 10
--
-- SELECT tipo_ubicacion, COUNT(*) AS cantidad
-- FROM la_cat_geo_keywords_ar
-- WHERE fuente_geo = 'seed_manual_inicial'
-- GROUP BY tipo_ubicacion
-- ORDER BY cantidad DESC;
-- ============================================================
