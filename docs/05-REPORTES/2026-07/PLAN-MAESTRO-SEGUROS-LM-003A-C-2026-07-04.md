# LM-003A-C — Plan maestro de keywords, plazas y lote candidato seguros

**Fecha:** 2026-07-04
**Proyecto:** LeadMaster
**Bloque:** LM-003A-C — Plan maestro para seed de keywords seguros, plazas y lote candidato
**Basado en:** `docs/LM-003A-B-auditoria-tablas-y-scripts.md`
**Estado:** Borrador — pendiente de revisión y aprobación
**Modo:** Solo planificación — sin implementación de código, SQL ni scraping

---

## 1. Objetivo

Diseñar un plan operativo escalable para construir un lote inicial de **80 a 110 prospectos LeadMaster** de la vertical **seguros**, donde el prospecto es un potencial cliente de LeadMaster (broker, productor, sociedad, organizador, insurtech), no un comprador final de seguros.

El plan cubre:
- Estrategia de keywords base × plazas para búsquedas geolocalizadas.
- Diseño de una tabla territorial (`ll_plazas_leadmaster`) para escalar a futuro.
- Fuentes oficiales sugeridas para ciudades/localidades argentinas.
- Clasificación comercial de candidatos detectados.
- Procedimiento operativo en 17 pasos.
- Decisiones pendientes que requieren aprobación explícita.

---

## 2. Aclaración de foco comercial

### El prospecto NO es una empresa que necesita comprar seguros

### El prospecto SÍ es un potencial cliente de LeadMaster

Un prospecto válido para este bloque es:

| Tipo de actor | Descripción |
|---------------|-------------|
| **Broker de seguros** | Intermediario que coloca seguros para empresas, pymes, comercios, industrias o profesionales |
| **Productor asesor de seguros** | Profesional matriculado que asesora y vende seguros, especialmente con foco B2B |
| **Sociedad de productores** | Agrupación de productores que comparten estructura comercial |
| **Organizador de productores** | Entidad que nuclea productores y gestiona colocación conjunta |
| **Agencia comercial de seguros** | Empresa dedicada a la venta/intermediación de seguros para terceros |
| **Aseguradora con canal comercial B2B** | Compañía de seguros que vende a través de brokers/canales |
| **Insurtech** | Plataforma tecnológica de cotización, comparación o venta de seguros |
| **Comparador/plataforma de seguros** | Marketplace o cotizador online de seguros |
| **Intermediario comercial** | Empresa que vende seguros como parte de su oferta a empresas/pymes |

Estos actores podrían pagarle a LeadMaster por prospectos calificados con interés manifiesto.

### NO es nuestro prospecto

- Consumidor final de seguros (persona que quiere asegurar su auto, casa, vida, moto).
- Empresa que quiere contratar ART, caución, flota o seguro corporativo (es el lead final del broker, no el broker).
- Bloguero, medio de comunicación o página institucional sin oferta comercial de intermediación.

**Esta distinción debe mantenerse en todas las fases del plan.**

---

## 3. Archivos revisados

| Archivo | Tipo | Relevancia para LM-003A-C |
|---------|------|----------------------------|
| `docs/LM-003A-B-auditoria-tablas-y-scripts.md` | Informe previo | **Fundacional.** Contiene el mapa completo de tablas, scripts, volúmenes y relaciones |
| `package.json` | Configuración npm | Define los comandos `db:batch`, `stg:enrich-contact`, `stg:enrich-nom`, `db:status`, `db:view` |
| `config/create_ll_keywords_leadmaster.sql` | DDL | Define `ll_keywords_leadmaster` con todos sus campos, ENUMs e índices |
| `config/seed_ll_keywords_leadmaster_iniciales.sql` | Seed | Patrón a seguir: usa `INSERT IGNORE`, `SHA2(LOWER(TRIM(keyword)), 256)` para hash, `origen='lista_inicial'`, estado `activa` |
| `config/seed_ll_keywords_leadmaster_linea_industrial.sql` | Seed | Patrón a seguir: 30 keywords con `origen='linea_industrial'`, todas en estado `pausada` o `pendiente` (seguridad ante scraping accidental) |
| `scripts/run-db-batch.js` | Orquestador | **Limitación crítica:** filtra por `estado='activa'`, `--origen`, `--prioridad`, pero **NO** por `--sector`. Lee de `ll_keywords_leadmaster` e invoca al scraper local |
| `scripts/sync-stg-prospectos.js` | Sync | Requiere `--cliente-id` obligatorio. Normaliza URL y hace `ON DUPLICATE KEY UPDATE` |
| `scripts/enrich-stg-contact-from-landing.js` | Enriquecimiento | Extrae emails, teléfonos, WhatsApp de landing pages. Soporta `--prospecto-from`, `--prospecto-to`, `--limit`, `--dry-run`, `--no-overwrite` |
| `scripts/enrich-stg-nom-from-landing.js` | Enriquecimiento | Completa `nom` con señales locales y fetch web opcional |
| `scripts/db-status.js` | Utilidad | `SELECT COUNT(*) FROM la_prospectos` — muy básico, no da visibilidad del lote |
| `scripts/db-view.js` | Utilidad | Últimos 10 prospectos con id, keyword, es_valido, fecha, chars |

### Hallazgos de la revisión

1. **Patrón de seeds existente consistente:** ambos seeds usan `INSERT IGNORE` con `SHA2(LOWER(TRIM(keyword)), 256)` para `keyword_hash`. El seed de línea industrial usa estado `pendiente` (no `activa`), lo que es una buena práctica de seguridad.

2. **`run-db-batch.js` no soporta `--sector`:** filtra solo por `estado='activa'`, `--origen` y `--prioridad`. Cualquier plan operativo debe usar `--origen` como filtro principal.

3. **El comando `npm run db:batch` existe y funciona.** El plan debe proponer comandos concretos usando los scripts reales del `package.json`.

4. **No hay script de detección de candidatos existentes.** `db-status.js` solo cuenta, `db-view.js` solo muestra los últimos 10. Se necesita un script nuevo para el reporte de candidatos.

5. **Estado actual de `ll_keywords_leadmaster`:** 50 keywords totales. 20 de `lista_inicial` (todas `activa`), 30 de `linea_industrial` (todas `pausada`). Solo 1 keyword con `sector='seguros'` (id=3, "cotizar seguro de responsabilidad civil para empresas").

---

## 4. Estado actual relevante

### 4.1 Tablas y volúmenes (del informe LM-003A-B)

| Tabla | Registros |
|-------|:---:|
| `la_prospectos` | 171 |
| `la_stg_prospectos` | 170 |
| `la_stg_prospectos_contactos` | 329 |
| `ll_keywords_leadmaster` | 50 |

