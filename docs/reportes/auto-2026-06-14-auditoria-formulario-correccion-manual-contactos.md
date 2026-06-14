# Informe técnico: auditoría inicial para formulario de corrección manual de contactos

**Fecha:** 2026-06-14  
**Proyecto:** LeadMaster / Staging de prospectos / Integración Dolibarr  
**Autor:** Agente OpenClaw (GitHub Copilot, GPT-5.4)  
**Estado:** Borrador

---

## 📋 Resumen Ejecutivo

El repositorio `prospectos-leadmaster` sí puede ser un candidato válido para implementar la herramienta administrativa de corrección manual de contactos, pero hoy no la contiene todavía. La base técnica existente ya resuelve piezas reutilizables del flujo, aunque el informe original quedó desactualizado respecto de la base operativa vigente.

La corrección posterior a la auditoría indica que el staging operativo actual ya no debe asumirse sobre `leadmaster.stg_*`, sino sobre `iunaorg_dyd.la_stg_prospectos` e `iunaorg_dyd.la_stg_prospectos_contactos`. Por lo tanto, cualquier implementación futura del formulario debe validar y adaptar las conexiones del repositorio para operar contra `iunaorg_dyd.la_*`.

`iunaorg_dyd.llxbx_societe` sigue siendo destino posterior de exportación/importación controlada y no debe editarse todavía desde el formulario.

La principal brecha actual es de superficie de producto: no existe frontend web implementado ni endpoints API para listar pendientes o guardar correcciones manuales en staging. También falta soporte de esquema para registrar estado de validación humana (`contacto_estado`, `contacto_validado_at`, `contacto_validado_note`), por lo que sería necesaria al menos una migración propuesta antes de llevar esa funcionalidad a producción.

## 🎯 Objetivo

Auditar si este proyecto es el lugar correcto para implementar un formulario web administrativo que permita revisar y corregir manualmente contactos de prospectos pendientes, sin tocar todavía `llxbx_societe` ni ejecutar cambios sobre la base.

## 🔍 Contexto / Antecedentes

El flujo operativo vigente debe entenderse así:

1. Captura/base operativa de prospectos en `iunaorg_dyd.la_prospectos`.
2. Trabajo de staging en `iunaorg_dyd.la_stg_prospectos`.
3. Enriquecimiento de contacto y persistencia normalizada en `iunaorg_dyd.la_stg_prospectos_contactos`.
4. Preparación de export hacia Dolibarr (`iunaorg_dyd.llxbx_societe`) mediante SQL generado.

La necesidad actual aparece entre los pasos 3 y 4: hay registros con `email_extraido` vacío, `error_msg` con errores HTTP o de fetch, y casos donde sólo existe teléfono/WhatsApp o donde el email extraído necesita validación humana.

## 📊 Desarrollo / Análisis

### 1. Estructura real del proyecto

#### Backend existente

- `src/api/server.js` expone una API Express con conexión MySQL compartida.
- `src/shared/config.js` centraliza la configuración de base y API.
- El backend actual maneja sólo el dominio `prospectos` de captura inicial.

Endpoints vigentes detectados:

- `POST /api/prospectos`
- `GET /api/prospectos`
- `GET /api/prospectos/:id`
- `GET /api/prospectos/check-processed`
- `PUT /api/prospectos/:id/validate`
- `GET /api/health`

Conclusión parcial: la app ya tiene backend HTTP reutilizable para agregar endpoints de administración sobre staging, pero debe adaptarse para operar contra `iunaorg_dyd.la_*`.

#### Frontend existente

- No existe carpeta `frontend/` implementada en el workspace actual.
- No se detectaron archivos `.html`, `.jsx`, `.tsx`, `.vue`, `.ejs`, `.pug`, `.css` o `.scss` dentro del repositorio.
- La documentación menciona `frontend/` como mejora futura, no como parte activa del sistema.

Conclusión parcial: la pantalla de corrección manual debería crearse desde cero en este repo o servirse inicialmente desde el propio backend Express con una UI mínima administrativa.

#### Scripts y staging existentes

- `scripts/sync-stg-prospectos.js` sincroniza `prospectos` hacia `stg_prospectos`.
- `scripts/enrich-stg-contact-from-landing.js` enriquece `stg_prospectos` y persiste contactos normalizados en `stg_prospectos_contactos`.
- `scripts/enrich-stg-nom-from-landing.js` completa `nom` para preexport.

