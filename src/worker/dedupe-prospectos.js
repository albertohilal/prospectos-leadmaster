#!/usr/bin/env node

/**
 * dedupe-prospectos.js — Detección de duplicados en prospectos LeadMaster
 *
 * CONTRATO:
 *   Lee prospectos normalizados (JSON array por stdin o --input),
 *   detecta duplicados probables por 3 claves independientes,
 *   emite reporte de grupos duplicados + datos con flag _duplicado_de.
 *
 * CLAVES DE DEDUPLICACIÓN:
 *   1. Dominio canónico: mismo dominio raíz en url_landing.
 *      Ej: "ejemplo.com" y "www.ejemplo.com/contacto" → mismo grupo.
 *   2. Email: mismo email normalizado (excluyendo genéricos:
 *      gmail, hotmail, yahoo, outlook).
 *   3. Teléfono: mismos últimos 8 dígitos (tolerancia a prefijos).
 *
 * REGLAS:
 *   - No descarta ni elimina registros automáticamente.
 *   - Marca con _duplicado_de: ID del primer registro del grupo.
 *   - Reporta estadísticas de grupos duplicados.
 *
 * USO:
 *   node dedupe-prospectos.js --help
 *   node dedupe-prospectos.js --input normalizados.json
 *   cat normalizados.json | node dedupe-prospectos.js
 *
 * SIN DEPENDENCIAS EXTERNAS: solo Node.js estándar.
 * SIN EFECTOS DESTRUCTIVOS: no modifica archivos ni DB.
 */

const fs = require('fs');
const path = require('path');

// ─── Help ──────────────────────────────────────────────────────────

function showHelp() {
  console.log(`dedupe-prospectos.js — Detecta duplicados en prospectos

Uso:
  node dedupe-prospectos.js [opciones]

Opciones:
  --input PATH    Archivo JSON de entrada (array de prospectos normalizados).
                  Si no se especifica, lee de stdin.
  --output PATH   Archivo JSON de salida. Si no se especifica, stdout.
  --report PATH   Archivo de reporte (Markdown) con grupos duplicados.
  --help, -h      Esta ayuda.

Formato de entrada (cada prospecto, ya normalizado):
  {
    "prospecto_id": 123,
    "nom": "Broker De Seguros Ejemplo",
    "url_landing": "https://ejemplo.com",
    "email": "contacto@ejemplo.com",
    "telefono": "541155551234"
  }

Ejemplo:
  node dedupe-prospectos.js --input ./normalizado.json --report ./duplicados.md`);
}

// ─── Utilidades ────────────────────────────────────────────────────

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com',
  'live.com', 'msn.com', 'icloud.com', 'protonmail.com',
  'gmail.com.ar', 'hotmail.com.ar', 'yahoo.com.ar',
]);

function extractDomain(url) {
  if (!url || url === '/') return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    const m = url.match(/^(?:https?:\/\/)?([^\/\s?#]+)/i);
    return m ? m[1].replace(/^www\./i, '').toLowerCase() : null;
  }
}

function isGenericEmail(email) {
  if (!email) return true;
  const domain = email.split('@')[1];
  return domain ? GENERIC_EMAIL_DOMAINS.has(domain.toLowerCase()) : true;
}

function phoneFingerprint(phone) {
  if (!phone) return null;
  // Últimos 8 dígitos para tolerar prefijos variables
  return phone.length >= 8 ? phone.slice(-8) : phone;
}

// ─── Detección de duplicados ───────────────────────────────────────

/**
 * Construye 3 mapas de indexación:
 *   domainMap: dominio → [prospectos]
 *   emailMap:  email → [prospectos]
 *   phoneMap:  phone_fingerprint → [prospectos]
 *
 * Solo se consideran duplicados cuando hay 2+ prospectos
 * en un mismo bucket.
 */
function buildIndexMaps(prospectos) {
  const domainMap = new Map();
  const emailMap = new Map();
  const phoneMap = new Map();

  for (const p of prospectos) {
    const domain = extractDomain(p.url_landing);
    if (domain) {
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain).push(p);
    }

    const email = p.email;
    if (email && !isGenericEmail(email)) {
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email).push(p);
    }

    const fp = phoneFingerprint(p.telefono);
    if (fp && fp.length >= 8) {
      if (!phoneMap.has(fp)) phoneMap.set(fp, []);
      phoneMap.get(fp).push(p);
    }
  }

  return { domainMap, emailMap, phoneMap };
}

