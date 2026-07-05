# LM-003A — Ajuste de idempotencia: geo_key

**Fecha:** 2026-07-05
**Proyecto:** LeadMaster
**Bloque:** LM-003A — Preparación de datos para vertical seguros
**Estado:** DRAFT — pendiente de revisión humana
**Modo:** Solo archivos versionables — no se ejecutó SQL, no se consumieron APIs, no se hizo scraping

---

## 1. Problema detectado

El diseño original del catálogo `la_cat_geo_keywords_ar` tenía una debilidad
de idempotencia:

- `config/seed_la_cat_geo_keywords_ar_minimo.sql` usaba `INSERT IGNORE`.
- Pero `config/create_la_cat_geo_keywords_ar.sql` no definía ninguna
  `UNIQUE KEY` robusta que pudiera ser violada por duplicados.
- Sin `UNIQUE KEY`, `INSERT IGNORE` no evita duplicados. El motor solo
  omite filas que violan restricciones `UNIQUE` o `PRIMARY KEY`. Sin una
  restricción de unicidad basada en la entidad territorial, ejecutar el
  seed dos veces insertaría duplicados.

**Consecuencia:** el catálogo no era idempotente. Cada ejecución del seed
o cada sincronización con Georef podría generar registros repetidos.

---

## 2. Cambio aplicado

Se agregó la columna `geo_key` como clave de idempotencia estable:

### 2.1 Nueva columna

```sql
geo_key VARCHAR(180) NOT NULL
```

La columna `geo_key` codifica el tipo de ubicación y el identificador
oficial en un solo string. Ejemplos:

| Entidad | geo_key |
|---------|---------|
| CABA | `provincia:02` |
| Buenos Aires | `provincia:06` |
| Córdoba | `provincia:14` |
| Rosario | `municipio:82:rosario` |
| Santa Fe | `provincia:82` |
| Mendoza | `provincia:50` |
| Neuquén | `provincia:58` |
| Tucumán | `provincia:90` |
| Entre Ríos | `provincia:30` |
| Santa Cruz | `provincia:78` |

### 2.2 Formato general de geo_key

| Tipo de ubicación | Formato ideal | Ejemplo |
|-------------------|---------------|---------|
| provincia | `provincia:${provincia_id}` | `provincia:02` |
| departamento | `departamento:${departamento_id}` | `departamento:14007` |
| municipio | `municipio:${municipio_id}` | `municipio:82084` |
| localidad | `localidad:${localidad_id}` | `localidad:82084001` |
| localidad_censal | `localidad_censal:${localidad_censal_id}` | `localidad_censal:02001001` |

**Fallback** (cuando no hay ID oficial disponible, ej. seeds manuales):
```
tipo_ubicacion:provincia_id:modificador_normalizado
```
Ejemplo: `municipio:82:rosario`

Este fallback es aceptable para seeds manuales y pruebas, pero la
sincronización con Georef debe corregirlo cuando el ID real esté disponible.

### 2.3 Nueva restricción UNIQUE

```sql
UNIQUE KEY uq_geo_key (geo_key)
```

Esto garantiza que:
- `INSERT IGNORE` detecta correctamente duplicados por `geo_key`.
- El seed se puede re-ejecutar sin riesgo.
- Las sincronizaciones desde Georef no insertan registros ya existentes.
- Se habilita `INSERT ... ON DUPLICATE KEY UPDATE` para actualizaciones
  incrementales (población INDEC, prioridad, centroide, etc.).

### 2.4 Nuevo índice auxiliar

```sql
INDEX idx_geo_tipo_modificador (tipo_ubicacion, modificador_normalizado)
```

Facilita búsquedas combinadas por tipo de ubicación y nombre normalizado,
útil para reporting y auditoría.

---

## 3. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `config/create_la_cat_geo_keywords_ar.sql` | Agregada columna `geo_key`, `UNIQUE KEY uq_geo_key`, índice `idx_geo_tipo_modificador` |
| `config/seed_la_cat_geo_keywords_ar_minimo.sql` | Agregado `geo_key` en los 10 INSERT |
| `scripts/geo/sync-geo-keywords-ar.js` | Agregada función `computeGeoKey`, incluida en `transformProvincia`, columnas SQL y CSV |
| `scripts/geo/generate-google-queries-seguros.js` | Agregado `geo_key` en `MODIFICADORES_GEO`, incluido en output de queries y CSV |
| `docs/05-REPORTES/2026-07/CATALOGO-GEO-KEYWORDS-AR-LM-003A-SEGUROS-2026-07-05.md` | Agregada sección 3.4 Idempotencia del catálogo; actualizada tabla de columnas e índices |

---

## 4. Criterio de idempotencia

| Operación | Mecanismo | Resultado |
|-----------|-----------|-----------|
| Re-ejecutar seed mínimo | `INSERT IGNORE` + `UNIQUE (geo_key)` | Sin duplicados |
| Sincronizar desde Georef | `INSERT IGNORE` + `UNIQUE (geo_key)` | Sin duplicados |
| Importar población INDEC | `UPDATE ... WHERE geo_key = ?` | Actualización dirigida |
| Recalcular prioridad | `UPDATE ... WHERE geo_key = ?` | Actualización dirigida |
| Desactivar ubicación | `UPDATE ... SET activa = 0 WHERE geo_key = ?` | Actualización dirigida |

---

## 5. Advertencias

- **NO se ejecutó SQL** contra ninguna base de datos.
- **NO se consumieron APIs** de Georef, INDEC ni ninguna otra.
- **NO se hizo scraping** de Google ni de ningún otro sitio.
- **NO se modificó el VPS.**
- **Todo queda preparado para revisión humana.**

El DDL (`config/create_la_cat_geo_keywords_ar.sql`) debe ejecutarse solo
después de:
1. Revisar el schema contra la base de datos destino.
2. Confirmar que la tabla no existe aún (es `CREATE TABLE IF NOT EXISTS`).
3. Si la tabla ya existe sin `geo_key`, se requerirá un `ALTER TABLE`
   aparte (no incluido aquí).
4. Obtener aprobación explícita del operador.

---

*Reporte generado según norma DOCUMENTATION_RULES.md. Sin ejecución de SQL, sin consumo de APIs, sin scraping.*
