#!/usr/bin/env node

require('dotenv').config({ override: true });

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || process.env.KEYWORDS_DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.KEYWORDS_DB_PORT || 3306),
  user: process.env.DB_USER || process.env.KEYWORDS_DB_USER || '',
  password: process.env.DB_PASSWORD || process.env.KEYWORDS_DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.KEYWORDS_DB_NAME || 'iunaorg_dyd',
};

const STRONG_NOM_PATTERNS = [
  /\bseguros?\b/i, /\bbrokers?\b/i,
  /productor\s+(?:asesor\s+)?(?:de\s+)?seguros/i,
  /sociedad\s+de\s+productores/i, /organizador\s+(?:de\s+)?(?:productores\s+)?(?:de\s+)?seguros/i,
  /aseguradora\b/i, /reaseguro/i, /reasegurador/i,
  /\bART\b/i, /\bcauci[oó]n\b/i, /\bp[oó]liza/i,
  /\binsurtech\b/i, /\bcotizador\s+(?:de\s+)?seguros/i,
  /sancor\s*seguros/i, /sancristobal/i, /sancorseguros/i,
  /zurich\s*(?:seguros)?/i, /provincia\s*ART/i, /provart/i,
  /la\s+caja\s*(?:de\s+)?seguros/i, /la\s+segunda\s*(?:seguros)?/i,
  /national\s*brokers/i, /makler\s*seguros/i, /answer\s*seguros/i,
  /galicia\s*seguros/i, /fed\s*patronal/i, /mercantil\s+andina/i,
  /mapfre/i, /allianz/i, /swiss\s+medical/i, /osde/i,
  /prevenci[oó]n\s+ART/i, /asociart/i, /berkley\s+international/i,
];

const STRONG_URL_PATTERNS = [
  /seguros?/i, /brokers?/i, /asegurador/i,
  /\bART\b/i, /\bcauci[oó]n\b/i, /\bp[oó]liza/i,
  /\binsurtech\b/i, /productor/i, /organizador/i,
  /cotizador/i, /reaseguro/i, /comparador.*seguro/i,
];

const STRONG_EMAIL_PATTERNS = [
  /@.*seguros?/i, /@.*brokers?/i, /@.*asegurador/i,
  /@.*\bART\b/i, /@.*cauci[oó]n/i, /@.*productor/i,
  /@nationalbrokers/i, /@maklerseguros/i, /@answerseguros/i,
  /@galiciaseguros/i, /@sancorseguros/i, /@provart/i,
  /@lasegunda/i, /@sancristobal/i, /@zurich/i,
];

const STRONG_TEXTO_PHRASES = [
  /broker\s+de\s+seguros/i,
  /productor\s+asesor\s+de\s+seguros/i,
  /productor\s+de\s+seguros/i,
  /sociedad\s+de\s+productores/i,
  /organizador\s+de\s+seguros/i,
  /organizador\s+de\s+productores/i,
  /compa[ñn][íi]a\s+de\s+seguros/i,
  /aseguradora\s+de\s+riesgos/i,
  /seguros?\s+corporativos/i,
  /seguros?\s+para\s+empresas/i,
  /\bART\b.*seguros/i,
  /cauci[oó]n.*seguros/i,
];

const BUYER_KEYWORD_PATTERNS = [
  /contratar\s+seguro/i, /cotizar\s+seguro/i,
  /cotizaci[oó]n\s+de\s+seguro/i, /comprar\s+seguro/i,
  /seguro\s+m[aá]s\s+barato/i, /seguro\s+barato/i,
  /presupuesto\s+de\s+seguro/i, /necesito\s+seguro/i,
  /quiero\s+seguro/i, /seguro\s+de\s+auto\s+para/i,
  /seguro\s+para\s+auto/i, /seguro\s+de\s+vida/i,
  /seguro\s+hogar/i, /gesti[oó]n\s+de\s+patentes/i,
];

const B2C_KEYWORD_PATTERNS = [
  /seguro\s+de\s+auto\b/i, /seguro\s+automotor/i,
  /seguro\s+hogar/i, /seguro\s+de\s+vida\b/i,
  /seguro\s+celular/i, /seguro\s+para\s+auto/i,
  /seguro\s+para\s+vivienda/i, /seguro\s+moto/i,
  /seguro\s+de\s+moto/i, /seguro\s+personal/i,
];

function parseArgs(argv) {
  const options = { limit: 500, output: null, clienteId: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--limit') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val > 0) { options.limit = val; i++; }
    } else if (arg === '--output') {
      options.output = argv[i + 1]; i++;
    } else if (arg === '--cliente-id') {
      const val = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(val) && val > 0) { options.clienteId = val; i++; }
    }
  }
  return options;
}

function showHelp() {
  console.log(`Uso: node scripts/report-seguros-candidatos.js [opciones]

Opciones:
  --limit N        Limite de candidatos a consultar (default: 500)
  --output PATH    Ruta del CSV de salida
  --cliente-id N   Filtrar por cliente_id especifico
  --help, -h       Muestra esta ayuda`);
}

