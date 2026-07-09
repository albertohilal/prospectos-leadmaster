# Plan — Migración controlada de columnas de primera aparición en `la_prospectos`

**Fecha:** 2026-07-08
**Bloque:** LM-003A-B — Brokers / productores / organizadores (vertical seguros)
**Base de datos:** `iunaorg_dyd`
**Tabla objetivo:** `la_prospectos`
**Canal de ejecución acordado:** MySQL Workbench (manual)
**Estado:** MIGRACIÓN EJECUTADA Y VERIFICADA — pendiente de sesión aparte para push/deploy

> **Aclaración de aprobación:** aprobado solo para ejecutar manualmente en Workbench la
> migración aditiva. Alcance: pre-checks read-only, migración de columnas, verificación de
> las 4 columnas, registro del resultado en este informe.
> Restricciones vigentes: no tocar índices, no deduplicar, no migrar el UNIQUE, no push,
> no deploy, no modificar código, no scraping.
> Rollback: el `DROP COLUMN` documentado solo es seguro **antes** de que el `server.js`
> desplegado escriba datos reales en esas columnas. No se crea archivo SQL de rollback.

---

## Propósito

Definir un procedimiento seguro para ejecutar **solamente** la migración aditiva
`config/migration_add_geo_first_appearance_la_prospectos.sql`, que agrega a
`la_prospectos` cuatro columnas NULLABLE de primera aparición:

- `keyword_base`
- `localidad_busqueda`
- `geo_keyword_id_first`
- `geo_key_first`

La migración debe ejecutarse **antes** de cualquier push o deploy del `server.js`
actualizado en el commit local `e7b6c9d`.

No se planifica en esta sesión la migración destructiva del índice
`UNIQUE(palabra_clave, url_landing_hash)` a unicidad por landing: esa decisión
queda **gated aparte**.

---

## Contexto (estado del proyecto al inicio)

- Rama `main`, árbol de trabajo limpio.
- `main` adelantada a `origin/main` por 1 commit (sin push).
- Commit local relevante: `e7b6c9d feat: registrar primera aparicion de prospectos por landing`.
- No se hizo push.
- No se hizo deploy.
- No se ejecutó la migración.
- ADR vigente: `docs/02-ARQUITECTURA/ADR-2026-07-08-identidad-prospecto-por-landing.md`
  (estado: accepted — aprobado por ChatGPT; migración DB gated).
- Glosario `CONTEXT.md` ya incluye "Primera aparición", "Keyword base",
  "Localidad de búsqueda", "Modificador geográfico" y "Query completa".

---

## Resumen de la entrevista

| Pregunta | Respuesta del usuario |
|---|---|
| ¿Objetivo de la sesión? | Preparar el plan controlado para ejecutar solo la migración de columnas de primera aparición, antes de cualquier push/deploy del `server.js`. No planificar la migración del índice UNIQUE (gated aparte). |
| ¿Canal de ejecución? | MySQL Workbench (manual). |
| ¿Tratamiento del rollback? | Solo documentar el rollback en el informe; no crear archivo SQL de rollback. |

Restricciones fijadas por el usuario: no ejecutar SQL todavía, no push, no deploy,
no tocar índices, no deduplicar datos, no migrar el UNIQUE a unicidad por landing,
no modificar código ni scripts, generar informe Markdown, estado pendiente de
aprobación por ChatGPT.

---

## Regla confirmada

- Migración **aditiva** de 4 columnas NULLABLE en `la_prospectos`.
- **No** se modifica el índice `uq_prospectos_keyword_url_hash`.
- **No** se deduplican filas existentes.
- Orden obligatorio: **migración → verificación → (sesión aparte) push/deploy**.
- Canal: MySQL Workbench manual.
- Rollback: solo documentado (no archivo SQL).

---

## Archivos revisados

- `AGENTS.md`
- `docs/00-INDEX/DOCUMENTATION_RULES.md`
- `CONTEXT.md`
- `docs/02-ARQUITECTURA/ADR-2026-07-08-identidad-prospecto-por-landing.md`
- `config/migration_add_geo_first_appearance_la_prospectos.sql`
- `src/api/server.js` (diff del commit `e7b6c9d`)
- `package.json` (sección `scripts`)
- `scripts/` (no existe runner de migraciones SQL)
- `.env` (credenciales y `DB_NAME=iunaorg_dyd`)

