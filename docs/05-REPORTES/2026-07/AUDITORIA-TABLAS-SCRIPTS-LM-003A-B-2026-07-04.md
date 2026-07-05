# LM-003A-B — Auditoría de tablas y scripts para lote de seguros

**Fecha:** 2026-07-04
**Proyecto:** LeadMaster
**Bloque:** LM-003A-B — Brokers / productores / organizadores
**Autor:** Auditoría automatizada
**Estado:** Revisado
**Modo:** Solo lectura — sin modificaciones de código ni base de datos

---

## Resumen ejecutivo

Se auditaron las tres tablas objetivo (`la_prospectos`, `la_stg_prospectos`, `la_stg_prospectos_contactos`) y todos los scripts del repositorio `prospectos-leadmaster-local` para evaluar la viabilidad de construir un lote de 80 a 110 prospectos LeadMaster de la vertical seguros (brokers, productores, organizadores, insurtech).

**Hallazgo principal:** las tablas actuales son funcionalmente suficientes para representar prospectos de seguros con metadata enriquecida. El volumen actual es de 171 prospectos en `la_prospectos` y 170 en staging, con cobertura de contactos (149 con email, 110 con teléfono, 76 con WhatsApp). Solo 3 keywords actuales apuntan a la vertical seguros, por lo que se requiere una nueva carga masiva de keywords específicas.

**Recomendación:** Opción B — las tablas actuales alcanzan con nuevos valores/enums/campos mínimos. Se sugiere agregar `tipo_actor` y `plaza` como columnas en `la_stg_prospectos`, y usar el campo `metadata` (JSON) de `la_prospectos` para fuente, score comercial y evidencia.

---

## 1. Estado del repositorio

### 1.1 Git

- **Rama actual:** `main`
- **Estado:** clean (sin cambios pendientes)
- **Commits recientes relevantes:**
  - `ba3cd0a` — docs: document cliente id staging remediation
  - `3d2c660` — fix: require explicit cliente id for stg sync
  - `598214c` — docs: audit manual contact correction form
  - `19dc1c9` — Merge pull request #1: chore/use-iunaorg-dyd-la-tables
  - `e7e6bc8` — chore(db): use iunaorg_dyd la tables for scraper flow
  - `383c6f6` — feat(data-pipeline): cerrar flujo leadmaster→staging→dolibarr con saneamiento y runbook

### 1.2 Archivos principales del repo

```
.env                          — Configuración de conexión DB y API
config/create_table.sql        — DDL original de la_prospectos
config/create_ll_keywords_leadmaster.sql — Tabla de keywords
config/migration_*.sql         — Migraciones incrementales (5 archivos)
config/seed_ll_keywords_*.sql  — Seeds de keywords (iniciales + industrial)
src/shared/config.js           — Configuración compartida Node.js
src/scraper/leadmaster_scraper.js — Scraper VPS headless (legacy)
src/local/scraper-local.js     — Scraper local con navegador visible
src/api/server.js              — API REST (POST /api/prospectos, etc.)
scripts/sync-stg-prospectos.js — Sync la_prospectos → la_stg_prospectos
scripts/enrich-stg-contact-from-landing.js — Enriquecimiento de contactos desde landing
scripts/enrich-stg-nom-from-landing.js — Enriquecimiento de nombre comercial
scripts/run-db-batch.js        — Orquestador de keywords desde ll_keywords_leadmaster
scripts/run-daily-batch.sh     — Batch alternativo con keywords hardcodeadas
```

### 1.3 Scripts que leen o escriben las tablas objetivo

| Script | `la_prospectos` | `la_stg_prospectos` | `la_stg_prospectos_contactos` |
|--------|:-:|:-:|:-:|
| `src/scraper/leadmaster_scraper.js` | **INSERT** | — | — |
| `src/api/server.js` | **INSERT / SELECT** (dup check, list, validate) | — | — |
| `src/local/scraper-local.js` | — (vía API) | — | — |
| `scripts/sync-stg-prospectos.js` | **SELECT** | **INSERT / UPDATE** | — |
| `scripts/enrich-stg-contact-from-landing.js` | — | **SELECT / UPDATE** | **INSERT** |
| `scripts/enrich-stg-nom-from-landing.js` | — | **SELECT / UPDATE** | — |
| `scripts/run-db-batch.js` | — (invoca scraper) | — | — |
| `scripts/db-view.js` | **SELECT** | **SELECT** | **SELECT** |
| `scripts/db-status.js` | **SELECT** | **SELECT** | **SELECT** |

---

## 2. Auditoría de estructura de tablas

### 2.1 `la_prospectos` — Captura inicial de prospectos

**Función:** Tabla de captura cruda. Recibe el resultado de cada búsqueda/anuncio scrapeado. Almacena la palabra clave, URL del anuncio, URL de landing, texto extraído por OCR y metadata. Es el punto de entrada del pipeline.

**Estructura actual (en producción):**

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| `id` | int(11) PK AUTO_INCREMENT | NO | — | Identificador único |
| `palabra_clave` | varchar(255) | NO | — | Keyword buscada en Google |
| `url_anuncio` | text | YES | NULL | URL del anuncio clickeado |
| `url_landing` | text | YES | NULL | URL final de landing page |
| `texto_extraido` | longtext | YES | NULL | Texto OCR del screenshot |
| `fecha_hora` | timestamp | YES | CURRENT_TIMESTAMP | Fecha/hora de captura |
| `es_valido` | tinyint(1) | YES | NULL | TRUE=válido, FALSE=inválido, NULL=sin evaluar |
| `metadata` | longtext (JSON) | YES | NULL | Información adicional en JSON |
| `created_at` | timestamp | YES | CURRENT_TIMESTAMP | — |
| `updated_at` | timestamp | YES | CURRENT_TIMESTAMP ON UPDATE | — |
| `url_landing_hash` | char(64) GENERATED STORED | YES | NULL | SHA-256 de url_landing normalizada |