Conclusión parcial: el dominio de staging/contactos ya vive en este repo, aunque todavía en forma de scripts batch y no de API/UI. Los nombres `stg_prospectos` y `stg_prospectos_contactos` pueden seguir apareciendo en scripts o documentación histórica, pero para la implementación futura de esta herramienta la referencia operativa vigente debe ser `iunaorg_dyd.la_stg_prospectos` e `iunaorg_dyd.la_stg_prospectos_contactos`.

### 2. Conexión actual a base de datos

#### Base operativa vigente para staging

El backend y los scripts deben auditarse/adaptarse para confirmar la conexión runtime contra la base operativa vigente:

- `iunaorg_dyd`

La conexión `mysql2/promise` se usa en:

- `src/api/server.js`
- `src/scraper/leadmaster_scraper.js`
- `scripts/sync-stg-prospectos.js`
- `scripts/enrich-stg-contact-from-landing.js`

#### Relación con `iunaorg_dyd`

La corrección posterior a la auditoría obliga a tratar `iunaorg_dyd` como base operativa real del flujo vigente para `la_prospectos`, `la_stg_prospectos` y `la_stg_prospectos_contactos`. Por lo tanto, antes de implementar el formulario hay que verificar `.env` y la configuración runtime efectiva para confirmar esa conexión.

Las referencias a `iunaorg_dyd` aparecen sobre todo en:

- `config/export_generate_dolibarr_societe.sql`
- `config/dolibarr_recover_societe_from_backup.sql`
- documentación en `docs/reportes/`

Conclusión parcial: el proyecto debe dejar de asumir `leadmaster.stg_*` como staging vigente. El formulario administrativo debe operar sobre `iunaorg_dyd.la_stg_*`, mientras `iunaorg_dyd.llxbx_societe` permanece como destino posterior no editable desde esta herramienta.

### 3. Confirmación de tablas y campos relevantes

#### Tablas confirmadas por código/documentación

En el flujo vigente hay referencias claras a:

- `iunaorg_dyd.la_prospectos`
- `iunaorg_dyd.la_stg_prospectos`
- `iunaorg_dyd.la_stg_prospectos_contactos`
- `iunaorg_dyd.llxbx_societe`

#### Campos relevantes encontrados

En staging y scripts se confirmaron referencias a:

- `email_extraido`
- `telefono_extraido`
- `whatsapp_extraido`
- `direccion_extraida`
- `error_msg`
- `estado`
- `place_id`
- `nom`

No se encontraron referencias existentes a:

- `contacto_estado`
- `contacto_validado_at`
- `contacto_validado_note`

Conclusión parcial: los campos de auditoría humana no están modelados todavía. La propuesta debe aplicarse conceptualmente sobre `iunaorg_dyd.la_stg_prospectos`.

### 4. Cómo persiste hoy el enriquecimiento de contactos

El script `scripts/enrich-stg-contact-from-landing.js` ya define reglas cercanas a las que necesitaría la corrección manual y sirve como referencia de negocio para el staging operativo actual:

- inserta en la tabla de contactos normalizados, que operativamente debe entenderse como `iunaorg_dyd.la_stg_prospectos_contactos`, con `tipo`, `valor`, `valor_normalizado`, `es_principal`, `fuente`, `url_fuente`
- actualmente usa `fuente='landing'`
- actualiza la tabla de staging principal, que operativamente debe entenderse como `iunaorg_dyd.la_stg_prospectos`, en `email_extraido`, `telefono_extraido`, `whatsapp_extraido`
- limpia `error_msg` sólo cuando hubo actualización válida de contacto
- deja `error_msg` con mensaje cuando falla el fetch/enriquecimiento

Esto vuelve al script una referencia de negocio útil para reutilizar reglas desde endpoints administrativos.

### 5. Diagnóstico sobre si este proyecto es el lugar correcto

Sí, con una precisión importante: este repo puede ser el lugar funcional para implementar la corrección manual si es el módulo web/admin que se va a usar. Pero no debe seguir asumiendo `leadmaster.stg_*` como fuente real.

Hoy concentra:

- la API operativa
- piezas de conexión reutilizables
- la lógica de staging
- la preparación previa a exportación
- la semántica de `la_stg_prospectos_contactos` y `es_principal`

No sería correcto implementar esta funcionalidad directamente del lado de Dolibarr o sobre `llxbx_societe`, porque la validación debe resolverse antes de exportar y porque `llxbx_societe` sigue siendo destino final, no tabla de edición manual directa.

Antes de implementar, hay que auditar/configurar la conexión real a `iunaorg_dyd`.

### 6. Dónde convendría implementar

#### Backend propuesto

