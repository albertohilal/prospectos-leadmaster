# LM-003A — Catálogo geográfico de keywords Argentina

**Fecha:** 2026-07-05
**Proyecto:** LeadMaster
**Bloque:** LM-003A — Preparación de datos para vertical seguros
**Estado:** DRAFT — pendiente de revisión humana
**Modo:** Solo archivos versionables — no se ejecutó SQL, no se consumieron APIs, no se hizo scraping

---

## 1. Objetivo

Crear la base documental y técnica para un catálogo geográfico dinámico
argentino que sirva para generar búsquedas territoriales en Google.

La tabla `la_cat_geo_keywords_ar` **no es una tabla de domicilios de
prospectos**. Es un **catálogo de modificadores geográficos para búsquedas**.

Cada fila representa una ubicación argentina (provincia, departamento,
municipio, localidad o localidad censal) que puede usarse como modificador
geográfico en queries de Google.

---

## 2. Archivos creados

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `docs/05-REPORTES/2026-07/DECISION-FUENTES-GEO-DINAMICAS-LM-003A-SEGUROS-2026-07-05.md` | Documento de decisión arquitectónica sobre fuentes geográficas |
| 2 | `config/create_la_cat_geo_keywords_ar.sql` | DDL para crear la tabla `la_cat_geo_keywords_ar` |
| 3 | `config/seed_la_cat_geo_keywords_ar_minimo.sql` | Seed mínimo de prueba con 10 ubicaciones |
| 4 | `scripts/geo/sync-geo-keywords-ar.js` | Script de sincronización con Georef API |
| 5 | `scripts/geo/import-indec-poblacion.js` | Placeholder para importación de población INDEC |
| 6 | `scripts/geo/generate-google-queries-seguros.js` | Generador de queries Google |
| 7 | `docs/05-REPORTES/2026-07/CATALOGO-GEO-KEYWORDS-AR-LM-003A-SEGUROS-2026-07-05.md` | Este reporte técnico |

---

## 3. Diseño de la tabla `la_cat_geo_keywords_ar`

### 3.1 Propósito

Catálogo de modificadores geográficos para búsquedas en Google. Cada fila
representa una ubicación geográfica argentina utilizable como modificador.

### 3.2 Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT AUTO_INCREMENT | Clave primaria |
| `provincia_id` | VARCHAR(10) | ID Georef de provincia |
| `provincia_nombre` | VARCHAR(100) | Nombre oficial con tilde |
| `departamento_id` | VARCHAR(20) | ID Georef de departamento |
| `departamento_nombre` | VARCHAR(100) | Nombre oficial |
| `municipio_id` | VARCHAR(20) | ID Georef de municipio |
| `municipio_nombre` | VARCHAR(100) | Nombre oficial |
| `localidad_id` | VARCHAR(30) | ID Georef de localidad |
| `localidad_nombre` | VARCHAR(100) | Nombre oficial |
| `localidad_censal_id` | VARCHAR(30) | ID Georef de localidad censal |
| `localidad_censal_nombre` | VARCHAR(100) | Nombre oficial |
| `modificador_busqueda` | VARCHAR(150) | Texto para usar en query Google (sin tilde) |
| `modificador_normalizado` | VARCHAR(150) | Versión normalizada para matching |
| `tipo_ubicacion` | VARCHAR(30) | provincia / departamento / municipio / localidad / localidad_censal |
| `poblacion` | INT | Habitantes (NULL hasta confirmar fuente INDEC) |
| `poblacion_anio` | SMALLINT | Año del dato de población |
| `poblacion_fuente` | VARCHAR(100) | Fuente del dato (ej: 'INDEC Censo 2022') |
| `poblacion_fuente_url` | VARCHAR(500) | URL de la fuente |
| `centroide_lat` | DECIMAL(10,7) | Latitud del centroide |
| `centroide_lon` | DECIMAL(10,7) | Longitud del centroide |
| `prioridad_busqueda` | TINYINT | 1 (máxima) a 5 (mínima) |
| `activa` | TINYINT(1) | 1 = disponible para búsquedas, 0 = desactivada |
| `fuente_geo` | VARCHAR(100) | Origen de los datos geográficos |
| `fuente_poblacion` | VARCHAR(100) | Origen del dato de población |
| `last_geo_sync_at` | DATETIME | Última sincronización con Georef |
| `last_poblacion_sync_at` | DATETIME | Última sincronización con INDEC |
| `created_at` | TIMESTAMP | Fecha de creación del registro |
| `updated_at` | TIMESTAMP | Última actualización |

### 3.3 Índices

