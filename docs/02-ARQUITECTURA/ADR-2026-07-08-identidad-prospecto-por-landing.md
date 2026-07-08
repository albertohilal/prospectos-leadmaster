# Identidad del Prospecto por landing (primera aparición)

**Fecha:** 2026-07-08
**Estado:** accepted — aprobado por ChatGPT; migración DB gated
**Bloque:** LM-003A-B — Brokers / productores / organizadores (vertical seguros)

## Decisión

Un Prospecto se identifica por su **empresa/landing** (una fila por landing en
`la_prospectos`). Se guarda la **primera aparición** del landing junto con la keyword
base, la localidad de búsqueda y el geo con que apareció esa primera vez; las
apariciones posteriores del mismo landing (otra keyword o localidad) se descartan y
**no** modifican esa atribución original.

## Contexto

La regla estratégica ampliada ("Estrategia LeadMaster ampliada", 241-lm) pide guardar
la primera vez que aparece un prospecto con `keyword base + localidad de búsqueda +
query completa`. El diseño previo dedup­licaba por la combinación keyword + landing, de
modo que un mismo landing hallado con distintas keywords/localidades generaba filas
distintas. Eso es incompatible con "una primera aparición única por prospecto".

## Considered Options

- **Identidad por keyword + landing (statu quo).** Mantiene el índice
  `UNIQUE(palabra_clave, url_landing_hash)` de `migration_dedupe_keyword_url.sql`.
  Rechazada: permite el mismo landing repetido por localidad y no representa "primera
  aparición única".
- **Tabla maestra + tabla de apariciones (dos tablas).** Separa "primera vez" de
  "cuántas veces". Rechazada por ahora: exige crear tabla nueva (AGENTS.md regla 3) y
  amplía el alcance más allá de lo necesario para la etapa actual.
- **Identidad por landing, una fila por landing (elegida).** Mínimo cambio de modelo,
  compatible con datos y código actuales; las apariciones posteriores se descartan.

## Consequences

- La unicidad por landing se aplica **primero a nivel aplicación** (dedup­licación por
  landing en la API, el endpoint de verificación y el scraper).
- El índice `UNIQUE(palabra_clave, url_landing_hash)` queda **contradicho** por esta
  decisión. Migrarlo a unicidad por landing a nivel base de datos es un paso **aparte y
  gated**: requiere auditar y deduplicar las filas existentes (operación destructiva) y
  aprobación explícita, además de verificar el esquema real con `SHOW CREATE TABLE`
  (AGENTS.md reglas 1, 3 y 7).
- Los duplicados por keyword+landing que ya existan en la base preceden a esta regla y
  se conservan tal cual; la nueva unicidad aplica de aquí en adelante.
- Referencia de contexto: reemplaza la definición previa de "Prospecto capturado"
  registrada en `CONTEXT.md`.
