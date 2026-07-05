# Reporte: Seed Keywords Seguros — LM-003A-B

**Path destino:** `docs/reportes/2026-07-04-lm-003a-c-seed-keywords-seguros.md`

**Fecha:** 2026-07-04
**Plano principal:** AS-IS IMPLEMENTADO (tabla `ll_keywords_leadmaster` detectada en producción) / NO VERIFICADO (schema exacto inferido de documentos, no de CREATE TABLE)
**Modo:** Solo lectura. No se ejecutó SQL. No se crearon tablas. No se hizo scraping.
**Artifacto asociado:** `config/seed_ll_keywords_leadmaster_seguros.sql`

---

## 1. Objetivo

Crear un seed SQL inicial de keywords para la vertical seguros, orientado al bloque LM-003A-B — Brokers / productores / organizadores. El seed alimenta búsquedas de empresas vinculadas a seguros que puedan ser clientes potenciales de LeadMaster.

---

## 2. Archivos y tablas revisados

### 2.1 Documentación

| Archivo | Tipo | Relevancia |
|---|---|---|
| `docs/05-REPORTES/2026-06/ANALISIS-ATRIBUCION-KEYWORDS-LM-002-2026-06-28.md` | Diagnóstico | Define estructura inferida de `ll_keywords_leadmaster`, estado huérfano, columnas conocidas |
| `docs/05-REPORTES/2026-06/AUDITORIA-LM-003A-SOLO-LECTURA-2026-06-29.md` | Auditoría | Confirma tabla huérfana, lista campos faltantes para trazabilidad |
| `docs/05-REPORTES/2026-06/PROPUESTA-TECNICA-TRAZABILIDAD-LM-003A-2026-06-29.md` | Propuesta | Diseña `keyword_id`, `vertical`, `subcampania` en `ll_envios_email` |
| `docs/05-REPORTES/2026-07/CHECKLIST-CIERRE-ETAPA-1-LM-003A-2026-07-04.md` | Checklist | Próxima acción: "selección de keywords" como paso de Etapa 2 |

### 2.2 Código / SQL

| Archivo | Tipo | Relevancia |
|---|---|---|
| `services/central-hub/db/migrations/010_add_campaign_attribution_to_ll_envios_email.sql` | Migración | Agrega `keyword_id`, `palabra_clave`, `vertical` a `ll_envios_email` |
| `services/central-hub/src/modules/email/services/emailCampaignRecipients.service.js` | Servicio | Lee/escribe `keyword_id`, `palabra_clave`, `vertical` en envíos email |
| `services/central-hub/src/modules/sender/controllers/prospectosController.js` | Controlador | LEFT JOIN con `la_prospectos` y `la_stg_prospectos`; emite `NULL AS vertical` |
| `services/central-hub/src/modules/sender/routes/rubros.js` | Ruta | Placeholder — `GET /status` retorna `{ status: 'rubros ok' }` |
| `docs/sql/LM-003A-ll_tracking_events.sql` | SQL | Tabla de eventos de tracking, no relacionada con keywords |

### 2.3 Directorios externos

| Path | Estado |
|---|---|
| `/mnt/SSD_HOME/beto/Documentos/Github/prospectos-leadmaster-local` | **No existe / inaccesible** desde este entorno |

### 2.4 Tablas mencionadas en el prompt

| Tabla | En código | Estado |
|---|---|---|
| `iunaorg_dyd.la_prospectos` | Sí (`prospectosController.js` LEFT JOIN) | AS-IS IMPLEMENTADO — 171 filas, usada para Google Ads `url_landing` |
| `la_stg_prospectos` | Sí (`staging.service.js`, `prospectosController.js`) | AS-IS IMPLEMENTADO — tabla principal de staging |
| `la_stg_prospectos_contactos` | **No encontrada** | No hay referencias en código ni documentación del repositorio |

---

## 3. Tabla destino detectada

### 3.1 Tabla candidata: `ll_keywords_leadmaster`

**Estado:** Existe en producción (base `iunaorg_dyd`), **huérfana** — cero referencias en código del repositorio.

**Columnas inferidas de documentación** (fuente: `ANALISIS-ATRIBUCION-KEYWORDS-LM-002-2026-06-28.md`, consulta `DESCRIBE` sugerida):

