# Operación de Máquina Local (Complemento del VPS Contabo)

**Fecha:** 7 de mayo de 2026  
**Proyecto:** LeadMaster  
**Objetivo del documento:** Dejar trazabilidad completa de qué se ejecuta en esta máquina local, cómo se integra con el VPS de Contabo y cuál es el procedimiento operativo recomendado.

**Decisión vigente de alcance (explícita):** en esta etapa del proyecto, el objetivo operativo de esta máquina es **obtener las URLs de landing de anuncios** a partir de keywords e interacción humana. **OCR se considera descartado como método principal de extracción** para esta etapa.

**Nota de actualización 2026-06-05:**  
Este documento describe la operación de la máquina local y su integración con el VPS/servidor donde existe la base `leadmaster`, utilizada para captura, staging y normalización de prospectos (`prospectos`, `stg_prospectos`, `stg_prospectos_contactos`).  
Posteriormente se confirmó que la base operativa `iunaorg_dyd`, alojada en iFastNet, también forma parte del flujo LeadMaster y contiene las tablas `ll_*` vinculadas a operación, campañas, requerimientos, envíos y administración comercial.  
La tabla `ll_keywords_leadmaster` fue creada en `iunaorg_dyd` para administrar las keywords desde el plano operativo del sistema, sin eliminar ni reemplazar la función de staging de la base `leadmaster`.

---

## 1) Contexto y Rol de Esta Máquina

Esta máquina local cumple el rol de **origen de interacción humana para detección de landing pages**, mientras que el VPS de Contabo cumple el rol de **backend y persistencia**.

### Distribución de responsabilidades

- **Máquina local (este equipo):**
  - Ejecuta navegador visible para interacción humana en búsquedas.
  - Detecta navegación a landing pages de anuncios y obtiene URL final.
  - Envía datos de landing (y evidencia opcional) a la API remota del VPS.
  - Puede subir capturas por carpeta monitorizada (pipeline de archivos).
  - Ejecuta tandas semiautomatizadas de keywords.

- **VPS Contabo:**
  - Expone la API de recepción de prospectos.
  - Procesa y persiste la información recibida.
  - Persiste en base de datos MySQL remota.
  - Centraliza almacenamiento y operación backend.

---

## 2) Arquitectura Operativa (Local + VPS)

### Flujo A — Obtención de landing por navegación humana (flujo principal)

1. Operador ejecuta scraper local con una keyword.
2. Se abre Chrome/Playwright en modo visible.
3. Operador hace clic en resultados patrocinados / landing objetivo.
4. Script local detecta URL de landing válida.
5. Script local toma screenshot como evidencia opcional.
6. Script local envía payload a la API del VPS con foco en URL de landing.
7. VPS guarda registro en MySQL.

### Flujo B — Subida de capturas por carpeta (monitor, complemento)

1. Se guardan imágenes en carpeta local de capturas.
2. Monitor local detecta archivos nuevos con inotify.
3. Se suben archivos al VPS por rsync/SSH.
4. El backend del VPS utiliza estas capturas como soporte/evidencia cuando aplica.

### Flujo C — Tanda diaria semiautomatizada

1. Se ejecuta script batch con rango de keywords.
2. Por cada keyword, se llama a scraper local con objetivo de capturas.
3. Se repite secuencialmente hasta completar rango.

---

## 3) Componentes Locales en Uso

### 3.1 Scraper local de interacción humana

- Archivo principal: `src/local/scraper-local.js`
- Función principal:
  - Búsqueda por keyword.
  - Espera interacción humana.
  - Filtra URLs inválidas (buscadores, páginas de consentimiento, etc.).
  - Obtiene URL de landing válida como dato principal.
  - Captura screenshot de respaldo (opcional).
  - Envía prospecto al endpoint remoto.

### 3.2 Batch diario de keywords

- Script: `scripts/run-daily-batch.sh`
- Características:
  - Define arreglo local de keywords (20 actuales).
  - Permite correr rango (`--from`, `--to`).
  - Define objetivo por keyword (`--target`).
  - Permite modo manual (`--manual`) y simulación (`--dry-run`).

### 3.3 Precheck y utilidades de operación

- `scripts/run-local.sh`: valida prerequisitos y conectividad.
- `scripts/deploy.sh`: sincronización al VPS.
- `scripts/ssh-connect.sh`: acceso rápido SSH al VPS.
- `scripts/install-ssh-key.sh`: alta de clave pública.

### 3.4 Monitor de capturas

- Script de monitor: `scripts/monitor-upload-capturas.sh`
- Instalador: `scripts/install-monitor.sh`
- Comando global (si instalado): `monitor-upload-capturas`
- Función:
  - Vigila carpeta local de capturas.
  - Sube automáticamente al VPS por SSH/rsync.
  - Reintenta y deja logs operativos.

---

## 4) Endpoints y Conectividad Relevante

Durante validaciones operativas del 7 de mayo de 2026:

- `http://185.187.170.196:3000/api/health` → **OK (HTTP 200)**
- `http://185.187.170.196:8080/api/health` → **unhealthy (HTTP 500)**
- `http://185.187.170.196:3001/api/health` → **no disponible**

### Conclusión operativa

Para esta máquina local, el endpoint útil para ejecución remota de captura es:

- **API_URL recomendada:** `http://185.187.170.196:3000/api`

---

## 5) Base de Datos: Ubicación y Consecuencia Operativa

Al 7 de mayo de 2026, este documento registraba la operación contra la base disponible en el VPS/servidor de captura, **no en esta máquina local**. La arquitectura confirmada posteriormente separa responsabilidades entre bases:

