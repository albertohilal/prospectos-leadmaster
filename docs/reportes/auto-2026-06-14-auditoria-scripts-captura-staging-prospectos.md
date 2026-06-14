# Auditoría de scripts de captura y staging de prospectos

Fecha: 14 de junio de 2026
Proyecto: LeadMaster
Autor: Agente OpenClaw
Estado: Revisado

## Resumen ejecutivo

La auditoría confirma que el flujo actual no tiene una única tubería lineal sino al menos dos caminos de captura para `la_prospectos` y dos orquestadores de keywords para el scraper local. El flujo vigente recomendado por la documentación es `src/local/scraper-local.js` -> `src/api/server.js`, mientras que `src/scraper/leadmaster_scraper.js` queda como camino histórico o auxiliar.

El flujo vigente ya no debe depender de OCR como fuente operativa principal. Por eso `la_prospectos.texto_extraido = NULL` y, por arrastre, `la_stg_prospectos.texto_extraido = NULL`, deben leerse como una consecuencia esperable del diseño actual y no como una anomalía crítica.

El componente crítico pasa a ser `scripts/enrich-stg-contact-from-landing.js`, que realiza el fetch HTML posterior, detecta contactos y puede poblar `la_stg_prospectos` y `la_stg_prospectos_contactos`. Para el caso Eqssolutions, ese enriquecedor sí detectó correctamente email, teléfono y WhatsApp en `dry-run`, lo que desplaza el foco del diagnóstico desde OCR hacia la robustez del reproceso HTML y su persistencia.

En Eqssolutions, la falla relevante no fue de extracción sino de persistencia automática: el `dry-run` detectó datos útiles, pero la corrida posterior con escritura volvió a consultar la landing, recibió `HTTP 429` y dejó `error_msg = HTTP 429`. La carga final del registro se resolvió manualmente en staging y en la tabla normalizada de contactos.

No se encontró en este repo un script ejecutable que exporte o inserte efectivamente en `iunaorg_dyd.llxbx_societe`. Esa etapa está documentada, pero no implementada aquí como script operativo.

## Alcance

Modo de trabajo aplicado en la auditoría de código:

* Lectura de código, scripts, documentación y SQL versionado.
* Sin modificación de código fuente.
* Sin ejecución de scraping masivo.
* Sin migraciones.
* Sin creación de scripts nuevos.
* La escritura documental realizada fue este informe.

Validación operativa posterior:

* Se ejecutó una prueba controlada del enriquecedor para `prospecto_id = 149`.
* Primero en modo `dry-run`.
* Luego en modo escritura con `--no-overwrite`, que falló por `HTTP 429`.
* Finalmente se corrigió manualmente el registro en `la_stg_prospectos` y `la_stg_prospectos_contactos` usando los datos detectados en `dry-run`.

Tablas objetivo auditadas:

* `iunaorg_dyd.la_prospectos`
* `iunaorg_dyd.la_stg_prospectos`
* `iunaorg_dyd.la_stg_prospectos_contactos`
* `iunaorg_dyd.llxbx_societe`

Palabras y campos rastreados:

* `la_prospectos`, `la_stg_prospectos`, `la_stg_prospectos_contactos`, `llxbx_societe`
* `texto_extraido`, `email_extraido`, `valor_normalizado`
* `url_landing`, `prospecto_id`, `stg_prospecto_id`
* `scraping`, `scraper`, `crawl`, `landing`

## Archivos revisados

Revisión directa de 28 archivos:

* `docs/REGLAS-INFORMES.md`
* `package.json`
* `README.md`
* `docs/README-scraper.md`
* `docs/reportes/2026-04-11-flujo-extraccion-capturas-bd.md`
* `docs/reportes/2026-04-18-informe-staging-placeid-leadmaster-iunaorg.md`
* `docs/reportes/2026-05-07-guia-proceso-leads-a-dolibarr.md`
* `docs/reportes/2026-06-06-api-prospectos-pm2-8080.md`
* `docs/reportes/2026-06-12-migracion-la-tables-iunaorg-dyd.md`
* `src/shared/config.js`
* `src/local/scraper-local.js`
* `src/api/server.js`
* `src/scraper/leadmaster_scraper.js`
* `scripts/README.md`
* `scripts/run-local.sh`
* `scripts/run-daily-batch.sh`
* `scripts/run-db-batch.js`
* `scripts/sync-stg-prospectos.js`
* `scripts/enrich-stg-contact-from-landing.js`
* `scripts/enrich-stg-nom-from-landing.js`
* `scripts/monitor-upload-capturas.sh`
* `scripts/image-ocr.sh`
* `config/create_table.sql`
* `config/migration_add_url_landing_hash.sql`
* `config/migration_dedupe_keyword_url.sql`
* `config/migration_normalize_stg_url_landing.sql`
* `config/migration_add_nom_stg.sql`
* `config/migration_add_phone_whatsapp_stg.sql`

