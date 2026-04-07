# Informe de diagnóstico: conexión OpenClaw-Admin ↔ Gateway

Fecha: 6 de abril de 2026
Proyecto: LeadForge (antes prospectos-leadmaster)

## Resumen ejecutivo

El error `[Gateway] Error: Invalid URL: [object Object]` apunta, con alta probabilidad, a un problema de contrato de parámetros al instanciar `OpenClawGateway`, más que a una falla de `.env` o de red.

La causa más común en este escenario es:

- Se pasa un objeto al constructor (`new OpenClawGateway({ url, token, password })`)
- Pero el constructor interno todavía espera parámetros posicionales (`constructor(url, token, password)`)

Cuando eso ocurre, la variable que internamente se usa como URL termina siendo el objeto completo, que al convertirse a string queda como `[object Object]`.

---

## 1) ¿Por qué `envConfig.OPENCLAW_WS_URL` aparece como `[object Object]`?

No necesariamente porque `envConfig.OPENCLAW_WS_URL` se haya transformado realmente en objeto.

Lo más probable es que:

1. `envConfig.OPENCLAW_WS_URL` sí sea string en `loadEnvConfig()`
2. Al construir `OpenClawGateway`, se entrega un objeto completo
3. Ese objeto se interpreta como el primer argumento `url`
4. Al intentar abrir WebSocket, se serializa el objeto como `[object Object]`

Conclusión: el string no se corrompe en origen; se rompe en la forma de consumo.

---

## 2) Posibles causas de corrupción entre `loadEnvConfig()` y creación del Gateway

Ordenadas por probabilidad:

1. **Desalineación de firma del constructor**
   - Llamada nueva con objeto
   - Constructor viejo con argumentos posicionales

2. **Reasignación accidental en capa intermedia**
   - Ejemplo: `wsUrl = config` o un merge que pisa `OPENCLAW_WS_URL`

3. **Fallback defectuoso**
   - Ejemplo: `const wsUrl = env.OPENCLAW_WS_URL || { ...defaults }`

4. **Normalización inconsistente de configuración**
   - Mezcla de propiedades `GATEWAY_URL`, `OPENCLAW_WS_URL`, o wrappers que transforman shape

---

## 3) Dónde agregar logs de depuración para rastrear el problema

Agregar logs de tipo y valor (sin exponer token completo) en estos puntos:

1. **Fin de `loadEnvConfig()`**
   - Log de `typeof OPENCLAW_WS_URL` y valor

2. **Justo antes de `new OpenClawGateway(...)` en `server/index.js`**
   - Log del payload exacto enviado al constructor

3. **Primera línea del constructor en `server/gateway.js`**
   - Log de argumentos recibidos y `typeof` de `url`

4. **Inmediatamente antes de `new WebSocket(finalUrl, ...)`**
   - Log de `finalUrl`, `typeof finalUrl` y validación de esquema (`ws://` o `wss://`)

Con eso se detecta exactamente en qué salto muta el tipo.

---

## 4) ¿Hay inconsistencia de `dotenv` parseando `.env`?

Con el `.env` reportado, `dotenv` debería devolver strings planos.

Riesgos secundarios (menos probables aquí):

- Archivo con BOM inicial
- Comillas sin cerrar
- Caracteres invisibles o CRLF atípico

Nada de lo anterior explica tan bien `[object Object]` como el mismatch de constructor.

---

## 5) Soluciones propuestas (de simple a compleja)

### Solución A (más simple): alinear firma de constructor y uso

Elegir una única convención y aplicarla de punta a punta:

- O constructor posicional + llamada posicional
- O constructor con objeto + desestructuración interna

### Solución B: validación temprana y errores explícitos

Agregar guardas al constructor:

- `url` debe ser string no vacío
- Debe iniciar con `ws://` o `wss://`

Si falla, lanzar error claro (ej. `Expected string URL, received object`).

### Solución C (más robusta): esquema de configuración centralizado

Unificar toda la carga de entorno con validación de schema (Zod/Joi/Yup):

- Tipos validados al arrancar
- Mapeo único de aliases (`GATEWAY_URL` vs `OPENCLAW_WS_URL`)
- Aplicación no inicia si la config es inválida

---

## Conclusión

La hipótesis principal sigue siendo desalineación entre cómo se instancia `OpenClawGateway` y cómo su constructor interpreta argumentos. Es el patrón que mejor encaja con el síntoma exacto `Invalid URL: [object Object]`.

Próximo paso recomendado: revisar la firma real del constructor en `server/gateway.js` y compararla con la llamada en `server/index.js`.