- `leadmaster`: base vinculada al VPS/servidor de captura, staging y normalización de prospectos crudos.
- `iunaorg_dyd`: base operativa alojada en iFastNet, usada por el ecosistema `ll_*`, Dolibarr/LeadMaster y administración comercial.
- `ll_keywords_leadmaster`: tabla de administración de keywords creada en `iunaorg_dyd`.

Los endpoints y comandos de este documento se conservan como referencia del estado operativo documentado al 7 de mayo de 2026.

Implicancias:

- Si se intenta levantar API local sin MySQL local, fallará con `ECONNREFUSED 127.0.0.1:3306`.
- Para este flujo histórico de captura, la operación correcta de este equipo es usar la **API remota del VPS**.
- Esta máquina local debe enfocarse en detección de landing/interacción/subida, no en persistencia local.

---

## 6) Procedimiento Recomendado de Operación Diaria

### Paso 1 — Validar endpoint remoto

```bash
curl -sS -m 8 http://185.187.170.196:3000/api/health
```

Esperado: respuesta healthy/ok (HTTP 200).

### Paso 2 — Ejecutar keyword puntual (ejemplo)

Keyword objetivo: `servicio de mantenimiento de ascensores para edificios`

```bash
cd /home/beto/Documentos/Github/prospectos-leadmaster-local
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 6 --to 6
```

### Paso 3 — Ejecutar rango de keywords

```bash
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 6 --to 10 --target 2
```

### Paso 4 — Simulación previa (sin ejecutar)

```bash
bash ./scripts/run-daily-batch.sh --from 6 --to 6 --dry-run
```

### Paso 5 — Monitoreo y validación

- Confirmar que el scraper local completa capturas.
- Confirmar ingestión en VPS (API/BD/logs remotos), especialmente `url_landing`.

---

## 7) Variables y Configuración Clave

### Variables relevantes en local

- `API_URL`: endpoint API remoto al que se envían prospectos.
- `LOCAL_CAPTURE_DELAY_MS`: delay para captura tras navegación.
- `LOCAL_SLOWMO_MS`: velocidad de interacción Playwright.
- `LOCAL_AUTOSCROLL`: habilita/deshabilita scroll previo a screenshot.

### Configuración base compartida

Archivo: `src/shared/config.js`

- `local.apiUrl` usa `API_URL` de entorno o fallback local.
- Este fallback local es útil solo si API+MySQL están operativos localmente.

---

## 8) Integración con el VPS de Contabo

### Qué aporta esta máquina local al VPS

- Tráfico e interacción humana para evitar bloqueo por automatización.
- Obtención de URLs de landing reales con contexto de navegación.
- Capturas de landing como evidencia opcional.
- Opcionalmente, transferencia por carpetas monitorizadas.

### Qué no hace esta máquina local

- No es el origen canónico de la base de datos.
- No ejecuta OCR como objetivo principal de la etapa actual.
- No debe ser el backend principal de MySQL en producción.

---

## 9) Incidencias Reales Observadas y Resolución

### Incidencia A: API remota en puerto incorrecto

- Síntoma: falla de disponibilidad al apuntar a `:8080`.
- Resolución: cambiar a `http://185.187.170.196:3000/api`.

### Incidencia B: Intento de API local sin MySQL local

- Síntoma: `Error conectando a MySQL: connect ECONNREFUSED 127.0.0.1:3306`.
- Resolución: usar API remota del VPS (DB está en Contabo).

### Incidencia C: necesidad de validar comando exacto para keyword única

- Resolución: usar `--dry-run` y luego ejecutar `--from N --to N`.

---

## 10) SearXNG Local (complementario, no crítico para este flujo)

Se dejó instalado en esta máquina un stack local SearXNG para apoyo de búsqueda/consulta (componente auxiliar).

### Estado implementado

- Carpeta: `AUXILIAR/searxng-local/`
- Compose: `AUXILIAR/searxng-local/docker-compose.yml`
- Config: `AUXILIAR/searxng-local/searxng/settings.yml`
- Exposición local: `http://127.0.0.1:18080`
- Servicio systemd: `searxng-local.service` habilitado para autostart.

### Nota

SearXNG no reemplaza el pipeline principal LeadMaster; es un complemento opcional.

---

## 11) Checklist de Hand-off para Documentación del VPS

Al documentar en el VPS Contabo, incluir explícitamente:

1. Esta máquina local ejecuta captura/interacción.
2. El VPS ejecuta API + MySQL (OCR fuera del alcance principal vigente).
3. Endpoint operativo actual para ingestión: `:3000/api`.
4. Comando operativo de keyword única por índice de batch.
5. Mecanismo alternativo de carga por monitor de capturas.
6. Dependencia de SSH y claves para transferencias.
7. Procedimiento de troubleshooting ante fallas de endpoint/DB.

---

## 12) Comandos de Referencia Rápida

### Keyword única (índice 6)

```bash
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 6 --to 6
```

### Rango de keywords

```bash
API_URL=http://185.187.170.196:3000/api bash ./scripts/run-daily-batch.sh --from 1 --to 20 --target 2
```

### Simulación

```bash
bash ./scripts/run-daily-batch.sh --from 6 --to 6 --dry-run
```

### Healthcheck VPS

```bash
curl -sS -m 8 http://185.187.170.196:3000/api/health
```

### Monitor de capturas (si instalado global)

```bash
monitor-upload-capturas status
monitor-upload-capturas logs-live
```

---

## 13) Conclusión Ejecutiva

Esta máquina local está diseñada para complementar el VPS de Contabo como capa de detección de landing/interacción y no como backend persistente. El flujo correcto en producción es:

- **Local:** keyword + interacción + obtención de `url_landing` (+ evidencia opcional) + envío.
- **Contabo:** API + MySQL.

Con este esquema, se mantiene una operación robusta frente a restricciones de scraping automático, y se centraliza la persistencia donde corresponde: en el VPS.
