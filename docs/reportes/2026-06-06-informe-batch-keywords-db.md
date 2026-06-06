# Informe de Adecuacion de Batch de Keywords desde Base de Datos

Fecha: 2026-06-06  
Proyecto: LeadMaster  
Autor: Agente OpenClaw  
Estado: Borrador

---

## Resumen Ejecutivo

Se incorporo un nuevo flujo de ejecucion de keywords basado en la tabla MySQL `ll_keywords_leadmaster`, ubicada en la base operativa `iunaorg_dyd` de iFastNet, sin reemplazar ni modificar el flujo historico basado en `scripts/run-daily-batch.sh`.

El cambio permite consultar keywords activas desde base de datos, aplicar filtros operativos por origen o prioridad, ejecutar el scraper local por cada keyword seleccionada y actualizar los campos de seguimiento `veces_buscada` y `ultima_busqueda_at` solamente cuando la ejecucion real finaliza correctamente.

---

## 1. Objetivo

Adecuar la ejecucion de keywords para que el proyecto pueda usar la tabla `ll_keywords_leadmaster` como fuente operativa, manteniendo intacto el batch Bash existente y evitando cambios en el scraper local.

Objetivos concretos:

- Crear un script nuevo para ejecutar keywords desde MySQL.
- Usar exclusivamente variables `KEYWORDS_DB_*` para la conexion a `iunaorg_dyd`.
- Mantener separado el flujo de staging/prospectos que usa `DB_*`.
- Agregar un comando npm dedicado.
- Validar el comportamiento en modo `--dry-run` sin ejecutar busquedas reales.

---

## 2. Contexto

Hasta este ajuste, `scripts/run-daily-batch.sh` contenia un array Bash hardcodeado con 20 keywords iniciales. Ese flujo sigue siendo valido como mecanismo historico y de respaldo.

Posteriormente se creo en iFastNet la tabla:

```text
iunaorg_dyd.ll_keywords_leadmaster
```

La tabla contiene:

- 20 keywords iniciales con `estado='activa'` y `origen='lista_inicial'`.
- 30 keywords industriales con `estado='pendiente'` y `origen='linea_industrial'`.

Tambien se definio que la conexion para administrar keywords no debe usar las variables generales `DB_*`, sino un grupo independiente:

```text
KEYWORDS_DB_HOST
KEYWORDS_DB_PORT
KEYWORDS_DB_USER
KEYWORDS_DB_PASSWORD
KEYWORDS_DB_NAME
KEYWORDS_DB_TIMEZONE
```

---

## 3. Cambios Implementados

### 3.1 Script nuevo

Se creo el archivo:

```text
scripts/run-db-batch.js
```

Caracteristicas principales:

- Script Node.js con shebang `#!/usr/bin/env node`.
- Carga de entorno con `require('dotenv').config();`.
- Conexion MySQL mediante `mysql2/promise`.
- Ejecucion del scraper mediante `spawn` de `child_process`.
- Uso exclusivo de variables `KEYWORDS_DB_*`.
- Validacion inicial de variables requeridas.
- Soporte de argumentos operativos:
  - `--target N`
  - `--limit N`
  - `--origen VALOR`
  - `--prioridad VALOR`
  - `--manual`
  - `--dry-run`
  - `--help` / `-h`

### 3.2 Comando npm

Se agrego en `package.json` el script:

```json
"db:batch": "node scripts/run-db-batch.js"
```

No se modificaron ni eliminaron scripts existentes.

---

## 4. Consulta Operativa

El nuevo script consulta keywords activas desde:

```sql
SELECT id, keyword, sector, prioridad, origen, veces_buscada, ultima_busqueda_at
FROM ll_keywords_leadmaster
WHERE estado = 'activa'
```

Puede agregar filtros opcionales:

```sql
AND origen = ?
AND prioridad = ?
```

El orden operativo aplicado es:

```sql
ORDER BY
    FIELD(prioridad, 'alta', 'media', 'baja'),
    COALESCE(ultima_busqueda_at, '1970-01-01') ASC,
    id ASC
LIMIT ?
```

Este criterio prioriza keywords de mayor valor, evita repetir siempre las mismas y permite controlar el tamano del lote.

---

## 5. Ejecucion del Scraper

