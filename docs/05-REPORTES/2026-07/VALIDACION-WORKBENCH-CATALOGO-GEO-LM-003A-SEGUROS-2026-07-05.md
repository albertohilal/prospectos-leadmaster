# Validación Workbench — Catálogo geográfico para búsquedas seguros LM-003A

**Fecha:** 2026-07-05  
**Proyecto:** LeadMaster  
**Repositorio:** prospectos-leadmaster-local  
**Base de datos:** iunaorg_dyd  
**Tabla:** la_cat_geo_keywords_ar  
**Bloque:** LM-003A — Preparación de datos para vertical seguros  
**Estado:** Validado manualmente en MySQL Workbench  

---

## 1. Objetivo de la validación

Validar manualmente en MySQL Workbench la creación y carga inicial del catálogo geográfico `la_cat_geo_keywords_ar`.

Este catálogo se usa para generar búsquedas territoriales explícitas en Google, evitando que los resultados dependan de la ubicación física, IP, sesión o historial del navegador.

Ejemplo de uso esperado:

```text
broker seguros corporativos Cordoba
broker seguros corporativos Santa Cruz
productor asesor de seguros Mendoza
seguros para empresas Rosario
```

La tabla no funciona como tabla de domicilios de prospectos. Su función principal es actuar como catálogo de modificadores geográficos para combinar con keywords base de la vertical seguros.

---

## 2. Archivos SQL validados

Se validaron manualmente los siguientes archivos:

| Archivo                                                                              | Rol                                                   | Estado                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------- |
| `config/create_la_cat_geo_keywords_ar.sql`                                           | Crea la tabla `la_cat_geo_keywords_ar`                | Ejecutado en Workbench |
| `config/seed_la_cat_geo_keywords_ar_minimo.sql`                                      | Inserta seed mínimo de 10 ubicaciones                 | Ejecutado en Workbench |
| `docs/05-REPORTES/2026-07/AJUSTE-IDEMPOTENCIA-GEO-KEY-LM-003A-SEGUROS-2026-07-05.md` | Documenta la corrección de idempotencia con `geo_key` | Referencia documental  |

---

## 3. Validación de creación de tabla

Se ejecutó el script de creación:

```sql
CREATE TABLE IF NOT EXISTS la_cat_geo_keywords_ar (...)
```

La tabla quedó creada en la base:

```sql
iunaorg_dyd
```

Validación realizada:

```sql
DESCRIBE la_cat_geo_keywords_ar;
```

Resultado observado:

* La tabla existe.
* El campo `id` quedó como `PRIMARY KEY` con `auto_increment`.
* El campo `geo_key` quedó como `varchar(180)`, `NOT NULL`, con clave única.
* Los campos territoriales quedaron disponibles:

  * `provincia_id`
  * `provincia_nombre`
  * `departamento_id`
  * `departamento_nombre`
  * `municipio_id`
  * `municipio_nombre`
  * `localidad_id`
  * `localidad_nombre`
  * `localidad_censal_id`
  * `localidad_censal_nombre`
* Los campos de búsqueda quedaron disponibles:

  * `modificador_busqueda`
  * `modificador_normalizado`
  * `tipo_ubicacion`
  * `prioridad_busqueda`
  * `activa`
* Los campos de población quedaron disponibles pero sin datos iniciales:

  * `poblacion`
  * `poblacion_anio`
  * `poblacion_fuente`
  * `poblacion_fuente_url`
  * `fuente_poblacion`
  * `last_poblacion_sync_at`

---

## 4. Validación de índices

Se ejecutó:

```sql
SHOW INDEX FROM la_cat_geo_keywords_ar;
```

Resultado observado:

| Índice                        | Tipo     | Columna                                     | Estado   |
| ----------------------------- | -------- | ------------------------------------------- | -------- |
| `PRIMARY`                     | Único    | `id`                                        | Correcto |
| `uq_geo_key`                  | Único    | `geo_key`                                   | Correcto |
| `idx_modificador_normalizado` | No único | `modificador_normalizado`                   | Correcto |
| `idx_provincia_id`            | No único | `provincia_id`                              | Correcto |
| `idx_municipio_id`            | No único | `municipio_id`                              | Correcto |
| `idx_localidad_censal_id`     | No único | `localidad_censal_id`                       | Correcto |
| `idx_tipo_ubicacion`          | No único | `tipo_ubicacion`                            | Correcto |
| `idx_prioridad_busqueda`      | No único | `prioridad_busqueda`                        | Correcto |
| `idx_activa`                  | No único | `activa`                                    | Correcto |
| `idx_geo_tipo_modificador`    | No único | `tipo_ubicacion`, `modificador_normalizado` | Correcto |

La validación más importante fue la existencia de:

```sql
UNIQUE KEY uq_geo_key (geo_key)
```

Esto confirma que la estrategia de idempotencia del seed puede funcionar correctamente con `INSERT IGNORE`.

---

## 5. Validación del seed mínimo

Se ejecutó el archivo:

```text
config/seed_la_cat_geo_keywords_ar_minimo.sql
```

El seed insertó un conjunto mínimo de 10 modificadores geográficos.

Verificación ejecutada:

```sql
SELECT COUNT(*) AS total
FROM la_cat_geo_keywords_ar;
```

Resultado observado:

```text
10
```

Esto confirma que la carga inicial insertó correctamente los 10 registros esperados.

---

## 6. Registros insertados

Se ejecutó una consulta de revisión sobre los campos principales.

Registros observados:

| geo_key                | provincia_nombre                | departamento_nombre | modificador_busqueda | modificador_normalizado | tipo_ubicacion | prioridad_busqueda | poblacion |
| ---------------------- | ------------------------------- | ------------------- | -------------------- | ----------------------- | -------------- | ------------------ | --------- |
| `provincia:06`         | Buenos Aires                    | NULL                | Buenos Aires         | buenos aires            | provincia      | 1                  | NULL      |
| `provincia:02`         | Ciudad Autónoma de Buenos Aires | NULL                | CABA                 | caba                    | provincia      | 1                  | NULL      |
| `provincia:14`         | Córdoba                         | NULL                | Cordoba              | cordoba                 | provincia      | 1                  | NULL      |
| `provincia:50`         | Mendoza                         | NULL                | Mendoza              | mendoza                 | provincia      | 1                  | NULL      |
| `municipio:82:rosario` | Santa Fe                        | Rosario             | Rosario              | rosario                 | municipio      | 1                  | NULL      |
| `provincia:82`         | Santa Fe                        | NULL                | Santa Fe             | santa fe                | provincia      | 1                  | NULL      |
| `provincia:30`         | Entre Ríos                      | NULL                | Entre Rios           | entre rios              | provincia      | 2                  | NULL      |
| `provincia:58`         | Neuquén                         | NULL                | Neuquen              | neuquen                 | provincia      | 2                  | NULL      |
| `provincia:78`         | Santa Cruz                      | NULL                | Santa Cruz           | santa cruz              | provincia      | 2                  | NULL      |
| `provincia:90`         | Tucumán                         | NULL                | Tucuman              | tucuman                 | provincia      | 2                  | NULL      |

---

## 7. Validación de idempotencia

Se volvió a ejecutar el seed mínimo una segunda vez.

Workbench mostró warnings de duplicado del tipo:

```text
Duplicate entry 'provincia:30' for key 'uq_geo_key'
Duplicate entry 'provincia:78' for key 'uq_geo_key'
Duplicate entry 'provincia:90' for key 'uq_geo_key'
```

Estos warnings son esperados y correctos.

La consulta posterior:

```sql
SELECT COUNT(*) AS total
FROM la_cat_geo_keywords_ar;
```

volvió a devolver:

```text
10
```

Conclusión:

```text
El seed mínimo es idempotente.
```

La clave única `uq_geo_key` evita duplicados y permite que `INSERT IGNORE` funcione como mecanismo seguro de recarga.

---

## 8. Validación de población

En los registros insertados se observa:

```text
poblacion = NULL
```

Esto es correcto.

La población no debe venir del seed manual ni de Georef API. La población debe incorporarse luego desde una fuente oficial INDEC/Censo mediante un proceso separado.

Estado actual:

| Campo                    | Estado |
| ------------------------ | ------ |
| `poblacion`              | NULL   |
| `poblacion_anio`         | NULL   |
| `poblacion_fuente`       | NULL   |
| `poblacion_fuente_url`   | NULL   |
| `fuente_poblacion`       | NULL   |
| `last_poblacion_sync_at` | NULL   |

Esto mantiene separadas las responsabilidades:

```text
Georef / Datos Argentina → estructura territorial
INDEC / Censo → población
```

---

## 9. Validación metodológica

Esta validación confirma la decisión central del bloque geo:

LeadMaster no debe depender de búsquedas genéricas condicionadas por ubicación local.

En lugar de buscar solamente:

```text
broker seguros corporativos
```

se deben generar búsquedas territorializadas:

```text
broker seguros corporativos Cordoba
broker seguros corporativos Santa Cruz
broker seguros corporativos Mendoza
broker seguros corporativos Rosario
```

El catálogo `la_cat_geo_keywords_ar` permite construir esas búsquedas de forma:

* trazable;
* repetible;
* auditable;
* priorizable;
* desacoplada de la ubicación física del operador.

---

## 10. Resultado de la validación

Resultado final:

| Ítem                                                 | Estado   |
| ---------------------------------------------------- | -------- |
| Tabla `la_cat_geo_keywords_ar` creada                | Validado |
| Campo `geo_key` creado                               | Validado |
| Índice único `uq_geo_key` creado                     | Validado |
| Seed mínimo ejecutado                                | Validado |
| Total de registros esperados = 10                    | Validado |
| Reejecución del seed sin duplicar                    | Validado |
| Población pendiente en NULL                          | Validado |
| Catálogo listo para pruebas de generación de queries | Validado |

---

## 11. Advertencias

1. El catálogo actual contiene solo un seed mínimo de prueba.
2. La cobertura nacional completa todavía no fue sincronizada desde Georef.
3. La población todavía no fue importada desde INDEC.
4. No se ejecutaron scripts Node en esta validación.
5. No se ejecutaron búsquedas en Google.
6. No se hizo scraping.
7. La tabla fue creada y cargada manualmente en Workbench, no por automatización.
8. Las futuras cargas masivas deben respetar `geo_key` como clave de idempotencia.

---

## 12. Próximos pasos recomendados

1. Crear un script o consulta de verificación post-ejecución para `la_cat_geo_keywords_ar`.
2. Probar el generador de queries sin ejecutar búsquedas en Google.
3. Generar un CSV revisable de combinaciones `keyword + modificador geográfico`.
4. No usar todavía ese CSV como lote operativo hasta que sea aprobado.
5. Investigar el dataset exacto de INDEC para población por localidad, municipio o departamento.
6. Recién después de validar INDEC, actualizar campos de población.
7. Posteriormente, ampliar el catálogo desde Georef API en modo controlado.

---

## 13. Estado final

La validación manual en Workbench queda aprobada.

```text
DDL ejecutado correctamente.
Seed mínimo ejecutado correctamente.
Idempotencia validada.
Catálogo geográfico mínimo listo para la siguiente etapa.
```

No se ejecutó scraping.
No se ejecutaron búsquedas en Google.
No se consumieron APIs externas.
No se modificó el VPS.
