#!/usr/bin/env node

require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');
const { URL } = require('url');

const DB_CONFIG = {
  host: process.env.DB_HOST || process.env.KEYWORDS_DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.KEYWORDS_DB_PORT || 3306),
  user: process.env.DB_USER || process.env.KEYWORDS_DB_USER || '',
  password: process.env.DB_PASSWORD || process.env.KEYWORDS_DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.KEYWORDS_DB_NAME || 'iunaorg_dyd',
};

const EXCLUDED_URL_PATTERNS = [
  'https://www.google.',
  'https://google.',
  '/sorry/',
  'https://api.whatsapp.com/',
  'ejemplo.com',
];

const BLOCKED_EMAILS = new Set([
  'tu@email.com',
  'nombre@ejemplo.com',
  'test@test.com',
  'test@example.com',
  'email@email.com',
  'correo@correo.com',
  'mail@mail.com',
]);

const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com',
  'ejemplo.com',
]);

const DISCOVERY_MAX_PAGES = parseInt(process.env.ENRICH_DISCOVERY_MAX_PAGES || '4', 10);
const DISCOVERY_TIMEOUT_MS = parseInt(process.env.ENRICH_DISCOVERY_TIMEOUT_MS || '15000', 10);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArgIndex = args.findIndex((arg) => arg === '--limit');
const limit =
  limitArgIndex >= 0 && args[limitArgIndex + 1]
    ? parseInt(args[limitArgIndex + 1], 10)
    : 50;
const noOverwrite = args.includes('--no-overwrite');
const prospectoFromArgIndex = args.findIndex((arg) => arg === '--prospecto-from');
const prospectoToArgIndex = args.findIndex((arg) => arg === '--prospecto-to');
const prospectoFrom =
  prospectoFromArgIndex >= 0 && args[prospectoFromArgIndex + 1]
    ? parseInt(args[prospectoFromArgIndex + 1], 10)
    : null;
const prospectoTo =
  prospectoToArgIndex >= 0 && args[prospectoToArgIndex + 1]
    ? parseInt(args[prospectoToArgIndex + 1], 10)
    : null;

if (Number.isNaN(limit) || limit <= 0) {
  console.error('❌ --limit debe ser un entero positivo');
  process.exit(1);
}

if ((prospectoFrom === null) !== (prospectoTo === null)) {
  console.error('❌ --prospecto-from y --prospecto-to deben usarse juntos');
  process.exit(1);
}

if (prospectoFrom !== null && (Number.isNaN(prospectoFrom) || prospectoFrom <= 0)) {
  console.error('❌ --prospecto-from debe ser un entero positivo');
  process.exit(1);
}

if (prospectoTo !== null && (Number.isNaN(prospectoTo) || prospectoTo <= 0)) {
  console.error('❌ --prospecto-to debe ser un entero positivo');
  process.exit(1);
}

if (prospectoFrom !== null && prospectoTo !== null && prospectoFrom > prospectoTo) {
  console.error('❌ --prospecto-from no puede ser mayor que --prospecto-to');
  process.exit(1);
}

const STG_CLEANUP_WHERE = `
  url_landing IS NULL
  OR TRIM(url_landing) = ''
  OR LOWER(url_landing) LIKE '%google.%'
  OR LOWER(url_landing) LIKE '%/search%'
  OR LOWER(url_landing) LIKE '%/sorry/%'
  OR LOWER(url_landing) LIKE '%consent.%'
  OR LOWER(url_landing) LIKE '%webhp%'
  OR LOWER(url_landing) LIKE '%chrome-error://%'
  OR LOWER(url_landing) LIKE '%api.whatsapp.com/send%'
  OR LOWER(url_landing) LIKE '%ejemplo.com%'
`;