**Índices:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_prospectos_keyword_url_hash (palabra_clave, url_landing_hash)` — deduplicación por keyword+URL
- `INDEX idx_palabra_clave (palabra_clave)`
- `INDEX idx_fecha_hora (fecha_hora)`
- `INDEX idx_es_valido (es_valido)`

**AUTO_INCREMENT actual:** 184 (171 registros)

### 2.2 `la_stg_prospectos` — Staging para enriquecimiento y exportación

**Función:** Tabla de staging donde los prospectos se enriquecen con email, teléfono, WhatsApp, nombre comercial y dirección. Prepara los datos para exportación a Dolibarr (`llxbx_societe`). Mantiene trazabilidad con `prospecto_id` y `cliente_id`.

**Estructura actual (en producción):**

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| `id` | bigint(20) PK AUTO_INCREMENT | NO | — | Identificador único de staging |
| `prospecto_id` | int(11) | NO | — | FK lógica a `la_prospectos.id` |
| `cliente_id` | int(11) | NO | — | Cliente propietario |
| `ref_ext` | varchar(64) | NO | — | Referencia externa (formato `leadmaster:{id}`) |
| `palabra_clave` | varchar(255) | YES | NULL | Copia desde origen |
| `nom` | varchar(255) | YES | NULL | Nombre comercial/empresa (→ `llxbx_societe.nom`) |
| `url_landing` | text | YES | NULL | URL normalizada (sin query/hash por trigger) |
| `texto_extraido` | longtext | YES | NULL | Copia desde origen |
| `email_extraido` | varchar(255) | YES | NULL | Email principal detectado |
| `direccion_extraida` | varchar(500) | YES | NULL | Dirección física detectada |
| `telefono_extraido` | varchar(50) | YES | NULL | Teléfono principal detectado |
| `whatsapp_extraido` | varchar(50) | YES | NULL | WhatsApp principal detectado |
| `place_id` | varchar(255) | YES | NULL | Google Place ID (sin poblar actualmente) |
| `estado` | enum('pendiente_place_id','place_id_ok','error') | NO | pendiente_place_id | Estado de resolución de place_id |
| `error_msg` | text | YES | NULL | Mensaje de error del enriquecimiento |
| `contacto_estado` | enum('pendiente','corregido_manual','sin_email','descartado','validado_manual','error_tecnico') | NO | pendiente | Estado de depuración de contactos |
| `contacto_validado_at` | datetime | YES | NULL | Fecha de validación |
| `contacto_validado_note` | text | YES | NULL | Nota de validación |
| `created_at` | timestamp | NO | CURRENT_TIMESTAMP | — |
| `updated_at` | timestamp | NO | CURRENT_TIMESTAMP ON UPDATE | — |

**Índices:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_prospecto_cliente (prospecto_id, cliente_id)` — un prospecto por cliente
- `INDEX idx_place_id (place_id)`
- `INDEX idx_estado (estado)`
- `INDEX idx_stg_nom (nom)`
- `INDEX idx_la_stg_contacto_estado (contacto_estado)`
- `INDEX idx_la_stg_contacto_validado_at (contacto_validado_at)`

**Triggers activos:**
- `trg_stg_prospectos_url_normalize_bi` — normaliza `url_landing` antes de INSERT (remueve query string y hash)
- `trg_stg_prospectos_url_normalize_bu` — idem antes de UPDATE

**AUTO_INCREMENT actual:** 298 (170 registros)

### 2.3 `la_stg_prospectos_contactos` — Contactos normalizados múltiples

**Función:** Tabla normalizada para almacenar múltiples contactos (email, teléfono, WhatsApp) por prospecto en staging. Permite tener más de un email o teléfono por empresa, marcando cuál es principal.

**Estructura actual (en producción):**

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| `id` | bigint(20) PK AUTO_INCREMENT | NO | — | Identificador único |
| `stg_prospecto_id` | bigint(20) | NO | — | FK lógica a `la_stg_prospectos.id` |
| `prospecto_id` | bigint(20) | YES | NULL | FK lógica a `la_prospectos.id` |
| `tipo` | enum('email','telefono','whatsapp') | NO | — | Tipo de contacto |
| `valor` | varchar(255) | NO | — | Valor original |
| `valor_normalizado` | varchar(255) | NO | — | Valor normalizado (lowercase, solo dígitos) |
| `es_principal` | tinyint(1) | NO | 0 | Si es el contacto principal |
| `fuente` | varchar(50) | NO | landing | Origen: landing, legacy_stg, hunter, manual |
| `url_fuente` | text | YES | NULL | URL de donde se extrajo |
| `created_at` | timestamp | YES | CURRENT_TIMESTAMP | — |
| `updated_at` | timestamp | YES | CURRENT_TIMESTAMP ON UPDATE | — |