## Flujo actual detectado

Flujo vigente recomendado:

```text
Google Ads / Landing / API
   ↓
src/local/scraper-local.js
   ↓ POST /api/prospectos (+ GET /api/prospectos/check-processed)
src/api/server.js
   ↓
la_prospectos
   ↓
scripts/sync-stg-prospectos.js
   ↓
la_stg_prospectos
   ↓
scripts/enrich-stg-contact-from-landing.js
   ↓
la_stg_prospectos_contactos
   ↓
sin script ejecutable en este repo; solo estrategia documentada hacia llxbx_societe
```

Flujo alternativo histórico o auxiliar:

```text
Google Ads / Landing
   ↓
src/scraper/leadmaster_scraper.js
   ↓
la_prospectos
   ↓
scripts/sync-stg-prospectos.js
   ↓
la_stg_prospectos
   ↓
scripts/enrich-stg-contact-from-landing.js
   ↓
la_stg_prospectos_contactos
```

Para cada flecha principal:

* `Google Ads -> la_prospectos`: `src/local/scraper-local.js` + `src/api/server.js`, o alternativamente `src/scraper/leadmaster_scraper.js`.
* `la_prospectos -> la_stg_prospectos`: `scripts/sync-stg-prospectos.js`.
* `la_stg_prospectos -> la_stg_prospectos_contactos`: `scripts/enrich-stg-contact-from-landing.js`.
* `la_stg_prospectos -> llxbx_societe`: no hay script versionado; solo guías y comentarios de esquema.

## Scripts que intervienen por etapa

### Etapa 1 — Captura inicial en la_prospectos

| Ruta                                 | Tipo                     | Tarea                                                                                                                                                         | Lee                                                        | Escribe                            | Campos relevantes                                                                        | Extrae texto                                 | Extrae emails | Múltiples contactos | Estado aparente                       | Invocación                                                                       |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- | ------------- | ------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| `src/local/scraper-local.js`         | script local             | Navega con Playwright visible, detecta landing válida, evita duplicados de sesión y remotos, envía payload a API                                              | Google/landing, endpoint `/api/prospectos/check-processed` | No escribe DB directo; envía a API | `keyword`, `landingUrl`, `screenshotBase64` opcional                                     | No                                           | No            | No                  | Activo y vigente                      | `npm run local:start`, `node src/local/scraper-local.js ...`, invocado por batch |
| `src/api/server.js`                  | service + endpoints      | Recibe prospectos, guarda screenshot si existe, mantiene OCR como capacidad histórica/auxiliar e inserta en `la_prospectos`, expone health/listado/validación | request HTTP, `la_prospectos` para check de duplicado      | `la_prospectos`                    | `palabra_clave`, `url_anuncio`, `url_landing`, `texto_extraido`, `metadata`, `es_valido` | Sí, pero no es la fuente operativa principal | No            | No                  | Activo y vigente                      | `npm run api:start`, PM2 documentado en 8080                                     |
| `src/scraper/leadmaster_scraper.js`  | script scraper VPS       | Hace búsqueda/click automático, screenshot, OCR e insert directo en `la_prospectos`                                                                           | Google/landing                                             | `la_prospectos`                    | `palabra_clave`, `url_anuncio`, `url_landing`, `texto_extraido`, `metadata`, `es_valido` | Sí, histórico/auxiliar                       | No            | No                  | Legacy o auxiliar                     | `npm run scraper:start`, CLI manual                                              |
| `scripts/run-daily-batch.sh`         | job/batch shell          | Orquesta keywords hardcodeadas y lanza el scraper local por rango                                                                                             | array local de keywords                                    | No DB de prospectos                | keyword, `--target`, `--manual`                                                          | No                                           | No            | No                  | Activo, pero histórico                | CLI manual                                                                       |
| `scripts/run-db-batch.js`            | job/batch Node           | Lee `ll_keywords_leadmaster` y lanza scraper local; actualiza seguimiento de keywords                                                                         | `ll_keywords_leadmaster`                                   | `ll_keywords_leadmaster`           | `keyword`, `veces_buscada`, `ultima_busqueda_at`                                         | No                                           | No            | No                  | Activo y más reciente                 | `npm run db:batch`, CLI manual                                                   |
| `scripts/monitor-upload-capturas.sh` | monitor/systemd auxiliar | Sube capturas por rsync al VPS al detectar archivos nuevos                                                                                                    | carpeta `AUXILIAR/CAPTURAS`                                | No DB                              | archivos de captura                                                                      | No                                           | No            | No                  | Auxiliar, paralelo al flujo principal | `monitor-upload-capturas`, systemd                                               |