### 4.2 Cobertura de contactos en staging

| Métrica | Cantidad | % |
|---------|:---:|:---:|
| Con email | 149 | 87.6% |
| Con teléfono | 110 | 64.7% |
| Con WhatsApp | 76 | 44.7% |
| Con nombre comercial | 164 | 96.5% |

### 4.3 Clientes activos en staging

| cliente_id | Cantidad |
|:---:|:---:|
| 1268 | 98 |
| 52 | 72 |

### 4.4 Keywords de seguros existentes

Solo 1 keyword tiene `sector='seguros'`:
- id=3: `"cotizar seguro de responsabilidad civil para empresas"` — estado `activa`, prioridad `media`, origen `lista_inicial`

Esta keyword apunta a **compradores de seguros** (empresas que quieren cotizar RC), no a vendedores/intermediarios. Es un ejemplo perfecto de lo que **NO** queremos para LM-003A-C.

### 4.5 Prospectos con señales de seguros en datos actuales

Del análisis de la auditoría LM-003A-B, los prospectos existentes con palabras clave de seguros son:

| id | keyword | nom detectado | landing |
|----|---------|---------------|---------|
| 16 | seguro de auto para empresas | Answerseguros | answerseguros.com.ar |
| 18 | seguro de auto para empresas | Sancristobal | sancristobal.com.ar |
| 20 | seguro de auto para empresas | Zurich | zurich.com.ar |
| 23 | seguro de auto para empresas | Sancorseguros | sancorseguros.com.ar |
| 30 | cotizar seguro RC empresas | Nationalbrokers | nationalbrokers.com.ar |
| 66 | cotizar seguro RC empresas | Provart | provinciart.com.ar |
| 67 | cotizar seguro RC empresas | Lasegundaonline | lasegundaonline.com.ar |
| 105 | cotizar seguro RC empresas | Nationalbrokers | nationalbrokers.com.ar |
| 106 | cotizar seguro RC empresas | Maklerseguros | maklerseguros.com.ar |

**Observación:** De estos 9 prospectos detectados, varios son potenciales clientes LeadMaster (Nationalbrokers, Maklerseguros, Answerseguros), pero las keywords usadas apuntaban a compradores de seguros, no a vendedores. Esto refuerza la necesidad de usar keywords diseñadas específicamente para encontrar intermediarios.

---

## 5. Rol de la tabla `ll_keywords_leadmaster`

### 5.1 Función en el sistema

`ll_keywords_leadmaster` es el **catálogo operativo de búsquedas**. Es la única fuente de verdad que consume `scripts/run-db-batch.js` para decidir qué buscar.

### 5.2 Estructura real

| Columna | Tipo | Uso en LM-003A-C |
|---------|------|------------------|
| `id` | INT PK AUTO_INCREMENT | — |
| `keyword` | VARCHAR(255) NOT NULL | Keyword final expandida con plaza |
| `keyword_hash` | CHAR(64) NOT NULL | `SHA2(LOWER(TRIM(keyword)), 256)` — **idempotencia** |
| `sector` | VARCHAR(100) | `'seguros'` |
| `perfil` | ENUM('b2b','b2c','mixto') | `'b2b'` |
| `prioridad` | ENUM('alta','media','baja') | Según clasificación comercial |
| `estado` | ENUM('pendiente','activa','pausada','descartada') | `'pausada'` o `'pendiente'` inicialmente |
| `origen` | VARCHAR(100) | `'LM-003A-C-seguros'` |
| `notas` | TEXT | Keyword base + plaza de origen |
| `veces_buscada` | INT DEFAULT 0 | Lo actualiza `run-db-batch.js` |
| `ultima_busqueda_at` | DATETIME | Lo actualiza `run-db-batch.js` |
| `created_at` | TIMESTAMP | — |
| `updated_at` | TIMESTAMP | — |

### 5.3 Estrategia de inserción

El seed futuro debe ser **idempotente** siguiendo el patrón de los seeds existentes:

```sql
INSERT IGNORE INTO ll_keywords_leadmaster
(keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas)
VALUES
(
    'broker de seguros para empresas CABA',
    SHA2(LOWER(TRIM('broker de seguros para empresas CABA')), 256),
    'seguros',
    'b2b',
    'alta',
    'pausada',
    'LM-003A-C-seguros',
    'keyword_base=broker de seguros para empresas | plaza=CABA'
);
```

- `keyword_hash` garantiza que la misma keyword no se inserte dos veces (UNIQUE KEY `uq_ll_keywords_leadmaster_hash`).
- `estado = 'pausada'` evita scraping accidental antes de revisión.
- `origen = 'LM-003A-C-seguros'` permite filtrar, activar y gestionar el lote completo.
- `notas` contiene metadata legible sobre keyword base y plaza.

### 5.4 Activación controlada

No se deben cargar keywords como `activa`. El plan propone:

1. Insertar todas con `estado = 'pausada'`.
2. Revisar el lote cargado con `SELECT`.
3. Activar solo un subconjunto aprobado:

```sql
-- Activación de primera tanda (solo alta prioridad)
UPDATE ll_keywords_leadmaster
SET estado = 'activa'
WHERE origen = 'LM-003A-C-seguros'
  AND prioridad = 'alta';
```

4. Ejecutar dry-run antes de scraping real.
5. Activar tandas adicionales solo tras validar resultados de la primera.

### 5.5 Cálculo de `keyword_hash`

Patrón observado en los seeds existentes:

```sql
SHA2(LOWER(TRIM('keyword exacta')), 256)
```

Este hash se calcula sobre la keyword **final** (con plaza incluida). El índice único `uq_ll_keywords_leadmaster_hash` sobre `keyword_hash` previene duplicados exactos. Si dos keywords base distintas producen la misma keyword final (poco probable pero posible), se insertará solo la primera.

---

## 6. Limitación actual de `scripts/run-db-batch.js`

### 6.1 Lo que soporta

```bash
npm run db:batch -- [opciones]
```

| Opción | Descripción |
|--------|-------------|
| `--target N` | Capturas objetivo por keyword (default: 2) |
| `--limit N` | Cantidad máxima de keywords (default: 10) |
| `--origen VALOR` | Filtra por `origen` |
| `--prioridad VALOR` | Filtra por `prioridad` |
| `--manual` | Agrega `--manual` al scraper |
| `--dry-run` | Muestra qué ejecutaría sin scraper ni escritura |
| `--help, -h` | Ayuda |

Query interna:

```sql
SELECT id, keyword, sector, prioridad, origen, veces_buscada, ultima_busqueda_at
FROM ll_keywords_leadmaster
WHERE estado = 'activa'
  [AND origen = ?]
  [AND prioridad = ?]
ORDER BY FIELD(prioridad, 'alta', 'media', 'baja'),
         COALESCE(ultima_busqueda_at, '1970-01-01') ASC,
         id ASC
LIMIT ?
```

