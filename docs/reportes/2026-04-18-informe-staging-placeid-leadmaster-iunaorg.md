# Informe técnico: staging de prospectos y estrategia de `place_id` para integración LeadMaster → iunaorg

**Fecha:** 2026-04-18  
Fecha: 2026-04-18  
**Proyecto:** LeadMaster / Integración iunaorg_dyd  
**Autor:** GitHub Copilot (GPT-5.3-Codex)  
**Estado:** Borrador

---

## 📋 Resumen Ejecutivo

Se definió y validó una arquitectura de integración en tres etapas para normalizar leads de `leadmaster.prospectos` antes de su importación al esquema `iunaorg_dyd`. La decisión principal fue crear una tabla intermedia `leadmaster.stg_prospectos` con `place_id` nullable, de modo que el enriquecimiento con Google Places se realice posteriormente, sin bloquear la carga inicial de prospectos.

La validación técnica en servidor confirmó: (1) existencia de `leadmaster` como base activa de origen, (2) creación correcta de `stg_prospectos`, y (3) necesidad de resolver `place_id` antes de insertar en `iunaorg_dyd.ll_lugares` por su restricción funcional (identidad del lugar basada en `place_id`). También se alineó el vínculo de negocio: todos los registros del flujo deben asociarse a `ll_usuarios.cliente_id` (caso actual: `52`).

## 🎯 Objetivo

Documentar en detalle el diseño acordado, estado actual y próximos pasos para:

1. Procesar `leadmaster.prospectos` en una capa de staging.
2. Completar `place_id` mediante consultas de Google Places desde el proyecto `desarrolloydisenio-api`.
3. Importar de forma trazable y consistente a `iunaorg_dyd` (`ll_lugares`, `llxbx_societe`, `ll_societe_extended`, `ll_lugares_clientes`).

## 🔍 Contexto / Antecedentes

Durante el análisis se detectaron estos puntos críticos:

- El scraping/captura puede originarse localmente, pero el OCR puede ejecutarse en el VPS según `API_URL`.
- `iunaorg_dyd.ll_lugares` requiere un `place_id` operativo para evitar datos ambiguos y duplicidades de dirección.
- Las direcciones pueden variar en formato para un mismo comercio; el identificador estable debe ser `place_id`.
- La trazabilidad por cliente es obligatoria: cada prospecto debe quedar asociado a `ll_usuarios.cliente_id`.

Además, se acordó explícitamente que la tabla staging debía vivir en **esta** base local del servidor (`leadmaster`), no en `iunaorg_dyd`.

## 📊 Desarrollo / Análisis

### 1. Decisión de modelo de datos (staging)

Se adoptó la tabla:

- `leadmaster.stg_prospectos`

Con campo clave:

- `place_id` **nullable**, para completar en una etapa posterior de enriquecimiento.

Motivación:

- Evitar acoplar la ingesta inicial de prospectos al tiempo/disponibilidad de Google Places.
- Permitir retries y control de errores (`estado`, `error_msg`) sin perder trazabilidad.

### 2. Flujo objetivo por etapas

#### Etapa A — Ingesta a staging

Desde `leadmaster.prospectos` se pueblan columnas base en `leadmaster.stg_prospectos`:

- `prospecto_id`, `cliente_id`, `ref_ext`, `palabra_clave`, `url_landing`, `texto_extraido`
- `place_id = NULL`
- `estado = 'pendiente_place_id'`

#### Etapa B — Enriquecimiento de `place_id`

El `place_id` se resuelve mediante Google Places usando `desarrolloydisenio-api` (que ya tiene scripts/flujo para Places y uso de `GOOGLE_API_KEY`).

Regla operativa:

- Si hay match confiable → `place_id` + `estado='place_id_ok'`
- Si no hay match → mantener `NULL` + `estado='error'` o `pendiente_place_id` según política

#### Etapa C — Importación a iunaorg_dyd

Orden recomendado para preservar consistencia:

1. `iunaorg_dyd.ll_lugares` (requiere `place_id`)
2. `iunaorg_dyd.llxbx_societe`
3. `iunaorg_dyd.ll_societe_extended`
4. `iunaorg_dyd.ll_lugares_clientes` (vínculo con `cliente_id=52`)

### 3. Reglas de identidad y deduplicación

- Identidad del lugar: `place_id` (canónico)
- `ref_ext`: identificador de trazabilidad, sugerido `leadmaster:{prospecto_id}`
- Direcciones: informativas (pueden variar por formato), **no** deben dominar la deduplicación frente a `place_id`

