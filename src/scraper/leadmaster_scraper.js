#!/usr/bin/env node

/**
 * LeadMaster Scraper - Node.js script para recolectar prospectos de anuncios patrocinados
 * 
 * Uso: node leadmaster_scraper.js "palabra clave"
 * Ejemplo: node leadmaster_scraper.js "presupuesto para reforma de oficinas en CABA"
 */

const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');
const mysql = require('mysql2/promise');
const Tesseract = require('tesseract.js');

// Configuración
const config = {
  // Base de datos MySQL
  db: {
    host: 'localhost',
    user: 'leadmaster_user',
    password: 'leadmaster_password',
    database: 'leadmaster',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  
  // Playwright (navegador)
  browser: {
    headless: true, // Cambiar a false para ver el navegador (debugging)
    slowMo: 200,    // Milisegundos de delay entre acciones (para debugging)
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] // Para entornos Linux
  },
  
  // Timeouts (milisegundos)
  timeouts: {
    pageLoad: 30000,
    navigation: 15000,
    selector: 10000
  },
  
  // Rutas
  screenshotsDir: path.join(__dirname, 'screenshots'),
  
  // Selectores para anuncios patrocinados en Google (pueden cambiar)
  selectors: {
    // Varios selectores comunes para anuncios patrocinados (actualizados 2026-04-08)
    sponsoredAds: [
      '[data-text-ad="1"]',                     // Anuncios de texto
      '[aria-label*="Anuncio"]',                // Anuncios (español)
      '[aria-label*="Ad"]',                     // Anuncios (inglés)
      '[data-dt="1"]',                          // Anuncios con data-dt=1
      '[data-dt="2"]',                          // Anuncios con data-dt=2
      '.uEierd',                                // Clase común en resultados patrocinados
      'a[href*="/aclk?"]',                      // Links de anuncios Google
      'a[ping*="/aclk?"]',                      // Links con ping (nuevo)
      'div[data-ved*="CAAQ"]',                  // Otro patrón
      'div.pla-unit',                           // Anuncios de shopping
      'div[data-hveid*="QAw"]',                // Resultados patrocinados
      'div[role="article"] a[href*="http"]',  // Enlaces en artículos
      'div.M8OgIe div > a',                     // Selector de resultados principales
      'a[jsname="UWckNb"]',                    // Enlaces de anuncios
      'div[jscontroller="d0DtYd"]',            // Contenedor de anuncios
      'div[data-sokoban-container]',            // Contenedor sokoban
      'div[data-header-feature="0"]',          // Header feature 0
      'div[data-t="ads"]',                     // Ads data attribute
      'span:has-text("Anuncio")',              // Span con texto "Anuncio"
      'span:has-text("Sponsored")',            // Span con texto "Sponsored"
      'span:has-text("Ad")',                   // Span con texto "Ad"
      'span:has-text("Patrocinado")'           // Span con texto "Patrocinado"
    ],
    // Selectores para aceptar cookies (múltiples idiomas)
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
      'button:has-text("Ich stimme zu")',      // Alemán
      'button:has-text("Tout accepter")',       // Francés
      'button:has-text("Accetta tutto")'        // Italiano
    ],
    // Selector para el botón "Más resultados" si es necesario
    moreResults: '#botstuff a[aria-label="Más resultados"]',
    // Selector para la barra de búsqueda
    searchBox: 'textarea[name="q"], input[name="q"]',
    // Selector para el botón de búsqueda
    searchButton: 'input[type="submit"], button[type="submit"]'
  }
};

// Clase principal
class LeadMasterScraper {
  constructor(keyword) {
    this.keyword = keyword;
    this.browser = null;
    this.page = null;
    this.dbConnection = null;
    this.result = {
      keyword: keyword,
      adUrl: null,
      landingUrl: null,
      extractedText: null,
      screenshotPath: null,
      success: false,
      error: null,
      duplicateSkipped: false,
      duplicateId: null
    };
  }

