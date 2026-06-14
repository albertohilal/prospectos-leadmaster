#!/usr/bin/env node

/**
 * API REST para Prospectos LeadMaster
 * 
 * Endpoints para recibir prospectos desde scripts locales
 * y gestionar base de datos MySQL.
 */

// Cargar variables de entorno
require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');
const config = require('../shared/config');
const {
  getPrimaryDbConnection,
  getOperationalDbConnection
} = require('../shared/db');

const app = express();
const PORT = config.api.port;
const HOST = config.api.host;

// Middleware
app.use(cors({
  origin: config.api.corsOrigin
}));
app.use(bodyParser.json({ limit: '10mb' })); // Para recibir imágenes base64
app.use(bodyParser.urlencoded({ extended: true }));

// Conexión a MySQL
let dbConnection;

async function initDatabase() {
  try {
    dbConnection = await getPrimaryDbConnection();
    const operationalConnection = await getOperationalDbConnection();
    console.log(`✅ API: Conectado a MySQL (${config.db.database})`);
    console.log(`✅ API: Conectado a MySQL operativo (${config.operationalDb.database})`);
    console.log(`🕒 API: Zona horaria SQL activa (${config.dbSessionTimeZone})`);
    await operationalConnection.end();
  } catch (error) {
    console.error('❌ API: Error conectando a MySQL:', error.message);
    process.exit(1);
  }
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function normalizeManualEmail(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function isValidEmail(value) {
  return !!value && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(value);
}

function normalizePhoneDigits(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const digits = String(value).replace(/\D/g, '');
  return digits || null;
}

function isValidPhoneDigits(value) {
  if (!value) {
    return false;
  }

  if (value.length < 8 || value.length > 15) {
    return false;
  }

  return !/^(\d)\1{7,}$/.test(value);
}

function buildPendingReasons(row) {
  const reasons = [];
  const hasEmail = !isBlank(row.email_extraido);
  const hasTelefono = !isBlank(row.telefono_extraido);
  const hasWhatsapp = !isBlank(row.whatsapp_extraido);
  const hasError = !isBlank(row.error_msg);

  if (!hasEmail) {
    reasons.push('sin_email');
  }
  if (hasError) {
    reasons.push('con_error_msg');
  }
  if (!hasEmail && hasTelefono) {
    reasons.push('con_telefono_sin_email');
  }
  if (!hasEmail && hasWhatsapp) {
    reasons.push('con_whatsapp_sin_email');
  }

  return reasons;
}

function collectManualCorrections(payload) {
  const corrections = [];
  const errors = [];

  const emailRaw = payload.email_extraido ?? payload.email;
  const telefonoRaw = payload.telefono_extraido ?? payload.telefono;
  const whatsappRaw = payload.whatsapp_extraido ?? payload.whatsapp;

  const email = normalizeManualEmail(emailRaw);
  if (email) {
    if (!isValidEmail(email)) {
      errors.push('email inválido');
    } else {
      corrections.push({
        type: 'email',
        field: 'email_extraido',
        value: email,
        normalizedValue: email
      });
    }
  }

  const telefonoDigits = normalizePhoneDigits(telefonoRaw);
  if (telefonoDigits) {
    if (!isValidPhoneDigits(telefonoDigits)) {
      errors.push('telefono inválido');
    } else {
      corrections.push({
        type: 'telefono',
        field: 'telefono_extraido',
        value: String(telefonoRaw).trim(),
        normalizedValue: telefonoDigits
      });
    }
  }

  const whatsappDigits = normalizePhoneDigits(whatsappRaw);
  if (whatsappDigits) {
    if (!isValidPhoneDigits(whatsappDigits)) {
      errors.push('whatsapp inválido');
    } else {
      corrections.push({
        type: 'whatsapp',
        field: 'whatsapp_extraido',
        value: String(whatsappRaw).trim(),
        normalizedValue: whatsappDigits
      });
    }
  }

  return { corrections, errors };
}

async function upsertManualContact(connection, stageRow, correction) {
  await connection.execute(
    `UPDATE la_stg_prospectos_contactos
     SET es_principal = 0,
         updated_at = CURRENT_TIMESTAMP
     WHERE stg_prospecto_id = ?
       AND tipo = ?`,
    [stageRow.id, correction.type]
  );

  const [existingRows] = await connection.execute(
    `SELECT tipo
     FROM la_stg_prospectos_contactos
     WHERE stg_prospecto_id = ?
       AND tipo = ?
       AND valor_normalizado = ?
     LIMIT 1`,
    [stageRow.id, correction.type, correction.normalizedValue]
  );

  if (existingRows.length > 0) {
    await connection.execute(
      `UPDATE la_stg_prospectos_contactos
       SET valor = ?,
           valor_normalizado = ?,
           es_principal = 1,
           fuente = 'manual',
           url_fuente = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE stg_prospecto_id = ?
         AND tipo = ?
         AND valor_normalizado = ?`,
      [
        correction.value,
        correction.normalizedValue,
        stageRow.url_landing || null,
        stageRow.id,
        correction.type,
        correction.normalizedValue
      ]
    );
    return;
  }

  await connection.execute(
    `INSERT INTO la_stg_prospectos_contactos
       (stg_prospecto_id, prospecto_id, tipo, valor, valor_normalizado, es_principal, fuente, url_fuente)
     VALUES (?, ?, ?, ?, ?, 1, 'manual', ?)`,
    [
      stageRow.id,
      stageRow.prospecto_id,
      correction.type,
      correction.value,
      correction.normalizedValue,
      stageRow.url_landing || null
    ]
  );
}

/**
 * Guardar screenshot en disco (si se envía como base64)
 */
async function saveScreenshot(base64Data, filename) {
  try {
    const screenshotsDir = config.paths.screenshotsDir;
    await fs.mkdir(screenshotsDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotsDir, filename);
    
    // Decodificar base64 (eliminar prefijo data:image/png;base64, si existe)
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    await fs.writeFile(screenshotPath, imageBuffer);
    console.log(`📸 Screenshot guardado: ${screenshotPath}`);
    
    return screenshotPath;
  } catch (error) {
    console.error('❌ Error guardando screenshot:', error.message);
    return null;
  }
}

/**
 * Extraer texto de imagen usando OCR
 */
async function extractTextFromImage(imagePath) {
  try {
    console.log(`🔠 Extrayendo texto con OCR: ${imagePath}`);
    
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      config.ocr.languages,
      {
        logger: info => {
          if (info.status === 'recognizing text' && config.ocr.logger) {
            console.log(`OCR progreso: ${info.progress * 100}%`);
          }
        }
      }
    );
    
    const cleanedText = text.trim();
    console.log(`✅ Texto extraído: ${cleanedText.length} caracteres`);
    
    return cleanedText;
  } catch (error) {
    console.error('❌ Error en OCR:', error.message);
    return null;
  }
}

/**
 * Guardar prospecto en base de datos
 */
async function saveProspecto(prospectoData) {
  const {
    palabra_clave,
    url_anuncio,
    url_landing,
    texto_extraido,
    screenshot_path,
    metadata
  } = prospectoData;
  
  try {
    const query = `
      INSERT INTO la_prospectos 
      (palabra_clave, url_anuncio, url_landing, texto_extraido, metadata) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await dbConnection.execute(query, [
      palabra_clave,
      url_anuncio,
      url_landing,
      texto_extraido,
      JSON.stringify(metadata || {})
    ]);
    
    console.log(`✅ Prospecto guardado con ID: ${result.insertId}`);
    return result.insertId;
  } catch (error) {
    console.error('❌ Error guardando prospecto:', error.message);
    throw error;
  }
}

function buildLandingKey(urlValue) {
  try {
    const parsedUrl = new URL(urlValue);
    parsedUrl.hash = '';
    parsedUrl.search = '';
    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '') || '/';
    return `${parsedUrl.origin.toLowerCase()}${normalizedPath}`;
  } catch {
    return (urlValue || '').trim().toLowerCase();
  }
}

async function findDuplicateProspectId(keyword, landingUrl) {
  if (!keyword || !landingUrl) {
    return null;
  }

  const landingKey = buildLandingKey(landingUrl);

  const [rows] = await dbConnection.execute(
    `SELECT id FROM la_prospectos
     WHERE palabra_clave = ?
       AND LOWER(TRIM(TRAILING '/' FROM SUBSTRING_INDEX(url_landing, '?', 1))) = ?
     LIMIT 1`,
    [keyword, landingKey]
  );

  return rows.length > 0 ? rows[0].id : null;
}

// ==================== ENDPOINTS ====================

/**
 * GET /
 * Página de inicio de la API
 */
app.get('/', (req, res) => {
  res.json({
    name: 'LeadMaster API',
    version: '1.0.0',
    description: 'API para recepción de prospectos de anuncios patrocinados',
    endpoints: {
      health: '/api/health',
      prospectos: {
        create: 'POST /api/prospectos',
        list: 'GET /api/prospectos',
        checkProcessed: 'GET /api/prospectos/check-processed?keyword=...&landingUrl=...',
        get: 'GET /api/prospectos/:id',
        validate: 'PUT /api/prospectos/:id/validate'
      }
    },
    documentation: 'Ver docs/GUIA-LOCAL.md para uso del script local'
  });
});

/**
 * POST /api/prospectos
 * Recibe un prospecto desde el script local
 * 
 * Body esperado:
 * {
 *   keyword: "palabra clave",
 *   adUrl: "https://...", (opcional)
 *   landingUrl: "https://...",
 *   screenshotBase64: "data:image/png;base64,..." (opcional)
 * }
 */
app.post('/api/prospectos', async (req, res) => {
  console.log('📥 Recibiendo nuevo prospecto...');
  
  try {
    const { keyword, adUrl, landingUrl, screenshotBase64 } = req.body;
    const normalizedLandingUrl = typeof landingUrl === 'string' ? landingUrl.trim() : '';
    
    if (!keyword || !normalizedLandingUrl) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: keyword y landingUrl'
      });
    }
    
    let screenshotPath = null;
    let extractedText = null;
    
    // 1. Verificar duplicado en base de datos
    let duplicateId = null;
    if (normalizedLandingUrl) {
      try {
        duplicateId = await findDuplicateProspectId(keyword, normalizedLandingUrl);
        if (duplicateId) {
          console.log(`⚠️  Duplicado detectado: keyword + URL ya existe con ID ${duplicateId}`);
        }
      } catch (dbError) {
        console.error('❌ Error verificando duplicados:', dbError.message);
        // Continuar de todos modos
      }
    }
    
    // Si es duplicado, responder con advertencia pero procesar igual?
    // Por ahora, rechazamos el duplicado
    if (duplicateId) {
      return res.status(409).json({
        success: false,
        message: 'Prospecto duplicado',
        duplicateSkipped: true,
        data: {
          duplicateId,
          keyword,
          landingUrl: normalizedLandingUrl
        }
      });
    }
    
    // 2. Guardar screenshot si se envió
    if (screenshotBase64) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}-${keyword.substring(0, 20).replace(/\s+/g, '_')}.png`;
      
      screenshotPath = await saveScreenshot(screenshotBase64, filename);
      
      // 3. Extraer texto con OCR
      if (screenshotPath) {
        extractedText = await extractTextFromImage(screenshotPath);
      }
    }
    
    // 4. Preparar metadatos
    const metadata = {
      screenshot_path: screenshotPath,
      received_via: 'api',
      timestamp: new Date().toISOString(),
      user_agent: req.get('User-Agent')
    };
    
    // 5. Guardar en base de datos
    const prospectoData = {
      palabra_clave: keyword,
      url_anuncio: adUrl || null,
      url_landing: normalizedLandingUrl,
      texto_extraido: extractedText,
      screenshot_path: screenshotPath,
      metadata
    };
    
    const prospectoId = await saveProspecto(prospectoData);
    
    // 6. Responder éxito
    res.status(201).json({
      success: true,
      message: 'Prospecto guardado exitosamente',
      duplicateSkipped: false,
      data: {
        id: prospectoId,
        keyword,
        landingUrl: normalizedLandingUrl,
        screenshotSaved: !!screenshotPath,
        textExtracted: !!extractedText,
        textLength: extractedText ? extractedText.length : 0
      }
    });
    
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      try {
        const { landingUrl, keyword } = req.body;
        const normalizedLandingUrl = typeof landingUrl === 'string' ? landingUrl.trim() : '';
        let duplicateId = null;

        if (normalizedLandingUrl) {
          duplicateId = await findDuplicateProspectId(keyword, normalizedLandingUrl);
        }

        return res.status(409).json({
          success: false,
          message: 'Prospecto duplicado',
          duplicateSkipped: true,
          data: {
            duplicateId,
            keyword,
            landingUrl: normalizedLandingUrl
          }
        });
      } catch (lookupError) {
        console.error('❌ Error buscando duplicado tras ER_DUP_ENTRY:', lookupError.message);
        return res.status(409).json({
          success: false,
          message: 'Prospecto duplicado',
          duplicateSkipped: true
        });
      }
    }

    console.error('❌ Error procesando prospecto:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /api/prospectos/check-processed
 * Verifica si ya existe un prospecto para la combinación keyword + landingUrl
 */
app.get('/api/prospectos/check-processed', async (req, res) => {
  try {
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const landingUrl = typeof req.query.landingUrl === 'string' ? req.query.landingUrl.trim() : '';

    if (!keyword || !landingUrl) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: keyword y landingUrl'
      });
    }

    const duplicateId = await findDuplicateProspectId(keyword, landingUrl);

    return res.json({
      success: true,
      processed: !!duplicateId,
      data: {
        duplicateId: duplicateId || null,
        keyword,
        landingUrl
      }
    });
  } catch (error) {
    console.error('❌ Error verificando prospecto procesado:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/prospectos
 * Listar prospectos (paginación básica)
 */
app.get('/api/prospectos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const [rows] = await dbConnection.execute(
      `SELECT id, palabra_clave, url_landing, DATE(created_at) as fecha, 
              LENGTH(texto_extraido) as texto_len, es_valido
       FROM la_prospectos 
       ORDER BY id DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    const [countResult] = await dbConnection.execute(
      'SELECT COUNT(*) as total FROM la_prospectos'
    );
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult[0].total,
        limit,
        offset
      }
    });
    
  } catch (error) {
    console.error('❌ Error listando prospectos:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/prospectos/:id
 * Obtener un prospecto específico
 */
app.get('/api/prospectos/:id', async (req, res) => {
  try {
    const [rows] = await dbConnection.execute(
      `SELECT * FROM la_prospectos WHERE id = ?`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo prospecto:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/prospectos/staging/contactos-pendientes
 * Lista prospectos en staging que requieren correccion manual de contacto.
 */
app.get('/api/prospectos/staging/contactos-pendientes', async (req, res) => {
  let operationalConnection;

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    operationalConnection = await getOperationalDbConnection();

    const [rows] = await operationalConnection.execute(
      `SELECT s.id,
              s.prospecto_id,
              s.cliente_id,
              s.nom,
              s.palabra_clave,
              s.url_landing,
              s.email_extraido,
              s.telefono_extraido,
              s.whatsapp_extraido,
              s.error_msg,
              s.estado,
              s.updated_at,
              COALESCE(c.total_contactos, 0) AS total_contactos,
              COALESCE(c.total_emails, 0) AS total_emails,
              COALESCE(c.total_telefonos, 0) AS total_telefonos,
              COALESCE(c.total_whatsapps, 0) AS total_whatsapps,
              c.email_principal_contacto,
              c.telefono_principal_contacto,
              c.whatsapp_principal_contacto
       FROM la_stg_prospectos s
       LEFT JOIN (
         SELECT stg_prospecto_id,
                COUNT(*) AS total_contactos,
                SUM(CASE WHEN tipo = 'email' THEN 1 ELSE 0 END) AS total_emails,
                SUM(CASE WHEN tipo = 'telefono' THEN 1 ELSE 0 END) AS total_telefonos,
                SUM(CASE WHEN tipo = 'whatsapp' THEN 1 ELSE 0 END) AS total_whatsapps,
                MAX(CASE WHEN tipo = 'email' AND es_principal = 1 THEN valor END) AS email_principal_contacto,
                MAX(CASE WHEN tipo = 'telefono' AND es_principal = 1 THEN valor END) AS telefono_principal_contacto,
                MAX(CASE WHEN tipo = 'whatsapp' AND es_principal = 1 THEN valor END) AS whatsapp_principal_contacto
         FROM la_stg_prospectos_contactos
         GROUP BY stg_prospecto_id
       ) c ON c.stg_prospecto_id = s.id
       WHERE (
         s.email_extraido IS NULL
         OR TRIM(s.email_extraido) = ''
         OR (s.error_msg IS NOT NULL AND TRIM(s.error_msg) <> '')
         OR (
           s.telefono_extraido IS NOT NULL
           AND TRIM(s.telefono_extraido) <> ''
           AND (s.email_extraido IS NULL OR TRIM(s.email_extraido) = '')
         )
         OR (
           s.whatsapp_extraido IS NOT NULL
           AND TRIM(s.whatsapp_extraido) <> ''
           AND (s.email_extraido IS NULL OR TRIM(s.email_extraido) = '')
         )
       )
       ORDER BY s.updated_at DESC, s.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countRows] = await operationalConnection.execute(
      `SELECT COUNT(*) AS total
       FROM la_stg_prospectos s
       WHERE (
         s.email_extraido IS NULL
         OR TRIM(s.email_extraido) = ''
         OR (s.error_msg IS NOT NULL AND TRIM(s.error_msg) <> '')
         OR (
           s.telefono_extraido IS NOT NULL
           AND TRIM(s.telefono_extraido) <> ''
           AND (s.email_extraido IS NULL OR TRIM(s.email_extraido) = '')
         )
         OR (
           s.whatsapp_extraido IS NOT NULL
           AND TRIM(s.whatsapp_extraido) <> ''
           AND (s.email_extraido IS NULL OR TRIM(s.email_extraido) = '')
         )
       )`
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        pending_reasons: buildPendingReasons(row)
      })),
      pagination: {
        total: countRows[0].total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('❌ Error listando contactos pendientes de staging:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (operationalConnection) {
      await operationalConnection.end();
    }
  }
});

