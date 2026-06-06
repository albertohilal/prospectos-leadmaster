# LeadMaster Scraper

Sistema Node.js para recolectar prospectos de anuncios patrocinados mediante busqueda por keyword, navegador visible, clic humano en anuncios y captura de la URL final de landing page como dato principal.

La captura de pantalla de la landing puede conservarse como evidencia documental de respaldo. OCR no forma parte del flujo principal vigente; la extraccion estructurada de datos queda prevista para una segunda pasada futura de scraping/enriquecimiento sobre la landing capturada.

## Características

- 🔍 **Búsqueda en Google** por palabra clave
- 🎯 **Navegación visible y clic humano** en anuncios patrocinados
- 🔗 **Captura de URL final de landing** como dato principal (`url_landing`)
- 📸 **Captura de pantalla opcional** de landing pages como evidencia documental
- 🗄️ **Almacenamiento en MySQL** con metadatos y evidencia
- 🛡️ **Manejo robusto de errores** y timeouts
- 📊 **Registro de actividad** en base de datos

## Requisitos Previos

- **Node.js 18+** y npm
- **MySQL 8+** (instalado y ejecutándose)
- **Tesseract OCR** solo si se usan funciones historicas o auxiliares fuera del flujo principal vigente
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

## Uso vigente recomendado

El flujo local recomendado se ejecuta con navegador visible y requiere interaccion humana:

```bash
node src/local/scraper-local.js "palabra clave"
```

El script abre resultados de busqueda, espera clics manuales en anuncios patrocinados, detecta la URL final de landing y envia el prospecto a la API.

La captura de pantalla de la landing puede guardarse como evidencia documental, pero no reemplaza la segunda pasada futura de scraping/enriquecimiento.

## SearXNG como apoyo de busqueda

SearXNG fue usado en el proyecto como componente auxiliar de búsqueda/consulta local. Puede apoyar la exploracion de resultados o consultas complementarias, pero no forma parte critica del flujo principal del scraper local.

Datos documentados:

```text
Carpeta: AUXILIAR/searxng-local/
Compose: AUXILIAR/searxng-local/docker-compose.yml
Config: AUXILIAR/searxng-local/searxng/settings.yml
URL local: http://127.0.0.1:18080
Servicio systemd: searxng-local.service
```

SearXNG no es un navegador privado, no reemplaza el navegador visible controlado por Playwright, no reemplaza la captura de `url_landing` y no reemplaza la futura segunda pasada de scraping/enriquecimiento sobre landings. Cuando esa segunda pasada se implemente, se evaluará un navegador aislado/privado no basado en Chrome, por ejemplo Firefox con contexto limpio de Playwright.

## Uso historico/automatico

El script `src/scraper/leadmaster_scraper.js` corresponde al enfoque automatico/headless anterior. Puede conservarse como referencia o soporte para motores menos restrictivos, pero no representa el flujo principal vigente para esta etapa.

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
│   ├── takeScreenshot()    # Captura opcional como evidencia documental
│   ├── extractTextFromImage() # OCR historico/auxiliar, fuera del flujo principal vigente
│   ├── saveToDatabase()    # Guardar resultados
│   └── run()               # Flujo principal
└── Manejo de argumentos CLI
```

Para el flujo local vigente, la pieza principal es `src/local/scraper-local.js`, que prioriza navegacion visible, clic humano y obtencion de `url_landing`.

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

### OCR historico o auxiliar
OCR queda fuera del flujo principal vigente. Si se usa para pruebas o compatibilidad con datos heredados, el script puede emplear español + inglés por defecto. Para cambiar los idiomas en Tesseract:
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
| url_landing | TEXT | URL final de la landing page; dato principal del flujo vigente |
| texto_extraido | LONGTEXT | Campo heredado o auxiliar; OCR no es el metodo principal vigente |
| fecha_hora | TIMESTAMP | Fecha y hora de captura |
| es_valido | BOOLEAN | NULL: no evaluado, TRUE: válido, FALSE: inválido |
| metadata | JSON | Metadatos adicionales: ruta screenshot, errores, evidencia, etc. |
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

### OCR historico o auxiliar
- OCR no es el metodo principal vigente.
- Si se usa para pruebas o soporte documental, asegúrate de que Tesseract esté instalado: `tesseract --version`.
- Verifica que el screenshot se haya guardado correctamente solo si necesitas evidencia visual u OCR auxiliar.

### Timeouts
- Ajusta los timeouts en `config.timeouts` si la conexión es lenta.

## Próximos Pasos

1. **Ejecutar prueba inicial** con una palabra clave en el flujo local visible
2. **Validar `url_landing`** como dato principal capturado
3. **Conservar screenshots** solo como evidencia documental cuando aporte trazabilidad
4. **Implementar una segunda pasada futura** de scraping/enriquecimiento sobre landings capturadas
5. **Evaluar para esa etapa futura** un navegador aislado/privado no basado en Chrome, por ejemplo Firefox con contexto limpio de Playwright
6. **Integrar con OpenClaw** para automatización
7. **Programar ejecuciones periódicas** cuando el flujo este estabilizado

## Licencia
MIT - Ver archivo LICENSE