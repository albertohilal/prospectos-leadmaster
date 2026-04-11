#!/usr/bin/env node

/**
 * LeadMaster Scraper Local
 * 
 * Script para ejecutar en PC local del usuario.
 * Abre Chrome, realiza búsqueda, espera clics manuales en anuncios,
 * captura landing pages y envía a API en VPS.
 * 
 * Uso: node scraper-local.js "palabra clave"
 * Ejemplo: node scraper-local.js "presupuesto para reforma de oficinas en CABA"
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const config = require('../shared/config');

// Configuración específica para modo local
const LOCAL_CONFIG = {
  ...config.local,
  browser: {
    ...config.browser,
    headless: false, // Siempre visible para interacción humana
    slowMo: 300      // Más lento para ver qué pasa
  }
};

// API endpoint
const API_URL = LOCAL_CONFIG.apiUrl;

// Conjunto para evitar duplicados en la misma sesión
const capturedUrls = new Set();

/**
 * Determina si una URL es una landing page válida para captura
 * Filtra URLs de Google, páginas de error, cookies, etc.
 */
function isValidLandingUrl(url) {
  if (!url || url.length === 0) {
    return false;
  }
  
  // Excluir cualquier dominio de Google (excepto anuncios /aclk?)
  if (url.includes('google.') || url.includes('youtube.') || url.includes('accounts.google.')) {
    // Permitir solo URLs de anuncios (contienen /aclk?) o doubleclick (redirecciones)
    if (url.includes('/aclk?') || url.includes('doubleclick.net')) {
      return true; // Anuncio de Google, podría redirigir a landing
    }
    // Cualquier otra URL de Google es inválida
    return false;
  }
  
  // Excluir otros motores de búsqueda
  if (url.includes('bing.') || url.includes('yahoo.') || url.includes('duckduckgo.')) {
    return false;
  }
  
  // Excluir páginas de error/cookies/CAPTCHA comunes
  const invalidPatterns = [
    'about:blank',
    'about:newtab',
    'chrome://',
    'data:text/html',
    'file://',
    '/sorry/',
    '/cookies',
    '/privacy',
    '/terms',
    '/policy',
    'captcha',
    'consent.',
    'accounts.google.',
    'preferences',
    'settings',
    'webhp',
    '/search',
    'search?',
    'q=',
    '&oq=',
    '&gs_l',
    '&source=hp',
    '&ie=UTF-8'
  ];
  
  for (const pattern of invalidPatterns) {
    if (url.includes(pattern)) {
      return false;
    }
  }
  
  // Excluir si es página de búsqueda (contiene 'search' y 'q=') - redundante pero seguro
  if (url.includes('search') && url.includes('q=')) {
    return false;
  }
  
  // Excluir URLs que son solo dominios sin path (o path vacío)
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    if (path === '/' || path === '' || path === '/webhp') {
      // Podría ser página principal de un sitio, pero si pasó otros filtros, es válida
      // No la excluimos automáticamente
    }
  } catch (e) {
    // URL inválida
    return false;
  }
  
  // URL válida
  return true;
}

// Interfaz para preguntar al usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Enviar prospecto a API
 */
async function sendToAPI(prospectoData) {
  try {
    console.log('📤 Enviando prospecto a API...');
    
    const response = await fetch(`${API_URL}/prospectos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prospectoData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Prospecto enviado exitosamente (ID: ${result.data?.id})`);
      return { success: true, data: result.data };
    } else {
      console.error(`❌ Error API: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error enviando a API:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Capturar screenshot de la página actual
 */
async function captureScreenshot(page, keyword) {
  try {
    // Crear directorio temporal local
    const tempDir = path.join(__dirname, 'temp_screenshots');
    await fs.mkdir(tempDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `local-${timestamp}-${keyword.substring(0, 20).replace(/\s+/g, '_')}.png`;
    const screenshotPath = path.join(tempDir, filename);
    
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot local guardado: ${screenshotPath}`);
    
    // Convertir a base64 para enviar a API
    const imageBuffer = await fs.readFile(screenshotPath);
    const base64Image = imageBuffer.toString('base64');
    const screenshotBase64 = `data:image/png;base64,${base64Image}`;
    
    return { screenshotPath, screenshotBase64 };
  } catch (error) {
    console.error('❌ Error capturando screenshot:', error.message);
    return null;
  }
}