### Etapa 2 — Extracción de texto y emails

| Ruta                                         | Tipo                                | Tarea                                                                                                                         | Lee                                     | Escribe                                            | Campos relevantes                                                                                                  | Extrae texto | Extrae emails | Múltiples contactos | Estado aparente | Invocación                               |
| -------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ | ------------- | ------------------- | --------------- | ---------------------------------------- |
| `src/api/server.js`                          | service                             | OCR histórico/auxiliar de screenshot recibido y persistencia opcional de `texto_extraido` en origen                           | screenshot base64                       | `la_prospectos`                                    | `texto_extraido`, `metadata.screenshot_path`                                                                       | Sí           | No            | No                  | Activo          | Endpoint HTTP                            |
| `src/scraper/leadmaster_scraper.js`          | script                              | OCR histórico/auxiliar en VPS antes de insertar en `la_prospectos`                                                            | screenshot capturado por Playwright     | `la_prospectos`                                    | `texto_extraido`                                                                                                   | Sí           | No            | No                  | Legacy/auxiliar | CLI manual                               |
| `scripts/enrich-stg-contact-from-landing.js` | script de reproceso/enriquecimiento | Hace fetch de landing, analiza HTML crudo + texto limpio, extrae email/teléfono/whatsapp, actualiza stage y tabla normalizada | `la_stg_prospectos`, landing URL remota | `la_stg_prospectos`, `la_stg_prospectos_contactos` | `email_extraido`, `telefono_extraido`, `whatsapp_extraido`, `valor_normalizado`, `tipo`, `url_fuente`, `error_msg` | No OCR       | Sí            | Sí                  | Activo          | `npm run stg:enrich-contact`, CLI manual |
| `scripts/image-ocr.sh`                       | utilidad manual                     | OCR manual sobre imágenes, sin persistencia en DB                                                                             | archivo imagen                          | No DB                                              | texto OCR a stdout/archivo                                                                                         | Sí           | No            | No                  | Auxiliar/manual | CLI manual                               |

Notas de auditoría de esta etapa:

* El extractor de emails de `scripts/enrich-stg-contact-from-landing.js` no depende solo de texto visible: busca regex de email sobre `rawHtml` y sobre el texto limpiado.
* También puede encontrar emails dentro de atributos `mailto:` porque analiza el HTML crudo, aunque no siga enlaces `mailto:` en la exploración de páginas.
* El script no guarda necesariamente todos los emails detectados: usa `extractBestEmail(...)` y selecciona un único “mejor email” para poblar `la_stg_prospectos.email_extraido`.
* Si el sitio renderiza el email por JavaScript cliente, ofusca el email o bloquea el fetch simple, el script puede dejar `email_extraido = NULL` aunque el navegador humano sí lo muestre.

### Etapa 3 — Generación de la_stg_prospectos

| Ruta                                             | Tipo              | Tarea                                                                       | Lee                 | Escribe             | Campos relevantes                                                                                   | Extrae texto | Extrae emails | Múltiples contactos | Estado aparente                 | Invocación    |
| ------------------------------------------------ | ----------------- | --------------------------------------------------------------------------- | ------------------- | ------------------- | --------------------------------------------------------------------------------------------------- | ------------ | ------------- | ------------------- | ------------------------------- | ------------- |
| `scripts/sync-stg-prospectos.js`                 | script de sync    | Copia origen a staging, normaliza URL, inserta/actualiza por `prospecto_id` | `la_prospectos`     | `la_stg_prospectos` | `prospecto_id`, `cliente_id`, `ref_ext`, `palabra_clave`, `url_landing`, `texto_extraido`, `estado` | No; copia    | No            | No                  | Activo                          | CLI manual    |
| `config/migration_normalize_stg_url_landing.sql` | migration/trigger | Normaliza `url_landing` en insert/update de staging                         | `la_stg_prospectos` | `la_stg_prospectos` | `url_landing`                                                                                       | No           | No            | No                  | Vigente como soporte de esquema | migración SQL |