**Índices:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_stg_contacto_valor (stg_prospecto_id, tipo, valor_normalizado)` — evita duplicados
- `INDEX idx_stg_contacto_stg_id (stg_prospecto_id)`
- `INDEX idx_stg_contacto_prospecto_id (prospecto_id)`
- `INDEX idx_stg_contacto_tipo (tipo)`

**AUTO_INCREMENT actual:** 799 (329 registros)

---

## 3. Auditoría de volumen y calidad de datos

### 3.1 Volúmenes generales

| Tabla | Total registros |
|-------|:---:|
| `la_prospectos` | 171 |
| `la_stg_prospectos` | 170 |
| `la_stg_prospectos_contactos` | 329 |

### 3.2 `la_prospectos` — Calidad de datos

| Métrica | Cantidad | % |
|---------|:---:|:---:|
| Total | 171 | 100% |
| Con URL de landing | 170 | 99.4% |
| Con texto extraído (OCR) | 107 | 62.6% |
| Válidos (`es_valido=1`) | 8 | 4.7% |
| Inválidos (`es_valido=0`) | 4 | 2.3% |
| Sin evaluar (`es_valido IS NULL`) | 159 | 93.0% |
| Duplicados por `palabra_clave + url_landing_hash` | 0 | 0% |

### 3.3 `la_stg_prospectos` — Calidad de datos

| Métrica | Cantidad | % |
|---------|:---:|:---:|
| Total | 170 | 100% |
| Con email | 149 | 87.6% |
| Con teléfono | 110 | 64.7% |
| Con WhatsApp | 76 | 44.7% |
| Con nombre comercial (`nom`) | 164 | 96.5% |
| Con `place_id` | 0 | 0% |
| Con URL de landing | 170 | 100% |
| Con texto extraído | 107 | 62.9% |

### 3.4 Distribución por estado (`estado`)

| Estado | Cantidad |
|--------|:---:|
| `pendiente_place_id` | 170 (100%) |

### 3.5 Distribución por `contacto_estado`

| Estado | Cantidad | % |
|--------|:---:|:---:|
| `pendiente` | 142 | 83.5% |
| `validado_manual` | 15 | 8.8% |
| `error_tecnico` | 7 | 4.1% |
| `corregido_manual` | 3 | 1.8% |
| `sin_email` | 2 | 1.2% |
| `descartado` | 1 | 0.6% |

### 3.6 Distribución por `cliente_id`

| cliente_id | Cantidad |
|:---:|:---:|
| 1268 | 98 (57.6%) |
| 52 | 72 (42.4%) |

### 3.7 Duplicados detectados

| Métrica | Grupos duplicados |
|---------|:---:|
| Email duplicado en staging | 19 |
| Teléfono duplicado en staging | 11 |
| WhatsApp duplicado en staging | 7 |
| Keyword+URL hash en `la_prospectos` | 0 |
| `nom` duplicado en staging (mismo nombre, distinto prospecto) | No medido directamente |

### 3.8 Contactos por tipo y fuente

| Tipo | Cantidad | Prospectos distintos | Fuente `landing` | Fuente `legacy_stg` | Fuente `hunter` | Fuente `manual` |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| email | 159 | 138 | 159 | — | — | — |
| telefono | 102 | 102 | — | — | — | — |
| whatsapp | 68 | 68 | — | — | — | — |
| **Total** | **329** | — | **159** | **148** | **19** | **3** |

**Observación:** Los contactos con fuente `legacy_stg` (148) y `hunter` (19) provienen de migraciones o cargas anteriores no asociadas al flujo principal de scraping.

---

## 4. Relación entre tablas

### 4.1 Diagrama de relaciones

```
la_prospectos (id) ──(1:N)──> la_stg_prospectos (prospecto_id)
                                       │
                                       └──(1:N)──> la_stg_prospectos_contactos (stg_prospecto_id)
