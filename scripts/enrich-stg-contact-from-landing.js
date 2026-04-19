#!/usr/bin/env node

require('dotenv').config();
const mysql = require('mysql2/promise');
const { URL } = require('url');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'leadmaster_user',
  password: process.env.DB_PASSWORD || 'leadmaster_password',
  database: process.env.DB_NAME || 'leadmaster',
};

const EXCLUDED_URL_PATTERNS = [
  'https://www.google.',
  'https://google.',
  '/sorry/',
  'https://api.whatsapp.com/',
  'ejemplo.com',
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArgIndex = args.findIndex((arg) => arg === '--limit');
const limit =
  limitArgIndex >= 0 && args[limitArgIndex + 1]
    ? parseInt(args[limitArgIndex + 1], 10)
    : 50;

if (Number.isNaN(limit) || limit <= 0) {
  console.error('❌ --limit debe ser un entero positivo');
  process.exit(1);
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
    .replace(/\.(com|org|net|edu|gov)(ar|mx|uy|cl|br)[a-z]{1,4}$/i, '.$1.$2')
    .replace(/(\.[a-z]{2,})\.$/i, '$1');
}

function isLikelyValidEmail(email) {
  if (!email) {
    return false;
  }
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    return false;
  }
  const domain = email.split('@')[1] || '';
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
  if (email.includes('example.com')) {
    return false;
  }
  return true;
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

async function fetchLanding(urlValue) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
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
    return html;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  console.log(`🚀 Iniciando enriquecimiento contacto desde landing (limit=${limit}, dryRun=${dryRun})`);

  const db = await mysql.createConnection(DB_CONFIG);
  try {
    const [schemaRows] = await db.query('SHOW COLUMNS FROM stg_prospectos');
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

    const [rows] = await db.query(
      `SELECT ${selectFields.join(', ')}
       FROM stg_prospectos
       WHERE url_landing IS NOT NULL
         AND TRIM(url_landing) <> ''
       ORDER BY prospecto_id ASC
       LIMIT ${safeLimit}`
    );

    const queue = rows.filter(
      (row) => {
        const needsEmail = isBlank(row.email_extraido) || !isLikelyValidEmail(cleanEmailCandidate(row.email_extraido));
        const needsPhone = hasPhoneColumn && (isBlank(row.telefono_extraido) || !isLikelyValidPhone(row.telefono_extraido));
        const needsWhatsapp =
          hasWhatsappColumn && (isBlank(row.whatsapp_extraido) || !isLikelyValidPhone(row.whatsapp_extraido));
        return isEligibleUrl(row.url_landing) && (needsEmail || needsPhone || needsWhatsapp);
      }
    );

    console.log(`📊 Registros leídos: ${rows.length} | En cola efectiva: ${queue.length}`);

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
        const html = await fetchLanding(row.url_landing);
        const pageText = stripHtml(html);

        const extractedEmailRaw = currentEmail || extractBestEmail(html, pageText, row.url_landing);
        const extractedEmail = isLikelyValidEmail(extractedEmailRaw || '') ? extractedEmailRaw : null;
        const extractedWhatsapp = currentWhatsapp || extractBestWhatsapp(html, pageText);
        const extractedPhone = currentPhone || extractBestPhone(html, pageText, extractedWhatsapp);
        const finalEmail = extractedEmail || '';
        const finalPhone = extractedPhone || '';
        const finalWhatsapp = extractedWhatsapp || '';

        const willUpdate =
          (finalEmail && finalEmail !== storedEmail) ||
          (hasPhoneColumn && finalPhone && finalPhone !== storedPhone) ||
          (hasWhatsappColumn && finalWhatsapp && finalWhatsapp !== storedWhatsapp);

        if (willUpdate) {
          updated += 1;
          if (!dryRun) {
            const updateClauses = [
              "email_extraido = COALESCE(NULLIF(?, ''), email_extraido)",
            ];
            const updateParams = [finalEmail];

            if (hasPhoneColumn) {
              updateClauses.push("telefono_extraido = COALESCE(NULLIF(?, ''), telefono_extraido)");
              updateParams.push(finalPhone);
            }
            if (hasWhatsappColumn) {
              updateClauses.push("whatsapp_extraido = COALESCE(NULLIF(?, ''), whatsapp_extraido)");
              updateParams.push(finalWhatsapp);
            }

            updateClauses.push(
              "estado = CASE WHEN place_id IS NULL OR place_id = '' THEN 'pendiente_place_id' ELSE estado END"
            );
            updateClauses.push('error_msg = NULL');
            updateClauses.push('updated_at = CURRENT_TIMESTAMP');
            updateParams.push(row.id);

            await db.execute(
              `UPDATE stg_prospectos
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
          } tel=${finalPhone || '-'} wa=${finalWhatsapp || '-'
          }`
        );
      } catch (error) {
        errors += 1;
        const message = normalizeWhitespace(error.message || 'Error desconocido').slice(0, 400);
        if (!dryRun) {
          await db.execute(
            `UPDATE stg_prospectos
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
