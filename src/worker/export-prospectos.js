#!/usr/bin/env node

/**
 * export-prospectos.js — Exportación de prospectos procesados
 *
 * CONTRATO:
 *   Lee prospectos procesados (normalizados, deduplicados, scoreados)
 *   por stdin o --input, y exporta en formato CSV o JSON.
 *
 * FORMATOS DE SALIDA:
 *   --format csv   CSV con columnas canónicas, listo para Dolibarr/CRM.
 *   --format json  JSON array con estructura canónica.
 *   --format ndjson NDJSON (una línea JSON por prospecto).
 *
 * COLUMNAS CANÓNICAS DEL CSV:
 *   prospecto_id, keyword, nom, url_landing, email, telefono, whatsapp,
 *   score, tier, es_duplicado, duplicado_de, normalizado, categoria_origen
 *
 * REGLAS:
 *   - No modifica datos de entrada.
 *   - Escapa correctamente comillas y comas en CSV.
 *   - Preserva orden de entrada.
 *   - Filtrable por --min-score y --exclude-duplicados.
 *
 * USO:
 *   node export-prospectos.js --help
 *   node export-prospectos.js --input scoreados.json --format csv
 *   node export-prospectos.js --input scoreados.json --format json --min-score 5 --exclude-duplicados
 *
 * SIN DEPENDENCIAS EXTERNAS: solo Node.js estándar.
 * SIN EFECTOS DESTRUCTIVOS: no modifica archivos ni DB.
 */

const fs = require('fs');
const path = require('path');

// ─── Help ──────────────────────────────────────────────────────────

function showHelp() {
  console.log(`export-prospectos.js — Exporta prospectos procesados

Uso:
  node export-prospectos.js [opciones]

Opciones:
  --input PATH            Archivo JSON de entrada.
                          Si no se especifica, lee de stdin.
  --output PATH           Archivo de salida. Si no se especifica, stdout.
  --format csv|json|ndjson  Formato de salida (default: csv).
  --min-score N           Filtrar prospectos con score >= N (0-10).
  --exclude-duplicados    Excluir prospectos marcados como duplicados.
  --limit N               Máximo de prospectos a exportar.
  --help, -h              Esta ayuda.

Formatos:
  csv     Columnas canónicas separadas por coma, con header.
          Listo para importar en Dolibarr/CRM/Google Sheets.
  json    Array JSON con formato canónico.
  ndjson  Una línea JSON por prospecto (Newline Delimited JSON).

Ejemplos:
  # Exportar CSV de prospectos con score >= 5, sin duplicados
  node export-prospectos.js --input scoreados.json --format csv --min-score 5 --exclude-duplicados

  # Exportar JSON a archivo
  node export-prospectos.js --input scoreados.json --format json --output ./lote-export.json

  # Pipeline completo (simulación)
  # node normalize-prospectos.js < raw.json | node dedupe-prospectos.js | node score-prospectos.js | node export-prospectos.js --format csv`);
}

// ─── Constantes ────────────────────────────────────────────────────

const CSV_HEADERS = [
  'prospecto_id',
  'keyword',
  'nom',
  'url_landing',
  'email',
  'telefono',
  'whatsapp',
  'score',
  'tier',
  'es_duplicado',
  'duplicado_de',
  'duplicado_por',
  'normalizado',
  'categoria_origen',
];

// ─── CSV ───────────────────────────────────────────────────────────

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function prospectoToCsvRow(prospecto) {
  return [
    prospecto.prospecto_id,
    prospecto.keyword,
    prospecto.nom,
    prospecto.url_landing,
    prospecto.email,
    prospecto.telefono,
    prospecto.whatsapp,
    prospecto._score,
    prospecto._score_tier,
    prospecto._es_duplicado ? 'si' : 'no',
    prospecto._duplicado_de || '',
    prospecto._duplicado_por || '',
    prospecto._normalizado ? 'si' : 'no',
    (prospecto._score_detalle || {}).relevancia_origen || '',
  ].map(escapeCsv);
}

function generateCsv(prospectos) {
  const lines = [CSV_HEADERS.join(',')];
  for (const p of prospectos) {
    lines.push(prospectoToCsvRow(p).join(','));
  }
  return lines.join('\n');
}

// ─── JSON ──────────────────────────────────────────────────────────