Hallazgo de etapa 3:

* `scripts/sync-stg-prospectos.js` no reconstruye `texto_extraido`; solo propaga el valor de `la_prospectos`. Si origen quedó `NULL`, staging queda `NULL`.
* Además, su `ON DUPLICATE KEY UPDATE` hace `texto_extraido = VALUES(texto_extraido)`. Por eso una corrección manual hecha solo en `la_stg_prospectos.texto_extraido` puede perderse en una nueva sincronización si `la_prospectos.texto_extraido` sigue `NULL`. Esto no es crítico si OCR quedó descartado, pero sí importa para no confiar en arreglos manuales solo en staging.

### Etapa 4 — Carga de la_stg_prospectos_contactos

| Ruta                                          | Tipo                      | Tarea                                                                                                | Lee                                  | Escribe                                            | Campos relevantes                                                                                                | Extrae texto | Extrae emails | Múltiples contactos | Estado aparente    | Invocación                   |
| --------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ | ------------- | ------------------- | ------------------ | ---------------------------- |
| `scripts/enrich-stg-contact-from-landing.js`  | script de enriquecimiento | Inserta contactos normalizados por `stg_prospecto_id` y `prospecto_id`, marca principalidad y origen | `la_stg_prospectos`, HTML de landing | `la_stg_prospectos_contactos`, `la_stg_prospectos` | `stg_prospecto_id`, `prospecto_id`, `tipo`, `valor`, `valor_normalizado`, `es_principal`, `fuente`, `url_fuente` | No OCR       | Sí            | Sí                  | Activo             | `npm run stg:enrich-contact` |
| `config/migration_add_phone_whatsapp_stg.sql` | migration                 | Agrega columnas de soporte en stage para teléfono y WhatsApp                                         | `la_stg_prospectos`                  | `la_stg_prospectos`                                | `telefono_extraido`, `whatsapp_extraido`                                                                         | No           | No            | No                  | Soporte de esquema | migración SQL                |

Hallazgo de etapa 4:

* El script puede guardar múltiples contactos de distinto tipo.
* No hay un script alternativo en el repo que cargue `la_stg_prospectos_contactos`; esta etapa depende de un único enriquecedor.
* La lógica actual de `es_principal` para email presenta un riesgo: si el email detectado es nuevo y `storedEmail` estaba vacío, el contacto insertado en `la_stg_prospectos_contactos` puede quedar con `es_principal = 0` aunque ese mismo valor se use como email principal en `la_stg_prospectos.email_extraido`.

### Etapa 5 — Exportación o inserción hacia llxbx_societe

| Ruta                                                        | Tipo                                 | Tarea                                                                    | Lee                                                | Escribe                              | Campos relevantes                                                | Extrae texto | Extrae emails                  | Múltiples contactos | Estado aparente        | Invocación               |
| ----------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- | ------------ | ------------------------------ | ------------------- | ---------------------- | ------------------------ |
| `scripts/enrich-stg-nom-from-landing.js`                    | script de enriquecimiento pre-export | Completa `nom` en stage usando señales locales y opcionalmente fetch web | `la_stg_prospectos`                                | `la_stg_prospectos`                  | `nom`, `email_extraido`, `url_landing`, `prospecto_id`           | No           | Usa email existente como señal | No                  | Activo                 | `npm run stg:enrich-nom` |
| `config/migration_add_nom_stg.sql`                          | migration                            | Agrega `nom` alineado con `llxbx_societe.nom`                            | `la_stg_prospectos`                                | `la_stg_prospectos`                  | `nom`                                                            | No           | No                             | No                  | Soporte de esquema     | migración SQL            |
| `docs/reportes/2026-05-07-guia-proceso-leads-a-dolibarr.md` | documentación                        | Define estrategia de exportación SQL hacia `llxbx_societe`               | `la_stg_prospectos`, `la_stg_prospectos_contactos` | Describe `llxbx_societe`, no ejecuta | `nom`, `email`, `phone`, `phone_mobile`, `ref_ext`, `import_key` | No           | No                             | No                  | Guía, no código activo | lectura operativa        |

