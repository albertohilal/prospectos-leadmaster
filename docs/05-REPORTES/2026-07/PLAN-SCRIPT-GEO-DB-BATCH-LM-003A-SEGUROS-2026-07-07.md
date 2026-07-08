# PLAN TÉCNICO: Script operativo keyword + geo para series de captura

**Fecha:** 2026-07-07
**Proyecto:** LeadMaster
**Repositorio:** prospectos-leadmaster-local
**Bloque:** LM-003A — Preparación de datos para vertical seguros
**Estado:** PLAN TÉCNICO — NO EJECUTADO
**Tipo:** Documento de diseño técnico

---

## 1. Diagnóstico del estado actual

### 1.1 Tablas en producción (`iunaorg_dyd`)

| Tabla | Filas | Estado |
|-------|-------|--------|
| `ll_keywords_leadmaster` | 63 (20 activas iniciales + 30 pendientes industriales + 13 Perfil A seguros LM-003A ya ejecutado) | Operativa, schema verificado |
| `la_cat_geo_keywords_ar` | 10 (seed mínimo ejecutado en Workbench) | Operativa, validada |
| `la_prospectos` | 183 | Operativa |
| `ll_queries_prospeccion` | No existe (DDL propuesto en seed, no ejecutado). **Antecedente, no fuente operativa actual.** Su Perfil A viejo usa 11 keywords; la DB real tiene 13. No debe usarse como referencia de cardinalidad. | No operativa |

### 1.2 Scripts existentes relevantes

| Script | Lee de DB | Combina keyword+geo | Ejecuta scraper | Trazabilidad |
|--------|-----------|---------------------|-----------------|--------------|
| `scripts/run-db-batch.js` | Solo `ll_keywords_leadmaster` | No | Si (`spawn scraper-local.js`) | `veces_buscada` + `ultima_busqueda_at` en `ll_keywords_leadmaster` |
| `scripts/geo/generate-google-queries-seguros.js` | No (arrays internos hardcodeados) | Si (en memoria) | No | Solo genera CSV/JSON |

### 1.3 Brecha

Ningún script operativo lee **simultáneamente** `ll_keywords_leadmaster` y `la_cat_geo_keywords_ar` desde base de datos para generar `query_google = keyword + modificador_busqueda` y alimentar `scraper-local.js`.

---

## 2. Flujo operativo correcto (confirmado por código/documentación)

```
┌──────────────────────────┐    ┌───────────────────────────┐
│ ll_keywords_leadmaster   │    │ la_cat_geo_keywords_ar    │
│ (keyword base)           │    │ (modificador_busqueda)    │
└──────────┬───────────────┘    └──────────┬────────────────┘
           │                               │
           └───────────┬───────────────────┘
                       │ CROSS JOIN con filtros
                       ▼
              query_google = "keyword modificador_busqueda"
                       │
                       ▼
         node src/local/scraper-local.js "<query_google>" --target N
                       │
                       ▼
              Chrome abre Google con query_google
                       │
                       ▼
              Usuario hace clic manual en anuncio pago
                       │
                       ▼
              scraper-local.js detecta landing real
                       │
                       ▼
              POST /api/prospectos → src/api/server.js
                       │
                       ▼
              INSERT INTO iunaorg_dyd.la_prospectos
```

**Confirmado en:**

- `src/local/scraper-local.js:165-214` — `sendToAPI()` hace POST a API
- `src/api/server.js:116-118` — `INSERT INTO la_prospectos`
- `docs/05-REPORTES/2026-07/DECISION-BUSQUEDA-MANUAL-CONTROLADA-LM-003A-SEGUROS-2026-07-07.md` — confirma fuentes y flujo
- `docs/05-REPORTES/2026-07/DECISION-FUENTES-GEO-DINAMICAS-LM-003A-SEGUROS-2026-07-05.md` — confirma keyword + geo explícito

**Reglas críticas:**

