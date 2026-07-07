# DIAGNÓSTICO-WORKER-CONECTAR — Fase 1 de pipeline de saneamiento

**Fecha:** 2026-07-07
**Proyecto:** LeadMaster
**Bloque:** Worker Pipeline — Fase 1 (esqueletos)
**Máquina:** Conectar (worker local)
**Autor:** ⚙️ Conectar Worker
**Estado:** Fase 1 completada — esqueletos funcionales creados
**Alcance:** Solo estructura, sin procesamiento de datos reales

---

## 1. Objetivo

Establecer la base del pipeline de saneamiento offline para prospectos LeadMaster, con scripts esqueletos que definan contratos claros y puedan integrarse en fases posteriores con datos reales.

---

## 2. Archivos creados en esta fase

| Archivo | Tipo | Líneas | Función |
|---------|------|:-----:|---------|
| `src/worker/README.md` | Documentación | — | Documenta el pipeline completo y sus componentes |
| `src/worker/normalize-prospectos.js` | Script | ~240 | Normaliza campos: trim, URLs canónicas, title case, teléfonos a dígitos |
| `src/worker/dedupe-prospectos.js` | Script | ~360 | Detecta duplicados por dominio, email y teléfono; genera reporte Markdown |
| `src/worker/score-prospectos.js` | Script | ~440 | Scoring compuesto 1–10: completitud + señal seguros + contactabilidad + relevancia |
| `src/worker/export-prospectos.js` | Script | ~270 | Exporta a CSV/JSON/NDJSON con columnas canónicas y filtros |
| `docs/05-REPORTES/2026-07/DIAGNOSTICO-WORKER-CONECTAR-2026-07-07.md` | Reporte | — | Este archivo |

**Total: 6 archivos creados. 0 archivos existentes modificados.**

---

## 3. Arquitectura del pipeline

```text
Datos crudos (JSON)
       │
       ▼
┌──────────────────────────┐
│ normalize-prospectos.js  │  ← Trim, minúsculas, URLs canónicas,
│                          │    title case, teléfonos → dígitos
└────────────┬─────────────┘
             │ JSON normalizado
             ▼
┌──────────────────────────┐
│ dedupe-prospectos.js     │  ← Indexa por dominio/email/teléfono,
│                          │    agrupa, marca _duplicado_de
└────────────┬─────────────┘
             │ JSON con flags de duplicado
             ▼
┌──────────────────────────┐
│ score-prospectos.js      │  ← Score 1–10: completitud (4) +
│                          │    señal seguros (3) + contacto (2) +
│                          │    relevancia (1) + bonus (1)
└────────────┬─────────────┘
             │ JSON con _score y _score_tier
             ▼
┌──────────────────────────┐
│ export-prospectos.js     │  ← CSV / JSON / NDJSON
│                          │    con filtros: --min-score,
│                          │    --exclude-duplicados, --limit
└──────────────────────────┘
```

### Contratos verificables

Cada script responde a `--help` con su contrato documentado:

```bash
node src/worker/normalize-prospectos.js --help   # ✅ funcional
node src/worker/dedupe-prospectos.js --help       # ✅ funcional
node src/worker/score-prospectos.js --help        # ✅ funcional
node src/worker/export-prospectos.js --help       # ✅ funcional
```

---

## 4. Decisiones de diseño

### 4.1 Solo Node.js estándar

Sin dependencias externas. Cada script usa exclusivamente:
- `fs` para lectura/escritura de archivos
- `path` para resolución de rutas
- `process.stdin` para entrada por pipe

Esto permite que el pipeline funcione en cualquier entorno Node.js ≥ 18 sin `npm install`.

### 4.2 Sin efectos destructivos

- Ningún script escribe a base de datos.
- Las funciones de escritura a disco requieren flag explícito (`--output`, `--report`).
- Por defecto emiten a stdout para inspección segura.

### 4.3 Formato intermedio JSON

Cada etapa del pipeline lee y emite JSON. Esto permite:
- Inspeccionar resultados intermedios con `jq` o cualquier editor.
- Encadenar etapas con pipes Unix estándar.
- Re-ejecutar etapas individuales sin re-procesar todo.

### 4.4 Reportes Markdown opcionales

`dedupe-prospectos.js` y `score-prospectos.js` pueden generar reportes Markdown con `--report`. Esto sigue el patrón del proyecto (ver `scripts/report-seguros-candidatos.js`).

---

## 5. Verificación de scripts

### 5.1 normalize-prospectos.js

