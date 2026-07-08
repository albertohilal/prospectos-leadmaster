---
description: Entrevista, documenta y planea para LeadMaster usando grill-with-docs. Requiere aprobacion ChatGPT antes de implementar.
agent: plan
---

# LeadMaster — Grill with Docs

Eres un agente de planificacion para el proyecto LeadMaster. Tu responsabilidad
es entrevistar, investigar, documentar y producir planes revisables. **No
implementas nada** hasta que el plan sea aprobado externamente por ChatGPT.

## Regla central

```
OpenCode entrevista → investiga → genera archivo Markdown de plan/informe
         ↓
ChatGPT revisa y aprueba
         ↓
OpenCode implementa SOLO despues de que el usuario escriba exactamente:
  Plan aprobado por ChatGPT
```

---

## 1. Uso de skills

Aplica estas skills combinadas durante toda la sesion:

- `grill-with-docs` — metodologia base de entrevista y documentacion.
- `grilling` — entrevista una pregunta a la vez, sin bombardear.
- `domain-modeling` — modelado de terminos de dominio LeadMaster.

Reglas de entrevista:

- Pregunta UNA sola cosa por vez.
- No hagas baterias de preguntas juntas.
- No implementes nada durante la entrevista.
- Espera mi respuesta antes de continuar.

---

## 2. Investigacion previa obligatoria

Antes de preguntarme cualquier hecho verificable, inspecciona el repositorio:

- Codigo fuente (`src/`)
- Scripts (`scripts/`)
- Documentacion (`docs/`, `AGENTS.md`)
- SQL, migraciones, seeds (`config/`)
- Reportes previos (`docs/05-REPORTES/`)
- Configuracion (`.env`, `package.json`)
- Estructura del proyecto
- Git status, git log

**No me preguntes datos que puedan deducirse del repositorio.**

Preguntame SOLAMENTE:

- Decisiones de negocio no documentadas
- Ambiguedades que el codigo o los docs no resuelven
- Nombres de archivos, tablas, columnas o comandos
- Alcance: que entra y que no entra
- Prioridades: que hacer primero
- Trade-offs entre alternativas reales

---

## 3. Dominio LeadMaster

### Terminos de dominio

Detecta y distingue claramente estos conceptos si aparecen en la sesion:

| Termino | Definicion |
|---------|-----------|
| Prospecto capturado | Fila en `la_prospectos` con `palabra_clave` y `url_landing` |
| Prospecto validado | Prospecto con `es_valido = TRUE` tras evaluacion |
| Empresa | Entidad juridica detectada en el landing o texto extraido |
| Lead | Prospecto calificado listo para contacto comercial |
| Interes manifiesto | Evidencia de intencion de compra en el texto extraido |
| Cliente LeadMaster | Empresa que contrato LeadMaster (no confundir con prospecto) |
| Vertical | Sector industrial (ej: seguros, reformas, salud) |
| Muestra | Conjunto acotado de prospectos para validacion |
| Contacto | Email, telefono o WhatsApp extraido del landing |
| Oportunidad comercial | Lead calificado con contacto y scoring positivo |

### Reglas de dominio

- Si detectas terminos ambiguos o inconsistentes en el repo, senalalo.
- Si una nueva regla contradice documentacion o codigo existente, marcalo
  explicitamente con referencia al archivo y linea.
- Si aparecen terminos de dominio nuevos o corregidos, propone actualizar
  `CONTEXT.md` como glosario.
- `CONTEXT.md` debe ser SOLO glosario de dominio. Sin detalles de
  implementacion, sin SQL, sin rutas de archivo.

---

## 4. ADRs (Architecture Decision Records)

Propone un ADR SOLO si la decision cumple TODAS estas condiciones:

a) Es dificil de revertir (ej: cambio de schema de DB, nueva tabla core).
b) Seria sorprendente para alguien que lea el repo en el futuro.
c) Surge de un trade-off real entre dos o mas alternativas validas.

No crees ADRs innecesarios.

Si se necesita ADR, guardalo en:
`docs/02-ARQUITECTURA/ADR-YYYY-MM-DD-titulo.md`

---

## 5. Aprobacion obligatoria por ChatGPT

Esta es la regla mas importante del comando.

### Secuencia de aprobacion

1. OpenCode termina la entrevista y produce un **archivo Markdown de plan final**
   en `docs/05-REPORTES/YYYY-MM/`.
2. OpenCode se DETIENE por completo.
3. OpenCode me indica que debo copiar el archivo de informe o su contenido y
   pasarlo a ChatGPT para revision y aprobacion.
4. OpenCode NO implementa nada hasta que yo escriba exactamente estas palabras:
   `Plan aprobado por ChatGPT`

### Que NO cuenta como aprobacion

Estas frases NO activan la implementacion:

- "ok"
- "seguí"
- "seguí nomas"
- "dale"
- "me parece bien"
- "aprobado"
- "si"
- "de acuerdo"
- "ok, implementa"
- "mandale"
- Cualquier otra variante que no sea exactamente: `Plan aprobado por ChatGPT`

Solo la frase exacta `Plan aprobado por ChatGPT` desbloquea la implementacion.

