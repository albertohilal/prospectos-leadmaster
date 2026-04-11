# Prospectos LeadMaster

Sistema híbrido humano-automático para recolectar prospectos de anuncios patrocinados, combinando interacción humana con automatización backend.

## 🎯 Objetivo

Capturar landing pages de anuncios patrocinados en motores de búsqueda (Google, Bing) mediante:
1. **Interfaz humana**: El usuario hace clic en anuncios desde su navegador local (evitando CAPTCHA)
2. **Automatización backend**: Captura automática de pantalla, OCR y almacenamiento en MySQL

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
- **Función**: Abre Chrome, realiza búsqueda, espera clics manuales en anuncios
- **Ventaja**: Tráfico humano real, sin bloqueos CAPTCHA
- **Uso**: `node scraper-local.js "palabra clave"`

### 2. **API Backend (`src/api/server.js`)**
- **Ejecución**: En VPS (servidor Node.js + Express)
- **Función**: Recibe prospectos vía HTTP, guarda en MySQL, gestiona OCR
- **Endpoints**: `POST /api/prospectos` - Guardar landing page

### 3. **Scraper Automático (`src/scraper/leadmaster_scraper.js`)**
- **Ejecución**: En VPS (headless con xvfb)
- **Función**: Scraping completamente automático (actualmente bloqueado por Google CAPTCHA)
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
   - El script detecta landing page y envía captura al API

4. **Resultado**:
   - Landing page capturada como imagen
   - Texto extraído via OCR
   - Prospecto guardado en MySQL

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
- `url_landing`: URL de la landing page
- `texto_extraido`: Texto extraído por OCR
- `es_valido`: NULL (no evaluado), TRUE (válido), FALSE (inválido)
- `metadata`: JSON con rutas de screenshot, errores, etc.

## 🐛 Solución de Problemas

### Google CAPTCHA
- **Síntoma**: Script automático bloqueado con página "sorry/index"
- **Solución**: Usar script local (interacción humana)

### Conexión API
- Verificar que el VPS permita conexiones en puerto 3000
- Configurar CORS si se accede desde otro dominio

### OCR de baja calidad
- Ajustar parámetros de Tesseract en configuración
- Verificar idiomas instalados: `tesseract --list-langs`

## 🔮 Próximas Mejoras

1. **Interfaz web** para gestionar palabras clave y visualizar prospectos
2. **Clasificación automática** con OpenAI API
3. **Integración con OpenClaw** para orquestación avanzada
4. **Soporte multi-motor** (Google, Bing, Yahoo)
5. **Dashboard de métricas** y reportes

## 📄 Licencia

MIT - Ver archivo LICENSE