# Playbook operativo para Copilot — Saneamiento seguro del repositorio

**Ruta objetivo en el repositorio:** `docs/05-REPORTES/2026-04/PLAYBOOK-COPILOT-SANEAMIENTO-REPO-2026-04-11.md`  
**Fecha:** 2026-04-11  
**Ámbito:** Workspace completo  
**Dominio productivo canónico:** `https://desarrolloydisenioweb.com.ar/`

---

## Objetivo

Este documento define el protocolo para que Copilot ejecute, **paso por paso y solo cuando se le indique**, una auditoría y saneamiento seguro del repositorio `leadmaster-workspace` dentro del VPS.

El objetivo es ordenar el repositorio **sin romper producción**, preservando la infraestructura canónica, separando higiene de cambios funcionales y obligando a que cada paso deje evidencia en un informe Markdown dentro del repo.

---

## Reglas marco para toda la sesión con Copilot

Copilot debe obedecer estas reglas durante todo el flujo:

- Trabaja dentro del VPS sobre `leadmaster-workspace`.
- Debe priorizar seguridad y reversibilidad.
- No debe ejecutar acciones destructivas sin mostrar antes preview y justificación.
- No debe borrar ni alterar `AUXILIAR/`.
- Debe tratar `AUXILIAR/` como carpeta local intencional, fuera de commits.
- Debe preservar todo lo que sostenga el deploy de `https://desarrolloydisenioweb.com.ar/`.
- No debe mezclar saneamiento del repo con refactors funcionales.
- En cada paso debe generar el informe Markdown correspondiente dentro del repo y mostrar la ruta exacta antes de dar el paso por cerrado.
- No debe adelantarse a pasos futuros.
- Solo debe ejecutar el paso que se le ordene explícitamente.

---

## Mensaje de activación para Copilot

Pégale esto una sola vez al comienzo de la sesión:

```text
Quiero que uses el documento `docs/05-REPORTES/2026-04/PLAYBOOK-COPILOT-SANEAMIENTO-REPO-2026-04-11.md` como protocolo operativo de esta sesión.

Instrucciones:
- No ejecutes pasos por adelantado.
- Cuando yo diga `Ejecuta Paso N`, busca en ese documento el bloque correspondiente al Paso N y ejecútalo exactamente.
- En cada paso debes respetar todas las restricciones y generar el informe Markdown indicado en el mismo documento.
- No cierres un paso sin mostrarme la ruta exacta del archivo de informe generado.
- Si una instrucción del paso entra en conflicto con seguridad básica o integridad del repo, prioriza seguridad y explícame el conflicto.

Por ahora solo confirma que entendiste el protocolo y que esperarás la orden `Ejecuta Paso N`.
```

---

## Modo de uso

1. Guardar este documento en la ruta objetivo indicada arriba.
2. Abrir Copilot Chat en el workspace del VPS.
3. Enviar el **mensaje de activación**.
4. Luego dar órdenes cortas, por ejemplo:
   - `Ejecuta Paso 1`
   - `Ejecuta Paso 2`
   - `Ejecuta Paso 3`
5. Revisar el informe generado en cada paso antes de continuar.

---

## Paso 1 — Auditoría inicial, solo lectura

```text
Actúa como un ingeniero senior de saneamiento de repositorios Git.

Estás trabajando en el VPS dentro del workspace del proyecto `leadmaster-workspace`. En este paso debes hacer solo auditoría read-only. No modifiques archivos, no borres nada, no hagas commits.

Contexto importante:
- El dominio productivo canónico es `https://desarrolloydisenioweb.com.ar/`
- `AUXILIAR/` es intencional y se usa para compartir con IA capturas, dumps, configs temporales y material de soporte
- `AUXILIAR/` debe existir, pero no debe formar parte de commits operativos
- Quiero ordenar el repo sin romper producción

Objetivo de este paso:
1. Inspeccionar la estructura del repo
2. Revisar `.gitignore` raíz y `.gitignore` por servicio
3. Detectar mezcla entre:
   - código funcional
   - infraestructura canónica
   - documentación vigente
   - artefactos locales u operativos
4. Detectar riesgos de versionado accidental de secretos, sesiones, dumps, backups o `node_modules`

Restricciones:
- No modificar nada
- No ejecutar `git clean`, `git rm`, `git add`, `git commit`
- No asumir que todo archivo no trackeado es basura
- No tocar `infra/nginx/sites-available/desarrolloydisenioweb.com.ar.conf`