  /**
   * Inicializar conexión a MySQL
   */
  async initDatabase() {
    try {
      this.dbConnection = await mysql.createConnection(config.db);
      console.log(`✅ Conectado a MySQL (${config.db.database})`);
    } catch (error) {
      console.error('❌ Error conectando a MySQL:', error.message);
      throw error;
    }
  }

  /**
   * Inicializar navegador y página
   */
  async initBrowser() {
    try {
      this.browser = await chromium.launch(config.browser);
      this.page = await this.browser.newPage();
      
      // Configurar timeouts
      this.page.setDefaultTimeout(config.timeouts.pageLoad);
      
      // Configurar user-agent
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      console.log(`✅ Navegador iniciado (headless: ${config.browser.headless})`);
    } catch (error) {
      console.error('❌ Error iniciando navegador:', error.message);
      throw error;
    }
  }

  /**
   * Buscar palabra clave en Google
   */
  async searchGoogle() {
    console.log(`🔍 Buscando: "${this.keyword}"`);
    
    try {
      // Ir a Google con parámetros de región Argentina
      const googleUrl = 'https://www.google.com/?gl=ar&hl=es-419';
      console.log(`🌐 URL de búsqueda: ${googleUrl}`);
      
      await this.page.goto(googleUrl, { 
        waitUntil: 'networkidle',
        timeout: config.timeouts.navigation 
      });
      
      console.log('📄 Página cargada, buscando botones de cookies...');
      
      // Intentar aceptar cookies con múltiples selectores
      let cookiesAccepted = false;
      for (const cookieSelector of config.selectors.cookieButtons) {
        try {
          const cookieButton = await this.page.waitForSelector(cookieSelector, { 
            timeout: 3000 
          });
          if (cookieButton) {
            console.log(`🍪 Botón de cookies encontrado: ${cookieSelector}`);
            await cookieButton.click();
            console.log('✅ Cookies aceptadas');
            await this.page.waitForTimeout(2000); // Esperar que se procese
            cookiesAccepted = true;
            break;
          }
        } catch (error) {
          // Continuar con el siguiente selector
          continue;
        }
      }
      
      if (!cookiesAccepted) {
        console.log('ℹ️ No se encontró botón de cookies o ya estaban aceptadas');
      }
      
      // Escribir palabra clave en la barra de búsqueda
      console.log(`⌨️ Escribiendo palabra clave: ${this.keyword}`);
      await this.page.fill(config.selectors.searchBox, this.keyword);
      await this.page.waitForTimeout(1000);
      
      // Presionar Enter (más confiable que hacer clic en el botón)
      console.log('⏎ Presionando Enter para buscar...');
      await this.page.press(config.selectors.searchBox, 'Enter');
      
      // Esperar a que carguen los resultados
      console.log('⏳ Esperando resultados de búsqueda...');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000); // Esperar más para resultados completos
      
      // Verificar que estamos en página de resultados
      const currentUrl = this.page.url();
      console.log(`🔗 URL actual: ${currentUrl}`);
      
      if (!currentUrl.includes('search?') && !currentUrl.includes('/search')) {
        console.log('⚠️ Posible redirección o página de cookies todavía activa');
        // Intentar navegar directamente con parámetros de búsqueda
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(this.keyword)}&gl=ar&hl=es-419`;
        console.log(`🔄 Navegando directamente a: ${searchUrl}`);
        await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(2000);
      }
      
      console.log('✅ Búsqueda completada');
      return true;
    } catch (error) {
      console.error('❌ Error en búsqueda Google:', error.message);
      this.result.error = `Búsqueda Google: ${error.message}`;
      return false;
    }
  }

  /**
   * Encontrar y hacer clic en anuncios patrocinados
   */
  async findAndClickSponsoredAd() {
    console.log('🔎 Buscando anuncios patrocinados...');
    console.log(`📋 Probando ${config.selectors.sponsoredAds.length} selectores diferentes`);
    
    let adFound = false;
    let selectorIndex = 0;
    
    // Probar cada selector posible
    for (const selector of config.selectors.sponsoredAds) {
      selectorIndex++;
      console.log(`  [${selectorIndex}/${config.selectors.sponsoredAds.length}] Probando selector: ${selector}`);
      
      try {
        // Esperar a que el selector esté presente
        await this.page.waitForSelector(selector, { timeout: 2000 }).catch(() => null);
        
        const ads = await this.page.$$(selector);
        if (ads.length > 0) {
          console.log(`    ✅ Encontrado(s) ${ads.length} elemento(s)`);
          
          // Filtrar elementos visibles y con href
          let clicked = false;
          for (let i = 0; i < Math.min(ads.length, 3); i++) { // Probar primeros 3
            const ad = ads[i];
            try {
              // Verificar si es visible
              const isVisible = await ad.isVisible();
              if (!isVisible) {
                console.log(`    👁️  Anuncio ${i+1} no visible, continuando...`);
                continue;
              }
              
              // Obtener URL del anuncio antes de hacer clic
              const adHref = await ad.getAttribute('href');
              if (!adHref) {
                console.log(`    🔗 Anuncio ${i+1} sin href, continuando...`);
                continue;
              }
              
              this.result.adUrl = adHref.startsWith('http') ? adHref : `https://www.google.com${adHref}`;
              console.log(`    🔗 URL del anuncio ${i+1}: ${this.result.adUrl}`);
              
              // Obtener texto del anuncio (para debug)
              const adText = await ad.textContent().catch(() => '');
              console.log(`    📝 Texto del anuncio ${i+1}: ${adText.substring(0, 100)}...`);
              
              // Hacer clic en el anuncio
              console.log(`    🖱️  Haciendo clic en anuncio ${i+1}...`);
              await ad.click();
              await this.page.waitForLoadState('networkidle');
              await this.page.waitForTimeout(4000); // Esperar más para que cargue
              
              // Obtener URL actual (landing page)
              this.result.landingUrl = this.page.url();
              console.log(`    🌐 Landing page: ${this.result.landingUrl}`);
              
              // Verificar que no estamos todavía en Google
              if (this.result.landingUrl.includes('google.com') && 
                  !this.result.landingUrl.includes('/aclk?') &&
                  !this.result.landingUrl.includes('doubleclick.net')) {
                console.log(`    ⚠️  Posiblemente todavía en Google, intentando siguiente anuncio...`);
                // Volver atrás y continuar
                await this.page.goBack();
                await this.page.waitForLoadState('networkidle');
                await this.page.waitForTimeout(2000);
                continue;
              }
              
              adFound = true;
              clicked = true;
              break;
            } catch (clickError) {
              console.log(`    ❌ Error con anuncio ${i+1}: ${clickError.message}`);
              // Continuar con el siguiente anuncio
              continue;
            }
          }
          
          if (clicked) {
            console.log(`🎯 Anuncio encontrado y clickeado con selector: ${selector}`);
            break;
          } else {
            console.log(`    ℹ️  Ningún anuncio fue clickeable con este selector`);
          }
        } else {
          console.log(`    ℹ️  No se encontraron elementos con este selector`);
        }
      } catch (error) {
        console.log(`    ❌ Error con selector: ${error.message}`);
        // Continuar con el siguiente selector
        continue;
      }
    }
    
    if (!adFound) {
      console.log('⚠️ No se encontraron anuncios patrocinados clickeables.');
      console.log('📄 Tomando screenshot de la página de resultados...');
      // Si no hay anuncios, podemos tomar screenshot de la página de resultados igual
      this.result.landingUrl = this.page.url();
    }
    
    return adFound;
  }

  /**
   * Tomar screenshot completo de la página
   */
  async takeScreenshot() {
    try {
      // Crear directorio de screenshots si no existe
      await fs.mkdir(config.screenshotsDir, { recursive: true });
      
      // Generar nombre de archivo único
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}-${this.keyword.substring(0, 20).replace(/\s+/g, '_')}.png`;
      const screenshotPath = path.join(config.screenshotsDir, filename);
      
      // Tomar screenshot completo (full page)
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      
      this.result.screenshotPath = screenshotPath;
      console.log(`📸 Screenshot guardado: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error('❌ Error tomando screenshot:', error.message);
      this.result.error = `Screenshot: ${error.message}`;
      return null;
    }
  }

  /**
   * Tomar screenshot de la página de resultados (para debugging)
   */
  async takeResultsScreenshot() {
    try {
      // Crear directorio de screenshots si no existe
      await fs.mkdir(config.screenshotsDir, { recursive: true });
      
      // Generar nombre de archivo único para resultados
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `results-${timestamp}-${this.keyword.substring(0, 20).replace(/\s+/g, '_')}.png`;
      const screenshotPath = path.join(config.screenshotsDir, filename);
      
      // Tomar screenshot completo (full page)
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      
      console.log(`📊 Screenshot de resultados: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error('❌ Error tomando screenshot de resultados:', error.message);
      return null;
    }
  }

  /**
   * Extraer texto de la imagen usando OCR
   */
  async extractTextFromImage(imagePath) {
    if (!imagePath) {
      console.log('⚠️ No hay imagen para extraer texto');
      return null;
    }
    
    console.log('🔠 Extrayendo texto con OCR...');
    
    try {
      const { data: { text } } = await Tesseract.recognize(
        imagePath,
        'spa+eng',  // Idiomas: español + inglés
        {
          logger: info => {
            if (info.status === 'recognizing text') {
              console.log(`OCR progreso: ${info.progress * 100}%`);
            }
          }
        }
      );
      
      const cleanedText = text.trim();
      console.log(`✅ Texto extraído: ${cleanedText.length} caracteres`);
      
      // Mostrar primeras 200 caracteres
      if (cleanedText.length > 0) {
        console.log(`📝 Preview: ${cleanedText.substring(0, 200)}...`);
      }
      
      this.result.extractedText = cleanedText;
      return cleanedText;
    } catch (error) {
      console.error('❌ Error en OCR:', error.message);
      this.result.error = `OCR: ${error.message}`;
      return null;
    }
  }

  /**
   * Guardar resultados en MySQL
   */
  async saveToDatabase() {
    if (!this.dbConnection) {
      console.error('❌ No hay conexión a la base de datos');
      return false;
    }
    
    console.log('💾 Guardando en base de datos...');
    
    try {
      const normalizedLandingUrl =
        typeof this.result.landingUrl === 'string'
          ? this.result.landingUrl.trim()
          : this.result.landingUrl;

      const query = `
        INSERT INTO prospectos 
        (palabra_clave, url_anuncio, url_landing, texto_extraido, es_valido, metadata) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const metadata = {
        screenshot_path: this.result.screenshotPath,
        success: this.result.success,
        error: this.result.error,
        timestamp: new Date().toISOString()
      };
      
      const [result] = await this.dbConnection.execute(query, [
        this.result.keyword,
        this.result.adUrl,
        normalizedLandingUrl,
        this.result.extractedText,
        null, // es_valido (NULL por defecto, se evaluará después)
        JSON.stringify(metadata)
      ]);

      this.result.duplicateSkipped = false;
      this.result.duplicateId = null;
      
      console.log(`✅ Registro guardado con ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        try {
          const normalizedLandingUrl =
            typeof this.result.landingUrl === 'string'
              ? this.result.landingUrl.trim()
              : this.result.landingUrl;

          let duplicateId = null;
          if (normalizedLandingUrl) {
            const [rows] = await this.dbConnection.execute(
              `SELECT id FROM prospectos
               WHERE url_landing_hash = SHA2(TRIM(?), 256)
               LIMIT 1`,
              [normalizedLandingUrl]
            );

            if (rows.length > 0) {
              duplicateId = rows[0].id;
            }
          }

          this.result.duplicateSkipped = true;
          this.result.duplicateId = duplicateId;
          console.log(`⚠️ Registro duplicado detectado${duplicateId ? ` (ID existente: ${duplicateId})` : ''}. No se inserta nuevamente.`);
          return duplicateId || true;
        } catch (lookupError) {
          this.result.duplicateSkipped = true;
          this.result.duplicateId = null;
          console.log('⚠️ Registro duplicado detectado por índice único. No se inserta nuevamente.');
          return true;
        }
      }

      console.error('❌ Error guardando en base de datos:', error.message);
      this.result.error = `Database: ${error.message}`;
      return false;
    }
  }

  /**
   * Ejecutar el flujo completo
   */
  async run() {
    console.log(`🚀 Iniciando LeadMaster Scraper para: "${this.keyword}"`);
    console.log('='.repeat(60));
    
    try {
      // 1. Inicializar base de datos
      await this.initDatabase();
      
      // 2. Inicializar navegador
      await this.initBrowser();
      
      // 3. Buscar en Google
      const searchSuccess = await this.searchGoogle();
      if (!searchSuccess) {
        throw new Error('Fallo en búsqueda Google');
      }
      
      // 3.1 Tomar screenshot de resultados (para debugging)
      console.log('📊 Tomando screenshot de la página de resultados...');
      const resultsScreenshotPath = await this.takeResultsScreenshot();
      if (resultsScreenshotPath) {
        console.log(`✅ Screenshot de resultados: ${resultsScreenshotPath}`);
      }
      
      // 4. Encontrar y hacer clic en anuncio
      const adClicked = await this.findAndClickSponsoredAd();
      this.result.success = adClicked;
      
      // 5. Tomar screenshot final (landing page o página actual)
      const screenshotPath = await this.takeScreenshot();
      
      // 6. Extraer texto con OCR (si hay screenshot)
      if (screenshotPath) {
        await this.extractTextFromImage(screenshotPath);
      }
      
      // 7. Guardar en base de datos
      await this.saveToDatabase();
      
      console.log('='.repeat(60));
      console.log('✅ Proceso completado con éxito!');
      console.log(`📊 Resumen:`);
      console.log(`   - Palabra clave: ${this.result.keyword}`);
      console.log(`   - Anuncio encontrado: ${adClicked ? 'Sí' : 'No'}`);
      console.log(`   - URL Landing: ${this.result.landingUrl}`);
      console.log(`   - Texto extraído: ${this.result.extractedText ? `${this.result.extractedText.length} caracteres` : 'Ninguno'}`);
      console.log(`   - Screenshot resultados: ${resultsScreenshotPath ? 'Sí' : 'No'}`);
      console.log(`   - Duplicado omitido: ${this.result.duplicateSkipped ? 'Sí' : 'No'}${this.result.duplicateId ? ` (ID existente: ${this.result.duplicateId})` : ''}`);
      
    } catch (error) {
      console.error('❌ Error en el proceso:', error.message);
      this.result.error = `General: ${error.message}`;
      
      // Intentar guardar el error en la base de datos
      try {
        if (this.dbConnection) {
          await this.saveToDatabase();
        }
      } catch (dbError) {
        console.error('❌ Error guardando registro de fallo:', dbError.message);
      }
      
    } finally {
      // 8. Limpieza
      console.log('🧹 Limpiando recursos...');
      
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Navegador cerrado');
      }
      
      if (this.dbConnection) {
        await this.dbConnection.end();
        console.log('✅ Conexión MySQL cerrada');
      }
      
      console.log('='.repeat(60));
      console.log(this.result.success ? '🎉 Proceso finalizado con éxito!' : '⚠️ Proceso finalizado con advertencias/errores');
    }
  }
}

// Manejo de argumentos de línea de comandos
const keyword = process.argv[2];

if (!keyword) {
  console.error('❌ Error: Debes proporcionar una palabra clave como argumento.');
  console.error('   Uso: node leadmaster_scraper.js "palabra clave"');
  console.error('   Ejemplo: node leadmaster_scraper.js "presupuesto para reforma de oficinas en CABA"');
  process.exit(1);
}

// Ejecutar el scraper
const scraper = new LeadMasterScraper(keyword);
scraper.run().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});