# AGENTS.md — prospectos-leadmaster-local

## Rol del repositorio

Este repositorio corresponde al entorno local de prospección de LeadMaster.

Su función principal es:
- preparar datos;
- definir keywords;
- generar seeds SQL;
- auditar staging;
- crear reportes operativos;
- producir archivos revisables antes de aplicar cambios en base de datos.

No es el repositorio productivo del Central Hub ni del VPS.

## Reglas críticas

1. No ejecutar SQL sin confirmación explícita del usuario.
2. No hacer scraping sin confirmación explícita del usuario.
3. No crear tablas nuevas salvo instrucción explícita.
4. Todo SQL debe quedar como archivo versionable y revisable.
5. Todo reporte nuevo debe respetar la estructura documental canónica.
6. No modificar archivos productivos del VPS desde este repositorio.
7. No asumir esquemas de base de datos: verificar con DESCRIBE o SHOW CREATE TABLE antes de proponer ejecución.

## Estructura documental

La norma documental está en:

docs/00-INDEX/DOCUMENTATION_RULES.md

Los reportes nuevos deben guardarse en:

docs/05-REPORTES/YYYY-MM/

Ejemplo:

docs/05-REPORTES/2026-07/SEED-KEYWORDS-SEGUROS-LM-003A-B-2026-07-04.md

No crear nuevos reportes en:

docs/reportes/

Esa carpeta existe por historial, pero no debe usarse para documentación nueva.

## SQL y configuración

Los seeds, consultas SQL y archivos de configuración operativa deben guardarse en:

config/

Ejemplos:

config/seed_ll_keywords_leadmaster_seguros.sql
config/query_lote_seguros_candidatos.sql

## Flujo recomendado

1. Auditar archivos y tablas existentes.
2. Crear archivos versionables.
3. Generar reporte en docs/05-REPORTES/YYYY-MM/.
4. No ejecutar SQL.
5. No ejecutar scraping.
6. Mostrar resumen de archivos creados o modificados.
7. Esperar revisión humana.
8. Ejecutar SQL o scraping solo después de aprobación explícita.

## Convención para agentes

Antes de modificar archivos, el agente debe:
- revisar git status;
- revisar docs/00-INDEX/DOCUMENTATION_RULES.md;
- indicar claramente qué archivos va a crear o modificar;
- evitar operaciones destructivas;
- no mover documentación vieja sin instrucción explícita.

## Contexto actual

Vertical activa: seguros.

Bloque activo:

LM-003A-B — Brokers / productores / organizadores

Objetivo operativo:
preparar keywords, candidatos y datos de prospección para identificar empresas de seguros que puedan convertirse en clientes LeadMaster.
