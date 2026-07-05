# LM-003A-C — Candidatos actuales de seguros

**Fecha:** 2026-07-04
**Proyecto:** LeadMaster
**Bloque:** LM-003A-C — Detección de candidatos actuales de seguros
**Estado:** Generado automáticamente
**Modo:** Solo lectura — sin modificaciones de base de datos

---

## 1. Objetivo

Detectar candidatos actuales de seguros en las tablas existentes (`la_prospectos`, `la_stg_prospectos`) usando señales en keywords, nombres, URLs, emails y texto extraído, **antes de hacer scraping nuevo** y antes de cargar nuevas keywords.

---

## 2. Aclaración de foco comercial

**El prospecto NO es una empresa que necesita comprar seguros.**

**El prospecto ES un potencial cliente de LeadMaster.**

Un candidato válido es:

- broker de seguros
- productor asesor de seguros
- sociedad de productores
- organizador de productores
- agencia comercial de seguros
- aseguradora con canal comercial B2B
- insurtech
- comparador/plataforma de seguros
- intermediario comercial que venda seguros a empresas, pymes, comercios, industrias o profesionales

**No confundir:**

- consumidor final de seguros → NO es nuestro prospecto
- empresa que quiere contratar ART, caución, flota o seguro corporativo → NO es nuestro prospecto
- vendedor/intermediario de seguros → SÍ puede ser prospecto LeadMaster

---

## 3. Fuentes consultadas

| Tabla | Campos usados |
|-------|--------------|
| `la_prospectos` | `id`, `palabra_clave`, `texto_extraido` |
| `la_stg_prospectos` | `id`, `prospecto_id`, `cliente_id`, `nom`, `url_landing`, `email_extraido`, `telefono_extraido`, `whatsapp_extraido`, `contacto_estado` |

---

## 4. Criterios de detección

Señales rastreadas:

| Señal | Patrón |
|-------|--------|
| `palabra_clave` | `REGEXP` sobre broker, productor, seguros, asegurador, organizador, insurtech, ART, caución, flota, póliza, siniestro, cotizador, RC empresas |
| `nom` | `REGEXP` sobre seguros, broker, productor, asegurador, insurtech, organizador |
| `url_landing` | `REGEXP` sobre seguro, broker, productor, asegurador, insurtech, cotizador, póliza, art-, caución |
| `email_extraido` | `REGEXP` sobre @broker, @seguros, @productor, @asegurador, @insurtech |
| `texto_extraido` | `REGEXP` sobre seguros, broker, productor, asegurador, insurtech, ART, caución, flotas, póliza |

---

## 5. Reglas de clasificación automática

**Prioridad alta:** broker/productor B2B con señales de seguros para empresas/pymes/industrias + contacto disponible.

**Prioridad media:** señales de seguros con contacto, pero sin foco B2B claro; o broker sin contacto; o aseguradora/insurtech con presencia web.

**Prioridad baja:** keyword de consumidor final (auto, hogar, vida, moto), sin contacto claro, sin señales B2B, o marcado como descartado.

**Descartados:** keyword de comprador de seguros, blog, medio, sin relación con intermediación.

---

## 6. Resultado general

| Métrica | Valor |
|---------|:---:|
| **Total candidatos detectados** | **75** |
| Prioridad alta (prospectos LeadMaster probables) | 0 |
| Prioridad media (requieren revisión) | 31 |
| Prioridad baja (probables compradores o ruido) | 44 |
| Con motivo de descarte | 44 |
| Con email | 69 (92%) |
| Con teléfono | 45 (60%) |
| Con WhatsApp | 30 (40%) |
| Duplicados probables (grupos) | 24 |

---

## 7. Conteos por prioridad

| Prioridad | Cantidad | % |
|-----------|:---:|:---:|
| Alta | 0 | 0% |
| Media | 31 | 41% |
| Baja | 44 | 59% |

---

## 8. Conteos por tipo de actor