async function cleanupInvalidStageRows(db, { dryRunMode }) {
  const [toCleanRows] = await db.query(
    `SELECT id, prospecto_id, url_landing
     FROM la_stg_prospectos
     WHERE ${STG_CLEANUP_WHERE}
     ORDER BY prospecto_id ASC
     LIMIT 100`
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total_invalid
      FROM la_stg_prospectos
     WHERE ${STG_CLEANUP_WHERE}`
  );

  const totalInvalid = countRows[0]?.total_invalid || 0;
  if (totalInvalid === 0) {
    console.log('🧼 Limpieza previa: no se detectaron registros inválidos en stg_prospectos.');
    return { totalInvalid: 0, deletedStageRows: 0, deletedContactRows: 0 };
  }

  console.log(`🧼 Limpieza previa: detectados ${totalInvalid} registros inválidos en stg_prospectos.`);
  for (const row of toCleanRows) {
    console.log(`   - prospecto_id=${row.prospecto_id} url=${row.url_landing || 'NULL'}`);
  }
  if (totalInvalid > toCleanRows.length) {
    console.log(`   ... y ${totalInvalid - toCleanRows.length} más.`);
  }

  if (dryRunMode) {
    console.log('🧪 Modo dry-run: no se eliminan registros inválidos.');
    return { totalInvalid, deletedStageRows: 0, deletedContactRows: 0 };
  }

  await db.beginTransaction();
  try {
    const [contactDeleteResult] = await db.query(
      `DELETE FROM la_stg_prospectos_contactos
       WHERE stg_prospecto_id IN (
         SELECT id FROM la_stg_prospectos WHERE ${STG_CLEANUP_WHERE}
       )`
    );

    const [stageDeleteResult] = await db.query(
      `DELETE FROM la_stg_prospectos
       WHERE ${STG_CLEANUP_WHERE}`
    );

    await db.commit();
    console.log(
      `🧹 Limpieza aplicada: stg_prospectos=${stageDeleteResult.affectedRows || 0}, contactos=${contactDeleteResult.affectedRows || 0}.`
    );

    return {
      totalInvalid,
      deletedStageRows: stageDeleteResult.affectedRows || 0,
      deletedContactRows: contactDeleteResult.affectedRows || 0,
    };
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

function isEligibleUrl(urlValue) {
  if (!urlValue || typeof urlValue !== 'string') {
    return false;
  }
  const normalized = urlValue.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !EXCLUDED_URL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function normalizeWhitespace(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function isBlank(value) {
  return !value || !String(value).trim();
}

function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');
}

function baseDomain(hostname) {
  const clean = (hostname || '').replace(/^www\./i, '').toLowerCase();
  const parts = clean.split('.').filter(Boolean);
  if (parts.length <= 2) {
    return clean;
  }
  return parts.slice(-2).join('.');
}

function cleanEmailCandidate(candidate) {
  return (candidate || '')
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, '')
    .replace(/^[\"'(<\[]+/, '')
    .replace(/[\"')>\],;:]+$/, '')
    .replace(/\.(com|org|net|edu|gov)(ar|mx|uy|cl|br)$/i, '.$1.$2')
    .replace(/\.(com|org|net|edu|gov)\.(ar|mx|uy|cl|br)[a-z]{1,4}$/i, '.$1.$2')
    .replace(/\.(com|org|net|edu|gov)(ar|mx|uy|cl|br)[a-z]{1,4}$/i, '.$1.$2')
    .replace(/(\.[a-z]{2,})\.$/i, '$1');
}

function isLikelyValidEmail(email) {
  if (!email) {
    return false;
  }
  if (BLOCKED_EMAILS.has(email)) {
    return false;
  }
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    return false;
  }
  const domain = email.split('@')[1] || '';
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return false;
  }
  if (!domain || domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  const labels = domain.split('.').filter(Boolean);
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9-]+$/.test(label) || label.startsWith('-') || label.endsWith('-'))) {
    return false;
  }

  const blockedTlds = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'css', 'js']);
  const lastLabel = domain.split('.').pop() || '';
  if (blockedTlds.has(lastLabel)) {
    return false;
  }
  if (lastLabel.length > 8) {
    return false;
  }
  if (/(com|org|net|edu|gov)[a-z]{3,}$/.test(lastLabel)) {
    return false;
  }
  return true;
}

function isLikelyFormLanding(rawHtml = '', pageText = '') {
  const html = String(rawHtml || '').toLowerCase();
  const text = String(pageText || '').toLowerCase();
  if (!html.includes('<form')) {
    return false;
  }
  return /(cotizar|cotizaci[oó]n|contacto|enviar|solicitar|completar|presupuesto|dejanos tus datos)/i.test(text);
}

function shouldSkipDiscoveryTarget(urlValue, rootHostname) {
  try {
    const parsed = new URL(urlValue);
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const root = (rootHostname || '').replace(/^www\./i, '').toLowerCase();
    if (!hostname || !root) {
      return true;
    }
    if (hostname !== root && !hostname.endsWith(`.${root}`)) {
      return true;
    }
    const pathname = (parsed.pathname || '/').toLowerCase();
    if (/(\.pdf|\.jpg|\.jpeg|\.png|\.gif|\.webp|\.svg|\.zip|\.rar|\.mp4|\.mp3|\.docx?|\.xlsx?)$/.test(pathname)) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

function scoreDiscoveryUrl(urlValue) {
  let score = 0;
  const text = String(urlValue || '').toLowerCase();
  if (/contacto|contact|empresa|nosotros|about|institucional|quienes-somos|sucursales|atencion/.test(text)) {
    score += 10;
  }
  if (/cotiza|cotizador|checkout|carrito|producto|servicio/.test(text)) {
    score -= 3;
  }
  if (/\?|#/.test(text)) {
    score -= 1;
  }
  return score;
}

function extractCandidateLinks(rawHtml, currentUrl, rootHostname) {
  const links = new Set();
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(rawHtml)) !== null) {
    const href = (match[1] || '').trim();
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    try {
      const absolute = new URL(href, currentUrl).toString();
      if (shouldSkipDiscoveryTarget(absolute, rootHostname)) {
        continue;
      }
      links.add(absolute);
    } catch {
      continue;
    }
  }

  return [...links].sort((left, right) => scoreDiscoveryUrl(right) - scoreDiscoveryUrl(left));
}

async function collectDiscoveryPages(initialUrl, initialHtml, initialText) {
  const pages = [{ url: initialUrl, html: initialHtml, text: initialText }];
  if (!DISCOVERY_MAX_PAGES || DISCOVERY_MAX_PAGES <= 1) {
    return pages;
  }

  let rootHostname;
  try {
    rootHostname = new URL(initialUrl).hostname;
  } catch {
    return pages;
  }

  const visited = new Set([initialUrl]);
  const queue = extractCandidateLinks(initialHtml, initialUrl, rootHostname);

  while (queue.length > 0 && pages.length < DISCOVERY_MAX_PAGES) {
    const candidateUrl = queue.shift();
    if (!candidateUrl || visited.has(candidateUrl)) {
      continue;
    }
    visited.add(candidateUrl);

    try {
      const page = await fetchLanding(candidateUrl);
      const text = stripHtml(page.html);
      pages.push({ url: page.finalUrl || candidateUrl, html: page.html, text });

      const nested = extractCandidateLinks(page.html, page.finalUrl || candidateUrl, rootHostname);
      for (const nextUrl of nested) {
        if (!visited.has(nextUrl) && !queue.includes(nextUrl) && queue.length < DISCOVERY_MAX_PAGES * 4) {
          queue.push(nextUrl);
        }
      }
    } catch {
      continue;
    }
  }

  return pages;
}

function extractBestEmail(rawHtml, pageText, landingUrl) {
  const candidates = new Set();
  const source = `${rawHtml}\n${pageText}`;
  const matches = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];

  for (const match of matches) {
    const cleaned = cleanEmailCandidate(match);
    if (!cleaned) {
      continue;
    }
    if (!isLikelyValidEmail(cleaned)) {
      continue;
    }
    candidates.add(cleaned);
  }

  if (candidates.size === 0) {
    return null;
  }

  let landingHost = '';
  try {
    landingHost = baseDomain(new URL(landingUrl).hostname);
  } catch {
    landingHost = '';
  }

  const scored = [...candidates].map((email) => {
    const domain = email.split('@')[1] || '';
    let score = 0;
    if (landingHost && domain.includes(landingHost)) {
      score += 20;
    }
    if (/info@|contacto@|ventas@|comercial@|administracion@|admin@/.test(email)) {
      score += 5;
    }
    if (/gmail\.com|hotmail\.com|yahoo\./.test(domain)) {
      score -= 2;
    }
    score -= Math.min(email.length / 100, 2);
    return { email, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0].email;
}

function extractJsonLdAddress(rawHtml) {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(rawHtml)) !== null) {
    const content = (match[1] || '').trim();
    if (!content) {
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      continue;
    }

    const stack = Array.isArray(parsed) ? [...parsed] : [parsed];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') {
        continue;
      }
      if (Array.isArray(node)) {
        stack.push(...node);
        continue;
      }

      if (node.address && typeof node.address === 'object') {
        const address = node.address;
        const value = normalizeWhitespace(
          [
            address.streetAddress,
            address.addressLocality,
            address.addressRegion,
            address.postalCode,
            address.addressCountry,
          ]
            .filter(Boolean)
            .join(', ')
        );
        if (value) {
          return value;
        }
      }

      for (const value of Object.values(node)) {
        if (value && typeof value === 'object') {
          stack.push(value);
        }
      }
    }
  }

  return null;
}

function extractTextAddress(pageText) {
  const text = normalizeWhitespace(pageText);
  const patterns = [
    /(calle|c\.?|av\.?|avenida|blvd\.?|boulevard|diag\.?|diagonal|pasaje|pje\.?|ruta)\s+[a-z0-9áéíóúñ.' -]{2,50}\s+\d{1,5}(?:\s*[a-z])?(?:\s*,\s*[a-z0-9áéíóúñ.' -]{2,60}){1,3}/i,
    /(domicilio|dirección|ubicación|encontranos en|oficina comercial|sucursal)\s*[:\-]?\s*(.{10,140}?\d{1,5}.{0,80}?)(caba|buenos aires|argentina|provincia)/i,
  ];

  for (const pattern of patterns) {
    const result = text.match(pattern);
    if (result && result[0]) {
      const candidate = normalizeWhitespace(result[0]).slice(0, 500);
      const lowered = candidate.toLowerCase();
      if (/\bcuit\b|\baños\b|\bgoogle\b|\bseguros\b|\bcopyright\b/.test(lowered)) {
        continue;
      }
      return candidate;
    }
  }

  return null;
}

function normalizePhoneCandidate(candidate) {
  if (!candidate) {
    return null;
  }

  const raw = normalizeWhitespace(String(candidate));
  const hasPlus = raw.includes('+') || raw.startsWith('00');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }
  return hasPlus ? `+${digits}` : digits;
}

function isLikelyValidPhone(value) {
  const normalized = normalizePhoneCandidate(value);
  if (!normalized) {
    return false;
  }
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return false;
  }
  if (/^(\d)\1{7,}$/.test(digits)) {
    return false;
  }
  return true;
}

function collectPhonesFromRegex(source, regex, maxMatches = 30) {
  const values = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    const parsed = normalizePhoneCandidate(match[1] || match[0]);
    if (parsed) {
      values.push(parsed);
    }
    if (values.length >= maxMatches) {
      break;
    }
  }
  return values;
}

function scorePhone(phone) {
  let score = 0;
  if (phone.startsWith('+54')) {
    score += 10;
  }
  if (phone.length >= 10 && phone.length <= 14) {
    score += 5;
  }
  if (phone.includes('0800')) {
    score += 2;
  }
  return score;
}

function pickBestPhone(candidates) {
  if (!candidates || candidates.length === 0) {
    return null;
  }
  const uniques = [...new Set(candidates)];
  uniques.sort((left, right) => scorePhone(right) - scorePhone(left));
  return uniques[0] || null;
}

function extractBestWhatsapp(rawHtml, pageText) {
  const source = `${rawHtml}\n${pageText}`;
  const candidates = [
    ...collectPhonesFromRegex(source, /wa\.me\/(\d{8,15})/gi),
    ...collectPhonesFromRegex(source, /api\.whatsapp\.com\/send\?[^"'\s>]*phone=([+\d\s().-]{8,25})/gi),
    ...collectPhonesFromRegex(source, /whatsapp:\/\/send\?[^"'\s>]*phone=([+\d\s().-]{8,25})/gi),
    ...collectPhonesFromRegex(source, /(?:whatsapp|wsp|wa)\s*[:\-]?\s*([+\d\s().-]{8,25})/gi),
  ];
  return pickBestPhone(candidates);
}

function extractBestPhone(rawHtml, pageText, whatsapp) {
  const source = `${rawHtml}\n${pageText}`;
  const candidates = [
    ...collectPhonesFromRegex(source, /tel:([+\d\s().-]{8,25})/gi),
    ...collectPhonesFromRegex(
      source,
      /(?:tel(?:e?fono)?|cel(?:ular)?|llamanos|cont[aá]ctanos)\s*[:\-]?\s*([+\d\s().-]{8,25})/gi
    ),
  ];
  const best = pickBestPhone(candidates);
  if (best) {
    return best;
  }
  return whatsapp || null;
}

function normalizeContactValue(type, value) {
  if (!value) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  if (type === 'email') {
    return text.toLowerCase();
  }
  if (type === 'telefono' || type === 'whatsapp') {
    return text.replace(/[^\d]/g, '');
  }
  return text;
}

async function persistNormalizedContacts(db, row, contacts) {
  for (const contact of contacts) {
    if (!contact || !contact.value) {
      continue;
    }
    const normalized = normalizeContactValue(contact.type, contact.value);
    if (!normalized) {
      continue;
    }
    await db.execute(
      `INSERT INTO la_stg_prospectos_contactos
         (stg_prospecto_id, prospecto_id, tipo, valor, valor_normalizado, es_principal, fuente, url_fuente)
       VALUES (?, ?, ?, ?, ?, ?, 'landing', ?)
       ON DUPLICATE KEY UPDATE
         es_principal = GREATEST(es_principal, VALUES(es_principal)),
         updated_at = CURRENT_TIMESTAMP`,
      [
        row.id,
        row.prospecto_id,
        contact.type,
        contact.value,
        normalized,
        contact.isPrimary ? 1 : 0,
        row.url_landing,
      ]
    );
  }
}

async function fetchLanding(urlValue) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
  try {
    const response = await fetch(urlValue, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

async function main() {
  console.log(
    `🚀 Iniciando enriquecimiento contacto desde landing (limit=${limit}, dryRun=${dryRun}, cleanup=off, noOverwrite=${noOverwrite}, prospectoRange=${prospectoFrom !== null ? `${prospectoFrom}-${prospectoTo}` : 'all'})`
  );

  const db = await mysql.createConnection(DB_CONFIG);
  try {
    const cleanupSummary = { totalInvalid: 0, deletedStageRows: 0, deletedContactRows: 0 };
    console.log('⏭️  Limpieza previa deshabilitada en modo conservador.');

    const [contactTableRows] = await db.query("SHOW TABLES LIKE 'la_stg_prospectos_contactos'");
    const hasNormalizedContactsTable = Array.isArray(contactTableRows) && contactTableRows.length > 0;

    const [schemaRows] = await db.query('SHOW COLUMNS FROM la_stg_prospectos');
    const availableColumns = new Set(schemaRows.map((row) => row.Field));
    const hasPhoneColumn = availableColumns.has('telefono_extraido');
    const hasWhatsappColumn = availableColumns.has('whatsapp_extraido');

    if (!hasPhoneColumn || !hasWhatsappColumn) {
      console.log(
        'ℹ️  Columnas telefono_extraido/whatsapp_extraido no detectadas en stg_prospectos (se omite persistencia de teléfonos hasta migrar esquema).'
      );
    }

    const safeLimit = Math.max(1, Math.floor(limit));
    const selectFields = ['id', 'prospecto_id', 'url_landing', 'email_extraido', 'direccion_extraida'];
    if (hasPhoneColumn) {
      selectFields.push('telefono_extraido');
    }
    if (hasWhatsappColumn) {
      selectFields.push('whatsapp_extraido');
    }

    const selectWhereClauses = [
      'url_landing IS NOT NULL',
      "TRIM(url_landing) <> ''",
    ];
    const selectParams = [];

    if (prospectoFrom !== null && prospectoTo !== null) {
      selectWhereClauses.push('prospecto_id BETWEEN ? AND ?');
      selectParams.push(prospectoFrom, prospectoTo);
    }

    const [rows] = await db.execute(
      `SELECT ${selectFields.join(', ')}
       FROM la_stg_prospectos
       WHERE ${selectWhereClauses.join('\n         AND ')}
       ORDER BY prospecto_id ASC
       LIMIT ${safeLimit}`,
      selectParams
    );

    let skippedExisting = 0;
    const queue = rows.filter((row) => {
      if (!isEligibleUrl(row.url_landing)) {
        return false;
      }

      const needsEmail = noOverwrite
        ? isBlank(row.email_extraido)
        : isBlank(row.email_extraido) || !isLikelyValidEmail(cleanEmailCandidate(row.email_extraido));
      const needsPhone = hasPhoneColumn
        && (noOverwrite
          ? isBlank(row.telefono_extraido)
          : isBlank(row.telefono_extraido) || !isLikelyValidPhone(row.telefono_extraido));
      const needsWhatsapp = hasWhatsappColumn
        && (noOverwrite
          ? isBlank(row.whatsapp_extraido)
          : isBlank(row.whatsapp_extraido) || !isLikelyValidPhone(row.whatsapp_extraido));

      const shouldProcess = needsEmail || needsPhone || needsWhatsapp;
      if (!shouldProcess && noOverwrite) {
        skippedExisting += 1;
      }

      return shouldProcess;
    });

    console.log(`📊 Registros leídos: ${rows.length}`);
    console.log(`📥 En cola efectiva: ${queue.length}`);
    console.log(`⏭️  Omitidos por datos existentes: ${skippedExisting}`);

    let success = 0;
    let updated = 0;
    let errors = 0;

    for (const row of queue) {
      const storedEmail = (row.email_extraido || '').trim();
      const storedPhone = hasPhoneColumn ? (row.telefono_extraido || '').trim() : '';
      const storedWhatsapp = hasWhatsappColumn ? (row.whatsapp_extraido || '').trim() : '';
      const currentEmailRaw = cleanEmailCandidate(storedEmail);
      const currentEmail = isLikelyValidEmail(currentEmailRaw) ? currentEmailRaw : '';
      const currentPhone = isLikelyValidPhone(storedPhone) ? normalizePhoneCandidate(storedPhone) : '';
      const currentWhatsapp = isLikelyValidPhone(storedWhatsapp) ? normalizePhoneCandidate(storedWhatsapp) : '';

      try {
        const landing = await fetchLanding(row.url_landing);
        const pageText = stripHtml(landing.html);
        const landingEmailRaw = extractBestEmail(landing.html, pageText, row.url_landing);

        let discoveryPages = [{ url: landing.finalUrl || row.url_landing, html: landing.html, text: pageText }];
        const hasLandingEmail = isLikelyValidEmail(landingEmailRaw || '');
        const shouldDiscover = isBlank(currentEmail) && (!hasLandingEmail || isLikelyFormLanding(landing.html, pageText));
        if (shouldDiscover) {
          discoveryPages = await collectDiscoveryPages(landing.finalUrl || row.url_landing, landing.html, pageText);
        }

        const combinedHtml = discoveryPages.map((page) => page.html).join('\n');
        const combinedText = discoveryPages.map((page) => page.text).join('\n');

        const extractedEmailRaw = noOverwrite
          ? extractBestEmail(combinedHtml, combinedText, row.url_landing) || landingEmailRaw
          : currentEmail || extractBestEmail(combinedHtml, combinedText, row.url_landing) || landingEmailRaw;
        const extractedEmail = isLikelyValidEmail(extractedEmailRaw || '') ? extractedEmailRaw : null;
        const extractedWhatsapp = noOverwrite
          ? extractBestWhatsapp(combinedHtml, combinedText)
          : currentWhatsapp || extractBestWhatsapp(combinedHtml, combinedText);
        const extractedPhone = noOverwrite
          ? extractBestPhone(combinedHtml, combinedText, extractedWhatsapp)
          : currentPhone || extractBestPhone(combinedHtml, combinedText, extractedWhatsapp);
        const finalEmail = noOverwrite ? (isBlank(storedEmail) ? extractedEmail || '' : storedEmail) : extractedEmail || '';
        const finalPhone = noOverwrite ? (isBlank(storedPhone) ? extractedPhone || '' : storedPhone) : extractedPhone || '';
        const finalWhatsapp = noOverwrite ? (isBlank(storedWhatsapp) ? extractedWhatsapp || '' : storedWhatsapp) : extractedWhatsapp || '';

        if (hasNormalizedContactsTable && !dryRun) {
          await persistNormalizedContacts(db, row, [
            { type: 'email', value: finalEmail, isPrimary: finalEmail && finalEmail === storedEmail },
            { type: 'telefono', value: finalPhone, isPrimary: finalPhone && finalPhone === storedPhone },
            { type: 'whatsapp', value: finalWhatsapp, isPrimary: finalWhatsapp && finalWhatsapp === storedWhatsapp },
          ]);
        }

        const willUpdate =
          (finalEmail && finalEmail !== storedEmail) ||
          (hasPhoneColumn && finalPhone && finalPhone !== storedPhone) ||
          (hasWhatsappColumn && finalWhatsapp && finalWhatsapp !== storedWhatsapp);

        if (willUpdate) {
          updated += 1;
          if (!dryRun) {
            const updateClauses = [];
            const updateParams = [];

            if (noOverwrite) {
              updateClauses.push("email_extraido = CASE WHEN email_extraido IS NULL OR TRIM(email_extraido) = '' THEN COALESCE(NULLIF(?, ''), email_extraido) ELSE email_extraido END");
            } else {
              updateClauses.push("email_extraido = COALESCE(NULLIF(?, ''), email_extraido)");
            }
            updateParams.push(finalEmail);

            if (hasPhoneColumn) {
              if (noOverwrite) {
                updateClauses.push("telefono_extraido = CASE WHEN telefono_extraido IS NULL OR TRIM(telefono_extraido) = '' THEN COALESCE(NULLIF(?, ''), telefono_extraido) ELSE telefono_extraido END");
              } else {
                updateClauses.push("telefono_extraido = COALESCE(NULLIF(?, ''), telefono_extraido)");
              }
              updateParams.push(finalPhone);
            }
            if (hasWhatsappColumn) {
              if (noOverwrite) {
                updateClauses.push("whatsapp_extraido = CASE WHEN whatsapp_extraido IS NULL OR TRIM(whatsapp_extraido) = '' THEN COALESCE(NULLIF(?, ''), whatsapp_extraido) ELSE whatsapp_extraido END");
              } else {
                updateClauses.push("whatsapp_extraido = COALESCE(NULLIF(?, ''), whatsapp_extraido)");
              }
              updateParams.push(finalWhatsapp);
            }

            updateClauses.push(
              "estado = CASE WHEN place_id IS NULL OR place_id = '' THEN 'pendiente_place_id' ELSE estado END"
            );
            updateClauses.push('error_msg = NULL');
            updateClauses.push('updated_at = CURRENT_TIMESTAMP');
            updateParams.push(row.id);

            await db.execute(
              `UPDATE la_stg_prospectos
               SET ${updateClauses.join(',\n                   ')}
               WHERE id = ?`,
              updateParams
            );
          }
        }

        success += 1;
        console.log(
          `✅ prospecto_id=${row.prospecto_id} email=${extractedEmail || '-'} direccion=${
            row.direccion_extraida ? String(row.direccion_extraida).slice(0, 80) : '-'
          } tel=${finalPhone || '-'} wa=${finalWhatsapp || '-'} paginas=${discoveryPages.length
          }`
        );
      } catch (error) {
        errors += 1;
        const message = normalizeWhitespace(error.message || 'Error desconocido').slice(0, 400);
        if (!dryRun) {
          await db.execute(
            `UPDATE la_stg_prospectos
             SET error_msg = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [message, row.id]
          );
        }
        console.log(`⚠️  prospecto_id=${row.prospecto_id} error=${message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    console.log('');
    console.log('📌 Resumen');
    console.log(
      `- Limpieza previa: invalidos=${cleanupSummary.totalInvalid}, stg_eliminados=${cleanupSummary.deletedStageRows}, contactos_eliminados=${cleanupSummary.deletedContactRows}`
    );
    console.log(`- Registros leídos: ${rows.length}`);
    console.log(`- En cola efectiva: ${queue.length}`);
    console.log(`- Omitidos por datos existentes: ${skippedExisting}`);
    console.log(`- Procesados OK: ${success}`);
    console.log(`- Con actualización de datos: ${updated}`);
    console.log(`- Con error fetch/parse: ${errors}`);
    console.log(`- Modo: ${dryRun ? 'dry-run (sin escribir en BD)' : 'write (actualiza BD)'}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
});