1. `query_google` no es prospecto. Solo existe prospecto con fila real en `la_prospectos`.
2. El clic es siempre humano. No se automatiza.
3. La inserción en `la_prospectos` la hace exclusivamente `src/api/server.js`.
4. Las queries deben generarse desde DB, no desde arrays hardcodeados.
5. **Exit code 0 de `scraper-local.js` NO alcanza como evidencia de captura.** Después de cada ejecución, el script batch debe verificar contra `la_prospectos` si realmente se insertaron nuevas filas atribuibles a esa query. Si exit code = 0 pero no hay filas nuevas en `la_prospectos`, la ejecución se considera fallida y NO debe actualizarse trazabilidad.

---

## 3. Brecha técnica actual

| Qué se necesita | Qué existe | Qué falta |
|----------------|-----------|-----------|
| Leer keywords activas de `ll_keywords_leadmaster` | `run-db-batch.js` ya lo hace | Nada |
| Leer modificadores geo de `la_cat_geo_keywords_ar` | `sync-geo-keywords-ar.js` sincroniza; `generate-google-queries-seguros.js` usa arrays hardcodeados | Leer desde DB en script batch operativo |
| CROSS JOIN keyword + geo | `generate-google-queries-seguros.js` lo hace en memoria con arrays | Hacerlo con SQL real desde DB |
| Ejecutar `scraper-local.js` con cada query | `run-db-batch.js` ya lo hace con `spawn` | Pasar `query_google` en vez de `keyword` sola |
| Trazabilidad de ejecución | `run-db-batch.js` actualiza `veces_buscada` + `ultima_busqueda_at` en `ll_keywords_leadmaster` | Registrar también el `geo_key` usado |
| Modo `--dry-run` | Ambos scripts existentes lo soportan | Mantenerlo |
| Filtros por sector, origen, prioridad, geo | `run-db-batch.js` solo filtra `origen` y `prioridad` | Agregar `--sector`, `--geo-prioridad`, `--geo-tipo` |

---

## 4. Opción recomendada para el script

**Opción recomendada: Crear `scripts/run-geo-db-batch.js`**

Un script nuevo que herede la arquitectura de `run-db-batch.js` pero:

- Haga CROSS JOIN entre `ll_keywords_leadmaster` y `la_cat_geo_keywords_ar`
- Use las mismas variables de entorno `KEYWORDS_DB_*`
- Use `spawn` para ejecutar `scraper-local.js` con cada `query_google`
- Mantenga la interfaz CLI consistente con `run-db-batch.js`

**Por qué no modificar `run-db-batch.js`:**

- `run-db-batch.js` tiene semántica establecida: lee solo keywords, no geo
- Rompería retrocompatibilidad con búsquedas sin modificador geográfico
- Mejor crear script nuevo con contrato claro desde el inicio

**Por qué no modificar `generate-google-queries-seguros.js`:**

- Ese script está diseñado para generar archivos estáticos, no para ejecutar scraper
- Usa arrays hardcodeados (`KEYWORDS_BASE_SEGUROS` con 23 keywords y `MODIFICADORES_GEO` con 10), no DB
- **Sus arrays están desincronizados de la DB real:** Perfil A del script tiene 11 keywords, la DB tiene 13. `seed_ll_queries_prospeccion_seguros.sql` hereda ese desfase. Ambos son antecedentes, no fuente operativa actual.
- Su rol es generación/revisión previa, no ejecución

---

## 5. Contrato CLI propuesto

```
Uso: node scripts/run-geo-db-batch.js [opciones]

Opciones:
  --target N           Capturas objetivo por query (default: 2)
  --limit N            Cantidad maxima de queries a ejecutar (default: 10)
  --sector VALOR       Filtrar keywords por sector (ej: seguros)
  --origen VALOR       Filtrar keywords por origen (ej: seed_manual_lm003a)
  --prioridad VALOR    Filtrar keywords por prioridad (alta|media|baja)
  --geo-prioridad N    Filtrar geo por prioridad_busqueda maxima (1-5)
  --geo-tipo VALOR     Filtrar geo por tipo_ubicacion (provincia|municipio|...)
  --manual             Pasa --manual al scraper-local.js
  --dry-run            Muestra queries sin ejecutar scraper ni actualizar DB
  --help, -h           Muestra esta ayuda

Ejemplos:
  # Revisar sin ejecutar
  node scripts/run-geo-db-batch.js --dry-run --sector seguros --limit 5

  # Ejecutar 5 queries de seguros con 2 capturas cada una
  node scripts/run-geo-db-batch.js --sector seguros --limit 5 --target 2

  # Solo provincias prioritarias
  node scripts/run-geo-db-batch.js --sector seguros --geo-prioridad 1 --geo-tipo provincia --limit 10

  # Con confirmacion manual entre capturas
  node scripts/run-geo-db-batch.js --sector seguros --manual --limit 3
```