Regla documental obligatoria:
- Además de responder en el chat, debes guardar el informe de este paso en un archivo Markdown dentro del repositorio
- Debes respetar `docs/00-INDEX/DOCUMENTATION_RULES.md`
- Este informe es de alcance workspace, así que debes guardarlo en `docs/05-REPORTES/2026-04/`
- No crees carpetas nuevas fuera de la estructura oficial
- Usa este nombre de archivo:
  `docs/05-REPORTES/2026-04/REPORTE-SANEAMIENTO-REPO-PASO-1-2026-04-11.md`
- El archivo debe incluir explícitamente la ruta final en el encabezado
- El archivo debe contener:
  - objetivo del paso
  - hallazgos
  - riesgos
  - clasificación preliminar
  - resultado final
- No des por concluido el paso hasta haber escrito el archivo y mostrarme la ruta exacta

Devuélveme:
1. Estado general
2. Riesgos
3. Mantener versionado
4. Ignorar
5. Revisar manualmente
6. Ruta exacta del informe generado
7. Confirmación de que el archivo cumple `docs/00-INDEX/DOCUMENTATION_RULES.md`
```

---

## Paso 2 — Revisión puntual de ignores y exposición accidental

```text
Seguimos con el saneamiento del repo. En este paso quiero una revisión enfocada solo en reglas de ignore y exposición accidental.

Revisa específicamente:
- `.gitignore`
- `services/central-hub/.gitignore`
- `services/session-manager/.gitignore`

Busca inconsistencias, vacíos o reglas peligrosas. Presta especial atención a:
- `AUXILIAR/`
- `node_modules/`
- `.env`
- logs
- coverage
- `playwright-report/`
- `test-results/`
- `.wwebjs_auth/`
- `.wwebjs_cache/`
- `sessions/`
- `tokens/`
- backups `.tar.gz`, `.tgz`
- dumps `.sql`, `.sqlite`, `.db`, `.bak`
- certificados `.crt`, `.key`, `.pem`

También valida si es correcto o sospechoso que en la raíz estén ignorados:
- `/package.json`
- `/package-lock.json`

No cambies nada todavía.

Regla documental obligatoria:
- Además de responder en el chat, debes guardar el informe de este paso en un archivo Markdown dentro del repositorio
- Debes respetar `docs/00-INDEX/DOCUMENTATION_RULES.md`
- Este informe es de alcance workspace, así que debes guardarlo en `docs/05-REPORTES/2026-04/`
- Usa este nombre de archivo:
  `docs/05-REPORTES/2026-04/REPORTE-SANEAMIENTO-REPO-PASO-2-2026-04-11.md`
- El archivo debe incluir explícitamente la ruta final en el encabezado
- El archivo debe contener:
  - objetivo del paso
  - problemas detectados
  - reglas faltantes
  - reglas redundantes o conflictivas
  - diff propuesto exacto
  - justificación de seguridad
- No des por concluido el paso hasta haber escrito el archivo y mostrarme la ruta exacta

Quiero que me entregues:
1. Problemas detectados
2. Reglas faltantes
3. Reglas redundantes o conflictivas
4. Diff propuesto exacto para cada `.gitignore`
5. Explicación breve de por qué cada cambio es seguro
6. Ruta exacta del informe generado
7. Confirmación de cumplimiento documental

No ejecutes nada destructivo ni apliques cambios todavía.
```

---

## Paso 3 — Plan exacto antes de tocar archivos

```text
Con base en la auditoría anterior, arma un plan de saneamiento mínimo y seguro para este repositorio.

Quiero que el plan:
- preserve producción
- preserve `AUXILIAR/` como carpeta local ignorada
- preserve infraestructura canónica del dominio `desarrolloydisenioweb.com.ar`
- no mezcle saneamiento con refactors funcionales

Necesito que clasifiques la ejecución en fases concretas:

Fase A:
- cambios de `.gitignore` y endurecimiento de reglas

Fase B:
- verificación con comandos no destructivos tipo preview

Fase C:
- limpieza solo de artefactos ignorados, siempre en dry-run primero

Fase D:
- separación de cambios funcionales versus saneamiento

Para cada fase, dame:
- objetivo
- archivos afectados
- comandos sugeridos
- riesgo
- condición de aprobación antes de pasar a la siguiente fase

No apliques cambios todavía. Solo quiero el plan operativo paso a paso.

Regla documental obligatoria:
- Además de responder en el chat, debes guardar el informe de este paso en un archivo Markdown dentro del repositorio
- Debes respetar `docs/00-INDEX/DOCUMENTATION_RULES.md`
- Este informe es de alcance workspace, así que debes guardarlo en `docs/05-REPORTES/2026-04/`
- Usa este nombre de archivo:
  `docs/05-REPORTES/2026-04/REPORTE-SANEAMIENTO-REPO-PASO-3-2026-04-11.md`
