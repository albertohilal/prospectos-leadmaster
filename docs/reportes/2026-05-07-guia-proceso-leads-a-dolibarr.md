# Guía end-to-end: obtención de leads y exportación a Dolibarr

**Fecha:** 2026-05-07  
**Proyecto:** LeadMaster → Dolibarr (`iunaorg_dyd.llxbx_societe`)  
**Objetivo:** estandarizar un proceso repetible para capturar leads, enriquecerlos y exportarlos de forma segura.

## Decisión operativa vigente (alcance)

- En esta etapa, el objetivo principal es **obtener URLs de landing de anuncios** mediante interacción humana.
- **OCR no se considera método principal** para extracción de datos en esta etapa.
- La máquina local se usa para navegación/interacción; el VPS para API + persistencia.

---

## 1) Alcance del flujo

Este proceso cubre:

1. Captura de leads (`leadmaster.prospectos`)  
2. Sincronización a staging (`leadmaster.stg_prospectos`)  
3. Enriquecimiento de contacto + tabla normalizada (`leadmaster.stg_prospectos_contactos`)  
4. Enriquecimiento de nombre comercial (`leadmaster.stg_prospectos.nom`)  
5. Validación pre-export  
6. Exportación a Dolibarr en servidor remoto (`iunaorg_dyd.llxbx_societe`)

## 1.1) Arquitectura Local + VPS (operación real)

### Rol de máquina local

- Ejecuta navegador visible (Playwright/Chrome) con interacción humana.
- Detecta landing URL válida y envía payload al VPS.
- Ejecuta tandas por keyword (`scripts/run-daily-batch.sh`).
- Puede subir capturas por monitor de carpeta (pipeline complementario).

### Rol de VPS Contabo

- Expone API de ingestión y lógica backend.
- Guarda datos en MySQL (`leadmaster`).
- Ejecuta enriquecimientos y preparación para exportar a Dolibarr.

### Endpoint operativo validado

- `http://185.187.170.196:3000/api/health` → operativo
- `:8080` y `:3001` no son endpoint de ingestión vigente para este flujo

Por lo tanto, para operación local:

- **API_URL recomendada**: `http://185.187.170.196:3000/api`

---

## 2) Tablas involucradas

- Origen crudo: `leadmaster.prospectos`
- Staging principal: `leadmaster.stg_prospectos`
- Contactos normalizados: `leadmaster.stg_prospectos_contactos`
- Destino ERP: `iunaorg_dyd.llxbx_societe` (en **otro servidor**)

> Nota: el campo `nom` en `stg_prospectos` se usa para alinear con `llxbx_societe.nom`.

---

## 3) Paso a paso operativo

## Paso A — Captura de leads

Puede venir de:

- Flujo local + API (`src/local/scraper-local.js` → `src/api/server.js`)
- Scraper directo (`src/scraper/leadmaster_scraper.js`)

**Recomendación vigente:** usar flujo local + API como principal para detección de landings.

Ejemplo de ejecución local por rango:

```bash
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 6 --to 10 --target 2
```

Keyword única por índice:

```bash
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 6 --to 6
```

Simulación:

```bash
bash ./scripts/run-daily-batch.sh --from 6 --to 6 --dry-run
```

Resultado esperado: filas nuevas en `leadmaster.prospectos`.

Verificación rápida:

```bash
npm run db:status
npm run db:view
```

---

## Paso B — Sincronizar `prospectos` a `stg_prospectos`

Script: [scripts/sync-stg-prospectos.js](scripts/sync-stg-prospectos.js)

### Dry-run

```bash
node scripts/sync-stg-prospectos.js --dry-run
```

### Ejecución real

```bash
node scripts/sync-stg-prospectos.js
```

Qué hace:

- Normaliza `url_landing`
- Inserta/actualiza por `prospecto_id` en `stg_prospectos`
- Asigna `ref_ext = leadmaster:<prospecto_id>`
- Mantiene `estado='pendiente_place_id'`

---

## Paso C — Enriquecer contacto + limpieza de staging

Script: [scripts/enrich-stg-contact-from-landing.js](scripts/enrich-stg-contact-from-landing.js)

### Dry-run (recomendado primero)

```bash
node scripts/enrich-stg-contact-from-landing.js --limit 200 --dry-run
```

### Ejecución real

```bash
node scripts/enrich-stg-contact-from-landing.js --limit 200
```

Qué hace:

1. Limpieza previa automática de URLs inválidas/no prospectables (`NULL`, `google.*`, `chrome-error://`, `api.whatsapp.com/send`, etc.).
2. Enriquecimiento de:
   - `email_extraido`
   - `telefono_extraido`
   - `whatsapp_extraido`
3. Persistencia normalizada en `stg_prospectos_contactos` (`tipo`, `valor`, `valor_normalizado`, `es_principal`).

Flag útil:

