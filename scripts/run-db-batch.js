#!/usr/bin/env node

require('dotenv').config();

const mysql = require('mysql2/promise');
const { spawn } = require('child_process');
const readline = require('readline');

const REQUIRED_ENV = [
  'KEYWORDS_DB_HOST',
  'KEYWORDS_DB_USER',
  'KEYWORDS_DB_PASSWORD',
  'KEYWORDS_DB_NAME'
];

const TABLE_NAME = 'll_keywords_leadmaster';

function showHelp() {
  console.log(`Uso: node scripts/run-db-batch.js [opciones]

Opciones:
  --target N        Capturas objetivo por keyword (default: 2)
  --limit N         Cantidad maxima de keywords a ejecutar (default: 10)
  --origen VALOR    Filtra por origen
  --prioridad VALOR Filtra por prioridad
  --manual          Agrega --manual al scraper
  --dry-run         Muestra que ejecutaria sin correr scraper ni actualizar DB
  --help, -h        Muestra esta ayuda

Ejemplos:
  node scripts/run-db-batch.js --dry-run --limit 5
  node scripts/run-db-batch.js --dry-run --origen lista_inicial --limit 5
  node scripts/run-db-batch.js --dry-run --prioridad alta --limit 5`);
}

function isPositiveInt(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function parseArgs(argv) {
  const options = {
    target: 2,
    limit: 10,
    origen: null,
    prioridad: null,
    manual: false,
    dryRun: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--target': {
        const value = argv[index + 1];
        if (!isPositiveInt(value)) {
          throw new Error('--target requiere un entero positivo');
        }
        options.target = Number(value);
        index += 1;
        break;
      }
      case '--limit': {
        const value = argv[index + 1];
        if (!isPositiveInt(value)) {
          throw new Error('--limit requiere un entero positivo');
        }
        options.limit = Number(value);
        index += 1;
        break;
      }
      case '--origen': {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
          throw new Error('--origen requiere un valor');
        }
        options.origen = value;
        index += 1;
        break;
      }
      case '--prioridad': {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
          throw new Error('--prioridad requiere un valor');
        }
        options.prioridad = value;
        index += 1;
        break;
      }
      case '--manual':
        options.manual = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Opcion no reconocida: ${arg}`);
    }
  }

  return options;
}

function validateEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error('Error: faltan variables de entorno para la base de keywords:');
    missing.forEach((name) => console.error(`- ${name}`));
    process.exit(1);
  }
}

function buildKeywordsDbConfig() {
  const keywordsDbConfig = {
    host: process.env.KEYWORDS_DB_HOST,
    port: Number(process.env.KEYWORDS_DB_PORT || 3306),
    user: process.env.KEYWORDS_DB_USER,
    password: process.env.KEYWORDS_DB_PASSWORD,
    database: process.env.KEYWORDS_DB_NAME || 'iunaorg_dyd',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  };

  if (process.env.KEYWORDS_DB_TIMEZONE) {
    keywordsDbConfig.timezone = process.env.KEYWORDS_DB_TIMEZONE;
  }

  return keywordsDbConfig;
}

function buildQuery(options) {
  const filters = [];
  const params = [];

  if (options.origen) {
    filters.push('AND origen = ?');
    params.push(options.origen);
  }

  if (options.prioridad) {
    filters.push('AND prioridad = ?');
    params.push(options.prioridad);
  }

  params.push(options.limit);

  const sql = `
SELECT id, keyword, sector, prioridad, origen, veces_buscada, ultima_busqueda_at
FROM ${TABLE_NAME}
WHERE estado = 'activa'
${filters.join('\n')}
ORDER BY
    FIELD(prioridad, 'alta', 'media', 'baja'),
    COALESCE(ultima_busqueda_at, '1970-01-01') ASC,
    id ASC
