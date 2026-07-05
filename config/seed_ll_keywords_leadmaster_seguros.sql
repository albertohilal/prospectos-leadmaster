-- ============================================================
-- Seed SQL: Keywords para vertical seguros — LM-003A-B
-- Archivo:  config/seed_ll_keywords_leadmaster_seguros.sql
-- Fecha:    2026-07-04
-- Plano:    AS-IS IMPLEMENTADO (tabla ll_keywords_leadmaster
--           detectada en producción) / NO VERIFICADO
--           (schema exacto inferido de docs, no de CREATE TABLE)
-- ============================================================
-- Objetivo:
--   Poblar ll_keywords_leadmaster con keywords de búsqueda para
--   la vertical seguros, bloque LM-003A-B — Brokers, productores
--   y organizadores.
-- ============================================================
-- Tabla destino: ll_keywords_leadmaster (base iunaorg_dyd o la que
--                 corresponda según entorno)
-- Columnas inferidas de documentación:
--   id, keyword, keyword_hash, sector, perfil, prioridad, estado,
--   origen, notas, veces_buscada, ultima_busqueda_at, created_at,
--   updated_at
-- ============================================================
-- Estrategia de idempotencia:
--   INSERT IGNORE — omite filas que violen restricciones UNIQUE
--   existentes (se presume UNIQUE sobre keyword o keyword_hash).
--   Si no existe UNIQUE, el seed es repetible pero no idempotente
--   frente a duplicados; en ese caso, revisar y adaptar.
-- ============================================================
-- Mapeo de campos usuario → tabla:
--   vertical            → sector     ('seguros')
--   bloque              → notas      (prefijo estructurado)
--   categoria_intencion → perfil     (A/B/C/D/E)
--   keyword             → keyword
--   prioridad           → prioridad  (1/2/3)
--   activa              → estado     ('activa')
--   fuente              → origen     ('seed_manual')
--   keyword_hash        → NULL       (algoritmo desconocido)
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin antes revisar el schema real de la tabla.
--   - Verificar que las columnas existan y los tipos coincidan.
--   - Si la tabla no tiene las columnas esperadas, adaptar.
-- ============================================================

-- -------------------------------------------------------
-- CATEGORÍA A: Brokers y productores generales
-- Prioridad: 1 (búsquedas directamente vinculadas al target)
-- -------------------------------------------------------

INSERT IGNORE INTO ll_keywords_leadmaster
  (keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas, created_at)
VALUES
  ('broker de seguros',              NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('brokers de seguros',             NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('productor asesor de seguros',    NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('productores asesores de seguros',NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('productor de seguros',           NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('productores de seguros',         NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('asesor de seguros',              NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('asesores de seguros',            NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('organizador de productores de seguros', NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('organización de productores de seguros',NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('agencia de seguros',             NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('consultora de seguros',          NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW()),
  ('consultoría de seguros',         NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', 'bloque=LM-003A-B | brokers y productores generales', NOW());

-- -------------------------------------------------------
-- CATEGORÍA B: Seguros para empresas / corporativos
-- Prioridad: 2 (seguros empresariales y ramos B2B)
-- -------------------------------------------------------

INSERT IGNORE INTO ll_keywords_leadmaster
  (keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas, created_at)
VALUES
  ('seguros para empresas',              NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros empresariales',              NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros corporativos',               NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('broker de seguros corporativos',     NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('productor de seguros para empresas', NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros para pymes',                 NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros para comercios',             NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros para industrias',            NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros para constructoras',         NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros para transporte',            NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros para flotas',                NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW()),
  ('seguros para consorcios',            NULL, 'seguros', 'B', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | seguros para empresas / corporativos', NOW());

-- -------------------------------------------------------
-- CATEGORÍA C: Ramos con potencial B2B
-- Prioridad: 2 (ramos específicos con potencial empresarial)
-- -------------------------------------------------------

INSERT IGNORE INTO ll_keywords_leadmaster
  (keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas, created_at)
VALUES
  ('seguro de caución',                    NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguros de caución',                   NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro técnico',                       NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro integral de comercio',          NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro todo riesgo operativo',         NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro responsabilidad civil',         NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro responsabilidad civil profesional', NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro para directores y gerentes',    NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro D&O',                           NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro de ART',                        NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('ART empresas',                         NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro de transporte de mercadería',   NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro de flota automotor',            NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro para maquinaria',               NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro para equipos electrónicos',     NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro de crédito',                    NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro ambiental',                     NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro agropecuario',                  NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro para contratistas',             NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro para minería',                  NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro para energía',                  NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW()),
  ('seguro para logística',                NULL, 'seguros', 'C', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | ramos con potencial B2B', NOW());

-- -------------------------------------------------------
-- CATEGORÍA D: Intención comercial / captación
-- Prioridad: 2 (búsquedas con intención de contratación o
--             cotización explícita)
-- -------------------------------------------------------

INSERT IGNORE INTO ll_keywords_leadmaster
  (keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas, created_at)
VALUES
  ('contratar broker de seguros',         NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('cotizar seguros empresas',            NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('cotizar seguro de caución',           NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('cotizar ART empresas',                NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('cotizar seguro flota',                NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('cotizar seguro comercio',             NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('cotizar seguro responsabilidad civil',NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('asesoramiento seguros empresas',      NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('comparativa seguros empresas',        NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('presupuesto seguro empresa',          NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW()),
  ('cobertura seguros empresas',          NULL, 'seguros', 'D', 2, 'activa', 'seed_manual', 'bloque=LM-003A-B | intención comercial / captación', NOW());

-- -------------------------------------------------------
-- CATEGORÍA E: Búsquedas locales Argentina
-- Prioridad: 3 (búsquedas geolocalizadas o más amplias)
-- -------------------------------------------------------

INSERT IGNORE INTO ll_keywords_leadmaster
  (keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas, created_at)
VALUES
  ('broker de seguros argentina',                       NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('productores de seguros argentina',                  NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('seguros empresariales argentina',                   NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('seguro de caución argentina',                       NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('ART empresas argentina',                            NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('broker de seguros buenos aires',                    NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('productor de seguros buenos aires',                 NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('seguros para empresas buenos aires',                NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('seguros para pymes argentina',                      NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW()),
  ('organizadores de productores de seguros argentina', NULL, 'seguros', 'E', 3, 'activa', 'seed_manual', 'bloque=LM-003A-B | búsquedas locales Argentina', NOW());

-- ============================================================
-- Verificación sugerida (NO EJECUTAR — solo referencia):
--
-- SELECT COUNT(*) AS total FROM ll_keywords_leadmaster
-- WHERE sector = 'seguros' AND origen = 'seed_manual';
-- -- Esperado: 68
--
-- SELECT perfil AS categoria, prioridad, COUNT(*) AS cantidad
-- FROM ll_keywords_leadmaster
-- WHERE sector = 'seguros' AND origen = 'seed_manual'
-- GROUP BY perfil, prioridad
-- ORDER BY prioridad, perfil;
-- ============================================================
