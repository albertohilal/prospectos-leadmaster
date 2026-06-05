# Plan de Trabajo – Migración de Palabras Clave a Base de Datos

**Fecha:** 2026-06-05  
**Proyecto:** Prospectos LeadMaster  
**Base de datos:** `iunaorg_dyd`  
**Hosting:** iFastNet  
**Estado:** Borrador operativo  
**Autor:** Alberto Hilal + ChatGPT  

---

## 1. Resumen Ejecutivo

Este documento define un plan de trabajo simple para reemplazar el manejo actual de palabras clave mediante listas fijas o scripts hardcodeados por una tabla en MySQL.

El objetivo no es construir una arquitectura compleja de generación automática de keywords, sino **ordenar, administrar y escalar de forma mínima el uso de palabras clave** dentro del proyecto `prospectos-leadmaster-local`.

La solución propuesta consiste en crear una tabla maestra llamada `ll_keywords_leadmaster` dentro de la base de datos `iunaorg_dyd`, alojada en iFastNet.

Desde esa tabla se podrán administrar las palabras clave actuales y futuras, asignarles estado, prioridad, sector y origen, y luego adaptar gradualmente los scripts para leer las keywords activas desde MySQL.

---

## 2. Contexto

Actualmente el proyecto utiliza palabras clave definidas en documentación y scripts de ejecución.

Esto permitió iniciar pruebas, pero genera problemas operativos:

- las keywords quedan dispersas;
- se dificulta saber cuáles ya fueron usadas;
- se pueden duplicar búsquedas;
- no hay estado operativo por keyword;
- no se puede pausar una búsqueda sin editar scripts;
- no hay prioridad por sector;
- no hay trazabilidad de origen;
- no hay contador de ejecuciones;
- no hay fecha de última búsqueda.

La base de datos operativa del proyecto es:

```text
iunaorg_dyd
```

Esta base vive en iFastNet. Por lo tanto, la administración de palabras clave debe integrarse allí y no en una base local llamada `leadmaster`.

---

## 3. Objetivo

Implementar una forma simple y mantenible de administrar palabras clave para búsqueda de prospectos LeadMaster.

Objetivos concretos:

1. Crear una tabla maestra de keywords.
2. Cargar las keywords actuales sin perder historial.
3. Permitir agregar nuevas palabras clave sin modificar scripts.
4. Registrar prioridad, sector, estado y origen.
5. Evitar duplicados.
6. Preparar el proyecto para que los scripts tomen keywords activas desde MySQL.
7. Mantener la implementación liviana, sin desarrollar todavía un generador automático complejo.

---

## 4. Alcance

### Incluido

- Crear tabla `ll_keywords_leadmaster`.
- Crear archivo SQL de estructura.
- Crear archivo SQL de carga inicial con las keywords actuales.
- Definir estados operativos.
- Definir prioridad y sector.
- Documentar el flujo de uso.
- Planificar la adaptación mínima del script de ejecución.

### No incluido por ahora

- Generador automático de combinaciones.
- Sistema de aprendizaje automático.
- Panel web de administración.
- Integración con LeadMaster Central Hub.
- Modificación estructural de la tabla actual de prospectos.
- Clasificación automática con OpenAI.
- Scheduler avanzado.

---

## 5. Decisión técnica

Se adopta una solución intermedia:

```text
No usar más listas sueltas como fuente principal.
No construir todavía un generador complejo.
Guardar las palabras clave en una tabla MySQL simple.
```

La tabla `ll_keywords_leadmaster` funcionará como fuente de verdad para las búsquedas.

---

## 6. Tabla propuesta

Nombre de tabla:

```sql
ll_keywords_leadmaster
```

Archivo SQL sugerido:

```text
config/create_ll_keywords_leadmaster.sql
```

Contenido sugerido:

```sql
USE iunaorg_dyd;

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

    UNIQUE KEY uq_keyword_hash (keyword_hash),
    INDEX idx_estado (estado),
    INDEX idx_prioridad (prioridad),
    INDEX idx_sector (sector),
    INDEX idx_perfil (perfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 7. Campos de la tabla

| Campo | Función |
|---|---|
| `id` | Identificador interno. |
| `keyword` | Frase exacta que se buscará. |
| `keyword_hash` | Hash único para evitar duplicados. |
| `sector` | Sector comercial: energía, minería, agro, construcción, logística, etc. |
| `perfil` | Tipo de mercado: `b2b`, `b2c` o `mixto`. |
| `prioridad` | Prioridad operativa: `alta`, `media`, `baja`. |
| `estado` | Estado de uso: `pendiente`, `activa`, `pausada`, `descartada`. |
| `origen` | De dónde salió la keyword: lista inicial, línea industrial, prueba manual, etc. |
| `notas` | Observaciones libres. |
| `veces_buscada` | Cantidad de veces que fue ejecutada. |
| `ultima_busqueda_at` | Fecha y hora de la última ejecución. |
| `created_at` | Fecha de creación. |
| `updated_at` | Fecha de última actualización. |

---

## 8. Estados operativos

| Estado | Significado |
|---|---|
| `pendiente` | Keyword cargada pero todavía no habilitada para ejecución. |
| `activa` | Keyword disponible para que el script la use. |
| `pausada` | Keyword suspendida temporalmente sin borrarla. |
| `descartada` | Keyword considerada no útil, conservada por historial. |

---

## 9. Prioridades

| Prioridad | Uso |
|---|---|
| `alta` | Sectores con mejor perfil LeadMaster: B2B, ticket alto, posible anunciante activo. |
| `media` | Keywords útiles pero no centrales. |
| `baja` | Keywords experimentales o de menor valor esperado. |

---

## 10. Sectores iniciales sugeridos

Sectores permitidos inicialmente:

```text
construccion
logistica
seguros
energia
odontologia
mantenimiento
seguridad_higiene
seguridad
recupero_creditos
industria
fumigacion
viaticos
envases
traduccion_tecnica
transporte_valores
flotas
hoteleria
mineria
agro
petroleo_gas
equipamiento_industrial
```

No es necesario crear una tabla separada de sectores en esta etapa. Se puede usar un campo `sector` de texto controlado manualmente.

---

## 11. Carga inicial de keywords actuales

Archivo sugerido:

```text
config/seed_ll_keywords_leadmaster_iniciales.sql
```

Contenido base:

```sql
USE iunaorg_dyd;

