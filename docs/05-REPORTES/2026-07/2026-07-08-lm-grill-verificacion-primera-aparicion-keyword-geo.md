# Grill LeadMaster — Verificación de "primera aparición" con keyword base + localidad + geo

**Fecha:** 2026-07-08
**Proyecto:** LeadMaster
**Repositorio:** prospectos-leadmaster-local
**Bloque:** LM-003A-B — Brokers / productores / organizadores (vertical seguros)
**Base de datos:** iunaorg_dyd
**Tipo:** Informe de sesión grill-with-docs (plan pendiente de aprobación)
**Estado:** pendiente de aprobación por ChatGPT

---

## 1. Propósito

Analizar la modificación estratégica ampliada ("Estrategia LeadMaster ampliada",
conversación 241-lm) y verificar si los archivos actuales alcanzan o quedan
desactualizados frente a la nueva regla:

> **Guardar la primera vez que aparece un prospecto con: keyword base + localidad de
> búsqueda + query completa.**

No se implementó código, SQL ni scraping. Este informe es un plan revisable.

## 2. Contexto al inicio

- Vertical activa: seguros. Bloque activo: LM-003A-B.
- No existía `CONTEXT.md` ni ADRs en `docs/02-ARQUITECTURA/`.
- Archivos sin commitear al iniciar: `config/verify_keyword_geo_capture.sql` y
  `docs/05-REPORTES/2026-07/PLAN-SCRIPT-GEO-DB-BATCH-LM-003A-SEGUROS-2026-07-07.md`.
- El contenido de la regla ampliada vive en una conversación externa (ChatGPT); fue
  aportado por el usuario durante la entrevista, no es deducible del repositorio.

## 3. Resumen de la entrevista

1. **Objetivo de la sesión** → Analizar la estrategia ampliada y verificar si los
   archivos actuales quedan desactualizados; investigar el repo, no implementar,
   preguntar de a una y generar informe Markdown.
2. **Contenido de la regla ampliada** → Aportado por el usuario: guardar la primera
   aparición del prospecto con keyword base + localidad de búsqueda + query completa.
3. **Identidad del Prospecto** → **Por empresa/landing** (una fila por landing).
4. **Apariciones posteriores del mismo landing** → **Solo primera aparición; descartar
   el resto; sin tabla nueva.**
5. **Forma de almacenamiento** → `palabra_clave` = query completa **+ 4 columnas**
   (`keyword_base`, `localidad_busqueda`, `geo_keyword_id_first`, `geo_key_first`); sin
   `first_seen_at` (se usa `created_at`).
6. **Unicidad por landing** → **A nivel aplicación ahora**; cambio de índice a nivel base
   de datos, **gated aparte** (destructivo).
7. **Transporte de campos** → **Flags CLI** en `scraper-local.js`.
8. **Artefactos documentales** → ADR (identidad por landing) + `CONTEXT.md` + actualizar
   el plan geo-db-batch.

## 4. Regla confirmada

Un Prospecto = una fila por empresa/landing. Se guarda la primera aparición con keyword
base + localidad de búsqueda + geo + `created_at`. Las apariciones posteriores del mismo
landing se descartan y no pisan la atribución original.

## 5. Archivos revisados

- `AGENTS.md`
- `docs/00-INDEX/DOCUMENTATION_RULES.md`
- `config/create_table.sql` (líneas 3-17)
- `config/migration_dedupe_keyword_url.sql` (líneas 94-95: `UNIQUE (palabra_clave, url_landing_hash)`)
- `config/verify_keyword_geo_capture.sql` (completo)
- `config/create_la_cat_geo_keywords_ar.sql` (líneas 37-135)
- `scripts/run-db-batch.js` (líneas 196-239, 318-334)
- `src/api/server.js` (líneas 104-165, 204-334)
- `src/local/scraper-local.js` (líneas 169-174, 216-221, 554-660)
- `docs/05-REPORTES/2026-07/PLAN-SCRIPT-GEO-DB-BATCH-LM-003A-SEGUROS-2026-07-07.md` (completo)

## 6. Hallazgos