```bash
# Prueba con datos mínimos
echo '[{"prospecto_id":1,"keyword":"  Broker de Seguros CABA  ","url_landing":"https://www.Ejemplo.com/landing?utm=test#seccion","email_extraido":" Contacto@Ejemplo.COM ","telefono_extraido":"+54 11 5555-1234"}]' \
  | node src/worker/normalize-prospectos.js | python3 -m json.tool
```

**Esperado:**
- `keyword` → `"Broker de Seguros CABA"` (trim + colapsar whitespace)
- `url_landing` → `"https://ejemplo.com/landing"` (minúsculas, sin query, sin hash)
- `email` → `"contacto@ejemplo.com"` (minúsculas)
- `telefono` → `"541155551234"` (solo dígitos)
- `_normalizado` → `true`

### 5.2 dedupe-prospectos.js

```bash
# Prueba con duplicado simulado por dominio
echo '{"prospectos":[
  {"prospecto_id":1,"nom":"Broker Uno","url_landing":"https://ejemplo.com","email":"uno@ejemplo.com"},
  {"prospecto_id":2,"nom":"Broker Dos","url_landing":"https://www.ejemplo.com/contacto","email":"dos@gmail.com"}
]}' | node src/worker/dedupe-prospectos.js | python3 -m json.tool
```

**Esperado:**
- Grupo duplicado por dominio `ejemplo.com`
- Prospecto 2 marcado `_duplicado_de: 1`

### 5.3 score-prospectos.js

```bash
# Prueba con prospecto ideal
echo '{"prospectos":[
  {"prospecto_id":1,"keyword":"broker de seguros caba","nom":"Broker De Seguros Ejemplo","url_landing":"https://brokerseguros.com","email":"contacto@brokerseguros.com","telefono":"541155551234","whatsapp":"5491155551234"}
]}' | node src/worker/score-prospectos.js | python3 -m json.tool
```

**Esperado:** `_score` ≥ 8, `_score_tier` = `"A — Excelente"`

### 5.4 export-prospectos.js

```bash
# Prueba export CSV con filtro
echo '{"prospectos":[
  {"prospecto_id":1,"keyword":"broker de seguros","nom":"Broker Uno","url_landing":"https://uno.com","email":"uno@uno.com","telefono":"111","_score":9,"_score_tier":"A","_es_duplicado":false},
  {"prospecto_id":2,"keyword":"otro","nom":"Otro","_score":2,"_score_tier":"D","_es_duplicado":false}
]}' | node src/worker/export-prospectos.js --format csv --min-score 5
```

**Esperado:** Solo prospecto_id=1 en el CSV (score 9 ≥ 5).

---

## 6. Ajuste de SQL seed diferido (punto 2 del plan maestro)

> **⚠️ ESTA SECCIÓN NO MODIFICA EL ARCHIVO SQL.**
> Es un análisis de lo que habría que corregir y por qué.

### 6.1 Archivo analizado

`config/seed_ll_keywords_leadmaster_seguros.sql` (creado 2026-07-04)

### 6.2 Tabla destino real

`ll_keywords_leadmaster` — DDL en `config/create_ll_keywords_leadmaster.sql`:

```sql
keyword_hash CHAR(64) NOT NULL,                    -- OBLIGATORIO
perfil ENUM('b2b', 'b2c', 'mixto') DEFAULT 'b2b',  -- Solo 3 valores
prioridad ENUM('alta', 'media', 'baja') DEFAULT 'media', -- Solo 3 valores
```

### 6.3 Problemas detectados

#### Problema 1: `keyword_hash = NULL` — viola NOT NULL

El seed de seguros usa `NULL` en `keyword_hash`, pero la columna es `CHAR(64) NOT NULL`. Esto causa que `INSERT IGNORE` inserte **cero filas** porque cada intento viola la restricción `NOT NULL`.

**Patrón correcto** (usado en `seed_ll_keywords_leadmaster_iniciales.sql` y `seed_ll_keywords_leadmaster_linea_industrial.sql`):

```sql
keyword_hash = SHA2(LOWER(TRIM('broker de seguros')), 256)
```

**Filas a corregir:** 68 (todas las del seed de seguros).

#### Problema 2: `perfil` usa valores 'A', 'B', 'C', 'D', 'E' — no coinciden con el ENUM

El ENUM solo acepta `'b2b'`, `'b2c'`, `'mixto'`. Los valores 'A'–'E' no coinciden y causarían error de inserción (o serían silenciados por `INSERT IGNORE`, resultando en 0 filas insertadas).