### Filtros por defecto

Para garantizar que nunca se ejecuten queries no deseadas sin filtro explícito en la primera ejecución:

- Si no se especifica `--sector`, el script pregunta y espera `s` antes de continuar (modo interactivo de seguridad).
- `--dry-run` es el comportamiento sugerido en primera instancia.

---

## 6. SQL de lectura propuesto

```sql
SELECT
    kw.id              AS kw_id,
    kw.keyword         AS keyword,
    kw.sector          AS sector,
    kw.prioridad       AS kw_prioridad,
    kw.origen          AS origen,
    kw.veces_buscada   AS kw_veces_buscada,
    geo.id             AS geo_id,
    geo.geo_key        AS geo_key,
    geo.modificador_busqueda  AS modificador_busqueda,
    geo.tipo_ubicacion AS tipo_ubicacion,
    geo.prioridad_busqueda    AS geo_prioridad,
    CONCAT(kw.keyword, ' ', geo.modificador_busqueda) AS query_google
FROM ll_keywords_leadmaster kw
CROSS JOIN la_cat_geo_keywords_ar geo
WHERE kw.estado = 'activa'
  AND geo.activa = 1
  AND kw.sector = ?                      -- --sector (obligatorio sugerido)
  AND kw.origen = ?                      -- --origen (opcional)
  AND kw.prioridad = ?                   -- --prioridad (opcional)
  AND geo.prioridad_busqueda <= ?        -- --geo-prioridad (opcional)
  AND geo.tipo_ubicacion = ?             -- --geo-tipo (opcional)
ORDER BY
    FIELD(kw.prioridad, 'alta', 'media', 'baja'),
    geo.prioridad_busqueda ASC,
    kw.id ASC,
    geo.id ASC
LIMIT ?                                  -- --limit
```

**Aclaraciones sobre el SQL:**

- Se usan placeholders `?` con `pool.execute(sql, params)` como ya hace `run-db-batch.js`
- Los filtros opcionales se concatenan condicionalmente (misma técnica que `run-db-batch.js:138-166`)
- `CROSS JOIN` genera el producto cartesiano: N keywords x M geos = NxM queries
- Ejemplo concreto: 13 keywords Perfil A x 10 geos = 130 queries generadas

---

## 7. SQL de actualización/trazabilidad propuesto

### Opción A (mínima, sin tocar schema): Actualizar solo `ll_keywords_leadmaster`

```sql
UPDATE ll_keywords_leadmaster
SET
    veces_buscada = veces_buscada + 1,
    ultima_busqueda_at = NOW()
WHERE id = ?
```

**Ventaja:** Cero cambios en schema. `run-db-batch.js` ya hace esto.
**Desventaja:** Se pierde trazabilidad de qué keyword se combinó con qué geo. Si una keyword se busca 10 veces (una por cada geo), `veces_buscada = 10` pero no se sabe qué geos se usaron.

### Opción B (recomendada a futuro): Crear tabla `ll_queries_prospeccion`

El DDL ya está propuesto en `config/seed_ll_queries_prospeccion_seguros.sql:60-101`. **Este seed es un antecedente documental, no una fuente operativa actual:** su Perfil A tiene 11 keywords mientras la DB real tiene 13. No debe usarse como referencia de cardinalidad ni ejecutarse sin revisión.** Agregar campos de trazabilidad:

```sql
-- Columnas adicionales propuestas al DDL existente:
veces_ejecutada     INT DEFAULT 0,
ultima_ejecucion_at DATETIME DEFAULT NULL
```

Con update:

```sql
UPDATE ll_queries_prospeccion
SET
    estado = 'ejecutada',
    veces_ejecutada = veces_ejecutada + 1,
    ultima_ejecucion_at = NOW()
WHERE query = ?
```

### Opción C (hibrida, recomendada para fase 1): Log en metadata + update en `ll_keywords_leadmaster`

- Seguir actualizando `ll_keywords_leadmaster` como hace `run-db-batch.js`
- **Adicionalmente**, registrar la combinación `(keyword_id, geo_id, query_google)` en un archivo de log JSON (ej: `exports/geo/ejecuciones-{fecha}.json`) para trazabilidad sin tocar DB
- Esto permite auditar qué combinaciones se ejecutaron sin crear tabla nueva

**Importante (las tres opciones):** La actualización de trazabilidad (`veces_buscada`, `ultima_busqueda_at`) solo se ejecuta después de verificar que realmente se insertaron filas nuevas en `la_prospectos`. El exit code 0 del scraper no es suficiente. El script batch debe consultar `SELECT COUNT(*) FROM la_prospectos WHERE palabra_clave = ? AND created_at > ?` comparando el timestamp previo a la ejecución con el posterior. Si el delta es 0, no se actualiza trazabilidad.

### Recomendacion del plan

**Fase 1 (inmediata): Opcion C** — actualizar `ll_keywords_leadmaster` + log file. Cero riesgo en DB.

**Fase 2 (posterior): Migrar a Opcion B** cuando se apruebe crear `ll_queries_prospeccion` con campos de trazabilidad. En ese momento, el script podra hacer `INSERT IGNORE` (si la query no existe) y luego `UPDATE` de trazabilidad.

---

## 8. Decisiones pendientes

| # | Decision | Estado | Quien decide |
|---|----------|--------|-------------|
| 1 | Crear `ll_queries_prospeccion` ahora o en fase 2? | Pendiente | Usuario |
| 2 | Hacer obligatorio `--sector` o permitir sin filtro? | Pendiente (sugerido: obligatorio con confirmacion interactiva) | Usuario |
| 3 | Ejecutar el seed `seed_ll_keywords_leadmaster_seguros_perfil_a_compatible.sql` para poblar keywords de seguros en `ll_keywords_leadmaster`? | **YA EJECUTADO.** Las 13 keywords Perfil A están en DB. `ll_keywords_leadmaster = 63`. | Hecho |
| 4 | Ampliar el seed de `la_cat_geo_keywords_ar` mas alla de los 10 registros minimos? | Pendiente (se necesita `scripts/geo/sync-geo-keywords-ar.js` para sincronizar con Georef API) | Usuario |
| 5 | npm script name? | Pendiente (sugerido: `"geo:batch": "node scripts/run-geo-db-batch.js"`) | Usuario |
| 6 | Cual es la API_URL activa para scraper-local? `.env` tiene `http://185.187.170.196:8080/api` | Verificar que el VPS este corriendo `server.js` | Usuario |

---

## 9. Plan de implementacion por fases

### Fase 1: Script operativo (sin tocar DB)

| Paso | Accion | Archivos |
|------|--------|----------|
| 1.1 | Crear `scripts/run-geo-db-batch.js` con: conexion `KEYWORDS_DB_*`, CROSS JOIN SQL, parseo CLI, `spawn scraper-local.js`, `--dry-run`, filtros | `scripts/run-geo-db-batch.js` (nuevo) |
| 1.2 | Agregar npm script `"geo:batch"` en `package.json` | `package.json` (modificar) |
| 1.3 | Implementar log de ejecuciones en `exports/geo/ejecuciones-{YYYY-MM-DD}.json` | `scripts/run-geo-db-batch.js` |
| 1.4 | Implementar modo interactivo de seguridad cuando falta `--sector` | `scripts/run-geo-db-batch.js` |
| 1.5 | **Implementar verificación post-scraper contra `la_prospectos`** — consultar `COUNT(*)` por `palabra_clave` antes y después de cada ejecución; si delta = 0, marcar como fallida y no actualizar trazabilidad | `scripts/run-geo-db-batch.js` |
| 1.6 | Dry-run de validacion: `node scripts/run-geo-db-batch.js --dry-run --sector seguros --limit 5` | No modifica nada |