| Tipo de actor | Cantidad |
|---------------|:---:|
| no_determinado | 44 |
| productor | 31 |

---

## 9. Conteos por cliente_id

| cliente_id | Cantidad |
|:---:|:---:|
| 52 | 38 |
| 1268 | 37 |

---

## 10. Cobertura de contacto

| Métrica | Cantidad | % |
|---------|:---:|:---:|
| Con email | 69 | 92% |
| Con teléfono | 45 | 60% |
| Con WhatsApp | 30 | 40% |
| Sin ningún contacto | 1 | |

---

## 11. Duplicados probables

Total de grupos duplicados detectados: **24**

| Clave | Cantidad | Prospectos |
|-------|:---:|------------|
| dominio:intraoffice.com.ar | 3 | |
| dominio:epsared.com.ar | 4 | |
| dominio:nationalbrokers.com.ar | 3 | |
| dominio:fgmdentalgroup.com | 3 | |
| dominio:aasturiana.com.ar | 3 | |
| dominio:landing.sudameria.com | 3 | |
| dominio:poptour.com.ar | 3 | |
| dominio:software.getmaintainx.com | 3 | |
| dominio:islarg.com.ar | 3 | |
| dominio:agrapin.com | 4 | |
| dominio:planbtechos.com | 3 | |

---

## 12. Candidatos prioridad alta

No se detectaron candidatos de prioridad alta.

---

## 13. Candidatos prioridad media