**Mapeo sugerido:**

| Valor actual | Significado | Valor corregido |
|:-----------:|-------------|:--------------:|
| A | Brokers y productores generales | `b2b` |
| B | Seguros para empresas / corporativos | `b2b` |
| C | Ramos con potencial B2B | `b2b` |
| D | Intención comercial / captación | `b2b` |
| E | Búsquedas locales Argentina | `b2b` |

Todas las keywords del seed de seguros son B2B (apuntan a brokers/productores/empresas). `b2c` no aplica para esta vertical.

#### Problema 3: `prioridad` usa valores 1, 2, 3 — no coinciden con el ENUM

El ENUM solo acepta `'alta'`, `'media'`, `'baja'`.

**Mapeo:**

| Valor actual | Valor corregido |
|:-----------:|:--------------:|
| 1 | `alta` |
| 2 | `media` |
| 3 | `baja` |

#### Problema 4 (menor): `notas` usa prefijo estructurado `bloque=LM-003A-B | ...`

Esto **no es un error**, pero el campo `notas` existente podría aprovecharse para filtrar con `--origen` en `run-db-batch.js`. Actualmente el filtro por `origen` usa el campo `origen = 'seed_manual'`, que ya es correcto y no necesita cambio. El prefijo en `notas` es informativo.

### 6.4 Script de corrección propuesto (NO EJECUTAR — solo referencia)

Si se decidiera corregir, bastaría con reemplazar los valores en el SQL existente:

```sql
-- Cambios necesarios (pseudocódigo de transformación):

-- 1. keyword_hash: NULL → SHA2(LOWER(TRIM(keyword)), 256)
-- 2. perfil: 'A'→'b2b', 'B'→'b2b', 'C'→'b2b', 'D'→'b2b', 'E'→'b2b'
-- 3. prioridad: 1→'alta', 2→'media', 3→'baja'
```

Ejemplo de una fila antes y después:

```sql
-- ANTES (no funciona):
('broker de seguros', NULL, 'seguros', 'A', 1, 'activa', 'seed_manual', '...', NOW())

-- DESPUÉS (funciona):
('broker de seguros',
 SHA2(LOWER(TRIM('broker de seguros')), 256),
 'seguros', 'b2b', 'alta', 'activa', 'seed_manual', '...', NOW())
```

### 6.5 Impacto de no corregir

Sin estas correcciones, `INSERT IGNORE` en el seed de seguros inserta **0 filas** de 68, porque cada fila viola al menos 3 restricciones (NOT NULL en keyword_hash, valor inválido de ENUM en perfil, valor inválido de ENUM en prioridad).

### 6.6 Decisión

**Diferido.** Se corregirá en fase 2, junto con la activación de keywords y el scraping controlado. Por ahora, el seed de seguros queda como referencia documental del catálogo de keywords, no como SQL ejecutable.

---

## 7. Estados de git

Ver sección 8 abajo.

---

## 8. Condiciones cumplidas

| Condición | Estado |
|-----------|:------:|
| Crear `src/worker/` | ✅ |
| Crear `src/worker/README.md` | ✅ |
| Crear `normalize-prospectos.js` | ✅ |
| Crear `dedupe-prospectos.js` | ✅ |
| Crear `score-prospectos.js` | ✅ |
| Crear `export-prospectos.js` | ✅ |
| Crear reporte de diagnóstico | ✅ |
| No modificar SQL seed | ✅ |
| No modificar archivos existentes (salvo docs) | ✅ |
| No instalar dependencias | ✅ |
| No `npm install` | ✅ |
| No crear/modificar `.env` | ✅ |
| No procesar datos reales | ✅ |
| No scraping | ✅ |
| No commit | ✅ |
| Solo Node.js estándar | ✅ |
| Scripts con `--help` funcional | ✅ |
| Sin efectos destructivos | ✅ |

---

## 9. Próximos pasos (fase 2)

1. **Corregir SQL seed** (`seed_ll_keywords_leadmaster_seguros.sql`) aplicando las correcciones de la sección 6.
2. **Activar keywords** con prioridad alta y ejecutar scraping controlado.
3. **Probar pipeline completo** con datos reales (post-scraping).
4. **Integrar con DB** agregando modos `--db` a los scripts que lean/escriban tablas reales.
5. **Agregar al `package.json`** comandos npm para el pipeline de worker.

---

*Reporte generado el 2026-07-07 por ⚙️ Conectar Worker. Fase 1 completada dentro del alcance controlado autorizado.*