LIMIT ?`;

  return { sql, params };
}

function formatFilter(value) {
  return value || '(sin filtro)';
}

function printSummary(config, options, keywords) {
  console.log('');
  console.log('=========================================');
  console.log(' LeadMaster - Batch DB keywords');
  console.log('=========================================');
  console.log(`Base usada: ${config.database}`);
  console.log(`Tabla usada: ${TABLE_NAME}`);
  console.log(`Host usado: ${config.host}:${config.port}`);
  console.log(`Filtro origen: ${formatFilter(options.origen)}`);
  console.log(`Filtro prioridad: ${formatFilter(options.prioridad)}`);
  console.log(`Target: ${options.target}`);
  console.log(`Limit: ${options.limit}`);
  console.log(`Manual: ${options.manual ? 'si' : 'no'}`);
  console.log(`Dry-run: ${options.dryRun ? 'si' : 'no'}`);
  console.log(`Keywords encontradas: ${keywords.length}`);
  console.log('');

  keywords.forEach((item) => {
    console.log(`[${item.id}] ${item.keyword} | ${item.sector || '-'} | ${item.prioridad || '-'} | ${item.origen || '-'} | ${item.veces_buscada || 0}`);
  });

  console.log('');
}

function buildScraperCommand(keyword, options) {
  const args = ['./src/local/scraper-local.js', keyword, '--target', String(options.target)];

  if (options.manual) {
    args.push('--manual');
  }

  return { command: 'node', args };
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }

  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function commandToString(command, args) {
  return [command, ...args].map(shellQuote).join(' ');
}

function runScraper(keyword, options) {
  const { command, args } = buildScraperCommand(keyword, options);

  return new Promise((resolve, reject) => {
    let child;

    try {
      child = spawn(command, args, { stdio: 'inherit' });
    } catch (error) {
      reject(new Error(`Error de ejecucion del scraper: ${error.message}`));
      return;
    }

    child.on('error', (error) => {
      reject(new Error(`Error de ejecucion del scraper: ${error.message}`));
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

function askContinue(exitCode) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`El scraper termino con codigo ${exitCode}. ¿Continuar con la siguiente keyword? (s/n): `, (answer) => {
      rl.close();
      resolve(String(answer).trim().toLowerCase() === 's');
    });
  });
}

function isConnectionError(error) {
  return ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ER_ACCESS_DENIED_ERROR', 'PROTOCOL_CONNECTION_LOST'].includes(error.code);
}

async function fetchKeywords(pool, options) {
  const { sql, params } = buildQuery(options);

  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    if (isConnectionError(error)) {
      throw new Error(`Error de conexion a base de datos de keywords: ${error.message}`);
    }

    throw new Error(`Error de consulta SQL de keywords: ${error.message}`);
  }
}

async function markKeywordExecuted(pool, id) {
  try {
    await pool.execute(
      `UPDATE ${TABLE_NAME}
SET
  veces_buscada = veces_buscada + 1,
  ultima_busqueda_at = NOW()
WHERE id = ?`,
      [id]
    );
  } catch (error) {
    if (isConnectionError(error)) {
      throw new Error(`Error de conexion a base de datos al actualizar keyword ${id}: ${error.message}`);
    }

    throw new Error(`Error de consulta SQL al actualizar keyword ${id}: ${error.message}`);
  }
}

async function main() {
  let options;
  let pool;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error('Usa --help para ver opciones.');
    process.exit(1);
  }

  if (options.help) {
    showHelp();
    return;
  }

  validateEnv();
  const keywordsDbConfig = buildKeywordsDbConfig();

  try {
    pool = mysql.createPool(keywordsDbConfig);
    const keywords = await fetchKeywords(pool, options);
    printSummary(keywordsDbConfig, options, keywords);

    for (const item of keywords) {
      const { command, args } = buildScraperCommand(item.keyword, options);
      const printableCommand = commandToString(command, args);

      console.log('--------------------------------------------------');
      console.log(`[${item.id}] Keyword: ${item.keyword}`);
      console.log(`Comando: ${printableCommand}`);
      console.log('--------------------------------------------------');

      if (options.dryRun) {
        continue;
      }

      const exitCode = await runScraper(item.keyword, options);

      if (exitCode === 0) {
        await markKeywordExecuted(pool, item.id);
        console.log(`Keyword ${item.id} actualizada en ${TABLE_NAME}.`);
        continue;
      }

      console.error(`Error de ejecucion del scraper: codigo de salida ${exitCode}`);
      const shouldContinue = await askContinue(exitCode);

      if (!shouldContinue) {
        process.exitCode = exitCode;
        return;
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