- El archivo debe incluir explícitamente la ruta final en el encabezado
- El archivo debe contener:
  - objetivo del paso
  - fases propuestas
  - comandos sugeridos
  - riesgos
  - criterios de aprobación
  - resultado final
- No des por concluido el paso hasta haber escrito el archivo y mostrarme la ruta exacta

Devuélveme:
1. Plan por fases
2. Riesgo por fase
3. Condición de aprobación por fase
4. Ruta exacta del informe generado
5. Confirmación de cumplimiento documental
```

---

## Paso 4 — Aplicar solo endurecimiento de `.gitignore`

```text
Ahora sí, aplica únicamente los cambios mínimos y seguros sobre reglas de ignore.

Tarea:
- editar `.gitignore`
- editar `services/central-hub/.gitignore` solo si hace falta
- editar `services/session-manager/.gitignore` para endurecerlo
- no tocar ningún archivo de lógica
- no mover carpetas
- no borrar archivos
- no hacer commit

Condiciones:
- `AUXILIAR/` debe seguir existiendo y quedar claramente ignorado
- no tocar infraestructura canónica
- no tocar secretos reales, solo reglas para protegerlos
- mantener compatibilidad con el proyecto productivo `desarrolloydisenioweb.com.ar`

Después de aplicar cambios, muéstrame:
1. diff exacto de cada archivo editado
2. justificación breve por cambio
3. posibles efectos secundarios
4. comandos de verificación recomendados

Restricciones adicionales:
- No ejecutar `git clean`
- No ejecutar `git add`
- No ejecutar `git commit`
- No ejecutar `git rm`

Regla documental obligatoria:
- Además de responder en el chat, debes guardar el informe de este paso en un archivo Markdown dentro del repositorio
- Debes respetar `docs/00-INDEX/DOCUMENTATION_RULES.md`
- Este informe es de alcance workspace, así que debes guardarlo en `docs/05-REPORTES/2026-04/`
- Usa este nombre de archivo:
  `docs/05-REPORTES/2026-04/REPORTE-SANEAMIENTO-REPO-PASO-4-2026-04-11.md`
- El archivo debe incluir explícitamente la ruta final en el encabezado
- El archivo debe contener:
  - objetivo del paso
  - archivos editados
  - diff exacto
  - justificación por cambio
  - posibles efectos secundarios
  - resultado final
- No des por concluido el paso hasta haber escrito el archivo y mostrarme la ruta exacta

Entrega esperada:
1. Diff exacto aplicado
2. Explicación breve
3. Posibles efectos secundarios
4. Ruta exacta del informe generado
5. Confirmación de cumplimiento documental
```

---

## Paso 5 — Verificación segura con previews

```text
Quiero verificar que las nuevas reglas de ignore funcionan sin borrar nada todavía.

Ejecuta solo verificaciones seguras y previews.

Objetivo:
- confirmar qué archivos quedan ahora correctamente ignorados
- distinguir entre:
  - ignorados
  - no trackeados importantes
  - cambios funcionales reales
- preparar una limpieza segura sin tocar trabajo útil

Puedes usar comandos de inspección y dry-run, por ejemplo equivalentes a:
- `git status`
- `git diff --name-only`
- `git ls-files --others --exclude-standard`
- `git clean -ndX`
- `git clean -nd`

No ejecutes nada destructivo.

Devuélveme:
1. qué quedaría limpio por estar ignorado
2. qué seguiría apareciendo como no trackeado y merece revisión
3. qué cambios parecen ser funcionales y no de higiene
4. recomendación exacta de qué hacer a continuación

Regla documental obligatoria:
- Además de responder en el chat, debes guardar el informe de este paso en un archivo Markdown dentro del repositorio
- Debes respetar `docs/00-INDEX/DOCUMENTATION_RULES.md`
- Este informe es de alcance workspace, así que debes guardarlo en `docs/05-REPORTES/2026-04/`
- Usa este nombre de archivo:
  `docs/05-REPORTES/2026-04/REPORTE-SANEAMIENTO-REPO-PASO-5-2026-04-11.md`
- El archivo debe incluir explícitamente la ruta final en el encabezado
- El archivo debe contener:
  - objetivo del paso
  - verificaciones ejecutadas
  - resultados de preview
  - clasificación de hallazgos
  - recomendación exacta del siguiente paso
- No des por concluido el paso hasta haber escrito el archivo y mostrarme la ruta exacta

Entrega esperada:
1. Resultado de previews
2. Clasificación de archivos
3. Siguiente paso recomendado
4. Ruta exacta del informe generado
5. Confirmación de cumplimiento documental
```

---

## Paso 6 — Limpieza controlada y separación de ruido

```text
Solo si la verificación anterior salió bien, quiero que prepares una limpieza controlada del repo.