| # | prospecto_id | nom | url_landing | email | tel | tipo | motivo |
|---|:---:|------|------------|-------|:---:|------|--------|
| 1 | 25 | Yasisa | https://www.yasisa.com.ar/servicios.html | info@yasisa.com.ar | si | productor | seniales de seguros B2B con contacto |
| 2 | 28 | Epsared | https://epsared.com.ar/epsacorp | atencionalcliente@epsared.com.ar | - | productor | seniales de seguros B2B con contacto |
| 3 | 29 | Simplificafulfillment | https://simplificafulfillment.com.ar/ | info@simplificafulfillment.com | si | productor | seniales de seguros B2B con contacto |
| 4 | 34 | Ascensoresg | https://www.ascensoresg.com.ar/ | info@ascensoresg.com.ar | si | productor | seniales de seguros B2B con contacto |
| 5 | 42 | Entolux | https://entolux.com/index_landing.php | contacto@entolux.com | si | productor | seniales de seguros B2B con contacto |
| 6 | 44 | Sudameria | https://landing.sudameria.com/viajes-corporativos | info@sudameria.com.ar | - | productor | seniales de seguros B2B con contacto |
| 7 | 47 | Alquilarconstruccion | https://alquilarconstruccion.com.ar/ | info@tusitioya.com.ar | si | productor | seniales de seguros B2B con contacto |
| 8 | 56 | Getmaintainx | https://software.getmaintainx.com/software-de-mant | - | si | productor | senales de seguros con contacto disponible |
| 9 | 57 | Vecfleet | https://landing.vecfleet.io/vec-fleet-search-demo- | mmachuca@vecfleet.io | - | productor | senales de seguros con contacto disponible |
| 10 | 61 | Inagua | https://www.inagua.com.ar/servicio-de-limpieza-y-d | ventas@inagua.com.ar | si | productor | seniales de seguros B2B con contacto |
| 11 | 64 | Enviopack | https://www.enviopack.com.ar/servicios/logistica-y | nombre@correo.com | - | productor | seniales de seguros B2B con contacto |
| 12 | 65 | Epsared | https://epsared.com.ar/epsacorp | atencionalcliente@epsared.com.ar | - | productor | seniales de seguros B2B con contacto |
| 13 | 69 | Rbenergia | https://rbenergia.com.ar/ | consultas@rbenergia.com.ar | - | productor | seniales de seguros B2B con contacto |
| 14 | 71 | Alinealab | https://alinealab.com.ar/laboratorio-alineadores-d | alinea.labb@gmail.com | si | productor | seniales de seguros B2B con contacto |
| 15 | 73 | Mante Ascensores | https://mante-ascensores.com.ar/ | manteascensores.adm@gmail.com | si | productor | seniales de seguros B2B con contacto |
| 16 | 74 | Optingsha | https://optingsha.com.ar/comercios.php | info@optingsha.com.ar | si | productor | seniales de seguros B2B con contacto |
| 17 | 75 | Islarg | https://islarg.com.ar/ | info@islarg.com.ar | - | productor | seniales de seguros B2B con contacto |
| 18 | 79 | Nspinelli | https://www.nspinelli.com.ar/home.php | nspinelli@nspinelli.com.ar | - | productor | seniales de seguros B2B con contacto |
| 19 | 80 | Prosegur | https://www.prosegur.com.ar/landings/PMAX/alarmas- | requerimientos@prosegur.com | si | productor | seniales de seguros B2B con contacto |
| 20 | 83 | Australmantenimiento | https://australmantenimiento.com/ | contacto@australmantenimiento.com | si | productor | seniales de seguros B2B con contacto |
| 21 | 85 | Sudameria | https://landing.sudameria.com/viajes-corporativos | info@sudameria.com.ar | - | productor | seniales de seguros B2B con contacto |
| 22 | 86 | Construrental | https://construrental.com.ar/ | alquileres@construrental.com.ar | si | productor | seniales de seguros B2B con contacto |
| 23 | 92 | Planbtechos | https://planbtechos.com/ | planb.techos@gmail.com | - | productor | seniales de seguros B2B con contacto |
| 24 | 93 | Planbtechos | https://planbtechos.com/ | planb.techos@gmail.com | - | productor | seniales de seguros B2B con contacto |
| 25 | 94 | Greenarmorcom | https://www.greenarmor.com.ar/servicios-transporte | contacto@greenarmor.com.ar | si | productor | seniales de seguros B2B con contacto |
| 26 | 95 | Getmaintainx | https://software.getmaintainx.com/software-de-mant | - | si | productor | senales de seguros con contacto disponible |
| 27 | 96 | Miraifleet | https://miraifleet.com/flota | soporte@miraifleet.com | - | productor | senales de seguros con contacto disponible |
| 28 | 99 | Ozonizer | https://ozonizer.com.ar/web/systems-industrial-bod | comercial@ozonizer.com.ar | si | productor | seniales de seguros B2B con contacto |
| 29 | 103 | Epsared | https://epsared.com.ar/epsacorp | atencionalcliente@epsared.com.ar | - | productor | seniales de seguros B2B con contacto |
| 30 | 110 | Odontostore | https://www.odontostore.com/es/productos/equipamie | ventas@odontostore.com | si | productor | seniales de seguros B2B con contacto |
| 31 | 114 | Islarg | https://islarg.com.ar/ | info@islarg.com.ar | - | productor | seniales de seguros B2B con contacto |

---

## 14. Candidatos prioridad baja

