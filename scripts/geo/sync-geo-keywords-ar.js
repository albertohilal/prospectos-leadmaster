#!/usr/bin/env node

/**
 * sync-geo-keywords-ar.js
 *
 * Sincroniza el catálogo geográfico argentino desde Georef API.
 *
 * Fuente: https://apis.datos.gob.ar/georef/api/
 *
 * Endpoints usados:
 *   /provincias
 *   /departamentos
 *   /municipios
 *   /localidades
 *   /localidades-censales
 *
 * Modos de operación:
 *   --dry-run        (por defecto) Muestra qué se haría, sin escribir archivos.
 *   --write-sql      Escribe salida como SQL revisable.
 *   --output PATH    Directorio de salida (default: ./exports/geo/).
 *   --max N          Máximo de registros por endpoint (default: sin límite).
 *
 * La conexión a DB está prevista pero NO implementada en esta etapa.
 * En el futuro se agregará bajo flag explícito (--write-db).
 *
 * NO EJECUTAR sin revisión humana previa.
 * NO consume APIs en modo dry-run.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuración
// ============================================================================

const GEOREF_BASE_URL = 'https://apis.datos.gob.ar/georef/api';

const ENDPOINTS = [
  { name: 'provincias',        path: '/provincias',         tipoUbicacion: 'provincia' },
  { name: 'departamentos',     path: '/departamentos',      tipoUbicacion: 'departamento' },
  { name: 'municipios',        path: '/municipios',         tipoUbicacion: 'municipio' },
  { name: 'localidades',       path: '/localidades',        tipoUbicacion: 'localidad' },
  { name: 'localidades-censales', path: '/localidades-censales', tipoUbicacion: 'localidad_censal' },
];

// ============================================================================
// Normalización
// ============================================================================

function stripAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ñ]/g, 'n')
    .replace(/[Ñ]/g, 'N');
}

function normalizeForSearch(str) {
  return stripAccents(str)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function computeModificadorBusqueda(nombreOficial) {
  return stripAccents(nombreOficial).trim();
}

// ============================================================================
// Generación de geo_key (clave de idempotencia)
//
// Formato ideal: tipo_ubicacion:identificador
//   provincia:02
//   departamento:14007
//   municipio:82084
//   localidad:82084001
//   localidad_censal:02001001
//
// Cuando no hay id oficial disponible, se usa fallback:
//   tipo_ubicacion:provincia_id:modificador_normalizado
//
// Este fallback es aceptable para seeds manuales y pruebas pero
// debe marcarse como tal. La sincronización con Georef debe
// corregirlo cuando el id real esté disponible.
// ============================================================================

function computeGeoKey(tipoUbicacion, provinciaId, modificadorNormalizado, idOficial) {
  if (idOficial) {
    return `${tipoUbicacion}:${idOficial}`;
  }

  // Fallback documentado
  if (provinciaId && modificadorNormalizado) {
    return `${tipoUbicacion}:${provinciaId}:${modificadorNormalizado}`;
  }

  // Último recurso (no recomendado)
  return `${tipoUbicacion}:fallback:${modificadorNormalizado || Date.now()}`;
}

function computePrioridadInicial(tipoUbicacion) {
  switch (tipoUbicacion) {
    case 'provincia':    return 1;
    case 'departamento': return 2;
    case 'municipio':    return 2;
    case 'localidad':    return 3;
    case 'localidad_censal': return 4;
    default:             return 5;
  }
}

function getProvinciaId(provincia) {
  if (!provincia) return null;
  return provincia.id || null;
}

function getDepartamentoId(departamento) {
  if (!departamento) return null;
  return departamento.id || null;
}

// ============================================================================
// Parseo de CLI
// ============================================================================

function parseArgs(argv) {
  const options = {
    dryRun: true,
    writeSql: false,
    output: null,
    max: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--write-sql') {
      options.writeSql = true;
      options.dryRun = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
      options.writeSql = false;
    } else if (arg === '--output') {
      options.output = argv[i + 1];
      i++;
    } else if (arg === '--max') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val > 0) {
        options.max = val;
        i++;
      }
    }
  }

  return options;
}

function showHelp() {
  console.log(`Uso: node scripts/geo/sync-geo-keywords-ar.js [opciones]

Sincroniza el catálogo geográfico argentino desde Georef API.

Opciones:
  --dry-run           (default) Solo muestra qué se haría, no escribe nada
  --write-sql         Escribe salida como archivo SQL revisable
  --output PATH       Directorio de salida (default: ./exports/geo/)
  --max N             Máximo de registros por endpoint (default: sin límite)
  --help, -h          Muestra esta ayuda

Ejemplos:
  npm run geo:sync:dry -- --write-sql --max 10
  node scripts/geo/sync-geo-keywords-ar.js --dry-run

ADVERTENCIA:
  - NO ejecutar contra base de datos (flag no implementado aún).
  - Revisar la salida antes de cualquier ingesta.
  - La población NO viene de Georef — queda NULL.`);
}

// ============================================================================
// Generación de salida SQL
// ============================================================================

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "\\'").replace(/\\/g, '\\\\')}'`;
}

function generateSqlInsert(rows) {
  const columns = [
    'geo_key',
    'provincia_id', 'provincia_nombre',
    'departamento_id', 'departamento_nombre',
    'municipio_id', 'municipio_nombre',
    'localidad_id', 'localidad_nombre',
    'localidad_censal_id', 'localidad_censal_nombre',
    'modificador_busqueda', 'modificador_normalizado',
    'tipo_ubicacion',
    'poblacion', 'poblacion_anio', 'poblacion_fuente', 'poblacion_fuente_url',
    'centroide_lat', 'centroide_lon',
    'prioridad_busqueda', 'activa',
    'fuente_geo', 'fuente_poblacion',
    'last_geo_sync_at', 'last_poblacion_sync_at',
  ];

  const values = rows.map(row => {
    return `(${columns.map(col => escapeSql(row[col])).join(', ')})`;
  });

  return [
    'USE iunaorg_dyd;',
    '',
    `-- Generado por sync-geo-keywords-ar.js el ${new Date().toISOString()}`,
    '-- Fuente: Georef API (https://apis.datos.gob.ar/georef/api/)',
    `-- Total registros: ${rows.length}`,
    '',
    'INSERT IGNORE INTO la_cat_geo_keywords_ar',
    `  (${columns.join(', ')})`,
    'VALUES',
    values.join(',\n'),
    ';',
    '',
  ].join('\n');
}

function generateCsvOutput(rows) {
  const headers = [
    'geo_key',
    'provincia_id', 'provincia_nombre', 'modificador_busqueda',
    'modificador_normalizado', 'tipo_ubicacion', 'prioridad_busqueda',
  ];

  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

// ============================================================================
// Simulación de datos Georef (modo dry-run / sin API)
//
// Cuando se implemente la conexión real a Georef API, esta sección
// se reemplazará por llamadas HTTP a los endpoints definidos arriba.
// En esta etapa, simulamos la estructura de datos esperada.
// ============================================================================

function simulateGeorefProvincias(max) {
  const provincias = [
    { id: '02', nombre: 'Ciudad Autónoma de Buenos Aires', centroide: { lat: -34.6144, lon: -58.4458 } },
    { id: '06', nombre: 'Buenos Aires',                     centroide: { lat: -36.5000, lon: -60.0000 } },
    { id: '10', nombre: 'Catamarca',                        centroide: { lat: -28.0000, lon: -66.0000 } },
    { id: '14', nombre: 'Córdoba',                          centroide: { lat: -32.0000, lon: -64.0000 } },
    { id: '18', nombre: 'Corrientes',                       centroide: { lat: -29.0000, lon: -58.0000 } },
    { id: '22', nombre: 'Chaco',                            centroide: { lat: -27.0000, lon: -60.5000 } },
    { id: '26', nombre: 'Chubut',                           centroide: { lat: -44.0000, lon: -68.0000 } },
    { id: '30', nombre: 'Entre Ríos',                       centroide: { lat: -32.0000, lon: -59.5000 } },
    { id: '34', nombre: 'Formosa',                          centroide: { lat: -25.0000, lon: -60.0000 } },
    { id: '38', nombre: 'Jujuy',                            centroide: { lat: -23.0000, lon: -66.0000 } },
    { id: '42', nombre: 'La Pampa',                         centroide: { lat: -37.0000, lon: -64.0000 } },
    { id: '46', nombre: 'La Rioja',                         centroide: { lat: -29.5000, lon: -67.5000 } },
    { id: '50', nombre: 'Mendoza',                          centroide: { lat: -35.5000, lon: -68.5000 } },
    { id: '54', nombre: 'Misiones',                         centroide: { lat: -27.0000, lon: -54.5000 } },
    { id: '58', nombre: 'Neuquén',                          centroide: { lat: -39.0000, lon: -70.0000 } },
    { id: '62', nombre: 'Río Negro',                        centroide: { lat: -40.0000, lon: -67.0000 } },
    { id: '66', nombre: 'Salta',                            centroide: { lat: -25.0000, lon: -64.5000 } },
    { id: '70', nombre: 'San Juan',                         centroide: { lat: -31.0000, lon: -69.0000 } },
    { id: '74', nombre: 'San Luis',                         centroide: { lat: -33.5000, lon: -66.0000 } },
    { id: '78', nombre: 'Santa Cruz',                       centroide: { lat: -49.0000, lon: -70.0000 } },
    { id: '82', nombre: 'Santa Fe',                         centroide: { lat: -30.5000, lon: -61.0000 } },
    { id: '86', nombre: 'Santiago del Estero',              centroide: { lat: -28.0000, lon: -63.5000 } },
    { id: '90', nombre: 'Tucumán',                          centroide: { lat: -27.0000, lon: -65.5000 } },
    { id: '94', nombre: 'Tierra del Fuego, Antártida e Islas del Atlántico Sur', centroide: { lat: -54.0000, lon: -67.0000 } },
  ];

  return max ? provincias.slice(0, max) : provincias;
}

function transformProvincia(p) {
  const tipoUbicacion = 'provincia';
  const modNormalizado = normalizeForSearch(p.nombre);

  return {
    geo_key: computeGeoKey(tipoUbicacion, p.id, modNormalizado, p.id),
    provincia_id: p.id,
    provincia_nombre: p.nombre,
    departamento_id: null,
    departamento_nombre: null,
    municipio_id: null,
    municipio_nombre: null,
    localidad_id: null,
    localidad_nombre: null,
    localidad_censal_id: null,
    localidad_censal_nombre: null,
    modificador_busqueda: computeModificadorBusqueda(p.nombre),
    modificador_normalizado: normalizeForSearch(p.nombre),
    tipo_ubicacion: 'provincia',
    poblacion: null,
    poblacion_anio: null,
    poblacion_fuente: null,
    poblacion_fuente_url: null,
    centroide_lat: p.centroide ? p.centroide.lat : null,
    centroide_lon: p.centroide ? p.centroide.lon : null,
    prioridad_busqueda: computePrioridadInicial('provincia'),
    activa: 1,
    fuente_geo: 'Georef API',
    fuente_poblacion: null,
    last_geo_sync_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    last_poblacion_sync_at: null,
  };
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

  console.log('=== sync-geo-keywords-ar.js ===');
  console.log(`Modo: ${options.dryRun ? 'DRY-RUN' : options.writeSql ? 'WRITE-SQL' : 'NORMAL'}`);
  console.log(`Máx por endpoint: ${options.max || 'sin límite'}`);
  console.log('');

  const allRows = [];

  for (const endpoint of ENDPOINTS) {
    let data = [];

    if (options.dryRun) {
      // En dry-run: simular datos de ejemplo sin consumir API
      if (endpoint.name === 'provincias') {
        data = simulateGeorefProvincias(options.max);
      } else {
        console.log(`  [DRY-RUN] ${endpoint.name}: datos simulados — se omiten (solo provincias en simulación)`);
        continue;
      }
    } else {
      // TODO: Implementar fetch real a Georef API
      // const url = `${GEOREF_BASE_URL}${endpoint.path}?max=${options.max || 500}`;
      // const response = await fetch(url);
      // const json = await response.json();
      // data = json[endpoint.name];
      console.log(`  [TODO] ${endpoint.name}: fetch a ${GEOREF_BASE_URL}${endpoint.path} no implementado aún`);
      continue;
    }

    for (const item of data) {
      allRows.push(transformProvincia(item));
    }

    console.log(`  ${endpoint.name}: ${data.length} registros`);
  }

  console.log('');
  console.log(`Total registros procesados: ${allRows.length}`);

  if (allRows.length === 0) {
    console.log('Sin datos para procesar.');
    return;
  }

  if (options.writeSql) {
    const outputDir = options.output || path.join(__dirname, '..', '..', 'exports', 'geo');
    fs.mkdirSync(outputDir, { recursive: true });

    const sqlPath = path.join(outputDir, 'sync-geo-keywords-ar.sql');
    fs.writeFileSync(sqlPath, generateSqlInsert(allRows), 'utf-8');
    console.log(`SQL generado: ${sqlPath}`);

    const csvPath = path.join(outputDir, 'sync-geo-keywords-ar.csv');
    fs.writeFileSync(csvPath, generateCsvOutput(allRows), 'utf-8');
    console.log(`CSV generado: ${csvPath}`);
  }

  // Resumen por tipo de ubicación
  const byType = {};
  for (const row of allRows) {
    byType[row.tipo_ubicacion] = (byType[row.tipo_ubicacion] || 0) + 1;
  }
  console.log('');
  console.log('Distribución por tipo de ubicación:');
  for (const [tipo, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tipo}: ${count}`);
  }

  console.log('');
  console.log('=== Completado ===');
  console.log('ADVERTENCIA: población = NULL en todos los registros.');
  console.log('La población debe importarse desde INDEC con scripts/geo/import-indec-poblacion.js.');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
