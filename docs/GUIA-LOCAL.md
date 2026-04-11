# Guía: Ejecutar LeadMaster en tu PC Local

Esta guía explica cómo ejecutar el sistema LeadMaster en tu PC local, combinando interacción humana (clic en anuncios) con automatización backend (captura, OCR, almacenamiento).

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
4. **Captura screenshot completo** de la landing page
5. **Envía datos a la API** en el VPS
6. **Pregunta si quieres capturar otro anuncio**

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

## 🔮 Próximos Pasos

### Automatización parcial
Una vez que domines el flujo manual, puedes:
1. Crear lista de palabras clave en archivo `keywords.txt`
2. Script que procese automáticamente cada palabra clave
3. Programar ejecuciones periódicas

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
Sí, Playwright soporta Firefox y WebKit. Cambia `chromium` por `firefox` o `webkit` en el script.

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