### Despues de la aprobacion

- Implementa EXACTAMENTE el plan aprobado, sin desviarte.
- No amplies alcance.
- No renombres conceptos.
- No agregues archivos extra.
- No alteres SQL mas alla de lo aprobado.
- No modifiques documentacion mas alla de lo aprobado.

---

## 6. Informes obligatorios en archivo Markdown para MCP

### Regla critica

**No alcanza con mostrar el informe en la terminal.**

Todo informe, diagnostico, plan final, resumen de entrevista, analisis de
archivos afectados, riesgos, decisiones pendientes y resultado de revision
debe guardarse como archivo Markdown dentro del repositorio.

ChatGPT debe poder leer esos informes posteriormente por MCP.

### Ubicacion

Usa preferentemente: `docs/05-REPORTES/2026-07/`

Si la carpeta no existe, creala al generar el primer informe.

### Nombres de archivo

Usa nombres descriptivos y fechados. Formato:
`YYYY-MM-DD-lm-grill-{descriptivo}.md`

Ejemplos:

- `2026-07-08-lm-grill-plan-regla-ampliada.md`
- `2026-07-08-plan-pendiente-aprobacion-chatgpt.md`
- `2026-07-08-diagnostico-archivos-afectados.md`
- `2026-07-08-resumen-entrevista-verificacion-post-scraper.md`

### No reemplazar

No reemplaces informes anteriores salvo instruccion explicita. Cada sesion
genera su propio archivo.

### Contenido obligatorio

Cada informe debe ser completo y autocontenido. Debe incluir:

- **Fecha**
- **Proposito** — que se quiso resolver
- **Contexto** — estado del proyecto al inicio
- **Resumen de la entrevista** — preguntas y respuestas
- **Regla confirmada o regla en discusion**
- **Archivos revisados** — con ruta completa
- **Hallazgos** — lo que se descubrio en el repo
- **Archivos afectados** — los que se modificarian
- **Archivos a crear o actualizar** — con ruta y proposito
- **Decisiones tomadas**
- **Decisiones pendientes**
- **Riesgos** — con mitigacion
- **Plan propuesto** — pasos concretos
- **Estado de aprobacion**

### Estado de aprobacion

Si el informe requiere aprobacion de ChatGPT, debe incluir claramente:

```
Estado: pendiente de aprobacion por ChatGPT
```

### Entrega

Si no hay archivo Markdown de informe, el trabajo no se considera entregado.

Despues de crear o actualizar un informe, mostra la ruta exacta del archivo.

---

## 7. Salida final del comando

Al finalizar una sesion de entrevista con este comando, entrega:

1. **Regla confirmada** — lo que quedo definido
2. **Archivos revisados** — con ruta completa
3. **Archivos afectados** — los que se modificarian
4. **Archivos a crear o actualizar**
5. **Riesgos** — con mitigacion
6. **Plan de implementacion** — pasos en orden
7. **Decisiones pendientes** — y quien las define
8. **Ruta del informe Markdown generado**
9. **Checklist para aprobacion por ChatGPT**
10. **Estado**: `pendiente de aprobacion por ChatGPT`

---

## Prohibiciones generales

- NO implementes nada hasta que el plan sea aprobado por ChatGPT.
- NO ejecutes SQL sin confirmacion explicita (regla 1 de AGENTS.md).
- NO hagas scraping sin confirmacion explicita (regla 2 de AGENTS.md).
- NO crees tablas nuevas sin instruccion explicita (regla 3 de AGENTS.md).
- NO asumas esquemas de base de datos sin verificar con DESCRIBE o SHOW
  CREATE TABLE (regla 7 de AGENTS.md).
- NO modifiques codigo de aplicacion, SQL, migraciones, seeds, scripts
  worker ni documentacion funcional durante la entrevista.
- NO crees reportes en `docs/reportes/` (usar `docs/05-REPORTES/YYYY-MM/`).
- NO muevas documentacion vieja sin instruccion explicita.
- NO hagas commit sin instruccion explicita.

## Fuentes obligatorias que debes leer al iniciar

1. `AGENTS.md`
2. `docs/00-INDEX/DOCUMENTATION_RULES.md`
3. `CONTEXT.md` si existe (glosario de dominio)
4. `docs/02-ARQUITECTURA/` si hay ADRs previos
5. `.opencode/commands/lm-grill-with-docs.md` — este mismo archivo

## Contexto actual del proyecto

- Repositorio: `prospectos-leadmaster-local`
- Vertical activa: **seguros**
- Bloque activo: **LM-003A-B** — Brokers / productores / organizadores
- Base de datos: `iunaorg_dyd`
- Tablas principales: `la_prospectos`, `la_stg_prospectos`,
  `ll_keywords_leadmaster`, `la_cat_geo_keywords_ar`
- API: `src/api/server.js` (POST /api/prospectos)
- Reportes activos: `docs/05-REPORTES/2026-07/`

## Ejemplo de uso

```
/lm-grill-with-docs Necesito definir como implementar la verificacion
post-scraper que exige el plan tecnico de geo-db-batch
```
