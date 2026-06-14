# Informe tecnico backend correccion manual de contactos

Fecha: 14 de junio de 2026
Proyecto: LeadMaster
Autor: Agente OpenClaw
Estado: Revisado

## Resumen ejecutivo

Se preparo la base tecnica de backend para un futuro formulario de correccion manual de contactos sin implementar todavia la UI, sin modificar `.env`, sin ejecutar migraciones y sin tocar `llxbx_societe`.

La decision principal fue separar la conexion operativa de staging respecto de la conexion historica de captura. La API mantiene su conexion actual para `leadmaster.la_prospectos`, pero los endpoints nuevos de correccion manual usan una conexion dedicada basada en `DOLIBARR_DB_*`, que en esta fase debe interpretarse como la conexion al esquema compartido `iunaorg_dyd`, donde viven `la_prospectos`, `la_stg_prospectos` y `la_stg_prospectos_contactos`.

## Contexto y problema detectado

El backend tenia una unica configuracion de base centralizada en `src/shared/config.js` con preferencia por `DB_*`. Dado que `DB_NAME=leadmaster`, cualquier endpoint nuevo montado sobre esa conexion corria riesgo de leer y escribir la base equivocada para el flujo actual de staging y correccion manual.

El dominio operativo vigente para esta fase es:

- `iunaorg_dyd.la_prospectos`
- `iunaorg_dyd.la_stg_prospectos`
- `iunaorg_dyd.la_stg_prospectos_contactos`

`iunaorg_dyd.llxbx_societe` permanece fuera de alcance y no fue tocada.

## Cambios implementados

### 1. Conexion operativa separada

Se agrego una segunda configuracion en `src/shared/config.js`:

- `operationalDb`
- origen: `DOLIBARR_DB_HOST`
- `DOLIBARR_DB_PORT`
- `DOLIBARR_DB_USER`
- `DOLIBARR_DB_PASSWORD`
- `DOLIBARR_DB_NAME`

Tambien se dejo comentario tecnico explicito indicando que, en esta fase, `DOLIBARR_DB_*` representa la conexion operativa a `iunaorg_dyd` para staging y correccion manual.

### 2. Helper reutilizable de conexion

Se creo `src/shared/db.js` con:

- `getPrimaryDbConnection()`
- `getOperationalDbConnection()`

Ambas funciones aplican la zona horaria SQL configurada, pero la conexion operativa se consume por request en los endpoints nuevos para evitar transacciones sobre una conexion global compartida.

### 3. Endpoints backend minimos preparados

#### GET `/api/prospectos/staging/contactos-pendientes`

Lee desde:

- `la_stg_prospectos`
- `la_stg_prospectos_contactos`

Devuelve registros que cumplan al menos una condicion:

- sin email
- con `error_msg`
- con telefono pero sin email
- con WhatsApp pero sin email

Ademas agrega un join resumido de contactos normalizados y expone `pending_reasons` para facilitar una futura UI administrativa.

#### PUT `/api/prospectos/staging/:id/contacto-manual`

Actualiza `la_stg_prospectos` y persiste la correccion normalizada en `la_stg_prospectos_contactos`.

Reglas implementadas:

- `fuente = 'manual'`
- `es_principal = 1` para el dato corregido
- email normalizado con `lower(trim())`
- telefono y WhatsApp normalizados a solo digitos en `valor_normalizado`
- `error_msg` se limpia solo cuando existe al menos una correccion valida
- no hay ninguna referencia de escritura a `llxbx_societe`

La actualizacion de contactos se hace de forma conservadora:

- primero se desmarca `es_principal` del tipo corregido para ese `stg_prospecto_id`
- luego se reutiliza el contacto existente si coincide `valor_normalizado`
- si no existe, se inserta un nuevo contacto manual

## Archivos modificados

- `src/shared/config.js`
- `src/shared/db.js`
- `src/api/server.js`

## Validacion ejecutada

### Validaciones positivas

Se ejecutaron validaciones de sintaxis y errores locales sin escrituras en base:

```bash
node --check src/shared/config.js
node --check src/shared/db.js
node --check src/api/server.js
```

Tambien se verifico arranque parcial de la API hasta el punto de conexion, confirmando:

- conexion primaria a `leadmaster`
- conexion operativa a `iunaorg_dyd`
- zona horaria SQL aplicada

### Limitaciones de validacion

No se ejecuto una prueba real del `PUT` contra base porque el alcance de esta fase prohbe modificar datos.

La validacion HTTP completa sobre un puerto alternativo no pudo cerrarse porque la API carga `.env` con `override: true`, por lo que el `API_PORT` exportado por shell no desplaza el puerto configurado y el puerto `8080` ya estaba ocupado por otra instancia. Aun asi, el arranque mostro correctamente ambas conexiones antes del conflicto de bind.

## Conclusiones

La base tecnica de backend queda lista para una UI futura de correccion manual:

- la funcionalidad nueva ya no depende de `DB_NAME=leadmaster`
- los endpoints de staging quedaron separados sobre `DOLIBARR_DB_*`
- no se tocaron `.env`, migraciones ni tablas finales de Dolibarr
- la API ya expone una superficie minima para listar pendientes y persistir correcciones manuales

## Proximos pasos

1. Probar los endpoints nuevos en un entorno donde la API pueda levantarse sin conflicto de puerto.
2. Definir el contrato exacto de payload/response que consumira la futura UI administrativa.
3. Implementar la UI del formulario sobre estos endpoints, manteniendo a `llxbx_societe` fuera de alcance hasta la fase de export controlada.
