# Flujo de Extracción de Capturas y Almacenamiento en Base de Datos

**Fecha:** 11 de abril de 2026  
**Proyecto:** LeadMaster  
**Autor:** Análisis técnico basado en código fuente

## Resumen Ejecutivo

Este informe responde de manera específica dónde se extrae la información de las capturas de las páginas visitadas y dónde se sube a la base de datos. El proyecto implementa dos pipelines paralelos: uno local (scraper-local.js) que captura en la PC del usuario y envía a la API del VPS, y otro en el VPS (leadmaster_scraper.js) que opera de manera autónoma. La extracción de texto (OCR con Tesseract) ocurre **siempre en el VPS**, ya sea en la API (cuando recibe datos del local) o directamente en el scraper del VPS. El almacenamiento en base de datos MySQL ocurre únicamente en el VPS.

## Tabla de Entornos

| Componente | Ubicación | Función | OCR Tesseract | Almacenamiento BD |
|---|---|---|---|---|
| scraper-local.js | PC Local del Usuario | Captura manual con clics humanos | ❌ No | ❌ No |
| leadmaster_scraper.js | VPS Remoto | Scraping automático | ✅ Sí | ✅ Sí |
| API server.js | VPS Remoto | Procesa datos locales y API | ✅ Sí | ✅ Sí |
| MySQL Database | VPS Remoto | Almacenamiento final | - | ✅ Sí |

## Flujo de Datos Paso a Paso

### 1. Pipeline Local (scraper-local.js en PC Local)

**Archivo:** src/local/scraper-local.js

Paso 1: Captura en la PC local
```javascript
// Líneas 176-185: Navega a Google y busca
const googleUrl = 'https://www.google.com/?gl=ar&hl=es-419';
await page.goto(googleUrl, { waitUntil: 'networkidle' });
// El usuario hace clic manualmente en anuncios patrocinados
```

Paso 2: Detecta landing page
```javascript
// Líneas 307-308: Cuando el usuario navega, captura la URL
const landingUrl = page.url();
console.log(`🌐 Landing page: ${landingUrl}`);
```

Paso 3: Captura screenshot localmente
```javascript
// Líneas 177-198 en captureScreenshot():
const tempDir = path.join(__dirname, 'temp_screenshots');
await page.screenshot({ 
  path: screenshotPath,
  fullPage: true 
});
// El archivo se guarda en: src/local/temp_screenshots/
```

Paso 4: NO extrae texto en local
- **Tesseract no se usa aquí.** Ni siquiera se importa.
- El screenshot se convierte a base64 únicamente para transmisión