### 6.2 Lo que NO soporta

- **`--sector`** — no se puede filtrar por sector. Es la limitación más relevante para LM-003A-C.
- **`--estado`** — siempre filtra por `estado = 'activa'`, no se puede cambiar.

### 6.3 Plan de mitigación

Para LM-003A-C, el control operativo será por `--origen`:

```bash
# Dry-run seguro
npm run db:batch -- --origen LM-003A-C-seguros --prioridad alta --limit 5 --target 2 --dry-run

# Ejecución real controlada
npm run db:batch -- --origen LM-003A-C-seguros --prioridad alta --limit 5 --target 2 --manual
```

**Evaluación de agregar `--sector` a futuro:**

- **Conviene** agregarlo para poder filtrar por sector sin depender exclusivamente de `--origen`.
- **No implementar ahora.** Queda como mejora futura en `scripts/run-db-batch.js`:
  ```javascript
  // A futuro en parseArgs():
  case '--sector': {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error('--sector requiere un valor');
    options.sector = value;
    index += 1;
    break;
  }
  
  // Y en buildQuery():
  if (options.sector) {
    filters.push('AND sector = ?');
    params.push(options.sector);
  }
  ```

---

## 7. Escalabilidad territorial y tabla `ll_plazas_leadmaster`

### 7.1 Justificación

Las keywords sin plaza geográfica tienen dos problemas:
1. Google personaliza resultados según ubicación del navegador, dando resultados inconsistentes.
2. Un lote sin geolocalización es difícil de depurar y verificar comercialmente.

Incluir la plaza en la keyword produce resultados más predecibles y verificables.

Hardcodear plazas en seeds o scripts es insostenible a escala. Una tabla dedicada permite:
- Activar/desactivar plazas sin modificar seeds.
- Priorizar plazas por relevancia comercial.
- Incorporar datos censales para estimar mercado potencial.
- Generar combinaciones keyword_base × plaza de forma programática.

### 7.2 Estructura propuesta (`ll_plazas_leadmaster`)

```sql
CREATE TABLE IF NOT EXISTS ll_plazas_leadmaster (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Identificación oficial
    georef_id VARCHAR(50) NULL COMMENT 'ID en Georef Argentina',
    indec_id VARCHAR(50) NULL COMMENT 'Código INDEC',

    -- Jerarquía territorial
    pais VARCHAR(100) NOT NULL DEFAULT 'Argentina',
    provincia VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NULL,
    municipio VARCHAR(100) NULL,
    localidad VARCHAR(200) NOT NULL,

    -- Clasificación
    categoria VARCHAR(100) NULL COMMENT 'Categoría censal (ciudad, pueblo, paraje, etc.)',
    region VARCHAR(50) NULL COMMENT 'AMBA, Centro, Cuyo, Patagonia, NOA, NEA',

    -- Búsqueda
    nombre_busqueda VARCHAR(200) NOT NULL COMMENT 'Texto para concatenar en keywords. Ej: Rosario Santa Fe',
    
    -- Georreferencia
    lat DECIMAL(10,7) NULL,
    lon DECIMAL(10,7) NULL,

    -- Población
    poblacion INT NULL,
    poblacion_anio YEAR NULL,
    poblacion_fuente VARCHAR(100) NULL,

    -- Clasificación comercial
    tipo_plaza ENUM('capital','ciudad_grande','ciudad_media','ciudad_chica','municipio','region','corredor_productivo') DEFAULT 'ciudad_media',
    prioridad ENUM('alta','media','baja') DEFAULT 'media',
    estado ENUM('activa','pausada','descartada','pendiente_revision') DEFAULT 'pendiente_revision',
    activa TINYINT(1) NOT NULL DEFAULT 0,

    notas TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_plaza_busqueda (nombre_busqueda),
    INDEX idx_provincia (provincia),
    INDEX idx_region (region),
    INDEX idx_estado (estado),
    INDEX idx_activa (activa),
    INDEX idx_prioridad (prioridad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7.3 Campos clave explicados

| Campo | Justificación |
|-------|--------------|
| `nombre_busqueda` | Es el texto que se concatena a la keyword base. Debe ser único y no ambiguo. Ej: "Rosario Santa Fe" (no solo "Rosario", porque hay Rosario en varias provincias). |
| `activa` (TINYINT) | Permite filtros booleanos simples: `WHERE activa = 1`. Más rápido que filtrar por ENUM en queries frecuentes. |
| `estado` (ENUM) | Controla el ciclo de vida: `pendiente_revision` → `activa` → `pausada` → `descartada`. |
| `prioridad` (ENUM) | Jerarquiza plazas por relevancia comercial, independientemente de su tamaño poblacional. |
| `tipo_plaza` | Clasifica para generar estrategias diferenciadas (no es lo mismo buscar en CABA que en un municipio de 5000 habitantes). |
| `region` | Facilita reportes y planificación por zona geográfica. |

### 7.4 Fases de implementación

| Fase | Descripción | ¿En este plan? |
|------|-------------|:---:|
| Fase 1 — Base territorial | Importar localidades/municipios oficiales con georreferencia | No. Propuesta para fase siguiente |
| Fase 2 — Normalización comercial | Calcular `nombre_busqueda`, `region`, `tipo_plaza`, `estado`, `activa`, `prioridad` | No. Propuesta para fase siguiente |
| Fase 3 — Enriquecimiento poblacional | Completar `poblacion`, `poblacion_anio`, `poblacion_fuente` con INDEC/Censo 2022 | No. Opcional futuro |
| Fase 4 — Activación comercial | Activar plazas relevantes, pausar/descartar el resto | No. Propuesta para fase siguiente |
| Fase 5 — Generación de keywords | Script que combine keyword_base × plaza activa → `ll_keywords_leadmaster` | No. Propuesta para fase siguiente |

### 7.5 Estrategia para la primera tanda (sin tabla de plazas)

Mientras no exista `ll_plazas_leadmaster`, la primera tanda usará **plazas hardcodeadas en el seed SQL**. Esto es aceptable para un lote inicial de ~30 keywords, pero **no escala** para tandas posteriores.

---

## 8. Fuentes oficiales sugeridas para plazas y población

### 8.1 Fuente principal: Georef Argentina

- **URL:** https://datos.gob.ar/dataset/jgm_georef
- **API:** https://apis.datos.gob.ar/georef/api/
- **Datos disponibles:** provincias, departamentos, municipios, localidades con coordenadas, códigos oficiales.
- **Ventaja:** datos oficiales, georreferenciados, con IDs normalizados.
- **Archivos de interés:**
  - `localidades.json` — lista completa de localidades con provincia, departamento, municipio, lat, lon, categoría.
  - `municipios.json` — municipios con coordenadas del centroide.

### 8.2 Fuente complementaria: INDEC / Censo 2022

- **URL:** https://www.indec.gob.ar/indec/web/Nivel4-Tema-2-41-165
- **Datos disponibles:** población por localidad/municipio, datos censales.
- **Limitación:** puede requerir cruce manual con Georef; los códigos y nombres no siempre coinciden.
- **Estrategia sugerida:** importar primero Georef para la base territorial. El enriquecimiento con población se evalúa en una fase posterior, porque requiere un trabajo de matching no trivial.

### 8.3 Estrategia de importación propuesta

```
Georef API / archivos
        │
        ▼
