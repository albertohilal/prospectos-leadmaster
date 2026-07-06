-- ============================================================
-- Seed SQL: Queries de prospección — Seguros LM-003A
-- Archivo:  config/seed_ll_queries_prospeccion_seguros.sql
-- Fecha:    2026-07-06
-- Bloque:   LM-003A — Preparación de datos para vertical seguros
-- Estado:   PENDIENTE DE REVISIÓN / NO EJECUTADO
-- ============================================================
-- Objetivo:
--   Registrar como insumo formal de prospección las 230 queries
--   geográfico-territoriales validadas para la vertical seguros.
--
--   Las queries resultan de la combinación:
--     keyword base (ll_keywords_leadmaster)
--     + modificador geográfico (la_cat_geo_keywords_ar)
--
-- Ejemplo:
--   keyword:   "broker de seguros"
--   geo:       "Cordoba"
--   query:     "broker de seguros Cordoba"
--
-- Esto permite búsquedas territoriales explícitas, reproducibles
-- y auditables, sin depender de ubicación física, IP, sesión o
-- historial del navegador.
-- ============================================================
-- Composición del lote validado (commit c5e5680):
--
--   23 keywords base x 10 territorios = 230 queries
--
--   Por perfil:
--     Perfil A  (alta prioridad):  11 keywords × 10 = 110 queries
--     Perfil B  (media/alta):       8 keywords × 10 =  80 queries
--     Perfil D  (ambigua/revisar):  4 keywords × 10 =  40 queries
--
--   Por territorio:     23 queries cada uno
--   Por prioridad geo:  138 (prioridad 1) + 92 (prioridad 2)
-- ============================================================
-- Origen de los datos:
--   - keywords base:  scripts/geo/generate-google-queries-seguros.js
--                     (arrays internos KEYWORDS_BASE_SEGUROS)
--   - geo modifiers:  scripts/geo/generate-google-queries-seguros.js
--                     (arrays internos MODIFICADORES_GEO)
--   - validación:     docs/05-REPORTES/2026-07/
--                     VALIDACION-LOTE-COMPLETO-QUERIES-GEO-SEGUROS-LM-003A-2026-07-05.md
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin revisión humana previa.
--   - La tabla ll_queries_prospeccion NO EXISTE aún en producción.
--     Está propuesta en este archivo como DDL comentado.
--     Requiere confirmación de esquema antes de crear la tabla.
--   - NO INSERTAR hasta que la tabla esté creada y revisada.
--   - NO versionar el CSV de salida (exports/geo/queries-seguros.csv).
--   - El Perfil D contiene queries de intención comercial ambigua
--     que pueden atraer compradores finales. Requiere revisión
--     manual antes de uso operativo.
-- ============================================================