| # | prospecto_id | nom | motivo | motivo_descarte |
|---|:---:|------|--------|-----------------|
| 1 | 4 | Cifrasonline | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 2 | 9 | - | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 3 | 11 | Mobarq | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 4 | 13 | Aconif | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 5 | 16 | Answerseguros | keyword orientada a consumidor final de seguros | consumidor final de seguros detectado por keyword |
| 6 | 18 | Sancristobal | keyword orientada a consumidor final de seguros | consumidor final de seguros detectado por keyword |
| 7 | 20 | Zurich | keyword orientada a consumidor final de seguros | consumidor final de seguros detectado por keyword |
| 8 | 23 | Sancorseguros | keyword orientada a consumidor final de seguros | consumidor final de seguros detectado por keyword |
| 9 | 24 | Intraoffice | foco principal en seguros personales (auto/hogar/vida) | orientado a consumidor final, sin oferta B2B clara |
| 10 | 27 | Interioresmaluk | foco principal en seguros personales (auto/hogar/vida) | orientado a consumidor final, sin oferta B2B clara |
| 11 | 30 | Nationalbrokers | keyword orientada a comprador de seguros | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 12 | 32 | Fgmdentalgroup | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 13 | 37 | Equifax | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 14 | 38 | Password Net | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 15 | 39 | Ecoblasting | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 16 | 43 | Aasturiana | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 17 | 45 | Poptour | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 18 | 48 | Intraoffice | foco principal en seguros personales (auto/hogar/vida) | orientado a consumidor final, sin oferta B2B clara |
| 19 | 49 | Planetcort | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 20 | 50 | Ideabottles | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 21 | 51 | Cibart | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 22 | 52 | Ahbsa | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 23 | 54 | Grupokoner | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 24 | 60 | Limpiezadetanque | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 25 | 62 | Pm70 | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 26 | 63 | Homesolution | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 27 | 66 | Provart | keyword orientada a comprador de seguros | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 28 | 67 | Lasegundaonline | keyword orientada a comprador de seguros | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 29 | 70 | Fgmdentalgroup | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 30 | 72 | Otis | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 31 | 78 | Agrapin | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 32 | 82 | Aasturiana | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 33 | 84 | Poptour | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 34 | 87 | Elevacioneselcamino | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 35 | 88 | Ficalosmelizos | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 36 | 90 | Traduccionesbaires | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 37 | 98 | Alpgroup | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 38 | 101 | Berowood | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 39 | 105 | Nationalbrokers | keyword orientada a comprador de seguros | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 40 | 106 | Maklerseguros | keyword orientada a comprador de seguros | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 41 | 115 | Sterbayasociados | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 42 | 116 | Nubceo | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 43 | 117 | Agrapin | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |
| 44 | 118 | Agrapin | sin senales claras de intermediacion de seguros | sin evidencia de ser vendedor/intermediario de seguros |

---

## 15. Descartados o dudosos