Hallazgo de etapa 5:

* No se encontró en `src/` ni en `scripts/` un archivo que haga `INSERT`, `UPDATE` o export real a `iunaorg_dyd.llxbx_societe`.
* `llxbx_societe` aparece solo en documentación y en el comentario del campo `nom`.

## Posibles scripts duplicados o solapados

| Tarea                         | Archivo A                    | Archivo B                            | Diferencia detectada                                                                                                                                             | Riesgo                                                                                                                 | Recomendación                                                                         |
| ----------------------------- | ---------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Captura inicial de prospectos | `src/local/scraper-local.js` | `src/scraper/leadmaster_scraper.js`  | El primero usa navegador visible + clic humano + API; el segundo hace scraping headless y escribe directo a DB                                                   | Dos caminos producen `la_prospectos` con semánticas distintas para `texto_extraido` y deduplicación                    | Declarar uno como oficial. Mantener el VPS scraper como legacy aislado o deprecado    |
| Orquestación de keywords      | `scripts/run-daily-batch.sh` | `scripts/run-db-batch.js`            | Uno usa array hardcodeado de 20 keywords; el otro usa `ll_keywords_leadmaster`                                                                                   | Doble fuente de verdad para qué keywords se procesan                                                                   | Migrar operación diaria al batch DB y dejar el bash como respaldo explícito           |
| Transporte de capturas        | `src/local/scraper-local.js` | `scripts/monitor-upload-capturas.sh` | El scraper local puede mandar screenshot inline a la API; el monitor sube archivos por rsync a una carpeta remota sin integrar DB                                | Puede asumirse erróneamente que una captura subida por monitor genera OCR o update de DB, pero no hay evidencia de eso | Tratar el monitor como canal documental separado, no como reproceso de prospectos     |
| Estrategia de deduplicación   | `src/api/server.js`          | `src/scraper/leadmaster_scraper.js`  | La API verifica duplicado por `keyword + landingUrl` normalizada; el scraper legado resuelve duplicado consultando `url_landing_hash` al capturar `ER_DUP_ENTRY` | Riesgo de reglas distintas según ruta de captura                                                                       | Alinear ambos caminos con la misma clave efectiva: `palabra_clave + url_landing_hash` |

## Hallazgos relevantes

1. El flujo vigente documentado ya no prioriza OCR. Prioriza `url_landing` y deja la extracción estructurada para una segunda pasada basada en HTML/fetch.

2. `texto_extraido = NULL` en `la_prospectos` y `la_stg_prospectos` no debe tratarse como falla crítica. En este proyecto es un efecto esperable del abandono operativo de OCR.

3. `email_extraido` no se llena en `la_prospectos`. Se llena recién en `la_stg_prospectos` con `scripts/enrich-stg-contact-from-landing.js`.

4. `scripts/enrich-stg-contact-from-landing.js` sí usa HTML crudo además del texto visible, y además explora algunas páginas internas del mismo dominio. El problema de `email_extraido = NULL` no se explica bien por “landing ilegible” ni por ausencia de `texto_extraido`.

5. El script elige un único “mejor email” mediante `extractBestEmail(...)`. La tabla `la_stg_prospectos_contactos` puede terminar con múltiples tipos de contacto, pero no necesariamente con todos los emails candidatos presentes en la landing.

6. La documentación de `scripts/README.md` dice que `scripts/enrich-stg-contact-from-landing.js` aplica limpieza previa automática por defecto, pero el código actual arranca con `cleanup=off` y loguea `Limpieza previa deshabilitada en modo conservador.` Hay deriva entre documentación y comportamiento real.

7. `scripts/enrich-stg-contact-from-landing.js` usa `limit` por defecto de 50 y ordena por `prospecto_id ASC`. Como Eqssolutions es `prospecto_id = 149`, una corrida general con límite bajo y sin rango probablemente nunca alcanzó ese registro. Eso refuerza que el problema pudo ser falta de ejecución efectiva sobre el prospecto, no incapacidad de extracción.

8. El endpoint operativo de la API aparece con puertos históricos distintos en la documentación (`3000`, `3001`, `8080`). La evidencia más reciente marca PM2 en `8080`, mientras `src/shared/config.js` conserva `3001` como default local si `.env` no redefine.