Punto natural de entrada:

- `src/api/server.js`

Mejora recomendada de diseño antes o durante implementación:

- extraer acceso a datos de staging a un módulo nuevo, por ejemplo `src/api/staging-contactos.js` o `src/shared/staging-contactos-repository.js`

Razón:

- `src/api/server.js` hoy concentra rutas y SQL en un único archivo.
- para la nueva funcionalidad conviene separar consultas de listado, detalle y guardado manual.
- las nuevas consultas deben leer/escribir `iunaorg_dyd.la_stg_prospectos` e `iunaorg_dyd.la_stg_prospectos_contactos`.

#### Frontend propuesto

Opciones viables dentro de este repo:

1. Pantalla administrativa servida por Express con HTML/JS simple.
2. Nueva mini app frontend en una carpeta nueva dedicada.

Dado que hoy no existe frontend activo, la opción con menor fricción inicial es:

- agregar una pantalla administrativa simple servida desde el backend actual

Nombre recomendado de pantalla:

- `Corrección manual de contactos`

Secciones recomendadas de la pantalla:

- tabla/fila de pendientes con filtros
- panel lateral o modal de edición
- preview de datos actuales en `la_stg_prospectos`
- historial/listado normalizado de `la_stg_prospectos_contactos`
- acciones rápidas: marcar válido, guardar email, guardar teléfono, guardar WhatsApp, limpiar error tras corrección válida

#### Componentes reutilizables

No se detectaron componentes frontend reutilizables porque no hay frontend implementado.

Sí hay reutilización posible de reglas de negocio backend ya existentes:

- normalización de emails y teléfonos
- semántica de `es_principal`
- uso de `fuente`
- limpieza condicional de `error_msg`

### 7. Contrato de API propuesto

#### GET `/api/prospectos/staging/contactos-pendientes`

Objetivo:

- listar prospectos en staging que necesitan intervención humana.
- leer desde `iunaorg_dyd.la_stg_prospectos` e `iunaorg_dyd.la_stg_prospectos_contactos`.

Filtros recomendados:

- `sin_email=1`
- `con_error=1`
- `con_telefono_sin_email=1`
- `con_whatsapp_sin_email=1`
- `prospecto_id=123`
- `prospecto_id_from=100&prospecto_id_to=150`
- `nom=texto`
- `limit` y `offset`

Respuesta sugerida:

```json
{
  "success": true,
  "data": [
    {
      "stg_id": 10,
      "prospecto_id": 123,
      "nom": "Empresa X",
      "palabra_clave": "seguro auto",
      "url_landing": "https://ejemplo.com/contacto",
      "email_extraido": null,
      "telefono_extraido": "1144445555",
      "whatsapp_extraido": null,
      "error_msg": "HTTP 403",
      "estado": "pendiente_place_id",
      "contactos": [
        {
          "id": 91,
          "tipo": "telefono",
          "valor": "1144445555",
          "valor_normalizado": "1144445555",
          "es_principal": 1,
          "fuente": "landing",
          "url_fuente": "https://ejemplo.com/contacto"
        }
      ]
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

Regla de selección sugerida para pendientes:

- `email_extraido` vacío
- o `error_msg` no vacío
- o `telefono_extraido` no vacío con email vacío
- o `whatsapp_extraido` no vacío con email vacío
- o `contacto_estado` en valores de revisión manual, cuando exista la migración

#### PUT `/api/prospectos/staging/:id/contacto-manual`

Se recomienda `PUT` porque el recurso a corregir es el staging record identificado por `:id`.

Este endpoint debe escribir sobre:

- `iunaorg_dyd.la_stg_prospectos`
- `iunaorg_dyd.la_stg_prospectos_contactos`

Body propuesto:

```json
{
  "email_extraido": "contacto@empresa.com",
  "telefono_extraido": "1144445555",
  "whatsapp_extraido": "5491144445555",
  "contacto_estado": "validado_manual",
  "contacto_validado_note": "Email validado desde formulario de contacto del sitio.",
  "url_fuente": "https://empresa.com/contacto"
}
```

Reglas de negocio propuestas:

1. Actualizar `iunaorg_dyd.la_stg_prospectos` con los valores corregidos sólo para los campos presentes y válidos.
2. Insertar o actualizar en `iunaorg_dyd.la_stg_prospectos_contactos` una fila por tipo corregido (`email`, `telefono`, `whatsapp`).
3. Usar `fuente='manual'` en las filas generadas por esta pantalla.
4. Marcar `es_principal=1` para el dato corregido manualmente.
5. Despromover otros principales del mismo `stg_prospecto_id` y mismo `tipo` si el nuevo valor manual queda principal.
6. Limpiar `error_msg` sólo si la corrección ingresada es válida y resuelve la carencia principal del registro.
7. No tocar `llxbx_societe` ni ejecutar export desde este endpoint.

Transacción recomendada:

1. leer fila actual de `iunaorg_dyd.la_stg_prospectos`
2. validar payload
3. actualizar `iunaorg_dyd.la_stg_prospectos`
4. upsert en `iunaorg_dyd.la_stg_prospectos_contactos`
5. ajustar `es_principal`
6. actualizar campos de auditoría manual
7. commit

### 8. Propuesta de migración necesaria

La auditoría indica que sí hace falta proponer una migración.

#### Campos solicitados

- `contacto_estado`
- `contacto_validado_at`
- `contacto_validado_note`

#### Ubicación recomendada de esos campos

Recomendación principal:

- agregarlos en `iunaorg_dyd.la_stg_prospectos`

Razón:

- la pantalla propuesta corrige el estado general de revisión del prospecto en staging
- los filtros de listado pendientes quedan más simples
- permite saber si el registro quedó pendiente, validado o descartado a nivel operativo

Valores sugeridos para `contacto_estado`:

- `pendiente_manual`
- `validado_manual`
- `sin_dato_confiable`
- `descartado`

Observación de modelado:

- si más adelante se necesita auditoría por contacto individual, convendría además extender `iunaorg_dyd.la_stg_prospectos_contactos` con metadata manual específica (`validado_por`, `validado_at`, `note`).
- para el alcance pedido ahora, alcanza con proponer la migración sobre `iunaorg_dyd.la_stg_prospectos`.

Migración propuesta conceptualmente:

```sql
ALTER TABLE iunaorg_dyd.la_stg_prospectos
  ADD COLUMN contacto_estado VARCHAR(50) NULL AFTER error_msg,
  ADD COLUMN contacto_validado_at DATETIME NULL AFTER contacto_estado,
  ADD COLUMN contacto_validado_note TEXT NULL AFTER contacto_validado_at;

