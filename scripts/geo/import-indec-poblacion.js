#!/usr/bin/env node

/**
 * import-indec-poblacion.js
 *
 * PLACEHOLDER — NO descarga datos todavía.
 *
 * Objetivo futuro:
 *   Importar datos de población (habitantes) desde INDEC y actualizar
 *   la tabla la_cat_geo_keywords_ar con valores de población reales.
 *
 * Fuente prevista: INDEC (https://www.indec.gob.ar/)
 * Dataset esperado: Censo 2022 o proyecciones por localidad censal.
 *
 * Estado actual (2026-07-05):
 *   - El dataset exacto de INDEC no está confirmado.
 *   - Este script define la estructura esperada de importación.
 *   - Establece las reglas de matching entre datos INDEC y el catálogo.
 *   - Queda preparado para implementar la descarga cuando se confirme
 *     la fuente.
 *
 * Matching previsto:
 *   - Nivel 1: localidad_censal_id (código INDEC de localidad censal).
 *   - Nivel 2: municipio_id (código de municipio).
 *   - Nivel 3: provincia_id (código de provincia).
 *   - Se intenta el match en ese orden. Si un nivel no matchea,
 *     se intenta el siguiente.
 *
 * NO EJECUTAR sin:
 *   1. Confirmar el dataset exacto de INDEC.
 *   2. Revisión humana de la estructura de importación.
 *   3. Validar que la tabla la_cat_geo_keywords_ar existe.
 *
 * NO modifica base de datos en esta etapa.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// Estructura esperada del dataset INDEC
// ============================================================================
//
// El dataset de INDEC debería contener al menos:
//
// | Campo                | Descripción                                    |
// |----------------------|------------------------------------------------|
// | localidad_censal_id  | Código INDEC de localidad censal               |
// | localidad_censal_nombre | Nombre de la localidad censal               |
// | municipio_id         | Código de municipio                            |
// | provincia_id         | Código de provincia                            |
// | poblacion            | Habitantes                                     |
// | anio                 | Año del censo/proyección                       |
//
// Opciones de datasets conocidos:
//   - Censo 2022: datos definitivos por radio censal, localidad, departamento.
//     Portal: https://censo.gob.ar/
//   - Datos abiertos INDEC: https://www.indec.gob.ar/indec/web/Institucional-Indec-BasesDeDatos
//   - Georef no es fuente confiable de población.
//
// ============================================================================

// ============================================================================
// Configuración
// ============================================================================

const EXPECTED_INDEC_COLUMNS = [
  'localidad_censal_id',
  'localidad_censal_nombre',
  'municipio_id',
  'municipio_nombre',
  'departamento_id',
  'provincia_id',
  'provincia_nombre',
  'poblacion',
  'anio',
];

const FUENTE_NOMBRE = 'INDEC Censo 2022';
const FUENTE_URL = 'https://www.indec.gob.ar/';

// ============================================================================
// Parseo de CLI
// ============================================================================

function parseArgs(argv) {
  const options = {
    input: null,
    dryRun: true,
    writeSql: false,
    output: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--input') {
      options.input = argv[i + 1];
      i++;
    } else if (arg === '--write-sql') {
      options.writeSql = true;
      options.dryRun = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
      options.writeSql = false;
    } else if (arg === '--output') {
      options.output = argv[i + 1];
      i++;
    }
  }

  return options;
}

function showHelp() {
  console.log(`Uso: node scripts/geo/import-indec-poblacion.js [opciones]

PLACEHOLDER — Importa datos de población desde INDEC.

Opciones:
  --dry-run           (default) Solo muestra qué se haría, no escribe nada
  --write-sql         Escribe UPDATEs SQL para la tabla la_cat_geo_keywords_ar
  --input PATH        Archivo CSV/JSON de entrada con datos INDEC
  --output PATH       Directorio de salida para SQL generado
  --help, -h          Muestra esta ayuda

ESTADO ACTUAL:
  Este script es un placeholder. NO descarga datos de INDEC todavía.
  Falta confirmar el dataset exacto a utilizar.

  Cuando se confirme el dataset:
    1. Colocar el archivo CSV/JSON en el directorio de datos.
    2. Ejecutar con --input <archivo> --write-sql.
    3. Revisar la salida SQL.
    4. Ejecutar el SQL solo después de aprobación explícita.

Matching:
  Nivel 1: localidad_censal_id (match exacto)
  Nivel 2: municipio_id (match exacto si no hay localidad censal)
  Nivel 3: provincia_id (match exacto si no hay niveles superiores)`);
}

// ============================================================================
// Validación de estructura INDEC
// ============================================================================

function validateIndecColumns(columns) {
  const missing = EXPECTED_INDEC_COLUMNS.filter(c => !columns.includes(c));
  if (missing.length > 0) {
    console.warn(`Columnas esperadas no encontradas: ${missing.join(', ')}`);
    console.warn('El dataset INDEC puede tener una estructura diferente.');
    return false;
  }
  return true;
}

// ============================================================================
// Generación de UPDATE SQL
// ============================================================================

function generateUpdateSql(updates) {
  const lines = [
    'USE iunaorg_dyd;',
    '',
    `-- Generado por import-indec-poblacion.js el ${new Date().toISOString()}`,
    `-- Fuente: ${FUENTE_NOMBRE}`,
    `-- URL: ${FUENTE_URL}`,
    `-- Total actualizaciones: ${updates.length}`,
    '',
    '-- ============================================',
    '-- ADVERTENCIA: revisar antes de ejecutar.',
    '-- La población se asigna donde hay match por ID.',
    '-- Los registros sin match quedan con población NULL.',
    '-- ============================================',
    '',
  ];

  for (const u of updates) {
    lines.push(
      `UPDATE la_cat_geo_keywords_ar`,
      `SET`,
      `  poblacion = ${u.poblacion},`,
      `  poblacion_anio = ${u.anio},`,
      `  poblacion_fuente = '${FUENTE_NOMBRE}',`,
      `  poblacion_fuente_url = '${FUENTE_URL}',`,
      `  fuente_poblacion = '${FUENTE_NOMBRE}',`,
      `  last_poblacion_sync_at = NOW()`,
      `WHERE ${u.whereClause};`,
      `-- matched: ${u.matchNivel} — ${u.nombre}`,
      ''
    );
  }

  return lines.join('\n');
}

// ============================================================================
// Match simulacro (placeholder)
// ============================================================================

function simulateIndecData() {
  // Datos de ejemplo para demostrar la estructura esperada.
  // ESTOS DATOS SON FICTICIOS — NO usar como fuente de población real.
  return [
    { localidad_censal_id: '02001001', localidad_censal_nombre: 'CABA',   provincia_id: '02', provincia_nombre: 'Ciudad Autónoma de Buenos Aires', poblacion: 3120612, anio: 2022 },
    { localidad_censal_id: '06001001', localidad_censal_nombre: 'La Plata', provincia_id: '06', provincia_nombre: 'Buenos Aires',                   poblacion: 17541300, anio: 2022 },
    { localidad_censal_id: '14001001', localidad_censal_nombre: 'Córdoba', provincia_id: '14', provincia_nombre: 'Córdoba',                          poblacion: 3978984, anio: 2022 },
    { localidad_censal_id: '82001001', localidad_censal_nombre: 'Rosario', provincia_id: '82', provincia_nombre: 'Santa Fe',                         poblacion: 3556522, anio: 2022 },
    { localidad_censal_id: '50001001', localidad_censal_nombre: 'Mendoza', provincia_id: '50', provincia_nombre: 'Mendoza',                          poblacion: 2014533, anio: 2022 },
    { localidad_censal_id: '58001001', localidad_censal_nombre: 'Neuquén', provincia_id: '58', provincia_nombre: 'Neuquén',                          poblacion: 726267, anio: 2022 },
    { localidad_censal_id: '90001001', localidad_censal_nombre: 'Tucumán', provincia_id: '90', provincia_nombre: 'Tucumán',                          poblacion: 1703186, anio: 2022 },
    { localidad_censal_id: '30001001', localidad_censal_nombre: 'Paraná',  provincia_id: '30', provincia_nombre: 'Entre Ríos',                       poblacion: 1426426, anio: 2022 },
    { localidad_censal_id: '78001001', localidad_censal_nombre: 'Río Gallegos', provincia_id: '78', provincia_nombre: 'Santa Cruz',                  poblacion: 333473, anio: 2022 },
  ];
}

function buildUpdate(row) {
  // Nivel 1: localidad_censal_id
  if (row.localidad_censal_id) {
    return {
      poblacion: row.poblacion,
      anio: row.anio,
      whereClause: `localidad_censal_id = '${row.localidad_censal_id}'`,
      matchNivel: 'localidad_censal_id',
      nombre: row.localidad_censal_nombre || row.provincia_nombre,
    };
  }

  // Nivel 2: municipio_id
  if (row.municipio_id) {
    return {
      poblacion: row.poblacion,
      anio: row.anio,
      whereClause: `municipio_id = '${row.municipio_id}'`,
      matchNivel: 'municipio_id',
      nombre: row.municipio_nombre || row.provincia_nombre,
    };
  }

  // Nivel 3: provincia_id
  if (row.provincia_id) {
    return {
      poblacion: row.poblacion,
      anio: row.anio,
      whereClause: `provincia_id = '${row.provincia_id}' AND tipo_ubicacion = 'provincia'`,
      matchNivel: 'provincia_id',
      nombre: row.provincia_nombre,
    };
  }

  return null;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  console.log('=== import-indec-poblacion.js ===');
  console.log('ESTADO: PLACEHOLDER');
  console.log('');
  console.log('Este script NO descarga datos de INDEC todavía.');
  console.log('Falta confirmar el dataset exacto a utilizar.');
  console.log('');
  console.log('Fuentes candidatas:');
  console.log('  - Censo 2022 (datos definitivos por localidad censal)');
  console.log('  - Proyecciones provinciales/departamentales INDEC');
  console.log('  - Datos abiertos INDEC (CSV/XLSX)');
  console.log('');
  console.log('URL de referencia: https://www.indec.gob.ar/');
  console.log('');

  if (options.input) {
    console.log(`Archivo de entrada: ${options.input}`);
    console.log('ADVERTENCIA: la lectura de archivos INDEC no está implementada.');
    console.log('Este script es un placeholder. No se procesará el archivo.');
    console.log('');
    return;
  }

  // Demostración con datos simulados
  if (options.dryRun) {
    console.log('Modo: DRY-RUN (demostración con datos simulados)');
    console.log('');

    const simulatedData = simulateIndecData();
    console.log(`Datos simulados: ${simulatedData.length} registros de ejemplo.`);
    console.log('');
    console.log('Columnas esperadas del dataset INDEC:');
    for (const col of EXPECTED_INDEC_COLUMNS) {
      console.log(`  - ${col}`);
    }
    console.log('');

    const updates = [];
    for (const row of simulatedData) {
      const update = buildUpdate(row);
      if (update) updates.push(update);
    }

    console.log(`Matches generados: ${updates.length}`);
    console.log('');

    console.log('Estrategia de matching:');
    console.log('  1. localidad_censal_id (match exacto por código INDEC)');
    console.log('  2. municipio_id (si no hay localidad censal)');
    console.log('  3. provincia_id (si no hay niveles superiores)');
    console.log('');
    console.log('Ejemplo de UPDATE que se generaría:');
    if (updates.length > 0) {
      const first = updates[0];
      console.log(`  UPDATE la_cat_geo_keywords_ar`);
      console.log(`  SET poblacion = ${first.poblacion},`);
      console.log(`      poblacion_anio = ${first.anio},`);
      console.log(`      poblacion_fuente = '${FUENTE_NOMBRE}',`);
      console.log(`      poblacion_fuente_url = '${FUENTE_URL}',`);
      console.log(`      fuente_poblacion = '${FUENTE_NOMBRE}',`);
      console.log(`      last_poblacion_sync_at = NOW()`);
      console.log(`  WHERE ${first.whereClause};`);
      console.log(`  -- matched: ${first.matchNivel} — ${first.nombre}`);
      console.log('');
    }

    console.log('Próximos pasos:');
    console.log('  1. Confirmar el dataset exacto de INDEC a utilizar.');
    console.log('  2. Implementar lectura del archivo CSV/XLSX/JSON.');
    console.log('  3. Implementar matching real contra la tabla.');
    console.log('  4. Generar UPDATEs SQL revisables.');
    console.log('  5. Ejecutar solo después de aprobación explícita.');
    console.log('');
  }

  if (options.writeSql) {
    const outputDir = options.output || path.join(__dirname, '..', '..', 'exports', 'geo');
    fs.mkdirSync(outputDir, { recursive: true });

    const simulatedData = simulateIndecData();
    const updates = simulatedData.map(buildUpdate).filter(Boolean);
    const sql = generateUpdateSql(updates);

    const sqlPath = path.join(outputDir, 'import-indec-poblacion.sql');
    fs.writeFileSync(sqlPath, sql, 'utf-8');
    console.log(`SQL generado: ${sqlPath}`);
  }

  console.log('=== Completado ===');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
