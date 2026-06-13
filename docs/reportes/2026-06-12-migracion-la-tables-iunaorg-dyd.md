# Informe de migracion de tablas la_ a iunaorg_dyd

Fecha: 12 de junio de 2026
Proyecto: LeadMaster
Autor: Agente OpenClaw
Estado: Revisado

## Resumen ejecutivo

Se actualizo la configuracion activa del flujo de scraping y staging para operar sobre la base `iunaorg_dyd` y las tablas `la_prospectos`, `la_stg_prospectos` y `la_stg_prospectos_contactos`. El diagnostico confirmo que el problema de conexion no estaba en MySQL remoto ni en las tablas importadas, sino en dos causas combinadas: `DB_HOST=127.0.0.1` en `.env` y variables exportadas viejas en la shell que `dotenv` no sobreescribia por defecto. Se corrigio el host, se normalizo la carga de entorno con `override: true`, se reemplazaron scripts shell por scripts Node con `dotenv` y se completaron las validaciones conservadoras previstas, todas sin escrituras reales en base de datos.

## Contexto

La base activa para scraping dejo de ser `leadmaster`. Las tablas importadas y validadas para este flujo quedaron en el esquema `iunaorg_dyd`, con prefijo `la_` para distinguir el alcance operativo de LeadMaster dentro del esquema compartido.

El objetivo operativo fue dejar todos los scripts activos apuntando al mismo origen de verdad para conexion y tablas, sin tocar nombres funcionales del sistema ni superficies publicas como `/api/prospectos`.

## Decision aplicada

Se adopta `iunaorg_dyd` como base activa para scraping y staging.

Las tablas operativas de este flujo pasan a ser:

- `iunaorg_dyd.la_prospectos`
- `iunaorg_dyd.la_stg_prospectos`
- `iunaorg_dyd.la_stg_prospectos_contactos`

El prefijo `la_` se conserva como convencion de separacion funcional dentro del esquema de destino.

## Objetivo del ajuste

El trabajo se enfoco en cuatro metas concretas:

1. Unificar la configuracion activa de conexion MySQL para que scripts Node, API y comandos de validacion lean la misma fuente de entorno.
2. Sustituir referencias SQL activas a tablas sin prefijo por sus equivalentes `la_`.
3. Evitar dependencia de expansion de variables shell en `package.json`, usando scripts Node con `dotenv`.
4. Mantener el ajuste en modo conservador, sin escrituras reales fuera de los `dry-run` y sin tocar `llxbx_societe`.

## Conteos validados

- `la_prospectos`: 171
- `la_stg_prospectos`: 170
- `la_stg_prospectos_contactos`: 283

## Alcance tecnico

Se cambiaron solo referencias SQL activas:

- `prospectos` -> `la_prospectos`
- `stg_prospectos` -> `la_stg_prospectos`
- `stg_prospectos_contactos` -> `la_stg_prospectos_contactos`

No se modificaron endpoints publicos ni nombres funcionales. La ruta `/api/prospectos` permanece igual.

Tampoco se cambiaron nombres de funciones, payloads, variables de dominio ni rutas REST ya consumidas por otros componentes.

## Archivos modificados

- `.env`
- `src/shared/config.js`
- `src/api/server.js`
- `src/scraper/leadmaster_scraper.js`
- `scripts/db-status.js`
- `scripts/db-view.js`
- `scripts/diagnose-db-connection.js`
- `scripts/sync-stg-prospectos.js`
- `scripts/enrich-stg-nom-from-landing.js`
- `scripts/enrich-stg-contact-from-landing.js`
- `package.json`
- `config/create_table.sql`
- `config/migration_add_nom_stg.sql`
- `config/migration_add_phone_whatsapp_stg.sql`
- `config/migration_add_url_landing_hash.sql`
- `config/migration_dedupe_keyword_url.sql`
- `config/migration_normalize_stg_url_landing.sql`

## Desarrollo detallado

### 1. Situacion inicial observada