CREATE INDEX idx_la_stg_contacto_estado
  ON iunaorg_dyd.la_stg_prospectos (contacto_estado);

CREATE INDEX idx_la_stg_prospecto_id
  ON iunaorg_dyd.la_stg_prospectos (prospecto_id);
```

No se aplicó esta migración en la auditoría.

### 9. Archivos candidatos a modificar en una implementación posterior

Archivos claramente candidatos:

- `src/api/server.js`
- `src/shared/config.js`
- `scripts/enrich-stg-contact-from-landing.js`

Archivos nuevos probables:

- módulo de consultas/repositorio para staging contactos
- vista frontend administrativa o carpeta frontend nueva
- archivo SQL de migración para columnas de validación manual
- informe o guía operativa de uso de la pantalla

Archivos de referencia existentes para alinear reglas:

- `config/migration_add_phone_whatsapp_stg.sql`
- `config/migration_add_nom_stg.sql`
- `config/preexport_set_email_principal.sql`
- `config/export_generate_dolibarr_societe.sql`

## Corrección crítica posterior a la auditoría

- La auditoría inicial detectó `leadmaster.stg_*` como staging del repo.
- Sin embargo, el flujo operativo vigente ya migró a `iunaorg_dyd.la_*`.
- Por lo tanto, cualquier implementación futura del formulario debe tomar `iunaorg_dyd.la_stg_prospectos` y `iunaorg_dyd.la_stg_prospectos_contactos` como tablas objetivo.
- `leadmaster.stg_*` debe tratarse como referencia histórica o esquema anterior hasta que se confirme lo contrario.

## 🛠️ Metodología / Enfoque

La auditoría se realizó en modo lectura sobre:

- estructura del repo
- `package.json`
- backend Express actual
- configuración compartida y `.env`
- scripts de sincronización y enriquecimiento de staging
- SQL de export a Dolibarr
- reglas locales de documentación

No se modificó código, no se ejecutaron migraciones, no se aplicaron cambios sobre la base y no se hizo commit ni push.

## 📈 Resultados / Hallazgos

| Hallazgo | Resultado | Observación |
|---|---|---|
| Backend API reutilizable | Sí | Express + MySQL ya operativo |
| Frontend existente | No | No hay app web implementada en este repo |
| Base operativa vigente de staging | `iunaorg_dyd` | Debe verificarse/configurarse en runtime |
| Uso de `la_stg_prospectos` | Sí | Confirmado como staging operativo actual |
| Uso de `la_stg_prospectos_contactos` | Sí | Confirmado como staging operativo actual |
| Conexión runtime a `iunaorg_dyd` desde API | No confirmada | Debe auditarse/configurarse antes de implementar |
| Campos de validación manual | No | Requieren migración propuesta |
| Lugar correcto para el formulario | Sí, con adaptación | Debe operar contra `iunaorg_dyd.la_*` y no editar `llxbx_societe` |

## ⚠️ Riesgos

1. `src/api/server.js` hoy está monolítico; agregar lógica compleja ahí sin modularizar puede degradar mantenibilidad.
2. No existe frontend previo, así que la primera versión de la pantalla requerirá definir stack/UI desde cero.
3. La lógica de `es_principal` hoy ya participa del preexport; una corrección manual mal diseñada puede alterar el email/teléfono exportado a Dolibarr.
4. Limpiar `error_msg` sin una validación real del dato puede ocultar casos donde la landing sigue rota o el contacto no es confiable.
5. Si no se modela `contacto_estado`, el backlog manual quedará sin trazabilidad operativa y será difícil distinguir pendientes reales de casos ya revisados.
6. Existen credenciales y configuración de Dolibarr en `.env`; la implementación futura deberá evitar exponerlas en frontend o endpoints administrativos.

## 🧩 Conclusiones

Este proyecto sí puede ser el lugar correcto para implementar el formulario web de corrección manual de contactos, porque ya contiene una capa de staging previa a Dolibarr, lógica de enriquecimiento asociada y una API Node/Express reutilizable. Pero el formulario no debe seguir documentándose contra `leadmaster.stg_*`; debe operar exclusivamente sobre `iunaorg_dyd.la_stg_prospectos` e `iunaorg_dyd.la_stg_prospectos_contactos`.

`leadmaster.stg_*` debe tratarse como referencia vieja o histórica hasta confirmar lo contrario. `iunaorg_dyd.llxbx_societe` sigue siendo destino final y no debe editarse de forma manual directa desde este formulario.

La implementación futura requerirá tres piezas nuevas: endpoints administrativos para staging, una UI web administrativa y una migración propuesta para registrar estado/nota/fecha de validación manual. La base técnica puede seguir en este repo, pero primero debe verificarse la configuración real de conexión a `iunaorg_dyd`.

## 🚀 Próximos Pasos / Recomendaciones

- [ ] Definir el esquema final de `contacto_estado` y decidir si vive sólo en `iunaorg_dyd.la_stg_prospectos` o también en `iunaorg_dyd.la_stg_prospectos_contactos`.
- [ ] Diseñar el contrato final de `GET /api/prospectos/staging/contactos-pendientes` y `PUT /api/prospectos/staging/:id/contacto-manual`.
- [ ] Extraer a un módulo dedicado la lógica SQL de staging/contactos antes de ampliar `src/api/server.js`.
- [ ] Elegir la estrategia de UI inicial: HTML/JS servido por Express o frontend separado dentro del repo.
- [ ] Preparar la migración SQL propuesta, sin aplicarla todavía.
- [ ] Verificar `.env` y configuración runtime para confirmar conexión a `iunaorg_dyd`.
- [ ] Buscar y reemplazar referencias operativas obsoletas a `leadmaster.stg_*`.
- [ ] Replantear endpoints y migración sobre `iunaorg_dyd.la_*`.
- [ ] Recién después implementar formulario.

## 🔗 Referencias / Recursos

- [docs/REGLAS-INFORMES.md](../REGLAS-INFORMES.md)
- [docs/reportes/TEMPLATE-INFORME.md](TEMPLATE-INFORME.md)
- [src/api/server.js](../../src/api/server.js)
- [src/shared/config.js](../../src/shared/config.js)
- [scripts/sync-stg-prospectos.js](../../scripts/sync-stg-prospectos.js)
- [scripts/enrich-stg-contact-from-landing.js](../../scripts/enrich-stg-contact-from-landing.js)
- [config/preexport_set_email_principal.sql](../../config/preexport_set_email_principal.sql)
- [config/export_generate_dolibarr_societe.sql](../../config/export_generate_dolibarr_societe.sql)
- [docs/reportes/2026-05-07-guia-proceso-leads-a-dolibarr.md](2026-05-07-guia-proceso-leads-a-dolibarr.md)

---

*Documento generado siguiendo `docs/REGLAS-INFORMES.md` y plantilla base `docs/reportes/TEMPLATE-INFORME.md`.*