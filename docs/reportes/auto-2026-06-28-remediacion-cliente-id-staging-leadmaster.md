# Remediación Completa: cliente_id Incorrecto en Staging de LeadMaster

**Fecha:** 2026-06-28
**Proyecto:** LeadMaster
**Autor:** Agente OpenCode
**Estado:** Revisado

---

## 📋 Resumen Ejecutivo

Se detectó que `la_stg_prospectos` contenía registros con `cliente_id = 52`, cuando por trazabilidad real de campañas email esos registros pertenecían al `cliente_id = 1268`. La causa fue un default peligroso en `scripts/sync-stg-prospectos.js`. La remediación se ejecutó en dos capas: corrección preventiva del código (origen) y corrección histórica de datos (producción).

**Resultado:** problema corregido en origen y en datos. A partir del PR #2 el script ya no puede escribir `cliente_id = 52` por omisión silenciosa. Los 98 registros históricos fueron corregidos en `la_stg_prospectos`.

---

## 1. Problema Original

`iunaorg_dyd.la_stg_prospectos` tenía registros con `cliente_id = 52` que, por trazabilidad real de campañas email, pertenecían al `cliente_id = 1268` (usuario `leadmaster`, campaña LM-002).

Esto provocaba que prospectos legítimos del cliente 1268 aparecieran asociados a un `cliente_id` incorrecto, rompiendo la trazabilidad de campañas y la segmentación por cliente en etapas posteriores del pipeline (enriquecimiento, exportación a Dolibarr).

## 2. Causa Técnica

El script `scripts/sync-stg-prospectos.js` del repositorio `prospectos-leadmaster` usaba un default peligroso:

```javascript
const clienteId = Number(process.env.STG_CLIENTE_ID || 52);
```

Esto permitía escribir `cliente_id = 52` de forma silenciosa si `STG_CLIENTE_ID` no estaba definido en `.env`. El valor `52` era un residuo de una configuración anterior que ya no correspondía a la campaña activa.

## 3. Corrección del Script (Capa Preventiva)