El comportamiento reportado era inconsistente:

- MySQL Workbench confirmaba acceso al esquema `iunaorg_dyd` y presencia de tablas `la_`.
- Los comandos ejecutados en terminal seguian intentando conectar contra `127.0.0.1:3306`.
- Algunos procesos Node veian valores distintos segun el estado previo de la shell.

Esto indicaba que el problema no estaba necesariamente en la base remota, sino en la forma en que el entorno de ejecucion resolvia `DB_HOST`.

### 2. Verificacion de configuracion sin exponer secretos

Se inspeccionaron de forma controlada las variables no sensibles:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_NAME`
- `KEYWORDS_DB_HOST`
- `KEYWORDS_DB_PORT`
- `KEYWORDS_DB_USER`
- `KEYWORDS_DB_NAME`

Resultado del analisis:

- `DB_HOST` apuntaba inicialmente a `127.0.0.1`.
- `KEYWORDS_DB_HOST` apuntaba al host remoto correcto.
- `DB_NAME` y `KEYWORDS_DB_NAME` coincidían en `iunaorg_dyd`.
- El usuario activo ya no era `leadmaster_user`, sino el usuario operativo de `iunaorg_dyd`.

### 3. Prueba discriminante clave

La validacion decisiva fue ejecutar una prueba de conexion temporal reemplazando solo el host:

```bash
set -a
source .env
export DB_HOST="$KEYWORDS_DB_HOST"
set +a
mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" -D "$DB_NAME" -e "SELECT DATABASE(); SHOW TABLES LIKE 'la_%';"
```

Ese experimento conecto correctamente a `iunaorg_dyd` y devolvio las tres tablas esperadas. Con eso se descarto que el problema fuera ausencia de tablas o falla del servidor remoto y se confirmo que el host local era la causa inmediata.

### 4. Segunda causa detectada: shell contaminada

Luego de corregir `.env`, persistio un comportamiento inconsistente en algunos procesos Node. La causa fue que la shell ya tenia variables exportadas viejas de pruebas anteriores. Como `dotenv` no sobreescribe por defecto variables ya existentes en `process.env`, algunos scripts seguian heredando `DB_HOST=127.0.0.1` aunque el archivo `.env` ya estuviera corregido.

Ese detalle explico la aparente contradiccion entre:

- el contenido del archivo `.env`,
- la terminal actual,
- y el valor que resolvia `dotenv` dentro de Node.

### 5. Correcciones implementadas

Se aplicaron las siguientes correcciones de raiz:

#### 5.1 `.env`

- `DB_HOST` se alineo con el host remoto validado.
- Se mantuvo `DB_NAME=iunaorg_dyd`.
- No se imprimieron passwords en el proceso de diagnostico ni en este informe.

#### 5.2 Carga de entorno en Node

Se cambio la inicializacion de `dotenv` para usar:

```js
require('dotenv').config({ override: true });
```

Esto fuerza que el valor vigente del archivo `.env` tenga prioridad sobre variables heredadas de una shell previamente contaminada.

#### 5.3 Scripts de `package.json`

Se reemplazaron scripts basados en shell y expansion de variables por scripts Node:

- `db:status`
- `db:view`
- `db:diagnose`

Con esto se evitan diferencias entre:

- shells con o sin `source .env`,
- expansión POSIX,
- variables residuales exportadas manualmente.

#### 5.4 Scripts activos

Se unifico el patrón de conexion para que los scripts activos usen:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

con fallback secundario hacia variables `KEYWORDS_DB_*` solo como respaldo operativo, no como configuracion primaria.

## Matriz de validacion

| Validacion | Objetivo | Resultado | Observacion |
| --- | --- | --- | --- |
| `npm run db:diagnose` | Confirmar host, base, tablas y conteos | OK | Reejecutado forzando host, puerto, usuario y base correctos; detecto `iunaorg_dyd`, 3 tablas `la_` y conteos esperados |
| `npm run db:status` | Verificar lectura simple de `la_prospectos` | OK | Total `171` |
| `npm run db:view` | Verificar lectura de muestra | OK | Ultimas 10 filas leidas correctamente |
| `node scripts/sync-stg-prospectos.js --dry-run` | Validar lectura de origen y logica sin escrituras | OK | `171` prospectos origen, `1` omitido |
| `node scripts/enrich-stg-nom-from-landing.js --dry-run --limit 10` | Validar acceso a stage para enriquecimiento nominal | OK | Sin candidatos pendientes en la muestra |
| `node scripts/enrich-stg-contact-from-landing.js --dry-run --limit 10` | Validar acceso y parseo de contactos | OK | 5 filas efectivas procesadas sin escritura |

## Revalidacion puntual de conectividad MySQL

Se reejecuto `npm run db:diagnose` forzando explicitamente los valores correctos de conexion, sin imprimir ni registrar `DB_PASSWORD`:

```bash
DB_HOST=sv46.byethost46.org \
DB_PORT=3306 \
DB_USER=iunaorg_b3toh \
DB_NAME=iunaorg_dyd \
npm run db:diagnose
```

Resultado validado:

- Conexion MySQL OK.
- `DATABASE() = iunaorg_dyd`.
- Tablas detectadas:
	- `la_prospectos`
	- `la_stg_prospectos`
	- `la_stg_prospectos_contactos`
- Conteos confirmados:
	- `la_prospectos`: 171
	- `la_stg_prospectos`: 170
	- `la_stg_prospectos_contactos`: 283

Esta revalidacion corrige el bloqueo anterior por `ETIMEDOUT` y confirma que la conectividad MySQL remota funciona con los valores correctos de host, puerto, usuario y base.

La validacion funcional completa se cerro luego de reejecutar exitosamente los siguientes comandos operativos:

```bash
npm run db:status
npm run db:view
node scripts/sync-stg-prospectos.js --dry-run
node scripts/enrich-stg-nom-from-landing.js --dry-run --limit 10
node scripts/enrich-stg-contact-from-landing.js --dry-run --limit 10
```

Con esa ronda completada, el informe pasa a estado `Revisado`.

## Resultados observados por comando

### `npm run db:diagnose`

El diagnostico confirmo:

- `DB_HOST` correcto resuelto por Node.
- Conexion MySQL exitosa.
- `DATABASE() = iunaorg_dyd`.
- Tablas detectadas: `la_prospectos`, `la_stg_prospectos`, `la_stg_prospectos_contactos`.
- Conteos confirmados: `171`, `170`, `283`.
- Revalidacion posterior: el mismo resultado se confirmo forzando explicitamente `DB_HOST=sv46.byethost46.org`, `DB_PORT=3306`, `DB_USER=iunaorg_b3toh` y `DB_NAME=iunaorg_dyd`, sin exponer `DB_PASSWORD`.

### `npm run db:status`

La lectura de conteo sobre `la_prospectos` devolvio `171`, alineado con la validacion manual previa.

### `npm run db:view`

La consulta de muestra devolvio filas reales de `la_prospectos`, confirmando que el comando ya no apunta a `leadmaster` ni depende de un cliente shell con configuracion local previa.

### `sync-stg-prospectos --dry-run`

El script pudo abrir conexion, leer `171` prospectos y completar su flujo de simulacion sin escrituras. Se reporto un registro omitido por URL invalida o vacia, comportamiento consistente con su logica de saneamiento.

### `enrich-stg-nom-from-landing --dry-run --limit 10`

La muestra leida no presento filas candidatas pendientes para `nom`, por lo que el script completo correctamente sin actualizar registros.

### `enrich-stg-contact-from-landing --dry-run --limit 10`

El script leyo `10` registros, proceso `5` filas efectivas y no realizo persistencia por estar en `dry-run`. Esto valido tanto la conexion a stage como el flujo principal del enriquecimiento.

La salida documentada omite passwords y no conserva datos personales completos de contactos impresos en consola.

## Diagnostico de conexion

### Variables revisadas sin secretos

Se verificaron las siguientes variables sin imprimir passwords:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_NAME`
- `KEYWORDS_DB_HOST`
- `KEYWORDS_DB_PORT`
- `KEYWORDS_DB_USER`
- `KEYWORDS_DB_NAME`