INSERT INTO ll_keywords_leadmaster
(keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas)
VALUES
(
    'presupuesto para reforma de oficinas en CABA',
    SHA2(LOWER(TRIM('presupuesto para reforma de oficinas en CABA')), 256),
    'construccion',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'contratar logística de distribución para alimentos',
    SHA2(LOWER(TRIM('contratar logística de distribución para alimentos')), 256),
    'logistica',
    'b2b',
    'alta',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'cotizar seguro de responsabilidad civil para empresas',
    SHA2(LOWER(TRIM('cotizar seguro de responsabilidad civil para empresas')), 256),
    'seguros',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'alquiler de generadores eléctricos para industrias',
    SHA2(LOWER(TRIM('alquiler de generadores eléctricos para industrias')), 256),
    'energia',
    'b2b',
    'alta',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'compra de insumos odontológicos por mayor',
    SHA2(LOWER(TRIM('compra de insumos odontológicos por mayor')), 256),
    'odontologia',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'servicio de mantenimiento de ascensores para edificios',
    SHA2(LOWER(TRIM('servicio de mantenimiento de ascensores para edificios')), 256),
    'mantenimiento',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'auditoría de seguridad e higiene para fábricas',
    SHA2(LOWER(TRIM('auditoría de seguridad e higiene para fábricas')), 256),
    'seguridad_higiene',
    'b2b',
    'alta',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'gestión de recupero de créditos para PYMES',
    SHA2(LOWER(TRIM('gestión de recupero de créditos para PYMES')), 256),
    'recupero_creditos',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'presupuesto para pintura industrial de tanques',
    SHA2(LOWER(TRIM('presupuesto para pintura industrial de tanques')), 256),
    'industria',
    'b2b',
    'alta',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'contratar vigilancia privada para obras en construcción',
    SHA2(LOWER(TRIM('contratar vigilancia privada para obras en construcción')), 256),
    'seguridad',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'servicio de fumigación para plantas industriales',
    SHA2(LOWER(TRIM('servicio de fumigación para plantas industriales')), 256),
    'fumigacion',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'cotización de viáticos corporativos para empleados',
    SHA2(LOWER(TRIM('cotización de viáticos corporativos para empleados')), 256),
    'viaticos',
    'b2b',
    'baja',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'alquiler de andamios para construcción en altura',
    SHA2(LOWER(TRIM('alquiler de andamios para construcción en altura')), 256),
    'construccion',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'proveedor de envases de vidrio para vinotecas en argentina',
    SHA2(LOWER(TRIM('proveedor de envases de vidrio para vinotecas en argentina')), 256),
    'envases',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'servicio de traducción técnica para exportadores',
    SHA2(LOWER(TRIM('servicio de traducción técnica para exportadores')), 256),
    'traduccion_tecnica',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'presupuesto para impermeabilización de terrazas comerciales',
    SHA2(LOWER(TRIM('presupuesto para impermeabilización de terrazas comerciales')), 256),
    'construccion',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'contratar escolta privada para transporte de valores',
    SHA2(LOWER(TRIM('contratar escolta privada para transporte de valores')), 256),
    'transporte_valores',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'gestión de patentes municipales para flotas de camiones',
    SHA2(LOWER(TRIM('gestión de patentes municipales para flotas de camiones')), 256),
    'flotas',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'cotizar instalación de paneles solares para fábricas',
    SHA2(LOWER(TRIM('cotizar instalación de paneles solares para fábricas')), 256),
    'energia',
    'b2b',
    'alta',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
),
(
    'servicio de limpieza de tanques de agua para hoteles',
    SHA2(LOWER(TRIM('servicio de limpieza de tanques de agua para hoteles')), 256),
    'hoteleria',
    'b2b',
    'media',
    'activa',
    'lista_inicial',
    'Keyword proveniente de la lista original del proyecto'
);
```

Nota: si se ejecuta más de una vez este `INSERT`, puede fallar por duplicados debido al índice único `uq_keyword_hash`. Para una versión más tolerante se puede usar `INSERT IGNORE`.

---

## 12. Nuevas keywords

Las nuevas palabras clave ya no deberían cargarse en scripts.

Deberían insertarse en la tabla con `estado='pendiente'`.

Ejemplo:

```sql
USE iunaorg_dyd;

INSERT INTO ll_keywords_leadmaster
(keyword, keyword_hash, sector, perfil, prioridad, estado, origen, notas)
VALUES
(
    'proveedor de válvulas industriales para petróleo y gas',
    SHA2(LOWER(TRIM('proveedor de válvulas industriales para petróleo y gas')), 256),
    'petroleo_gas',
    'b2b',
    'alta',
    'pendiente',
    'linea_industrial',
    'Nueva keyword orientada a energía, petróleo y gas'
);
```

Primero se cargan como `pendiente`.

Luego, si se decide probarlas:

```sql
USE iunaorg_dyd;

UPDATE ll_keywords_leadmaster
SET estado = 'activa'
WHERE keyword = 'proveedor de válvulas industriales para petróleo y gas';
```

---

## 13. Consulta operativa para el script

El script debería tomar keywords activas con una consulta simple:

```sql
SELECT id, keyword
FROM ll_keywords_leadmaster
WHERE estado = 'activa'
ORDER BY
    FIELD(prioridad, 'alta', 'media', 'baja'),
    COALESCE(ultima_busqueda_at, '1970-01-01') ASC,
    id ASC
LIMIT 10;
```

Esto permite:

- ejecutar primero prioridad alta;
- evitar repetir siempre las mismas;
- tomar primero las que nunca se buscaron;
- limitar el lote.

---

## 14. Actualización posterior a la búsqueda

Luego de ejecutar una keyword, el script debería actualizar:

```sql
UPDATE ll_keywords_leadmaster
SET
    veces_buscada = veces_buscada + 1,
    ultima_busqueda_at = NOW()