/**
 * Buscar en Google y esperar interacción humana
 */
async function searchAndWaitForClicks(keyword) {
  console.log(`🔍 Buscando: "${keyword}"`);
  console.log('🖱️  Por favor, haz clic en anuncios patrocinados...');
  console.log('ℹ️  El script detectará automáticamente cuando navegues a una landing page.');
  console.log('ℹ️  Presiona Ctrl+C para salir.\n');
  
  const browser = await chromium.launch(LOCAL_CONFIG.browser);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let prospectCount = 0;
  
  try {
    // 1. Ir a Google con región Argentina
    const googleUrl = 'https://www.google.com/?gl=ar&hl=es-419';
    await page.goto(googleUrl, { waitUntil: 'networkidle' });
    
    // 2. Aceptar cookies si aparecen
    for (const cookieSelector of config.selectors.cookieButtons) {
      try {
        const cookieButton = await page.waitForSelector(cookieSelector, { timeout: 3000 });
        if (cookieButton) {
          console.log(`🍪 Aceptando cookies: ${cookieSelector}`);
          await cookieButton.click();
          await page.waitForTimeout(1000);
          break;
        }
      } catch {
        continue;
      }
    }
    
    // 3. Realizar búsqueda
    await page.fill('textarea[name="q"], input[name="q"]', keyword);
    await page.waitForTimeout(500);
    await page.press('textarea[name="q"], input[name="q"]', 'Enter');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('✅ Resultados de búsqueda cargados.');
    console.log('👉 Ahora puedes hacer clic en anuncios patrocinados.');
    console.log('👉 Cuando navegues a una landing page, el script capturará automáticamente.\n');
    
    // 4. Monitorear cambios de URL (nuevas pestañas o navegaciones)
    context.on('page', async (newPage) => {
      console.log('🔄 Nueva pestaña detectada...');
      const processed = await handleLandingPage(newPage, keyword, prospectCount + 1);
      if (processed) {
        prospectCount++;
      }
    });
    
    // También monitorear navegaciones en la página principal
    page.on('framenavigated', async (frame) => {
      const url = frame.url();
      if (url && isValidLandingUrl(url)) {
        console.log(`🌐 Navegación detectada (válida): ${url}`);
        // Esperar un momento para que cargue la página
        await page.waitForTimeout(2000);
        const processed = await handleLandingPage(page, keyword, prospectCount + 1);
        if (processed) {
          prospectCount++;
        }
        
        // Volver a resultados de búsqueda (siempre volvemos porque el usuario navegó)
        console.log('↩️  Volviendo a resultados de búsqueda...');
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      } else if (url) {
        console.log(`⚠️  Navegación detectada pero URL inválida (ignorando): ${url}`);
      }
    });
    
    // 5. Esperar interacción del usuario
    console.log('⏳ Esperando clics en anuncios (presiona "q" + Enter para finalizar)...');
    
    // Escuchar entrada del usuario para salir
    const waitForExit = new Promise((resolve) => {
      rl.on('line', (input) => {
        if (input.trim().toLowerCase() === 'q') {
          console.log('👋 Finalizando...');
          resolve();
        }
      });
    });
    
    // También escuchar Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n👋 Interrupción recibida. Cerrando...');
      rl.close();
      process.exit(0);
    });
    
    await waitForExit;
    
  } catch (error) {
    console.error('❌ Error durante la búsqueda:', error.message);
  } finally {
    await browser.close();
    rl.close();
  }
}

/**
 * Manejar landing page: capturar y enviar a API
 */