| Columna | Tipo inferido | Descripción |
|---|---|---|
| `id` | INT (PK) | Identificador único |
| `keyword` | VARCHAR | Palabra clave de búsqueda |
| `keyword_hash` | VARCHAR | Hash de la keyword (algoritmo desconocido) |
| `sector` | VARCHAR | Sector/vertical (ej. "seguros") |
| `perfil` | VARCHAR | Perfil o categoría |
| `prioridad` | INT | Prioridad numérica |
| `estado` | VARCHAR | Estado (activa/inactiva) |
| `origen` | VARCHAR | Fuente de la keyword |
| `notas` | TEXT | Notas adicionales |
| `veces_buscada` | INT | Contador de búsquedas |
| `ultima_busqueda_at` | DATETIME | Última búsqueda |
| `created_at` | DATETIME | Fecha de creación |
| `updated_at` | DATETIME | Fecha de actualización |

### 3.2 Columnas NO presentes en `ll_keywords_leadmaster`

Los siguientes campos solicitados en el prompt **no existen** como columnas en `ll_keywords_leadmaster` según el esquema inferido:

| Campo solicitado | Dónde se mapeó | Columna usada |
|---|---|---|
| `vertical` | → `sector` | `'seguros'` |
| `bloque` | → `notas` (prefijo estructurado) | `bloque=LM-003A-B \| ...` |
| `categoria_intencion` | → `perfil` | `A` / `B` / `C` / `D` / `E` |
| `activa` / `activo` | → `estado` | `'activa'` |
| `fuente` | → `origen` | `'seed_manual'` |

### 3.3 Alternativa considerada y descartada

`ll_envios_email` ya tiene columnas `keyword_id`, `palabra_clave` y `vertical` (migración 010), pero es una tabla de envíos, no un catálogo de keywords. Poblar keywords directamente allí no es correcto semánticamente.

---

## 4. Criterio de idempotencia

**Estrategia usada:** `INSERT IGNORE`

**Fundamento:**
- Se presume que `ll_keywords_leadmaster` tiene al menos una restricción UNIQUE sobre `keyword` o `keyword_hash` (patrón estándar para catálogos de keywords).
- `INSERT IGNORE` omite silenciosamente las filas que violen restricciones UNIQUE, haciendo el seed repetible sin errores.
- Es la opción de menor riesgo porque no requiere conocer las claves exactas.

**Alternativas consideradas:**

| Estrategia | Riesgo | Por qué no se usó |
|---|---|---|
| `ON DUPLICATE KEY UPDATE` | Medio | Requiere conocer la(s) UNIQUE KEY(s) exacta(s). Con el schema inferido, es riesgoso asumir. |
| `DELETE` por sector + `INSERT` | Alto | Destructivo. Borraría otras keywords existentes en `sector = 'seguros'` que no sean de este seed. |
| `REPLACE INTO` | Alto | Destructivo. Si hay auto_increment, genera nuevos IDs. |

**Riesgo residual:** Si la tabla no tiene ninguna restricción UNIQUE sobre `keyword`, ejecuciones repetidas del seed duplicarán las filas. En ese caso, se recomienda agregar `ALTER TABLE ll_keywords_leadmaster ADD UNIQUE INDEX idx_keyword (keyword)` antes de ejecutar el seed.

---

## 5. Keywords generadas

**Total: 68 keywords**

### Distribución por categoría

| Cat. | Intención de búsqueda | Prioridad | Cantidad |
|---|---|---|---|
| **A** | Brokers y productores generales | 1 | 13 |
| **B** | Seguros para empresas / corporativos | 2 | 12 |
| **C** | Ramos con potencial B2B | 2 | 22 |
| **D** | Intención comercial / captación | 2 | 11 |
| **E** | Búsquedas locales Argentina | 3 | 10 |

### Distribución por prioridad

| Prioridad | Cantidad | % |
|---|---|---|
| 1 | 13 | 19.4% |
| 2 | 44 | 65.7% |
| 3 | 10 | 14.9% |

---

## 6. Mapeo de campos: usuario → tabla

```
vertical            → sector      = 'seguros'
bloque              → notas       = 'bloque=LM-003A-B | {categoria_desc}'
categoria_intencion → perfil      = 'A' | 'B' | 'C' | 'D' | 'E'
keyword             → keyword     = (texto de búsqueda)
prioridad           → prioridad   = 1 | 2 | 3
activa              → estado      = 'activa'
fuente              → origen      = 'seed_manual'
keyword_hash        → NULL        = (algoritmo desconocido)
created_at          → NOW()       = fecha de inserción
```

---

## 7. Advertencias y supuestos

### Advertencias críticas

1. **Schema inferido, no verificado.** Las columnas de `ll_keywords_leadmaster` se infirieron de documentos de diagnóstico, no de un `CREATE TABLE` presente en el repositorio. Antes de ejecutar el seed, **verificar el schema real** con `DESCRIBE ll_keywords_leadmaster` o `SHOW CREATE TABLE ll_keywords_leadmaster`.

