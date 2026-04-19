# Informe de ajuste de allowedOrigins en OpenClaw Control UI

**Fecha:** 2026-04-12  
**Proyecto:** OpenClaw Gateway / OpenClaw-Admin  
**Autor:** Copilot  
**Estado:** Borrador

---

## 📋 Resumen Ejecutivo

Se aplicó un ajuste mínimo de seguridad en la configuración del gateway para permitir la apertura directa de la Control UI desde la URL pública `http://185.187.170.196:18789/chat?session=main`, sin abrir orígenes globales. Se agregó solo el origen requerido en `gateway.controlUi.allowedOrigins`, se reinició el servicio del gateway y se verificó continuidad operativa en el puerto `18789`.

## 🎯 Objetivo

Permitir acceso directo a OpenClaw Control UI desde la IP pública del VPS, sin túnel SSH, conservando restricciones de origen razonables.

## 🔍 Contexto / Antecedentes

- Síntoma reportado en UI: `origin not allowed (open the Control UI from the gateway host or allow it in gateway.controlUi.allowedOrigins)`.
- Estado inicial de `allowedOrigins`:
  - `http://localhost:18789`
  - `http://127.0.0.1:18789`
- El gateway estaba activo en `0.0.0.0:18789` con servicio `systemd --user`.

## 📊 Desarrollo / Análisis

### 1. Inspección de configuración del gateway
Se verificó la configuración efectiva en:

- `/root/.openclaw/openclaw.json`
- `/root/.config/systemd/user/openclaw-gateway.service`

Campo localizado:

```json
"gateway": {
  "controlUi": {
    "allowedOrigins": [
      "http://localhost:18789",
      "http://127.0.0.1:18789"
    ]
  }
}
```

### 2. Cambio mínimo aplicado
Se agregó únicamente el origen público requerido:

```json
"allowedOrigins": [
  "http://localhost:18789",
  "http://127.0.0.1:18789",
  "http://185.187.170.196:18789"
]
```

### 3. Seguridad y alcance
- No se habilitó `*` ni listas abiertas de orígenes.
- Se conservaron los orígenes locales (`localhost` y `127.0.0.1`) por compatibilidad operativa y diagnóstico local.

## 🛠️ Metodología / Enfoque

Comandos ejecutados (resumen):

```bash
# Backup previo
cp /root/.openclaw/openclaw.json /root/.openclaw/openclaw.json.bak.allowedOrigins.20260412-170013

# Aplicación del cambio (edición JSON)
# ... se añadió http://185.187.170.196:18789 en gateway.controlUi.allowedOrigins

# Reinicio del gateway
systemctl --user restart openclaw-gateway.service

# Validación de servicio
systemctl --user status openclaw-gateway.service --no-pager -l
ss -ltnp | grep ':18789'
curl -I http://127.0.0.1:18789/
```

## 📈 Resultados / Hallazgos

- Archivo modificado: `/root/.openclaw/openclaw.json`.
- Backup creado: `/root/.openclaw/openclaw.json.bak.allowedOrigins.20260412-170013`.
- Reinicio aplicado: `openclaw-gateway.service` (usuario).
- Estado posterior:
  - servicio `active (running)`
  - listener en `*:18789`
  - `curl -I http://127.0.0.1:18789/` devuelve `HTTP/1.1 200 OK`
- En logs recientes no se observó la cadena `origin not allowed` tras el ajuste.

## 🧩 Conclusiones

El ajuste de allowlist de origen quedó aplicado con el mínimo cambio necesario y sin relajar seguridad de forma amplia. El gateway permanece operativo y el origen público solicitado ya está autorizado en la configuración.

## 🚀 Próximos Pasos / Recomendaciones

- [ ] Validar desde navegador cliente con recarga completa (Ctrl+F5) en `http://185.187.170.196:18789/chat?session=main`.
- [ ] Si persiste fallo, capturar mensaje exacto nuevo y correlacionar con `journalctl --user -u openclaw-gateway.service`.
- [ ] Considerar publicación bajo dominio + HTTPS para endurecer seguridad y estabilidad de origen.

## 🔗 Referencias / Recursos

- `/root/.openclaw/openclaw.json`
- `/root/.config/systemd/user/openclaw-gateway.service`
- `docs/REGLAS-INFORMES.md`

---

*Informe generado siguiendo la guía de formato en `docs/REGLAS-INFORMES.md`.*

## 🔐 Actualización: resolución de secure context con HTTPS

