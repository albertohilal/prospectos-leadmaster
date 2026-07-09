# Informe — Migración de atribución de prospecto/evidencia en `ll_envios_email`

**Fecha:** 2026-07-09
**Bloque:** LM-003A-B — Brokers / productores / organizadores (vertical seguros)
**Base de datos:** `iunaorg_dyd`
**Tabla objetivo:** `ll_envios_email`
**Canal de ejecución:** MySQL Workbench (manual)
**Estado:** MIGRACIÓN EJECUTADA Y VERIFICADA — pendiente de push/deploy en sesión aparte

> **Alcance de ejecución:** migración aditiva de 4 columnas NULLABLE para persistir
> atribución de prospecto y evidencia desde el pipeline de prospección LeadMaster.
> No se agregó `campania_id` porque la tabla ya referencia campaña mediante
> `campania_email_id` (bigint, indexado). No se crearon FK físicas ni índices UNIQUE.
> No hubo push, deploy, rollback ni modificación de datos existentes.

---

## Propósito

Documentar la ejecución manual en MySQL Workbench de la migración aditiva
`config/migration_add_campaign_attribution_to_ll_envios_email.sql`, que agrega a
`ll_envios_email` columnas para cerrar la trazabilidad entre envíos de email
(Dolibarr CRM) y prospectos capturados (`la_prospectos`).

---

## Archivo de migración

`config/migration_add_campaign_attribution_to_ll_envios_email.sql`

Columnas agregadas (todas NULLABLE, referencia lógica sin FK):

- `prospecto_id` `INT NULL` — FK lógica → `la_prospectos.id`
- `origen_prospecto` `VARCHAR(100) NULL` — mecanismo de identificación del prospecto
- `url_landing_hash` `CHAR(64) NULL` — hash SHA-256 del landing URL
- `metadata_atribucion` `LONGTEXT NULL` — JSON serializado en aplicación

No se agregó `campania_id`. La tabla ya referencia campaña mediante
`campania_email_id` (bigint, indexado) → `ll_campanias_email.id` (bigint).

---

## Registro de ejecución (Workbench)

> Ejecución manual por Alberto Hilal en MySQL Workbench.

- **Fecha/hora de ejecución:** 2026-07-09
- **Base de datos:** `iunaorg_dyd`
- **Tabla:** `ll_envios_email`

### Pre-checks

- **`SHOW CREATE TABLE ll_envios_email`:** ejecutado. Tabla existente.
  - `id` = `bigint(20)`
  - `campania_email_id` = `bigint(20)`, existe e indexada.
- **Tipos de referencia verificados:**
  - `ll_campanias_email.id` = `bigint(20)`
  - `la_prospectos.id` = `int(11)`
- **Confirmación de ausencia de columnas:** ejecutada. Antes de la migración no existían
  `prospecto_id`, `origen_prospecto`, `url_landing_hash` ni `metadata_atribucion`.
- **`SELECT COUNT(*)` antes:** 181 filas.

### Ejecución

- **Script:** `config/migration_add_campaign_attribution_to_ll_envios_email.sql` corregida
  (sin `campania_id`, solo 4 columnas de prospecto/evidencia).
- **No se creó `campania_id`.** Se mantuvo `campania_email_id` como referencia existente de campaña.
- **No se crearon foreign keys físicas.**
- **No se crearon índices UNIQUE.**
- **No se ejecutó rollback.**

### Post-checks

- **`SELECT` de verificación final (4 columnas, `is_nullable = YES`):** correcto.

  | Columna | Tipo | NULLABLE | Ordinal |
  |---|---|---|---|
  | `prospecto_id` | `int(11)` | `YES` | 4 |
  | `origen_prospecto` | `varchar(100)` | `YES` | 5 |
  | `url_landing_hash` | `char(64)` | `YES` | 6 |
  | `metadata_atribucion` | `longtext` | `YES` | 7 |

- **`SELECT COUNT(*)` después:** 181 filas (sin cambios; migración aditiva sin manipulación de datos).
- **Smoke check correcto:**
  ```sql
  SELECT id, campania_email_id, prospecto_id, origen_prospecto, url_landing_hash, metadata_atribucion
  FROM ll_envios_email
  LIMIT 1;
  ```
  Devolvió un registro existente con las 4 columnas nuevas en `NULL`.

### Confirmaciones negativas

- No se creó `campania_id`.
- `campania_email_id` se mantuvo como referencia existente de campaña.
- No se crearon FK físicas.
- No se crearon índices UNIQUE.
- No se ejecutó rollback.
- No hubo push ni deploy.

---

## Riesgo actual

**Bajo.** La migración fue exclusivamente aditiva (4 columnas NULLABLE), sin
transformación ni borrado de datos. Los 181 registros existentes conservan sus
datos intactos con las nuevas columnas en `NULL`.

---

## Próximo paso

Sesión aparte para:
- Backend: implementar persistencia de `prospecto_id`, `origen_prospecto`,
  `url_landing_hash` y `metadata_atribucion` en `ll_envios_email`.
- Push controlado del commit correspondiente y deploy del `server.js`.

---

## Referencias

- `config/migration_add_campaign_attribution_to_ll_envios_email.sql`
- `docs/05-REPORTES/2026-07/SEED-KEYWORDS-SEGUROS-LM-003A-B-2026-07-04.md`
- `docs/reportes/auto-2026-06-28-remediacion-cliente-id-staging-leadmaster.md`
