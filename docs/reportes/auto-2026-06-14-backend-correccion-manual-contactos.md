# Informe tecnico backend correccion manual de contactos

Fecha: 14 de junio de 2026
Proyecto: LeadMaster
Autor: Agente OpenClaw
Estado: Revisado

## Resumen ejecutivo

Se preparo la base tecnica de backend para un futuro formulario de correccion manual de contactos sin implementar todavia la UI, sin modificar `.env`, sin ejecutar migraciones y sin tocar `llxbx_societe`.

La decision principal fue separar la conexion operativa de staging respecto de la conexion historica de captura. La API mantiene su conexión primaria histórica basada en `DB_*`, actualmente `DB_NAME=leadmaster`, para los endpoints existentes. Los endpoints nuevos de corrección manual no usan esa conexión: usan una conexión operativa separada basada en `DOLIBARR_DB_*`, que en esta fase apunta a `iunaorg_dyd`.

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

### 4. Extension aplicada para estados de revision manual

La tabla real `iunaorg_dyd.la_stg_prospectos` ya contaba al momento de esta extension con los campos:

- `contacto_estado`
- `contacto_validado_at`
- `contacto_validado_note`

Esos campos e indices fueron agregados manualmente desde MySQL Workbench. No se ejecuto ninguna migracion desde este repo para incorporarlos.

Verificacion operativa informada para esta fase:

- los `170` registros existentes quedaron con `contacto_estado = pendiente`
- los indices `idx_la_stg_contacto_estado` e `idx_la_stg_contacto_validado_at` ya existen en la base

Con esta extension, el backend queda preparado para leer y escribir esos campos desde:

- `GET /api/prospectos/staging/contactos-pendientes`
- `PUT /api/prospectos/staging/:id/contacto-manual`

Ademas, el endpoint de pendientes ahora excluye los estados resueltos manualmente:

- `corregido_manual`
- `sin_email`
- `descartado`
- `validado_manual`

Y sigue listando solo registros con estado operativo:

- `pendiente`
- `error_tecnico`

La marca `contacto_validado_at` se actualiza cuando se guarda una correccion, cuando se informa `contacto_estado` o cuando se registra una nota manual en `contacto_validado_note`.

El archivo `config/migration_add_contacto_estado_stg_manual_20260614.sql` es documental y refleja lo ya aplicado manualmente en MySQL Workbench.

El `PUT` fue probado posteriormente de forma controlada sobre un único registro real de staging, con backup puntual previo y sin tocar `llxbx_societe`.

## Archivos modificados

- `src/shared/config.js`
- `src/shared/db.js`
- `src/api/server.js`
- `config/migration_add_contacto_estado_stg_manual_20260614.sql`

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

Inicialmente no se habia ejecutado una prueba real del `PUT` contra base porque el alcance de esta fase prohíbe modificar datos. Posteriormente se completó una prueba controlada sobre un único registro real de staging, documentada más abajo.

La primera validacion HTTP sobre puerto alternativo no pudo cerrarse porque la API carga `.env` con `override: true`, por lo que el `API_PORT` exportado por shell no desplaza el puerto configurado y el puerto `8080` ya estaba ocupado por otra instancia. Posteriormente se completó un smoke test HTTP controlado en el puerto `18080`, documentado más abajo.

### Validacion posterior de solo lectura sobre staging operativo

Se ejecuto una prueba adicional de solo lectura con un script Node que abre conexion mediante `getOperationalDbConnection()` y consulta directamente `la_stg_prospectos`.

Resultado confirmado:

- `DATABASE() = iunaorg_dyd`
- `total = 170`
- `sin_email = 32`
- `con_error = 14`
- `con_telefono = 102`
- `con_whatsapp = 68`

La muestra de casos devueltos por esa consulta de solo lectura incluyo:

- `prospecto_id 165` `Equipmine`, con `error HTTP 403`
- `prospecto_id 162` `Puentesgruaferro`, con email `puentesgruaferro@yahoo.com` y `error HTTP 429`
- `prospecto_id 145` `Xjcsensor`, sin email y con telefono/WhatsApp
- `prospecto_id 142` `Enausa`, con `error HTTP 429`
- `prospecto_id 141` `Fygtechnologies`, sin email y con telefono

Aclaraciones de esta validacion:

- la prueba fue solo lectura
- no se ejecuto `PUT`
- no se modifico la base de datos
- no se toco `llxbx_societe`
- la prueba HTTP contra puerto `8080` no se considera valida para esta rama porque PM2 mantiene una instancia vieja levantada desde hace 7 dias y `/api/health` devuelve `conexión cerrada`

### Smoke test HTTP controlado

Se levantó una instancia temporal de la API en el puerto `18080`, sin tocar PM2 ni reiniciar la instancia productiva `prospectos-api-8080`.

