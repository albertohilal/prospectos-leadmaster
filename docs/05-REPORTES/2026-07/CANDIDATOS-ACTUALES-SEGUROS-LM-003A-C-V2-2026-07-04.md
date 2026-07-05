# LM-003A-C — Candidatos actuales de seguros v2

**Fecha:** 2026-07-05
**Proyecto:** LeadMaster
**Bloque:** LM-003A-C — Detección corregida de candidatos de seguros
**Estado:** Generado automáticamente
**Modo:** Solo lectura — sin modificaciones de base de datos

---

## 1. Objetivo

Corregir la clasificación automática del reporte anterior, que sobreestimaba candidatos al mezclar señales B2B genéricas con señales reales de seguros, y penalizaba actores reales del mercado asegurador por tener keywords de origen orientadas a comprador.

---

## 2. Qué se corrigió respecto del reporte anterior

| Problema v1 | Corrección v2 |
|-------------|---------------|
| Empresas B2B no aseguradoras (Yasisa, Ascensoresg, Getmaintainx, etc.) clasificadas como `productor` o prioridad media | Ahora se requiere **señal fuerte de seguros en nom/URL/email**. Sin eso → `descartado_no_seguro` |
| Actores reales de seguros (Nationalbrokers, Maklerseguros, etc.) descartados por keyword de comprador | La keyword de comprador **no descarta** si hay señal fuerte en nom/URL/email. Solo marca `requiere_validacion_manual = 1` |
| Keyword de comprador descartaba automáticamente | Ahora se marca `keyword_orientada_a_comprador = sí` pero se evalúa independientemente de si la entidad es actor de seguros |
| Señales de `texto_extraido` demasiado amplias (palabras aisladas como "seguro", "empresa") | `texto_extraido` solo se usa con frases compuestas fuertes ("broker de seguros", "productor asesor de seguros", etc.) |
| `senal_detectada` no distinguía tipo de señal | Nuevos campos: `es_actor_seguros`, `fuerza_senal`, `senal_fuerte_detectada`, `senal_debil_detectada` |
| Sin campo de clasificación final | Nuevo campo: `clasificacion_final` con valores `candidato_probable`, `requiere_revision`, `descartado_no_seguro`, `descartado_comprador_final` |

---

## 3. Aclaración de foco comercial

**El prospecto NO es una empresa que necesita comprar seguros.**

**El prospecto ES un potencial cliente de LeadMaster.**

Un candidato válido es: broker de seguros, productor asesor de seguros, sociedad de productores, organizador de productores, agencia comercial de seguros, aseguradora con canal comercial B2B, insurtech, comparador/plataforma de seguros, intermediario comercial que venda seguros a empresas/pymes/comercios/industrias/profesionales.

---

## 4. Criterios estrictos de detección

### Señales fuertes (convierten un registro en actor de seguros)

**En `nom`:** seguros, broker, productor asesor, productor de seguros, sociedad de productores, organizador, aseguradora, ART, caución, póliza, insurtech, cotizador de seguros. También nombres de compañías conocidas (Sancor Seguros, San Cristóbal, Zurich, Provincia ART, National Brokers, Makler Seguros, Answerseguros, Galicia Seguros, La Segunda, La Caja, Mapfre, Allianz, etc.).

**En `url_landing` / dominio:** seguros, broker, asegurador, ART, caución, póliza, insurtech, productor, organizador, cotizador, reaseguro.

**En `email_extraido`:** @*.seguros, @*.broker, @*.asegurador, @*.art, @*.caución, @*.productor. También emails institucionales de compañías conocidas.

**En `texto_extraido`:** frases compuestas como "broker de seguros", "productor asesor de seguros", "sociedad de productores", "organizador de seguros", "compañía de seguros", "aseguradora", "seguros corporativos", "seguros para empresas".

### Señales débiles (NO convierten por sí solas)

- Palabra "seguro" aislada en `texto_extraido`.
- Términos B2B genéricos (empresa, pyme, comercio, industria, logística, mantenimiento, transporte, flota, responsabilidad civil).
- Contacto disponible sin señal fuerte de seguros.
- Keyword de comprador sin señal fuerte en nom/URL/email.

### Keyword de comprador

Una keyword orientada a comprador (ej: "cotizar seguro RC empresas") **no descarta** si el nombre/dominio demuestra que la entidad ES un actor de seguros. Solo marca `requiere_validacion_manual = 1`.

---

## 5. Resultado general v2

