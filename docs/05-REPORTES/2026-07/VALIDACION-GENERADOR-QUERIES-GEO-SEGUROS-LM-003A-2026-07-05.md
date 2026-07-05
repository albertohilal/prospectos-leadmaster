# Validación generador de queries geográficas — Seguros LM-003A

**Fecha:** 2026-07-05  
**Proyecto:** LeadMaster  
**Repositorio:** prospectos-leadmaster-local  
**Bloque:** LM-003A — Preparación de datos para vertical seguros  
**Script validado:** `scripts/geo/generate-google-queries-seguros.js`  
**Archivo generado:** `exports/geo/queries-seguros.csv`  
**Estado:** Validado como prueba controlada local  

---

## 1. Objetivo de la validación

Validar que el generador de queries geográficas pueda combinar correctamente:

```text
keyword base + modificador geográfico
```

para producir búsquedas territoriales explícitas de la vertical seguros.

Ejemplos esperados:

```text
broker de seguros Cordoba
broker de seguros Santa Cruz
broker de seguros corporativos Rosario
productor asesor de seguros Mendoza
seguros para empresas CABA
```

Esta validación forma parte de la decisión metodológica de LeadMaster de no depender de la ubicación física, IP, sesión o historial del navegador al buscar prospectos en Google.

---

## 2. Comando ejecutado

Se ejecutó una prueba local controlada:

```bash
npm run geo:queries:seguros -- --prioridad 1 --limit 50
```

El comando generó el archivo:

```text
exports/geo/queries-seguros.csv
```

La ejecución fue solamente de generación de datos locales.

No se realizaron búsquedas en Google.
No se hizo scraping.
No se consumieron APIs externas.
No se modificó base de datos.
No se modificó el VPS.

---

## 3. Archivo CSV revisado

El CSV generado fue revisado manualmente.

Resultado de la revisión:

```text
Filas de datos: 50
Columnas: 10
Campos vacíos: 0
Queries únicas: 50
geo_key únicos: 6
keywords base únicas: 9
modificadores geográficos únicos: 6
```

La cabecera observada fue:

```text
query,geo_key,keyword_base,perfil_keyword,prioridad_keyword,modificador_geografico,tipo_ubicacion,prioridad_geografica,prioridad_combinada,fuente
```

La estructura es correcta porque conserva tanto la query final como los elementos que permiten auditar su origen.

---

## 4. Campos validados

| Campo                    | Validación                                             |
| ------------------------ | ------------------------------------------------------ |
| `query`                  | Contiene la búsqueda final generada                    |
| `geo_key`                | Permite trazar la ubicación usada                      |
| `keyword_base`           | Conserva la keyword original                           |
| `perfil_keyword`         | Conserva el perfil de keyword                          |
| `prioridad_keyword`      | Conserva la prioridad de la keyword                    |
| `modificador_geografico` | Conserva el modificador territorial                    |
| `tipo_ubicacion`         | Indica si el modificador es provincia, municipio, etc. |
| `prioridad_geografica`   | Conserva prioridad territorial                         |
| `prioridad_combinada`    | Calcula prioridad operativa combinada                  |
| `fuente`                 | Marca el origen como `generado_automatico`             |

---

## 5. Ejemplos correctos detectados

Durante la revisión se observaron queries válidas como:

```text
broker de seguros CABA
broker de seguros Buenos Aires
broker de seguros Cordoba
broker de seguros Rosario
broker de seguros Santa Fe
broker de seguros Mendoza
```

Ejemplo de trazabilidad esperada:

```text
query = broker de seguros Cordoba
geo_key = provincia:14
keyword_base = broker de seguros
modificador_geografico = Cordoba
tipo_ubicacion = provincia
prioridad_geografica = 1
```

Esto confirma que la query final no queda desacoplada de su origen territorial.

---

## 6. Alcance de la prueba

La prueba se ejecutó con:

```text
--prioridad 1
--limit 50
```

Por ese motivo, el CSV contiene únicamente modificadores geográficos de prioridad 1.