9. No existe en este repo un script versionado que exporte a `llxbx_societe`. La etapa final está pendiente de implementación operativa o vive fuera de este repositorio.

### Caso auditado — Eqssolutions

Registro auditado:

* `la_prospectos.id = 149`
* `la_stg_prospectos.id = 263`
* `cliente_id = 52`
* `nom = Eqssolutions`
* `url_landing = https://eqssolutions.com/ingenieria-mantenimiento-instalaciones-electricas`

Ejecución observada en modo `dry-run`:

```bash
npm run stg:enrich-contact -- --dry-run --prospecto-from 149 --prospecto-to 149 --limit 1
```

Resultado observado:

* `Registros leídos: 1`
* `En cola efectiva: 1`
* `Procesados OK: 1`
* `Con actualización de datos: 1`
* `email detectado: comercial@eqs.com.ar`
* `teléfono detectado: +5491177200407`
* `WhatsApp detectado: 1167055105`
* `páginas exploradas: 4`
* modo `dry-run`, sin escritura en base de datos

Interpretación:

* El enriquecedor sí pudo detectar datos válidos para Eqssolutions.
* El problema no era OCR.
* El problema no era `texto_extraido = NULL`.
* El problema no era que la landing fuera ilegible para el reproceso HTML.

Ejecución observada con intento de escritura:

```bash
npm run stg:enrich-contact -- --prospecto-from 149 --prospecto-to 149 --limit 1 --no-overwrite
```

Resultado observado:

* `error: HTTP 429`
* `Procesados OK: 0`
* `Con actualización de datos: 0`
* `Con error fetch/parse: 1`
* el registro quedó con `error_msg = HTTP 429`

Interpretación:

* El `dry-run` exitoso no persistió datos.
* La ejecución posterior con escritura volvió a descargar la landing y recibió rate limit `HTTP 429`.
* Esto evidencia un riesgo operativo concreto: un `dry-run` exitoso puede detectar datos útiles y aun así perder la oportunidad de persistirlos si la corrida posterior vuelve a consultar la landing.

Estado final del caso:

* La persistencia automática no completó el registro.
* La corrección final fue manual.
* En `la_stg_prospectos` quedaron `email_extraido = comercial@eqs.com.ar`, `telefono_extraido = +5491177200407`, `whatsapp_extraido = 1167055105` y `error_msg = NULL`.
* En `la_stg_prospectos_contactos` quedaron 3 registros manuales para `prospecto_id = 149`:

  * email `comercial@eqs.com.ar`, `es_principal = 1`, `fuente = manual`
  * teléfono `+5491177200407`, `es_principal = 1`, `fuente = manual`
  * whatsapp `1167055105`, `es_principal = 1`, `fuente = manual`

## Riesgos

* `texto_extraido` puede quedar `NULL` por diseño y no es bloqueante en el flujo vigente, pero una corrección manual hecha solo en staging puede perderse si `scripts/sync-stg-prospectos.js` vuelve a propagar `NULL` desde origen.
* `email_extraido` puede quedar `NULL` aunque la landing muestre email si el enriquecimiento no corrió, la fila fue omitida por límites/filtros, el fetch devolvió HTML incompleto o el email se renderiza dinámicamente.
* Un `dry-run` exitoso del enriquecedor no deja rastro persistente reutilizable. Si la corrida posterior con escritura recibe `HTTP 429`, puede perderse una detección ya conseguida.
* `scripts/enrich-stg-contact-from-landing.js` puede guardar solo un email “mejor” y descartar otros candidatos útiles para contacto o validación.
* La lógica de `es_principal` para email puede dejar en `0` un email recién detectado aunque ese mismo valor sea el principal de `la_stg_prospectos.email_extraido`.
* Hay múltiples scripts con criterios distintos para captura, OCR y deduplicación.
* El origen de verdad de keywords está duplicado entre batch bash y batch DB.
* El monitor de capturas puede dar una falsa sensación de reproceso automático, pero no se encontró integración directa con DB.
* La divergencia documentación/código en limpieza de stage puede generar ejecuciones operativas con supuestos equivocados.
* Riesgo de que un prospecto quede fuera de procesamiento efectivo si el enriquecedor se corre con límite bajo y sin rango, porque ordena por `prospecto_id ASC`.
* Riesgo de que scripts de stage pisen campos ya corregidos si se ejecutan sin `--no-overwrite`.
* Falta un estado de validación explícito para saber si `email_extraido` fue intentado, falló, o todavía no se procesó.
* Los errores del enriquecimiento se guardan en `error_msg`, pero no se observó un circuito formal de reintento ni un reporte persistente versionado.
* No hay evidencia de una exportación controlada y vigente a `llxbx_societe`; seguir insertando allí desde procesos externos sin cerrar este diagnóstico aumenta el riesgo de contaminar destino.

