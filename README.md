# Prospectos LeadMaster

Sistema híbrido humano-automático para recolectar prospectos de anuncios patrocinados, priorizando la captura asistida de URLs finales de landing pages con interacción humana y automatización backend.

## 🎯 Objetivo

Capturar landing pages de anuncios patrocinados en motores de búsqueda (Google, Bing) mediante:
1. **Interfaz humana**: el usuario hace clic en anuncios desde un navegador local visible, reduciendo bloqueos por automatización.
2. **Automatización backend**: detección de la URL final de landing (`url_landing`), envío del prospecto y almacenamiento en MySQL.

La captura de pantalla de la landing puede conservarse como evidencia documental del hallazgo, pero no constituye el método principal de extracción. El flujo vigente prioriza la URL final de landing (`url_landing`) y reserva la extracción de datos para una etapa posterior de scraping/enriquecimiento.

## Estado vigente del flujo

```text
keyword desde base de datos o batch
→ navegación visible con Playwright
→ clic humano en anuncio
→ captura de URL final de landing
→ captura de pantalla opcional como evidencia documental
→ guardado de prospecto/landing
→ segunda pasada futura de scraping/enriquecimiento
```

**Etapa futura:** Para la segunda pasada sobre landings se evaluará usar un navegador aislado/privado no basado en Chrome, por ejemplo Firefox controlado por Playwright con contexto limpio. Esta etapa no está implementada en este ajuste.

## SearXNG local como apoyo auxiliar

SearXNG fue usado como componente auxiliar de búsqueda/consulta local. Puede servir como apoyo para explorar resultados y reducir dependencia directa de un único motor de búsqueda, pero no reemplaza el flujo principal de LeadMaster.

El flujo principal sigue siendo:

- búsqueda por keyword;
- navegador visible controlado por Playwright;
- clic humano en anuncio;
- captura de `url_landing`;
- captura opcional como evidencia documental.

Datos documentados del componente local:

```text
Carpeta: AUXILIAR/searxng-local/
Compose: AUXILIAR/searxng-local/docker-compose.yml
Config: AUXILIAR/searxng-local/searxng/settings.yml
URL local: http://127.0.0.1:18080
Servicio systemd: searxng-local.service
```

SearXNG no es un navegador privado, no reemplaza Chrome/Playwright para la interacción humana, no reemplaza la captura de `url_landing` y no reemplaza la futura segunda pasada de scraping/enriquecimiento sobre landings. Para esa etapa posterior se mantiene como criterio evaluar un navegador aislado/privado no basado en Chrome, por ejemplo Firefox controlado por Playwright con contexto limpio.

## 📁 Estructura del Proyecto

```
prospectos-leadmaster/
├── src/
│   ├── scraper/           # Script automatizado para VPS (headless)
│   │   └── leadmaster_scraper.js
│   ├── api/               # API REST para recibir prospectos desde local
│   │   └── server.js
│   ├── local/             # Script para ejecutar en PC local (interacción humana)
│   │   └── scraper-local.js
│   └── shared/            # Utilidades comunes (configuración BD, helpers)
├── config/
│   └── create_table.sql   # Estructura de base de datos
├── docs/                  # Documentación
├── frontend/              # Interfaz web (futuro)
├── scripts/               # Scripts de despliegue SSH
└── package.json          # Dependencias Node.js
```

## 🚀 Componentes Principales

### 1. **Script Local (`src/local/scraper-local.js`)**
- **Ejecución**: En tu PC con Node.js
- **Función**: Abre Chrome visible, realiza búsqueda, espera clics manuales en anuncios y captura la URL final de landing
- **Ventaja**: Tráfico humano real, sin bloqueos CAPTCHA
- **Uso**: `node scraper-local.js "palabra clave"`

### 2. **API Backend (`src/api/server.js`)**
- **Ejecución**: En VPS (servidor Node.js + Express)
- **Función**: Recibe prospectos vía HTTP, guarda `url_landing` y evidencia opcional en MySQL
- **Endpoints**: `POST /api/prospectos` - Guardar landing page