```

### 4.2 Claves de relación

| Relación | Columna FK | Tipo | Verificación |
|----------|-----------|------|:---:|
| `la_prospectos → la_stg_prospectos` | `prospecto_id` | Lógica (sin FK física) | 0 huérfanos |
| `la_stg_prospectos → la_stg_prospectos_contactos` | `stg_prospecto_id` | Lógica (sin FK física) | 0 huérfanos |
| `la_stg_prospectos.cliente_id` | — | Sin FK a tabla de clientes | — |

### 4.3 Consistencia

| Métrica | Valor |
|---------|:---:|
| Huérfanos: stg sin prospecto en origen | **0** |
| Prospectos en origen sin staging | **1** (id=183, el más reciente) |
| Huérfanos: contactos sin stg | **0** |
| `prospecto_id` en contactos que no coincide con `stg_prospecto.prospecto_id` | No verificado en esta auditoría |

### 4.4 Observaciones

- Las relaciones son **lógicas**, sin FOREIGN KEY constraints declaradas. Esto es intencional para flexibilidad operativa pero implica riesgo de integridad si se manipulan IDs manualmente.
- `la_stg_prospectos_contactos.prospecto_id` es redundante (se puede derivar del JOIN con `la_stg_prospectos`), pero existe por conveniencia de consulta.
- La migración `config/migration_add_url_landing_hash.sql` intentó crear un índice único por `url_landing_hash` pero se reemplazó por `uq_prospectos_keyword_url_hash` que es más restrictivo (keyword + URL hash).

---

## 5. Análisis de scripts

### 5.1 Inserción en staging — `scripts/sync-stg-prospectos.js`

**Qué hace:** Lee `la_prospectos`, normaliza `url_landing` e inserta/actualiza en `la_stg_prospectos` usando `ON DUPLICATE KEY UPDATE`. Requiere `--cliente-id` obligatorio.

**Lee:** `la_prospectos`
**Escribe:** `la_stg_prospectos`

**Campos que completa:**
- `prospecto_id` ← `la_prospectos.id`
- `cliente_id` ← argumento CLI o env `STG_CLIENTE_ID`
- `ref_ext` ← `leadmaster:{prospecto.id}`
- `palabra_clave`, `url_landing`, `texto_extraido` ← copia desde origen
- `place_id` ← NULL
- `estado` ← `pendiente_place_id`

**Riesgos:**
- Propaga `texto_extraido = NULL` desde origen si OCR no corrió
- `ON DUPLICATE KEY UPDATE` puede pisar correcciones manuales hechas en staging
- No hay deduplicación por URL entre distintos `prospecto_id`; dos keywords distintas pueden apuntar a la misma landing

**Relevancia para LM-003A-B:** Alta. Es el puente obligatorio entre captura y staging. Se ejecutará para cada lote de keywords de seguros.

### 5.2 Extracción de emails/teléfonos/WhatsApp — `scripts/enrich-stg-contact-from-landing.js`

**Qué hace:** Para cada registro en `la_stg_prospectos` con URL válida, hace fetch HTTP de la landing page, analiza HTML y texto para extraer email, teléfono y WhatsApp. Inserta contactos normalizados en `la_stg_prospectos_contactos` y actualiza `la_stg_prospectos`.

**Lee:** `la_stg_prospectos`, HTML de landing page remota
**Escribe:** `la_stg_prospectos` (UPDATE), `la_stg_prospectos_contactos` (INSERT)

**Campos que completa:**
- `la_stg_prospectos.email_extraido`, `telefono_extraido`, `whatsapp_extraido`
- `la_stg_prospectos.error_msg` en caso de fallo
- `la_stg_prospectos_contactos.{stg_prospecto_id, prospecto_id, tipo, valor, valor_normalizado, es_principal, fuente, url_fuente}`

**Riesgos:**
- Vulnerable a HTTP 429/403 (rate limiting) — 14 registros con error_msg por esto
- Solo guarda el "mejor" email en `email_extraido`; emails secundarios solo van a `la_stg_prospectos_contactos`
- `es_principal` puede quedar inconsistente si el email detectado es nuevo
- Limpieza previa (`cleanup`) está deshabilitada en modo conservador
- Sin reintentos automáticos ante fallos HTTP

**Relevancia para LM-003A-B:** Crítica. Es la única fuente de contactos estructurados. Para brokers de seguros, es probable que las landings tengan múltiples emails (comercial, siniestros, admin), lo que hace valiosa la tabla de contactos normalizada.

### 5.3 Enriquecimiento de nombre — `scripts/enrich-stg-nom-from-landing.js`

**Qué hace:** Completa el campo `nom` en `la_stg_prospectos` usando señales locales (dominio del email, token de la URL) y opcionalmente fetch web (HTML title, JSON-LD, meta tags).

**Lee:** `la_stg_prospectos`; opcionalmente HTML de landing
**Escribe:** `la_stg_prospectos` (UPDATE `nom`)

**Riesgos:**
- Nombres derivados de dominio pueden ser imprecisos (ej: `Sancristobal` en vez de `San Cristóbal Seguros`)
- El fetch web opcional consume recursos de red y puede fallar

**Relevancia para LM-003A-B:** Media. Para prospectos de seguros, el nombre comercial correcto es importante para la exportación a Dolibarr.

### 5.4 Inserción en `la_prospectos` — `src/api/server.js` (POST /api/prospectos)

**Qué hace:** Recibe prospectos desde el scraper local, verifica duplicados por `keyword + landingUrl`, guarda screenshot, ejecuta OCR (auxiliar) e inserta en `la_prospectos`.

**Lee:** `la_prospectos` (dup check)
**Escribe:** `la_prospectos` (INSERT)

**Campos que completa:**
- `palabra_clave`, `url_anuncio`, `url_landing`, `texto_extraido`, `metadata`

**Riesgos:**
- OCR es secundario; `texto_extraido` puede quedar NULL
- Deduplicación solo por `keyword + url_landing`
- El campo `metadata` se usa para `screenshot_path`, `received_via`, `timestamp`, `user_agent`

**Relevancia para LM-003A-B:** Alta. Es el endpoint de entrada para el scraper local. El campo `metadata` (JSON) es clave para almacenar fuente, score y tipo de actor.

### 5.5 Scraper VPS — `src/scraper/leadmaster_scraper.js`

**Qué hace:** Scraper headless que busca en Google, hace clic en anuncios, toma screenshot, OCR e inserta directo en `la_prospectos`.

**Lee:** Google SERP, landing page
**Escribe:** `la_prospectos` (INSERT directo, sin pasar por API)

**Riesgos:**
- Camino alternativo a la API; puede generar registros con distinta semántica de metadata
- No hace check de duplicados antes de insertar (solo reacciona a `ER_DUP_ENTRY`)
- Obsoleto respecto al flujo recomendado (scraper-local → API)

**Relevancia para LM-003A-B:** Baja. Es legacy. Para el lote de seguros conviene usar el flujo vigente (local → API → sync → enrich).

### 5.6 Búsqueda de keywords en `ll_keywords_leadmaster`

**Archivos:** `scripts/run-db-batch.js`, `config/create_ll_keywords_leadmaster.sql`

**Función:** La tabla `ll_keywords_leadmaster` es el catálogo de keywords a buscar. El script `run-db-batch.js` lee keywords activas (filtrables por `sector`, `prioridad`, `origen`) y lanza el scraper local para cada una.

**Relevancia para LM-003A-B:** Fundamental. Se deben insertar keywords de seguros con `sector = 'seguros'` para que el batch las procese.

### 5.7 Uso de campos clave en scripts

| Campo | Dónde se usa |
|-------|-------------|
| `place_id` | `sync-stg-prospectos.js` (setea NULL), migraciones (índice idx_place_id). Actualmente sin poblar. |
| `cliente_id` | `sync-stg-prospectos.js` (requerido), `enrich-stg-contact` (no lo modifica) |
| `palabra_clave` | Origen en `leadmaster_scraper.js` y `api/server.js`; propagado a staging |
| `ref_ext` | `sync-stg-prospectos.js` (formato `leadmaster:{id}`). Preparado para exportación a `llxbx_societe.ref_ext` |
| `url_landing` | Captura, sync, enriquecimiento. Normalizada con triggers en staging. |
| `contacto_estado` | Poblado manualmente o por scripts de corrección. No hay script automático que lo actualice. |
| `metadata` (JSON) | `leadmaster_scraper.js` y `api/server.js`. Guarda `screenshot_path`, `success`, `error`, `timestamp`, `user_agent`. |

---

## 6. Evaluación para LM-003A-B seguros

### 6.1 Capacidad de representación con las tablas actuales

| Requisito | ¿Representable? | Cómo |
|-----------|:---:|------|
| Fuente (Google Ads / orgánico top 10 / Places / manual) | **Sí** | Campo `metadata` (JSON) en `la_prospectos` o nuevo campo `fuente` en staging |
| Query origen (keyword buscada) | **Sí** | `palabra_clave` en ambas tablas |
| Plaza / ciudad | **Parcial** | No hay campo específico. Podría ir en `metadata` o como nuevo campo en staging |
| Tipo de actor (broker, productor, sociedad, organizador, insurtech) | **No** | No existe campo. Requiere nuevo campo o uso de `metadata` |
| Evidencia de anuncio o resultado orgánico | **Sí** | `url_anuncio` en `la_prospectos`, `texto_extraido`, `metadata.screenshot_path` |
| Score comercial | **No** | No existe campo. Requiere nuevo campo numérico o uso de `metadata` |
| Validación SSN | **No** | No hay campo para CUIT/SSN. Podría ir en `metadata` o en staging |
| Estado de depuración | **Sí** | `contacto_estado` en staging (6 valores: pendiente, corregido_manual, sin_email, descartado, validado_manual, error_tecnico) |
| Contacto principal | **Sí** | `email_extraido` / `telefono_extraido` / `whatsapp_extraido` en staging + `es_principal` en contactos |
| Múltiples contactos por prospecto | **Sí** | `la_stg_prospectos_contactos` (varios emails/teléfonos/WhatsApp por prospecto) |

### 6.2 Lo que falta

1. **Tipo de actor** — No hay clasificación de si el prospecto es broker, productor, sociedad de productores, organizador, insurtech. Es un dato crítico para el briefing.
2. **Plaza/ciudad** — No hay campo geográfico explícito. Las keywords pueden incluir la plaza (ej: "broker de seguros CABA") pero no se extrae estructuradamente.
3. **Score comercial** — No existe una métrica numérica de calidad del prospecto.
4. **Validación SSN/CUIT** — No hay campo para almacenar identificador fiscal.
5. **Fuente explícita** — Aunque `metadata` puede contenerlo, no hay un campo dedicado que distinga Google Ads de orgánico de Places.

---

## 7. Recomendación de modelo

### **Opción B: Las tablas actuales alcanzan con nuevos valores/enums/campos mínimos**

**Justificación:**

1. **La estructura base es sólida y genérica.** El pipeline de 3 capas (captura → staging → contactos) cubre el flujo completo desde búsqueda hasta contacto validado.

2. **El campo `metadata` (JSON) en `la_prospectos`** proporciona flexibilidad sin alterar el esquema. Puede almacenar `fuente`, `tipo_actor`, `plaza`, `score_comercial`, `validacion_ssn` y `evidencia` sin necesidad de nuevas columnas.

3. **La tabla `la_stg_prospectos_contactos`** ya soporta múltiples contactos por prospecto, lo cual es ideal para brokers que suelen tener emails separados para comercial, siniestros, administración, etc.

4. **Los estados existentes** (`contacto_estado`, `estado`) cubren el ciclo de depuración.

5. **Solo se requieren cambios mínimos:**
   - Agregar `tipo_actor` como ENUM o VARCHAR en `la_stg_prospectos`
   - Agregar `plaza` como VARCHAR en `la_stg_prospectos`
   - Insertar keywords en `ll_keywords_leadmaster` con `sector = 'seguros'`
   - Estandarizar el uso de `metadata` para fuente, score y evidencia

**Alternativas descartadas:**

- **Opción A (sin cambios):** Insuficiente para clasificar tipo de actor y plaza.
- **Opción C (tabla nueva):** Innecesaria. Duplicaría estructura sin ganancia funcional.
- **Opción D (vista/tabla auxiliar):** Útil como complemento posterior, pero no como solución primaria.

### Cambios mínimos sugeridos

```sql
-- 1. Agregar tipo_actor a staging
ALTER TABLE la_stg_prospectos
  ADD COLUMN tipo_actor ENUM('broker','productor','sociedad_productores','organizador','insurtech','compania','otro') NULL
  COMMENT 'Clasificación LM-003A-B del tipo de actor de seguros'
  AFTER nom;