## Recomendaciones

1. Tratar `texto_extraido` y OCR como secundarios en este flujo. No reactivar OCR ni centrar el diagnóstico en screenshots u OCR salvo que reaparezca un requerimiento explícito de negocio.

2. Centrar la revisión técnica en `scripts/enrich-stg-contact-from-landing.js`, porque es el componente crítico para poblar `email_extraido`, `telefono_extraido`, `whatsapp_extraido` y `la_stg_prospectos_contactos`.

3. Ejecutar el enriquecimiento por rangos controlados de `prospecto_id` o por ventanas acotadas, especialmente para prospectos altos como Eqssolutions (`149`), en lugar de confiar en corridas globales con `--limit` bajo.

4. Incorporar una forma de conservar o aplicar resultados detectados en `dry-run` sin volver a descargar la landing. Puede ser mediante cache, reporte persistible o un modo “apply last detection”.

5. Endurecer el enriquecedor frente a `HTTP 429` con backoff, pausas, retry conservador, user-agent controlado y/o cache de respuestas para evitar perder escrituras tras una detección válida.

6. Cambiar la estrategia de persistencia de emails: guardar todos los emails candidatos relevantes en `la_stg_prospectos_contactos`, elegir uno principal para `la_stg_prospectos.email_extraido` y preservar secundarios en la tabla normalizada.

7. Corregir la lógica de `es_principal` para que un email nuevo detectado pueda marcarse como principal aunque `storedEmail` estuviera vacío.

8. Agregar un estado explícito de procesamiento o validación de email en staging para distinguir entre “no procesado”, “sin hallazgos”, “detectado en dry-run”, “error HTTP 429” y “persistido”.

9. Mantener a `scripts/sync-stg-prospectos.js` fuera del foco principal del problema de Eqssolutions, pero documentar que puede volver a propagar `texto_extraido = NULL` desde origen sobre staging.

10. Antes de seguir insertando en `llxbx_societe`, robustecer el proceso de enriquecimiento y validación de contactos. La exportación no debería apoyarse en un enriquecimiento que puede detectar datos en `dry-run` y fallar al persistirlos en la corrida siguiente.

## Próximo paso sugerido

Secuencia operativa recomendada antes de cualquier exportación a `llxbx_societe`:

1. Ejecutar enriquecimientos por rangos explícitos y lotes chicos para asegurar cobertura real de prospectos objetivo.
2. Registrar o cachear los hallazgos de `dry-run` para no perder una detección útil ante un segundo fetch fallido.
3. Resolver manejo de `HTTP 429` y política de reintentos antes de depender del enriquecedor como paso previo a exportación.
4. Definir regla de negocio para email principal, emails secundarios y estado de procesamiento en staging.

## Conclusión operativa

El problema principal no es OCR y no conviene reactivarlo como eje de la solución. En este flujo, `texto_extraido = NULL` en `la_prospectos` es esperable y no bloqueante. La fuente operativa debe ser el fetch HTML y el enriquecimiento posterior.

Para Eqssolutions, el enriquecedor `scripts/enrich-stg-contact-from-landing.js` sí detectó correctamente email, teléfono y WhatsApp en `dry-run`. La falla estuvo en la persistencia automática posterior: una segunda consulta a la landing recibió `HTTP 429`, por lo que el script no completó la escritura. La persistencia final se resolvió manualmente en `la_stg_prospectos` y `la_stg_prospectos_contactos`.

Antes de exportar a `llxbx_societe`, el trabajo prioritario no es capturar más texto sino robustecer el proceso de enriquecimiento y validación: cobertura efectiva por rangos, persistencia de hallazgos detectados, manejo de `HTTP 429`, conservación de múltiples emails candidatos y estado explícito de procesamiento.

Métricas de esta auditoría:

* Archivos revisados directamente: 28
* Scripts/servicios/endpoints candidatos identificados: 10
* Posibles duplicidades o solapamientos detectados: 4
