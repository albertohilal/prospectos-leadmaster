# LeadMaster Scraper

Sistema automatizado en Node.js para recolectar prospectos de anuncios patrocinados en Google Chrome y guardarlos en MySQL.

## Características

- 🔍 **Búsqueda en Google** por palabra clave
- 🎯 **Detección de anuncios patrocinados** con múltiples selectores
- 📸 **Captura de pantalla completa** de landing pages
- 🔠 **OCR con Tesseract.js** para extraer texto de imágenes
- 🗄️ **Almacenamiento en MySQL** con metadatos completos
- 🛡️ **Manejo robusto de errores** y timeouts
- 📊 **Registro de actividad** en base de datos

## Requisitos Previos

- **Node.js 18+** y npm
- **MySQL 8+** (instalado y ejecutándose)
- **Tesseract OCR** (binario instalado en el sistema)
- **Chromium/Chrome** (instalado, Playwright lo maneja automáticamente)

## Instalación

1. **Clonar/Copiar** los archivos del proyecto
2. **Instalar dependencias** (ya instaladas globalmente en este entorno):
   ```bash
   npm install
   ```
3. **Configurar base de datos** (ya configurada):
   - Base de datos: `leadmaster`
   - Usuario: `leadmaster_user`
   - Contraseña: `leadmaster_password`

## Uso

### Ejecutar con una palabra clave
```bash
node leadmaster_scraper.js "palabra clave"
```

### Ejemplo
```bash
node leadmaster_scraper.js "presupuesto para reforma de oficinas en CABA"
```

### Scripts útiles (definidos en package.json)
```bash
# Probar con una palabra clave de ejemplo
npm test

# Ver estado de la base de datos
npm run db:status

# Ver últimos 10 registros
npm run db:view
```

## Estructura del Script

```
leadmaster_scraper.js
├── Configuración (MySQL, Playwright, selectores)
├── Clase LeadMasterScraper
│   ├── initDatabase()      # Conexión a MySQL
│   ├── initBrowser()       # Iniciar navegador Playwright
│   ├── searchGoogle()      # Buscar palabra clave
│   ├── findAndClickSponsoredAd() # Detectar y clic en anuncios
│   ├── takeScreenshot()    # Captura completa de página
│   ├── extractTextFromImage() # OCR con Tesseract.js
│   ├── saveToDatabase()    # Guardar resultados
│   └── run()               # Flujo principal
└── Manejo de argumentos CLI
```

## Personalización

### Selectores de Anuncios
Los selectores para detectar anuncios patrocinados están en `config.selectors.sponsoredAds`. Puedes agregar más selectores si es necesario:

```javascript
sponsoredAds: [
  '[data-text-ad="1"]',
  '[aria-label*="Anuncio"]',
  '[aria-label*="Ad"]',
  '.uEierd',
  'a[href*="/aclk?"]',
  // Agrega tus propios selectores aquí
]
```

### Modo Debug
Cambia `headless: true` a `headless: false` en la configuración para ver el navegador en acción:

```javascript
browser: {
  headless: false,  // ← Cambiar a false
  slowMo: 100,      // Delay entre acciones (ms)
  args: ['--no-sandbox']
}
```

### Idiomas OCR
El script usa español + inglés por defecto. Para cambiar los idiomas en Tesseract:
```javascript
const { data: { text } } = await Tesseract.recognize(
  imagePath,
  'spa+eng',  // ← Cambiar idiomas
  { logger: info => console.log(`OCR: ${info.progress * 100}%`) }
);
```

## Base de Datos

### Estructura de la tabla `prospectos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | ID autoincremental |
| palabra_clave | VARCHAR(255) | Palabra clave buscada |
| url_anuncio | TEXT | URL del anuncio en Google |
| url_landing | TEXT | URL de la landing page |
| texto_extraido | LONGTEXT | Texto extraído por OCR |
| fecha_hora | TIMESTAMP | Fecha y hora de captura |
| es_valido | BOOLEAN | NULL: no evaluado, TRUE: válido, FALSE: inválido |
| metadata | JSON | Metadatos adicionales (ruta screenshot, errores, etc.) |
| created_at, updated_at | TIMESTAMP | Fechas de creación/actualización |

### Consultas útiles
```sql
-- Total de prospectos
SELECT COUNT(*) as total FROM prospectos;

-- Prospectos por palabra clave
SELECT palabra_clave, COUNT(*) as cantidad 
FROM prospectos 
GROUP BY palabra_clave 
ORDER BY cantidad DESC;

-- Prospectos válidos vs inválidos
SELECT 
  CASE WHEN es_valido IS NULL THEN 'no evaluado'
       WHEN es_valido = 1 THEN 'válido'
       ELSE 'inválido' 
  END as estado,
  COUNT(*) as cantidad
FROM prospectos 
GROUP BY es_valido;
```

## Solución de Problemas

### "No se encontraron anuncios patrocinados"
- Los selectores pueden haber cambiado. Revisa la página de resultados de Google.
- Ejecuta en modo `headless: false` para ver qué está viendo el script.
- Agrega nuevos selectores a la configuración.

### Error de conexión a MySQL
- Verifica que MySQL esté ejecutándose: `sudo systemctl status mysql`
- Verifica credenciales en `config.db`

### Error de OCR
- Asegúrate de que Tesseract esté instalado: `tesseract --version`
- Verifica que el screenshot se haya guardado correctamente.

### Timeouts
- Ajusta los timeouts en `config.timeouts` si la conexión es lenta.

## Próximos Pasos

1. **Ejecutar prueba inicial** con una palabra clave
2. **Ajustar selectores** según resultados
3. **Integrar con OpenClaw** para automatización
4. **Agregar análisis de texto** con OpenAI API
5. **Programar ejecuciones periódicas** con cron

## Licencia
MIT - Ver archivo LICENSE