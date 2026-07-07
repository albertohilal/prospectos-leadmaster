#!/usr/bin/env node

/**
 * score-prospectos.js — Scoring comercial de prospectos LeadMaster
 *
 * CONTRATO:
 *   Lee prospectos normalizados + deduplicados (JSON por stdin o --input),
 *   asigna un score de 1 a 10 basado en completitud y señales,
 *   emite prospectos con _score y _score_detalle.
 *
 * DIMENSIONES DE SCORING (pesos):
 *   1. Completitud de datos (40%): cuántos campos no nulos.
 *   2. Señal de seguros (30%): presencia de keywords del sector en nom/url.
 *   3. Contactabilidad (20%): tiene email y/o teléfono.
 *   4. Relevancia del origen (10%): keyword origen orientada a seguros.
 *
 * ESCALA:
 *   10 = Prospecto ideal: datos completos, señal fuerte, contactable.
 *    1 = Datos mínimos, sin señal de sector, no contactable.
 *    0 = No procesable (sin campos para evaluar).
 *
 * PUNTAJES POR DIMENSIÓN:
 *
 *   Completitud (máx 4.0):
 *     keyword +1, nom +1, url +1, email o tel +1
 *
 *   Señal seguros (máx 3.0):
 *     nom contiene keyword seguros: +1.5
 *     url/dominio contiene keyword seguros: +1.0
 *     keyword origen contiene keyword seguros: +0.5
 *
 *   Contactabilidad (máx 2.0):
 *     email presente: +1.25
 *     teléfono presente: +1.0
 *     whatsapp presente: +0.75
 *     (cap en 2.0)
 *
 *   Relevancia origen (máx 1.0):
 *     keyword origen de categoría A/B (directa seguros): +1.0
 *     keyword origen de categoría C/D (ramos/compra): +0.5
 *
 * USO:
 *   node score-prospectos.js --help
 *   node score-prospectos.js --input procesados.json
 *   cat procesados.json | node score-prospectos.js
 *
 * SIN DEPENDENCIAS EXTERNAS: solo Node.js estándar.
 * SIN EFECTOS DESTRUCTIVOS: no modifica archivos ni DB.
 */

const fs = require('fs');
const path = require('path');

// ─── Help ──────────────────────────────────────────────────────────

function showHelp() {
  console.log(`score-prospectos.js — Asigna score comercial a prospectos

Uso:
  node score-prospectos.js [opciones]

Opciones:
  --input PATH     Archivo JSON de entrada.
                   Si no se especifica, lee de stdin.
  --output PATH    Archivo JSON de salida. Si no se especifica, stdout.
  --report PATH    Archivo de reporte (Markdown) con distribución de scores.
  --min-score N    Filtra prospectos con score >= N (default: 0, sin filtro).
  --help, -h       Esta ayuda.

Formato de entrada (prospecto ya normalizado):
  {
    "prospecto_id": 123,
    "keyword": "broker de seguros caba",
    "nom": "Broker De Seguros Ejemplo",
    "url_landing": "https://ejemplo.com",
    "email": "contacto@ejemplo.com",
    "telefono": "541155551234",
    "whatsapp": "5491155551234"
  }

Ejemplo:
  node score-prospectos.js --input ./procesados.json --min-score 5 --report ./scores.md`);
}

// ─── Patrones de señal de seguros ──────────────────────────────────

const SEGUROS_STRONG_PATTERNS = [
  /\bseguros?\b/i,
  /\bbrokers?\b/i,
  /productor\s+(?:asesor\s+)?(?:de\s+)?seguros/i,
  /sociedad\s+de\s+productores/i,
  /organizador\s+(?:de\s+)?(?:productores\s+)?(?:de\s+)?seguros/i,
  /aseguradora\b/i,
  /reaseguro/i,
  /reasegurador/i,
  /\bART\b/i,
  /\bcauci[oó]n\b/i,
  /\bp[oó]liza/i,
  /\binsurtech\b/i,
  /\bcotizador\s+(?:de\s+)?seguros/i,
];

