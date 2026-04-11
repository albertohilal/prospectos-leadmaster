# Reglas para Crear Informes

## Objetivo
Establecer un formato estándar para los informes generados en `/prospectos-leadmaster/docs/reportes/`, que garantice consistencia, claridad y facilidad de consulta.

## Estructura Básica

Cada informe debe contener:

### 1. Cabecera
- **Título** (`# Título del informe`)
- **Fecha** de creación (formato: DD de mes de AAAA)
- **Proyecto** al que pertenece (ej. LeadMaster, OpenClaw-Admin, etc.)
- **Autor** (opcional)

### 2. Resumen Ejecutivo (opcional para informes breves)
- Párrafo conciso que describe el propósito, hallazgos principales y recomendaciones clave.

### 3. Cuerpo
- Organizado en secciones con encabezados `##` y `###`.
- Incluir listas, tablas, fragmentos de código o imágenes cuando sea necesario.
- Numerar las secciones si el informe es largo o técnico.

### 4. Conclusión / Próximos Pasos
- Síntesis de lo expuesto.
- Acciones pendientes, tareas o decisiones tomadas.

### 5. Metadata (opcional)
- Palabras clave.
- Referencias a otros informes o documentos.
- Enlaces a recursos externos.

## Tipos de Documentos y sus Requisitos

Dependiendo del propósito, los documentos pueden tener requisitos ligeramente diferentes:

### A) Informes Analíticos / Diagnósticos
- **Ejemplos**: análisis de errores, diagnósticos técnicos, evaluaciones.
- **Requisitos obligatorios**: Resumen Ejecutivo, Desarrollo detallado, Conclusiones, Próximos Pasos.
- **Estructura típica**: título, fecha, proyecto, resumen, contexto, análisis, conclusiones, recomendaciones.

### B) Guías / How‑To
- **Ejemplos**: tutoriales, instrucciones de configuración, pasos a seguir.
- **Requisitos obligatorios**: título, fecha, proyecto, secciones numeradas o pasos claros.
- **Opcionales**: Resumen Ejecutivo, Conclusiones (pueden sustituirse por "Próximos Pasos" o "Verificación").

### C) Planes / Propuestas / Roadmaps
- **Ejemplos**: plan de proyecto, propuesta de arquitectura, cronograma.
- **Requisitos obligatorios**: título, fecha, proyecto, Objetivo, Fases/Etapas, Próximos Pasos.
- **Recomendado**: tabla de hitos, lista de tareas, responsables.

### D) Informes Automáticos (generados por agentes)
- **Ejemplos**: resúmenes diarios, logs de ejecución, resultados de scraping.
- **Requisitos obligatorios**: título con prefijo `auto-`, fecha, proyecto, Autor: Agente OpenClaw.
- **Flexible**: pueden seguir una estructura simplificada pero deben ser claros y autocontenidos.

## Convenciones de Formato

- **Idioma**: español.
- **Encabezados**: usar `#` para título principal, `##` para secciones principales, `###` para subsecciones.
- **Código**: en bloques ` ``` ` con indicación del lenguaje (ej. ` ```bash `).
- **Imágenes**: guardarlas en la carpeta `reportes/capturas/` y referenciarlas con ruta relativa `![descripción](capturas/nombre-imagen.png)`.
- **Fechas**: preferentemente en formato ISO (AAAA-MM-DD) o textual (ej. 6 de abril de 2026).
- **Longitud**: ser conciso; si el informe supera las 2 páginas, considerar dividirlo en anexos.

## Nombre de Archivo

- Usar nombres descriptivos en minúsculas separados por guiones.
- Incluir fecha (AAAA-MM-DD) al principio o al final.
- Ejemplos:
  - `2026-04-06-informe-diagnostico-gateway-openclaw-admin.md`
  - `plan-proyecto-leadmaster-remoto.md`
  - `guia-remote-ssh-leadforge.md`

## Ubicación

- Todos los informes deben guardarse en `/prospectos-leadmaster/docs/reportes/`.
- Las imágenes asociadas en `/prospectos-leadmaster/docs/reportes/capturas/`.

## Plantilla

Para facilitar la creación de informes, se ha creado una plantilla en `reportes/TEMPLATE-INFORME.md`. Se recomienda copiar este archivo como punto de partida.

**Uso rápido:**
```bash
cd /prospectos-leadmaster/docs/reportes/
cp TEMPLATE-INFORME.md 2026-04-11-nuevo-informe.md
```

La plantilla incluye secciones predefinidas y marcadores de posición. Es flexible: se pueden omitir secciones no relevantes, pero se debe mantener la cabecera básica (título, fecha, proyecto).

## Proceso de Revisión

1. **Creación** – Usar la plantilla `TEMPLATE-INFORME.md`.
2. **Borrador** – Marcar el informe con `Estado: Borrador` en la cabecera.
3. **Revisión** – Otro miembro del equipo revisa contenido, claridad y formato.
4. **Aprobación** – Cambiar estado a `Revisado` o `Aprobado`.
5. **Archivo** – El informe finalizado se conserva en `reportes/` con nombre definitivo.

## Validación Básica

Antes de considerar un informe listo, verificar que:

- [ ] El título es descriptivo.
- [ ] La fecha es correcta y está en formato consistente.
- [ ] El proyecto está indicado.
- [ ] Hay al menos una sección de desarrollo o análisis (o pasos, en caso de guías).
- [ ] El documento tiene un cierre adecuado (Conclusiones, Próximos Pasos, Resumen final).
- [ ] Las imágenes (si las hay) están en `capturas/` y se referencian correctamente.
- [ ] No hay enlaces rotos.

**Nota**: Los requisitos específicos varían según el tipo de documento (ver sección anterior). El script `scripts/validar-informe.js` proporciona una validación automática básica, pero debe interpretarse con flexibilidad según el contexto.

## Integración con OpenClaw

Para informes generados automáticamente por agentes de OpenClaw:

- Usar la misma estructura de cabecera.
- Incluir `Autor: Agente OpenClaw`.
- Guardar el informe con prefijo `auto-` (ej. `auto-2026-04-11-resumen-prospectos.md`).
- Los informes automáticos pueden omitir algunas secciones (como Resumen Ejecutivo) si no son aplicables.

---

*Estas reglas pueden ajustarse según las necesidades del proyecto. Última actualización: 2026-04-11.*
