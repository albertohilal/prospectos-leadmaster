#!/usr/bin/env node

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'leadmaster_user',
  password: process.env.DB_PASSWORD || 'leadmaster_password',
  database: process.env.DB_NAME || 'leadmaster',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allowFetch = args.includes('--allow-fetch');

const limitArgIndex = args.findIndex((arg) => arg === '--limit');
const limit = limitArgIndex >= 0 && args[limitArgIndex + 1] ? parseInt(args[limitArgIndex + 1], 10) : 100;

const maxFetchArgIndex = args.findIndex((arg) => arg === '--max-fetch');
const maxFetch = maxFetchArgIndex >= 0 && args[maxFetchArgIndex + 1] ? parseInt(args[maxFetchArgIndex + 1], 10) : 20;

const minDelayArgIndex = args.findIndex((arg) => arg === '--min-delay-ms');
const minDelayMs = minDelayArgIndex >= 0 && args[minDelayArgIndex + 1] ? parseInt(args[minDelayArgIndex + 1], 10) : 8000;

const maxDelayArgIndex = args.findIndex((arg) => arg === '--max-delay-ms');
const maxDelayMs = maxDelayArgIndex >= 0 && args[maxDelayArgIndex + 1] ? parseInt(args[maxDelayArgIndex + 1], 10) : 15000;

if (Number.isNaN(limit) || limit <= 0) {
  console.error('❌ --limit debe ser un entero positivo');
  process.exit(1);
}

if (Number.isNaN(maxFetch) || maxFetch < 0) {
  console.error('❌ --max-fetch debe ser un entero >= 0');
  process.exit(1);
}

if (Number.isNaN(minDelayMs) || Number.isNaN(maxDelayMs) || minDelayMs < 0 || maxDelayMs < minDelayMs) {
  console.error('❌ Rango inválido de delays (--min-delay-ms / --max-delay-ms)');
  process.exit(1);
}

const INVALID_NAME_PATTERNS = [
  /^inicio$/i,
  /^home$/i,
  /^contacto$/i,
  /^cotizar$/i,
  /^google$/i,
  /^landing$/i,
  /^sitio web$/i,
  /^empresa$/i,
  /^formulario$/i,
  /^gmail$/i,
  /^yahoo$/i,
  /^hotmail$/i,
  /^outlook$/i,
  /^correo$/i,
  /^email$/i,
  /^emailcom$/i,
  /^com$/i,
  /^org$/i,
  /^net$/i,
  /^ssn$/i,
];