### Fase 2: Trazabilidad mejorada (requiere decision #1)

| Paso | Accion | Archivos |
|------|--------|----------|
| 2.1 | Si se aprueba, crear tabla `ll_queries_prospeccion` (DDL ya esta en `config/seed_ll_queries_prospeccion_seguros.sql`) | `config/create_ll_queries_prospeccion.sql` (nuevo, extraido del seed) |
| 2.2 | Agregar campos `veces_ejecutada`, `ultima_ejecucion_at` a la tabla | Migracion SQL nueva |
| 2.3 | Modificar `run-geo-db-batch.js` para insertar/actualizar en `ll_queries_prospeccion` | `scripts/run-geo-db-batch.js` (modificar) |

### Fase 3: Poblar keywords de seguros (YA EJECUTADO)

| Paso | Accion | Archivos |
|------|--------|----------|
| 3.1 | ~~Ejecutar `config/seed_ll_keywords_leadmaster_seguros_perfil_a_compatible.sql`~~ | **Ya ejecutado. `ll_keywords_leadmaster = 63`. 13 keywords Perfil A activas.** |
| 3.2 | ~~Verificar~~ | **Hecho.** |

### Fase 4: Skill OpenCode

| Paso | Accion | Archivos |
|------|--------|----------|
| 4.1 | Crear archivo de skill segun el diseno de la seccion 13 | `.opencode/skills/leadmaster-google-ads-capture-series.md` (nuevo) |

---

## 10. Archivos a crear/modificar

| Archivo | Accion | Tipo |
|---------|--------|------|
| `scripts/run-geo-db-batch.js` | Crear | Nuevo |
| `package.json` | Modificar (agregar `"geo:batch"`) | Modificacion |
| `exports/geo/ejecuciones-{fecha}.json` | Crear en cada ejecucion | Runtime |
| `.opencode/skills/leadmaster-google-ads-capture-series.md` | Crear | Nuevo |
| `config/create_ll_queries_prospeccion.sql` | Crear (extraer DDL del seed) | Nuevo (Fase 2) |

---

## 11. Pruebas seguras

### Prueba 1: Dry-run sin argumentos

```bash
node scripts/run-geo-db-batch.js --dry-run --limit 3
```

**Esperado:** Muestra 3 queries de CROSS JOIN con todas las keywords activas x todos los geos activos. No modifica DB. No abre Chrome.

### Prueba 2: Dry-run con sector seguros

```bash
node scripts/run-geo-db-batch.js --dry-run --sector seguros --limit 5
```

**Esperado:** Si hay keywords con `sector='seguros'` y `estado='activa'`, muestra queries combinadas. Si no hay, muestra 0 resultados.

### Prueba 3: Dry-run con filtros geo

```bash
node scripts/run-geo-db-batch.js --dry-run --sector seguros --geo-prioridad 1 --geo-tipo provincia --limit 10
```

**Esperado:** Solo queries con provincias de prioridad 1.

### Prueba 4: Ejecucion real minima

```bash
node scripts/run-geo-db-batch.js --sector seguros --limit 1 --target 1
```

**Esperado:** Abre Chrome con 1 query, espera clic humano, envia a API si el VPS esta corriendo. El script verifica `COUNT(*)` en `la_prospectos` antes y despues de la ejecucion. Si el delta es > 0, actualiza trazabilidad. Si es 0, reporta "sin captura real" y no actualiza.

---

## 12. Criterios de aceptacion