scripts/import-plazas-georef.js
        │
        ▼
ll_plazas_leadmaster (estructura base)
        │
        ▼ (fase 2, manual/asistida)
Normalización: nombre_busqueda, region, tipo_plaza, activa
        │
        ▼ (fase 3, opcional)
scripts/enrich-plazas-poblacion-indec.js
        │
        ▼
ll_plazas_leadmaster (completa)
```

---

## 9. Keywords base vs keywords operativas

### 9.1 Definiciones

| Concepto | Ejemplo | Dónde vive |
|----------|---------|------------|
| **Keyword base** | `broker de seguros para empresas` | Plan, documento, futuro `ll_keyword_bases_leadmaster` |
| **Plaza** | `Córdoba` (nombre_busqueda: `Córdoba`) | Futuro `ll_plazas_leadmaster` |
| **Keyword operativa** | `broker de seguros para empresas Córdoba` | `ll_keywords_leadmaster.keyword` |

### 9.2 Flujo de generación

```
keyword_base ──┬── nombre_busqueda_1 ──► keyword_operativa_1
               ├── nombre_busqueda_2 ──► keyword_operativa_2
               ├── nombre_busqueda_3 ──► keyword_operativa_3
               └── ...
                         │
                         ▼
              ll_keywords_leadmaster.keyword
```

### 9.3 Evaluación de tabla `ll_keyword_bases_leadmaster`

**No se recomienda crear en esta fase.** Las keywords base pueden mantenerse en el plan/documento o en el seed SQL directamente. Una tabla dedicada solo se justifica cuando:
- Hay más de 50 keywords base activas.
- Se necesita versionado o auditoría de cambios en keywords base.
- Hay múltiples sectores gestionando keywords simultáneamente.

Para LM-003A-C, con ~20 keywords base, el seed SQL directo es suficiente.

### 9.4 Evaluación de script `scripts/generate-keywords-from-plazas.js`

**Conviene crearlo** en una fase futura, cuando exista `ll_plazas_leadmaster` con plazas activadas. Este script:
1. Lee keywords base (de un archivo JSON o tabla).
2. Lee plazas activas de `ll_plazas_leadmaster`.
3. Genera el producto cartesiano keyword_base × nombre_busqueda.
4. Inserta en `ll_keywords_leadmaster` con `INSERT IGNORE`.
5. Asigna `origen = 'LM-003A-C-seguros'`, `estado = 'pausada'`.

**No implementar ahora.** La primera tanda se genera manualmente en el seed SQL.

---

## 10. Estrategia matriz keyword_base × plaza

### 10.1 Principio

Cada keyword base se repite para cada plaza activa cuando tenga sentido comercial. Esto produce un lote geolocalizado y verificable.

### 10.2 Ejemplo concreto

```
keyword_base: "broker de seguros para empresas"