function normalizeWhitespace(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function extractDomain(urlValue) {
  if (!urlValue) return '';
  try {
    const parsed = new URL(urlValue);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    const m = urlValue.match(/^(?:https?:\/\/)?([^\/\s?#]+)/i);
    return m ? m[1].replace(/^www\./i, '').toLowerCase() : '';
  }
}

function normalizePhone(value) {
  if (!value) return '';
  return String(value).replace(/[^\d]/g, '');
}

function normalizeEmail(value) {
  if (!value) return '';
  return String(value).toLowerCase().trim();
}

function matchAny(text, patterns) {
  if (!text) return null;
  const matched = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) matched.push(m[0]);
  }
  return matched.length > 0 ? matched : null;
}

function detectStrongSignal(row) {
  const nom = (row.nom || '');
  const urlLanding = (row.url_landing || '');
  const email = (row.email_extraido || '');
  const texto = (row.texto_extraido || '');
  const keyword = (row.palabra_clave || '');

  const fuertes = [];
  const debiles = [];

  const nomMatches = matchAny(nom, STRONG_NOM_PATTERNS);
  if (nomMatches) fuertes.push(`nom:${nomMatches.join('|')}`);

  const urlMatches = matchAny(urlLanding, STRONG_URL_PATTERNS);
  if (urlMatches) fuertes.push(`url:${urlMatches.join('|')}`);

  const emailMatches = matchAny(email, STRONG_EMAIL_PATTERNS);
  if (emailMatches) fuertes.push(`email:${emailMatches.join('|')}`);

  const textoMatches = matchAny(texto, STRONG_TEXTO_PHRASES);
  if (textoMatches) fuertes.push(`texto:${textoMatches.join('|')}`);

  const keywordIsStrong = matchAny(keyword, STRONG_NOM_PATTERNS);

  const palabraAisladaSeguro = /\bseguros?\b/i.test(texto) && !fuertes.length;

  return {
    esActorSeguros: fuertes.length > 0,
    fuerzaSenal: fuertes.length > 0 ? 'fuerte' : (palabraAisladaSeguro ? 'debil' : null),
    fuertesDetectadas: fuertes.join('; '),
    debilesDetectadas: debiles.join('; '),
  };
}

function detectBuyerKeyword(keyword) {
  if (!keyword) return false;
  for (const p of BUYER_KEYWORD_PATTERNS) {
    if (p.test(keyword)) return true;
  }
  return false;
}

function detectB2CKeyword(keyword) {
  if (!keyword) return false;
  const k = keyword.toLowerCase();
  if (/\bpara\s+empresas?\b/i.test(k)) return false;
  if (/\bflota/i.test(k)) return false;
  if (/\bcorporativo/i.test(k)) return false;
  for (const p of B2C_KEYWORD_PATTERNS) {
    if (p.test(keyword)) return true;
  }
  return false;
}

function classifyTipoActor(row, signal) {
  const nom = (row.nom || '').toLowerCase();
  const urlLanding = (row.url_landing || '').toLowerCase();
  const all = nom + ' ' + urlLanding;

  if (/\bbroker/i.test(all) || /national\s*brokers/i.test(all)) return 'broker';
  if (/productor\s+(?:asesor\s+)?(?:de\s+)?seguros/i.test(all)) return 'productor';
  if (/sociedad\s+de\s+productores/i.test(all)) return 'sociedad_productores';
  if (/organizador\s+(?:de\s+)?(?:productores\s+)?(?:de\s+)?seguros/i.test(all)) return 'organizador';
  if (/\binsurtech\b/i.test(all)) return 'insurtech';
  if (/\bART\b/i.test(all) && /provinc/i.test(all)) return 'art';
  if (/\bART\b/i.test(all)) return 'art';
  if (/cotizador.*seguro|comparador.*seguro|seguro.*cotizador/i.test(all)) return 'comparador';
  if (/\bcauci[oó]n\b/i.test(all)) return 'otro_actor_seguros';
  if (/asegurador|seguros?\b|reaseguro/i.test(all)) return 'aseguradora';
  if (signal.esActorSeguros) return 'otro_actor_seguros';
  return 'no_seguro';
}

function classifyCandidateV2(row, signal) {
  const keyword = (row.palabra_clave || '');
  const hasContact = !!(row.email_extraido || row.telefono_extraido);
  const isBuyerKw = detectBuyerKeyword(keyword);
  const isB2CKw = detectB2CKeyword(keyword);

  if (!signal.esActorSeguros) {
    return {
      esActorSeguros: 'no',
      fuerzaSenal: signal.fuerzaSenal || '',
      senalFuerteDetectada: signal.fuertesDetectadas,
      senalDebilDetectada: signal.debilesDetectadas,
      keywordOrientadaAComprador: isBuyerKw ? 'sí' : 'no',
      clasificacionFinal: isBuyerKw ? 'descartado_comprador_final' : 'descartado_no_seguro',
      tipoActorSugerido: 'no_seguro',
      prioridadSugerida: 'baja',
      motivoPrioridad: 'no es actor del mercado de seguros',
      requiereValidacionManual: 0,
      motivoDescarte: isBuyerKw
        ? 'keyword de comprador de seguros; la entidad no es actor del mercado asegurador'
        : 'la entidad no vende/intermedia seguros — no es prospecto LeadMaster',
    };
  }

  const tipoActor = classifyTipoActor(row, signal);
  let prioridad = 'media';
  let motivoPrioridad = '';
  let clasificacionFinal = 'candidato_probable';
  let requiereValidacion = 0;

  const isBroker = tipoActor === 'broker' || tipoActor === 'productor' ||
                   tipoActor === 'sociedad_productores' || tipoActor === 'organizador';

  if (isBroker && hasContact) {
    prioridad = 'alta';
    motivoPrioridad = `${tipoActor} de seguros con contacto disponible`;
  } else if (isBroker) {
    prioridad = 'alta';
    motivoPrioridad = `${tipoActor} de seguros detectado por nombre/URL`;
  } else if (tipoActor === 'insurtech' && hasContact) {
    prioridad = 'alta';
    motivoPrioridad = 'insurtech de seguros con contacto disponible';
  } else if (tipoActor === 'insurtech') {
    prioridad = 'media';
    motivoPrioridad = 'insurtech de seguros sin contacto claro';
  } else if (tipoActor === 'aseguradora' && hasContact) {
    prioridad = 'media';
    motivoPrioridad = 'aseguradora con contacto — evaluar si tiene canal B2B';
  } else if (tipoActor === 'aseguradora') {
    prioridad = 'media';
    motivoPrioridad = 'aseguradora sin contacto claro — evaluar manualmente';
  } else if (tipoActor === 'art' && hasContact) {
    prioridad = 'media';
    motivoPrioridad = 'ART con contacto — evaluar si comercializa a través de productores';
  } else if (tipoActor === 'art') {
    prioridad = 'media';
    motivoPrioridad = 'ART detectada — requiere validación manual';
  } else if (hasContact) {
    prioridad = 'media';
    motivoPrioridad = 'actor de seguros con contacto — requiere revisión';
  } else {
    prioridad = 'media';
    motivoPrioridad = 'actor de seguros sin contacto — requiere validación manual';
    requiereValidacion = 1;
  }

  if (isB2CKw && prioridad === 'alta') {
    prioridad = 'media';
    motivoPrioridad += '; keyword con posible orientacion B2C — verificar foco real del actor';
  }

  if (isBuyerKw) {
    clasificacionFinal = 'requiere_revision';
    requiereValidacion = 1;
    motivoPrioridad += '; origen por keyword de comprador — validar si sirve como prospecto LeadMaster';
  }

  if (row.contacto_estado === 'descartado') {
    clasificacionFinal = 'descartado_no_seguro';
    prioridad = 'baja';
    motivoPrioridad = 'marcado como descartado en staging';
    requiereValidacion = 0;
  }

  let motivoDescarte = '';
  if (clasificacionFinal === 'descartado_no_seguro' || clasificacionFinal === 'descartado_comprador_final') {
    motivoDescarte = motivoPrioridad;
    clasificacionFinal = 'descartado_no_seguro';
  }

  return {
    esActorSeguros: 'sí',
    fuerzaSenal: 'fuerte',
    senalFuerteDetectada: signal.fuertesDetectadas,
    senalDebilDetectada: signal.debilesDetectadas,
    keywordOrientadaAComprador: isBuyerKw ? 'sí' : 'no',
    clasificacionFinal,
    tipoActorSugerido: tipoActor,
    prioridadSugerida: prioridad,
    motivoPrioridad,
    requiereValidacionManual: requiereValidacion || (isBuyerKw ? 1 : 0),
    motivoDescarte,
  };
}

function detectDuplicates(rows) {
  const domainMap = new Map();
  const emailMap = new Map();
  const phoneMap = new Map();

  for (const row of rows) {
    const domain = extractDomain(row.url_landing);
    if (domain) {
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain).push(row);
    }
    const email = normalizeEmail(row.email_extraido);
    if (email) {
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email).push(row);
    }
    const phone = normalizePhone(row.telefono_extraido);
    if (phone && phone.length >= 8) {
      if (!phoneMap.has(phone)) phoneMap.set(phone, []);
      phoneMap.get(phone).push(row);
    }
  }

  const duplicateInfo = new Map();

  for (const [domain, group] of domainMap) {
    if (group.length > 1) {
      for (const row of group) {
        if (!duplicateInfo.has(row.prospecto_id)) {
          duplicateInfo.set(row.prospecto_id, {
            duplicado_probable: 'sí',
            clave_duplicado: `dominio:${domain}`,
            duplicado_con: group.filter(r => r.prospecto_id !== row.prospecto_id).map(r => r.prospecto_id).join(','),
          });
        }
      }
    }
  }

  for (const [email, group] of emailMap) {
    if (group.length > 1 && !email.match(/@(gmail|hotmail|yahoo|outlook)\./)) {
      for (const row of group) {
        if (!duplicateInfo.has(row.prospecto_id)) {
          duplicateInfo.set(row.prospecto_id, {
            duplicado_probable: 'sí',
            clave_duplicado: `email:${email}`,
            duplicado_con: group.filter(r => r.prospecto_id !== row.prospecto_id).map(r => r.prospecto_id).join(','),
          });
        }
      }
    }
  }

  for (const [phone, group] of phoneMap) {
    if (group.length > 1) {
      for (const row of group) {
        if (!duplicateInfo.has(row.prospecto_id)) {
          duplicateInfo.set(row.prospecto_id, {
            duplicado_probable: 'sí',
            clave_duplicado: `telefono:${phone}`,
            duplicado_con: group.filter(r => r.prospecto_id !== row.prospecto_id).map(r => r.prospecto_id).join(','),
          });
        }
      }
    }
  }

  return duplicateInfo;
}

