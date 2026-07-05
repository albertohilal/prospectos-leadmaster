# Validación lote completo de queries geográficas — Seguros LM-003A

**Fecha:** 2026-07-05  
**Proyecto:** LeadMaster  
**Repositorio:** prospectos-leadmaster-local  
**Bloque:** LM-003A — Preparación de datos para vertical seguros  
**Script usado:** `scripts/geo/generate-google-queries-seguros.js`  
**Archivo generado:** `exports/geo/queries-seguros.csv`  
**Estado:** Validado técnicamente como lote revisable, no aprobado aún para scraping  

---

## 1. Objetivo de la validación

Validar técnicamente el lote completo de queries geográficas para la vertical seguros, generado a partir de la combinación:

```text
keyword base + modificador geográfico
```

El objetivo de este lote es preparar búsquedas territoriales explícitas para Google, evitando que los resultados dependan de la ubicación física, IP, sesión, historial del navegador o contexto local del operador.

Ejemplos del tipo de query buscado:

```text
broker de seguros Cordoba
broker de seguros Santa Cruz
broker de seguros corporativos Rosario
productor asesor de seguros Mendoza
seguros para empresas Neuquen
```

Esta validación confirma que el generador puede producir un lote completo, trazable y revisable antes de iniciar cualquier búsqueda real.

---

## 2. Comando ejecutado

Se ejecutó manualmente el generador con prioridad geográfica 1 y 2:

```bash
npm run geo:queries:seguros -- --prioridad 2
```

El comando generó el archivo:

```text
exports/geo/queries-seguros.csv
```

La ejecución fue local y controlada.

No se realizaron búsquedas en Google.
No se hizo scraping.
No se consumieron APIs externas.
No se modificó base de datos.
No se modificó el VPS.

---

## 3. Resultado general del CSV

El CSV completo fue revisado manualmente.

Resultado de validación:

```text
Filas de datos: 230
Columnas: 10
Campos vacíos: 0
Queries únicas: 230
Queries duplicadas: 0
geo_key únicos: 10
keywords base únicas: 23
modificadores geográficos únicos: 10
```

Esto confirma que el lote completo responde a la fórmula esperada:

```text
23 keywords base x 10 ubicaciones = 230 queries
```

El archivo contiene una cabecera y 230 filas de datos. Si `wc -l` devuelve 230, puede deberse a que el archivo no tiene salto de línea final. No se considera un error de contenido.

---

## 4. Cabecera validada

La cabecera del CSV mantiene trazabilidad suficiente:

```text
query,geo_key,keyword_base,perfil_keyword,prioridad_keyword,modificador_geografico,tipo_ubicacion,prioridad_geografica,prioridad_combinada,fuente
```

Campos validados:

| Campo                    | Función                                      |
| ------------------------ | -------------------------------------------- |
| `query`                  | Query final generada para revisión           |
| `geo_key`                | Clave territorial de trazabilidad            |
| `keyword_base`           | Keyword original de seguros                  |
| `perfil_keyword`         | Perfil de la keyword                         |
| `prioridad_keyword`      | Prioridad asignada a la keyword              |
| `modificador_geografico` | Territorio usado en la query                 |
| `tipo_ubicacion`         | Provincia, municipio u otro tipo territorial |
| `prioridad_geografica`   | Prioridad territorial                        |
| `prioridad_combinada`    | Prioridad calculada por keyword + territorio |
| `fuente`                 | Origen de la fila generada                   |

La presencia de `geo_key` es fundamental porque permite reconstruir el origen territorial de cada búsqueda.

---

## 5. Distribución por perfil de keyword

La revisión manual confirmó la siguiente distribución:

```text
Perfil A — Alta prioridad LeadMaster: 110 queries
Perfil B — Media/alta: 80 queries
Perfil D — Ambigua / revisar: 40 queries
```

### Perfil A — Alta prioridad LeadMaster

Este perfil corresponde a búsquedas orientadas directamente a posibles clientes LeadMaster dentro de la vertical seguros:

```text
broker de seguros
brokers de seguros
productor asesor de seguros
productores asesores de seguros
productor de seguros
productores de seguros
asesor de seguros
asesores de seguros
organizador de productores de seguros
agencia de seguros
consultora de seguros
```

Este grupo es el más alineado con el objetivo comercial: detectar brokers, productores, organizadores, agencias y consultoras que puedan contratar LeadMaster para recibir prospectos calificados.

Resultado:

```text
11 keywords x 10 territorios = 110 queries
```

### Perfil B — Prioridad media/alta

Este perfil corresponde a búsquedas relacionadas con seguros empresariales o corporativos:

```text
seguros para empresas
seguros empresariales
seguros corporativos
broker de seguros corporativos
productor de seguros para empresas
seguros para pymes
seguros para comercios
seguros para industrias
```