const SEGUROS_WEAK_PATTERNS = [
  /\bseguro\b/i,
  /cobertura/i,
  /siniestro/i,
  /riesgo/i,
  /flota\b/i,
  /responsabilidad\s+civil/i,
];

const KEYWORD_CAT_A_PATTERNS = [
  /broker/i, /productor/i, /asesor/i, /organizador/i,
  /agencia\s+de\s+seguros/i, /consultor[ií]a\s+de\s+seguros/i,
];

const KEYWORD_CAT_B_PATTERNS = [
  /seguros?\s+para\s+empresas/i, /seguros?\s+empresarial/i,
  /seguros?\s+corporativ/i, /seguros?\s+para\s+pymes/i,
  /seguros?\s+para\s+comercios/i, /seguros?\s+para\s+industri/i,
];

const KEYWORD_CAT_CD_PATTERNS = [
  /seguro\s+de\s+cauci[oó]n/i, /seguro\s+t[eé]cnico/i,
  /\bART\b/i, /seguro\s+(?:de\s+)?responsabilidad/i,
  /cotizar/i, /cotizaci[oó]n/i, /comparativa/i,
  /presupuesto/i, /cobertura/i,
];

// ─── Funciones de scoring ──────────────────────────────────────────

function matchAny(text, patterns) {
  if (!text) return false;
  for (const p of patterns) {
    if (p.test(text)) return true;
  }
  return false;
}

/**
 * Dimensión 1: Completitud de datos (0–4 puntos)
 */
function scoreCompletitud(prospecto) {
  let points = 0;
  const filled = [];

  if (prospecto.keyword) { points += 1; filled.push('keyword'); }
  if (prospecto.nom) { points += 1; filled.push('nom'); }
  if (prospecto.url_landing) { points += 1; filled.push('url'); }
  if (prospecto.email || prospecto.telefono) { points += 1; filled.push('contacto'); }

  return {
    points: Math.min(points, 4),
    max: 4,
    filled,
  };
}

/**
 * Dimensión 2: Señal de seguros (0–3 puntos)
 */
function scoreSenalSeguros(prospecto) {
  let points = 0;
  const signals = [];

  // nom contiene keyword de seguros
  if (matchAny(prospecto.nom, SEGUROS_STRONG_PATTERNS)) {
    points += 1.5;
    signals.push('nom_seguros_fuerte');
  } else if (matchAny(prospecto.nom, SEGUROS_WEAK_PATTERNS)) {
    points += 0.5;
    signals.push('nom_seguros_debil');
  }

  // url/dominio contiene keyword de seguros
  if (matchAny(prospecto.url_landing, SEGUROS_STRONG_PATTERNS)) {
    points += 1.0;
    signals.push('url_seguros');
  }

  // keyword origen contiene señal de seguros
  if (matchAny(prospecto.keyword, SEGUROS_STRONG_PATTERNS)) {
    points += 0.5;
    signals.push('keyword_seguros');
  }

  return {
    points: Math.min(points, 3),
    max: 3,
    signals,
  };
}

/**
 * Dimensión 3: Contactabilidad (0–2 puntos, cap)
 */
function scoreContactabilidad(prospecto) {
  let points = 0;
  const channels = [];

  if (prospecto.email) {
    points += 1.25;
    channels.push('email');
  }
  if (prospecto.telefono) {
    points += 1.0;
    channels.push('telefono');
  }
  if (prospecto.whatsapp) {
    points += 0.75;
    channels.push('whatsapp');
  }

  return {
    points: Math.min(points, 2),
    max: 2,
    channels,
  };
}

/**
 * Dimensión 4: Relevancia del origen (0–1 puntos)
 */
function scoreRelevanciaOrigen(prospecto) {
  let points = 0;
  let category = 'sin_categoria';

  if (matchAny(prospecto.keyword, KEYWORD_CAT_A_PATTERNS)) {
    points = 1.0;
    category = 'A_directa';
  } else if (matchAny(prospecto.keyword, KEYWORD_CAT_B_PATTERNS)) {
    points = 0.75;
    category = 'B_empresarial';
  } else if (matchAny(prospecto.keyword, KEYWORD_CAT_CD_PATTERNS)) {
    points = 0.5;
    category = 'CD_ramos_compra';
  }

  return {
    points,
    max: 1,
    category,
  };
}