### 4. Relación con usuarios/clientes

- Precondición de negocio: `ll_usuarios.id` debe existir antes de buscar leads.
- En la corrida actual, los datos se procesan para `ll_usuarios.cliente_id = 52`.
- Este `cliente_id` debe persistir de punta a punta (staging → relaciones destino).

## 🛠️ Metodología / Enfoque

Se aplicó validación técnica directa en servidor con MySQL CLI (solo lectura para evidencia de estado), más revisión de estructura objetivo en dump y validación visual en Workbench.

Consultas ejecutadas para evidencia:

```sql
SHOW DATABASES;
USE leadmaster; SHOW TABLES;
USE leadmaster; DESCRIBE stg_prospectos;
USE leadmaster;
SELECT COUNT(*) AS total_stg,
       SUM(CASE WHEN place_id IS NULL THEN 1 ELSE 0 END) AS pendientes_place_id
FROM stg_prospectos;
```

## 📈 Resultados / Hallazgos

### Evidencia validada en servidor

| Verificación | Resultado | Observación |
|---|---:|---|
| Base `leadmaster` accesible | ✅ | Confirmada con credenciales operativas |
| Tabla `leadmaster.prospectos` | ✅ | Existente |
| Tabla `leadmaster.stg_prospectos` | ✅ | Creada y visible |
| Campo `place_id` en staging | ✅ Nullable | Alineado al diseño acordado |
| Conteo actual `stg_prospectos` | 0 | Pendiente carga inicial |

### Estado funcional actual

- Infraestructura de staging: lista.
- Enriquecimiento `place_id`: definido, pendiente ejecución por lote.
- Importación a tablas iunaorg: definida, pendiente ejecución controlada.

## 🧩 Conclusiones

1. La estrategia de tres etapas (staging → enriquecimiento place_id → importación destino) es correcta para minimizar errores y maximizar trazabilidad.
2. La decisión de ubicar staging en `leadmaster` quedó validada técnicamente y operativamente.
3. `place_id` debe tratarse como llave canónica del lugar en el flujo hacia `ll_lugares`.
4. La asociación por `cliente_id` (52 en este ciclo) es un requisito de negocio central y debe mantenerse en todas las transformaciones.

## 🚀 Próximos Pasos / Recomendaciones

- [ ] Ejecutar `INSERT ... SELECT` inicial de `leadmaster.prospectos` → `leadmaster.stg_prospectos` con `cliente_id=52`.
- [ ] Ejecutar enriquecimiento de `place_id` para filas `estado='pendiente_place_id'`.
- [ ] Registrar errores de resolución en `error_msg` y dejar reintentos definidos.
- [ ] Ejecutar importación ordenada a `iunaorg_dyd` (lugares → societe → extended → lugares_clientes).
- [ ] Verificar post-importación con conteos cruzados por `ref_ext` y `cliente_id`.
- [ ] Cambiar estado del documento a `Revisado` tras ejecución del primer lote productivo.

## 🔗 Referencias / Recursos

- Reglas de informes: [docs/REGLAS-INFORMES.md](../REGLAS-INFORMES.md)
- Plantilla estándar: [docs/reportes/TEMPLATE-INFORME.md](TEMPLATE-INFORME.md)
- Esquema origen: `leadmaster.prospectos`
- Esquema destino: `iunaorg_dyd.ll_lugares`, `iunaorg_dyd.llxbx_societe`, `iunaorg_dyd.ll_societe_extended`, `iunaorg_dyd.ll_lugares_clientes`
- Proyecto de consultas Places: `https://github.com/albertohilal/desarrolloydisenio-api`

## 📎 Anexos

### SQL base sugerido para poblar staging

```sql
INSERT INTO leadmaster.stg_prospectos
(prospecto_id, cliente_id, ref_ext, palabra_clave, url_landing, texto_extraido, place_id, estado)
SELECT
  p.id,
  52,
  CONCAT('leadmaster:', p.id),
  p.palabra_clave,
  p.url_landing,
  p.texto_extraido,
  NULL,
  'pendiente_place_id'
FROM leadmaster.prospectos p
ON DUPLICATE KEY UPDATE
  palabra_clave = VALUES(palabra_clave),
  url_landing = VALUES(url_landing),
  texto_extraido = VALUES(texto_extraido),
  updated_at = CURRENT_TIMESTAMP;
```

---

*Documento generado siguiendo `docs/REGLAS-INFORMES.md` y plantilla base `docs/reportes/TEMPLATE-INFORME.md`.*
