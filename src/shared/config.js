/**
 * Configuración compartida para todos los módulos del proyecto
 */

// Cargar variables de entorno
require('dotenv').config();

// Configuración de base de datos MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'leadmaster_user',
  password: process.env.DB_PASSWORD || 'leadmaster_password',
  database: process.env.DB_NAME || 'leadmaster',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Configuración de la API
const apiConfig = {
  port: process.env.API_PORT || 3001,
  host: process.env.API_HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Configuración de Playwright (navegador)
const browserConfig = {
  headless: process.env.BROWSER_HEADLESS !== 'false', // true por defecto
  slowMo: parseInt(process.env.BROWSER_SLOWMO) || 100, // ms
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled'
  ]
};

// Configuración de OCR (Tesseract)
const ocrConfig = {
  languages: process.env.OCR_LANGUAGES || 'spa+eng',
  logger: process.env.OCR_LOGGER === 'true'
};

// Rutas de archivos
const pathsConfig = {
  screenshotsDir: process.env.SCREENSHOTS_DIR || './screenshots',
  tempDir: process.env.TEMP_DIR || './temp'
};

// Configuración del scraper local (para PC del usuario)
const localConfig = {
  apiUrl: process.env.API_URL || 'http://localhost:3001/api',
  browserVisible: true, // Siempre visible para interacción humana
  waitForClickTimeout: 60000, // 60 segundos para esperar clic humano
  captureDelay: 2000 // 2 segundos después de clic para capturar
};

// Selectores para anuncios patrocinados (Google)
const selectors = {
  sponsoredAds: [
    '[data-text-ad="1"]',
    '[aria-label*="Anuncio"]',
    '[aria-label*="Ad"]',
    '[data-dt="1"]',
    '[data-dt="2"]',
    '.uEierd',
    'a[href*="/aclk?"]',
    'a[ping*="/aclk?"]',
    'div[data-ved*="CAAQ"]',
    'div.pla-unit',
    'div[data-hveid*="QAw"]',
    'div[role="article"] a[href*="http"]',
    'div.M8OgIe div > a',
    'a[jsname="UWckNb"]',
    'div[jscontroller="d0DtYd"]',
    'div[data-sokoban-container]',
    'div[data-header-feature="0"]',
    'div[data-t="ads"]',
    'span:has-text("Anuncio")',
    'span:has-text("Sponsored")',
    'span:has-text("Ad")',
    'span:has-text("Patrocinado")'
  ],
  cookieButtons: [
    'button:has-text("Aceptar todo")',
    'button:has-text("Aceptar")',
    'button:has-text("I agree")',
    'button:has-text("Aceptar todas")',
    'button:has-text("Aceptar todas las cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Acepto")',
    'button[aria-label*="Aceptar"]',
    'button[aria-label*="Accept"]',
    'button:has-text("Ich stimme zu")',
    'button:has-text("Tout accepter")',
    'button:has-text("Accetta tutto")'
  ]
};

// Timeouts (milisegundos)
const timeouts = {
  pageLoad: 30000,
  navigation: 15000,
  selector: 10000,
  apiRequest: 10000
};

module.exports = {
  db: dbConfig,
  api: apiConfig,
  browser: browserConfig,
  ocr: ocrConfig,
  paths: pathsConfig,
  local: localConfig,
  selectors,
  timeouts
};