× CABA                      → "broker de seguros para empresas CABA"
× Rosario Santa Fe          → "broker de seguros para empresas Rosario Santa Fe"
× Córdoba                   → "broker de seguros para empresas Córdoba"
× Mendoza                   → "broker de seguros para empresas Mendoza"
× La Plata                  → "broker de seguros para empresas La Plata"
× Gran Buenos Aires         → "broker de seguros para empresas zona norte Buenos Aires"
```

### 10.3 Regla de aplicabilidad

No todas las keywords base necesitan multiplicarse por todas las plazas:

- **Keywords de alta prioridad (B2B explícito):** se aplican a todas las plazas activas. Son el núcleo del lote.
- **Keywords de media prioridad:** se aplican solo a plazas de prioridad alta y media.
- **Keywords de baja prioridad:** no se incluyen en la primera tanda.

### 10.4 Control de volumen

La multiplicación keyword_base × plaza puede disparar el volumen. Con 10 keywords base × 10 plazas = 100 keywords operativas. Con 20 × 20 = 400.

**Para la primera tanda, el plan propone:**
- 5-6 plazas de alta prioridad.
- 8-10 keywords base de alta prioridad.
- Total: 40-60 keywords operativas.
- Con `--target 2` por keyword → 80-120 capturas potenciales.
- Esto se alinea con el objetivo de 80-110 prospectos del briefing.

---

## 11. Primera tanda controlada propuesta

### 11.1 Plazas iniciales de alta prioridad

| # | nombre_busqueda | Provincia | Tipo | Justificación comercial |
|---|-----------------|-----------|------|--------------------------|
| 1 | `CABA` | CABA | capital | Mayor concentración de brokers, productores, aseguradoras |
| 2 | `zona norte Buenos Aires` | Buenos Aires | region | Corredor comercial con alta densidad empresarial |
| 3 | `La Plata` | Buenos Aires | capital | Capital provincial, polo administrativo |
| 4 | `Rosario Santa Fe` | Santa Fe | ciudad_grande | Segundo polo económico, fuerte presencia de seguros |
| 5 | `Córdoba` | Córdoba | ciudad_grande | Tercer polo económico, mercado de seguros desarrollado |
| 6 | `Mendoza` | Mendoza | ciudad_grande | Polo regional Cuyo, actividad agroindustrial y seguros |

**Total: 6 plazas.**

**Nota sobre `zona norte Buenos Aires`:** Se usa este nombre en vez de municipios individuales (San Isidro, Vicente López, Tigre, etc.) para capturar resultados más amplios en la primera pasada. En tandas futuras, cuando exista `ll_plazas_leadmaster`, se puede granular a nivel municipio.

### 11.2 Keywords base iniciales de alta prioridad

| # | Keyword base | Justificación |
|---|-------------|---------------|
| 1 | `broker de seguros para empresas` | Target directo. Broker B2B. |
| 2 | `productor asesor de seguros empresas` | Target directo. Productor B2B. |
| 3 | `sociedad de productores de seguros` | Target directo. Sociedades. |
| 4 | `organizador de seguros` | Target directo. Organizadores. |
| 5 | `broker seguro caución` | Especialista en caución (perfil B2B puro). |
| 6 | `broker ART empresas` | Especialista en ART (perfil B2B puro). |
| 7 | `seguros corporativos broker` | Broker con foco corporativo. |
| 8 | `seguros para pymes broker` | Broker con foco pyme. |

**Total: 8 keywords base.**

### 11.3 Volumen estimado

```
8 keywords base × 6 plazas = 48 keywords operativas
48 keywords × 2 capturas target = 96 capturas potenciales
```

Esto se alinea con el briefing (80-110 prospectos). Con deduplicación y resultados sin anuncios, el yield real probablemente sea menor, estimado en 50-70 prospectos netos en la primera tanda.

### 11.4 Expansión futura

Si la primera tanda produce buenos resultados, se puede expandir:
- Agregar 4-6 plazas más (Mar del Plata, Tucumán, Neuquén, Bahía Blanca, Salta, Santa Fe).
- Agregar 5-8 keywords base de media prioridad.
- Esto escalaría a ~200 keywords operativas en segunda tanda.

---

## 12. Keywords base sugeridas por prioridad

### 12.1 Alta prioridad — Vendedores/intermediarios B2B explícitos

Estas keywords buscan activamente al vendedor/intermediario de seguros, no al comprador:

1. `broker de seguros para empresas`
2. `productor asesor de seguros empresas`
3. `sociedad de productores de seguros`
4. `organizador de seguros`
5. `broker ART empresas`
6. `broker seguro caución`
7. `seguros corporativos broker`
8. `seguros para pymes broker`
9. `agencia de seguros empresas`
10. `productor de seguros caución`
11. `seguros flotas broker`
12. `seguro transporte mercadería broker`
13. `seguros responsabilidad civil empresas broker`
14. `seguros comercio industria broker`
15. `seguros consorcios productor`
16. `seguros patrimoniales empresas broker`

**Total alta prioridad: 16 keywords base.**

### 12.2 Media prioridad — Pueden encontrar vendedores, con más ruido

Estas keywords pueden atraer tanto vendedores como compradores. Requieren más filtrado:

1. `insurtech seguros empresas`
2. `plataforma seguros para empresas`
3. `comparador seguros empresas`
4. `cotizador seguros empresas`
5. `seguros digitales empresas`
6. `seguros comerciales productor`
7. `asesor de seguros empresas`
8. `seguros industriales productor`

**Total media prioridad: 8 keywords base.**

### 12.3 Baja prioridad o descartadas — NO usar en LM-003A-C

Estas keywords encuentran **compradores finales de seguros** o tienen alto ruido. **Evitar directamente:**

| Keyword | Motivo de descarte |
|---------|-------------------|
| `seguro de auto barato` | Comprador final |
| `seguro hogar` | Comprador final |
| `seguro celular` | Comprador final |
| `contratar seguro online` | Comprador final |
| `seguro de vida individual` | Comprador final |
| `cotizar seguro de moto` | Comprador final |
| `seguro automotor` | Comprador final |
| `seguro para auto` | Comprador final |
| `seguro para vivienda` | Comprador final |
| `cotizar seguro de responsabilidad civil para empresas` | Comprador final (empresa que quiere cotizar) — **ya existe en la DB con sector=seguros, origen=lista_inicial** |
| `seguro de auto para empresas` | Comprador final flota — **ya existe en la DB** |

---

## 13. Estrategia de detección de candidatos actuales

Antes de hacer scraping nuevo, conviene detectar prospectos que ya estén en las tablas y puedan ser candidatos a cliente LeadMaster.

### 13.1 Señales de detección

| Señal | Tabla | Columna | Patrón |
|-------|-------|---------|--------|
| Keyword | `la_prospectos` | `palabra_clave` | `REGEXP '(broker|productor|seguros?|asegurador|organizador|insurtech|ART|caucion|flota)'` |
| Nombre | `la_stg_prospectos` | `nom` | `REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador)'` |
| URL | `la_stg_prospectos` | `url_landing` | `REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza)'` |
| Email | `la_stg_prospectos` | `email_extraido` | `REGEXP '@(broker|seguros?|productor|asegurador|insurtech)'` |
| Contactos | `la_stg_prospectos_contactos` | `valor` | Mismos patrones que email |

### 13.2 Columnas del reporte candidato

El reporte debe devolver:

| Columna | Fuente | Descripción |
|---------|--------|-------------|
| `prospecto_id` | `la_prospectos.id` | ID origen |
| `stg_id` | `la_stg_prospectos.id` | ID staging |
| `nom` | `la_stg_prospectos.nom` | Nombre comercial |
| `url_landing` | `la_stg_prospectos.url_landing` | URL depurada |
| `palabra_clave` | `la_prospectos.palabra_clave` | Keyword original |
| `email_extraido` | `la_stg_prospectos.email_extraido` | Email principal |
| `telefono_extraido` | `la_stg_prospectos.telefono_extraido` | Teléfono principal |
| `whatsapp_extraido` | `la_stg_prospectos.whatsapp_extraido` | WhatsApp principal |
| `contacto_estado` | `la_stg_prospectos.contacto_estado` | Estado de depuración |
| `tipo_actor_sugerido` | **Clasificación automática** | broker, productor, sociedad, organizador, insurtech, compania, otro |
| `prioridad_sugerida` | **Clasificación automática** | alta, media, baja |
| `motivo_prioridad` | **Clasificación automática** | Justificación textual |
| `requiere_validacion_manual` | **Clasificación automática** | 1/0 |
| `motivo_descarte` | **Clasificación automática** | Si aplica |

### 13.3 Forma de implementación

**Recomendación: ambos (SQL + script Node).**

| Herramienta | Propósito | Archivo |
|-------------|-----------|---------|
| **SQL puro** | Consulta base que extrae candidatos con señales | `config/query_lote_seguros_candidatos.sql` |
| **Script Node** | Ejecuta la consulta, aplica reglas de clasificación, genera CSV | `scripts/report-seguros-candidatos.js` |

**Ventaja del enfoque dual:**
- El SQL puede ejecutarse directamente en phpMyAdmin/CLI para inspección rápida.
- El script Node puede aplicar lógica de clasificación más compleja y exportar CSV.

### 13.4 Consulta SQL base propuesta

