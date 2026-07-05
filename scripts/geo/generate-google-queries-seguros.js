#!/usr/bin/env node

/**
 * generate-google-queries-seguros.js
 *
 * Genera queries de búsqueda para Google combinando:
 *   - keywords base de seguros (ll_keywords_leadmaster)
 *   - modificadores geográficos activos (la_cat_geo_keywords_ar)
 *
 * Por ahora usa arrays internos o un JSON de ejemplo.
 * No ejecuta búsquedas en Google.
 * Solo genera texto/CSV/JSON revisable.
 *
 * NO EJECUTAR búsquedas sin confirmación explícita.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// Keywords base de seguros (ejemplo — en producción se leerán de DB)
// ============================================================================

const KEYWORDS_BASE_SEGUROS = [
  // Bloque LM-003A-B: Brokers y productores generales (perfil A)
  { keyword: 'broker de seguros',              perfil: 'A', prioridad: 1 },
  { keyword: 'brokers de seguros',             perfil: 'A', prioridad: 1 },
  { keyword: 'productor asesor de seguros',    perfil: 'A', prioridad: 1 },
  { keyword: 'productores asesores de seguros',perfil: 'A', prioridad: 1 },
  { keyword: 'productor de seguros',           perfil: 'A', prioridad: 1 },
  { keyword: 'productores de seguros',         perfil: 'A', prioridad: 1 },
  { keyword: 'asesor de seguros',              perfil: 'A', prioridad: 1 },
  { keyword: 'asesores de seguros',            perfil: 'A', prioridad: 1 },
  { keyword: 'organizador de productores de seguros', perfil: 'A', prioridad: 1 },
  { keyword: 'agencia de seguros',             perfil: 'A', prioridad: 1 },
  { keyword: 'consultora de seguros',          perfil: 'A', prioridad: 1 },

  // Bloque LM-003A-B: Seguros para empresas / corporativos (perfil B)
  { keyword: 'seguros para empresas',              perfil: 'B', prioridad: 2 },
  { keyword: 'seguros empresariales',              perfil: 'B', prioridad: 2 },
  { keyword: 'seguros corporativos',               perfil: 'B', prioridad: 2 },
  { keyword: 'broker de seguros corporativos',     perfil: 'B', prioridad: 2 },
  { keyword: 'productor de seguros para empresas', perfil: 'B', prioridad: 2 },
  { keyword: 'seguros para pymes',                 perfil: 'B', prioridad: 2 },
  { keyword: 'seguros para comercios',             perfil: 'B', prioridad: 2 },
  { keyword: 'seguros para industrias',            perfil: 'B', prioridad: 2 },

  // Intención comercial (perfil D)
  { keyword: 'contratar broker de seguros',        perfil: 'D', prioridad: 2 },
  { keyword: 'cotizar seguros empresas',           perfil: 'D', prioridad: 2 },
  { keyword: 'cotizar seguro de caución',          perfil: 'D', prioridad: 2 },
  { keyword: 'presupuesto seguro empresa',         perfil: 'D', prioridad: 2 },
];

// ============================================================================
// Modificadores geográficos (ejemplo — en producción se leerán de DB)
// ============================================================================

const MODIFICADORES_GEO = [
  { geo_key: 'provincia:02',      modificador_busqueda: 'CABA',              tipo_ubicacion: 'provincia',    prioridad_busqueda: 1 },
  { geo_key: 'provincia:06',      modificador_busqueda: 'Buenos Aires',      tipo_ubicacion: 'provincia',    prioridad_busqueda: 1 },
  { geo_key: 'provincia:14',      modificador_busqueda: 'Cordoba',           tipo_ubicacion: 'provincia',    prioridad_busqueda: 1 },
  { geo_key: 'municipio:82:rosario', modificador_busqueda: 'Rosario',           tipo_ubicacion: 'municipio',    prioridad_busqueda: 1 },
  { geo_key: 'provincia:82',      modificador_busqueda: 'Santa Fe',          tipo_ubicacion: 'provincia',    prioridad_busqueda: 1 },
  { geo_key: 'provincia:50',      modificador_busqueda: 'Mendoza',           tipo_ubicacion: 'provincia',    prioridad_busqueda: 1 },
  { geo_key: 'provincia:58',      modificador_busqueda: 'Neuquen',           tipo_ubicacion: 'provincia',    prioridad_busqueda: 2 },
  { geo_key: 'provincia:90',      modificador_busqueda: 'Tucuman',           tipo_ubicacion: 'provincia',    prioridad_busqueda: 2 },
  { geo_key: 'provincia:30',      modificador_busqueda: 'Entre Rios',        tipo_ubicacion: 'provincia',    prioridad_busqueda: 2 },
  { geo_key: 'provincia:78',      modificador_busqueda: 'Santa Cruz',        tipo_ubicacion: 'provincia',    prioridad_busqueda: 2 },
];

// ============================================================================
// Parseo de CLI
// ============================================================================

function parseArgs(argv) {
  const options = {
    dryRun: true,
    output: null,
    format: 'csv',
    limit: null,
    geoFile: null,
    keywordsFile: null,
    prioridad: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--output') {
      options.output = argv[i + 1];
      i++;
    } else if (arg === '--format') {
      options.format = argv[i + 1];
      i++;
    } else if (arg === '--limit') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val > 0) {
        options.limit = val;
        i++;
      }
    } else if (arg === '--geo-file') {
      options.geoFile = argv[i + 1];
      i++;
    } else if (arg === '--keywords-file') {
      options.keywordsFile = argv[i + 1];
      i++;
    } else if (arg === '--prioridad') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val >= 1 && val <= 5) {
        options.prioridad = val;
        i++;
      }
    }
  }

  return options;
}

function showHelp() {
  console.log(`Uso: node scripts/geo/generate-google-queries-seguros.js [opciones]

Genera queries de búsqueda para Google combinando keywords base de seguros
con modificadores geográficos activos.

Opciones:
  --output PATH      Archivo de salida (default: ./exports/geo/queries-seguros.csv)
  --format csv|json  Formato de salida (default: csv)
  --limit N          Máximo de queries a generar
  --geo-file PATH    JSON con modificadores geográficos
  --keywords-file PATH  JSON con keywords base
  --prioridad N      Filtrar modificadores por prioridad (1-5)
  --help, -h         Muestra esta ayuda

Ejemplos:
  npm run geo:queries:seguros
  node scripts/geo/generate-google-queries-seguros.js --prioridad 1 --limit 50

ADVERTENCIA:
  - NO ejecuta búsquedas en Google.
  - Solo genera texto/CSV/JSON revisable.
  - La salida debe ser revisada antes de cualquier scraping.`);
}

// ============================================================================
// Generación de queries
// ============================================================================

function loadGeoModifiers(options) {
  if (options.geoFile) {
    const raw = fs.readFileSync(options.geoFile, 'utf-8');
    return JSON.parse(raw);
  }
  return MODIFICADORES_GEO;
}

function loadKeywords(options) {
  if (options.keywordsFile) {
    const raw = fs.readFileSync(options.keywordsFile, 'utf-8');
    return JSON.parse(raw);
  }
  return KEYWORDS_BASE_SEGUROS;
}

function generateQueries(keywords, geoModifiers, options) {
  const queries = [];

  let filteredGeo = geoModifiers;
  if (options.prioridad) {
    filteredGeo = geoModifiers.filter(g => g.prioridad_busqueda <= options.prioridad);
  }

  for (const kw of keywords) {
    for (const geo of filteredGeo) {
      const query = `${kw.keyword} ${geo.modificador_busqueda}`;

      queries.push({
        query,
        geo_key: geo.geo_key || null,
        keyword_base: kw.keyword,
        perfil_keyword: kw.perfil,
        prioridad_keyword: kw.prioridad,
        modificador_geografico: geo.modificador_busqueda,
        tipo_ubicacion: geo.tipo_ubicacion,
        prioridad_geografica: geo.prioridad_busqueda,
        prioridad_combinada: Math.round((kw.prioridad + geo.prioridad_busqueda) / 2),
        fuente: 'generado_automatico',
        generado_at: new Date().toISOString(),
      });

      if (options.limit && queries.length >= options.limit) {
        return queries;
      }
    }
  }

  return queries;
}

// ============================================================================
// Salida
// ============================================================================

function generateCsv(queries) {
  const headers = [
    'query', 'geo_key', 'keyword_base', 'perfil_keyword', 'prioridad_keyword',
    'modificador_geografico', 'tipo_ubicacion', 'prioridad_geografica',
    'prioridad_combinada', 'fuente',
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
  for (const q of queries) {
    lines.push(headers.map(h => escape(q[h])).join(','));
  }
  return lines.join('\n');
}

function generateJson(queries) {
  return JSON.stringify(queries, null, 2);
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  console.log('=== generate-google-queries-seguros.js ===');
  console.log('');

  const keywords = loadKeywords(options);
  const geoModifiers = loadGeoModifiers(options);

  console.log(`Keywords base cargadas: ${keywords.length}`);
  console.log(`Modificadores geográficos cargados: ${geoModifiers.length}`);
  if (options.prioridad) {
    console.log(`Filtro de prioridad geográfica: <= ${options.prioridad}`);
  }
  console.log('');

  const queries = generateQueries(keywords, geoModifiers, options);

  console.log(`Total queries generadas: ${queries.length}`);
  console.log('');

  // Mostrar ejemplos
  const ejemplos = queries.filter((_, i) => i < 5 || (i > 0 && i % Math.ceil(queries.length / 5) === 0));
  console.log('Ejemplos:');
  for (const q of ejemplos) {
    console.log(`  "${q.query}"  [kw:${q.prioridad_keyword} geo:${q.prioridad_geografica} comb:${q.prioridad_combinada}]`);
  }
  console.log('');

  // Estadísticas
  const byPerfil = {};
  const byTipoUbicacion = {};
  const byPrioridadComb = {};
  for (const q of queries) {
    byPerfil[q.perfil_keyword] = (byPerfil[q.perfil_keyword] || 0) + 1;
    byTipoUbicacion[q.tipo_ubicacion] = (byTipoUbicacion[q.tipo_ubicacion] || 0) + 1;
    byPrioridadComb[q.prioridad_combinada] = (byPrioridadComb[q.prioridad_combinada] || 0) + 1;
  }

  console.log('Por perfil de keyword:');
  for (const [p, c] of Object.entries(byPerfil).sort()) {
    console.log(`  Perfil ${p}: ${c}`);
  }

  console.log('');
  console.log('Por tipo de ubicación:');
  for (const [t, c] of Object.entries(byTipoUbicacion).sort()) {
    console.log(`  ${t}: ${c}`);
  }

  console.log('');
  console.log('Por prioridad combinada:');
  for (const [p, c] of Object.entries(byPrioridadComb).sort((a, b) => a[0] - b[0])) {
    const label = p <= 2 ? 'ALTA' : p <= 3 ? 'MEDIA' : 'BAJA';
    console.log(`  ${p} (${label}): ${c}`);
  }

  console.log('');

  // Escribir salida
  if (options.output || options.format) {
    const outputDir = path.join(__dirname, '..', '..', 'exports', 'geo');
    fs.mkdirSync(outputDir, { recursive: true });

    const ext = options.format === 'json' ? 'json' : 'csv';
    const outputPath = options.output || path.join(outputDir, `queries-seguros.${ext}`);
    const content = options.format === 'json' ? generateJson(queries) : generateCsv(queries);

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`Salida generada: ${outputPath}`);
    console.log('');
  }

  // Advertencias
  console.log('=== Completado ===');
  console.log('');
  console.log('ADVERTENCIAS:');
  console.log('  - NO se ejecutaron búsquedas en Google.');
  console.log('  - La salida debe ser revisada antes de cualquier scraping.');
  console.log('  - Las keywords y modificadores son datos de ejemplo.');
  console.log('  - En producción, se leerán de ll_keywords_leadmaster y la_cat_geo_keywords_ar.');
  console.log('  - La prioridad combinada no considera población (pendiente de INDEC).');

  // Devolver queries para posible uso programático
  return queries;
}

// Ejecutar
const result = main();

// Exportar para posible uso como módulo
module.exports = { generateQueries, KEYWORDS_BASE_SEGUROS, MODIFICADORES_GEO, result };
