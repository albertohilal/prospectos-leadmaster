# Guía: Ejecutar LeadMaster en tu PC Local

Esta guía explica cómo ejecutar el sistema LeadMaster en tu PC local, combinando interacción humana (clic en anuncios) con automatización backend para capturar URLs finales de landing pages y guardarlas como dato principal.

La PC local prioriza la obtención de landing pages reales mediante navegador visible. La captura de pantalla de la landing puede conservarse como evidencia documental de respaldo; OCR queda como función histórica, auxiliar o fuera del alcance principal vigente.

## 📋 Requisitos Previos

### 1. Node.js 18+ 
- **Windows/Mac**: Descargar desde [nodejs.org](https://nodejs.org)
- **Linux**: `sudo apt install nodejs npm`

Verificar instalación:
```bash
node --version  # Debe mostrar 18.x o superior
npm --version   # Debe mostrar 9.x o superior
```

### 2. Git (opcional, para clonar el proyecto)
```bash
git --version
```

### 3. Conexión a Internet
- Acceso a Google
- Acceso al VPS (para API)

## 🚀 Configuración Rápida

### Paso 1: Obtener los archivos del proyecto

**Opción A: Clonar desde GitHub** (si el repositorio es público):
```bash
git clone https://github.com/albertohilal/prospectos-leadmaster.git
cd prospectos-leadmaster
```

**Opción B: Copiar manualmente desde el VPS**:
1. Conectar al VPS via SSH: `ssh root@185.187.170.196`
2. Copiar carpeta: `scp -r root@185.187.170.196:/root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster ./`
3. `cd prospectos-leadmaster`

**Opción C: Usar VS Code Remote SSH** (recomendado):
1. Abrir carpeta remota en VS Code (conexión SSH al VPS)
2. Copiar archivos `src/local/` y `package.json` a tu PC local

### Paso 2: Instalar dependencias

```bash
# Instalar dependencias globales de Playwright
npm install

# Instalar navegadores de Playwright (Chrome)
npx playwright install chrome
```

### Paso 3: Configurar conexión a la API

Editar el archivo `src/shared/config.js` o crear un archivo `.env`:

```bash
# Crear archivo .env en la raíz del proyecto
cp .env.example .env
```

Editar `.env`:
```env
# URL de la API en tu VPS (reemplazar IP)
API_URL=http://185.187.170.196:3000/api

# Configuración local
BROWSER_HEADLESS=false
BROWSER_SLOWMO=300
```

### Paso 4: Asegurarse que la API esté ejecutándose en el VPS

En el VPS:
```bash
cd prospectos-leadmaster
npm run api:start
```

Deberías ver:
```
🚀 API LeadMaster ejecutándose en http://0.0.0.0:3000
```

## 🎯 Uso Básico

### 1. Iniciar la API en el VPS (si no está corriendo)

```bash
# En el VPS
cd prospectos-leadmaster
npm run api:start
```

### 2. Ejecutar script local en tu PC

```bash
# En tu PC local
cd prospectos-leadmaster
node src/local/scraper-local.js "presupuesto para reforma de oficinas en CABA"
```

### 3. Interacción paso a paso

1. **El script abre Chrome** con resultados de búsqueda de Google
2. **Tú haces clic manualmente** en anuncios patrocinados
3. **El script detecta automáticamente** cuando navegas a una landing page
4. **Captura la URL final** de la landing como dato principal
5. **Puede capturar screenshot completo** de la landing page como evidencia documental de respaldo
6. **Envía datos a la API** en el VPS
7. **Pregunta si quieres capturar otro anuncio**

### 4. Verificar resultados

En el VPS:
```bash
# Ver prospectos capturados
npm run db:view

# Contar total
npm run db:status
```

## 🔧 Configuración Avanzada

### Cambiar motor de búsqueda

Editar `src/local/scraper-local.js`, línea ~90:
```javascript
// Cambiar de Google a Bing
const googleUrl = 'https://www.bing.com/?cc=ar';
```

### SearXNG local como apoyo auxiliar

SearXNG puede usarse como componente auxiliar de búsqueda/consulta local para explorar resultados y complementar el análisis operativo. No es crítico para el flujo principal y no reemplaza el navegador visible controlado por Playwright.

Datos documentados:

```text
Carpeta: AUXILIAR/searxng-local/
Compose: AUXILIAR/searxng-local/docker-compose.yml
Config: AUXILIAR/searxng-local/searxng/settings.yml
URL local: http://127.0.0.1:18080
Servicio systemd: searxng-local.service
```

El flujo vigente sigue siendo: keyword, navegador visible con Playwright, clic humano en anuncio, captura de `url_landing`, screenshot opcional como evidencia y guardado del prospecto/landing. SearXNG no es el navegador aislado/privado previsto para la futura segunda pasada de scraping/enriquecimiento, ni reemplaza esa etapa posterior.

### Ajustar tiempo de espera

En `.env`:
```env
# Tiempo entre acciones (milisegundos)
BROWSER_SLOWMO=500

# Tiempo de espera para clics humanos (milisegundos)
LOCAL_WAIT_FOR_CLICK_TIMEOUT=120000  # 2 minutos
```

### Usar proxy (si es necesario)

Editar `src/shared/config.js`:
```javascript
const browserConfig = {
  // ... configuración existente
  proxy: {
    server: 'http://proxy-server:port',
    username: 'user',
    password: 'pass'
  }
};
```

## 🐛 Solución de Problemas

### "No se abre Chrome"
```bash
# Forzar reinstalación de Playwright
npx playwright install --force
```

### "No se conecta a la API"
1. Verificar que el VPS permita conexiones en puerto 3000
2. Verificar firewall: `sudo ufw allow 3000`
3. Probar conectividad: `curl http://IP-DEL-VPS:3000/api/health`

### "Google muestra CAPTCHA"
- Esto es normal en scraping automático, pero en modo local (con interacción humana) debería aparecer menos.
- Si aparece, resuélvelo manualmente y continúa.

### "El script no detecta mis clics"
- Asegúrate de hacer clic en **enlaces** (no en botones de "Más información").
- El script detecta nuevas pestañas o cambios de URL.
- Si usas Chrome, permite popups y nuevas ventanas.

## 📊 Monitoreo

### Endpoints de la API
- `GET http://IP-VPS:3000/api/health` - Salud del sistema
- `GET http://IP-VPS:3000/api/prospectos` - Listar prospectos
- `GET http://IP-VPS:3000/api/prospectos/:id` - Ver prospecto específico

### Logs en el VPS
```bash
# Ver logs de la API
tail -f api.log  # Si configuraste logging

# Ver logs de Node.js
pm2 logs leadmaster-api  # Si usas PM2
```

### Base de datos MySQL
```sql
-- Conectarse a MySQL
mysql -u leadmaster_user -pleadmaster_password

-- Consultas útiles
USE leadmaster;
SELECT * FROM prospectos ORDER BY id DESC LIMIT 5;
SELECT palabra_clave, COUNT(*) FROM prospectos GROUP BY palabra_clave;
```

### Dato principal y evidencia

En el flujo vigente, el dato principal a validar es `url_landing`. La captura de pantalla puede conservarse para auditoría visual del hallazgo, junto con la fecha/hora, la keyword asociada y la ruta del archivo si corresponde.

El campo `texto_extraido` puede existir en la base como campo heredado o auxiliar, pero OCR no debe considerarse el método principal de extracción en esta etapa.

## 🔮 Próximos Pasos

### Automatización parcial
Una vez que domines el flujo manual, puedes:
1. Usar keywords desde batch o desde la tabla operativa de keywords.
2. Procesar lotes controlados manteniendo interacción humana para anuncios.
3. Programar ejecuciones periódicas cuando el flujo esté estabilizado.

### Segunda pasada de enriquecimiento

La extracción estructurada de datos queda prevista para una etapa posterior sobre la URL de landing capturada. Para esa etapa se evaluará usar un navegador aislado/privado no basado en Chrome, por ejemplo Firefox controlado por Playwright con contexto limpio. Esa segunda pasada no está implementada en esta guía.

### Interfaz web
Desarrollar frontend web para:
- Gestionar palabras clave
- Visualizar prospectos capturados
- Marcar prospectos como válidos/inválidos

### Análisis avanzado
Integrar con OpenAI API para:
- Clasificar automáticamente prospectos
- Extraer información de contacto
- Calcular score de relevancia

## ❓ Preguntas Frecuentes

### ¿Puedo usar otro navegador?
Sí, Playwright soporta Firefox y WebKit. En el flujo local vigente se usa navegador visible para interacción humana. Para una segunda pasada futura sobre landings se evaluará usar un navegador aislado/privado no basado en Chrome, por ejemplo Firefox con contexto limpio.

### ¿Se almacenan imágenes en mi PC?
Sí, temporalmente en `src/local/temp_screenshots/`. Se envían al VPS y luego se pueden eliminar.

### ¿Puedo ejecutar sin VPS?
Sí, pero necesitarías MySQL local. Modifica `src/shared/config.js` para apuntar a localhost.

### ¿Es legal hacer scraping?
Consulta las políticas de términos de servicio de Google. Este script usa interacción humana, no scraping automatizado masivo.

## 📞 Soporte

Para problemas técnicos:
1. Revisar logs de error
2. Verificar conexión de red
3. Actualizar dependencias: `npm update`

Para nuevas funcionalidades:
- Abrir issue en GitHub
- Contactar al desarrollador