```sql
-- config/query_lote_seguros_candidatos.sql
SELECT
    p.id AS prospecto_id,
    s.id AS stg_id,
    s.nom,
    s.url_landing,
    p.palabra_clave,
    s.email_extraido,
    s.telefono_extraido,
    s.whatsapp_extraido,
    s.contacto_estado,
    s.error_msg,
    -- Señal detectada (para debug)
    CASE
        WHEN p.palabra_clave REGEXP '(broker|productor|organizador|insurtech)' THEN 'keyword_broker'
        WHEN s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech)' THEN 'nom_seguros'
        WHEN s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador)' THEN 'url_seguros'
        WHEN s.email_extraido REGEXP '@(broker|seguros?|productor|asegurador|insurtech)' THEN 'email_seguros'
        ELSE 'otro'
    END AS senal_detectada
FROM la_prospectos p
JOIN la_stg_prospectos s ON s.prospecto_id = p.id
WHERE
    p.palabra_clave REGEXP '(broker|productor|seguros?|asegurador|organizador|insurtech|ART|caucion|flota|poliza|siniestro|cotizador)'
    OR s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador|ART|caucion)'
    OR s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza|art-|caucion)'
    OR s.email_extraido REGEXP '(seguro|broker|productor|asegurador|insurtech|ssn)'
ORDER BY s.prospecto_id;
```

---

## 14. Reglas de clasificación comercial

### 14.1 Prioridad alta

**Condiciones para clasificar como prioridad alta:**

- El nombre (`nom`) o la URL contienen términos como "broker", "productor de seguros", "organizador", "sociedad de productores".
- El sitio web evidencia foco en seguros para empresas, pymes, comercios, industrias o profesionales (no consumo masivo).
- Especialista en ART, caución, flotas, transporte, responsabilidad civil, seguros técnicos, patrimoniales o industriales.
- El sitio tiene sección de contacto clara, formulario, teléfono o email visible.
- Insurtech B2B con plataforma de cotización para empresas.

### 14.2 Prioridad media

**Condiciones para clasificar como prioridad media:**

- Productor/agencia generalista que ofrece tanto seguros personales como empresariales, pero con señales de foco comercial.
- Aseguradora o agencia con sección específica de "empresas" o "corporativo".
- Plataforma de cotización online con formulario de contacto.
- Comparador de seguros con presencia comercial.
- Broker multiproducto con sitio web profesional pero sin foco B2B explícito.

### 14.3 Prioridad baja

**Condiciones para clasificar como prioridad baja:**

- Foco principal en seguros de auto, hogar, vida individual o moto, con poca o nula oferta empresarial.
- Sitio sin información de contacto clara (sin formulario, email o teléfono visible).
- Contenido puramente informativo (blog, noticias, educación sobre seguros).
- Dudosa relación con venta/intermediación de seguros.
- Empresa demasiado grande (aseguradora multinacional) sin canal comercial concreto para terceros.

### 14.4 Descartar

**Condiciones para descarte automático o marca de revisión:**

- Empresa que **compra** seguros pero no **vende/intermedia** seguros (ej: fábrica que busca ART para sus empleados).
- Blog, medio de comunicación, portal de noticias.
- Página institucional o gubernamental sin oferta comercial.
- Página duplicada de otro prospecto ya clasificado.
- Página sin relación real con el mercado de seguros.
- Resultado de consumidor final (particular buscando seguro para su auto).

---

## 15. `cliente_id` pendiente

### 15.1 Contexto

Actualmente `la_stg_prospectos` tiene registros con `cliente_id = 52` (72 registros) y `cliente_id = 1268` (98 registros). `scripts/sync-stg-prospectos.js` requiere `--cliente-id` obligatorio.

### 15.2 Ambigüedad semántica

¿Qué representa `cliente_id` para este lote?

- **Opción A:** El cliente de LeadMaster que recibirá los leads generados (ej: Haby, otro cliente). En este caso, los brokers de seguros serían leads para ese cliente, no prospectos de LeadMaster.
- **Opción B:** Un `cliente_id` que representa a **LeadMaster como su propio cliente** (LeadMaster construyendo su base comercial). Los brokers son prospectos directos de LeadMaster.

Para LM-003A-C, la interpretación correcta es la **Opción B**.

### 15.3 Opciones

| Opción | Descripción | Riesgo |
|--------|-------------|--------|
| **1. Usar `cliente_id` existente** (52 o 1268) | Mezclar prospectos de seguros con prospectos de otros clientes | Contaminación de datos. Difícil segregar después. |
| **2. Crear `cliente_id` específico para LeadMaster** | Un ID nuevo que represente "LeadMaster como cliente de sí mismo" | Requiere crear registro en tabla de clientes si existe FK. |
| **3. No sincronizar a staging hasta definir esto** | Mantener los prospectos solo en `la_prospectos` hasta tener claridad | Bloquea el pipeline. No se puede enriquecer ni exportar. |

**Recomendación del plan:** Opción 2 (crear `cliente_id` específico), pero requiere decisión explícita de Alberto.

---

## 16. Archivos propuestos para fases posteriores

### 16.1 Evaluación por archivo

| Archivo | ¿Conviene? | Orden | Justificación |
|---------|:---:|:---:|---------------|
| `config/seed_ll_keywords_leadmaster_seguros.sql` | **Sí** | 1 | Seed idempotente con keywords operativas expandidas. Es el entregable principal para empezar a buscar. |
| `config/migration_lm003a_add_tipo_actor_plaza.sql` | **Sí** | 2 | Agregar `tipo_actor` y `plaza` a `la_stg_prospectos`. Facilita clasificación y filtrado post-captura. |
| `config/query_lote_seguros_candidatos.sql` | **Sí** | 3 | Consulta SQL para detectar candidatos en datos existentes antes de hacer scraping nuevo. |
| `scripts/report-seguros-candidatos.js` | **Sí** | 4 | Script Node que ejecuta la consulta SQL y aplica reglas de clasificación automática. |
| `config/migration_lm003a_create_ll_plazas_leadmaster.sql` | **Sí** | 5 | DDL de la tabla de plazas. Necesario antes de importar datos territoriales. |
| `scripts/import-plazas-georef.js` | **Sí** | 6 | Script para importar localidades desde Georef Argentina a `ll_plazas_leadmaster`. |
| `config/seed_ll_plazas_leadmaster_argentina.sql` | **No** | — | Preferible script Node sobre SQL estático. Los datos de Georef se actualizan. |
| `scripts/generate-keywords-from-plazas.js` | **Sí** | 7 | Script para generar keywords operativas combinando bases × plazas activas. |
| `scripts/enrich-plazas-poblacion-indec.js` | **Evaluar** | 8 | Opcional. Cruce con INDEC es complejo. Solo si hay valor comercial claro. |
| `exports/lm-003a-c-lote-candidato-seguros.csv` | **Sí** | 9 | Output del script de reporte. CSV para revisión manual en Excel/Sheets. |
| `docs/reportes/2026-07-04-lm-003a-c-lote-candidato-seguros.md` | **Sí** | 10 | Informe post-captura con resultados del lote. |

### 16.2 Orden recomendado de creación

