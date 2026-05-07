# Validación pre-export de `nom` para Dolibarr

**Fecha:** 2026-05-07  
**Proyecto:** LeadMaster → Dolibarr (`iunaorg_dyd.llxbx_societe.nom`)

## Objetivo
Ejecutar una segunda pasada **conservadora** para validar calidad de `stg_prospectos.nom` antes de exportar a Dolibarr, minimizando falsos positivos y evitando cambios destructivos automáticos.

## Resultado global

- Total registros en `stg_prospectos`: **102**
- Registros con `nom` informado: **102**
- Distribución de severidad:
  - `CRITICO_NOM_CORTO`: **1**
  - `MEDIO_EMAIL_PERSONAL`: **8**
  - `MEDIO_DOMINIO_NO_COINCIDE`: **5**
  - `OK`: **88**

## Criterios de severidad usados

- `CRITICO_NOM_CORTO`: `nom` con longitud < 4 o token de 1-3 letras.
- `MEDIO_EMAIL_PERSONAL`: email extraído con proveedores personales (`gmail`, `yahoo`, `hotmail`, `outlook`).
- `MEDIO_DOMINIO_NO_COINCIDE`: token principal de dominio de email no coincide con `nom` normalizado.

## Casos críticos (revisión manual obligatoria)

| prospecto_id | nom | email_extraido | url_landing |
|---|---|---|---|
| 97 | Dbz | dbz@dbz.com.ar | https://infositio.com.ar/dbz/ |

## Casos medios por email personal (revisión recomendada)

| prospecto_id | nom | email_extraido | url_landing |
|---|---|---|---|
| 49 | Planetcort | arielmastellone@gmail.com | https://planetcort.com/ |
| 71 | Alinealab | alinea.labb@gmail.com | https://alinealab.com.ar/laboratorio-alineadores-dentales |
| 73 | Mante Ascensores | manteascensores.adm@gmail.com | https://mante-ascensores.com.ar/ |
| 89 | Armabuya | buya2001@yahoo.com.ar | https://armabuya.com.ar/ |
| 92 | Planbtechos | planb.techos@gmail.com | https://planbtechos.com/ |
| 93 | Planbtechos | planb.techos@gmail.com | https://planbtechos.com/ |
| 109 | Distribuidoracuarso | distribuidoracuarso@gmail.com | https://distribuidoracuarso.com.ar/ |
| 120 | Caldentanques | calden.tanques@gmail.com | https://www.caldentanques.com.ar/index.html |

## Decisión de esta pasada

- No se aplicaron cambios automáticos en los casos críticos/medios.
- Se preservó criterio conservador para evitar degradar nombres válidos.
- El dataset queda listo para exportación con una cola corta de revisión manual.

## Recomendación operativa

1. Revisar manualmente los 1 críticos y 8 medios.
2. Confirmar/ajustar `nom` solo en esos casos.
3. Ejecutar exportación a Dolibarr.