async function handleLandingPage(page, keyword, prospectNumber) {
  try {
    console.log(`\n🎯 Prospecto #${prospectNumber} detectado`);
    
    // Esperar a que la página cargue completamente
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(LOCAL_CONFIG.captureDelay);
    
    const landingUrl = page.url();
    console.log(`🌐 Landing page: ${landingUrl}`);
    
    // Validar que sea una landing page válida
    if (!isValidLandingUrl(landingUrl)) {
      console.log(`⚠️  URL inválida detectada (Google/search/error). Ignorando captura.`);
      // Cerrar pestaña si es nueva (no la página principal)
      try {
        const context = page.context();
        const pages = context.pages();
        if (pages.length > 1 && pages[pages.length - 1] === page) {
          // Es una pestaña nueva, podemos cerrarla
          await page.close();
          console.log('📭 Pestaña inválida cerrada.');
        }
      } catch (closeError) {
        // Ignorar errores al cerrar
      }
      return false; // No procesar esta página
    }
    
    // Verificar si ya capturamos esta URL en esta sesión
    if (capturedUrls.has(landingUrl)) {
      console.log(`⚠️  URL ya capturada en esta sesión: ${landingUrl}`);
      console.log('   Ignorando duplicado...');
      return false;
    }
    
    // Agregar URL al conjunto de capturadas
    capturedUrls.add(landingUrl);
    
    // Capturar screenshot
    console.log('📸 Capturando landing page...');
    const screenshotResult = await captureScreenshot(page, keyword);
    
    if (!screenshotResult) {
      console.log('⚠️  No se pudo capturar screenshot, continuando...');
      return false;
    }
    
    // Enviar a API
    const prospectoData = {
      keyword,
      adUrl: null, // No tenemos URL del anuncio en este flujo
      landingUrl,
      screenshotBase64: screenshotResult.screenshotBase64
    };
    
    const apiResult = await sendToAPI(prospectoData);
    
    if (apiResult.success) {
      console.log(`✅ Prospecto #${prospectNumber} procesado exitosamente`);
    } else {
      console.log(`⚠️  Prospecto #${prospectNumber} no se pudo enviar a API`);
    }
    
    // Preguntar si quiere continuar
    console.log('\n---');
    const answer = await question('¿Deseas hacer clic en otro anuncio? (s/n): ');
    
    if (answer.trim().toLowerCase() !== 's') {
      console.log('👋 Finalizando captura de anuncios.');
      // Podríamos cerrar el navegador o continuar
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error procesando landing page: ${error.message}`);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  const keyword = process.argv[2];
  
  if (!keyword) {
    console.error('❌ Error: Debes proporcionar una palabra clave como argumento.');
    console.error('   Uso: node scraper-local.js "palabra clave"');
    console.error('   Ejemplo: node scraper-local.js "presupuesto para reforma de oficinas en CABA"');
    process.exit(1);
  }
  
  console.log('🚀 LeadMaster Scraper Local');
  console.log('='.repeat(50));
  console.log(`📝 Palabra clave: ${keyword}`);
  console.log(`🌐 API: ${API_URL}`);
  console.log('='.repeat(50));
  
  // Verificar que la API esté disponible
  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    if (!healthResponse.ok) {
      console.warn('⚠️  API no parece estar disponible. ¿Está ejecutándose?');
      console.warn(`   URL: ${API_URL}/health`);
      const proceed = await question('¿Continuar de todos modos? (s/n): ');
      if (proceed.trim().toLowerCase() !== 's') {
        console.log('👋 Saliendo...');
        process.exit(0);
      }
    }
  } catch (error) {
    console.warn('⚠️  No se pudo conectar a la API:', error.message);
    const proceed = await question('¿Continuar de todos modos? (s/n): ');
    if (proceed.trim().toLowerCase() !== 's') {
      console.log('👋 Saliendo...');
      process.exit(0);
    }
  }
  
  // Iniciar proceso
  await searchAndWaitForClicks(keyword);
}

// Manejo de errores global
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
  rl.close();
  process.exit(1);
});

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  rl.close();
  process.exit(1);
});