- **`la_prospectos` base** (`config/create_table.sql`) no tiene columnas de geo/localidad
  ni de primera aparición. **El esquema real difiere del DDL base**: hay migraciones que
  agregan columnas (`url_landing_hash`, `nom`, teléfono/WhatsApp). Antes de cualquier
  ALTER hay que confirmar con `SHOW CREATE TABLE la_prospectos` (AGENTS.md regla 7).
- **Dedup­licación actual = keyword + landing**, tanto a nivel base de datos
  (`config/migration_dedupe_keyword_url.sql:95`, `UNIQUE(palabra_clave, url_landing_hash)`)
  como a nivel aplicación (`src/api/server.js:149-165`, `findDuplicateProspectId` compara
  `palabra_clave = ?` y el landing normalizado). El endpoint `check-processed`
  (`src/api/server.js:340`) y `scraper-local.js:216` usan la misma combinación.
- **`run-db-batch.js` no combina keyword + geo**: pasa solo `item.keyword`
  (`scripts/run-db-batch.js:218,319,331`).
- **El plan geo-db-batch pierde estructura**: su flujo pasa solo `query_google` al
  scraper (`PLAN-...:50`), aunque su CROSS JOIN ya selecciona `kw_id`, `geo_id`,
  `geo_key`, `modificador_busqueda` (`PLAN-...:167-196`). Esos campos no llegan a la API
  ni a la base.
- **`la_cat_geo_keywords_ar`** ya expone `id`, `geo_key`, `modificador_busqueda`,
  `tipo_ubicacion` (`config/create_la_cat_geo_keywords_ar.sql`), suficiente para poblar
  `geo_keyword_id_first` y `geo_key_first`.
- **`la_prospectos` tiene 183 filas** (dato del plan geo-db-batch): migrar el índice a
  unicidad por landing exigiría deduplicar datos existentes (destructivo).

### Veredicto sobre los dos archivos auditados

| Archivo | Estado | Observación |
|---|---|---|
| `config/verify_keyword_geo_capture.sql` | Parcialmente correcto | Verifica geo embebido en `palabra_clave` (con `LIKE`); no garantiza primera aparición ni guarda localidad estructurada; `COUNT(*)` puede inflar si un texto matchea varios geos |
| `docs/05-REPORTES/2026-07/PLAN-SCRIPT-GEO-DB-BATCH-...md` | Correcto como plan batch | Falta trazabilidad estructurada: pasa solo `query_google` y pierde keyword base / localidad / geo |

**Conclusión:** ambos sirvieron para la etapa anterior pero **no alcanzan** para la regla
nueva.

## 7. Decisiones tomadas

1. Identidad del Prospecto = empresa/landing (una fila por landing).
2. Apariciones posteriores: descartar; sin tabla nueva.
3. Almacenamiento: `palabra_clave` = query completa + 4 columnas nuevas; sin `first_seen_at`.
4. Unicidad por landing a nivel aplicación ahora; índice base de datos gated aparte.
5. Transporte de campos estructurados: flags CLI en `scraper-local.js`.
6. Documentar con ADR + `CONTEXT.md` + actualización del plan geo-db-batch.

## 8. Archivos afectados (a modificar tras aprobación)

| Archivo | Cambio propuesto |
|---|---|
| `src/api/server.js` | Leer `keywordBase, geoId, geoKey, localidad` en `POST /api/prospectos` (:208); incluirlos en `saveProspecto`/INSERT (:104-118); `findDuplicateProspectId` (:149) pasa a deduplicar **solo por landing** (quitar la condición `palabra_clave = ?`) |
| `src/local/scraper-local.js` | Parsear flags nuevos (:591-614); reenviarlos en el body del POST (:554, `sendToAPI` :169); alinear `checkAlreadyProcessed` (:216) a dedup­licación por landing |
| `config/verify_keyword_geo_capture.sql` | Comentario de advertencia (solo valida geo embebido, no primera aparición); `COUNT(DISTINCT p.id)` en sección 4; sección nueva de verificación de primera aparición usando las columnas nuevas |
| `docs/05-REPORTES/2026-07/PLAN-SCRIPT-GEO-DB-BATCH-LM-003A-SEGUROS-2026-07-07.md` | Sección de trazabilidad estructurada + criterio de aceptación nuevo: reconstruir prospecto + primera keyword + localidad + geo |
| `config/create_table.sql` | Reflejar las 4 columnas nuevas en el DDL de referencia |