| # | Criterio | Verificacion |
|---|----------|-------------|
| CA-1 | `--dry-run` muestra queries sin ejecutar scraper ni tocar DB | Correr prueba 1 |
| CA-2 | Filtros `--sector`, `--origen`, `--prioridad`, `--geo-prioridad`, `--geo-tipo` funcionan | Correr pruebas 2 y 3 |
| CA-3 | `query_google` se genera como `keyword + ' ' + modificador_busqueda` | Inspeccionar salida dry-run |
| CA-4 | El script NO inserta en `la_prospectos` directamente | Verificar codigo: solo llama a `scraper-local.js` via `spawn` |
| CA-5 | El script actualiza `ll_keywords_leadmaster` solo tras verificar filas nuevas en `la_prospectos` (no alcanza con exit code = 0) | Verificar codigo y prueba 4 |
| CA-6 | `--manual` se propaga correctamente a `scraper-local.js` | Verificar codigo y prueba 4 |
| CA-7 | El script pregunta interactivamente si falta `--sector` | Verificar codigo |
| CA-8 | `--limit` respeta el maximo de queries a ejecutar | Verificar codigo y dry-run |
| CA-9 | El log de ejecuciones se escribe en `exports/geo/` con formato JSON, incluyendo resultado de verificacion post-scraper | Verificar tras prueba 4 |
| CA-10 | El script usa exclusivamente variables `KEYWORDS_DB_*` | Verificar codigo |
| CA-11 | Si exit code = 0 pero `COUNT(*)` en `la_prospectos` no aumentó, se reporta falla y NO se actualiza trazabilidad | Verificar prueba 4 con API caída o Chrome sin clic |
| CA-12 | La captura permite reconstruir de forma estructurada la primera aparición: `run-geo-db-batch.js` pasa `keyword_base`, `geo_id`, `geo_key` y `localidad` a `scraper-local.js`, que los reenvía en el body del POST; `server.js` los persiste en `la_prospectos` (`keyword_base`, `localidad_busqueda`, `geo_keyword_id_first`, `geo_key_first`). Ver sección 16 | Inspeccionar salida dry-run + SECCIÓN 5 de `config/verify_keyword_geo_capture.sql` |

---

## 13. Diseno del skill OpenCode

### Nombre: `leadmaster-google-ads-capture-series`

### Ubicacion: `.opencode/skills/leadmaster-google-ads-capture-series.md`

### Contenido del skill (especificacion):

```markdown
# Skill: LeadMaster Google Ads Capture Series

## Descripcion
Ejecuta series de captura de prospectos en Google Ads combinando keywords
base desde `ll_keywords_leadmaster` con modificadores geograficos desde
`la_cat_geo_keywords_ar`, usando el flujo manual controlado aprobado.

## Fuentes obligatorias
- `iunaorg_dyd.ll_keywords_leadmaster` — keywords base (origen canonico)
- `iunaorg_dyd.la_cat_geo_keywords_ar` — modificadores geograficos

## Flujo aprobado
1. CROSS JOIN keyword + modificador_busqueda = query_google
2. `node src/local/scraper-local.js "<query_google>" --target N`
3. Chrome abre Google con query_google
4. Usuario hace clic manual en anuncio pago
5. scraper-local.js detecta landing y POSTea a API
6. API inserta en `iunaorg_dyd.la_prospectos`

## Preflight (obligatorio antes de ejecutar)
1. Verificar que `src/api/server.js` esta corriendo en el VPS
2. Verificar conectividad: `node scripts/db-status.js`
3. Verificar keywords activas: dry-run del script batch
4. Verificar que `.env` tiene `KEYWORDS_DB_*` y `API_URL` correctos

## Dry-run obligatorio
Siempre ejecutar primero:
  node scripts/run-geo-db-batch.js --dry-run --sector seguros --limit 5

## Ejecucion minima
  node scripts/run-geo-db-batch.js --sector seguros --limit 1 --target 1

## Verificacion posterior
- `SELECT COUNT(*) FROM la_prospectos WHERE palabra_clave LIKE '%seguros%' AND created_at > NOW() - INTERVAL 1 HOUR`
- Revisar `exports/geo/ejecuciones-{fecha}.json`
- **Exit code 0 del scraper NO alcanza.** Solo se considera captura real si `COUNT(*)` en `la_prospectos` aumentó respecto al valor previo a la ejecución.

## Reglas de seguridad
- NO inventar queries. Siempre leer de DB.
- NO tratar query_google como prospecto. Solo existe prospecto con fila en la_prospectos.
- NO automatizar clics. El clic es siempre humano.
- NO insertar directamente en la_prospectos. Solo via API.
- NO ejecutar sin dry-run previo.
- NO ejecutar sin `--sector` definido (salvo confirmacion interactiva).
- NO modificar tablas sin aprobacion explicita.

## Criterio de exito
- El scraper-local.js abre Chrome correctamente
- El anuncio pago aparece en Google
- El usuario puede hacer clic manual
- La landing page se detecta y se envia a la API
- Se crea una fila en la_prospectos con palabra_clave y url_landing reales (verificado con COUNT antes/despues)
- La trazabilidad queda registrada en ll_keywords_leadmaster y en el log file
- **Si no hay filas nuevas en la_prospectos, la ejecucion se considera fallida,** independientemente del exit code del scraper

## Archivos relevantes
- `scripts/run-geo-db-batch.js` — script batch operativo
- `src/local/scraper-local.js` — scraper local con Chrome visible
- `src/api/server.js` — API REST que recibe prospectos
- `config/create_ll_keywords_leadmaster.sql` — DDL keywords
- `config/create_la_cat_geo_keywords_ar.sql` — DDL catalogo geografico
```