### Solución elegida
- Se eligió `Caddy` por simplicidad operativa y renovación automática de certificados.
- Se publicó la Control UI en HTTPS usando dominio dinámico resolvible sin DNS propio:
  - `https://185-187-170-196.sslip.io/chat?session=main`

### Configuración aplicada
- Archivo creado/actualizado: `/etc/caddy/Caddyfile`

```caddy
185-187-170-196.sslip.io {
    reverse_proxy 127.0.0.1:18789
}
```

- Ajuste de allowlist en `/root/.openclaw/openclaw.json`:
  - Se agregó `https://185-187-170-196.sslip.io` a `gateway.controlUi.allowedOrigins`.
  - Se conservaron orígenes locales (`http://localhost:18789`, `http://127.0.0.1:18789`) y el origen HTTP público previo.

### Reinicios y persistencia
- `systemctl restart caddy`
- `systemctl --user restart openclaw-gateway.service`
- Estado final:
  - `caddy`: `enabled` + `active`
  - `openclaw-gateway.service`: `enabled` + `active`

### Validación final
- `curl -I https://185-187-170-196.sslip.io/chat?session=main` → `HTTP/2 200`.
- Certificado TLS obtenido por Let's Encrypt (evidencia en logs de Caddy).
- Desde el reinicio HTTPS del gateway no aparecen errores de `origin not allowed` ni `control ui requires device identity` en logs recientes.
- `OpenClaw-Admin` se mantiene operativo en `3000` (`openclaw-admin.service` activo y API responde `200`).

### Riesgos de seguridad / operativos
- El endpoint queda expuesto públicamente en `443`; se recomienda endurecer con firewall/rate-limit si se amplía uso.
- Si cambia la IP pública, el host `sslip.io` asociado cambia y deberá actualizarse `allowedOrigins` y Caddy.
- Para entorno estable de largo plazo, conviene migrar a dominio propio + política de acceso explícita.

## 🔐 Actualización: resolución de `pairing required`

### Diagnóstico preciso
- La causa no era `origin` ni `secure context` (ya resueltos), sino política de emparejamiento de dispositivo del gateway.
- Evidencia en logs del gateway:
  - `code=1008 reason=pairing required`
- Configuración observada:
  - `gateway.auth.mode=token`
  - `gateway.controlUi.allowedOrigins` correcto para HTTPS
  - No se aplicó bypass global de device auth/pairing.

### Cambio exacto aplicado
- Se aprobó explícitamente la solicitud pendiente del navegador `openclaw-control-ui` (plataforma `Linux x86_64`) por `requestId`:

```bash
openclaw devices approve fd72f8c9-4c32-413e-b474-94f97eb4209b \
  --url ws://127.0.0.1:18789 \
  --token mi-token-seguro-2026 \
  --json
```

- Resultado:
  - `deviceId=b3b95ca44d53d2241930b77dce310c7773a3dcaa8fe778fa9e858908a1a196da` pasó a tabla de `paired`.
  - `pending_count=0` tras aprobación.

### Reinicio
- No fue necesario reiniciar servicios para aprobar pairing (cambio en estado de dispositivos del gateway).

### Validación final
- Confirmado en salida JSON de aprobación: request aprobado y dispositivo agregado con rol/scopes `operator`.
- Confirmado en logs: `device pairing approved device=b3b95ca44d53d2241930b77dce310c7773a3dcaa8fe778fa9e858908a1a196da role=operator`.
- Estado actual de bloqueos:
  - El error `pairing required` quedó atendido para el dispositivo aprobado.
  - Si aparece `token missing`, corresponde ingresar token en la Control UI (no es error de pairing).

### Riesgos del cambio
- Se otorgó acceso al dispositivo aprobado con scopes de operador; mantener control sobre quién solicita pairing.
- Si el navegador cambia identidad (perfil/incógnito/almacenamiento limpio), puede generar nuevo request de pairing.

### Reversión
- Revocar el dispositivo aprobado:

```bash
openclaw devices remove b3b95ca44d53d2241930b77dce310c7773a3dcaa8fe778fa9e858908a1a196da \
  --url ws://127.0.0.1:18789 \
  --token mi-token-seguro-2026
```

- Opcional: revocar token del rol si se requiere rotación adicional.

## Cierre final de validación en navegador

- URL operativa final:
  `https://185-187-170-196.sslip.io/chat?session=main`
- Se resolvieron:
  - `origin not allowed`
  - secure context/device identity
  - `pairing required`
- La Control UI quedó accesible por HTTPS
- Ya no depende de túnel SSH ni de que el PC permanezca encendido
- Puede guardarse como favorito operativo