```
Fase actual (plan):    docs/reportes/2026-07-04-lm-003a-c-plan-maestro-seguros.md ← ESTE ARCHIVO
                       │
Fase 1 (seed):         config/seed_ll_keywords_leadmaster_seguros.sql
                       │
Fase 2 (migration):    config/migration_lm003a_add_tipo_actor_plaza.sql
                       │
Fase 3 (detección):    config/query_lote_seguros_candidatos.sql
                       scripts/report-seguros-candidatos.js
                       │
Fase 4 (scraping):     Ejecutar run-db-batch.js con keywords de seguros
                       │
Fase 5 (pipeline):     sync-stg → enrich-contact → enrich-nom → reporte candidatos
                       │
Fase 6 (territorial):  config/migration_lm003a_create_ll_plazas_leadmaster.sql
                       scripts/import-plazas-georef.js
                       scripts/generate-keywords-from-plazas.js
                       │
Fase 7 (expansión):    Segunda tanda con más plazas y keywords
```

---

## 17. Procedimiento operativo futuro

Una vez aprobado este plan, el procedimiento sería:

| Paso | Acción | Responsable | Dependencia |
|:---:|--------|-------------|-------------|
| 1 | Revisar y aprobar este plan | Alberto | — |
| 2 | Decidir `cliente_id` para el lote | Alberto | Paso 1 |
| 3 | Crear seed SQL de keywords seguros (estado `pausada`) | Agente | Paso 1 |
| 4 | Ejecutar seed SQL en `iunaorg_dyd` | Alberto/Agente | Paso 3 |
| 5 | Verificar keywords cargadas: `SELECT * FROM ll_keywords_leadmaster WHERE origen='LM-003A-C-seguros'` | Agente | Paso 4 |
| 6 | Activar primera tanda: `UPDATE ... SET estado='activa' WHERE prioridad='alta'` | Alberto/Agente | Paso 5 |
| 7 | Ejecutar dry-run: `npm run db:batch -- --origen LM-003A-C-seguros --prioridad alta --limit 5 --dry-run` | Agente | Paso 6 |
| 8 | Si dry-run OK, ejecutar captura controlada: `npm run db:batch -- --origen LM-003A-C-seguros --prioridad alta --limit 5 --target 2 --manual` | Alberto | Paso 7 |
| 9 | Sincronizar a staging: `node scripts/sync-stg-prospectos.js --cliente-id <ID>` | Agente | Paso 2, 8 |
| 10 | Enriquecer contactos: `npm run stg:enrich-contact -- --prospecto-from X --prospecto-to Y --limit 50` | Agente | Paso 9 |
| 11 | Enriquecer nombres: `npm run stg:enrich-nom -- --limit 50` | Agente | Paso 10 |
| 12 | Generar reporte de candidatos: `node scripts/report-seguros-candidatos.js` | Agente | Paso 11 |
| 13 | Exportar CSV para revisión manual | Agente | Paso 12 |
| 14 | Revisar y clasificar manualmente | Alberto | Paso 13 |
| 15 | Validar `contacto_estado` en staging | Alberto | Paso 14 |
| 16 | Preparar lote comercial final (80-110 prospectos) | Agente/Alberto | Paso 15 |
| 17 | Exportar a Dolibarr (cuando exista script) | Agente | Paso 16 |

---

## 18. Comandos propuestos

### 18.1 Comandos reales del `package.json`

```bash
# Verificar estado general
npm run db:status

# Ver últimos prospectos
npm run db:view

# Dry-run del batch de seguros (sin scraper, sin escritura)
npm run db:batch -- --origen LM-003A-C-seguros --prioridad alta --limit 5 --target 2 --dry-run

# Ejecución real controlada (con scraper local, modo manual)
npm run db:batch -- --origen LM-003A-C-seguros --prioridad alta --limit 5 --target 2 --manual

# Sincronizar prospectos a staging (requiere --cliente-id aprobado)
node scripts/sync-stg-prospectos.js --cliente-id <CLIENTE_ID>

# Enriquecer contactos desde landing
npm run stg:enrich-contact -- --limit 50 --no-overwrite

# Enriquecer nombres desde landing
npm run stg:enrich-nom -- --limit 50

# Generar reporte de candidatos (script futuro)
node scripts/report-seguros-candidatos.js

# Verificar keywords cargadas (SQL directo)
# SELECT id, keyword, prioridad, estado FROM ll_keywords_leadmaster WHERE origen='LM-003A-C-seguros' ORDER BY prioridad, id;

# Activar primera tanda (SQL directo)
# UPDATE ll_keywords_leadmaster SET estado='activa' WHERE origen='LM-003A-C-seguros' AND prioridad='alta';

# Pausar todo el lote (SQL directo, rollback)
# UPDATE ll_keywords_leadmaster SET estado='pausada' WHERE origen='LM-003A-C-seguros';
```

### 18.2 Variantes para dry-run seguro

```bash
# Dry-run con 1 keyword (mínimo riesgo)
npm run db:batch -- --origen LM-003A-C-seguros --prioridad alta --limit 1 --target 1 --dry-run

# Dry-run viendo todas las keywords que se ejecutarían
npm run db:batch -- --origen LM-003A-C-seguros --limit 100 --dry-run
```

---

## 19. Riesgos

### 19.1 Riesgos de clasificación

| Riesgo | Severidad | Mitigación |
|--------|:---:|------------|
| **Mezclar compradores de seguros con vendedores/intermediarios** | **Alta** | Keywords base diseñadas para atraer vendedores, no compradores. Clasificación manual post-captura. Reglas de descarte explícitas. |
| **Keywords demasiado genéricas** | Media | Priorizar keywords B2B explícitas. Evitar "seguro de auto", "seguro hogar", etc. |
| **Plazas ambiguas sin provincia en `nombre_busqueda`** | Media | Usar nombres compuestos: "Rosario Santa Fe", no solo "Rosario". Validar en seed SQL. |
| **Scraping accidental por keywords activas antes de revisión** | **Alta** | Insertar con `estado='pausada'`. Activar solo tras revisión explícita. |

### 19.2 Riesgos técnicos

| Riesgo | Severidad | Mitigación |
|--------|:---:|------------|
| **Falta de filtro `--sector` en `run-db-batch.js`** | Media | Usar `--origen` como filtro principal. Agregar `--sector` en fase futura. |
| **Duplicados por dominio** (misma empresa con distintas keywords) | Media | La deduplicación del pipeline (`keyword + url_landing_hash`) mitiga parcialmente. Revisión manual post-captura. |
| **Duplicados por email/teléfono** | Baja | 19 grupos de email duplicados ya existen en staging. Gestionar en fase de depuración. |
| **Contactos incompletos** (HTTP 429, fetch fallido) | Media | Ejecutar enriquecimiento con `--no-overwrite`, reintentar con delays. |
| **Sobrescribir correcciones manuales en staging** | Media | Usar `--no-overwrite` en enrich-scripts. No re-sync sin control de rango. |