---

## 14. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| API del VPS no esta corriendo | Media | Alto: scraper-local falla al POSTear | Preflight: verificar `curl http://185.187.170.196:8080/api/health` |
| Keywords de seguros no estan en `ll_keywords_leadmaster` | **Superado** | — | Seed LM-003A ya ejecutado. 13 keywords Perfil A activas. |
| Solo hay 10 geos en `la_cat_geo_keywords_ar` (seed minimo) | Hecho | Bajo: suficiente para primeras pruebas | Ampliar con `sync-geo-keywords-ar.js` cuando se necesite mas cobertura |
| CROSS JOIN produce demasiadas queries sin filtros | Media | Medio: 63 keywords x 10 geos = 630 queries | `--limit` obligatorio en primeras ejecuciones; `--sector` sugerido como obligatorio |
| Chrome no disponible en el entorno | Baja | Alto: scraper-local requiere Chrome | Verificar `npx playwright install chromium` |
| `spawn` no funciona en Windows | Baja | Medio | `run-db-batch.js` ya usa `spawn` exitosamente; mismo patron |
| Duplicados en `la_prospectos` por misma keyword+URL | Baja | Bajo | `server.js` ya tiene `findDuplicateProspectId` (linea 149) que rechaza duplicados con HTTP 409 |
| **Exit code 0 del scraper sin captura real** | Alta | Alto: trazabilidad falsa, keyword marcada como ejecutada sin prospecto real | Verificacion post-scraper: consultar `COUNT(*)` en `la_prospectos` antes y despues. Si delta = 0, no actualizar `ll_keywords_leadmaster` |

---

## 15. Comandos de verificacion final

```bash
# 1. Verificar conectividad a DB
node scripts/db-status.js

# 2. Verificar estado actual de keywords de seguros
node -e "
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({
    host: process.env.KEYWORDS_DB_HOST,
    user: process.env.KEYWORDS_DB_USER,
    password: process.env.KEYWORDS_DB_PASSWORD,
    database: process.env.KEYWORDS_DB_NAME
  });
  const [rows] = await pool.execute(
    'SELECT id, keyword, sector, prioridad, estado FROM ll_keywords_leadmaster WHERE sector = ?', ['seguros']
  );
  console.table(rows);
  await pool.end();
})();
"

# 3. Verificar estado de catalogo geografico
node -e "
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({
    host: process.env.KEYWORDS_DB_HOST,
    user: process.env.KEYWORDS_DB_USER,
    password: process.env.KEYWORDS_DB_PASSWORD,
    database: process.env.KEYWORDS_DB_NAME
  });
  const [rows] = await pool.execute(
    'SELECT id, geo_key, modificador_busqueda, tipo_ubicacion, prioridad_busqueda, activa FROM la_cat_geo_keywords_ar WHERE activa = 1'
  );
  console.table(rows);
  await pool.end();
})();
"

# 4. Verificar que la API del VPS responde
curl -s http://185.187.170.196:8080/api/health | head -c 200

# 5. Dry-run del nuevo script (cuando este creado)
node scripts/run-geo-db-batch.js --dry-run --sector seguros --limit 5
```