Resultado:

- la API temporal inició correctamente
- se confirmó conexión primaria a `leadmaster`
- se confirmó conexión operativa a `iunaorg_dyd`
- `GET /api/health` devolvió `status=healthy`
- `GET /api/prospectos/staging/contactos-pendientes?limit=5` devolvió `success=true`
- la respuesta incluyó `pagination.total = 38`
- la muestra incluyó registros:
	- `prospecto_id 165` `Equipmine`
	- `prospecto_id 162` `Puentesgruaferro`
	- `prospecto_id 145` `Xjcsensor`
	- `prospecto_id 142` `Enausa`
	- `prospecto_id 141` `Fygtechnologies`
- la respuesta incluyó `pending_reasons`:
	- `sin_email`
	- `con_error_msg`
	- `con_telefono_sin_email`
	- `con_whatsapp_sin_email`

Aclaraciones de este smoke test:

- no se ejecutó `PUT`
- no se modificó la base
- no se tocó `llxbx_societe`
- no se reinició PM2 producción
- la instancia temporal fue apagada correctamente
- el puerto `18080` quedó libre al finalizar

### Smoke test HTTP posterior a estados de revisión manual

Se levantó una instancia temporal de la API en el puerto `18080`, sin tocar PM2 ni reiniciar `prospectos-api-8080`.

Resultado:

- `/api/health` devolvió `healthy`
- `GET /api/prospectos/staging/contactos-pendientes?limit=5` devolvió registros correctamente
- `pagination.total = 38`
- la respuesta incluyó `contacto_estado`
- la respuesta incluyó `contacto_validado_at`
- la respuesta incluyó `contacto_validado_note`
- los registros devueltos tenían `contacto_estado = pendiente`
- `contacto_validado_at = null`
- `contacto_validado_note = null`
- `pending_reasons` siguió funcionando correctamente

Aclaraciones de este smoke test:

- no se ejecutó `PUT`
- no se modificó la base de datos
- no se tocó `llxbx_societe`
- no se reinició PM2 producción
- la instancia temporal fue apagada correctamente
- el puerto `18080` quedó libre

### Prueba controlada de PUT sobre staging

Se ejecutó una única prueba controlada del endpoint:

`PUT /api/prospectos/staging/259/contacto-manual`

Caso usado:

- `stg id: 259`
- `prospecto_id: 145`
- `nom: Xjcsensor`

Backup previo:

- `/root/leadmaster-backups/manual-put-259-20260614-232305/la_stg_prospectos_id_259.sql`
- `/root/leadmaster-backups/manual-put-259-20260614-232305/la_stg_prospectos_contactos_stg_259.sql`

Payload aplicado:

- `contacto_estado = sin_email`
- `contacto_validado_note = Validación manual: no se encontró email en landing; se conservan teléfono y WhatsApp extraídos.`

Resultado:

- `PUT` devolvió `success=true`
- `updatedFields=[]`
- `contacto_estado` quedó en `sin_email`
- `contacto_validado_at` quedó informado
- `contacto_validado_note` quedó informado
- `email_extraido` permaneció `NULL`
- `telefono_extraido` permaneció sin cambios
- `whatsapp_extraido` permaneció sin cambios
- `la_stg_prospectos_contactos` no cambió
- `pagination.total` bajó de `38` a `37`
- el caso `id 259` salió del listado de pendientes
- no se tocó `llxbx_societe`
- no se tocó PM2 producción
- la API temporal fue usada en puerto `18080`
- la API temporal fue apagada correctamente
- el puerto `18080` quedó libre

Nota técnica:

- la terminal mostró caracteres acentuados como reemplazo visual
- `HEX(contacto_validado_note)` confirmó almacenamiento UTF-8 correcto

Decisión:

- se conserva la corrección porque representa un estado operativo válido

## Conclusiones

La base tecnica de backend queda lista para una UI futura de correccion manual:

- la funcionalidad nueva ya no depende de `DB_NAME=leadmaster`
- los endpoints de staging quedaron separados sobre `DOLIBARR_DB_*`
- no se tocaron `.env`, migraciones ni tablas finales de Dolibarr
- la API ya expone una superficie minima para listar pendientes y persistir correcciones manuales
- el backend ya fue validado también con una prueba controlada de `PUT` para cambio de estado manual sin corrección de email/teléfono/WhatsApp

## Proximos pasos

1. Definir el contrato final de payload/response que consumira la UI administrativa.
2. Implementar la UI administrativa para listar pendientes, editar contacto y marcar estados manuales.
3. Diseñar una fase posterior de exportación controlada hacia `llxbx_societe`, manteniendo esa tabla fuera de alcance hasta validación explícita.