```bash
node scripts/enrich-stg-contact-from-landing.js --limit 200 --no-clean
```

---

## Paso D — Enriquecer `nom` (nombre de empresa)

Script: [scripts/enrich-stg-nom-from-landing.js](scripts/enrich-stg-nom-from-landing.js)

### Modo seguro (sin riesgo de IP) — recomendado

```bash
node scripts/enrich-stg-nom-from-landing.js --limit 500 --dry-run
node scripts/enrich-stg-nom-from-landing.js --limit 500
```

Características del modo seguro:

- **No hace requests externos** por defecto.
- Deriva `nom` desde señales locales (`email_extraido`, `url_landing`, `nom` existente).

### Fallback web opcional (solo si hace falta)

```bash
node scripts/enrich-stg-nom-from-landing.js --limit 100 --allow-fetch --max-fetch 10 --min-delay-ms 8000 --max-delay-ms 15000
```

---

## Paso E — Validación de calidad pre-export

Documento de referencia de validación:

- [docs/reportes/2026-05-07-validacion-preexport-nom-dolibarr.md](docs/reportes/2026-05-07-validacion-preexport-nom-dolibarr.md)

Checklist mínimo:

```sql
-- cobertura
SELECT COUNT(*) total,
       SUM(CASE WHEN nom IS NULL OR TRIM(nom)='' THEN 1 ELSE 0 END) sin_nom
FROM stg_prospectos;

-- URLs inválidas residuales
SELECT COUNT(*) invalidos_restantes
FROM stg_prospectos
WHERE url_landing IS NULL
   OR TRIM(url_landing) = ''
   OR LOWER(url_landing) LIKE '%google.%'
   OR LOWER(url_landing) LIKE '%/search%'
   OR LOWER(url_landing) LIKE '%/sorry/%'
   OR LOWER(url_landing) LIKE '%chrome-error://%'
   OR LOWER(url_landing) LIKE '%api.whatsapp.com/send%'
   OR LOWER(url_landing) LIKE '%ejemplo.com%';
```

---

## 4) Exportación a Dolibarr (servidor remoto)

## Contexto clave

`llxbx_societe` vive en otro servidor. Por lo tanto, el patrón recomendado es:

1. **Generar SQL de export** en servidor LeadMaster.
2. **Transferir archivo** al servidor Dolibarr (`scp`/`rsync`).
3. **Ejecutar SQL** en Dolibarr.

## 4.1 Generar archivo SQL en servidor LeadMaster

Ejemplo de estrategia de export (subset funcional de columnas Dolibarr):

```sql
INSERT INTO iunaorg_dyd.llxbx_societe
(nom, name_alias, entity, ref_ext, statut, status, client, fournisseur,
 url, email, phone, phone_mobile, address, note_public, import_key, tms, datec)
VALUES
(...)
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  name_alias = VALUES(name_alias),
  url = VALUES(url),
  email = COALESCE(VALUES(email), email),
  phone = COALESCE(VALUES(phone), phone),
  phone_mobile = COALESCE(VALUES(phone_mobile), phone_mobile),
  address = COALESCE(VALUES(address), address),
  note_public = VALUES(note_public),
  tms = CURRENT_TIMESTAMP;
```

Recomendación de idempotencia:

- usar `import_key = 'leadmaster:stg:<id>'`
- o, si el modelo remoto lo exige, usar `ref_ext` como clave de reimportación.

## 4.2 Transferencia al servidor Dolibarr

```bash
scp ./export_dolibarr_societe.sql usuario@host-dolibarr:/tmp/export_dolibarr_societe.sql
```

## 4.3 Ejecución en servidor Dolibarr

```bash
mysql -u <dolibarr_user> -p iunaorg_dyd < /tmp/export_dolibarr_societe.sql
```

---

## 5) Controles post-export

En servidor Dolibarr:

```sql
SELECT COUNT(*) total_societes_importadas
FROM iunaorg_dyd.llxbx_societe
WHERE import_key LIKE 'leadmaster:stg:%';

SELECT rowid, nom, ref_ext, url, email, phone, phone_mobile, import_key
FROM iunaorg_dyd.llxbx_societe
WHERE import_key LIKE 'leadmaster:stg:%'
ORDER BY rowid DESC
LIMIT 50;
```

---

## 6) Reglas operativas recomendadas

1. Siempre correr primero `--dry-run` en cada etapa de enriquecimiento.
2. No habilitar `--allow-fetch` salvo necesidad real.
3. Mantener revisión manual para casos de `nom` críticos/medios antes de exportar.
4. No exportar filas con `url_landing` inválida.
5. Registrar cada corrida en `memory/YYYY-MM-DD.md` o en `docs/reportes`.
6. En operación local, apuntar siempre a `API_URL=http://185.187.170.196:3000/api` salvo cambio formal de infraestructura.
7. Mantener el enfoque vigente: local para landing URL + VPS para persistencia/enriquecimiento/export.