/**
 * Extrae grupos de duplicados (2+ prospectos por bucket).
 * Devuelve array de { clave, tipo, prospectos }.
 */
function findDuplicateGroups(domainMap, emailMap, phoneMap) {
  const groups = [];

  for (const [domain, group] of domainMap) {
    if (group.length > 1) {
      groups.push({
        tipo: 'dominio',
        clave: `dominio:${domain}`,
        prospectos: group,
      });
    }
  }

  for (const [email, group] of emailMap) {
    if (group.length > 1) {
      groups.push({
        tipo: 'email',
        clave: `email:${email}`,
        prospectos: group,
      });
    }
  }

  for (const [fp, group] of phoneMap) {
    if (group.length > 1) {
      groups.push({
        tipo: 'telefono',
        clave: `telefono:${fp}`,
        prospectos: group,
      });
    }
  }

  return groups;
}

/**
 * Consolida grupos que comparten al menos un prospecto.
 * Ej: si el dominio y el email agrupan al mismo prospecto,
 * se unifican en un solo grupo.
 */
function mergeOverlappingGroups(groups) {
  if (groups.length <= 1) return groups;

  // Union-Find sobre prospectos (usando prospecto_id como clave)
  const parent = new Map();
  const rank = new Map();

  function find(id) {
    if (!parent.has(id)) {
      parent.set(id, id);
      rank.set(id, 0);
    }
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)));
    }
    return parent.get(id);
  }

  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank.get(ra) < rank.get(rb)) {
      parent.set(ra, rb);
    } else if (rank.get(ra) > rank.get(rb)) {
      parent.set(rb, ra);
    } else {
      parent.set(rb, ra);
      rank.set(ra, rank.get(ra) + 1);
    }
  }

  // Unir prospectos dentro de cada grupo
  for (const group of groups) {
    const ids = group.prospectos.map(p => p.prospecto_id).filter(Boolean);
    for (let i = 1; i < ids.length; i++) {
      union(ids[0], ids[i]);
    }
  }

  // Reagrupar por raíz
  const merged = new Map();
  for (const group of groups) {
    const rootId = find(group.prospectos[0]?.prospecto_id);
    if (!merged.has(rootId)) {
      merged.set(rootId, { tipo: new Set(), clave: new Set(), prospectos: new Map() });
    }
    const entry = merged.get(rootId);
    entry.tipo.add(group.tipo);
    entry.clave.add(group.clave);
    for (const p of group.prospectos) {
      entry.prospectos.set(p.prospecto_id, p);
    }
  }

  return [...merged.values()].map(entry => ({
    tipo: [...entry.tipo].join('+'),
    clave: [...entry.clave].join(' | '),
    prospectos: [...entry.prospectos.values()],
  }));
}

// ─── Procesamiento principal ──────────────────────────────────────