-- 2. Agregar plaza a staging
ALTER TABLE la_stg_prospectos
  ADD COLUMN plaza VARCHAR(100) NULL
  COMMENT 'Ciudad/plaza geográfica del prospecto'
  AFTER tipo_actor;
```

> **Nota:** Estos ALTER no se ejecutan en esta auditoría. Quedan como recomendación para fase de implementación.

---

## 8. Propuesta de consultas SQL para seleccionar prospectos de seguros

### 8.1 Por `palabra_clave` en `la_prospectos`

```sql
SELECT id, palabra_clave, url_landing, es_valido
FROM la_prospectos
WHERE palabra_clave REGEXP '(seguro|broker|productor|asegurador|ART|caucion|flota|poliza|siniestro|cotizador)'
  AND (es_valido IS NULL OR es_valido = 1)
ORDER BY id DESC;
```

### 8.2 Por `nom` en staging

```sql
SELECT s.id, s.prospecto_id, s.nom, s.url_landing, s.email_extraido, s.telefono_extraido, s.contacto_estado
FROM la_stg_prospectos s
WHERE s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador|ART|caucion|poliza)'
ORDER BY s.prospecto_id DESC;
```

### 8.3 Por `url_landing` en staging

```sql
SELECT s.id, s.prospecto_id, s.nom, s.url_landing, s.email_extraido
FROM la_stg_prospectos s
WHERE s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza|siniestro|art-|caucion)'
ORDER BY s.prospecto_id DESC;
```

### 8.4 Por `email_extraido` en staging

```sql
SELECT s.id, s.prospecto_id, s.nom, s.email_extraido, s.url_landing
FROM la_stg_prospectos s
WHERE s.email_extraido REGEXP '@(broker|seguros?|productor|asegurador|insurtech|ssn|sns)'
ORDER BY s.prospecto_id DESC;
```

### 8.5 Por contactos asociados

```sql
SELECT c.prospecto_id, c.tipo, c.valor, c.fuente, s.nom, s.url_landing
FROM la_stg_prospectos_contactos c
JOIN la_stg_prospectos s ON c.stg_prospecto_id = s.id
WHERE c.valor REGEXP '(seguro|broker|productor|asegurador|insurtech|art|caucion|flota|organizador|cotizador)'
ORDER BY c.prospecto_id;
```

### 8.6 Candidatos combinados (búsqueda amplia)

```sql
SELECT DISTINCT s.prospecto_id, s.nom, s.url_landing, s.email_extraido, s.telefono_extraido, s.contacto_estado
FROM la_stg_prospectos s
LEFT JOIN la_prospectos p ON s.prospecto_id = p.id
WHERE
  -- Por palabra clave
  (p.palabra_clave REGEXP '(broker|productor|seguros?|ART|caucion|flota|organizador|cotizador|poliza|siniestro)')
  OR
  -- Por nombre comercial
  (s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador|ART)')
  OR
  -- Por URL de landing
  (s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza|art-|caucion)')
  OR
  -- Por email
  (s.email_extraido REGEXP '(seguro|broker|productor|asegurador|insurtech|ssn)')