---

## 16. Trazabilidad estructurada de primera aparición

> **Nota (2026-07-08):** Sección agregada tras la sesión grill "Estrategia
> LeadMaster ampliada". Ver informe
> `docs/05-REPORTES/2026-07/2026-07-08-lm-grill-verificacion-primera-aparicion-keyword-geo.md`
> y ADR `docs/02-ARQUITECTURA/ADR-2026-07-08-identidad-prospecto-por-landing.md`.

### Regla nueva

Guardar la **primera aparición** de un prospecto con **keyword base + localidad de
búsqueda + query completa**. Un prospecto se identifica por su **landing** (una fila
por landing en `la_prospectos`); las apariciones posteriores del mismo landing se
descartan y no pisan la atribución original.

### Decisión

`run-geo-db-batch.js` **no debe pasar solamente `query_google`**. Debe conservar y
transmitir a `scraper-local.js`, vía flags CLI:

- `--keyword-base` (keyword base, sin geo)
- `--geo-id` (`geo.id`)
- `--geo-key` (`geo.geo_key`)
- `--localidad` (`geo.modificador_busqueda`)

Además de la `query_google` como primer argumento posicional.

### Flujo de persistencia

```
run-geo-db-batch.js  --keyword-base --geo-id --geo-key --localidad + query_google
        ↓
scraper-local.js     reenvía en el body del POST:
                     { keyword, keywordBase, geoId, geoKey, localidad, landingUrl }
        ↓
server.js            INSERT en la_prospectos:
                     palabra_clave (query completa) + keyword_base +
                     localidad_busqueda + geo_keyword_id_first + geo_key_first
        ↓
la_prospectos        una fila por landing (created_at = primera aparición)
```

### Prerrequisitos de schema

Requiere la migración
`config/migration_add_geo_first_appearance_la_prospectos.sql` (agrega las 4 columnas),
que se diseña recién después de verificar el esquema real con
`SHOW CREATE TABLE la_prospectos`. La deduplicación por landing se aplica primero a
nivel aplicación; migrar el índice `UNIQUE(palabra_clave, url_landing_hash)` a
unicidad por landing es un paso destructivo aparte y gated.

---

## Resumen ejecutivo

| Elemento | Decision |
|----------|----------|
| Script a crear | `scripts/run-geo-db-batch.js` |
| Fuente keywords | `ll_keywords_leadmaster` (ya operativa, 63 filas, 13 Perfil A seguros activas) |
| Fuente geo | `la_cat_geo_keywords_ar` (ya operativa, 10 registros) |
| Generacion queries | CROSS JOIN en SQL, no arrays hardcodeados |
| Trazabilidad fase 1 | `ll_keywords_leadmaster` (update) + log JSON. **Solo tras verificar filas nuevas en `la_prospectos`.** |
| Trazabilidad fase 2 | Tabla `ll_queries_prospeccion` (requiere decision) |
| Ejecucion scraper | `spawn scraper-local.js` (mismo patron que `run-db-batch.js`) |
| Skill OpenCode | `.opencode/skills/leadmaster-google-ads-capture-series.md` |
| Prerrequisito inmediato | Seed de keywords seguros Perfil A **ya ejecutado**. 13 keywords listas. |
| `seed_ll_queries_prospeccion_seguros.sql` | **Antecedente documental, no fuente operativa.** Perfil A = 11 keywords (DB real = 13). No usar como referencia de cardinalidad. |