function processDedup(prospectos) {
  const { domainMap, emailMap, phoneMap } = buildIndexMaps(prospectos);
  const rawGroups = findDuplicateGroups(domainMap, emailMap, phoneMap);
  const mergedGroups = mergeOverlappingGroups(rawGroups);

  // Asignar _duplicado_de al primer prospecto de cada grupo
  const dedupMap = new Map(); // prospecto_id → grupo_id del primero
  for (const group of mergedGroups) {
    const sorted = group.prospectos.sort((a, b) => (a.prospecto_id || 0) - (b.prospecto_id || 0));
    const firstId = sorted[0].prospecto_id;
    for (const p of sorted) {
      if (p.prospecto_id !== firstId) {
        dedupMap.set(p.prospecto_id, {
          _duplicado_de: firstId,
          _duplicado_por: group.clave,
        });
      }
    }
  }

  // Marcar prospectos
  const result = prospectos.map(p => {
    const dup = dedupMap.get(p.prospecto_id);
    if (dup) {
      return { ...p, ...dup, _es_duplicado: true };
    }
    return { ...p, _es_duplicado: false };
  });

  return {
    stats: {
      total_prospectos: prospectos.length,
      grupos_duplicados: mergedGroups.length,
      prospectos_duplicados: dedupMap.size,
      prospectos_unicos: prospectos.length - dedupMap.size,
    },
    grupos: mergedGroups.map(g => ({
      tipo: g.tipo,
      clave: g.clave,
      prospectos: g.prospectos.map(p => ({
        prospecto_id: p.prospecto_id,
        nom: p.nom,
        url_landing: p.url_landing,
        email: p.email,
        telefono: p.telefono,
      })),
    })),
    prospectos: result,
  };
}

// ─── Generación de reporte Markdown ────────────────────────────────

function generateMarkdownReport(dedupResult) {
  const { stats, grupos } = dedupResult;
  const lines = [];

  lines.push('# Reporte de duplicados — Prospectos LeadMaster');
  lines.push('');
  lines.push(`**Fecha:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Total prospectos:** ${stats.total_prospectos}`);
  lines.push(`**Grupos duplicados:** ${stats.grupos_duplicados}`);
  lines.push(`**Prospectos duplicados:** ${stats.prospectos_duplicados}`);
  lines.push(`**Prospectos únicos:** ${stats.prospectos_unicos}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Grupos duplicados detectados');
  lines.push('');

  if (grupos.length === 0) {
    lines.push('✅ No se detectaron duplicados.');
    lines.push('');
  } else {
    for (let i = 0; i < grupos.length; i++) {
      const g = grupos[i];
      lines.push(`### Grupo ${i + 1}: ${g.clave}`);
      lines.push('');
      lines.push(`**Tipo:** ${g.tipo}`);
      lines.push('');
      lines.push('| prospecto_id | nom | url_landing | email | teléfono |');
      lines.push('|:---:|------|------------|-------|:---:|');
      for (const p of g.prospectos) {
        lines.push(`| ${p.prospecto_id || '-'} | ${p.nom || '-'} | ${p.url_landing || '-'} | ${p.email || '-'} | ${p.telefono || '-'} |`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('*Reporte generado con dedupe-prospectos.js — sin modificar base de datos.*');

  return lines.join('\n');
}

// ─── Entry point ──────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { input: null, output: null, report: null, help: false };
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

  // Soporta { prospectos: [...] } (salida de normalize) o array directo
  const prospectos = Array.isArray(data) ? data : (data.prospectos || []);
  if (prospectos.length === 0) {
    console.error('⚠️  Sin prospectos para analizar.');
    process.exit(0);
  }

  const result = processDedup(prospectos);

  // Reporte Markdown
  if (opts.report) {
    const md = generateMarkdownReport(result);
    fs.mkdirSync(path.dirname(path.resolve(opts.report)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.report), md, 'utf-8');
    console.error(`📝 Reporte Markdown → ${opts.report}`);
  }

  // Salida JSON
  const json = JSON.stringify(result, null, 2);
  if (opts.output) {
    fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.output), json, 'utf-8');
    console.error(`✅ Deduplicación completada → ${opts.output}`);
  } else {
    process.stdout.write(json + '\n');
  }

  console.error(`📊 ${result.stats.total_prospectos} prospectos | ${result.stats.grupos_duplicados} grupos duplicados | ${result.stats.prospectos_duplicados} duplicados`);
}

main().catch((err) => {
  console.error(`❌ dedupe-prospectos: ${err.message}`);
  process.exit(1);
});