### 3. **Scraper Automático (`src/scraper/leadmaster_scraper.js`)**
- **Ejecución**: En VPS (headless con xvfb)
- **Función**: Scraping automático histórico/auxiliar (actualmente bloqueado por Google CAPTCHA)
- **Uso**: Para motores menos restrictivos (Bing, DuckDuckGo)

## 🛠️ Configuración Inicial

### En el VPS (servidor)
```bash
cd prospectos-leadmaster
npm install

# Configurar base de datos MySQL
mysql -u root -p < config/create_table.sql

# Iniciar API
npm run api:start
```

### En tu PC local
```bash
# Instalar Node.js y dependencias
npm install playwright mysql2 tesseract.js

# Configurar conexión al API del VPS
# Editar src/local/config.js con URL del API
```

## 📖 Uso

### Flujo de trabajo recomendado

1. **Iniciar API en VPS**:
   ```bash
   npm run api:start
   ```

2. **Ejecutar script local en tu PC**:
   ```bash
   node src/local/scraper-local.js "presupuesto para reforma de oficinas en CABA"
   ```

3. **Interacción**:
   - El script abre Chrome con resultados de búsqueda
   - Tú haces clic manualmente en anuncios patrocinados
   - El script detecta la URL final de landing y la envía al API
   - Opcionalmente conserva una captura de pantalla de la landing como evidencia documental

4. **Resultado**:
   - `url_landing` guardada como dato principal
   - Captura de pantalla opcional como respaldo documental
   - Prospecto/landing guardado en MySQL
   - Extracción estructurada reservada para una segunda pasada futura sobre la landing capturada

### Scripts disponibles
```bash
# Scraper automático (VPS)
npm run scraper:start "palabra clave"

# API backend
npm run api:start

# Script local (PC)
npm run local:start "palabra clave"

# Monitoreo BD
npm run db:status
npm run db:view
```

## 🔧 Configuración

### Base de datos MySQL
- **Host**: `localhost`
- **Database**: `leadmaster`
- **User**: `leadmaster_user`
- **Password**: `leadmaster_password`

### API Backend
- **Puerto**: `3000` (configurable en `.env`)
- **CORS**: Habilitado para `localhost`

### Script Local
- **API URL**: `http://tu-vps-ip:3000/api/prospectos`
- **Browser**: Chrome (headless: false para interacción)

## 📊 Base de Datos

Tabla `prospectos` almacena:
- `palabra_clave`: Término buscado
- `url_anuncio`: URL del anuncio en motor de búsqueda
- `url_landing`: URL final de la landing page capturada como dato principal
- `texto_extraido`: Campo heredado o auxiliar; no es el núcleo del flujo vigente
- `es_valido`: NULL (no evaluado), TRUE (válido), FALSE (inválido)
- `metadata`: JSON con rutas de screenshot, errores, fecha/hora de captura u otros datos de evidencia

## 🐛 Solución de Problemas

### Google CAPTCHA
- **Síntoma**: Script automático bloqueado con página "sorry/index"
- **Solución**: Usar script local (interacción humana)

### Conexión API
- Verificar que el VPS permita conexiones en puerto 3000
- Configurar CORS si se accede desde otro dominio

### OCR histórico o auxiliar
- OCR no es el método principal vigente de extracción en esta etapa.
- Si se usa para pruebas o soporte documental, verificar idiomas instalados: `tesseract --list-langs`.
- La extracción estructurada recomendada queda para una segunda pasada de scraping/enriquecimiento sobre `url_landing`.

## 🔮 Próximas Mejoras

1. **Interfaz web** para gestionar palabras clave y visualizar prospectos
2. **Segunda pasada de scraping/enriquecimiento** sobre URLs de landing capturadas
3. **Evaluación de navegador aislado/privado** no basado en Chrome para esa segunda pasada, por ejemplo Firefox con contexto limpio de Playwright
4. **Clasificación automática** con OpenAI API
5. **Integración con OpenClaw** para orquestación avanzada
6. **Soporte multi-motor** (Google, Bing, Yahoo)
7. **Dashboard de métricas** y reportes

## 📄 Licencia

MIT - Ver archivo LICENSE