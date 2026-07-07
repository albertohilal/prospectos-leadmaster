#!/usr/bin/env node

/**
 * normalize-prospectos.js — Normalización de prospectos LeadMaster
 *
 * CONTRATO:
 *   Lee prospectos (JSON array por stdin o archivo --input),
 *   aplica reglas de normalización sin modificar DB,
 *   emite JSON normalizado por stdout.
 *
 * REGLAS APLICADAS:
 *   1. Trim de whitespace en todos los campos string.
 *   2. keyword y nom: espacio único entre palabras, sin tabs/newlines.
 *   3. url_landing: minúsculas, sin fragment (#), sin query string,
 *      sin trailing slash salvo "/" raíz.
 *   4. email: minúsculas, trim.
 *   5. teléfono: solo dígitos, sin espacios ni guiones.
 *   6. whatsapp: mismo tratamiento que teléfono.
 *   7. nom: primera letra de cada palabra en mayúscula (title case).
 *   8. Campos nulos o vacíos se preservan como null.
 *
 * USO:
 *   node normalize-prospectos.js --help
 *   node normalize-prospectos.js --input datos.json
 *   cat datos.json | node normalize-prospectos.js
 *
 * SIN DEPENDENCIAS EXTERNAS: solo Node.js estándar.
 * SIN EFECTOS DESTRUCTIVOS: no modifica archivos ni DB.
 */

const fs = require('fs');
const path = require('path');

// ─── Help ──────────────────────────────────────────────────────────

function showHelp() {
  console.log(`normalize-prospectos.js — Normaliza campos de prospectos

Uso:
  node normalize-prospectos.js [opciones]

Opciones:
  --input PATH    Archivo JSON de entrada (array de prospectos).
                  Si no se especifica, lee de stdin.
  --output PATH   Archivo de salida. Si no se especifica, stdout.
  --help, -h      Esta ayuda.

Formato de entrada (cada prospecto):
  {
    "prospecto_id": 123,
    "keyword": "  Broker de Seguros CABA  ",
    "nom": null,
    "url_landing": "https://www.Ejemplo.com/landing?utm=test#seccion",
    "email_extraido": " Contacto@Ejemplo.COM ",
    "telefono_extraido": "+54 11 5555-1234",
    "whatsapp_extraido": "+54 9 11 5555-1234",
    "texto_extraido": null
  }

Ejemplo:
  node normalize-prospectos.js --input ./muestra.json --output ./normalizado.json
  echo '[{"keyword":"TEST"}]' | node normalize-prospectos.js`);
}

// ─── Reglas de normalización ───────────────────────────────────────

/**
 * Trim y colapsa whitespace múltiple en un solo espacio.
 */
function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, ' ');
}

/**
 * Normaliza una URL de landing:
 * - minúsculas
 * - sin fragment (#)
 * - sin query string (?)
 * - sin trailing slash salvo "/" raíz
 */
function normalizeLandingUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';
    parsed.search = '';
    let pathname = parsed.pathname.replace(/\/+$/, '');
    if (!pathname) pathname = '/';
    return `${parsed.origin.toLowerCase()}${pathname}`;
  } catch {
    // Si no es URL válida, intentar limpieza básica
    const withoutHash = trimmed.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    const cleaned = withoutQuery.trim();
    if (!cleaned || cleaned === '/') return '/';
    return cleaned.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Normaliza email: minúsculas, trim.
 */
function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

/**
 * Normaliza teléfono: solo dígitos.
 */
function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
}

/**
 * Title case simple: primera letra de cada palabra en mayúscula.
 * Respeta siglas ya en mayúsculas si tienen 2+ letras.
 */
function toTitleCase(value) {
  if (typeof value !== 'string') return null;
  const cleaned = normalizeText(value);
  if (!cleaned) return null;
  return cleaned.replace(/\b\w+/g, (word) => {
    // Si ya es todo mayúsculas y corto (sigla), se deja
    if (word === word.toUpperCase() && word.length <= 4) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

// ─── Procesamiento principal ──────────────────────────────────────

function normalizeProspecto(raw) {
  const result = {};

  // Preservar ID original
  if (raw.prospecto_id !== undefined) {
    result.prospecto_id = raw.prospecto_id;
  }
  if (raw.stg_id !== undefined) {
    result.stg_id = raw.stg_id;
  }
  if (raw.cliente_id !== undefined) {
    result.cliente_id = raw.cliente_id;
  }

  // keyword: trim + colapsar whitespace
  result.keyword = normalizeText(raw.keyword || raw.palabra_clave);

  // nom: trim + title case
  result.nom = toTitleCase(raw.nom || raw.nombre);

  // url_landing: normalización canónica
  result.url_landing = normalizeLandingUrl(raw.url_landing);

  // email: minúsculas + trim
  result.email = normalizeEmail(raw.email_extraido);

  // teléfono: solo dígitos
  result.telefono = normalizePhone(raw.telefono_extraido);

  // whatsapp: solo dígitos
  result.whatsapp = normalizePhone(raw.whatsapp_extraido);

  // texto_extraido: trim
  result.texto = normalizeText(raw.texto_extraido);

  // Metadata de normalización
  result._normalizado = true;
  result._normalizado_at = new Date().toISOString();

  return result;
}

// ─── Entry point ──────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { input: null, output: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      opts.help = true;
    } else if (a === '--input') {
      opts.input = argv[++i] || null;
    } else if (a === '--output') {
      opts.output = argv[++i] || null;
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
    // Leer de stdin
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

  let prospectos;
  try {
    prospectos = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Error parseando JSON: ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(prospectos)) {
    console.error('❌ La entrada debe ser un array JSON de prospectos.');
    process.exit(1);
  }

  if (prospectos.length === 0) {
    console.error('⚠️  Array vacío. Sin datos para normalizar.');
    process.exit(0);
  }

  // Normalizar
  const normalizados = prospectos.map(normalizeProspecto);

  // Estadísticas
  let conKeyword = 0, conNom = 0, conUrl = 0, conEmail = 0, conTel = 0;
  for (const p of normalizados) {
    if (p.keyword) conKeyword++;
    if (p.nom) conNom++;
    if (p.url_landing) conUrl++;
    if (p.email) conEmail++;
    if (p.telefono) conTel++;
  }

  const stats = {
    total_entrada: prospectos.length,
    total_salida: normalizados.length,
    con_keyword: conKeyword,
    con_nom: conNom,
    con_url: conUrl,
    con_email: conEmail,
    con_telefono: conTel,
  };

  const output = { stats, prospectos: normalizados };
  const json = JSON.stringify(output, null, 2);

  if (opts.output) {
    fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.output), json, 'utf-8');
    console.error(`✅ ${normalizados.length} prospectos normalizados → ${opts.output}`);
    console.error(`   ${conKeyword} con keyword | ${conUrl} con url | ${conEmail} con email | ${conTel} con teléfono`);
  } else {
    process.stdout.write(json + '\n');
  }
}

main().catch((err) => {
  console.error(`❌ normalize-prospectos: ${err.message}`);
  process.exit(1);
});