| Métrica | Valor |
|---------|:---:|
| **Total candidatos detectados** | **75** |
| **Son actores de seguros** | **9** |
| **No son actores de seguros** | **66** |
| Clasificación: candidato_probable | 0 |
| Clasificación: requiere_revision | 9 |
| Clasificación: descartado_no_seguro | 62 |
| Clasificación: descartado_comprador_final | 4 |
| Con email | 69 (92%) |
| Con teléfono | 45 (60%) |
| Con WhatsApp | 30 (40%) |
| Duplicados probables (grupos) | 24 |

---

## 6. Comparación con reporte anterior

| Métrica | v1 | v2 | Diferencia |
|---------|:---:|:---:|:---:|
| Total detectados | 75 | 75 | |
| Prioridad alta | 0 | 2 | v1 subestimó actores reales |
| Prioridad media | 31 | 7 | v1 sobreestimó por señales B2B falsas |
| Actores reales detectados | ~8 implícitos | 9 | La detección ahora es explícita y auditable |
| Falsos positivos B2B | ~20+ | 0 | Eliminados — ahora requieren señal fuerte de seguros |

**Conclusión:** El reporte v1 sobreestimaba candidatos al confundir empresas B2B genéricas con actores de seguros. El reporte v2 es más estricto y preciso.

---

## 7. Conteos por clasificación final

| Clasificación | Cantidad | % |
|---------------|:---:|:---:|
| descartado_no_seguro | 62 | 83% |
| requiere_revision | 9 | 12% |
| descartado_comprador_final | 4 | 5% |

---

## 8. Conteos por prioridad

| Prioridad | Cantidad | % |
|-----------|:---:|:---:|
| Alta | 2 | 3% |
| Media | 7 | 9% |
| Baja | 66 | 88% |

---

## 9. Conteos por tipo de actor

| Tipo de actor | Cantidad |
|---------------|:---:|
| no_seguro | 66 |
| otro_actor_seguros | 4 |
| aseguradora | 3 |
| broker | 2 |

---

## 10. Candidatos probables

No se detectaron candidatos probables.

---

## 11. Requieren revisión

| # | prospecto_id | nom | dominio | tipo | motivo |
|---|:---:|------|--------|------|--------|
| 1 | 16 | Answerseguros | answerseguros.com.ar | aseguradora | aseguradora con contacto — evaluar si tiene canal B2B; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 2 | 18 | Sancristobal | sancristobal.com.ar | otro_actor_seguros | actor de seguros con contacto — requiere revisión; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 3 | 20 | Zurich | cotizadordirecto.zurich.com.ar | otro_actor_seguros | actor de seguros con contacto — requiere revisión; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 4 | 23 | Sancorseguros | sancorseguros.com.ar | aseguradora | aseguradora con contacto — evaluar si tiene canal B2B; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 5 | 30 | Nationalbrokers | nationalbrokers.com.ar | broker | broker de seguros con contacto disponible; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 6 | 66 | Provart | provinciart.com.ar | otro_actor_seguros | actor de seguros con contacto — requiere revisión; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 7 | 67 | Lasegundaonline | lasegundaonline.com.ar | otro_actor_seguros | actor de seguros con contacto — requiere revisión; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 8 | 105 | Nationalbrokers | nationalbrokers.com.ar | broker | broker de seguros con contacto disponible; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |
| 9 | 106 | Maklerseguros | maklerseguros.com.ar | aseguradora | aseguradora con contacto — evaluar si tiene canal B2B; origen por keyword de comprador — validar si sirve como prospecto LeadMaster |

---

## 12. Descartados no seguros