-- ============================================================
-- DDL PROPUESTA (NO EJECUTADA — requiere confirmación de schema)
-- ============================================================
-- La tabla ll_queries_prospeccion almacena queries de búsqueda
-- generadas a partir de la combinación keyword + modificador
-- geográfico para cualquier vertical de prospección.
--
-- Propuesta de esquema:
--
-- USE iunaorg_dyd;
--
-- CREATE TABLE IF NOT EXISTS ll_queries_prospeccion (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--
--     query                  VARCHAR(500)  NOT NULL,
--     geo_key                VARCHAR(180)  NOT NULL,
--     keyword_base           VARCHAR(255)  NOT NULL,
--
--     vertical               VARCHAR(100)  DEFAULT 'seguros',
--     bloque                 VARCHAR(50)   DEFAULT 'LM-003A',
--     perfil_keyword         CHAR(1)       NOT NULL,
--     prioridad_keyword      TINYINT       NOT NULL,
--
--     modificador_geografico VARCHAR(150)  NOT NULL,
--     tipo_ubicacion         VARCHAR(30)   NOT NULL,
--     prioridad_geografica   TINYINT       NOT NULL,
--     prioridad_combinada    TINYINT       NOT NULL,
--
--     fuente                 VARCHAR(50)   DEFAULT 'seed_manual',
--     estado                 ENUM('pendiente','activa','ejecutada','pausada','descartada')
--                                         DEFAULT 'pendiente',
--
--     created_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
--     updated_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--
--     UNIQUE KEY uq_query                  (query),
--     INDEX      idx_geo_key               (geo_key),
--     INDEX      idx_keyword_base          (keyword_base),
--     INDEX      idx_perfil                (perfil_keyword),
--     INDEX      idx_prioridad_combinada   (prioridad_combinada),
--     INDEX      idx_vertical              (vertical),
--     INDEX      idx_bloque                (bloque),
--     INDEX      idx_estado                (estado)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--   COMMENT='Queries de búsqueda generadas por combinación keyword + geo';
-- ============================================================
-- Estrategia de idempotencia:
--   INSERT IGNORE — omite filas que violen la restricción UNIQUE
--   sobre (query). Si la tabla no tiene esa restricción, el seed
--   es repetible pero no idempotente frente a duplicados.
-- ============================================================
-- Campos:
--   query                  → búsqueda final generada
--   geo_key                → clave territorial de trazabilidad
--   keyword_base           → keyword original sin modificar
--   vertical               → vertical de prospección (seguros)
--   bloque                 → identificador de bloque (LM-003A)
--   perfil_keyword         → perfil de keyword (A/B/D)
--   prioridad_keyword      → prioridad original de la keyword
--   modificador_geografico → territorio usado en la query
--   tipo_ubicacion         → provincia | municipio
--   prioridad_geografica   → prioridad territorial
--   prioridad_combinada    → prioridad operativa combinada:
--                              1 solo si prioridad_keyword = 1
--                              y prioridad_geografica = 1;
--                              2 en el resto de los casos
--   fuente                 → 'seed_manual'
--   estado                 → 'pendiente' (no ejecutada aún)
-- ============================================================

-- ============================================================
-- PERFIL A — Brokers y productores generales (alta prioridad)
-- 11 keywords × 10 territorios = 110 queries
-- prioridad_keyword: 1
-- ============================================================

-- broker de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('broker de seguros CABA',              'provincia:02',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Buenos Aires',      'provincia:06',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Cordoba',           'provincia:14',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Rosario',           'municipio:82:rosario','broker de seguros',            'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Santa Fe',          'provincia:82',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Mendoza',           'provincia:50',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Neuquen',           'provincia:58',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Tucuman',           'provincia:90',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Entre Rios',        'provincia:30',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros Santa Cruz',        'provincia:78',      'broker de seguros',              'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- brokers de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('brokers de seguros CABA',              'provincia:02',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Buenos Aires',      'provincia:06',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Cordoba',           'provincia:14',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Rosario',           'municipio:82:rosario','brokers de seguros',            'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Santa Fe',          'provincia:82',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Mendoza',           'provincia:50',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Neuquen',           'provincia:58',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Tucuman',           'provincia:90',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Entre Rios',        'provincia:30',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('brokers de seguros Santa Cruz',        'provincia:78',      'brokers de seguros',              'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- productor asesor de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('productor asesor de seguros CABA',              'provincia:02',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Buenos Aires',      'provincia:06',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Cordoba',           'provincia:14',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Rosario',           'municipio:82:rosario','productor asesor de seguros',   'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Santa Fe',          'provincia:82',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Mendoza',           'provincia:50',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Neuquen',           'provincia:58',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Tucuman',           'provincia:90',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Entre Rios',        'provincia:30',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor asesor de seguros Santa Cruz',        'provincia:78',      'productor asesor de seguros',    'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- productores asesores de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('productores asesores de seguros CABA',              'provincia:02',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Buenos Aires',      'provincia:06',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Cordoba',           'provincia:14',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Rosario',           'municipio:82:rosario','productores asesores de seguros','seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Santa Fe',          'provincia:82',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Mendoza',           'provincia:50',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Neuquen',           'provincia:58',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Tucuman',           'provincia:90',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Entre Rios',        'provincia:30',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productores asesores de seguros Santa Cruz',        'provincia:78',      'productores asesores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- productor de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('productor de seguros CABA',              'provincia:02',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Buenos Aires',      'provincia:06',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Cordoba',           'provincia:14',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Rosario',           'municipio:82:rosario','productor de seguros',         'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Santa Fe',          'provincia:82',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Mendoza',           'provincia:50',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Neuquen',           'provincia:58',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Tucuman',           'provincia:90',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Entre Rios',        'provincia:30',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros Santa Cruz',        'provincia:78',      'productor de seguros',          'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- productores de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('productores de seguros CABA',              'provincia:02',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Buenos Aires',      'provincia:06',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Cordoba',           'provincia:14',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Rosario',           'municipio:82:rosario','productores de seguros',       'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Santa Fe',          'provincia:82',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Mendoza',           'provincia:50',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Neuquen',           'provincia:58',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Tucuman',           'provincia:90',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Entre Rios',        'provincia:30',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productores de seguros Santa Cruz',        'provincia:78',      'productores de seguros',        'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- asesor de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('asesor de seguros CABA',              'provincia:02',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Buenos Aires',      'provincia:06',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Cordoba',           'provincia:14',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Rosario',           'municipio:82:rosario','asesor de seguros',            'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Santa Fe',          'provincia:82',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Mendoza',           'provincia:50',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Neuquen',           'provincia:58',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Tucuman',           'provincia:90',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Entre Rios',        'provincia:30',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('asesor de seguros Santa Cruz',        'provincia:78',      'asesor de seguros',             'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- asesores de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('asesores de seguros CABA',              'provincia:02',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Buenos Aires',      'provincia:06',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Cordoba',           'provincia:14',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Rosario',           'municipio:82:rosario','asesores de seguros',          'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Santa Fe',          'provincia:82',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Mendoza',           'provincia:50',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Neuquen',           'provincia:58',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Tucuman',           'provincia:90',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Entre Rios',        'provincia:30',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('asesores de seguros Santa Cruz',        'provincia:78',      'asesores de seguros',           'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- organizador de productores de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('organizador de productores de seguros CABA',              'provincia:02',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Buenos Aires',      'provincia:06',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Cordoba',           'provincia:14',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Rosario',           'municipio:82:rosario','organizador de productores de seguros','seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Santa Fe',          'provincia:82',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Mendoza',           'provincia:50',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Neuquen',           'provincia:58',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Tucuman',           'provincia:90',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Entre Rios',        'provincia:30',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('organizador de productores de seguros Santa Cruz',        'provincia:78',      'organizador de productores de seguros', 'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- agencia de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('agencia de seguros CABA',              'provincia:02',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Buenos Aires',      'provincia:06',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Cordoba',           'provincia:14',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Rosario',           'municipio:82:rosario','agencia de seguros',           'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Santa Fe',          'provincia:82',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Mendoza',           'provincia:50',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Neuquen',           'provincia:58',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Tucuman',           'provincia:90',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Entre Rios',        'provincia:30',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('agencia de seguros Santa Cruz',        'provincia:78',      'agencia de seguros',            'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- consultora de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('consultora de seguros CABA',              'provincia:02',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'CABA',              'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Buenos Aires',      'provincia:06',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Buenos Aires',      'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Cordoba',           'provincia:14',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Cordoba',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Rosario',           'municipio:82:rosario','consultora de seguros',        'seguros', 'LM-003A', 'A', 1, 'Rosario',           'municipio', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Santa Fe',          'provincia:82',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Santa Fe',          'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Mendoza',           'provincia:50',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Mendoza',           'provincia', 1, 1, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Neuquen',           'provincia:58',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Tucuman',           'provincia:90',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Entre Rios',        'provincia:30',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('consultora de seguros Santa Cruz',        'provincia:78',      'consultora de seguros',         'seguros', 'LM-003A', 'A', 1, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- ============================================================
-- PERFIL B — Seguros para empresas / corporativos
-- 8 keywords × 10 territorios = 80 queries
-- prioridad_keyword: 2
-- ============================================================

-- seguros para empresas (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('seguros para empresas CABA',              'provincia:02',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Buenos Aires',      'provincia:06',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Cordoba',           'provincia:14',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Rosario',           'municipio:82:rosario','seguros para empresas',             'seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Santa Fe',          'provincia:82',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Mendoza',           'provincia:50',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Neuquen',           'provincia:58',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Tucuman',           'provincia:90',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Entre Rios',        'provincia:30',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para empresas Santa Cruz',        'provincia:78',      'seguros para empresas',              'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- seguros empresariales (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('seguros empresariales CABA',              'provincia:02',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Buenos Aires',      'provincia:06',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Cordoba',           'provincia:14',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Rosario',           'municipio:82:rosario','seguros empresariales',             'seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Santa Fe',          'provincia:82',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Mendoza',           'provincia:50',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Neuquen',           'provincia:58',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Tucuman',           'provincia:90',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Entre Rios',        'provincia:30',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros empresariales Santa Cruz',        'provincia:78',      'seguros empresariales',              'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- seguros corporativos (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('seguros corporativos CABA',              'provincia:02',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Buenos Aires',      'provincia:06',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Cordoba',           'provincia:14',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Rosario',           'municipio:82:rosario','seguros corporativos',              'seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Santa Fe',          'provincia:82',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Mendoza',           'provincia:50',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Neuquen',           'provincia:58',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Tucuman',           'provincia:90',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Entre Rios',        'provincia:30',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros corporativos Santa Cruz',        'provincia:78',      'seguros corporativos',               'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- broker de seguros corporativos (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('broker de seguros corporativos CABA',              'provincia:02',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Buenos Aires',      'provincia:06',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Cordoba',           'provincia:14',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Rosario',           'municipio:82:rosario','broker de seguros corporativos',    'seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Santa Fe',          'provincia:82',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Mendoza',           'provincia:50',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Neuquen',           'provincia:58',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Tucuman',           'provincia:90',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Entre Rios',        'provincia:30',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('broker de seguros corporativos Santa Cruz',        'provincia:78',      'broker de seguros corporativos',     'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- productor de seguros para empresas (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('productor de seguros para empresas CABA',              'provincia:02',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Buenos Aires',      'provincia:06',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Cordoba',           'provincia:14',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Rosario',           'municipio:82:rosario','productor de seguros para empresas','seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Santa Fe',          'provincia:82',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Mendoza',           'provincia:50',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Neuquen',           'provincia:58',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Tucuman',           'provincia:90',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Entre Rios',        'provincia:30',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('productor de seguros para empresas Santa Cruz',        'provincia:78',      'productor de seguros para empresas', 'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- seguros para pymes (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('seguros para pymes CABA',              'provincia:02',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Buenos Aires',      'provincia:06',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Cordoba',           'provincia:14',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Rosario',           'municipio:82:rosario','seguros para pymes',                'seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Santa Fe',          'provincia:82',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Mendoza',           'provincia:50',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Neuquen',           'provincia:58',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Tucuman',           'provincia:90',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Entre Rios',        'provincia:30',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para pymes Santa Cruz',        'provincia:78',      'seguros para pymes',                 'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- seguros para comercios (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('seguros para comercios CABA',              'provincia:02',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Buenos Aires',      'provincia:06',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Cordoba',           'provincia:14',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Rosario',           'municipio:82:rosario','seguros para comercios',            'seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Santa Fe',          'provincia:82',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Mendoza',           'provincia:50',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Neuquen',           'provincia:58',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Tucuman',           'provincia:90',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Entre Rios',        'provincia:30',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para comercios Santa Cruz',        'provincia:78',      'seguros para comercios',             'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- seguros para industrias (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('seguros para industrias CABA',              'provincia:02',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Buenos Aires',      'provincia:06',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Cordoba',           'provincia:14',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Rosario',           'municipio:82:rosario','seguros para industrias',           'seguros', 'LM-003A', 'B', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Santa Fe',          'provincia:82',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Mendoza',           'provincia:50',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Neuquen',           'provincia:58',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Tucuman',           'provincia:90',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Entre Rios',        'provincia:30',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('seguros para industrias Santa Cruz',        'provincia:78',      'seguros para industrias',            'seguros', 'LM-003A', 'B', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- ============================================================
-- PERFIL D — Intención comercial / captación (ambigua)
-- 4 keywords × 10 territorios = 40 queries
-- prioridad_keyword: 2
-- ADVERTENCIA: perfil ambiguo. Puede atraer compradores
-- finales. Requiere revisión manual antes de uso operativo.
-- ============================================================

-- contratar broker de seguros (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('contratar broker de seguros CABA',              'provincia:02',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Buenos Aires',      'provincia:06',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Cordoba',           'provincia:14',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Rosario',           'municipio:82:rosario','contratar broker de seguros',       'seguros', 'LM-003A', 'D', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Santa Fe',          'provincia:82',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Mendoza',           'provincia:50',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Neuquen',           'provincia:58',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Tucuman',           'provincia:90',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Entre Rios',        'provincia:30',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('contratar broker de seguros Santa Cruz',        'provincia:78',      'contratar broker de seguros',        'seguros', 'LM-003A', 'D', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- cotizar seguros empresas (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('cotizar seguros empresas CABA',              'provincia:02',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Buenos Aires',      'provincia:06',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Cordoba',           'provincia:14',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Rosario',           'municipio:82:rosario','cotizar seguros empresas',          'seguros', 'LM-003A', 'D', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Santa Fe',          'provincia:82',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Mendoza',           'provincia:50',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Neuquen',           'provincia:58',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Tucuman',           'provincia:90',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Entre Rios',        'provincia:30',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguros empresas Santa Cruz',        'provincia:78',      'cotizar seguros empresas',           'seguros', 'LM-003A', 'D', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- cotizar seguro de caución (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('cotizar seguro de caución CABA',              'provincia:02',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Buenos Aires',      'provincia:06',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Cordoba',           'provincia:14',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Rosario',           'municipio:82:rosario','cotizar seguro de caución',         'seguros', 'LM-003A', 'D', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Santa Fe',          'provincia:82',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Mendoza',           'provincia:50',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Neuquen',           'provincia:58',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Tucuman',           'provincia:90',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Entre Rios',        'provincia:30',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('cotizar seguro de caución Santa Cruz',        'provincia:78',      'cotizar seguro de caución',          'seguros', 'LM-003A', 'D', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- presupuesto seguro empresa (10 territorios)
INSERT IGNORE INTO ll_queries_prospeccion
  (query, geo_key, keyword_base, vertical, bloque, perfil_keyword, prioridad_keyword,
   modificador_geografico, tipo_ubicacion, prioridad_geografica, prioridad_combinada,
   fuente, estado, created_at)
VALUES
  ('presupuesto seguro empresa CABA',              'provincia:02',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'CABA',              'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Buenos Aires',      'provincia:06',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Buenos Aires',      'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Cordoba',           'provincia:14',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Cordoba',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Rosario',           'municipio:82:rosario','presupuesto seguro empresa',        'seguros', 'LM-003A', 'D', 2, 'Rosario',           'municipio', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Santa Fe',          'provincia:82',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Santa Fe',          'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Mendoza',           'provincia:50',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Mendoza',           'provincia', 1, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Neuquen',           'provincia:58',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Neuquen',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Tucuman',           'provincia:90',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Tucuman',           'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Entre Rios',        'provincia:30',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Entre Rios',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW()),
  ('presupuesto seguro empresa Santa Cruz',        'provincia:78',      'presupuesto seguro empresa',         'seguros', 'LM-003A', 'D', 2, 'Santa Cruz',        'provincia', 2, 2, 'seed_manual', 'pendiente', NOW());

-- ============================================================
-- VERIFICACIÓN (NO EJECUTAR — solo referencia para auditoría)
-- ============================================================

-- 1. Total de queries LM-003A
-- SELECT COUNT(*) AS total_queries
-- FROM ll_queries_prospeccion
-- WHERE bloque = 'LM-003A' AND fuente = 'seed_manual';
-- -- Esperado: 230

-- 2. Total por territorio
-- SELECT modificador_geografico AS territorio,
--        geo_key,
--        prioridad_geografica,
--        COUNT(*) AS total
-- FROM ll_queries_prospeccion
-- WHERE bloque = 'LM-003A' AND fuente = 'seed_manual'
-- GROUP BY modificador_geografico, geo_key, prioridad_geografica
-- ORDER BY prioridad_geografica, modificador_geografico;
-- -- Esperado: 10 filas, 23 queries cada una

-- 3. Total por keyword_base
-- SELECT keyword_base,
--        perfil_keyword,
--        prioridad_keyword,
--        COUNT(*) AS total
-- FROM ll_queries_prospeccion
-- WHERE bloque = 'LM-003A' AND fuente = 'seed_manual'
-- GROUP BY keyword_base, perfil_keyword, prioridad_keyword
-- ORDER BY prioridad_keyword, perfil_keyword, keyword_base;
-- -- Esperado: 23 filas, 10 queries cada una

-- 4. Total por perfil_keyword
-- SELECT perfil_keyword AS perfil,
--        COUNT(*) AS total,
--        COUNT(DISTINCT geo_key) AS territorios,
--        COUNT(DISTINCT keyword_base) AS keywords
-- FROM ll_queries_prospeccion
-- WHERE bloque = 'LM-003A' AND fuente = 'seed_manual'
-- GROUP BY perfil_keyword
-- ORDER BY perfil_keyword;
-- -- Esperado:
-- --   A: 110 queries, 10 territorios, 11 keywords
-- --   B:  80 queries, 10 territorios,  8 keywords
-- --   D:  40 queries, 10 territorios,  4 keywords

-- 5. Total por prioridad_combinada
-- SELECT prioridad_combinada,
--        COUNT(*) AS total
-- FROM ll_queries_prospeccion
-- WHERE bloque = 'LM-003A' AND fuente = 'seed_manual'
-- GROUP BY prioridad_combinada
-- ORDER BY prioridad_combinada;
-- -- Esperado:
-- --   1:  66
-- --   2: 164
-- --
-- -- Criterio:
-- --   prioridad_combinada = 1 solo cuando prioridad_keyword = 1
-- --   y prioridad_geografica = 1.
-- --
-- -- Desglose:
-- --   Perfil A, geo prioridad 1: 11 keywords x 6 territorios = 66
-- --   Resto del lote: 230 - 66 = 164

-- 6. Verificación de unicidad
-- SELECT query, COUNT(*) AS n
-- FROM ll_queries_prospeccion
-- WHERE bloque = 'LM-003A' AND fuente = 'seed_manual'
-- GROUP BY query
-- HAVING COUNT(*) > 1;
-- -- Esperado: 0 filas (sin duplicados)

-- ============================================================
-- Resumen de carga esperada:
--   Total queries:     230
--   Territorios:        10
--   Keywords base:      23
--   Perfiles:           A (110), B (80), D (40)
--   Prioridad comb 1:   66
--   Prioridad comb 2:  164
--   Duplicados:          0
-- ============================================================