Este grupo puede encontrar tanto intermediarios como páginas comerciales de oferta de seguros empresariales.

Resultado:

```text
8 keywords x 10 territorios = 80 queries
```

### Perfil D — Ambigua / revisar

Este perfil contiene búsquedas con intención comercial más ambigua:

```text
contratar broker de seguros
cotizar seguros empresas
cotizar seguro de caución
presupuesto seguro empresa
```

Resultado:

```text
4 keywords x 10 territorios = 40 queries
```

Estas queries pueden traer:

* compradores finales;
* empresas buscando seguros;
* brokers pautando servicios;
* aseguradoras;
* sitios comparadores;
* falsos positivos.

Por eso no deben usarse como fuente principal sin revisión manual previa.

---

## 6. Distribución por prioridad geográfica

La revisión confirmó:

```text
Prioridad geográfica 1: 138 queries
Prioridad geográfica 2: 92 queries
```

Esto es coherente con el seed mínimo:

* 6 ubicaciones de prioridad 1.
* 4 ubicaciones de prioridad 2.
* 23 keywords base.

Cálculo:

```text
23 keywords x 6 ubicaciones prioridad 1 = 138 queries
23 keywords x 4 ubicaciones prioridad 2 = 92 queries
Total = 230 queries
```

---

## 7. Distribución por territorio

Cada territorio aparece con 23 queries, una por cada keyword base.

Distribución validada:

| Territorio   | geo_key                | Prioridad geográfica | Queries |
| ------------ | ---------------------- | -------------------: | ------: |
| CABA         | `provincia:02`         |                    1 |      23 |
| Buenos Aires | `provincia:06`         |                    1 |      23 |
| Cordoba      | `provincia:14`         |                    1 |      23 |
| Rosario      | `municipio:82:rosario` |                    1 |      23 |
| Santa Fe     | `provincia:82`         |                    1 |      23 |
| Mendoza      | `provincia:50`         |                    1 |      23 |
| Neuquen      | `provincia:58`         |                    2 |      23 |
| Tucuman      | `provincia:90`         |                    2 |      23 |
| Entre Rios   | `provincia:30`         |                    2 |      23 |
| Santa Cruz   | `provincia:78`         |                    2 |      23 |

Esto confirma que el lote completo incorpora los territorios de prioridad 2, que no aparecían en la prueba limitada anterior.

---

## 8. Territorios de prioridad 2 incluidos

La validación confirma la inclusión de:

```text
Neuquen
Tucuman
Entre Rios
Santa Cruz
```

Estos territorios son importantes para evitar que el lote quede concentrado únicamente en CABA, Buenos Aires, Córdoba, Rosario, Santa Fe y Mendoza.

Su inclusión refuerza la estrategia federal de búsqueda y reduce el sesgo territorial.

---

## 9. Ejemplos válidos del lote

Ejemplos de Perfil A:

```text
broker de seguros Cordoba
broker de seguros Santa Cruz
productor asesor de seguros Mendoza
organizador de productores de seguros Rosario
consultora de seguros Neuquen
```

Ejemplos de Perfil B:

```text
seguros corporativos Cordoba
seguros para empresas Rosario
broker de seguros corporativos Santa Cruz
productor de seguros para empresas Mendoza
seguros para industrias Neuquen
```

Ejemplos de Perfil D:

```text
cotizar seguros empresas Cordoba
presupuesto seguro empresa Mendoza
cotizar seguro de caución Santa Cruz
contratar broker de seguros Tucuman
```

Los ejemplos son técnicamente válidos, pero las queries de Perfil D requieren revisión más estricta antes de usarse en búsquedas reales.

---

## 10. Validación de unicidad

El lote no presenta queries duplicadas:

```text
Queries únicas: 230
Queries duplicadas: 0
```

Esto confirma que la combinación de keyword + modificador geográfico está funcionando correctamente.

También confirma que no hay duplicación territorial aparente en el seed mínimo usado para generar el lote.

---

## 11. Validación de trazabilidad

Cada fila contiene `geo_key`.

Ejemplo esperado:

```text
query = broker de seguros Cordoba
geo_key = provincia:14
keyword_base = broker de seguros
modificador_geografico = Cordoba
tipo_ubicacion = provincia
prioridad_geografica = 1
```

Esta estructura permite auditar cada query desde dos dimensiones:

1. La keyword base de seguros.
2. El territorio usado como modificador geográfico.

Esto es clave para medir resultados por zona, comparar rendimiento y evitar dependencia de la ubicación física desde la cual se ejecute Google.

---

## 12. Estado del CSV generado

El archivo:

```text
exports/geo/queries-seguros.csv
```

se considera:

```text
SALIDA REVISABLE
```

No debe considerarse todavía:

```text
LOTE OPERATIVO APROBADO
```

Por ahora no se recomienda versionar este CSV.

Razones:

* fue generado como salida de revisión;
* aún falta clasificar o aprobar qué perfiles se usarán primero;
* las queries del Perfil D pueden atraer compradores finales;
* todavía no se definió un orden de ejecución real;
* todavía no se inició la política de scraping;
* todavía no se validó contra resultados reales de Google.

---

## 13. Riesgo del Perfil D

El Perfil D debe revisarse con especial cuidado.

Queries como:

```text
cotizar seguros empresas Cordoba
presupuesto seguro empresa Mendoza
cotizar seguro de caución Santa Cruz
```

pueden atraer resultados de usuarios finales o empresas compradoras de seguros.

Eso puede ser útil para entender demanda, pero no necesariamente ayuda a encontrar clientes LeadMaster.

El objetivo de esta etapa es encontrar posibles clientes LeadMaster de la vertical seguros:

```text
brokers
productores asesores
organizadores de productores
agencias de seguros
consultoras de seguros
intermediarios comerciales de seguros
```

Por lo tanto, las queries de Perfil A deben priorizarse antes que las de Perfil D.

---

## 14. Recomendación de uso del lote

Orden recomendado para búsquedas futuras:

### Primera pasada

Usar Perfil A con prioridad geográfica 1 y 2.

Objetivo:
detectar brokers, productores, organizadores, agencias y consultoras.

### Segunda pasada

Usar Perfil B con prioridad geográfica 1 y 2.

Objetivo:
detectar actores que ofrecen seguros empresariales y corporativos.

### Tercera pasada

Revisar Perfil D manualmente antes de ejecutar.

Objetivo:
evitar desviar la búsqueda hacia compradores finales.

---

## 15. Relación con la metodología LeadMaster

Esta validación refuerza la estrategia metodológica documentada:

LeadMaster no debe depender de búsquedas genéricas como:

```text
broker seguros corporativos
```

porque Google puede sesgar resultados por:

* ubicación del operador;
* IP;
* sesión;
* historial;
* idioma;
* preferencias locales.

En cambio, el lote produce búsquedas explícitas como:

```text
broker seguros corporativos Cordoba
broker seguros corporativos Santa Cruz
broker seguros corporativos Mendoza
broker seguros corporativos Rosario
```

Esto permite búsquedas más:

* reproducibles;
* auditables;
* territoriales;
* comparables;
* balanceadas;
* escalables.

---

## 16. Limitaciones de esta validación

1. El lote se generó desde el seed mínimo de 10 ubicaciones.
2. Todavía no se sincronizó el catálogo completo desde Georef.
3. Todavía no se incorporó población desde INDEC.
4. Las prioridades territoriales son provisorias.
5. El CSV no fue usado para buscar en Google.
6. No se hizo scraping.
7. No se validó todavía la calidad real de resultados por query.
8. El Perfil D requiere revisión antes de cualquier uso operativo.
9. El CSV no se considera aprobado para ejecución real.

---

## 17. Próximos pasos recomendados

1. No versionar todavía `exports/geo/queries-seguros.csv`.
2. Documentar esta validación como prueba técnica del lote.
3. Definir una primera tanda operativa solo con Perfil A.
4. Generar un CSV separado con Perfil A si se decide avanzar.
5. Revisar si conviene excluir temporalmente Perfil D.
6. Definir cuántas queries ejecutar por territorio.
7. Definir política de scraping controlado.
8. No iniciar búsquedas reales sin aprobación explícita.
9. Investigar dataset INDEC para incorporar población.
10. Luego recalcular prioridades territoriales combinando población + perfil comercial.

---

## 18. Resultado final

Resultado de la validación:

```text
CSV completo generado correctamente.
230 queries válidas.
0 queries duplicadas.
10 geo_key únicos.
23 keywords base.
10 modificadores geográficos.
Perfiles A, B y D presentes.
Prioridades geográficas 1 y 2 presentes.
```

Estado:

```text
VALIDADO TÉCNICAMENTE COMO LOTE REVISABLE
```

No se ejecutaron búsquedas en Google.
No se hizo scraping.
No se consumieron APIs externas.
No se modificó base de datos.
No se modificó el VPS.

---

## 19. Decisión

El lote completo queda aceptado como **lote técnico revisable**, pero no como lote operativo aprobado.

Para convertirse en lote operativo, deberá definirse explícitamente:

* qué perfiles se ejecutan;
* qué territorios se priorizan;
* si Perfil D se excluye o se revisa manualmente;
* qué volumen de búsquedas se permite;
* qué política de scraping se aplica;
* cómo se registran los resultados.

Hasta esa aprobación, el CSV debe tratarse únicamente como salida de validación.
