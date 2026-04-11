# 📁 Carpeta de Reportes

Esta carpeta contiene todos los informes, guías y documentos generados durante el desarrollo del proyecto.

## Estructura

```
reportes/
├── capturas/          # Imágenes y screenshots asociados a informes
├── TEMPLATE-INFORME.md  # Plantilla para nuevos informes
├── README.md          # Este archivo
└── *.md               # Informes individuales
```

## Tipos de Documentos

1. **Informes analíticos/diagnósticos** – Análisis de problemas, hallazgos técnicos, recomendaciones.
   - Ejemplo: `informe-diagnostico-gateway-openclaw-admin.md`
   - Deben seguir la estructura completa (Resumen, Desarrollo, Conclusiones).

2. **Guías/how‑to** – Instrucciones paso a paso para realizar una tarea.
   - Ejemplo: `guia-remote-ssh-leadforge.md`
   - Pueden omitir Resumen Ejecutivo y Conclusiones, pero deben tener fecha y proyecto.

3. **Planes/propuestas** – Documentos de planificación, arquitectura, roadmap.
   - Ejemplo: `plan_proyecto_leadmaster.remoto.md`
   - Deben incluir Objetivo, Fases, Próximos Pasos.

## Cómo Crear un Nuevo Informe

### Método rápido (recomendado)

```bash
cd /prospectos-leadmaster/docs/reportes
cp TEMPLATE-INFORME.md 2026-04-11-mi-informe.md
# Editar el archivo con el contenido necesario
```

### Validación

Una vez escrito, puedes validar la estructura básica con:

```bash
node ../scripts/validar-informe.js mi-informe.md
```

El validador verificará elementos mínimos y dará sugerencias.

## Reglas Completas

Consultar el documento principal: [REGLAS-INFORMES.md](../REGLAS-INFORMES.md).

Allí se detallan:

- Estructura de cabecera
- Convenciones de formato
- Nombres de archivo
- Proceso de revisión
- Integración con OpenClaw

## Informes Automáticos

Los informes generados por agentes de OpenClaw deben:

- Usar prefijo `auto-` en el nombre (ej. `auto-2026-04-11-resumen-prospectos.md`).
- Incluir `Autor: Agente OpenClaw` en la cabecera.
- Seguir la misma estructura básica (fecha, proyecto, contenido).

## Mantenimiento

- Revisar periódicamente que los enlaces internos sigan funcionando.
- Mover informes obsoletos a subcarpeta `archivados/` si es necesario.
- Actualizar la plantilla cuando se introduzcan cambios en el formato.

---

*Última actualización: 2026-04-11*  
*Consulte REGLAS-INFORMES.md para la versión más reciente de las reglas.*