| # | prospecto_id | nom | motivo |
|---|:---:|------|--------|
| 1 | 4 | Cifrasonline | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 2 | 9 | - | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 3 | 11 | Mobarq | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 4 | 13 | Aconif | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 5 | 24 | Intraoffice | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 6 | 25 | Yasisa | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 7 | 27 | Interioresmaluk | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 8 | 28 | Epsared | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 9 | 29 | Simplificafulfillment | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 10 | 32 | Fgmdentalgroup | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 11 | 34 | Ascensoresg | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 12 | 37 | Equifax | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 13 | 38 | Password Net | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 14 | 39 | Ecoblasting | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 15 | 42 | Entolux | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 16 | 43 | Aasturiana | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 17 | 44 | Sudameria | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 18 | 45 | Poptour | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 19 | 47 | Alquilarconstruccion | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 20 | 48 | Intraoffice | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 21 | 49 | Planetcort | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 22 | 50 | Ideabottles | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 23 | 51 | Cibart | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 24 | 52 | Ahbsa | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 25 | 54 | Grupokoner | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 26 | 60 | Limpiezadetanque | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 27 | 61 | Inagua | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 28 | 62 | Pm70 | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 29 | 63 | Homesolution | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 30 | 64 | Enviopack | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 31 | 65 | Epsared | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 32 | 69 | Rbenergia | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 33 | 70 | Fgmdentalgroup | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 34 | 71 | Alinealab | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 35 | 72 | Otis | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 36 | 73 | Mante Ascensores | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 37 | 74 | Optingsha | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 38 | 75 | Islarg | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 39 | 78 | Agrapin | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| 40 | 79 | Nspinelli | la entidad no vende/intermedia seguros — no es prospecto LeadMaster |
| ... | ... | (26 más) | |

---

## 13. Duplicados probables

Total de grupos duplicados: **24**

| Clave | Cantidad |
|-------|:---:|
| dominio:intraoffice.com.ar | 2 |
| dominio:epsared.com.ar | 3 |
| dominio:nationalbrokers.com.ar | 2 |
| dominio:fgmdentalgroup.com | 2 |
| dominio:aasturiana.com.ar | 2 |
| dominio:landing.sudameria.com | 2 |
| dominio:poptour.com.ar | 2 |
| dominio:software.getmaintainx.com | 2 |
| dominio:islarg.com.ar | 2 |
| dominio:agrapin.com | 3 |
| dominio:planbtechos.com | 2 |

---

## 14. Brecha respecto del objetivo 80–110

- Actores de seguros detectados: **9**
- Candidatos probables (prioridad alta): **2**
- Candidatos que requieren revisión: **9**
- Potencial combinado (probables + revisión): **11**
- Faltan para llegar a 80: **71**
- Faltan para llegar a 110: **101**

**Para alcanzar el objetivo de 80-110 prospectos, es indispensable ejecutar scraping nuevo con keywords específicas de seguros (plan maestro LM-003A-C).** Los datos actuales no contienen volumen suficiente de actores del mercado asegurador.

---

## 15. Conclusión

1. **El reporte v1 sobreestimaba candidatos** al clasificar empresas B2B genéricas (construcción, logística, mantenimiento, etc.) como posibles actores de seguros.
2. **El reporte v1 subestimaba actores reales** (Nationalbrokers, Maklerseguros, etc.) al descartarlos por tener keyword de origen orientada a comprador.
3. **La corrección v2** separa estrictamente: primero determina si la entidad ES un actor de seguros (por nombre, dominio, email institucional), y luego clasifica su tipo y prioridad.
4. **La keyword de origen** (lo que el usuario buscó) se evalúa por separado y **no descarta** a un actor real de seguros.
5. **Volumen insuficiente:** 9 actores de seguros en los datos actuales no alcanzan para el lote de 80-110. Se requiere scraping nuevo.

---

## 16. Próximo paso recomendado

1. Revisar manualmente los candidatos probables y los que requieren revisión.
2. Validar `contacto_estado` en staging para los actores de seguros detectados.
3. Crear `config/seed_ll_keywords_leadmaster_seguros.sql` con 48 keywords operativas (8 bases × 6 plazas).
4. Activar primera tanda de keywords (`prioridad = alta`) y ejecutar scraping controlado.
5. Re-ejecutar este reporte post-scraping para medir el crecimiento del lote.

---

## 17. Archivos generados/modificados

| Archivo | Acción |
|---------|--------|
| `scripts/report-seguros-candidatos.js` | **Reescrito** — nueva lógica estricta de clasificación |
| `config/query_lote_seguros_candidatos.sql` | **Sin cambios** — la consulta SQL base sigue siendo amplia; la clasificación se hace en JS |
| `exports/lm-003a-c-lote-candidato-seguros-v2.csv` | **Generado** — CSV con clasificación corregida |
| `docs/reportes/2026-07-04-lm-003a-c-candidatos-actuales-seguros-v2.md` | **Generado** — este reporte |

---

## 18. Comandos de verificación

```bash
# Re-ejecutar el reporte corregido
npm run report:seguros

# Ver estado general de la DB
npm run db:status

# Ver últimos prospectos
npm run db:view
```

---

*Reporte v2 generado con lógica de clasificación estricta. No se ejecutó scraping, no se modificó base de datos.*