## 9. Archivos a crear o actualizar

| Archivo | Propósito |
|---|---|
| `config/migration_add_geo_first_appearance_la_prospectos.sql` | ALTER idempotente (guardas `information_schema`) que agrega `keyword_base`, `localidad_busqueda`, `geo_keyword_id_first`, `geo_key_first`. **Se diseña recién después de la verificación read-only del esquema real (paso 2 del plan). No ejecutar.** |
| `scripts/run-geo-db-batch.js` | Script batch (del plan existente) que además pasa los flags estructurados al scraper |
| `docs/02-ARQUITECTURA/ADR-2026-07-08-identidad-prospecto-por-landing.md` | ADR de la identidad por landing — **creado en esta sesión** |
| `CONTEXT.md` | Glosario de dominio; redefine "Prospecto capturado" — **creado en esta sesión** |
| `docs/05-REPORTES/2026-07/2026-07-08-lm-grill-verificacion-primera-aparicion-keyword-geo.md` | Este informe — **creado en esta sesión** |

## 10. Paso gated / destructivo (aprobación explícita aparte)

Migrar `UNIQUE(palabra_clave, url_landing_hash)` → `UNIQUE(url_landing_hash)` exige
auditar y deduplicar las 183 filas existentes (conservar primera aparición, borrar/mergear
el resto). Requiere `SHOW CREATE TABLE la_prospectos` real y aprobación explícita
(AGENTS.md reglas 1, 3 y 7). No forma parte de la implementación inicial.

## 11. Decisiones pendientes

| Decisión | Dueño |
|---|---|
| Correr o no la migración destructiva del índice a unicidad por landing | Usuario + ChatGPT |
| Confirmar el esquema real con `SHOW CREATE TABLE la_prospectos` antes de cualquier ALTER | Usuario (no se ejecuta SQL sin OK) |

## 12. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Esquema real ≠ `create_table.sql` (migraciones agregaron columnas) | Verificar con `SHOW CREATE TABLE la_prospectos` antes de proponer/ejecutar cualquier ALTER |
| Filas duplicadas previas (mismo landing, distinta keyword) entre las 183 existentes | La nueva unicidad por landing aplica de aquí en adelante; los duplicados previos se conservan y se documentan |
| Dos empresas distintas compartiendo host de landing (raro) colisionarían bajo identidad por landing | `buildLandingKey` (`src/api/server.js:137`) normaliza origen + path; se mantiene ese criterio |
| Retrocompatibilidad con `run-db-batch.js` (sin geo) | Las columnas nuevas son NULLABLE; el flujo sin geo sigue enviando solo `keyword` sin ruptura |
| Ejecutar SQL/scraping por error durante la implementación | Prohibido sin aprobación explícita (AGENTS.md reglas 1 y 2); migración marcada "no ejecutar" |

## 13. Plan de implementación propuesto (orden, tras aprobación)

1. Escribir documentos: este informe + ADR + `CONTEXT.md` (hecho en esta sesión).
2. **Verificación read-only del esquema real — condición previa a diseñar la migración.**
   Ejecutar `SHOW CREATE TABLE la_prospectos` (solo lectura, con confirmación explícita del
   usuario) y comparar el resultado contra `config/create_table.sql`. Objetivo: conocer las
   columnas e índices realmente existentes (el informe advierte que el DDL base difiere del
   esquema real). No se crea ninguna migración hasta tener este resultado.
3. Crear `config/migration_add_geo_first_appearance_la_prospectos.sql` (no ejecutar),
   diseñado a partir del esquema real confirmado en el paso 2 y con guardas
   `information_schema` para ser idempotente.