---

## Hallazgos

1. **Dependencia crítica de orden.** `src/api/server.js` (commit `e7b6c9d`) ya
   ejecuta:

   ```sql
   INSERT INTO la_prospectos
   (palabra_clave, keyword_base, localidad_busqueda, geo_keyword_id_first, geo_key_first, url_anuncio, url_landing, texto_extraido, metadata)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
   ```

   Si el deploy del `server.js` ocurre **antes** de la migración, cada INSERT
   fallará con "Unknown column". Por eso la migración debe ir primero.

2. **La migración es idempotente y de bajo riesgo.** Cada `ADD COLUMN` está
   condicionado a que la columna no exista (`information_schema.columns`). Las 4
   columnas son NULLABLE, por lo que no rompen el flujo actual ni requieren
   backfill.

3. **No hay runner de migraciones en el repo.** Los `.sql` se ejecutan
   manualmente. El archivo usa `USE`, `SET @var`, `PREPARE/EXECUTE`
   (multi-statement), compatible con MySQL Workbench o el cliente `mysql` CLI,
   pero no con `mysql2.execute()`.

4. **La migración trae su propia verificación.** El `SELECT` final (líneas
   138-151) devuelve las 4 columnas con su `column_type` e `is_nullable`.

5. **El archivo declara esquema real verificado** con `SHOW CREATE TABLE
   la_prospectos` el 2026-07-08 (índice único actual:
   `uq_prospectos_keyword_url_hash (palabra_clave, url_landing_hash)`).

6. **DB productiva compartida.** El host es `sv46.byethost46.org` (hosting
   compartido), sin entorno de staging separado.

---

## Archivos afectados

- **Esquema de la tabla `la_prospectos`** (solo al ejecutar, tras aprobación).
- Ningún archivo del repositorio se modifica al ejecutar la migración.

---

## Archivos a crear o actualizar

| Archivo | Propósito |
|---|---|
| `docs/05-REPORTES/2026-07/2026-07-08-lm-grill-plan-migracion-columnas-primera-aparicion.md` | Este informe (plan pendiente de aprobación). |

No se crea archivo SQL de rollback (decisión de la entrevista).

---

## Procedimiento propuesto (ejecución en Workbench, SOLO tras aprobación)

1. **Pre-check (solo lectura), AGENTS.md regla 7:**
   ```sql
   SHOW CREATE TABLE la_prospectos;
   SELECT COUNT(*) AS total_filas FROM la_prospectos;
   ```
   Confirmar esquema real y tamaño de la tabla.

2. **Confirmar ausencia de columnas (solo lectura):**
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_schema = 'iunaorg_dyd'
     AND table_name = 'la_prospectos'
     AND column_name IN ('keyword_base','localidad_busqueda','geo_keyword_id_first','geo_key_first');
   ```
   Debe devolver 0 filas (o solo las que ya existieran; la migración es idempotente).

3. **Ejecutar la migración completa:**
   `config/migration_add_geo_first_appearance_la_prospectos.sql`.

4. **Verificación integrada:** el `SELECT` final del script debe devolver las 4
   columnas con `is_nullable = YES`.

5. **Smoke check (solo lectura):**
   ```sql
   SELECT id, keyword_base, localidad_busqueda, geo_keyword_id_first, geo_key_first
   FROM la_prospectos
   LIMIT 1;
   ```

6. **Registrar resultado** en este informe (marcar migración como ejecutada,
   con fecha/hora).

7. **Recién después (sesión aparte y gated):** push del commit `e7b6c9d` y deploy
   del `server.js`. Fuera del alcance de esta sesión.

---

## Rollback documentado (solo si fuese necesario)

La migración es aditiva; el rollback elimina las 4 columnas. No hay pérdida de
datos productivos porque el deploy aún no ocurrió y las columnas son nuevas y
nullable.

```sql
ALTER TABLE la_prospectos
  DROP COLUMN geo_key_first,
  DROP COLUMN geo_keyword_id_first,
  DROP COLUMN localidad_busqueda,
  DROP COLUMN keyword_base;