Hallazgos:

- `.env` tenia `DB_HOST=127.0.0.1` mientras `KEYWORDS_DB_HOST` apuntaba al host real de la base activa.
- Al forzar temporalmente `DB_HOST=$KEYWORDS_DB_HOST`, la conexion a `iunaorg_dyd` funciono y las tablas `la_` aparecieron correctamente.
- Ademas existian sesiones de terminal con variables exportadas viejas; por eso algunos procesos Node seguian viendo `127.0.0.1` aun despues de corregir `.env`.

### Causa raiz confirmada

- A) `.env` cargaba, pero contenia un `DB_HOST` incorrecto para este flujo.
- B) Habia variables previas exportadas en la shell, y `dotenv` no las reemplazaba por defecto.
- C) `package.json` todavia tenia scripts shell dependientes de expansion de variables y arrastraba fallbacks heredados.
- D) `src/scraper/leadmaster_scraper.js` conservaba configuracion hardcodeada vieja.
- E) MySQL remoto estaba accesible; el fallo no era del servidor ni de las tablas importadas.

### Correcciones aplicadas

- Se actualizo `.env` para usar el host real validado en MySQL remoto.
- Se agrego `require('dotenv').config({ override: true })` en los scripts activos y de diagnostico para priorizar `.env` sobre variables de shell heredadas.
- Se reemplazaron `db:status` y `db:view` por scripts Node que cargan `dotenv` y ya no dependen de expansion de shell.
- Se agrego `db:diagnose` mediante `scripts/diagnose-db-connection.js`.
- Se elimino el uso activo de fallbacks heredados como `leadmaster_user` y `leadmaster` en los scripts modificados.