**Repo:** `prospectos-leadmaster`
**PR:** [#2](https://github.com/albertohilal/prospectos-leadmaster/pull/2) — `fix: require explicit cliente id for stg sync`
**Archivo corregido:** `scripts/sync-stg-prospectos.js`
**Commit:** `84ff81f`

### Cambios aplicados

| Cambio | Descripción |
|--------|-------------|
| Eliminación del default `52` | Se quitó `\|\| 52` de la línea `process.env.STG_CLIENTE_ID \|\| 52` |
| `--cliente-id <N>` | Nuevo argumento CLI con máxima prioridad |
| `STG_CLIENTE_ID` como fallback | Se mantiene la variable de entorno como segunda opción |
| Aborto si falta | Si no hay `cliente_id` por CLI ni `.env`, el script aborta con error claro antes de conectar a DB |
| Validación estricta | Solo se aceptan enteros positivos mayores que cero (`/^[1-9]\d*$/`) |
| `--prospecto-from` / `--prospecto-to` | Rango opcional para filtrar prospectos origen |
| Sin reescritura de `cliente_id` | El `ON DUPLICATE KEY UPDATE` no incluye `cliente_id = VALUES(cliente_id)`, por lo que registros existentes no son reasignados |

### Uso correcto

```bash
# Con CLI (recomendado)
node scripts/sync-stg-prospectos.js --cliente-id 1268 --dry-run

# Con variable de entorno
STG_CLIENTE_ID=1268 node scripts/sync-stg-prospectos.js --dry-run

# Con rango de prospectos
node scripts/sync-stg-prospectos.js --cliente-id 1268 --prospecto-from 100 --prospecto-to 200 --dry-run
```

## 4. Auditoría de Otros Scripts

Se revisaron todos los scripts, archivos SQL y módulos que escriben o podrían escribir en `la_stg_prospectos` y `la_stg_prospectos_contactos`.

### Resultado

**No se encontraron otros scripts activos que escriban `cliente_id = 52`.**

### Hallazgo secundario

`scripts/enrich-stg-contact-from-landing.js` tiene una función de limpieza (`cleanupInvalidStageRows`) que ejecuta `DELETE FROM la_stg_prospectos` y `DELETE FROM la_stg_prospectos_contactos`. Actualmente está deshabilitada por defecto (línea 660), pero si se reactivara, debería tener scope por `cliente_id` antes de ejecutarse para evitar borrar registros de otros clientes.

| Archivo | Riesgo | Estado |
|---------|--------|--------|
| `scripts/sync-stg-prospectos.js` | BAJO | Ya corregido (PR #2) |
| `scripts/enrich-stg-contact-from-landing.js` | MEDIO | Limpieza deshabilitada; requiere filtro por cliente_id si se reactiva |
| `scripts/enrich-stg-nom-from-landing.js` | BAJO | Solo toca `nom`; no afecta `cliente_id` |
| `config/migration_normalize_stg_url_landing.sql` | BAJO | Migración ya ejecutada |
| `config/migration_add_phone_whatsapp_stg.sql` | NULO | Solo DDL |
| `config/migration_add_nom_stg.sql` | NULO | Solo DDL |
| `scripts/diagnose-db-connection.js` | NULO | Solo lectura |

## 5. Corrección de Datos (Capa Histórica)

La corrección de datos se limitó exclusivamente a los registros de staging vinculados a campañas de email del cliente 1268. No se aplicó un UPDATE global sobre todos los registros con `cliente_id = 52`.

### Backup con scope controlado por campañas reales

Antes del UPDATE se creó una tabla de respaldo acotada por trazabilidad de campañas:

```sql
CREATE TABLE iunaorg_dyd.la_stg_prospectos_bak_20260628_cliente52_to_1268 AS
SELECT DISTINCT s.*
FROM iunaorg_dyd.la_stg_prospectos s
JOIN iunaorg_dyd.llxbx_societe so ON so.ref_ext = s.ref_ext
JOIN iunaorg_dyd.ll_envios_email e ON e.societe_id = so.rowid
JOIN iunaorg_dyd.ll_campanias_email c ON c.id = e.campania_email_id
WHERE s.cliente_id = 52
  AND c.cliente_id = 1268
  AND c.id IN (6, 8);
```

**Tabla de backup:** `la_stg_prospectos_bak_20260628_cliente52_to_1268`

El scope está trazado por:
- `la_stg_prospectos` → `llxbx_societe` (vía `ref_ext`)
- `llxbx_societe` → `ll_envios_email` (vía `societe_id`)
- `ll_envios_email` → `ll_campanias_email` (vía `campania_email_id`)
- Filtro final: campañas activas 6 y 8 del `cliente_id = 1268`

### UPDATE transaccional acotado por IDs del backup

```sql
START TRANSACTION;

UPDATE iunaorg_dyd.la_stg_prospectos
SET cliente_id = 1268,
    updated_at = CURRENT_TIMESTAMP
WHERE cliente_id = 52
  AND id IN (
    SELECT id
    FROM iunaorg_dyd.la_stg_prospectos_bak_20260628_cliente52_to_1268
  )
LIMIT 98;

SELECT ROW_COUNT() AS filas_actualizadas;

COMMIT;
```

El UPDATE usa `WHERE ... AND id IN (SELECT id FROM backup)` como doble seguro: solo afecta los registros que fueron respaldados y cuyo `cliente_id` aún es 52.

### Alcance

| Métrica | Valor |
|---------|-------|
| Tabla modificada | `iunaorg_dyd.la_stg_prospectos` |
| Tabla NO modificada | `iunaorg_dyd.la_stg_prospectos_contactos` (mantiene vínculo por `stg_prospecto_id`, IDs no fueron modificados) |
| Registros respaldados | 98 |
| Registros actualizados | 98 |
| Campañas de referencia | `ll_campanias_email.id` IN (6, 8) |
| `cliente_id` destino | 1268 |
| Base de datos | `iunaorg_dyd` |
| Host | `sv46.byethost46.org` |
| Transacción | Explícita (`START TRANSACTION` / `COMMIT`) |

## 6. Validaciones Finales

| Validación | Resultado |
|------------|-----------|
| `backup_rows` | 98 |
| `filas_actualizadas` | 98 |
| `corregidos_1268` | 98 |
| `siguen_52` | 0 |
| `pendientes_cliente_52` | 0 |
| `COMMIT` | Ejecutado correctamente |

**No quedan registros `cliente_id = 52` vinculados a campañas 6 y 8 del cliente 1268.**

### Consultas de verificación

```sql
-- Verificar que el backup contiene los 98 registros originales
SELECT COUNT(*) AS backup_rows
FROM iunaorg_dyd.la_stg_prospectos_bak_20260628_cliente52_to_1268;
-- Resultado: 98

-- Verificar que los registros del backup ya no tienen cliente_id = 52 en staging
SELECT COUNT(*) AS siguen_52
FROM iunaorg_dyd.la_stg_prospectos s
JOIN iunaorg_dyd.la_stg_prospectos_bak_20260628_cliente52_to_1268 b ON s.id = b.id
WHERE s.cliente_id = 52;
-- Resultado: 0

-- Verificar que los registros del backup ahora tienen cliente_id = 1268
SELECT COUNT(*) AS corregidos_1268
FROM iunaorg_dyd.la_stg_prospectos s
JOIN iunaorg_dyd.la_stg_prospectos_bak_20260628_cliente52_to_1268 b ON s.id = b.id
WHERE s.cliente_id = 1268;
-- Resultado: 98
```

Las validaciones `siguen_52` y `corregidos_1268` están basadas en JOIN contra la tabla de backup, no en conteos globales de `la_stg_prospectos`. Esto asegura que el alcance verificado coincide exactamente con el scope de la corrección.

## 🧩 Conclusión

El problema fue corregido **en origen** (código) y **en datos históricos** (producción).

- A partir del **PR #2** (`84ff81f`), el script `sync-stg-prospectos.js` ya no puede escribir `cliente_id = 52` por omisión silenciosa. Si falta configuración, aborta con error explícito antes de tocar la base de datos.
- Los **98 registros históricos** vinculados a campañas reales del cliente 1268 fueron corregidos en `la_stg_prospectos`.
- La tabla `la_stg_prospectos_contactos` no requirió cambios porque mantiene vínculo por `stg_prospecto_id` y los IDs de staging no fueron modificados.
- No se modificaron campañas (`ll_campanias_email`), envíos (`ll_envios_email`), eventos ni sociedades (`llxbx_societe`).

## 🚀 Próximos Pasos

- [x] Corregir `scripts/sync-stg-prospectos.js` — **completado** (PR #2, commit `84ff81f`)
- [x] Respaldar registros con `cliente_id = 52` — **completado** (tabla `_bak_20260628`)
- [x] Ejecutar UPDATE `52 → 1268` — **completado** (98 registros)
- [x] Validar estado final — **completado** (0 pendientes)
- [ ] Si se reactiva la limpieza en `enrich-stg-contact-from-landing.js`, agregar scope por cliente antes de ejecutar los DELETE. Para `la_stg_prospectos_contactos`, el filtro debe aplicarse a través de los `stg_prospecto_id` pertenecientes a `la_stg_prospectos.cliente_id = <cliente_id>`.

## 🔗 Referencias

- [REGLAS-INFORMES.md](../REGLAS-INFORMES.md)
- [PR #2](https://github.com/albertohilal/prospectos-leadmaster/pull/2)
- [auto-2026-06-28-auditoria-escritura-stg-prospectos.md](auto-2026-06-28-auditoria-escritura-stg-prospectos.md)
- [auto-2026-06-14-auditoria-scripts-captura-staging-prospectos.md](auto-2026-06-14-auditoria-scripts-captura-staging-prospectos.md)
- [2026-06-12-migracion-la-tables-iunaorg-dyd.md](2026-06-12-migracion-la-tables-iunaorg-dyd.md)

---

*Documento generado según REGLAS-INFORMES.md — tipo D: Informe Automático.*