Paso 5: Envía a API del VPS
```javascript
// Líneas 130-145 en sendToAPI():
const response = await fetch(`${API_URL}/prospectos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword,
    adUrl: null,
    landingUrl,
    screenshotBase64: screenshotResult.screenshotBase64
  })
});
// API_URL = http://localhost:3001/api (apunta al VPS)
```

### 2. Pipeline API en VPS (server.js)

**Archivo:** src/api/server.js

Paso 1: Recibe prospecto desde local
```javascript
// Líneas 185-200: Endpoint POST /api/prospectos
app.post('/api/prospectos', async (req, res) => {
  const { keyword, adUrl, landingUrl, screenshotBase64 } = req.body;
  // El API recibe el screenshot en base64
```

Paso 2: Guarda screenshot en disco del VPS
```javascript
// Líneas 215-223: saveScreenshot()
const screenshotsDir = config.paths.screenshotsDir;
await fs.mkdir(screenshotsDir, { recursive: true });
const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
const imageBuffer = Buffer.from(base64Image, 'base64');
await fs.writeFile(screenshotPath, imageBuffer);
// Ubicación: ./screenshots/ (en el VPS)
```

Paso 3: Extrae texto con OCR (Tesseract) en VPS
```javascript
// Líneas 71-94 en extractTextFromImage():
const Tesseract = require('tesseract.js');
const { data: { text } } = await Tesseract.recognize(
  imagePath,
  config.ocr.languages, // 'spa+eng'
  { logger: info => { ... } }
);
// El procesamiento OCR ocurre EN EL VPS
```

Paso 4: Guarda en BD MySQL del VPS
```javascript
// Líneas 98-120 en saveProspecto():
const query = `
  INSERT INTO prospectos 
  (palabra_clave, url_anuncio, url_landing, texto_extraido, metadata) 
  VALUES (?, ?, ?, ?, ?)
`;
const [result] = await dbConnection.execute(query, [
  palabra_clave,
  url_anuncio,
  url_landing,
  texto_extraido,
  JSON.stringify(metadata)
]);
// Base de datos: localhost:3306 (en el VPS)
```

### 3. Pipeline VPS Autónomo (leadmaster_scraper.js en VPS)

**Archivo:** src/scraper/leadmaster_scraper.js

Paso 1: Busca en Google (automático, headless=true)
```javascript
// Líneas 151-210: searchGoogle()
await this.initBrowser(); // headless: true
const googleUrl = 'https://www.google.com/?gl=ar&hl=es-419';
await this.page.goto(googleUrl, { waitUntil: 'networkidle' });
```

Paso 2: Encuentra y hace clic en anuncio (automático)
```javascript
// Líneas 220-320: findAndClickSponsoredAd()
for (const selector of config.selectors.sponsoredAds) {
  const ads = await this.page.$$(selector);
  if (ads.length > 0) {
    await ad.click();
    this.result.landingUrl = this.page.url();
  }
}
```

Paso 3: Captura screenshot en VPS
```javascript
// Líneas 330-355: takeScreenshot()
await fs.mkdir(config.screenshotsDir, { recursive: true });
await this.page.screenshot({ 
  path: screenshotPath,
  fullPage: true 
});
// Ubicación: config.screenshotsDir (default: ./screenshots/)
```

Paso 4: Extrae texto con OCR EN VPS
```javascript
// Líneas 396-430: extractTextFromImage()
const Tesseract = require('tesseract.js');
const { data: { text } } = await Tesseract.recognize(
  imagePath,
  'spa+eng',
  { logger: info => { if (info.status === 'recognizing text') {...} } }
);
this.result.extractedText = cleanedText;
```

Paso 5: Guarda directamente en BD MySQL del VPS
```javascript
// Líneas 436-467: saveToDatabase()
const query = `
  INSERT INTO prospectos 
  (palabra_clave, url_anuncio, url_landing, texto_extraido, es_valido, metadata) 
  VALUES (?, ?, ?, ?, ?, ?)
`;
await this.dbConnection.execute(query, [
  this.result.keyword,
  this.result.adUrl,
  this.result.landingUrl,
  this.result.extractedText,
  null,
  JSON.stringify(metadata)
]);
// Base de datos: localhost:3306 (en el VPS)
```

## Respuestas Concretas a Preguntas Clave

### ¿El scraper local (local:start) extrae texto de las capturas usando Tesseract en la PC local?
**NO.** El scraper local NO importa ni usa Tesseract.
- Archivo: src/local/scraper-local.js
- Tesseract está ausente completamente en este código
- Solo captura el screenshot y lo envía como base64

### ¿El scraper local envía los datos a la API del VPS o los guarda directamente en la BD?
**ENVÍA A LA API.** El scraper local NO accede directamente a la BD.
- Líneas 130-145: Llama a `fetch('http://localhost:3001/api/prospectos', ...)`
- La API luego guarda en BD
- La API realiza el OCR y el almacenamiento

### ¿El scraper del VPS (scraper:start) extrae texto y guarda directamente en la BD?
**SÍ.** El scraper del VPS hace todo en el VPS sin intermediarios.
- Líneas 510-514: Extrae texto con OCR localmente
- Líneas 436-467: Guarda directamente con `dbConnection.execute()`
- Ambas operaciones ocurren en el VPS, sin pasar por API

### ¿Las capturas de pantalla se suben automáticamente al VPS o quedan en la PC local?
**AMBAS OPCIONES OCURREN:**
- **PC Local:** Guarda temporales en `src/local/temp_screenshots/` (línea 178)
- **VPS por API:** Se recibe screenshot del local y se guarda en `./screenshots/` en el VPS (línea 215)
- **VPS por Scraper:** Se guarda directamente en `./screenshots/` del VPS (línea 352)
- **En ambos casos, la versión final en la BD está en el VPS**

## Diagrama del Flujo Completo

```
PC LOCAL (usuario)
├─ scraper-local.js
│  ├─ 1. Abre Chrome visible
│  ├─ 2. Busca en Google
│  ├─ 3. Usuario hace clic en anuncio
│  ├─ 4. Captura screenshot local
│  │  └─ temp_screenshots/local-*.png
│  ├─ 5. Convierte a base64
│  └─ 6. POST /api/prospectos → VPS
│
VPS REMOTO
├─ API server.js (recibe POST)
│  ├─ 1. Recibe screenshot base64
│  ├─ 2. Guarda en ./screenshots/
│  ├─ 3. Tesseract OCR (en VPS)
│  └─ 4. INSERT MySQL
│
└─ leadmaster_scraper.js (completamente independiente)
   ├─ 1. Navega en headless=true
   ├─ 2. Clicks automáticos
   ├─ 3. Captura screenshot
   │  └─ ./screenshots/screenshot-*.png
   ├─ 4. Tesseract OCR (en VPS)
   └─ 5. INSERT MySQL (directo)

BD MySQL (VPS)
└─ tabla: prospectos
   ├─ id (INT)
   ├─ palabra_clave
   ├─ url_anuncio
   ├─ url_landing
   ├─ texto_extraido (resultado OCR)
   └─ metadata
```

## Conclusión

El flujo de extracción y almacenamiento está claramente separado por ubicación geográfica:

1. **Captura:** Ocurre en PC local (scraper-local.js) o en VPS (leadmaster_scraper.js)
2. **OCR (Tesseract):** Ocurre **siempre en el VPS**, nunca en la PC local
3. **Almacenamiento BD:** Ocurre **siempre en el VPS**, en la instancia MySQL remota
4. **Screenshots:** Se guardan temporalmente en la ubicación de captura, pero la versión final es la que llega a la BD del VPS

El procesamiento local es mínimo: solo captura de screenshot. Todo lo demás (OCR, almacenamiento, validación) ocurre en el VPS.

## Comandos Útiles

### Iniciar scraper local (en PC local)
```bash
cd /home/beto/Documentos/Github/prospectos-leadmaster-local
node src/local/scraper-local.js "presupuesto para reforma de oficinas en CABA"
```

### Iniciar scraper VPS (ejecutar en VPS)
```bash
cd /path/to/leadmaster  # En el VPS
node src/scraper/leadmaster_scraper.js "presupuesto para reforma de oficinas en CABA"
```

### Iniciar API (en VPS)
```bash
cd /path/to/leadmaster  # En el VPS
npm run api:start
# O manualmente:
node src/api/server.js
# Escucha en: http://0.0.0.0:3001
```

### Verificar que API está disponible
```bash
curl -X GET http://localhost:3001/api/health
```

### Listar prospectos en BD (desde VPS)
```bash
curl -X GET "http://localhost:3001/api/prospectos?limit=10&offset=0"
```

### Ver screenshots guardados (en VPS)
```bash
ls -lah ./screenshots/
# O si está especificado en config:
ls -lah $(grep screenshotsDir src/shared/config.js | cut -d"'" -f2)
```

### Verificar BD MySQL (en VPS)
```bash
mysql -h localhost -u leadmaster_user -p leadmaster -e "SELECT id, palabra_clave, url_landing, LENGTH(texto_extraido) as texto_len FROM prospectos ORDER BY id DESC LIMIT 5;"
```

### Ver logs del OCR en tiempo real (en VPS)
```bash
# Activar logger en config
export OCR_LOGGER=true
node src/scraper/leadmaster_scraper.js "mi palabra clave"
```

### Limpiar screenshots temporales (en PC local)
```bash
rm -rf src/local/temp_screenshots/*
```

---

**Nota:** Este informe se basa en el análisis del código fuente al 11 de abril de 2026. Las funcionalidades exactas pueden variar según la versión específica desplegada en el VPS.
