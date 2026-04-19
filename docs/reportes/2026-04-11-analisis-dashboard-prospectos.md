# Análisis del Dashboard de Prospectos LeadMaster

Fecha: 2026-04-11  
Proyecto: LeadMaster  
Autor: Agente OpenClaw  
Estado: Borrador

---

## 📋 Resumen Ejecutivo

Este informe analiza el estado actual de la base de datos de prospectos del sistema LeadMaster. Se han capturado **14 prospectos** en total, con una tasa de validación del **57%** (8 válidos, 4 inválidos, 2 no evaluados). La palabra clave más trabajada es "presupuesto para reforma de oficinas en CABA" con 10 capturas, mientras que "seguro de auto para empresas" tiene 4 capturas y un 100% de validez. Se recomienda priorizar la evaluación de los prospectos pendientes, diversificar las palabras clave y considerar la implementación de un dashboard web para monitorización en tiempo real.

## 🎯 Objetivo

Evaluar el desempeño del sistema de captura de prospectos, identificar patrones, cuantificar resultados y proponer mejoras para incrementar la eficiencia y calidad de los leads.

## 🔍 Contexto / Antecedentes

El sistema LeadMaster automatiza la búsqueda de anuncios patrocinados en Google, captura landing pages, extrae texto mediante OCR y almacena los prospectos en una base de datos MySQL. Hasta la fecha se han ejecutado campañas con dos palabras clave principales, generando un historial de 14 registros.

## 📊 Desarrollo / Análisis

### 1. Estadísticas Generales

- **Total de prospectos:** 14
- **Prospectos válidos:** 8 (57%)
- **Prospectos inválidos:** 4 (29%)
- **Prospectos no evaluados:** 2 (14%)
- **Longitud media del texto extraído:** 3,352 caracteres
- **Rango de texto:** de 256 a 10,253 caracteres
- **Fechas de captura:** 12 prospectos el 2026-04-08 y 2 prospectos el 2026-04-11

### 2. Distribución por Palabra Clave

| Palabra Clave | Cantidad | Válidos | Inválidos | No evaluados | Tasa de validez |
|---------------|----------|---------|-----------|--------------|-----------------|
| presupuesto para reforma de oficinas en CABA | 10 | 4 | 4 | 2 | 40% (de evaluados) |
| seguro de auto para empresas | 4 | 4 | 0 | 0 | 100% |

**Observación:** La palabra clave de "seguro de auto para empresas" ha generado prospectos 100% válidos, lo que sugiere alta relevancia o mejor targeting de los anuncios.

### 3. Evolución Temporal

```sql
-- Consulta de capturas por fecha
SELECT DATE(created_at) as fecha, COUNT(*) as capturas
FROM prospectos
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

Resultado:
- **2026-04-11:** 2 capturas (ambas de "presupuesto para reforma...")
- **2026-04-08:** 12 capturas (mezcla de ambas palabras clave)

La actividad reciente es menor, posiblemente debido a pausas en la ejecución automática o cambios en el entorno.

### 4. Calidad del Texto Extraído (OCR)

El sistema OCR ha extraído texto en todos los prospectos. La longitud varía considerablemente, lo que puede indicar diferencias en la complejidad de las landing pages capturadas. No se han registrado fallos de OCR en la base de datos.

## 🛠️ Metodología / Enfoque

- **Fuente de datos:** Base de datos MySQL `leadmaster`, tabla `prospectos`.
- **Herramientas:** Consultas SQL directas, análisis estadístico básico.
- **Criterios de validación:** El campo `es_valido` (1=válido, 0=inválido, NULL=no evaluado).

## 📈 Resultados / Hallazgos

1. **Eficiencia de captura:** 14 prospectos capturados con dos palabras clave.
2. **Tasa de validez moderada:** 57% de los prospectos son válidos; espacio para mejorar selectores o filtros.
3. **Desbalance en evaluación:** 2 prospectos aún no han sido evaluados (14%).
4. **Palabra clave más productiva:** "presupuesto para reforma de oficinas en CABA" genera más volumen pero menor tasa de validez.
5. **Palabra clave más precisa:** "seguro de auto para empresas" tiene 100% de validez, ideal para replicar.

## 🧩 Conclusiones

El sistema LeadMaster está operativo y ha generado un volumen inicial de prospectos. La calidad es aceptable pero mejorable, especialmente en la palabra clave de reformas de oficinas. La evaluación manual pendiente (2 prospectos) debe completarse para tener una visión completa.

## 🚀 Próximos Pasos / Recomendaciones

- [ ] **Evaluar prospectos pendientes** – Marcar los 2 prospectos no evaluados como válidos o inválidos (Responsable: equipo LeadMaster, Fecha: 2026-04-12).
- [ ] **Diversificar palabras clave** – Probar al menos 5 nuevas palabras clave de la lista original de 20 para aumentar volumen y descubrir patrones de validez.
- [ ] **Automatizar evaluación** – Explorar integración con OpenAI API para pre-clasificación automática de prospectos basada en el texto extraído.
- [ ] **Implementar dashboard web** – Desarrollar una interfaz simple (HTML+JS) que muestre métricas en tiempo real, gráficos de evolución y permita marcar prospectos como válidos/inválidos.
- [ ] **Revisar selectores de anuncios** – Para la palabra clave con baja tasa de validez, ajustar selectores de Playwright para hacer clic en anuncios más relevantes.

## 🔗 Referencias / Recursos

- [Configuración del proyecto](../GUIA-LOCAL.md)
- [Reglas para crear informes](../REGLAS-INFORMES.md)
- [API LeadMaster](../../src/api/server.js)

---

*Documento creado con la plantilla estándar de informes (ver REGLAS-INFORMES.md).*
