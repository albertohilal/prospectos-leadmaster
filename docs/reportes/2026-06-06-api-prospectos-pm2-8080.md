# API de prospectos en VPS administrada por PM2

Fecha: 2026-06-06  
Proyecto: prospectos-leadmaster-local  
Servidor: VPS Contabo `185.187.170.196`  
Ruta en VPS: `/root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster`

---

## 1. Objetivo

Dejar documentada la estabilización de la API de prospectos utilizada por el scraper local de LeadMaster.

La API quedó corriendo en el VPS en el puerto `8080`, administrada por PM2, con arranque automático configurado mediante `pm2 startup` y lista de procesos guardada mediante `pm2 save`.

---

## 2. Contexto operativo

Durante la prueba del flujo de captura desde keywords almacenadas en base de datos, el scraper local funcionó correctamente hasta la detección de la landing page y el armado del payload liviano.

El problema detectado inicialmente fue que el scraper estaba apuntando a:

```text
http://185.187.170.196:3000/api
```

Ese puerto no correspondía a la API de prospectos, sino a otro servicio/gateway.

El endpoint esperado por el scraper era:

```text
POST /api/prospectos
```

pero en el puerto `3000` devolvía:

```text
Cannot POST /api/prospectos
```

---

## 3. Hallazgo principal

La API real de prospectos no estaba en `3000`.

En el VPS, el archivo `.env` del proyecto indicaba:

```env
API_PORT=8080
API_HOST=0.0.0.0
API_URL=http://localhost:8080/api
```

Por lo tanto, la API correcta es:

```text
http://185.187.170.196:8080/api
```

---

## 4. Estado de puertos

Estado final validado:

```text
3000 → gateway/openclaw, no tocar
8080 → prospectos-api-8080 administrado por PM2
```

El puerto `3000` permanece activo con otro proceso Node y no debe ser utilizado como API de prospectos.

El puerto `8080` queda reservado para la API de prospectos del proyecto `prospectos-leadmaster`.

---

## 5. Problema encontrado en la API

La API en `8080` estaba levantada previamente con un proceso temporal, pero había quedado con la conexión MySQL cerrada.

El error observado fue:

```text
Can't add new command when connection is in closed state
```

Se reinició la API y se validó la conexión a MySQL.

---

## 6. Migración a PM2

Se instaló PM2 globalmente en el VPS:

```bash
npm install -g pm2
```

Se verificó:

```bash
pm2 -v
pm2 status
```

Luego se detuvieron los procesos temporales asociados a la API en `8080`.

Finalmente, la API fue levantada con PM2 mediante el script oficial del proyecto:

```bash
cd /root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster

set -a
source .env
set +a

pm2 start npm --name prospectos-api-8080 -- run api:start
```

---

## 7. Persistencia configurada

Se guardó la lista actual de procesos PM2:

```bash
pm2 save
```

Luego se configuró el arranque automático de PM2 con systemd:

```bash
pm2 startup
```

El sistema creó el servicio:

```text
/etc/systemd/system/pm2-root.service
```

y habilitó:

```text
pm2-root.service
```

Finalmente se ejecutó nuevamente:

```bash
pm2 save
```

---

## 8. Validaciones realizadas

### 8.1 Estado PM2

PM2 quedó con el proceso:

```text
prospectos-api-8080
```

en estado:

```text
online
```

### 8.2 Health local en VPS

Se validó desde el VPS:

```bash
curl -i http://127.0.0.1:8080/api/health
```

Respuesta esperada y validada:

```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 8.3 Health externo desde máquina local

Se validó desde la máquina local:

```bash
curl -i http://185.187.170.196:8080/api/health
```

Respuesta esperada y validada:

```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 9. Configuración local correcta

En la máquina local, el archivo:

```text
/home/beto/Documentos/Github/prospectos-leadmaster-local/.env
```

debe tener:

```env
API_URL=http://185.187.170.196:8080/api
```

No debe apuntar a `3000` ni a `3001`.

---

## 10. Configuración correcta en VPS

En el VPS, el `.env` del proyecto puede mantener:

```env
API_URL=http://localhost:8080/api
```

Esto es correcto porque dentro del VPS `localhost` apunta al propio servidor.

---

## 11. Validación funcional del flujo LeadMaster

Se validó el flujo completo:

```text
keyword desde DB
→ run-db-batch.js
→ scraper local
→ Google Ads
→ clic humano
→ landing real
→ screenshot suspendido
→ API 8080
→ leadmaster.prospectos
→ actualización de ll_keywords_leadmaster
```

Se confirmó la creación de un prospecto real en la tabla:

```text
leadmaster.prospectos
```

y la actualización de la keyword en:

```text
iunaorg_dyd.ll_keywords_leadmaster
```

---

## 12. Nota sobre screenshots

El envío de screenshot quedó suspendido temporalmente para evitar payloads pesados en el JSON enviado a la API.

El scraper envía actualmente:

```text
keyword
landingUrl
screenshotBase64: null
```

La captura de pantalla como evidencia documental queda pendiente para una fase posterior.

---

## 13. Estado final

Estado final de esta intervención:

```text
API 8080 healthy
Base leadmaster conectada
PM2 instalado
prospectos-api-8080 online
pm2 save ejecutado
pm2 startup configurado
3000 intacto
scraper local validado
```

---

## 14. Pendientes

1. Definir estrategia futura para evidencia documental de landings.
2. Evaluar si la captura de screenshot debe guardarse como archivo externo y no como base64 en JSON.
3. Documentar en README o guía operativa que:

   * `3000` no es la API de prospectos.
   * `8080` es la API real de prospectos.
   * los servicios Node persistentes del VPS deben administrarse siempre con PM2.
