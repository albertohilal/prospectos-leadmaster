# Contrato UI corrección manual de contactos

## Objetivo
La UI permitirá revisar registros de staging pendientes, corregir email/teléfono/WhatsApp y marcar estados manuales de revisión sin tocar `llxbx_societe`.

## Estado actual del frontend
A la fecha de este contrato, en este repo no existe todavía una UI implementada, ni componentes, ni router frontend, ni servicios cliente administrativos. El contrato se define como especificación previa para una futura pantalla administrativa.

## Alcance
Incluye:

- listar registros pendientes de revisión
- ver datos principales de staging
- ver `pending_reasons`
- ver resumen de contactos normalizados disponible en el GET actual
- editar `email_extraido`
- editar `telefono_extraido`
- editar `whatsapp_extraido`
- marcar `contacto_estado`
- cargar `contacto_validado_note`
- guardar vía `PUT`

Excluye:

- escribir en `llxbx_societe`
- exportar a Dolibarr
- ejecutar campañas
- borrar registros
- modificar `.env`
- tocar PM2
- hacer rollback desde UI en esta fase

## Endpoint GET

`GET /api/prospectos/staging/contactos-pendientes?limit=50&offset=0`

### Query params

- `limit`
- `offset`

### Respuesta esperada

- `success`
- `data[]`
- `pagination.total`
- `pagination.limit`
- `pagination.offset`

### Campos esperados por cada item

- `id`
- `prospecto_id`
- `nom`
- `palabra_clave`
- `url_landing`
- `email_extraido`
- `telefono_extraido`
- `whatsapp_extraido`
- `contacto_estado`
- `contacto_validado_at`
- `contacto_validado_note`
- `error_msg`
- `estado`
- `updated_at`
- `pending_reasons`

### Aclaración importante

El GET actual no devuelve un array completo `contactos_normalizados[]`. Solo devuelve resumen agregado de contactos, por ejemplo totales por tipo y contactos principales si están disponibles en la respuesta real. Si la UI necesita ver el detalle completo de `la_stg_prospectos_contactos`, eso debe quedar como decisión de backend futura.

### Estados listados por GET

- `pendiente`
- `error_tecnico`

### Estados excluidos por GET

- `corregido_manual`
- `sin_email`
- `descartado`
- `validado_manual`

## Endpoint PUT

`PUT /api/prospectos/staging/:id/contacto-manual`

### Payload permitido

```json
{
  "email_extraido": "correo@dominio.com",
  "telefono_extraido": "string",
  "whatsapp_extraido": "string",
  "contacto_estado": "pendiente|corregido_manual|sin_email|descartado|validado_manual|error_tecnico",
  "contacto_validado_note": "texto opcional"
}
```

### Reglas

- se puede enviar solo `contacto_estado` y nota
- se puede enviar una o más correcciones de contacto
- si hay correcciones y no se envía `contacto_estado`, backend asigna `corregido_manual`
- `contacto_validado_at` se actualiza si hay corrección, estado o nota
- `error_msg` solo se limpia si hubo corrección real de contacto
- no escribe en `llxbx_societe`

### Respuesta esperada exitosa

```json
{
  "success": true,
  "message": "Corrección manual guardada en staging",
  "data": {
    "id": 259,
    "updatedFields": [],
    "contacto_estado": "sin_email",
    "contacto_validado_note": "texto",
    "fuente": "manual"
  }
}
```

## Errores HTTP esperados

- `400`: ID inválido, payload inválido, estado no permitido, nota demasiado larga o ausencia de corrección/estado
- `404`: registro staging inexistente
- `500`: error interno del servidor o error de base de datos

La UI debe mostrar mensaje claro y no remover el registro de la grilla si el `PUT` falla.

## Estados UI
Definir comportamiento visual sugerido:

- `pendiente`: requiere revisión
- `error_tecnico`: requiere revisión técnica
- `corregido_manual`: resuelto con corrección de contacto
- `sin_email`: revisado, no se encontró email
- `descartado`: no sirve como prospecto
- `validado_manual`: datos existentes aceptados manualmente

## Acciones UI
Definir acciones:

- Guardar corrección
- Marcar sin email
- Descartar
- Validar manualmente
- Marcar error técnico
- Cancelar edición

## Validaciones frontend
Definir:

- email con formato básico si se carga
- teléfono/WhatsApp permiten texto, pero la normalización definitiva queda en backend
- nota máxima sugerida: 1000 caracteres
- exigir al menos una corrección o un estado
- confirmar antes de `descartado`
- advertir antes de sobrescribir campos existentes

## Flujo operativo

1. Usuario abre pantalla administrativa.
2. UI llama `GET /api/prospectos/staging/contactos-pendientes`.
3. Usuario revisa el registro.
4. Usuario edita contacto o marca estado.
5. UI llama `PUT /api/prospectos/staging/:id/contacto-manual`.
6. Si `success=true`, la UI evalúa el estado resultante.
7. La UI remueve el registro de la grilla solo si el estado resultante es uno de:

  * `corregido_manual`
  * `sin_email`
  * `descartado`
  * `validado_manual`

8. Si el estado resultante es `pendiente` o `error_tecnico`, el registro debe seguir visible.

9. UI refresca `pagination.total` o recarga la página.

## Riesgos

- edición errónea de un contacto real
- marcado incorrecto como `sin_email` o `descartado`
- divergencia entre staging y Dolibarr
- confusión si PM2 producción sigue corriendo una versión vieja
- asumir que el GET devuelve detalle completo de contactos cuando actualmente solo devuelve resumen

## Decisiones pendientes

- ubicación exacta de la pantalla en el menú
- nombre visible de la pantalla
- edición inline o modal
- si se muestra preview de landing
- si se agrega endpoint futuro para detalle completo de contactos normalizados
- si se permitirá rollback desde UI o solo por backup técnico

## Criterios de aceptación UI
La UI se considerará lista cuando:

- liste correctamente registros `pendiente` y `error_tecnico`
- permita guardar correcciones de email/teléfono/WhatsApp
- permita marcar `sin_email`, `descartado`, `validado_manual` y `error_tecnico`
- muestre errores HTTP de forma clara
- no toque `llxbx_societe`
- no ejecute exportación a Dolibarr
- remueva de la grilla solo los estados resueltos
- mantenga visibles `pendiente` y `error_tecnico`
- permita operar sin modificar PM2 ni `.env`