4. `src/api/server.js`: body + INSERT + dedup­licación por landing.
5. `src/local/scraper-local.js`: flags CLI + reenvío + verificación por landing.
6. `scripts/run-geo-db-batch.js`: **diferido a su propio plan**
   (`PLAN-SCRIPT-GEO-DB-BATCH-...`), que tiene decisiones pendientes propias. **No se
   implementa en esta fase.** En esta implementación solo quedó listo el contrato
   scraper + API para recibir los flags estructurados (`--keyword-base`, `--geo-id`,
   `--geo-key`, `--localidad` → body del POST → columnas de primera aparición).
7. `config/verify_keyword_geo_capture.sql`: advertencia + `COUNT(DISTINCT)` + sección de
   primera aparición.
8. Actualizar el plan geo-db-batch (sección de trazabilidad + CA nuevo).
9. Verificación read-only final (dry-run del batch) — pendiente hasta que exista
   `scripts/run-geo-db-batch.js` en su propio plan; sin ejecutar SQL de cambio.

## 14. Checklist para aprobación por ChatGPT

- [ ] ¿Identidad por landing y descarte de apariciones posteriores es correcto?
- [ ] ¿Las 4 columnas y sus tipos son adecuados (sin `first_seen_at`)?
- [ ] ¿Dedup­licación a nivel aplicación ahora + índice base de datos gated aparte?
- [ ] ¿Flags CLI como mecanismo de transporte?
- [ ] ¿ADR + `CONTEXT.md` + actualización del plan geo-db-batch?

## 15. Estado de aprobación

**Estado inicial:** pendiente de aprobación por ChatGPT.

**Estado actual:** aprobado por ChatGPT para implementación controlada. La implementación fue aplicada sin commit. La migración de columnas quedó creada pero no ejecutada; su ejecución requiere aprobación explícita. La migración destructiva del índice queda gated aparte.

## 16. Estado de implementación (2026-07-08, tras aprobación)

Aprobado con `Plan aprobado por ChatGPT`. Ejecutado en modo build:

### Realizado
- `src/api/server.js`: parseo de `keywordBase, geoId, geoKey, localidad`; INSERT con
  `keyword_base, localidad_busqueda, geo_keyword_id_first, geo_key_first`;
  `findDuplicateProspectId` deduplicando **solo por landing** (primera aparición vía
  `ORDER BY id ASC`).
- `src/local/scraper-local.js`: flags CLI `--keyword-base`, `--geo-id`, `--geo-key`,
  `--localidad`; reenvío en el body del POST; comentario de check alineado a landing.
- `config/verify_keyword_geo_capture.sql`: advertencia de alcance, `COUNT(DISTINCT p.id)`
  y SECCIÓN 5 de verificación de primera aparición estructurada.
- `docs/05-REPORTES/2026-07/PLAN-SCRIPT-GEO-DB-BATCH-...md`: sección 16 + criterio CA-12.
- `config/create_table.sql`: DDL de referencia con las 4 columnas nuevas.
- **Verificación read-only** `SHOW CREATE TABLE la_prospectos` ejecutada con autorización
  explícita. Confirmado: la tabla solo tiene `url_landing_hash` agregado sobre el DDL base;
  índice único real `uq_prospectos_keyword_url_hash (palabra_clave, url_landing_hash)`;
  las 4 columnas nuevas no existían.
- `config/migration_add_geo_first_appearance_la_prospectos.sql`: creada, idempotente,
  diseñada a partir del esquema real. **No ejecutada.**

### Pendiente / gated
- Ejecutar la migración de columnas (requiere aprobación explícita; AGENTS.md regla 1).
- Migración destructiva del índice único → unicidad por landing (auditar/deduplicar
  filas existentes; gated aparte).
- `scripts/run-geo-db-batch.js`: **diferido** a su propio plan
  (`PLAN-SCRIPT-GEO-DB-BATCH-...`), que tiene decisiones pendientes propias. El contrato
  scraper + API ya quedó listo para recibir los flags estructurados.

### Nota de despliegue
El INSERT de `server.js` referencia las 4 columnas nuevas; **el server no debe
desplegarse hasta que la migración de columnas se haya ejecutado**, o el INSERT fallará.