| # | prospecto_id | nom | motivo_descarte |
|---|:---:|------|-----------------|
| 1 | 4 | Cifrasonline | sin evidencia de ser vendedor/intermediario de seguros |
| 2 | 9 | - | sin evidencia de ser vendedor/intermediario de seguros |
| 3 | 11 | Mobarq | sin evidencia de ser vendedor/intermediario de seguros |
| 4 | 13 | Aconif | sin evidencia de ser vendedor/intermediario de seguros |
| 5 | 16 | Answerseguros | consumidor final de seguros detectado por keyword |
| 6 | 18 | Sancristobal | consumidor final de seguros detectado por keyword |
| 7 | 20 | Zurich | consumidor final de seguros detectado por keyword |
| 8 | 23 | Sancorseguros | consumidor final de seguros detectado por keyword |
| 9 | 24 | Intraoffice | orientado a consumidor final, sin oferta B2B clara |
| 10 | 27 | Interioresmaluk | orientado a consumidor final, sin oferta B2B clara |
| 11 | 30 | Nationalbrokers | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 12 | 32 | Fgmdentalgroup | sin evidencia de ser vendedor/intermediario de seguros |
| 13 | 37 | Equifax | sin evidencia de ser vendedor/intermediario de seguros |
| 14 | 38 | Password Net | sin evidencia de ser vendedor/intermediario de seguros |
| 15 | 39 | Ecoblasting | sin evidencia de ser vendedor/intermediario de seguros |
| 16 | 43 | Aasturiana | sin evidencia de ser vendedor/intermediario de seguros |
| 17 | 45 | Poptour | sin evidencia de ser vendedor/intermediario de seguros |
| 18 | 48 | Intraoffice | orientado a consumidor final, sin oferta B2B clara |
| 19 | 49 | Planetcort | sin evidencia de ser vendedor/intermediario de seguros |
| 20 | 50 | Ideabottles | sin evidencia de ser vendedor/intermediario de seguros |
| 21 | 51 | Cibart | sin evidencia de ser vendedor/intermediario de seguros |
| 22 | 52 | Ahbsa | sin evidencia de ser vendedor/intermediario de seguros |
| 23 | 54 | Grupokoner | sin evidencia de ser vendedor/intermediario de seguros |
| 24 | 60 | Limpiezadetanque | sin evidencia de ser vendedor/intermediario de seguros |
| 25 | 62 | Pm70 | sin evidencia de ser vendedor/intermediario de seguros |
| 26 | 63 | Homesolution | sin evidencia de ser vendedor/intermediario de seguros |
| 27 | 66 | Provart | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 28 | 67 | Lasegundaonline | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 29 | 70 | Fgmdentalgroup | sin evidencia de ser vendedor/intermediario de seguros |
| 30 | 72 | Otis | sin evidencia de ser vendedor/intermediario de seguros |
| 31 | 78 | Agrapin | sin evidencia de ser vendedor/intermediario de seguros |
| 32 | 82 | Aasturiana | sin evidencia de ser vendedor/intermediario de seguros |
| 33 | 84 | Poptour | sin evidencia de ser vendedor/intermediario de seguros |
| 34 | 87 | Elevacioneselcamino | sin evidencia de ser vendedor/intermediario de seguros |
| 35 | 88 | Ficalosmelizos | sin evidencia de ser vendedor/intermediario de seguros |
| 36 | 90 | Traduccionesbaires | sin evidencia de ser vendedor/intermediario de seguros |
| 37 | 98 | Alpgroup | sin evidencia de ser vendedor/intermediario de seguros |
| 38 | 101 | Berowood | sin evidencia de ser vendedor/intermediario de seguros |
| 39 | 105 | Nationalbrokers | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 40 | 106 | Maklerseguros | comprador de seguros, no vendedor/intermediario — keyword busca comprador final |
| 41 | 115 | Sterbayasociados | sin evidencia de ser vendedor/intermediario de seguros |
| 42 | 116 | Nubceo | sin evidencia de ser vendedor/intermediario de seguros |
| 43 | 117 | Agrapin | sin evidencia de ser vendedor/intermediario de seguros |
| 44 | 118 | Agrapin | sin evidencia de ser vendedor/intermediario de seguros |

---

## 16. Brecha respecto del objetivo 80–110

- Candidatos de prioridad alta (prospectos LeadMaster probables): **0**
- Candidatos de prioridad media (requieren revisión): **31**
- Potencial combinado alta + media: **31**
- Faltan para llegar a 80: **49**
- Faltan para llegar a 110: **79**

Para alcanzar el objetivo de 80-110 prospectos, será necesario ejecutar scraping nuevo con keywords específicas de seguros (plan maestro LM-003A-C).

---

## 17. Próximo paso recomendado

1. Revisar manualmente los candidatos de prioridad alta y media.
2. Validar `contacto_estado` en staging para los más prometedores.
3. Ejecutar el seed de keywords de seguros (`config/seed_ll_keywords_leadmaster_seguros.sql`).
4. Activar primera tanda de keywords y ejecutar scraping controlado.
5. Re-ejecutar este reporte después del scraping para medir el crecimiento del lote.

---

## 18. Archivos generados

| Archivo | Descripción |
|---------|-------------|
| `config/query_lote_seguros_candidatos.sql` | Consulta SQL base para detección |
| `scripts/report-seguros-candidatos.js` | Script Node de clasificación y reporte |
| `exports/lm-003a-c-lote-candidato-seguros.csv` | CSV con todos los candidatos clasificados |
| `docs/reportes/2026-07-04-lm-003a-c-candidatos-actuales-seguros.md` | Este reporte |

---

## 19. Comandos de verificación

```bash
# Re-ejecutar el reporte
npm run report:seguros

# Ver estado general de la DB
npm run db:status

# Ver últimos prospectos
npm run db:view
```

---

*Reporte generado automáticamente. No se ejecutó scraping, no se modificó base de datos.*