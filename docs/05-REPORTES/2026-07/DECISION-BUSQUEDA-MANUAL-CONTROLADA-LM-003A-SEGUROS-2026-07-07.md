# Decisión — Búsqueda manual controlada LM-003A Seguros

**Fecha:** 2026-07-07
**Proyecto:** LeadMaster
**Repositorio:** prospectos-leadmaster-local
**Bloque:** LM-003A — Preparación de datos para vertical seguros
**Estado:** DECISIÓN DOCUMENTADA / NO EJECUTADA

---

## 1. Estado actual

- Ya existe un seed de keywords base para seguros en `config/seed_ll_keywords_leadmaster_seguros.sql`.
- Ese seed fue escrito con schema inferido (perfil='A', prioridad=1). La tabla real usa ENUM (perfil='b2b', prioridad='alta'). El seed NO es directamente ejecutable sin adaptación.
- Ya existe un reporte asociado en `docs/05-REPORTES/2026-07/SEED-KEYWORDS-SEGUROS-LM-003A-B-2026-07-04.md`.
- Ya se validó un lote geográfico completo de 230 queries (commit `c5e5680`).
- Ya se creó y publicó `config/seed_ll_queries_prospeccion_seguros.sql` (commit `14c010c`).
- El seed de queries territoriales contiene 230 combinaciones (23 keywords × 10 territorios), pero la tabla `ll_queries_prospeccion` todavía no existe en producción y no fue ejecutada.
- Por lo tanto, para la primera búsqueda manual controlada se debe usar lo que ya existe como fuente operativa local de keywords: `ll_keywords_leadmaster`.

Nota: el path `docs/reportes/2026-07-04-lm-003a-c-seed-keywords-seguros.md` fue mencionado como referencia pero no existe con ese nombre exacto. El reporte equivalente existe como `docs/05-REPORTES/2026-07/SEED-KEYWORDS-SEGUROS-LM-003A-B-2026-07-04.md`.

---

## 2. Fuente autorizada

La fuente autorizada de keywords para la primera búsqueda manual será:

```sql
`iunaorg_dyd`.`ll_keywords_leadmaster`
```

No se usarán:

- keywords inventadas en conversación,
- listas externas no versionadas,
- búsquedas improvisadas sin trazabilidad,
- tablas nuevas no aprobadas.

---

## 3. Antecedentes documentados

| Elemento                                                                        | Estado       | Observación                                                                 |
| ------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `config/create_ll_keywords_leadmaster.sql`                                      | existente    | DDL real verificada: perfil ENUM(b2b,b2c,mixto), prioridad ENUM(alta,media,baja) |
| `config/seed_ll_keywords_leadmaster_seguros.sql`                                | existente    | Seed original con schema inferido (NO compatible: perfil=A/B, prioridad=1/2/3) |
| `docs/05-REPORTES/2026-07/SEED-KEYWORDS-SEGUROS-LM-003A-B-2026-07-04.md`       | existente    | Documenta el seed de keywords y sus supuestos                               |
| Validación lote completo de queries geo                                         | cerrada      | Commit `c5e5680`; 230 queries, 10 territorios, 23 keywords base             |
| `config/seed_ll_queries_prospeccion_seguros.sql`                                | publicado    | Commit `14c010c`; contiene 230 queries insertables, perfiles A/B/D          |
| `ll_queries_prospeccion`                                                        | no operativa | Tabla propuesta en DDL comentado, no ejecutada ni creada todavía            |

---

## 4. Decisión operativa

La primera búsqueda manual controlada se hará sobre:

- **sector:** `seguros`
- **perfil:** `b2b`
- **prioridad:** `alta`
- **estado:** `activa`
- **origen:** `seed_manual_lm003a`
- **notas:** contiene `categoria_operativa=A`

Aclaración importante sobre el mapeo de campos:

- **Perfil Operativo A** es una categoría de trabajo LeadMaster para clasificar keywords según su intención comercial. No corresponde al campo real `perfil` de la tabla.
- El campo real `perfil` es un ENUM que acepta `b2b`, `b2c` o `mixto`. Todas las keywords de seguros son `b2b`.
- La categoría operativa (A/B/C/D/E) queda registrada en el campo `notas` como `categoria_operativa=A`.
- La prioridad real se registra como ENUM `alta`, `media`, `baja`, no como entero `1`.

Perfil Operativo A representa posibles clientes de LeadMaster:

- brokers de seguros,
- productores asesores,
- productores de seguros,
- agencias de seguros,
- consultoras de seguros,
- organizadores de productores.

---

## 5. Motivo comercial

La primera búsqueda no tiene como objetivo encontrar todavía los prospectos finales para entregar.

El objetivo inicial es identificar posibles clientes LeadMaster dentro de la vertical seguros: actores que venden seguros y podrían pagar por recibir oportunidades comerciales calificadas.

Diferenciación de perfiles:

- **Perfil A:** posible cliente LeadMaster. Busca brokers, productores, agencias, consultoras y organizadores.
- **Perfil B:** posible universo de demanda / muestra futura. Busca actores que ofrecen seguros empresariales y corporativos.
- **Perfil D:** intención comercial ambigua, requiere revisión manual. Puede atraer compradores finales.
- **Perfil C y E:** existentes en el seed de keywords, pero no seleccionados para esta primera búsqueda manual.

---

## 6. Consulta SQL base de referencia

Las siguientes consultas son de referencia. NO se ejecutan desde este documento.

Consulta completa Perfil Operativo A:

```sql
SELECT id, keyword, sector, perfil, prioridad, estado, origen, notas
FROM iunaorg_dyd.ll_keywords_leadmaster
WHERE sector = 'seguros'
  AND perfil = 'b2b'
  AND prioridad = 'alta'
  AND estado = 'activa'
  AND origen = 'seed_manual_lm003a'
  AND notas LIKE '%categoria_operativa=A%'
ORDER BY keyword;
```

Variante con límite para revisión inicial:

```sql
SELECT id, keyword, sector, perfil, prioridad, estado, origen, notas
FROM iunaorg_dyd.ll_keywords_leadmaster
WHERE sector = 'seguros'
  AND perfil = 'b2b'
  AND prioridad = 'alta'
  AND estado = 'activa'
  AND origen = 'seed_manual_lm003a'
  AND notas LIKE '%categoria_operativa=A%'
ORDER BY keyword
LIMIT 5;
```

---

## 7. Criterio de búsqueda manual controlada

La búsqueda manual debe hacerse en una tanda chica y revisable.

Criterio sugerido:

- tomar keywords Perfil A desde `ll_keywords_leadmaster`,
- combinarlas manualmente con territorios prioritarios,
- revisar resultados antes de automatizar,
- registrar hallazgos en una planilla o archivo de revisión,
- no cargar datos en base todavía.

Territorios prioritarios de referencia:

- CABA
- Buenos Aires
- Córdoba
- Rosario
- Santa Fe
- Mendoza

Estos territorios provienen del criterio geográfico ya trabajado y documentado en `config/seed_la_cat_geo_keywords_ar_minimo.sql`. No reemplazan la fuente principal de keywords.

---

## 8. Exclusiones explícitas

Esta decisión NO habilita todavía:

- scraping masivo,
- ejecución con Open Claw,
- carga de prospectos en base,
- ejecución del seed `ll_queries_prospeccion`,
- campañas de email,
- campañas de WhatsApp,
- contacto comercial,
- automatización sin revisión humana.

---

## 9. Criterio de éxito de la primera prueba

La primera búsqueda manual controlada deberá permitir responder:

- si las keywords Perfil A traen brokers/productores/agencias reales,
- si aparecen anunciantes activos,
- si los resultados tienen web propia,
- si tienen canales de contacto visibles,
- si parecen posibles clientes LeadMaster,
- si conviene escalar a más keywords o ajustar el criterio.

---

## 10. Próximo paso posterior

El próximo paso, después de documentar esta decisión, será preparar una guía operativa o planilla para registrar la primera tanda de resultados manuales.

No hacerlo en esta tarea.