/**
 * PUT /api/prospectos/staging/:id/contacto-manual
 * Persiste correcciones manuales en staging y tabla normalizada de contactos.
 */
app.put('/api/prospectos/staging/:id/contacto-manual', async (req, res) => {
  const stageId = parseInt(req.params.id, 10);
  let operationalConnection;

  if (!Number.isInteger(stageId) || stageId <= 0) {
    return res.status(400).json({ error: 'ID de staging inválido' });
  }

  const { corrections, errors } = collectManualCorrections(req.body || {});

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Datos de corrección inválidos',
      details: errors
    });
  }

  if (corrections.length === 0) {
    return res.status(400).json({
      error: 'Debe enviar al menos una corrección válida: email, telefono o whatsapp'
    });
  }

  try {
    operationalConnection = await getOperationalDbConnection();

    const [stageRows] = await operationalConnection.execute(
      `SELECT id, prospecto_id, url_landing, email_extraido, telefono_extraido, whatsapp_extraido, error_msg
       FROM la_stg_prospectos
       WHERE id = ?
       LIMIT 1`,
      [stageId]
    );

    if (stageRows.length === 0) {
      return res.status(404).json({ error: 'Registro staging no encontrado' });
    }

    const stageRow = stageRows[0];
    const updateAssignments = [];
    const updateParams = [];

    for (const correction of corrections) {
      updateAssignments.push(`${correction.field} = ?`);
      updateParams.push(correction.value);
    }

    updateAssignments.push('updated_at = CURRENT_TIMESTAMP');
    if (!isBlank(stageRow.error_msg)) {
      updateAssignments.push('error_msg = NULL');
    }
    updateParams.push(stageId);

    await operationalConnection.beginTransaction();

    try {
      await operationalConnection.execute(
        `UPDATE la_stg_prospectos
         SET ${updateAssignments.join(', ')}
         WHERE id = ?`,
        updateParams
      );

      for (const correction of corrections) {
        await upsertManualContact(operationalConnection, stageRow, correction);
      }

      await operationalConnection.commit();
    } catch (error) {
      await operationalConnection.rollback();
      throw error;
    }

    return res.json({
      success: true,
      message: 'Corrección manual guardada en staging',
      data: {
        id: stageId,
        updatedFields: corrections.map((correction) => correction.field),
        fuente: 'manual'
      }
    });
  } catch (error) {
    console.error('❌ Error guardando corrección manual de contacto:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (operationalConnection) {
      await operationalConnection.end();
    }
  }
});