ORDER BY s.prospecto_id;
```

### 8.7 Búsqueda específica por tipo de actor (requiere `tipo_actor`)

```sql
-- Requiere la columna tipo_actor agregada (ver sección 7)
SELECT s.prospecto_id, s.nom, s.email_extraido, s.telefono_extraido, s.contacto_estado
FROM la_stg_prospectos s
WHERE s.tipo_actor IN ('broker', 'productor', 'sociedad_productores', 'organizador', 'insurtech')
ORDER BY s.prospecto_id;
```

---

## 9. Riesgos y advertencias

### 9.1 Trazabilidad
- **Pérdida de trazabilidad entre búsqueda y staging:** Si se modifica `palabra_clave` o `url_landing` manualmente en staging, se pierde la relación con la búsqueda original. El campo `ref_ext` mitiga esto parcialmente.
- **Sin bitácora de cambios:** No hay tabla de auditoría que registre quién modificó qué y cuándo.

### 9.2 Duplicados
- **19 grupos de email duplicados, 11 de teléfono, 7 de WhatsApp.** Muchos corresponden a la misma empresa capturada con distintas keywords. Esto es esperable pero debe gestionarse antes de exportar a Dolibarr.
- **Mismo prospecto capturado con keywords distintas:** `answerseguros.com.ar` aparece con "seguro de auto para empresas", pero también podría aparecer con otra keyword. La deduplicación actual es por `prospecto_id + cliente_id`, no por dominio o email.

### 9.3 Campos mal usados o subutilizados
- **`place_id`:** 100% NULL. El campo existe pero ningún script lo puebla. El estado `pendiente_place_id` es el default para el 100% de los registros.
- **`estado`:** Monovalor (`pendiente_place_id`). No refleja el estado real del prospecto.
- **`texto_extraido`:** 37% NULL. Por diseño (OCR abandonado como fuente principal), pero el campo sigue existiendo.
- **`metadata`:** Subutilizado. Solo guarda datos técnicos del scraper, no datos de negocio.

### 9.4 Falta de fuente
- No hay campo explícito que distinga si un prospecto vino de Google Ads (anuncio patrocinado), resultado orgánico (top 10), Google Places o carga manual. El campo `metadata` podría usarse para esto pero actualmente no se hace.

### 9.5 Falta de query/plaza
- La keyword se guarda, pero la plaza geográfica no se extrae estructuradamente. "broker de seguros CABA" deja "CABA" enterrado en la keyword.

### 9.6 Prospecto LeadMaster vs lead final
- Las tablas actuales no distinguen entre "este registro ES un prospecto LeadMaster" (cliente potencial de LeadMaster) y "este registro es un lead final" (cliente potencial del cliente de LeadMaster). Para LM-003A-B, los prospectos SON brokers de seguros que podrían ser clientes de LeadMaster, no leads de seguros para un broker. Esta distinción debe ser clara en el equipo.
- El campo `cliente_id` permite segmentar, pero su semántica es ambigua: ¿es el cliente LeadMaster que recibe el lead, o es el propio LeadMaster como cliente?

### 9.7 Contactos múltiples
- `la_stg_prospectos_contactos` soporta múltiples contactos, pero el script de enriquecimiento solo persiste el "mejor" email/teléfono/WhatsApp en `email_extraido`. Contactos secundarios requieren scraping adicional o carga manual.
- Riesgo de inconsistencia: `email_extraido` en staging puede no coincidir con el contacto marcado como `es_principal = 1` en la tabla de contactos.

### 9.8 Mezcla staging con base final
- Si se ejecuta `sync-stg-prospectos.js` sin control de rango, puede reprocesar prospectos ya validados y pisar correcciones manuales.
- No hay un flag de "congelado" o "exportado" que evite modificaciones posteriores a la exportación a Dolibarr.

---

## 10. Próximos pasos

1. **[Inmediato] Insertar keywords de seguros** en `ll_keywords_leadmaster` con `sector = 'seguros'` y `prioridad = 'alta'`. Ver Anexo A para lista sugerida de 80-110 keywords.

2. **[Previo a scraping] Definir `cliente_id`** para el lote LM-003A-B. Evaluar si se usa un cliente existente (52 o 1268) o se crea uno nuevo específico para LeadMaster como cliente de sí mismo.

3. **[Previo a scraping] Estandarizar `metadata`** para incluir:
   - `fuente` (google_ads, organico_top10, google_places, manual)
   - `tipo_actor` (broker, productor, sociedad_productores, organizador, insurtech)
   - `plaza` (ciudad)
   - `score_comercial` (1-10)
   - `validacion_ssn` (CUIT si disponible)

4. **[Post-scraping] Ejecutar pipeline completo** para el lote:
   ```
   ll_keywords_leadmaster → scraper-local → API → la_prospectos
   → sync-stg-prospectos → enrich-stg-contact → enrich-stg-nom
   → validación manual de contacto_estado → exportación a Dolibarr
   ```

5. **[Implementación futura] Agregar columnas `tipo_actor` y `plaza`** a `la_stg_prospectos` (ver ALTER sugerido en sección 7).

6. **[Implementación futura] Agregar índice** en `la_prospectos.metadata` si las consultas por JSON path se vuelven frecuentes (MySQL 5.7+ soporta `GENERATED` columns con `JSON_EXTRACT`).

7. **[Gobernanza] Definir una política de deduplicación** antes de la exportación a Dolibarr:
   - ¿Un mismo dominio puede aparecer con múltiples keywords?
   - ¿Qué email se elige como principal si hay varios?
   - ¿Se mergean prospectos que apuntan al mismo broker?

8. **[Monitoreo] Establecer queries de control de calidad** para el lote:
   - % de prospectos con email
   - % de prospectos con teléfono/WhatsApp
   - % de prospectos con `nom` poblado
   - Distribución por `tipo_actor`
   - Distribución por `plaza`

---

## Anexo A — Keywords sugeridas para LM-003A-B (80-110)

### Brokers de seguros (25 keywords)

```
broker de seguros para empresas en {PLAZA}
broker de seguros patrimoniales Argentina
broker de seguros para pymes
corredor de seguros empresas
productor asesor de seguros para industrias
broker de seguros ART
broker de seguros de caución
broker de seguros flotas vehiculares
broker de seguros responsabilidad civil
broker de seguros vida empresarial
productor de seguros matriculado {PLAZA}
sociedad de productores de seguros
organizador de productores de seguros
broker de seguros internacional
broker de seguros agropecuarios
broker de seguros transporte mercadería
broker de seguros construction
broker de seguros energía
asesor de seguros para empresas
consultora de seguros corporativos
corredor de reaseguros
bróker de seguros multinacional
productor asesor de seguros independiente
broker de seguros marítimos
broker de seguros aeronáuticos
```

### Insurtech / brokers digitales (20 keywords)

```
cotizador de seguros online para empresas
insurtech Argentina seguros empresas
plataforma de cotización de seguros para pymes
seguros digitales para flotas
cotizador de ART online
app de seguros para productores
software de gestión para productores de seguros
marketplace de seguros para empresas
cotizador comparador de seguros empresariales
plataforma de seguros para brokers
insurtech de caución
seguros on-demand para pymes
api de cotización de seguros
cotizador multicompañía seguros
seguros 100% digital empresas
cotizador de seguros de responsabilidad civil
insurtech de seguros patrimoniales
plataforma de suscripción de seguros digitales
cotizador inteligente de seguros
marketplace de seguros corporativos
```

### Especialistas (25 keywords)

```
seguros ART para empresas {PLAZA}
seguros de caución para constructoras
seguros de flotas vehiculares corporativas
seguros para flotas de camiones
seguros de responsabilidad civil profesional
seguros de ingeniería y construcción
seguros ambientales para industrias
seguros de ciberriesgo para empresas
seguros de directores y ejecutivos D&O
seguros de crédito para exportadores
seguros de garantía aduanera
seguros de transporte internacional de carga
seguros de maquinaria y equipo
seguros de todo riesgo operativo
seguros de responsabilidad de producto
seguros de recall para alimentos
seguros de accidentes personales corporativos
seguros de salud empresarial
seguros de protección de garantía extendida
seguros de lucro cesante
seguros de fidelidad de empleados
seguros de riesgos del trabajo
seguros de cascos marítimos
seguros de casco aeronáutico
seguros de responsabilidad civil médica
```

### Organizadores / sociedades (10 keywords)

```
organizador de productores de seguros {PLAZA}
sociedad de productores asesores de seguros
grupo de productores de seguros
red de brokers de seguros Argentina
asociación de productores de seguros
cámara de productores de seguros
federación de productores de seguros
alianza de brokers de seguros independientes
pool de productores de seguros
cluster de brokers de seguros
```

> **PLAZA** = CABA, Rosario, Córdoba, Mendoza, La Plata, Mar del Plata, Tucumán, Neuquén, Bahía Blanca, Salta, Santa Fe, Paraná, Corrientes, Posadas, Resistencia, San Juan, San Luis, San Miguel de Tucumán, Comodoro Rivadavia, Río Gallegos, Ushuaia, Bariloche.

---

## Anexo B — Consultas de verificación post-carga

```sql
-- Distribución del lote por tipo de actor
SELECT tipo_actor, COUNT(*) AS cantidad
FROM la_stg_prospectos
WHERE tipo_actor IS NOT NULL
GROUP BY tipo_actor;