/**
 * Bonus adicionales (0–1 punto extra, cap total en 10)
 */
function scoreBonus(prospecto) {
  let points = 0;
  const bonuses = [];

  // Datos completos: keyword + nom + url + email + tel
  if (prospecto.keyword && prospecto.nom && prospecto.url_landing &&
      prospecto.email && prospecto.telefono) {
    points += 0.5;
    bonuses.push('datos_completos');
  }

  // Email institucional (no genérico)
  if (prospecto.email) {
    const domain = prospecto.email.split('@')[1];
    const genericDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com',
      'live.com', 'msn.com', 'icloud.com', 'protonmail.com'];
    if (domain && !genericDomains.includes(domain.toLowerCase())) {
      points += 0.5;
      bonuses.push('email_institucional');
    }
  }

  return {
    points: Math.min(points, 1),
    max: 1,
    bonuses,
  };
}

// ─── Score compuesto ───────────────────────────────────────────────

function scoreProspecto(prospecto) {
  const completitud = scoreCompletitud(prospecto);
  const senal = scoreSenalSeguros(prospecto);
  const contacto = scoreContactabilidad(prospecto);
  const relevancia = scoreRelevanciaOrigen(prospecto);
  const bonus = scoreBonus(prospecto);

  const raw = completitud.points + senal.points + contacto.points + relevancia.points + bonus.points;
  const score = Math.min(Math.round(raw * 10) / 10, 10);

  // Clasificación cualitativa
  let tier;
  if (score >= 8) tier = 'A — Excelente';
  else if (score >= 6) tier = 'B — Bueno';
  else if (score >= 4) tier = 'C — Regular';
  else if (score >= 2) tier = 'D — Bajo';
  else tier = 'E — Mínimo';

  return {
    _score: score,
    _score_tier: tier,
    _score_detalle: {
      completitud: `${completitud.points}/${completitud.max} [${completitud.filled.join(', ')}]`,
      senal_seguros: `${senal.points}/${senal.max} [${senal.signals.join(', ') || 'ninguna'}]`,
      contactabilidad: `${contacto.points}/${contacto.max} [${contacto.channels.join(', ') || 'ninguno'}]`,
      relevancia_origen: `${relevancia.points}/${relevancia.max} [${relevancia.category}]`,
      bonus: `${bonus.points}/${bonus.max} [${bonus.bonuses.join(', ') || 'ninguno'}]`,
      raw,
    },
  };
}

// ─── Generación de reporte Markdown ────────────────────────────────

