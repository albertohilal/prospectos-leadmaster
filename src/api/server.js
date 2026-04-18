#!/usr/bin/env node

/**
 * API REST para Prospectos LeadMaster
 * 
 * Endpoints para recibir prospectos desde scripts locales
 * y gestionar base de datos MySQL.
 */

// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');
const config = require('../shared/config');

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
    dbConnection = await mysql.createConnection(config.db);
    await dbConnection.execute('SET time_zone = ?', [config.dbSessionTimeZone]);
    console.log(`✅ API: Conectado a MySQL (${config.db.database})`);
    console.log(`🕒 API: Zona horaria SQL activa (${config.dbSessionTimeZone})`);
  } catch (error) {
    console.error('❌ API: Error conectando a MySQL:', error.message);
    process.exit(1);
  }
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
      INSERT INTO prospectos 
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
    `SELECT id FROM prospectos
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
       FROM prospectos 
       ORDER BY id DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    const [countResult] = await dbConnection.execute(
      'SELECT COUNT(*) as total FROM prospectos'
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
      `SELECT * FROM prospectos WHERE id = ?`,
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
      `UPDATE prospectos SET es_valido = ? WHERE id = ?`,
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
  try {
    // Verificar conexión a BD
    await dbConnection.execute('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
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