Modificadores geográficos observados:

```text
CABA
Buenos Aires
Cordoba
Rosario
Santa Fe
Mendoza
```

Esto es correcto para la prueba realizada.

No aparecen todavía:

```text
Neuquen
Tucuman
Entre Rios
Santa Cruz
```

porque esos modificadores están definidos con `prioridad_busqueda = 2` en el seed mínimo y fueron excluidos por el filtro `--prioridad 1`.

---

## 7. Resultado técnico

Resultado validado:

```text
keywords base seguros + modificadores geográficos prioridad 1 = queries territoriales trazables
```

La prueba confirma que el generador puede producir una salida revisable en CSV sin ejecutar búsquedas reales.

También confirma que `geo_key` queda incluido en la salida, lo cual es importante para futuras etapas de trazabilidad.

---

## 8. Relación con el catálogo geográfico

Esta validación depende del criterio definido para `la_cat_geo_keywords_ar`.

El catálogo geográfico tiene como función alimentar búsquedas del tipo:

```text
keyword base + modificador geográfico
```

No debe interpretarse como tabla de domicilio de prospectos.

Su función principal es permitir búsquedas territoriales explícitas, por ejemplo:

```text
broker seguros corporativos Cordoba
broker seguros corporativos Santa Cruz
productor asesor de seguros Mendoza
seguros para empresas Rosario
```

---

## 9. Relación con la metodología de búsqueda

Esta validación refuerza la decisión metodológica ya documentada:

LeadMaster no debe buscar únicamente:

```text
broker seguros corporativos
```

porque esa búsqueda puede estar condicionada por ubicación local, IP, sesión o historial.

En cambio, debe generar consultas como:

```text
broker seguros corporativos Cordoba
broker seguros corporativos Santa Cruz
broker seguros corporativos Mendoza
broker seguros corporativos Rosario
```

Esto permite una búsqueda:

* reproducible;
* auditable;
* territorialmente balanceada;
* ampliable;
* priorizable;
* independiente de la ubicación física del operador.

---

## 10. Advertencia sobre el CSV generado

El archivo:

```text
exports/geo/queries-seguros.csv
```

fue generado como salida de prueba.

No debe considerarse todavía un lote operativo aprobado para búsqueda o scraping.

Recomendación:

```text
No versionar el CSV de prueba.
Generarlo bajo demanda cuando sea necesario.
Documentar solamente la validación.
```

El CSV podrá versionarse más adelante si se define como lote operativo aprobado.

---

## 11. Limitaciones de la validación

1. La prueba usó arrays internos de ejemplo del script.
2. La prueba no leyó todavía desde base de datos.
3. La prueba no consumió el catálogo completo desde Georef.
4. La prueba no incluyó población INDEC.
5. La prueba no ejecutó búsquedas en Google.
6. La prueba no hizo scraping.
7. La prueba usó solo `prioridad_geografica <= 1`.
8. La prueba se limitó a 50 queries.

---

## 12. Próximos pasos recomendados

1. Borrar el CSV de prueba si quedó en `exports/geo/`.
2. Mantener el generador como herramienta local controlada.
3. Generar una nueva muestra incluyendo prioridad 2 cuando se quiera revisar cobertura federal ampliada.
4. Evaluar la generación de un lote revisable con todas las combinaciones del seed mínimo.
5. Investigar el dataset INDEC para incorporar población.
6. Luego de incorporar población, recalcular prioridades territoriales.
7. Recién después definir un lote operativo de búsquedas para Google.
8. No iniciar scraping hasta tener aprobado el lote de queries.

---

## 13. Estado final

La validación del generador queda aprobada como prueba local.

```text
Generador ejecutado correctamente.
CSV de prueba generado correctamente.
50 queries generadas.
geo_key presente en la salida.
No se ejecutaron búsquedas en Google.
No se hizo scraping.
No se consumieron APIs.
No se modificó base de datos.
```

Estado:

```text
VALIDADO COMO PRUEBA LOCAL CONTROLADA
```