2. **Tabla huérfana.** `ll_keywords_leadmaster` no es referenciada por ningún código en el repositorio. No tiene FK desde `ll_envios_email` (el campo `keyword_id` en `ll_envios_email` es NULLable y sin FK). Para que las keywords sean trazables en la cadena envío→eventos, se necesita una FK formal o al menos poblar `keyword_id` en `ll_envios_email` al momento del envío.

3. **`la_stg_prospectos_contactos` no encontrada.** Esta tabla mencionada en el prompt no tiene referencias en el código ni en la documentación del repositorio. Podría existir en producción con otro nombre o estar planeada.

4. **Directorio externo inaccesible.** `/mnt/SSD_HOME/beto/Documentos/Github/prospectos-leadmaster-local` no existe en este entorno. No se pudieron revisar los scripts allí mencionados.

5. **Ruta del reporte no canónica.** La ruta `docs/reportes/` no es la carpeta canónica de reportes según `docs/00-INDEX/DOCUMENTATION_RULES.md`. La ubicación canónica sería `docs/05-REPORTES/2026-07/`. Se usó la ruta especificada en el prompt para respetar la instrucción explícita.

6. **Nombre de archivo del reporte.** El prompt indica `lm-003a-c` en el nombre del reporte, pero el bloque activo es LM-003A-B. Se mantuvo el nombre exacto solicitado.

### Supuestos

1. La tabla `ll_keywords_leadmaster` tiene una UNIQUE KEY sobre `keyword` o `keyword_hash`.
2. Las columnas `sector`, `perfil`, `prioridad`, `estado`, `origen`, `notas`, `created_at` existen con los tipos esperados.
3. La base de datos es MySQL/MariaDB con motor InnoDB.
4. El seed se ejecutará contra la base `iunaorg_dyd` (la misma que usa el resto del sistema).

---

## 8. Comandos sugeridos para revisión manual

**NO EJECUTAR — solo referencia para revisión previa a la ejecución.**

### Bloque A — Verificar schema real

```sql
-- A1. Describir la tabla destino
DESCRIBE ll_keywords_leadmaster;

-- A2. Ver CREATE TABLE completo
SHOW CREATE TABLE ll_keywords_leadmaster;

-- A3. Verificar índices existentes
SHOW INDEX FROM ll_keywords_leadmaster;
```

### Bloque B — Verificar keywords existentes en seguros

```sql
-- B1. Keywords ya existentes con sector = 'seguros'
SELECT id, keyword, sector, perfil, prioridad, estado, origen
FROM ll_keywords_leadmaster
WHERE sector = 'seguros'
ORDER BY id;

-- B2. Contar keywords por sector
SELECT sector, COUNT(*) AS total
FROM ll_keywords_leadmaster
GROUP BY sector
ORDER BY total DESC;
```

### Bloque C — Post-ejecución (solo si se ejecuta el seed)

```sql
-- C1. Contar keywords insertadas
SELECT COUNT(*) AS total
FROM ll_keywords_leadmaster
WHERE sector = 'seguros' AND origen = 'seed_manual';

-- C2. Distribución por categoría y prioridad
SELECT perfil AS categoria, prioridad, COUNT(*) AS cantidad
FROM ll_keywords_leadmaster
WHERE sector = 'seguros' AND origen = 'seed_manual'
GROUP BY perfil, prioridad
ORDER BY prioridad, perfil;
```

---

## 9. Próximos pasos recomendados

1. **Verificar schema real** de `ll_keywords_leadmaster` con `DESCRIBE` antes de ejecutar el seed.
2. **Confirmar existencia de UNIQUE KEY** sobre `keyword` para garantizar idempotencia.
3. **Si el schema no coincide**, adaptar el mapeo de columnas en el SQL.
4. **Ejecutar el seed** una vez validado el schema.
5. **Vincular `ll_keywords_leadmaster` con `ll_envios_email`** a través de `keyword_id` para cerrar la trazabilidad (requiere modificación en `emailCampaignRecipients.service.js`).
6. **Investigar `la_stg_prospectos_contactos`** — no se encontró en el repositorio.
7. Avanzar a Etapa 2 del plan LM-003A (preparación de datos: búsqueda de empresas, evidencia Google Ads, carga en staging).

---

**Generado:** 2026-07-04
**Estado:** AS-IS IMPLEMENTADO (tabla destino detectada) / NO VERIFICADO (schema exacto)
**Nivel de certeza:** Medio — requiere verificación de schema antes de ejecutar.