WHERE id = ?;
```

En esta etapa no hace falta medir todavía calidad del resultado. Solo registrar ejecución.

---

## 15. Relación con la tabla de prospectos

Por ahora se mantiene el campo existente:

```sql
palabra_clave VARCHAR(255) NOT NULL
```

No se modifica la tabla actual de prospectos en esta primera etapa.

Más adelante, si se considera necesario, podría agregarse:

```sql
ALTER TABLE prospectos
ADD COLUMN keyword_id INT NULL,
ADD INDEX idx_keyword_id (keyword_id);
```

Pero esta mejora queda fuera del alcance inicial para evitar tocar datos históricos o romper scripts actuales.

---

## 16. Forma de ejecución en iFastNet

Como la base `iunaorg_dyd` vive en iFastNet, la ejecución puede hacerse de tres maneras:

1. phpMyAdmin;
2. MySQL Workbench conectado a iFastNet;
3. consola MySQL, si estuviera disponible.

Si se usa phpMyAdmin o Workbench, importar primero:

```text
config/create_ll_keywords_leadmaster.sql
```

y luego:

```text
config/seed_ll_keywords_leadmaster_iniciales.sql
```

Si se usa consola:

```bash
mysql -u USUARIO_IFASTNET -p iunaorg_dyd < config/create_ll_keywords_leadmaster.sql
mysql -u USUARIO_IFASTNET -p iunaorg_dyd < config/seed_ll_keywords_leadmaster_iniciales.sql
```

---

## 17. Plan de implementación

### Fase 1 – Documentación

Objetivo: dejar documentado el cambio de criterio.

Tareas:

- [ ] Crear este documento en `docs/reportes/`.
- [ ] Revisar que el documento del perfil del prospecto esté corregido.
- [ ] Confirmar que el manejo de keywords pasa de listas a tabla MySQL.

Resultado esperado:

```text
docs/reportes/2026-06-05-plan-trabajo-keywords-db.md
```

---

### Fase 2 – Crear tabla de keywords

Objetivo: crear el archivo SQL de estructura.

Tareas:

- [ ] Crear `config/create_ll_keywords_leadmaster.sql`.
- [ ] Incluir `CREATE TABLE IF NOT EXISTS ll_keywords_leadmaster`.
- [ ] Usar explícitamente `USE iunaorg_dyd;`.
- [ ] Validar que use `utf8mb4`.
- [ ] Validar índice único por `keyword_hash`.

Resultado esperado:

```text
Tabla ll_keywords_leadmaster creada correctamente en iunaorg_dyd.
```

---

### Fase 3 – Cargar keywords actuales

Objetivo: migrar la lista actual a la tabla.

Tareas:

- [ ] Crear `config/seed_ll_keywords_leadmaster_iniciales.sql`.
- [ ] Cargar las 20 keywords actuales.
- [ ] Asignar sector, perfil, prioridad, estado y origen.
- [ ] Ejecutar carga sobre `iunaorg_dyd`.
- [ ] Verificar cantidad de registros.

Consulta de verificación:

```sql
SELECT id, keyword, sector, prioridad, estado
FROM ll_keywords_leadmaster
ORDER BY id;
```

Resultado esperado:

```text
20 keywords iniciales cargadas.
```

---

### Fase 4 – Agregar nuevas keywords como pendientes

Objetivo: reemplazar futuros batches manuales por carga controlada en DB.

Tareas:

- [ ] Crear archivo opcional `config/seed_keywords_industriales.sql`.
- [ ] Cargar nuevas keywords con `estado='pendiente'`.
- [ ] Revisarlas manualmente.
- [ ] Activar solo las seleccionadas.

Resultado esperado:

```text
Nuevas keywords cargadas sin mezclarse con la lista original.
```

---

### Fase 5 – Adaptar script de ejecución

Objetivo: dejar de usar una lista hardcodeada en scripts.

Tareas:

- [ ] Revisar `scripts/run-daily-batch.sh`.
- [ ] Crear alternativa nueva, sin romper la anterior.
- [ ] Nombre sugerido: `scripts/run-keywords-from-db.sh`.
- [ ] Crear o adaptar script Node.js que consulte keywords activas.
- [ ] Ejecutar una prueba con `LIMIT 1`.
- [ ] Actualizar `veces_buscada` y `ultima_busqueda_at`.

Resultado esperado:

```text
El sistema ejecuta keywords activas desde MySQL.
```

---

### Fase 6 – Validación

Objetivo: confirmar que el cambio no rompe el flujo actual.

Checklist:

- [ ] La tabla existe en `iunaorg_dyd`.
- [ ] Las 20 keywords actuales están cargadas.
- [ ] No hay duplicados por hash.
- [ ] Se puede pausar una keyword.
- [ ] Se puede activar una keyword pendiente.
- [ ] El script puede leer keywords activas.
- [ ] El script puede actualizar `veces_buscada`.
- [ ] Los prospectos siguen guardándose correctamente.

Consulta útil:

```sql
SELECT estado, COUNT(*) AS total
FROM ll_keywords_leadmaster
GROUP BY estado;
```

---

### Fase 7 – Limpieza y commit

Objetivo: cerrar el cambio de manera ordenada.

Archivos esperados:

```text
docs/reportes/2026-06-05-plan-trabajo-keywords-db.md
config/create_ll_keywords_leadmaster.sql
config/seed_ll_keywords_leadmaster_iniciales.sql
```

Posible archivo posterior:

```text
scripts/run-keywords-from-db.sh
```

Comandos sugeridos:

```bash
git status --short
git add docs/reportes/2026-06-05-plan-trabajo-keywords-db.md
git add config/create_ll_keywords_leadmaster.sql
git add config/seed_ll_keywords_leadmaster_iniciales.sql
git commit -m "docs: plan keyword management via database"
```

No incluir otros archivos no relacionados en el mismo commit.

---

## 18. Criterio de éxito

El cambio se considera exitoso cuando:

```text
- las keywords ya no dependen exclusivamente de scripts;
- existe una tabla maestra en MySQL;
- la tabla vive en iunaorg_dyd;
- las 20 keywords actuales están preservadas;
- las nuevas keywords pueden agregarse como pendientes;
- se puede activar, pausar o descartar una keyword sin editar código;
- el script puede consultar keywords activas desde la base;
- se mantiene la tabla de prospectos sin cambios destructivos.
```

---

## 19. Riesgos

| Riesgo | Mitigación |
|---|---|
| Duplicar keywords | Usar `keyword_hash` único. |
| Ejecutar SQL sobre base equivocada | Usar explícitamente `USE iunaorg_dyd;`. |
| Romper script actual | Crear script nuevo antes de reemplazar `run-daily-batch.sh`. |
| Cargar keywords malas | Ingresarlas como `pendiente`, no como `activa`. |
| Mezclar cambios documentales con código | Separar commits. |
| Tocar tabla de prospectos prematuramente | No modificarla en la fase inicial. |

---

## 20. Decisión adoptada

Se adopta una estrategia incremental:

```text
Primero ordenar la administración de keywords en MySQL.
Usar la base real iunaorg_dyd alojada en iFastNet.
Después adaptar scripts.
Recién más adelante evaluar panel web, automatización o generación avanzada.
```

---

## 21. Próximo paso inmediato

Crear los siguientes archivos:

```text
docs/reportes/2026-06-05-plan-trabajo-keywords-db.md
config/create_ll_keywords_leadmaster.sql
config/seed_ll_keywords_leadmaster_iniciales.sql
```

Luego ejecutar en la base `iunaorg_dyd`, mediante phpMyAdmin, MySQL Workbench o consola si estuviera disponible.

Orden de ejecución:

```text
1. config/create_ll_keywords_leadmaster.sql
2. config/seed_ll_keywords_leadmaster_iniciales.sql
```

Finalmente verificar:

```sql
SELECT id, keyword, sector, prioridad, estado
FROM ll_keywords_leadmaster
ORDER BY id;
```