const TITLE_STOPWORDS = [
  'inicio', 'home', 'contacto', 'cotizar', 'cotización', 'presupuesto',
  'seguros', 'formulario', 'landing', 'oficial', 'argentina', 'bienvenidos',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toTitleCase(value) {
  return normalizeWhitespace(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function isValidCompanyName(name) {
  if (!name) {
    return false;
  }
  const normalized = normalizeWhitespace(name);
  if (normalized.length < 3 || normalized.length > 120) {
    return false;
  }
  if (INVALID_NAME_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  return /[a-záéíóúñ]/i.test(normalized);
}

function effectiveRootFromHost(hostname) {
  const clean = String(hostname || '').replace(/^www\./i, '').toLowerCase();
  const parts = clean.split('.').filter(Boolean);
  if (parts.length <= 2) {
    return clean;
  }
  const secondLevelAr = new Set(['com.ar', 'org.ar', 'net.ar', 'gob.ar', 'edu.ar']);
  const last2 = parts.slice(-2).join('.');
  if (secondLevelAr.has(last2) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return last2;
}

function rootTokenFromUrl(urlValue) {
  try {
    const parsed = new URL(urlValue);
    const root = effectiveRootFromHost(parsed.hostname);
    const token = root.split('.')[0] || '';
    return toTitleCase(token.replace(/[-_]+/g, ' '));
  } catch {
    return null;
  }
}

function cleanTitleCandidate(title) {
  const raw = normalizeWhitespace(title)
    .replace(/[|•»«]+/g, '|')
    .replace(/\s*[-–—]\s*/g, ' | ');

  const parts = raw.split('|').map((part) => normalizeWhitespace(part)).filter(Boolean);
  const chosen = parts.find((part) => {
    const lc = part.toLowerCase();
    return !TITLE_STOPWORDS.some((word) => lc.includes(word));
  }) || parts[0] || raw;

  return normalizeWhitespace(chosen);
}

function extractJsonLdNames(html) {
  const names = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const payload = normalizeWhitespace(match[1]);
    if (!payload) {
      continue;
    }

    try {
      const parsed = JSON.parse(payload);
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length > 0) {
        const node = stack.pop();
        if (!node) {
          continue;
        }
        if (Array.isArray(node)) {
          stack.push(...node);
          continue;
        }
        if (typeof node !== 'object') {
          continue;
        }

        const typeValue = Array.isArray(node['@type']) ? node['@type'].join(',') : node['@type'];
        const isOrgType = typeof typeValue === 'string' && /(organization|localbusiness|corporation|store|company)/i.test(typeValue);
        if (isOrgType && node.name && typeof node.name === 'string') {
          names.push(node.name);
        }

        if (!isOrgType && node.name && typeof node.name === 'string' && /brand|empresa|compa/i.test(JSON.stringify(node))) {
          names.push(node.name);
        }

        for (const value of Object.values(node)) {
          if (value && typeof value === 'object') {
            stack.push(value);
          }
        }
      }
    } catch {
      continue;
    }
  }

  return names;
}

function extractMetaSiteName(html) {
  const patterns = [
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match && match[1] ? match[1] : null;
}

function chooseBestCandidate(candidates) {
  if (!candidates.length) {
    return null;
  }
  const valid = candidates
    .map((candidate) => ({
      ...candidate,
      value: normalizeWhitespace(candidate.value),
    }))
    .filter((candidate) => isValidCompanyName(candidate.value));

  if (!valid.length) {
    return null;
  }

  valid.sort((left, right) => right.score - left.score);
  return valid[0];
}

function addCandidate(candidates, value, score, source) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return;
  }
  candidates.push({ value: normalized, score, source });
}

function deriveLocalCandidate(row) {
  const candidates = [];

  if (row.nom && normalizeWhitespace(row.nom)) {
    addCandidate(candidates, row.nom, 200, 'existing_nom');
  }

  if (row.email_extraido && row.email_extraido.includes('@')) {
    const domain = row.email_extraido.split('@')[1] || '';
    const token = rootTokenFromUrl(`https://${domain}`);
    if (token) {
      addCandidate(candidates, token, 70, 'email_domain');
    }
  }

  const domainToken = rootTokenFromUrl(row.url_landing);
  if (domainToken) {
    addCandidate(candidates, domainToken, 55, 'url_domain');
  }

  return chooseBestCandidate(candidates);
}

async function fetchPageHtml(urlValue) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(urlValue, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return { html, finalUrl: response.url || urlValue };
  } finally {
    clearTimeout(timeoutId);
  }
}

function deriveWebCandidate(html, urlValue) {
  const candidates = [];

  const jsonLdNames = extractJsonLdNames(html);
  for (const name of jsonLdNames) {
    addCandidate(candidates, name, 95, 'json_ld');
  }

  const siteName = extractMetaSiteName(html);
  if (siteName) {
    addCandidate(candidates, siteName, 85, 'meta_site_name');
  }

  const title = extractTitle(html);
  if (title) {
    addCandidate(candidates, cleanTitleCandidate(title), 72, 'html_title');
  }

  const domainFallback = rootTokenFromUrl(urlValue);
  if (domainFallback) {
    addCandidate(candidates, domainFallback, 55, 'url_domain');
  }

  return chooseBestCandidate(candidates);
}

async function main() {
  console.log(
    `🚀 Enriqueciendo stg_prospectos.nom (limit=${limit}, dryRun=${dryRun}, allowFetch=${allowFetch}, maxFetch=${maxFetch})`
  );
  if (!allowFetch) {
    console.log('🛡️  Modo seguro activo: sin requests externos (usar --allow-fetch para habilitar fallback web).');
  }

  const db = await mysql.createConnection(DB_CONFIG);
  try {
    const [rows] = await db.query(
      `SELECT id, prospecto_id, url_landing, email_extraido, nom
       FROM stg_prospectos
       WHERE (nom IS NULL OR TRIM(nom) = '')
       ORDER BY prospecto_id ASC
       LIMIT ?`,
      [limit]
    );

    console.log(`📊 Filas candidatas: ${rows.length}`);

    let updated = 0;
    let localResolved = 0;
    let webResolved = 0;
    let skipped = 0;
    let fetchCount = 0;

    const domainCache = new Map();

    for (const row of rows) {
      if (!row.url_landing || !/^https?:\/\//i.test(String(row.url_landing))) {
        skipped += 1;
        continue;
      }

      let selected = deriveLocalCandidate(row);
      if (selected) {
        localResolved += 1;
      }

      if (!selected && allowFetch && fetchCount < maxFetch) {
        let rootKey = null;
        try {
          const parsed = new URL(row.url_landing);
          rootKey = effectiveRootFromHost(parsed.hostname);
        } catch {
          rootKey = null;
        }

        if (rootKey && domainCache.has(rootKey)) {
          selected = domainCache.get(rootKey);
        } else {
          try {
            fetchCount += 1;
            const { html, finalUrl } = await fetchPageHtml(row.url_landing);
            selected = deriveWebCandidate(html, finalUrl || row.url_landing);
            if (rootKey && selected) {
              domainCache.set(rootKey, selected);
            }
            await sleep(randomDelay(minDelayMs, maxDelayMs));
          } catch {
            selected = null;
          }
        }

        if (selected && selected.source !== 'url_domain' && selected.source !== 'email_domain') {
          webResolved += 1;
        }
      }

      if (!selected || selected.score < 50) {
        continue;
      }

      if (!dryRun) {
        await db.execute(
          `UPDATE stg_prospectos
           SET nom = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
             AND (nom IS NULL OR TRIM(nom) = '')`,
          [selected.value, row.id]
        );
      }

      updated += 1;
      console.log(`✅ prospecto_id=${row.prospecto_id} nom=${selected.value} fuente=${selected.source} score=${selected.score}`);
    }

    console.log('');
    console.log('📌 Resumen nom');
    console.log(`- Actualizados: ${updated}`);
    console.log(`- Resueltos local (sin red): ${localResolved}`);
    console.log(`- Resueltos por web fallback: ${webResolved}`);
    console.log(`- Filas omitidas por URL inválida: ${skipped}`);
    console.log(`- Requests web ejecutados: ${fetchCount}`);
    console.log(`- Modo: ${dryRun ? 'dry-run' : 'write'}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('❌ Error en enriquecimiento de nom:', error.message);
  process.exit(1);
});