Importante:
- limpiar únicamente artefactos ya ignorados
- no borrar archivos funcionales
- no tocar documentación vigente
- no tocar infraestructura canónica
- no tocar `AUXILIAR/`, salvo confirmar que queda fuera de commits
- no hacer commits todavía

Primero muéstrame:
1. comando exacto de limpieza propuesto
2. alcance de ese comando
3. riesgos
4. por qué no afectaría código funcional

Luego, si el análisis confirma seguridad, ejecuta únicamente la limpieza de ignorados.

Después quiero:
- nuevo `git status`
- resumen de qué desapareció del ruido
- lista de cambios funcionales que siguen presentes
- lista de archivos que todavía requieren decisión manual

Regla documental obligatoria:
- Además de responder en el chat, debes guardar el informe de este paso en un archivo Markdown dentro del repositorio
- Debes respetar `docs/00-INDEX/DOCUMENTATION_RULES.md`
- Este informe es de alcance workspace, así que debes guardarlo en `docs/05-REPORTES/2026-04/`
- Usa este nombre de archivo:
  `docs/05-REPORTES/2026-04/REPORTE-SANEAMIENTO-REPO-PASO-6-2026-04-11.md`
- El archivo debe incluir explícitamente la ruta final en el encabezado
- El archivo debe contener:
  - objetivo del paso
  - comando propuesto
  - análisis de alcance
  - riesgos
  - resultado de limpieza
  - estado posterior
- No des por concluido el paso hasta haber escrito el archivo y mostrarme la ruta exacta

Entrega esperada:
1. Comando propuesto y justificación
2. Resultado posterior
3. Cambios funcionales remanentes
4. Archivos con decisión manual pendiente
5. Ruta exacta del informe generado
6. Confirmación de cumplimiento documental
```

---

## Paso 7 — Preparar staging y commits limpios

```text
Con el repo ya saneado, quiero separar el trabajo en bloques lógicos sin mezclar higiene con cambios funcionales.

Tu tarea:
1. identificar qué cambios corresponden a higiene del repo
2. identificar qué cambios corresponden a código funcional
3. identificar qué cambios corresponden a tests
4. identificar qué cambios corresponden a documentación

No hagas commit todavía.

Devuélveme:
- propuesta de staging por grupos
- mensajes de commit recomendados
- orden correcto de commits
- validación final de que no se incluirían:
  - secretos
  - sesiones
  - tokens
  - dumps
  - backups
  - `AUXILIAR/`
  - `node_modules/`

Quiero sugerencias de commits como:
- `chore: harden gitignore and repository hygiene`
- `chore: isolate local operational artifacts`
- `fix: ...`
- `test: ...`
- `docs: ...`

Además, señala cualquier archivo que no debería commitearse bajo ningún concepto.

Regla documental obligatoria:
- Además de responder en el chat, debes guardar el informe de este paso en un archivo Markdown dentro del repositorio
- Debes respetar `docs/00-INDEX/DOCUMENTATION_RULES.md`
- Este informe es de alcance workspace, así que debes guardarlo en `docs/05-REPORTES/2026-04/`
- Usa este nombre de archivo:
  `docs/05-REPORTES/2026-04/REPORTE-SANEAMIENTO-REPO-PASO-7-2026-04-11.md`
- El archivo debe incluir explícitamente la ruta final en el encabezado
- El archivo debe contener:
  - objetivo del paso
  - clasificación final de cambios
  - propuesta de staging
  - mensajes de commit
  - riesgos finales
  - validación de exclusiones obligatorias
- No des por concluido el paso hasta haber escrito el archivo y mostrarme la ruta exacta

Entrega esperada:
1. Propuesta de staging por grupos
2. Orden de commits
3. Mensajes de commit recomendados
4. Exclusiones obligatorias
5. Ruta exacta del informe generado
6. Confirmación de cumplimiento documental
```

---

## Orden de ejecución recomendada

- `Ejecuta Paso 1`
- `Ejecuta Paso 2`
- `Ejecuta Paso 3`
- `Ejecuta Paso 4`
- `Ejecuta Paso 5`
- `Ejecuta Paso 6`
- `Ejecuta Paso 7`

No avanzar al siguiente paso sin revisar el informe del paso anterior.

---

## Criterio de cierre

El flujo se considera correctamente ejecutado cuando:

- los `.gitignore` quedaron endurecidos,
- `AUXILIAR/` quedó protegido y fuera de commits,
- el ruido operativo quedó aislado,
- los cambios funcionales quedaron claramente separados,
- no hay riesgo de commitear secretos, sesiones, dumps o backups,
- y existe un informe Markdown por cada paso bajo `docs/05-REPORTES/2026-04/`.