| Índice | Columnas | Justificación |
|--------|----------|---------------|
| `idx_modificador_normalizado` | `modificador_normalizado` | Búsqueda y deduplicación |
| `idx_provincia_id` | `provincia_id` | Filtro por provincia |
| `idx_municipio_id` | `municipio_id` | Filtro por municipio |
| `idx_localidad_censal_id` | `localidad_censal_id` | Matching con INDEC |
| `idx_tipo_ubicacion` | `tipo_ubicacion` | Filtro por nivel territorial |
| `idx_prioridad_busqueda` | `prioridad_busqueda` | Ordenamiento de búsquedas |
| `idx_activa` | `activa` | Filtro de ubicaciones activas |

---

## 4. Fuentes oficiales previstas

### 4.1 Georef API (Datos Argentina)

- **URL:** https://apis.datos.gob.ar/georef/api/
- **Uso:** estructura territorial (provincias, departamentos, municipios,
  localidades, localidades censales).
- **Script:** `scripts/geo/sync-geo-keywords-ar.js`
- **Estado:** preparado, no ejecutado.

### 4.2 INDEC

- **URL:** https://www.indec.gob.ar/
- **Uso:** datos de población por localidad censal.
- **Script:** `scripts/geo/import-indec-poblacion.js`
- **Estado:** placeholder. Falta confirmar dataset exacto.

---

## 5. Limitaciones actuales

### 5.1 Población

- **`poblacion` queda NULL** en el seed mínimo y en toda sincronización inicial
  con Georef.
- **Motivo:** Georef no es fuente confiable de población actualizada. INDEC es
  la fuente canónica pero el dataset exacto aún no está confirmado.
- **Consecuencia:** la prioridad de búsqueda inicial se calcula solo por tipo
  de ubicación (provincia > departamento > municipio > localidad), sin ponderar
  por habitantes.
- **Plan:** cuando el dataset INDEC esté confirmado, se ejecutará
  `scripts/geo/import-indec-poblacion.js` y se recalcularán prioridades.

### 5.2 Cobertura territorial

- El seed mínimo cubre solo 10 ubicaciones de prueba.
- La sincronización completa con Georef (script) cubrirá todas las provincias,
  departamentos, municipios y localidades censales de Argentina.
- **No ejecutado todavía.**

### 5.3 Conexión a base de datos

- Los scripts están preparados para operar en modo archivo (JSON/CSV/SQL).
- La conexión a DB está prevista pero desactivada por defecto y protegida por
  flags explícitos (no implementados en esta etapa).

---

## 6. Uso para priorizar búsquedas

La tabla `la_cat_geo_keywords_ar` alimenta al generador de queries
(`scripts/geo/generate-google-queries-seguros.js`), que combina:

```
keyword base (ll_keywords_leadmaster, sector = 'seguros')
    +
modificador_busqueda (la_cat_geo_keywords_ar, activa = 1)
    =
query de Google
```

La columna `prioridad_busqueda` determina el orden en que se generan las
queries:

1. **Fase 1 (prioridad 1-2):** provincias y grandes ciudades.
2. **Fase 2 (prioridad 3-4):** municipios y localidades con población
   significativa.
3. **Fase 3 (prioridad 5):** localidades pequeñas y localidades censales.

Cuando la población esté disponible desde INDEC, la prioridad se recalculará
combinando tipo de ubicación + habitantes.

---

## 7. Próximos pasos

1. **Revisión humana** de todos los archivos creados.
2. **Confirmar dataset INDEC** (Censo 2022, proyecciones, u otra fuente).
3. **Ejecutar sync con Georef** (`npm run geo:sync:dry`) previa aprobación.
4. **Importar población INDEC** cuando el dataset esté confirmado.
5. **Generar queries de seguros** (`npm run geo:queries:seguros`) para
   planificar scraping.
6. **Trasladar al VPS** solo después de validación completa en local.

---

## 8. Comandos disponibles

```bash
# Sincronización con Georef (dry-run por defecto)
npm run geo:sync:dry

# Generación de queries de seguros
npm run geo:queries:seguros
```

---

## 9. Advertencia explícita

- **NO se ejecutó SQL** contra ninguna base de datos.
- **NO se consumieron APIs** de Georef, INDEC ni ninguna otra.
- **NO se hizo scraping** de Google ni de ningún otro sitio.
- **NO se modificó el VPS.**
- **Todo queda preparado para revisión humana.**

Los archivos SQL deben ejecutarse solo después de:
1. Revisar el DDL contra el schema de la base de datos destino.
2. Confirmar que la base de datos y tabla existen.
3. Obtener aprobación explícita del operador.

---

*Reporte generado según norma DOCUMENTATION_RULES.md. Sin ejecución de SQL, sin consumo de APIs, sin scraping.*