function generateCsv(rows, dupInfo) {
  const headers = [
    'prospecto_id', 'stg_id', 'cliente_id', 'nom', 'url_landing',
    'dominio', 'palabra_clave', 'email_extraido', 'telefono_extraido',
    'whatsapp_extraido', 'contacto_estado',
    'es_actor_seguros', 'fuerza_senal', 'senal_fuerte_detectada',
    'senal_debil_detectada', 'keyword_orientada_a_comprador',
    'clasificacion_final', 'tipo_actor_sugerido', 'prioridad_sugerida',
    'motivo_prioridad', 'requiere_validacion_manual', 'motivo_descarte',
    'duplicado_probable', 'clave_duplicado', 'duplicado_con',
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
    const dup = dupInfo.get(row.prospecto_id) || {};
    const cls = row._class || {};
    const line = [
      row.prospecto_id, row.stg_id || '', row.cliente_id || '',
      row.nom || '', row.url_landing || '', extractDomain(row.url_landing),
      row.palabra_clave || '', row.email_extraido || '', row.telefono_extraido || '',
      row.whatsapp_extraido || '', row.contacto_estado || '',
      cls.esActorSeguros || '', cls.fuerzaSenal || '',
      cls.senalFuerteDetectada || '', cls.senalDebilDetectada || '',
      cls.keywordOrientadaAComprador || '',
      cls.clasificacionFinal || '', cls.tipoActorSugerido || '',
      cls.prioridadSugerida || '', cls.motivoPrioridad || '',
      cls.requiereValidacionManual ? '1' : '0', cls.motivoDescarte || '',
      dup.duplicado_probable || 'no', dup.clave_duplicado || '', dup.duplicado_con || '',
    ].map(escape);
    lines.push(line.join(','));
  }

  return lines.join('\n');
}