### Diagnostico final

El incidente queda clasificado de la siguiente manera:

- A) `.env` no cargado: descartado.
- B) `DB_HOST` incorrecto en `.env`: confirmado.
- C) `package.json` con fallbacks viejos: confirmado en estado inicial y corregido.
- D) usuario viejo `leadmaster_user`: detectado solo en fallbacks heredados, no en la configuracion final activa.
- E) MySQL no accesible desde terminal: descartado para el host remoto correcto.
- F) necesidad de host diferente o tunel: confirmado que hacia falta usar el host remoto correcto; no fue necesario tunel adicional en esta validacion.

### Barrido de referencias residuales

- Código activo: quedan solo fallbacks defensivos a `127.0.0.1` como ultimo recurso local, y una `API_URL` local en configuracion compartida que no afecta la conexion MySQL.
- `package.json`: sin referencias residuales a `leadmaster_user`, `leadmaster` ni `USE leadmaster` en scripts activos.
- `config SQL`: sin referencias residuales activas a `USE leadmaster`.
- Documentacion historica: permanecen referencias viejas en guias e informes anteriores, sin impacto operativo.
- Dumps y auxiliares: no se detectaron coincidencias en el barrido ejecutado.

## Pruebas realizadas

Se ejecutaron los siguientes comandos de validacion conservadora:

```bash
npm run db:status
npm run db:view
node scripts/sync-stg-prospectos.js --dry-run
node scripts/enrich-stg-nom-from-landing.js --dry-run --limit 10
node scripts/enrich-stg-contact-from-landing.js --dry-run --limit 10
```

Resultado observado:

- `npm run db:diagnose`: OK. Conexion MySQL correcta, `DATABASE() = iunaorg_dyd`, tablas `la_` detectadas y conteos esperados confirmados.
- `npm run db:status`: OK. `la_prospectos = 171`.
- `npm run db:view`: OK. Lectura de las ultimas 10 filas de `la_prospectos`.
- `node scripts/sync-stg-prospectos.js --dry-run`: OK. `Prospectos origen: 171`, `Insertados: 0`, `Actualizados: 0`, `Omitidos por URL inválida/vacía: 1`, sin escrituras.
- `node scripts/enrich-stg-nom-from-landing.js --dry-run --limit 10`: OK. `Filas candidatas: 0`, `Actualizados: 0`, `Requests web ejecutados: 0`, modo `dry-run`.
- `node scripts/enrich-stg-contact-from-landing.js --dry-run --limit 10`: OK. `Registros leídos: 10`, `En cola efectiva: 5`, `Procesados OK: 5`, `Con actualización de datos: 0`, `Con error fetch/parse: 0`, modo `dry-run`.
- No se realizaron escrituras reales durante la validacion.
- Se mantuvo `cleanup=off` y `dry-run=true` en los flujos conservadores aplicables.
- No se toco `llxbx_societe`.
- La revision estatica de los archivos modificados no reporto errores.

## Consideraciones operativas

### Sobre `127.0.0.1` y `localhost`

Las referencias residuales a `127.0.0.1` o `localhost` en codigo activo quedaron solo como fallback defensivo de ultimo recurso. No participan en la configuracion normal mientras `.env` contenga valores correctos y los procesos Node carguen `dotenv` con `override: true`.

### Sobre terminales ya abiertas

Una shell abierta antes del cambio puede conservar variables exportadas viejas. En ese escenario pueden aparecer sintomas contradictorios entre:

- el contenido actual de `.env`,
- un `echo $DB_HOST` en la terminal,
- y el comportamiento de un proceso ya lanzado.

La resolucion recomendada es abrir una terminal nueva o confiar en los scripts Node del repo, que ahora fuerzan la prioridad del archivo `.env`.

### Sobre seguridad de credenciales

Durante el diagnostico se evitaron impresiones de passwords en logs, scripts de informe y salidas documentadas. Las validaciones mostradas en el informe exponen solo host, puerto, usuario y nombre de base cuando fue necesario para diagnosticar.

## Restricciones mantenidas

- No se toco `llxbx_societe`.
- No se borraron tablas.
- No se uso `DROP`, `TRUNCATE` ni `DELETE` como parte de la ejecucion de validacion.
- No se cambiaron endpoints publicos.
- No se hizo reemplazo global ciego sobre el repo.

## Conclusiones

La migracion de referencias activas quedo aplicada a nivel de codigo y scripts de configuracion. El ajuste respeta la separacion entre nombres de tablas SQL y nombres funcionales del sistema. El problema de conexion quedo explicado y resuelto: no era una ausencia de tablas ni una falla de MySQL remoto, sino una combinacion de `DB_HOST` incorrecto en `.env` y contaminacion del entorno de shell.

La solucion final no solo corrige el host actual, sino que reduce la probabilidad de reincidencia porque elimina dependencia de expansion shell en `package.json`, homogeneiza la carga de entorno y deja un comando de diagnostico dedicado para futuras verificaciones.

La revalidacion puntual de `db:diagnose` con valores de conexion forzados confirmo conectividad remota correcta, y la ronda completa de comandos de lectura y `dry-run` quedo completada exitosamente. En consecuencia, la migracion queda revisada bajo criterios conservadores y sin escrituras reales.

## Proximos pasos

1. Mantener `db:diagnose` como chequeo previo cuando se cambie `.env` o se trabaje desde una shell con variables exportadas.
2. Si reaparece un valor viejo en terminal, abrir una shell nueva o relanzar los scripts Node que ahora usan `override: true`.
3. Revisar documentacion historica solo cuando haga falta actualizar guias operativas, sin reescribir reportes anteriores.

## Metadata

- Palabras clave: migracion, iunaorg_dyd, la_prospectos, la_stg_prospectos, dry-run
- Referencias: `docs/REGLAS-INFORMES.md`
- Tipo de documento: informe analitico y diagnostico tecnico