function generateMarkdownReport(prospectos) {
  const lines = [];
  const total = prospectos.length;

  // Distribución por tier
  const tiers = { 'A — Excelente': 0, 'B — Bueno': 0, 'C — Regular': 0, 'D — Bajo': 0, 'E — Mínimo': 0 };
  const scores = [];

  for (const p of prospectos) {
    const s = p._score || 0;
    const t = p._score_tier || 'E — Mínimo';
    tiers[t] = (tiers[t] || 0) + 1;
    scores.push(s);
  }

  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;

  lines.push('# Reporte de scoring — Prospectos LeadMaster');
  lines.push('');
  lines.push(`**Fecha:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Total evaluados:** ${total}`);
  lines.push(`**Score promedio:** ${avg}/10`);
  lines.push(`**Score máximo:** ${max}`);
  lines.push(`**Score mínimo:** ${min}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Distribución por tier');
  lines.push('');
  lines.push('| Tier | Cantidad | % |');
  lines.push('|------|:---:|:---:|');
  for (const [tier, count] of Object.entries(tiers)) {
    lines.push(`| ${tier} | ${count} | ${total > 0 ? Math.round(count / total * 100) : 0}% |`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Top 10 prospectos');
  lines.push('');

  const sorted = [...prospectos].sort((a, b) => (b._score || 0) - (a._score || 0));
  const top10 = sorted.slice(0, 10);

  lines.push('| # | prospecto_id | nom | score | tier | email | tel |');
  lines.push('|---|:---:|------|:---:|------|:---:|:---:|');
  top10.forEach((p, i) => {
    lines.push(`| ${i + 1} | ${p.prospecto_id || '-'} | ${(p.nom || '-').substring(0, 40)} | ${p._score || 0} | ${(p._score_tier || '').charAt(0)} | ${p.email ? '✓' : '-'} | ${p.telefono ? '✓' : '-'} |`);
  });
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Bottom 10 prospectos');
  lines.push('');

  const bottom10 = sorted.reverse().slice(0, 10);
  lines.push('| # | prospecto_id | nom | score | tier | email | tel |');
  lines.push('|---|:---:|------|:---:|------|:---:|:---:|');
  bottom10.forEach((p, i) => {
    lines.push(`| ${i + 1} | ${p.prospecto_id || '-'} | ${(p.nom || '-').substring(0, 40)} | ${p._score || 0} | ${(p._score_tier || '').charAt(0)} | ${p.email ? '✓' : '-'} | ${p.telefono ? '✓' : '-'} |`);
  });
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Métricas de scoring');
  lines.push('');
  lines.push('| Dimensión | Peso | Descripción |');
  lines.push('|-----------|:---:|-------------|');
  lines.push('| Completitud | 0–4 | Campos no nulos: keyword, nom, url, contacto |');
  lines.push('| Señal seguros | 0–3 | Keywords del sector en nom, url, keyword origen |');
  lines.push('| Contactabilidad | 0–2 | Canales de contacto disponibles |');
  lines.push('| Relevancia origen | 0–1 | Categoría de la keyword de búsqueda |');
  lines.push('| Bonus | 0–1 | Datos completos + email institucional |');
  lines.push('| **Total** | **0–10** | Cap en 10 |');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*Reporte generado con score-prospectos.js — sin modificar base de datos.*');

  return lines.join('\n');
}

// ─── Entry point ──────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { input: null, output: null, report: null, minScore: 0, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      opts.help = true;
    } else if (a === '--input') {
      opts.input = argv[++i] || null;
    } else if (a === '--output') {
      opts.output = argv[++i] || null;
    } else if (a === '--report') {
      opts.report = argv[++i] || null;
    } else if (a === '--min-score') {
      const val = parseFloat(argv[++i]);
      if (!isNaN(val) && val >= 0 && val <= 10) {
        opts.minScore = val;
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

  // Soporta { prospectos: [...] } o array directo
  const prospectos = Array.isArray(data) ? data : (data.prospectos || []);

  if (prospectos.length === 0) {
    console.error('⚠️  Sin prospectos para evaluar.');
    process.exit(0);
  }

  // Scorificar
  const scored = prospectos.map(p => ({ ...p, ...scoreProspecto(p) }));

  // Ordenar por score descendente
  scored.sort((a, b) => (b._score || 0) - (a._score || 0));

  // Filtrar por score mínimo
  const filtered = opts.minScore > 0
    ? scored.filter(p => (p._score || 0) >= opts.minScore)
    : scored;

  // Reporte Markdown
  if (opts.report) {
    const md = generateMarkdownReport(filtered);
    fs.mkdirSync(path.dirname(path.resolve(opts.report)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.report), md, 'utf-8');
    console.error(`📝 Reporte Markdown → ${opts.report}`);
  }

  // Salida JSON
  const output = {
    stats: {
      total_evaluados: prospectos.length,
      filtrados_min_score: filtered.length,
      score_promedio: (filtered.reduce((s, p) => s + (p._score || 0), 0) / (filtered.length || 1)).toFixed(1),
    },
    prospectos: filtered,
  };

  const json = JSON.stringify(output, null, 2);
  if (opts.output) {
    fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.output), json, 'utf-8');
    console.error(`✅ Scoring completado → ${opts.output}`);
  } else {
    process.stdout.write(json + '\n');
  }

  console.error(`📊 ${filtered.length}/${prospectos.length} prospectos con score (min ${opts.minScore}) | promedio ${output.stats.score_promedio}/10`);
}

main().catch((err) => {
  console.error(`❌ score-prospectos: ${err.message}`);
  process.exit(1);
});
