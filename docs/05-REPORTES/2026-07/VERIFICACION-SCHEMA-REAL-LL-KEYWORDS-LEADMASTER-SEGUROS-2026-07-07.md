# Verificación de schema real — ll_keywords_leadmaster

**Fecha:** 2026-07-07
**Proyecto:** LeadMaster
**Repositorio:** prospectos-leadmaster-local
**Bloque:** LM-003A — Preparación de datos para vertical seguros
**Estado:** DIAGNÓSTICO / NO EJECUTADO

---

## 1. Objetivo

Verificar la compatibilidad entre el schema real de `ll_keywords_leadmaster` (obtenido de `config/create_ll_keywords_leadmaster.sql`, DDL verificado en producción) y el seed de keywords para seguros (`config/seed_ll_keywords_leadmaster_seguros.sql`, escrito con schema inferido).

---

## 2. Schema real verificado

Fuente: `config/create_ll_keywords_leadmaster.sql`

```sql
CREATE TABLE IF NOT EXISTS ll_keywords_leadmaster (
    id INT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    keyword_hash CHAR(64) NOT NULL,
    sector VARCHAR(100) DEFAULT NULL,
    perfil ENUM('b2b', 'b2c', 'mixto') DEFAULT 'b2b',
    prioridad ENUM('alta', 'media', 'baja') DEFAULT 'media',
    estado ENUM('pendiente', 'activa', 'pausada', 'descartada') DEFAULT 'pendiente',
    origen VARCHAR(100) DEFAULT NULL,
    notas TEXT DEFAULT NULL,
    veces_buscada INT DEFAULT 0,
    ultima_busqueda_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ll_keywords_leadmaster_hash (keyword_hash),
    INDEX idx_ll_keywords_estado (estado),
    INDEX idx_ll_keywords_prioridad (prioridad),
    INDEX idx_ll_keywords_sector (sector),
    INDEX idx_ll_keywords_perfil (perfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Schema inferido del seed original

Fuente: `config/seed_ll_keywords_leadmaster_seguros.sql` (líneas 14-36)

El seed original asume:

| Campo          | Valor en seed    | Schema real       | Compatible |
| -------------- | ---------------- | ----------------- | ---------- |
| `perfil`       | `'A'`, `'B'`, `'C'`, `'D'`, `'E'` | ENUM('b2b','b2c','mixto') | **NO** |
| `prioridad`    | `1`, `2`, `3`    | ENUM('alta','media','baja') | **NO** |
| `estado`       | `'activa'`       | ENUM('pendiente','activa','pausada','descartada') | OK |
| `origen`       | `'seed_manual'`  | VARCHAR(100)      | OK |
| `keyword_hash` | `NULL`           | CHAR(64) NOT NULL | **NO** |
| `notas`        | `'bloque=...'`   | TEXT              | OK |

---

## 4. Hallazgos críticos

### 4.1. perfil: valores A/B/C/D/E vs ENUM(b2b, b2c, mixto)

El campo real `perfil` clasifica el tipo de negocio (business-to-business, business-to-consumer, mixto). No acepta categorías operativas como A, B, C, D, E.

La categoría operativa LeadMaster (A/B/C/D/E) debe residir en el campo `notas`, no en `perfil`.

Todas las keywords de seguros son B2B, por lo tanto `perfil = 'b2b'`.

### 4.2. prioridad: valores 1/2/3 vs ENUM(alta, media, baja)

El campo real `prioridad` es ENUM con valores `alta`, `media`, `baja`.

Mapeo propuesto:

| Seed (inferido) | Schema real |
| --------------- | ----------- |
| 1               | `alta`      |
| 2               | `media`     |
| 3               | `baja`      |

### 4.3. keyword_hash: NULL vs CHAR(64) NOT NULL

El campo `keyword_hash` es `NOT NULL` con `UNIQUE KEY`.

Verificado en MySQL Workbench: `keyword_hash = SHA2(keyword, 256)`. La consulta `SELECT keyword_hash = SHA2(keyword, 256) AS coincide` devolvió `1` en los registros revisados. Algoritmo confirmado.

El seed original usa `NULL`, lo cual es inviable contra el schema real.

---

## 5. Mapeo de categoría operativa

La categoría operativa LeadMaster (A, B, C, D, E) no ocupa el campo `perfil`. Debe registrarse en `notas`.

Formato propuesto:

```
bloque=LM-003A | brokers y productores generales | categoria_operativa=A
```

---

## 6. Valores reales detectados en entorno local

Según evidencia del entorno local:

- `origen` se registra como `'seed_manual_lm003a'` (no `'seed_manual'` genérico).
- `notas` usa el formato con `categoria_operativa=X`.
- La tabla existe, está poblada y ya fue usada para búsquedas.

---

## 7. Estado previo de seguros en ll_keywords_leadmaster

Antes de cargar el seed compatible LM-003A Perfil Operativo A, se verificó en MySQL Workbench el estado actual de la vertical seguros en la tabla:

```sql
SELECT COUNT(*) AS total_seguros
FROM iunaorg_dyd.ll_keywords_leadmaster
WHERE sector = 'seguros';
```

Resultado:

```
total_seguros = 1
```

Se inspeccionó el único registro existente:

| Campo     | Valor                                             |
| --------- | ------------------------------------------------- |
| id        | 3                                                 |
| keyword   | cotizar seguro de responsabilidad civil para empresas |
| sector    | seguros                                           |
| perfil    | b2b                                               |
| prioridad | media                                             |
| estado    | activa                                            |
| origen    | lista_inicial                                     |

Aclaraciones:

- Este registro no corresponde al Perfil Operativo A.
- Su keyword no coincide con ninguna de las 13 keywords del Perfil Operativo A del seed compatible.
- No debería bloquear la carga del nuevo seed porque `keyword_hash` será distinto (proviene de un keyword diferente).
- El seed compatible debería insertar 13 keywords nuevas si no existen otros duplicados.
- Tras la carga, el total esperado en `sector = 'seguros'` sería 14 (1 preexistente + 13 nuevas).

---

## 8. Conclusión

El seed `config/seed_ll_keywords_leadmaster_seguros.sql` **NO es directamente ejecutable** contra el schema real de producción por tres razones:

1. `perfil` usa valores `'A'`/`'B'`/`'C'`/`'D'`/`'E'` que no son válidos en el ENUM.
2. `prioridad` usa enteros `1`/`2`/`3` que no son válidos en el ENUM.
3. `keyword_hash` usa `NULL` contra una columna `NOT NULL`.

Se requiere un nuevo seed compatible con el schema real.

---

## 9. Recomendación

1. Crear `config/seed_ll_keywords_leadmaster_seguros_perfil_a_compatible.sql` con valores correctos para el schema real.
2. Usar `perfil = 'b2b'`, `prioridad = 'alta'`, `origen = 'seed_manual_lm003a'`.
3. Registrar `categoria_operativa=A` en `notas`.
4. El `keyword_hash` se calcula con `SHA2(keyword, 256)`, verificado en MySQL Workbench.
5. No modificar el seed original (`seed_ll_keywords_leadmaster_seguros.sql`) — mantenerlo como referencia histórica del schema inferido.
