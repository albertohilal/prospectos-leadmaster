# LM-003A — Decisión de fuentes geográficas dinámicas

**Fecha:** 2026-07-05
**Proyecto:** LeadMaster
**Bloque:** LM-003A — Preparación de datos para vertical seguros
**Estado:** DRAFT
**Tipo:** Documento de decisión arquitectónica (ADR)

---

## 1. Problema

La búsqueda de prospectos de seguros en Google no puede depender de la ubicación
física, IP o sesión del usuario que ejecuta la búsqueda.

Si Google detecta que el usuario está en Buenos Aires, los resultados estarán
sesgados hacia Buenos Aires. Si el usuario está en Córdoba, los resultados
estarán sesgados hacia Córdoba. Esto hace que las búsquedas sin modificador
geográfico explícito sean **no reproducibles** y **no auditables**.

---

## 2. Decisión

**Todas las búsquedas deben generarse con keyword base + modificador geográfico
explícito.**

Ejemplos:
- `broker seguros corporativos Córdoba`
- `broker seguros corporativos Santa Cruz`
- `productor asesor de seguros Mendoza`
- `seguros para empresas Rosario`

Esto garantiza:
- **Reproducibilidad**: cualquier operador, desde cualquier ubicación, obtiene
  resultados comparables.
- **Auditabilidad**: cada búsqueda puede trazarse a una tupla (keyword base,
  modificador geográfico).
- **Cobertura sistemática**: se puede planificar barrido territorial completo
  de Argentina.

---

## 3. Fuentes oficiales seleccionadas

### 3.1 Georef API / Datos Argentina — fuente de estructura territorial

- **Base URL:** `https://apis.datos.gob.ar/georef/api/`
- **Uso previsto:** provincias, departamentos, municipios, localidades,
  localidades censales.
- **Endpoints relevantes:**
  - `/provincias`
  - `/departamentos`
  - `/municipios`
  - `/localidades`
  - `/localidades-censales`
- **Formatos disponibles:** JSON, CSV, GeoJSON, NDJSON.

Georef proporciona la **estructura territorial oficial** de Argentina:
jerarquía provincia → departamento → municipio → localidad, más localidades
censales con códigos INDEC estandarizados. Es la fuente canónica para la
geometría administrativa del país.

**Importante:** Georef NO debe tomarse como fuente principal de población
(habitantes). Sus datos de población pueden estar desactualizados, incompletos
o derivados de proyecciones. La población debe venir de INDEC.

### 3.2 INDEC / Censo — fuente de población

- **Uso previsto:** datos de población (habitantes) por localidad, municipio o
  departamento.
- **Estado actual:** no se ha confirmado el dataset exacto a utilizar. Las
  opciones incluyen:
  - Censo 2022 (datos definitivos por radio censal, localidad, departamento).
  - Proyecciones provinciales/departamentales publicadas por INDEC.
  - Datos abiertos en formatos CSV/XLSX desde el portal de INDEC.
- **Estrategia:** la tabla `la_cat_geo_keywords_ar` y el script
  `import-indec-poblacion.js` quedan preparados para recibir población cuando
  el dataset se confirme. La población será **dinámica y actualizable por
  script**, no un seed manual fijo.

---

## 4. Población como factor de priorización

La población NO se usará para filtrar ubicaciones (todas las ubicaciones
argentinas son potencialmente relevantes). Se usará para **priorizar**
búsquedas:

- Ubicaciones con mayor población → mayor prioridad de búsqueda.
- Ubicaciones con menor población → menor prioridad, pero nunca excluidas.

Esto permite que el sistema:
- Empiece buscando donde hay más mercado potencial.
- Cubra sistemáticamente todo el territorio.
- Ajuste prioridades cuando se actualicen los datos de población.

---

## 5. Flujo de generación de búsquedas

```
keywords base (seguros) + modificador geográfico (catálogo)
    → queries de Google
    → scraping controlado
    → staging de prospectos
    → validación
    → LeadMaster
```

El catálogo geográfico (`la_cat_geo_keywords_ar`) es la fuente de
modificadores. Las keywords base viven en `ll_keywords_leadmaster` (perfil de
seguros).

La combinación se genera con `scripts/geo/generate-google-queries-seguros.js`.

---

## 6. Entorno de ejecución

- **Local primero:** los scripts se desarrollan, prueban y validan en el
  entorno local (este repositorio).
- **VPS después:** solo cuando los datos y scripts estén validados por revisión
  humana, se trasladan al VPS.
- **No ejecutar SQL sin confirmación explícita.**
- **No consumir APIs sin confirmación explícita.**
- **No hacer scraping sin confirmación explícita.**

---

## 7. Archivos relacionados

| Archivo | Rol |
|---------|-----|
| `config/create_la_cat_geo_keywords_ar.sql` | Creación de tabla catálogo geográfico |
| `config/seed_la_cat_geo_keywords_ar_minimo.sql` | Seed mínimo de prueba (10 ubicaciones) |
| `scripts/geo/sync-geo-keywords-ar.js` | Sincronización con Georef API |
| `scripts/geo/import-indec-poblacion.js` | Placeholder para importar población INDEC |
| `scripts/geo/generate-google-queries-seguros.js` | Generador de queries Google |
| `docs/05-REPORTES/2026-07/CATALOGO-GEO-KEYWORDS-AR-LM-003A-SEGUROS-2026-07-05.md` | Reporte técnico del catálogo |

---

## 8. Referencias

- Georef API: https://apis.datos.gob.ar/georef/api/
- INDEC: https://www.indec.gob.ar/
- Documentación de la API Georef: https://datosgobar.github.io/georef-ar-api/
