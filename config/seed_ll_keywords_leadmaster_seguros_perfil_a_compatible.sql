-- ============================================================
-- Seed SQL: Keywords Perfil Operativo A — Seguros LM-003A
-- Archivo:  config/seed_ll_keywords_leadmaster_seguros_perfil_a_compatible.sql
-- Fecha:    2026-07-07
-- Bloque:   LM-003A — Preparación de datos para vertical seguros
-- Estado:   PENDIENTE DE REVISIÓN / NO EJECUTADO
-- Schema:   COMPATIBLE CON SCHEMA REAL VERIFICADO
-- ============================================================
-- Objetivo:
--   Poblar ll_keywords_leadmaster únicamente con las keywords
--   del Perfil Operativo A para la vertical seguros.
--
--   Perfil Operativo A = keywords directamente vinculadas
--   a posibles clientes LeadMaster:
--     brokers, productores asesores, agencias, consultoras,
--     organizadores de productores de seguros.
--
--   Este seed es compatible con el schema real verificado
--   en config/create_ll_keywords_leadmaster.sql.
--
--   NO incluye los perfiles B, C, D ni E.
--   Para esos perfiles ver el seed original no compatible:
--     config/seed_ll_keywords_leadmaster_seguros.sql
-- ============================================================
-- Schema real (verificado en config/create_ll_keywords_leadmaster.sql):
--
--   perfil     ENUM('b2b', 'b2c', 'mixto')
--   prioridad  ENUM('alta', 'media', 'baja')
--   estado     ENUM('pendiente', 'activa', 'pausada', 'descartada')
--   keyword_hash  CHAR(64) NOT NULL (UNIQUE KEY)
--
-- Mapeo aplicado:
--   categoria_operativa = A  →  registrado en notas
--   perfil                = 'b2b'
--   prioridad             = 'alta'
--   estado                = 'activa'
--   origen                = 'seed_manual_lm003a'
--   keyword_hash          = SHA2(keyword, 256)
-- ============================================================
-- Estrategia de idempotencia:
--   INSERT IGNORE — omite filas que violen UNIQUE KEY sobre
--   keyword_hash. Si el hash ya existe (keyword duplicada),
--   la fila se omite silenciosamente.
-- ============================================================
-- PRECAUCIÓN:
--   - NO EJECUTAR sin revisión humana previa.
--   - Verificar que la tabla ll_keywords_leadmaster existe.
--   - El algoritmo de hash fue verificado en MySQL Workbench:
--     keyword_hash = SHA2(keyword, 256).
--   - Las keywords con tilde (consultoría) se normalizan
--     según el texto existente en el seed original.
-- ============================================================

USE iunaorg_dyd;

-- -------------------------------------------------------
-- PERFIL OPERATIVO A: Brokers y productores generales
-- Categoría operativa: A
-- prioridad: alta
-- perfil: b2b
-- -------------------------------------------------------

INSERT IGNORE INTO ll_keywords_leadmaster
  (keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas, created_at)
VALUES
  ('broker de seguros',
   SHA2('broker de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('brokers de seguros',
   SHA2('brokers de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('productor asesor de seguros',
   SHA2('productor asesor de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('productores asesores de seguros',
   SHA2('productores asesores de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('productor de seguros',
   SHA2('productor de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('productores de seguros',
   SHA2('productores de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('asesor de seguros',
   SHA2('asesor de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('asesores de seguros',
   SHA2('asesores de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('organizador de productores de seguros',
   SHA2('organizador de productores de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('organización de productores de seguros',
   SHA2('organización de productores de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('agencia de seguros',
   SHA2('agencia de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('consultora de seguros',
   SHA2('consultora de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW()),

  ('consultoría de seguros',
   SHA2('consultoría de seguros', 256),
   'seguros', 'b2b', 'alta', 'activa', 'seed_manual_lm003a',
   'bloque=LM-003A | brokers y productores generales | categoria_operativa=A',
   NOW());

-- ============================================================
-- Verificación sugerida (NO EJECUTAR — solo referencia):
--
-- SELECT COUNT(*) AS total
-- FROM ll_keywords_leadmaster
-- WHERE sector = 'seguros'
--   AND origen = 'seed_manual_lm003a'
--   AND notas LIKE '%categoria_operativa=A%';
-- -- Esperado: 13
--
-- SELECT keyword
-- FROM ll_keywords_leadmaster
-- WHERE sector = 'seguros'
--   AND origen = 'seed_manual_lm003a'
--   AND notas LIKE '%categoria_operativa=A%'
-- ORDER BY keyword;
-- -- Esperado: 13 filas, listado alfabético
-- ============================================================