```

---

## Decisiones tomadas

- Ejecutar solo la migración aditiva de columnas (no el índice UNIQUE).
- Canal: MySQL Workbench manual.
- Rollback documentado en el informe, sin archivo SQL.
- Orden fijo: migración antes de push/deploy.

## Decisiones pendientes

- Ventana horaria de ejecución de la migración — la define Alberto Hilal.
- Timing del push/deploy de `server.js` posterior — sesión aparte, gated.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Deploy del `server.js` antes de migrar → todos los INSERT fallan ("Unknown column"). | Orden obligatorio fijado; push/deploy es sesión gated posterior a la verificación. |
| ALTER sobre tabla productiva (posible lock). | Columnas aditivas y nullable, operación breve; ejecutar en ventana de baja actividad. |
| Esquema real distinto al documentado en el archivo. | Pre-check `SHOW CREATE TABLE la_prospectos` obligatorio antes del ALTER (AGENTS.md regla 7). |
| Re-ejecución accidental del script. | Migración idempotente: cada `ADD COLUMN` condicionado a no-existencia. |
| Ejecución en la DB equivocada. | El script fuerza `USE iunaorg_dyd;` y usa `DATABASE()` en las verificaciones. |

---

## Plan de implementación (pasos en orden)

1. Aprobación de ChatGPT (frase exacta: `Plan aprobado por ChatGPT`).
2. Pre-check de esquema y conteo (solo lectura).
3. Confirmar ausencia de columnas.
4. Ejecutar la migración en Workbench.
5. Verificar con el `SELECT` final + smoke check.
6. Registrar resultado en este informe.
7. (Sesión aparte) push/deploy del `server.js`.

---

## Checklist para aprobación por ChatGPT

- [ ] La migración es solo aditiva (4 columnas NULLABLE).
- [ ] No toca el índice `uq_prospectos_keyword_url_hash`.
- [ ] No deduplica ni modifica datos existentes.
- [ ] Orden migración → verificación → push/deploy respetado.
- [ ] Canal Workbench manual confirmado.
- [ ] Pre-check `SHOW CREATE TABLE` incluido (regla 7).
- [ ] Rollback documentado.
- [ ] No se modifica código ni scripts en esta etapa.

---

> **Nota de trazabilidad:** las secciones de aprobación y checklist corresponden al estado previo a la ejecución manual. Se conservan como historial del plan original. El estado vigente del documento es el indicado en el encabezado y en el «Registro de ejecución (Workbench)»: migración ejecutada y verificada, sin push/deploy.

## Registro de ejecución (Workbench)

> Ejecución manual por Alberto Hilal en MySQL Workbench.

- **Fecha/hora de ejecución:** 2026-07-08 16:05:08
- **Base de datos:** `iunaorg_dyd`
- **Tabla:** `la_prospectos`
- **Resultado:**
  - **`SELECT COUNT(*)`:** 171 filas en la tabla antes y después de la migración (sin cambios).
  - **Columnas agregadas/verificadas:**
    - `keyword_base` — `varchar(255)` — `NULLABLE = YES`
    - `localidad_busqueda` — `varchar(150)` — `NULLABLE = YES`
    - `geo_keyword_id_first` — `int(11)` — `NULLABLE = YES`
    - `geo_key_first` — `varchar(180)` — `NULLABLE = YES`
  - **Todas las columnas quedaron `NULLABLE = YES`** (sin restricciones nuevas sobre datos existentes).
  - **Smoke check correcto:** `SELECT id, keyword_base, localidad_busqueda, geo_keyword_id_first, geo_key_first FROM la_prospectos LIMIT 1;` devolvió un registro existente con las 4 columnas nuevas en `NULL`.
- **No se ejecutó índice `UNIQUE`** (migración aditiva exclusivamente; la unicidad por landing queda gated aparte).
- **No se ejecutó rollback** (no fue necesario; migración exitosa sin incidencias).
- **No hubo push/deploy** (el push del commit `e7b6c9d` y el deploy del `server.js` quedan para sesión aparte y gated).

---

## Estado

```
Estado: MIGRACIÓN EJECUTADA Y VERIFICADA — pendiente de sesión aparte para push/deploy
```