/**
 * PUT /api/prospectos/:id/validate
 * Marcar prospecto como válido/inválido
 */
app.put('/api/prospectos/:id/validate', async (req, res) => {
  try {
    const { es_valido } = req.body;
    
    if (es_valido === undefined) {
      return res.status(400).json({ error: 'Campo es_valido requerido' });
    }
    
    await dbConnection.execute(
      `UPDATE la_prospectos SET es_valido = ? WHERE id = ?`,
      [es_valido, req.params.id]
    );
    
    res.json({
      success: true,
      message: `Prospecto marcado como ${es_valido ? 'válido' : 'inválido'}`
    });
    
  } catch (error) {
    console.error('❌ Error actualizando prospecto:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/health
 * Endpoint de salud para monitoreo
 */
app.get('/api/health', async (req, res) => {
  let operationalConnection;

  try {
    // Verificar conexión a BD
    await dbConnection.execute('SELECT 1');
    operationalConnection = await getOperationalDbConnection();
    await operationalConnection.execute('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      operationalDatabase: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  } finally {
    if (operationalConnection) {
      await operationalConnection.end();
    }
  }
});

// ==================== INICIALIZACIÓN ====================

async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 API LeadMaster ejecutándose en http://${HOST}:${PORT}`);
      console.log(`📁 Endpoints disponibles:`);
      console.log(`   POST   /api/prospectos     - Guardar nuevo prospecto`);
      console.log(`   GET    /api/prospectos     - Listar prospectos`);
      console.log(`   GET    /api/prospectos/:id - Obtener prospecto`);
      console.log(`   GET    /api/prospectos/staging/contactos-pendientes - Listar staging pendiente`);
      console.log(`   PUT    /api/prospectos/staging/:id/contacto-manual - Guardar corrección manual`);
      console.log(`   PUT    /api/prospectos/:id/validate - Validar prospecto`);
      console.log(`   GET    /api/health         - Salud del sistema`);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error.message);
    process.exit(1);
  }
}

// Manejo de cierre elegante
process.on('SIGINT', async () => {
  console.log('\n🛑 Deteniendo API...');
  if (dbConnection) {
    await dbConnection.end();
    console.log('✅ Conexión MySQL cerrada');
  }
  process.exit(0);
});

// Iniciar servidor
startServer();