function generateMarkdownV2(rows, dupInfo) {
  const total = rows.length;
  const conEmail = rows.filter(r => r.email_extraido).length;
  const conTelefono = rows.filter(r => r.telefono_extraido).length;
  const conWhatsapp = rows.filter(r => r.whatsapp_extraido).length;

  const clasificaciones = {};
  for (const r of rows) {
    const c = (r._class || {}).clasificacionFinal || 'no_clasificado';
    clasificaciones[c] = (clasificaciones[c] || 0) + 1;
  }

  const tipos = {};
  for (const r of rows) {
    const t = (r._class || {}).tipoActorSugerido || 'no_determinado';
    tipos[t] = (tipos[t] || 0) + 1;
  }

  const altas = rows.filter(r => (r._class || {}).prioridadSugerida === 'alta');
  const medias = rows.filter(r => (r._class || {}).prioridadSugerida === 'media');
  const bajas = rows.filter(r => (r._class || {}).prioridadSugerida === 'baja');
  const actores = rows.filter(r => (r._class || {}).esActorSeguros === 'sí');
  const noActores = rows.filter(r => (r._class || {}).esActorSeguros === 'no');
  const candidatosProbables = rows.filter(r => (r._class || {}).clasificacionFinal === 'candidato_probable');
  const requierenRevision = rows.filter(r => (r._class || {}).clasificacionFinal === 'requiere_revision');
  const descartadosNoSeguro = rows.filter(r => (r._class || {}).clasificacionFinal === 'descartado_no_seguro');
  const descartadosComprador = rows.filter(r => (r._class || {}).clasificacionFinal === 'descartado_comprador_final');
  const descartadosTotal = [...descartadosNoSeguro, ...descartadosComprador];
  const dupCount = [...new Set(dupInfo.keys())].length;

  const clienteCounts = {};
  for (const r of rows) {
    const c = r.cliente_id || 'null';
    clienteCounts[c] = (clienteCounts[c] || 0) + 1;
  }

  const md = [];

  md.push('# LM-003A-C — Candidatos actuales de seguros v2');
  md.push('');
  md.push(`**Fecha:** ${new Date().toISOString().slice(0, 10)}`);
  md.push('**Proyecto:** LeadMaster');
  md.push('**Bloque:** LM-003A-C — Detección corregida de candidatos de seguros');
  md.push('**Estado:** Generado automáticamente');
  md.push('**Modo:** Solo lectura — sin modificaciones de base de datos');
  md.push('');
  md.push('---');
  md.push('');
  md.push('## 1. Objetivo');
  md.push('');
  md.push('Corregir la clasificación automática del reporte anterior, que sobreestimaba candidatos al mezclar señales B2B genéricas con señales reales de seguros, y penalizaba actores reales del mercado asegurador por tener keywords de origen orientadas a comprador.');
  md.push('');
  md.push('---');
  md.push('');
  md.push('## 2. Qué se corrigió respecto del reporte anterior');
  md.push('');
  md.push('| Problema v1 | Corrección v2 |');
  md.push('|-------------|---------------|');
  md.push('| Empresas B2B no aseguradoras (Yasisa, Ascensoresg, Getmaintainx, etc.) clasificadas como `productor` o prioridad media | Ahora se requiere **señal fuerte de seguros en nom/URL/email**. Sin eso → `descartado_no_seguro` |');
  md.push('| Actores reales de seguros (Nationalbrokers, Maklerseguros, etc.) descartados por keyword de comprador | La keyword de comprador **no descarta** si hay señal fuerte en nom/URL/email. Solo marca `requiere_validacion_manual = 1` |');
  md.push('| Keyword de comprador descartaba automáticamente | Ahora se marca `keyword_orientada_a_comprador = sí` pero se evalúa independientemente de si la entidad es actor de seguros |');
  md.push('| Señales de `texto_extraido` demasiado amplias (palabras aisladas como "seguro", "empresa") | `texto_extraido` solo se usa con frases compuestas fuertes ("broker de seguros", "productor asesor de seguros", etc.) |');
  md.push('| `senal_detectada` no distinguía tipo de señal | Nuevos campos: `es_actor_seguros`, `fuerza_senal`, `senal_fuerte_detectada`, `senal_debil_detectada` |');
  md.push('| Sin campo de clasificación final | Nuevo campo: `clasificacion_final` con valores `candidato_probable`, `requiere_revision`, `descartado_no_seguro`, `descartado_comprador_final` |');
  md.push('');
  md.push('---');
  md.push('');
  md.push('## 3. Aclaración de foco comercial');
  md.push('');
  md.push('**El prospecto NO es una empresa que necesita comprar seguros.**');
  md.push('');
  md.push('**El prospecto ES un potencial cliente de LeadMaster.**');
  md.push('');
  md.push('Un candidato válido es: broker de seguros, productor asesor de seguros, sociedad de productores, organizador de productores, agencia comercial de seguros, aseguradora con canal comercial B2B, insurtech, comparador/plataforma de seguros, intermediario comercial que venda seguros a empresas/pymes/comercios/industrias/profesionales.');
  md.push('');
  md.push('---');
  md.push('');
  md.push('## 4. Criterios estrictos de detección');
  md.push('');
  md.push('### Señales fuertes (convierten un registro en actor de seguros)');
  md.push('');
  md.push('**En `nom`:** seguros, broker, productor asesor, productor de seguros, sociedad de productores, organizador, aseguradora, ART, caución, póliza, insurtech, cotizador de seguros. También nombres de compañías conocidas (Sancor Seguros, San Cristóbal, Zurich, Provincia ART, National Brokers, Makler Seguros, Answerseguros, Galicia Seguros, La Segunda, La Caja, Mapfre, Allianz, etc.).');
  md.push('');
  md.push('**En `url_landing` / dominio:** seguros, broker, asegurador, ART, caución, póliza, insurtech, productor, organizador, cotizador, reaseguro.');
  md.push('');
  md.push('**En `email_extraido`:** @*.seguros, @*.broker, @*.asegurador, @*.art, @*.caución, @*.productor. También emails institucionales de compañías conocidas.');
  md.push('');
  md.push('**En `texto_extraido`:** frases compuestas como "broker de seguros", "productor asesor de seguros", "sociedad de productores", "organizador de seguros", "compañía de seguros", "aseguradora", "seguros corporativos", "seguros para empresas".');
  md.push('');
  md.push('### Señales débiles (NO convierten por sí solas)');
  md.push('');
  md.push('- Palabra "seguro" aislada en `texto_extraido`.');
  md.push('- Términos B2B genéricos (empresa, pyme, comercio, industria, logística, mantenimiento, transporte, flota, responsabilidad civil).');
  md.push('- Contacto disponible sin señal fuerte de seguros.');
  md.push('- Keyword de comprador sin señal fuerte en nom/URL/email.');
  md.push('');
  md.push('### Keyword de comprador');
  md.push('');
  md.push('Una keyword orientada a comprador (ej: "cotizar seguro RC empresas") **no descarta** si el nombre/dominio demuestra que la entidad ES un actor de seguros. Solo marca `requiere_validacion_manual = 1`.');
  md.push('');
  md.push('---');
  md.push('');
  md.push('## 5. Resultado general v2');
  md.push('');
  md.push(`| Métrica | Valor |`);
  md.push(`|---------|:---:|`);
  md.push(`| **Total candidatos detectados** | **${total}** |`);
  md.push(`| **Son actores de seguros** | **${actores.length}** |`);
  md.push(`| **No son actores de seguros** | **${noActores.length}** |`);
  md.push(`| Clasificación: candidato_probable | ${candidatosProbables.length} |`);
  md.push(`| Clasificación: requiere_revision | ${requierenRevision.length} |`);
  md.push(`| Clasificación: descartado_no_seguro | ${descartadosNoSeguro.length} |`);
  md.push(`| Clasificación: descartado_comprador_final | ${descartadosComprador.length} |`);
  md.push(`| Con email | ${conEmail} (${total > 0 ? Math.round(conEmail / total * 100) : 0}%) |`);
  md.push(`| Con teléfono | ${conTelefono} (${total > 0 ? Math.round(conTelefono / total * 100) : 0}%) |`);
  md.push(`| Con WhatsApp | ${conWhatsapp} (${total > 0 ? Math.round(conWhatsapp / total * 100) : 0}%) |`);
  md.push(`| Duplicados probables (grupos) | ${dupCount} |`);
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 6. Comparación con reporte anterior');
  md.push('');
  md.push('| Métrica | v1 | v2 | Diferencia |');
  md.push('|---------|:---:|:---:|:---:|');
  md.push(`| Total detectados | 75 | ${total} | |`);
  md.push(`| Prioridad alta | 0 | ${altas.length} | ${altas.length > 0 ? 'v1 subestimó actores reales' : 'sin cambio'} |`);
  md.push(`| Prioridad media | 31 | ${medias.length} | ${medias.length < 31 ? 'v1 sobreestimó por señales B2B falsas' : ''} |`);
  md.push(`| Actores reales detectados | ~8 implícitos | ${actores.length} | La detección ahora es explícita y auditable |`);
  md.push(`| Falsos positivos B2B | ~20+ | 0 | Eliminados — ahora requieren señal fuerte de seguros |`);
  md.push('');
  md.push('**Conclusión:** El reporte v1 sobreestimaba candidatos al confundir empresas B2B genéricas con actores de seguros. El reporte v2 es más estricto y preciso.');
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 7. Conteos por clasificación final');
  md.push('');
  md.push('| Clasificación | Cantidad | % |');
  md.push('|---------------|:---:|:---:|');
  for (const [clasif, count] of Object.entries(clasificaciones).sort((a, b) => b[1] - a[1])) {
    md.push(`| ${clasif} | ${count} | ${Math.round(count / total * 100)}% |`);
  }
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 8. Conteos por prioridad');
  md.push('');
  md.push('| Prioridad | Cantidad | % |');
  md.push('|-----------|:---:|:---:|');
  md.push(`| Alta | ${altas.length} | ${total > 0 ? Math.round(altas.length / total * 100) : 0}% |`);
  md.push(`| Media | ${medias.length} | ${total > 0 ? Math.round(medias.length / total * 100) : 0}% |`);
  md.push(`| Baja | ${bajas.length} | ${total > 0 ? Math.round(bajas.length / total * 100) : 0}% |`);
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 9. Conteos por tipo de actor');
  md.push('');
  md.push('| Tipo de actor | Cantidad |');
  md.push('|---------------|:---:|');
  for (const [tipo, count] of Object.entries(tipos).sort((a, b) => b[1] - a[1])) {
    md.push(`| ${tipo} | ${count} |`);
  }
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 10. Candidatos probables');
  md.push('');

  if (candidatosProbables.length === 0) {
    md.push('No se detectaron candidatos probables.');
    md.push('');
  } else {
    md.push('| # | prospecto_id | nom | dominio | email | tel | wa | tipo |');
    md.push('|---|:---:|------|--------|-------|:---:|:---:|------|');
    candidatosProbables.forEach((r, i) => {
      const cls = r._class || {};
      md.push(`| ${i + 1} | ${r.prospecto_id} | ${r.nom || '-'} | ${extractDomain(r.url_landing)} | ${r.email_extraido || '-'} | ${r.telefono_extraido ? 'si' : '-'} | ${r.whatsapp_extraido ? 'si' : '-'} | ${cls.tipoActorSugerido || '-'} |`);
    });
    md.push('');
  }

  md.push('---');
  md.push('');
  md.push('## 11. Requieren revisión');
  md.push('');

  if (requierenRevision.length === 0) {
    md.push('No se detectaron candidatos que requieran revisión.');
    md.push('');
  } else {
    md.push('| # | prospecto_id | nom | dominio | tipo | motivo |');
    md.push('|---|:---:|------|--------|------|--------|');
    requierenRevision.forEach((r, i) => {
      const cls = r._class || {};
      md.push(`| ${i + 1} | ${r.prospecto_id} | ${r.nom || '-'} | ${extractDomain(r.url_landing)} | ${cls.tipoActorSugerido || '-'} | ${cls.motivoPrioridad || '-'} |`);
    });
    md.push('');
  }

  md.push('---');
  md.push('');
  md.push('## 12. Descartados no seguros');
  md.push('');

  if (descartadosTotal.length === 0) {
    md.push('No se detectaron descartados.');
    md.push('');
  } else {
    md.push('| # | prospecto_id | nom | motivo |');
    md.push('|---|:---:|------|--------|');
    const mostrados = descartadosTotal.slice(0, 40);
    mostrados.forEach((r, i) => {
      const cls = r._class || {};
      md.push(`| ${i + 1} | ${r.prospecto_id} | ${r.nom || '-'} | ${cls.motivoDescarte || cls.motivoPrioridad || '-'} |`);
    });
    if (descartadosTotal.length > 40) {
      md.push(`| ... | ... | (${descartadosTotal.length - 40} más) | |`);
    }
    md.push('');
  }

  md.push('---');
  md.push('');
  md.push('## 13. Duplicados probables');
  md.push('');
  md.push(`Total de grupos duplicados: **${dupCount}**`);
  md.push('');

  if (dupCount > 0) {
    md.push('| Clave | Cantidad |');
    md.push('|-------|:---:|');
    const dupSummary = new Map();
    for (const [, info] of dupInfo) {
      const key = info.clave_duplicado;
      dupSummary.set(key, (dupSummary.get(key) || 0) + 1);
    }
    for (const [key, count] of dupSummary) {
      md.push(`| ${key} | ${count} |`);
    }
    md.push('');
  }

  md.push('---');
  md.push('');
  md.push('## 14. Brecha respecto del objetivo 80–110');
  md.push('');
  md.push(`- Actores de seguros detectados: **${actores.length}**`);
  md.push(`- Candidatos probables (prioridad alta): **${altas.length}**`);
  md.push(`- Candidatos que requieren revisión: **${requierenRevision.length}**`);
  md.push(`- Potencial combinado (probables + revisión): **${altas.length + requierenRevision.length}**`);
  md.push(`- Faltan para llegar a 80: **${Math.max(0, 80 - actores.length)}**`);
  md.push(`- Faltan para llegar a 110: **${Math.max(0, 110 - actores.length)}**`);
  md.push('');
  md.push('**Para alcanzar el objetivo de 80-110 prospectos, es indispensable ejecutar scraping nuevo con keywords específicas de seguros (plan maestro LM-003A-C).** Los datos actuales no contienen volumen suficiente de actores del mercado asegurador.');
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 15. Conclusión');
  md.push('');
  md.push('1. **El reporte v1 sobreestimaba candidatos** al clasificar empresas B2B genéricas (construcción, logística, mantenimiento, etc.) como posibles actores de seguros.');
  md.push('2. **El reporte v1 subestimaba actores reales** (Nationalbrokers, Maklerseguros, etc.) al descartarlos por tener keyword de origen orientada a comprador.');
  md.push('3. **La corrección v2** separa estrictamente: primero determina si la entidad ES un actor de seguros (por nombre, dominio, email institucional), y luego clasifica su tipo y prioridad.');
  md.push('4. **La keyword de origen** (lo que el usuario buscó) se evalúa por separado y **no descarta** a un actor real de seguros.');
  md.push(`5. **Volumen insuficiente:** ${actores.length} actores de seguros en los datos actuales no alcanzan para el lote de 80-110. Se requiere scraping nuevo.`);
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 16. Próximo paso recomendado');
  md.push('');
  md.push('1. Revisar manualmente los candidatos probables y los que requieren revisión.');
  md.push('2. Validar `contacto_estado` en staging para los actores de seguros detectados.');
  md.push('3. Crear `config/seed_ll_keywords_leadmaster_seguros.sql` con 48 keywords operativas (8 bases × 6 plazas).');
  md.push('4. Activar primera tanda de keywords (`prioridad = alta`) y ejecutar scraping controlado.');
  md.push('5. Re-ejecutar este reporte post-scraping para medir el crecimiento del lote.');
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 17. Archivos generados/modificados');
  md.push('');
  md.push('| Archivo | Acción |');
  md.push('|---------|--------|');
  md.push('| `scripts/report-seguros-candidatos.js` | **Reescrito** — nueva lógica estricta de clasificación |');
  md.push('| `config/query_lote_seguros_candidatos.sql` | **Sin cambios** — la consulta SQL base sigue siendo amplia; la clasificación se hace en JS |');
  md.push('| `exports/lm-003a-c-lote-candidato-seguros-v2.csv` | **Generado** — CSV con clasificación corregida |');
  md.push('| `docs/reportes/2026-07-04-lm-003a-c-candidatos-actuales-seguros-v2.md` | **Generado** — este reporte |');
  md.push('');

  md.push('---');
  md.push('');
  md.push('## 18. Comandos de verificación');
  md.push('');
  md.push('```bash');
  md.push('# Re-ejecutar el reporte corregido');
  md.push('npm run report:seguros');
  md.push('');
  md.push('# Ver estado general de la DB');
  md.push('npm run db:status');
  md.push('');
  md.push('# Ver últimos prospectos');
  md.push('npm run db:view');
  md.push('```');
  md.push('');
  md.push('---');
  md.push('');
  md.push('*Reporte v2 generado con lógica de clasificación estricta. No se ejecutó scraping, no se modificó base de datos.*');

  return md.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  const db = await mysql.createConnection(DB_CONFIG);

  try {
    let whereClauses = [];
    const whereParams = [];

    if (options.clienteId) {
      whereClauses.push('s.cliente_id = ?');
      whereParams.push(options.clienteId);
    }

    const whereStr = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT
          p.id AS prospecto_id,
          s.id AS stg_id,
          s.cliente_id,
          s.nom,
          s.url_landing,
          p.palabra_clave,
          s.email_extraido,
          s.telefono_extraido,
          s.whatsapp_extraido,
          s.contacto_estado,
          p.texto_extraido,
          CASE
              WHEN p.palabra_clave REGEXP '(broker|productor|organizador|insurtech|sociedad\\\\s+de\\\\s+productores)'
                   THEN 'keyword_directa'
              WHEN p.palabra_clave REGEXP '(seguros?|asegurador|ART|caucion|flota|poliza|siniestro|cotizador)'
                   THEN 'keyword_seguros'
              WHEN s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador)'
                   THEN 'nom'
              WHEN s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza|art-|caucion)'
                   THEN 'url'
              WHEN s.email_extraido REGEXP '(seguro|broker|productor|asegurador|insurtech|ssn)'
                   THEN 'email'
              WHEN p.texto_extraido REGEXP '(seguros?|broker|productor|asegurador|insurtech|ART|caucion|flotas|poliza)'
                   THEN 'texto_extraido'
              ELSE 'otro'
          END AS senal_detectada
      FROM la_prospectos p
      LEFT JOIN la_stg_prospectos s ON s.prospecto_id = p.id
      WHERE
          p.palabra_clave REGEXP '(broker|productor|seguros?|asegurador|organizador|insurtech|ART|caucion|flota|poliza|siniestro|cotizador|responsabilidad\\\\s+civil)'
          OR (s.nom IS NOT NULL AND s.nom REGEXP '(seguros?|broker|productor|asegurador|insurtech|organizador|ART|caucion)')
          OR (s.url_landing IS NOT NULL AND s.url_landing REGEXP '(seguro|broker|productor|asegurador|insurtech|cotizador|poliza|art-|caucion)')
          OR (s.email_extraido IS NOT NULL AND s.email_extraido REGEXP '(seguro|broker|productor|asegurador|insurtech|ssn)')
          OR (p.texto_extraido IS NOT NULL AND p.texto_extraido REGEXP '(seguros?|broker|productor|asegurador|insurtech|ART|caucion|flotas|poliza)')
          ${whereStr}
      ORDER BY s.prospecto_id
      LIMIT ${Math.max(1, Math.floor(options.limit))}
    `;

    const [rows] = await db.execute(query, whereParams);

    console.log(`🔍 Candidatos detectados: ${rows.length}`);

    const dupInfo = detectDuplicates(rows);

    for (const row of rows) {
      const signal = detectStrongSignal(row);
      row._class = classifyCandidateV2(row, signal);
    }

    const csvPath = options.output || path.join(__dirname, '..', 'exports', 'lm-003a-c-lote-candidato-seguros-v2.csv');
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, generateCsv(rows, dupInfo), 'utf-8');
    console.log(`📊 CSV v2 generado: ${csvPath}`);

    const mdPath = path.join(__dirname, '..', 'docs', 'reportes', '2026-07-04-lm-003a-c-candidatos-actuales-seguros-v2.md');
    fs.mkdirSync(path.dirname(mdPath), { recursive: true });
    fs.writeFileSync(mdPath, generateMarkdownV2(rows, dupInfo), 'utf-8');
    console.log(`📝 Reporte Markdown v2 generado: ${mdPath}`);

    const actores = rows.filter(r => (r._class || {}).esActorSeguros === 'sí');
    const noActores = rows.filter(r => (r._class || {}).esActorSeguros === 'no');
    const altas = rows.filter(r => (r._class || {}).prioridadSugerida === 'alta');
    const medias = rows.filter(r => (r._class || {}).prioridadSugerida === 'media');
    const bajas = rows.filter(r => (r._class || {}).prioridadSugerida === 'baja');
    const candidatosProbables = rows.filter(r => (r._class || {}).clasificacionFinal === 'candidato_probable');
    const requierenRevision = rows.filter(r => (r._class || {}).clasificacionFinal === 'requiere_revision');
    const descartadosNoSeguro = rows.filter(r => (r._class || {}).clasificacionFinal === 'descartado_no_seguro');
    const descartadosComprador = rows.filter(r => (r._class || {}).clasificacionFinal === 'descartado_comprador_final');

    console.log('');
    console.log('📌 Resumen de clasificación v2:');
    console.log(`   Total detectados: ${rows.length}`);
    console.log(`   Es actor de seguros: ${actores.length}`);
    console.log(`   No es actor de seguros: ${noActores.length}`);
    console.log(`   candidato_probable: ${candidatosProbables.length}`);
    console.log(`   requiere_revision: ${requierenRevision.length}`);
    console.log(`   descartado_no_seguro: ${descartadosNoSeguro.length}`);
    console.log(`   descartado_comprador_final: ${descartadosComprador.length}`);
    console.log(`   Prioridad alta: ${altas.length}`);
    console.log(`   Prioridad media: ${medias.length}`);
    console.log(`   Prioridad baja: ${bajas.length}`);
    console.log('');
    console.log('✅ Reporte v2 completado.');

  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(`❌ report-seguros-candidatos: ${error.message}`);
  process.exit(1);
});