-- Prospectos sin contacto (para revisión manual)
SELECT s.prospecto_id, s.nom, s.url_landing, s.contacto_estado
FROM la_stg_prospectos s
WHERE s.email_extraido IS NULL AND s.telefono_extraido IS NULL;

-- Top emails institucionales (posibles brokers grandes)
SELECT s.nom, s.email_extraido, s.url_landing, COUNT(*) OVER() AS total
FROM la_stg_prospectos s
WHERE s.email_extraido NOT REGEXP '@(gmail|hotmail|yahoo|outlook)\.'
ORDER BY s.prospecto_id;

-- Cobertura de contactos del lote
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN email_extraido IS NOT NULL THEN 1 ELSE 0 END) AS con_email,
  SUM(CASE WHEN telefono_extraido IS NOT NULL THEN 1 ELSE 0 END) AS con_telefono,
  SUM(CASE WHEN whatsapp_extraido IS NOT NULL THEN 1 ELSE 0 END) AS con_whatsapp,
  SUM(CASE WHEN nom IS NOT NULL THEN 1 ELSE 0 END) AS con_nom
FROM la_stg_prospectos;
```

---

## Anexo C — Mapa de flujo de datos

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FLUJO LEADMASTER COMPLETO                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ll_keywords_leadmaster (catálogo)                                  │
│  │ sector=seguros, prioridad=alta                                   │
│  ▼                                                                  │
│  scripts/run-db-batch.js                                            │
│  │                                                                  │
│  ▼                                                                  │
│  src/local/scraper-local.js ──(POST /api/prospectos)──▶            │
│  │                                                       │          │
│  ▼                                                       ▼          │
│  Google SERP                                   src/api/server.js    │
│  │ (click humano/anuncio)                       │                   │
│  ▼                                              ▼                   │
│  Landing page                          la_prospectos               │
│    │                                   │ id, palabra_clave,         │
│    │                                   │ url_landing, metadata,     │
│    │                                   │ texto_extraido, es_valido  │
│    │                                   │                            │
│    │              scripts/sync-stg-prospectos.js                    │
│    │              │ (--cliente-id N)                                │
│    │              ▼                                                 │
│    │       la_stg_prospectos                                        │
│    │       │ prospecto_id, nom, url_landing,                        │
│    │       │ email_extraido, telefono_extraido,                     │
│    │       │ whatsapp_extraido, contacto_estado,                    │
│    │       │ tipo_actor ★, plaza ★                                  │
│    │       │                                                        │
│    │       │ scripts/enrich-stg-contact-from-landing.js             │
│    │       │ scripts/enrich-stg-nom-from-landing.js                 │
│    │       ▼                                                        │
│    │  la_stg_prospectos_contactos                                   │
│    │  │ stg_prospecto_id, tipo, valor,                              │
│    │  │ valor_normalizado, es_principal, fuente                     │
│    │  │                                                             │
│    │  │ (Validación manual: contacto_estado)                        │
│    │  ▼                                                             │
│    └──▶ Exportación a llxbx_societe (Dolibarr)                      │
│          (script pendiente de implementación)                        │
│                                                                     │
│  ★ = columnas sugeridas para LM-003A-B (no implementadas aún)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Documento generado como parte de la auditoría LM-003A-B. No se realizaron modificaciones de código ni base de datos.*