### 19.3 Riesgos operativos

| Riesgo | Severidad | Mitigación |
|--------|:---:|------------|
| **No tener `cliente_id` definido** | **Alta** | Decisión pendiente explícita en sección 20. No avanzar a sync sin esto. |
| **Generar lote grande pero comercialmente débil** | Media | Primera tanda controlada (48 keywords, ~96 capturas objetivo). Validar calidad antes de expandir. |
| **Importar base territorial sin criterio comercial de activación** | Media | La tabla `ll_plazas_leadmaster` incluye `activa` y `estado` desde el diseño. Solo se generan keywords para plazas activadas. |

---

## 20. Decisiones pendientes

Las siguientes decisiones requieren aprobación explícita de Alberto antes de avanzar a la fase de implementación:

| # | Decisión | Opciones | Recomendación del plan |
|---|----------|----------|------------------------|
| 1 | **`cliente_id` a usar para el lote** | a) Existente (52 o 1268) b) Nuevo específico para LeadMaster c) No sync hasta definir | **b) Nuevo específico** |
| 2 | **¿Crear tabla `ll_plazas_leadmaster`?** | a) Sí, en fase 6 b) No, mantener plazas en seeds | **a) Sí, en fase 6** (no bloquea la primera tanda) |
| 3 | **¿Importar base oficial de ciudades/localidades?** | a) Sí, desde Georef Argentina b) No, usar lista manual curada | **a) Georef Argentina** (datos oficiales, mantenibles) |
| 4 | **Fuente territorial a usar primero** | a) Georef Argentina b) INDEC c) Ambas | **a) Georef Argentina** (más simple, ya incluye coordenadas) |
| 5 | **¿Incorporar población en esta etapa?** | a) Sí b) No, en fase posterior | **b) No** (requiere cruce complejo, postergar a fase 8) |
| 6 | **Estado inicial de las keywords** | a) `pausada` b) `pendiente` | **a) `pausada`** (más seguro, explícitamente no activas) |
| 7 | **¿Agregar soporte `--sector` a `run-db-batch.js`?** | a) Sí, ahora b) Sí, en fase futura c) No | **b) Sí, en fase futura** (no bloquea, `--origen` alcanza) |
| 8 | **¿Crear carpeta `exports/`?** | a) Sí b) No | **a) Sí** (para CSV de reportes) |
| 9 | **Formato del reporte candidato** | a) Solo SQL b) Solo script Node c) Ambos | **c) Ambos** (SQL para inspección rápida, Node para clasificación + CSV) |
| 10 | **¿Crear migración para `tipo_actor` y `plaza`?** | a) Sí, en fase 2 b) No, usar metadata JSON c) Postergar | **a) Sí, en fase 2** (columnas dedicadas facilitan queries y reportes) |
| 11 | **¿Scraping nuevo o solo detección sobre datos existentes?** | a) Solo detección primero b) Ambos en paralelo c) Directo a scraping | **a) Solo detección primero** (aprovechar datos ya capturados antes de invertir en nuevo scraping) |
| 12 | **Plazas en primera tanda** | a) 6 plazas (CABA, Zona Norte, La Plata, Rosario, Córdoba, Mendoza) b) Menos c) Más | **a) 6 plazas** |
| 13 | **Keywords base en primera tanda** | a) 8 de alta prioridad b) 16 de alta prioridad c) Alta + media | **a) 8 de alta prioridad** (primera prueba controlada) |
| 14 | **Capturas objetivo por keyword (`--target`)** | a) 2 b) 3 c) 1 | **a) 2** (balance entre cobertura y volumen) |

---

## 21. Propuesta de implementación por pasos

### Paso 1 — Aprobar este plan (HOY)
- Revisar sección 20 "Decisiones pendientes".
- Responder las 14 decisiones.
- Una vez aprobado, pasar a Paso 2.

### Paso 2 — Detección sobre datos existentes (1 día)
- Crear `config/query_lote_seguros_candidatos.sql`.
- Ejecutar consulta contra la DB actual.
- Clasificar manualmente los candidatos detectados (~9-15 estimados).
- Documentar hallazgos.
- **No requiere scraping nuevo.**

### Paso 3 — Preparar seed de keywords seguros (1 día)
- Crear `config/seed_ll_keywords_leadmaster_seguros.sql`.
- Incluir 48 keywords operativas (8 bases × 6 plazas) con `estado='pausada'`.
- Incluir ~96 keywords adicionales (8 bases media × 6 plazas) con `estado='pausada'`, `prioridad='media'`.
- Validar `keyword_hash` en cada INSERT.
- Ejecutar seed en DB.

### Paso 4 — Activar y ejecutar primera tanda (1-2 días)
- Activar solo keywords de alta prioridad.
- Dry-run con `--limit 3`.
- Si OK, ejecutar captura controlada con `--limit 5 --target 2 --manual`.
- Ejecutar en bloques de 5 keywords para no saturar.

### Paso 5 — Pipeline de enriquecimiento (1 día)
- Sync a staging con `cliente_id` aprobado.
- Enrich contactos.
- Enrich nombres.
- Generar reporte de candidatos.

### Paso 6 — Revisión manual y lote final (2-3 días)
- Revisar CSV de candidatos.
- Clasificar `contacto_estado`.
- Depurar duplicados.
- Seleccionar 80-110 prospectos de mayor calidad.
- Preparar lote comercial.

### Paso 7 — Infraestructura territorial (fase posterior)
- Crear `ll_plazas_leadmaster`.
- Importar Georef.
- Activar plazas.
- Crear `scripts/generate-keywords-from-plazas.js`.
- Preparar segunda tanda expandida.

---

## 22. Cierre

Este plan maestro define la estrategia completa para construir el lote LM-003A-C de prospectos LeadMaster de la vertical seguros.

**Principios rectores:**
1. El prospecto es el vendedor/intermediario de seguros, no el comprador.
2. Seguridad primero: keywords en `pausada`, dry-run antes de scraping real.
3. Geolocalización desde el inicio: todas las keywords incluyen plaza.
4. Escalabilidad: la tabla `ll_plazas_leadmaster` se diseña ahora, se implementa después.
5. Clasificación en dos capas: automática (señales) + manual (revisión humana).

**Próximo paso inmediato:** Revisión y aprobación de las 14 decisiones pendientes (sección 20) por parte de Alberto.

---

*Documento generado en modo plan. No se ejecutó SQL, no se ejecutó scraping, no se modificó base de datos, no se crearon seeds ni migraciones.*