Por cada keyword encontrada, el script prepara el comando:

```bash
node ./src/local/scraper-local.js "<keyword>" --target <N>
```

Si se usa `--manual`, agrega:

```bash
--manual
```

La ejecucion real hereda la salida estandar del proceso hijo mediante:

```javascript
stdio: 'inherit'
```

Esto permite ver la interaccion y los mensajes del scraper local en la consola.

---

## 6. Actualizacion Posterior

Cuando el scraper termina con exit code `0`, el script actualiza la fila correspondiente:

```sql
UPDATE ll_keywords_leadmaster
SET
  veces_buscada = veces_buscada + 1,
  ultima_busqueda_at = NOW()
WHERE id = ?
```

En modo `--dry-run` no se ejecuta el scraper y no se actualiza la base de datos.

---

## 7. Validaciones Realizadas

Se valido la sintaxis del nuevo script con:

```bash
node --check scripts/run-db-batch.js
```

Resultado: sin errores.

Se verifico que el script nuevo no use directamente variables del grupo `DB_*`:

```bash
grep -nP 'process\.env\.(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)\b|DROP TABLE|DELETE FROM|\bDELETE\b|USE leadmaster' scripts/run-db-batch.js || true
```

Resultado: sin coincidencias.

Tambien se validaron problemas del editor sobre:

```text
scripts/run-db-batch.js
package.json
```

Resultado: sin errores reportados.

---

## 8. Pruebas en Modo Dry-run

Se ejecutaron pruebas solamente en modo `--dry-run`, sin busquedas reales y sin actualizaciones de base de datos:

```bash
node scripts/run-db-batch.js --dry-run --limit 5
node scripts/run-db-batch.js --dry-run --origen lista_inicial --limit 5
node scripts/run-db-batch.js --dry-run --prioridad alta --limit 5
```

Resultado observado:

- Conexion correcta contra `iunaorg_dyd`.
- Consulta correcta de la tabla `ll_keywords_leadmaster`.
- Recuperacion de 5 keywords en cada prueba.
- Impresion de comandos que se ejecutarian.
- Sin ejecucion real del scraper.
- Sin actualizacion de `veces_buscada` ni `ultima_busqueda_at`.

---

## 9. Archivos Afectados

Archivos modificados o creados por este ajuste:

```text
package.json
scripts/run-db-batch.js
```

Archivos que no se modificaron:

```text
scripts/run-daily-batch.sh
src/local/scraper-local.js
config/create_ll_keywords_leadmaster.sql
config/seed_ll_keywords_leadmaster_iniciales.sql
config/seed_ll_keywords_leadmaster_linea_industrial.sql
.env
```

---

## 10. Estado Git Observado

Estado luego de la implementacion:

```text
 M package.json
?? scripts/run-db-batch.js
```

No se realizo commit.

---

## 11. Conclusiones

El proyecto ahora cuenta con un camino nuevo para ejecutar keywords desde la base operativa `iunaorg_dyd.ll_keywords_leadmaster`, manteniendo el flujo anterior intacto.

La separacion de variables `KEYWORDS_DB_*` evita mezclar la base operativa de keywords con la base de staging/prospectos usada por otros scripts del proyecto.

El modo `--dry-run` quedo verificado como herramienta segura para revisar lotes antes de ejecutar busquedas reales.

---

## 12. Proximos Pasos

- Revisar el nuevo script en una pasada de codigo antes del primer uso real.
- Ejecutar una primera corrida real con `--limit 1` cuando se decida activar el flujo.
- Activar gradualmente keywords industriales en `ll_keywords_leadmaster` cambiando `estado` de `pendiente` a `activa` desde el plano operativo correspondiente.
- Documentar el comando definitivo de operacion diaria cuando el flujo DB reemplace al batch hardcodeado.

---

## 13. Referencias

- `scripts/run-db-batch.js`
- `scripts/run-daily-batch.sh`
- `src/local/scraper-local.js`
- `package.json`
- `config/create_ll_keywords_leadmaster.sql`
- `config/seed_ll_keywords_leadmaster_iniciales.sql`
- `config/seed_ll_keywords_leadmaster_linea_industrial.sql`
- `docs/REGLAS-INFORMES.md`