---

## 7) Comandos rápidos (resumen)

```bash
# 1) Sync a staging
node scripts/sync-stg-prospectos.js

# 1.a) Captura local (flujo principal)
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 1 --to 20 --target 2

# 2) Contactos + limpieza
node scripts/enrich-stg-contact-from-landing.js --limit 200

# 3) Nombre empresa (sin red)
node scripts/enrich-stg-nom-from-landing.js --limit 500

# 4) Validación rápida
mysql -u leadmaster_user -pleadmaster_password -D leadmaster -e "SELECT COUNT(*) total, SUM(CASE WHEN nom IS NULL OR TRIM(nom)='' THEN 1 ELSE 0 END) sin_nom FROM stg_prospectos;"
```

---

## Estado actual de referencia (al cierre de esta guía)

- `stg_prospectos`: 102 registros
- `nom`: 102/102 completos
- `stg_prospectos_contactos`: poblada por el flujo de enriquecimiento de contactos
- limpieza automática de staging integrada al flujo

---

## 8) Runbook de contingencia (operación)

Objetivo: resolver incidentes frecuentes sin improvisación, con pasos repetibles.

## 8.1 API remota no responde (`/api/health`)

### Síntoma

- `curl http://185.187.170.196:3000/api/health` falla o devuelve != 200.

### Diagnóstico

```bash
curl -sS -m 8 http://185.187.170.196:3000/api/health
```

Si falla, en VPS:

```bash
ss -ltnp | grep 3000
ps aux | grep 'src/api/server.js'
```

### Recuperación

En VPS:

```bash
cd /root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster
npm run api:start
```

### Validación post-fix

```bash
curl -sS -m 8 http://185.187.170.196:3000/api/health
```

---

## 8.2 Error MySQL (`ECONNREFUSED 127.0.0.1:3306`)

### Síntoma

- La API no inicia o falla conexión BD.

### Diagnóstico

```bash
mysql -u leadmaster_user -pleadmaster_password -D leadmaster -e "SELECT 1;"
```

### Recuperación

En VPS:

```bash
sudo systemctl status mysql
sudo systemctl restart mysql
```

### Validación post-fix

```bash
mysql -u leadmaster_user -pleadmaster_password -D leadmaster -e "SELECT NOW();"
```

---

## 8.3 Captura local falla por endpoint incorrecto

### Síntoma

- Scraper local sin ingestión, timeout o 5xx al enviar prospecto.

### Diagnóstico

Verificar `API_URL` efectiva:

```bash
echo "$API_URL"
```

### Recuperación

Forzar endpoint vigente:

```bash
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 6 --to 6
```

### Validación post-fix

- Confirmar nuevos registros en `prospectos` / `stg_prospectos`.

---

## 8.4 Enriquecimiento con `HTTP 403` o `fetch failed`

### Síntoma

- `enrich-stg-contact-from-landing.js` reporta errores de fetch.

### Diagnóstico

```bash
node scripts/enrich-stg-contact-from-landing.js --limit 50 --dry-run
```

### Recuperación recomendada

1. Mantener limpieza de staging activa (default).  
2. Reintentar en lote menor:

```bash
node scripts/enrich-stg-contact-from-landing.js --limit 20
```

3. Para `nom`, usar modo seguro sin red:

```bash
node scripts/enrich-stg-nom-from-landing.js --limit 200
```

### Validación post-fix

```sql
SELECT COUNT(*) sin_email FROM stg_prospectos WHERE email_extraido IS NULL OR TRIM(email_extraido)='';
SELECT COUNT(*) con_nom FROM stg_prospectos WHERE nom IS NOT NULL AND TRIM(nom)<>'';
```

---

## 8.5 Export a Dolibarr falla (servidor remoto)

### Síntoma

- Error al ejecutar SQL en servidor Dolibarr.

### Diagnóstico

En servidor destino:

```bash
mysql -u <dolibarr_user> -p -e "USE iunaorg_dyd; SHOW TABLES LIKE 'llxbx_societe';"
```

### Recuperación

1. Volver a generar archivo SQL de export en LeadMaster.
2. Transferir nuevamente por `scp/rsync`.
3. Ejecutar en transacción (si no lo estuviera) y revisar errores de columnas/permisos.

### Validación post-fix

```sql
SELECT COUNT(*)
FROM iunaorg_dyd.llxbx_societe
WHERE import_key LIKE 'leadmaster:stg:%';
```

---

## 8.6 Checklist de cierre de incidente

1. Servicio restaurado (API/DB/export) validado con comando de healthcheck.
2. Datos consistentes (`stg_prospectos` sin inválidos residuales críticos).
3. Registrar incidente + resolución en `docs/reportes` o `memory/YYYY-MM-DD.md`.
4. Si hubo workaround manual, documentar comando definitivo para repetir.