function generateJson(prospectos) {
  const output = {
    metadata: {
      exportado_at: new Date().toISOString(),
      total: prospectos.length,
      formato: 'canonico',
    },
    prospectos: prospectos.map(p => ({
      prospecto_id: p.prospecto_id,
      keyword: p.keyword,
      nom: p.nom,
      url_landing: p.url_landing,
      email: p.email,
      telefono: p.telefono,
      whatsapp: p.whatsapp,
      score: p._score,
      tier: p._score_tier,
      es_duplicado: p._es_duplicado || false,
      duplicado_de: p._duplicado_de || null,
      duplicado_por: p._duplicado_por || null,
    })),
  };
  return JSON.stringify(output, null, 2);
}

// ─── NDJSON ────────────────────────────────────────────────────────

function generateNdjson(prospectos) {
  return prospectos.map(p => JSON.stringify({
    prospecto_id: p.prospecto_id,
    keyword: p.keyword,
    nom: p.nom,
    url_landing: p.url_landing,
    email: p.email,
    telefono: p.telefono,
    whatsapp: p.whatsapp,
    score: p._score,
    tier: p._score_tier,
    es_duplicado: p._es_duplicado || false,
  })).join('\n') + '\n';
}

// ─── Filtrado ──────────────────────────────────────────────────────

function filterProspectos(prospectos, opts) {
  let result = [...prospectos];

  if (opts.excludeDuplicados) {
    result = result.filter(p => !p._es_duplicado);
  }

  if (opts.minScore > 0) {
    result = result.filter(p => (p._score || 0) >= opts.minScore);
  }

  if (opts.limit > 0 && result.length > opts.limit) {
    result = result.slice(0, opts.limit);
  }

  return result;
}

// ─── Entry point ──────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = {
    input: null,
    output: null,
    format: 'csv',
    minScore: 0,
    excludeDuplicados: false,
    limit: 0,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      opts.help = true;
    } else if (a === '--input') {
      opts.input = argv[++i] || null;
    } else if (a === '--output') {
      opts.output = argv[++i] || null;
    } else if (a === '--format') {
      const f = (argv[++i] || '').toLowerCase();
      if (['csv', 'json', 'ndjson'].includes(f)) {
        opts.format = f;
      }
    } else if (a === '--min-score') {
      const val = parseFloat(argv[++i]);
      if (!isNaN(val) && val >= 0 && val <= 10) {
        opts.minScore = val;
      }
    } else if (a === '--exclude-duplicados') {
      opts.excludeDuplicados = true;
    } else if (a === '--limit') {
      const val = parseInt(argv[++i], 10);
      if (!isNaN(val) && val > 0) {
        opts.limit = val;
      }
    }
  }

  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    showHelp();
    return;
  }

  // Leer entrada
  let raw;
  if (opts.input) {
    raw = fs.readFileSync(path.resolve(opts.input), 'utf-8');
  } else {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks).toString('utf-8');
  }

  if (!raw.trim()) {
    console.error('⚠️  Entrada vacía. Usá --help para ver el formato esperado.');
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Error parseando JSON: ${e.message}`);
    process.exit(1);
  }

  const prospectos = Array.isArray(data) ? data : (data.prospectos || []);

  if (prospectos.length === 0) {
    console.error('⚠️  Sin prospectos para exportar.');
    process.exit(0);
  }

  // Filtrar
  const filtered = filterProspectos(prospectos, opts);

  if (filtered.length === 0) {
    console.error('⚠️  Ningún prospecto pasó los filtros.');
    process.exit(0);
  }

  // Generar salida
  let output;
  const generators = {
    csv: generateCsv,
    json: generateJson,
    ndjson: generateNdjson,
  };
  output = generators[opts.format](filtered);

  // Escribir
  if (opts.output) {
    fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.output), output, 'utf-8');
    console.error(`✅ Exportado → ${opts.output}`);
  } else {
    process.stdout.write(output);
  }

  const desc = [];
  if (opts.excludeDuplicados) desc.push('sin duplicados');
  if (opts.minScore > 0) desc.push(`score ≥ ${opts.minScore}`);
  if (opts.limit > 0) desc.push(`límite ${opts.limit}`);
  const descStr = desc.length > 0 ? ` (${desc.join(', ')})` : '';

  console.error(`📤 ${filtered.length}/${prospectos.length} prospectos exportados en ${opts.format}${descStr}`);
}

main().catch((err) => {
  console.error(`❌ export-prospectos: ${err.message}`);
  process.exit(1);
});
