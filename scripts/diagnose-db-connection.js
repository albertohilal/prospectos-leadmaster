#!/usr/bin/env node

require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');

function getDbConfig() {
  return {
    host: process.env.DB_HOST || process.env.KEYWORDS_DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.KEYWORDS_DB_PORT || 3306),
    user: process.env.DB_USER || process.env.KEYWORDS_DB_USER || '',
    password: process.env.DB_PASSWORD || process.env.KEYWORDS_DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.KEYWORDS_DB_NAME || 'iunaorg_dyd',
  };
}

function printSafeConfig(config) {
  console.log('Diagnostico DB (sin password)');
  console.log(`- DB_HOST=${config.host}`);
  console.log(`- DB_PORT=${config.port}`);
  console.log(`- DB_USER=${config.user || '[vacío]'}`);
  console.log(`- DB_NAME=${config.database}`);
}

function explainError(error) {
  switch (error.code) {
    case 'ECONNREFUSED':
      return 'ECONNREFUSED: host/puerto incorrecto o MySQL no expuesto.';
    case 'ER_ACCESS_DENIED_ERROR':
      return 'ER_ACCESS_DENIED_ERROR: usuario o password incorrecto.';
    case 'ER_BAD_DB_ERROR':
      return 'ER_BAD_DB_ERROR: base inexistente o DB_NAME incorrecto.';
    case 'ER_NO_SUCH_TABLE':
      return 'ER_NO_SUCH_TABLE: faltan tablas la_ o DB_NAME apunta a otro esquema.';
    case 'ENOTFOUND':
      return 'ENOTFOUND: host DNS inexistente o no resolvible.';
    default:
      return 'Error no categorizado por el diagnostico.';
  }
}

async function main() {
  const config = getDbConfig();
  printSafeConfig(config);

  let db;
  try {
    db = await mysql.createConnection(config);
    console.log('✅ Conexion MySQL OK');

    const [dbRows] = await db.query('SELECT DATABASE() AS current_db');
    console.log(`- DATABASE()=${dbRows[0]?.current_db || '[null]'}`);

    const [tableRows] = await db.query("SHOW TABLES LIKE 'la_%'");
    console.log(`- Tablas la_: ${tableRows.length}`);
    for (const row of tableRows) {
      const firstValue = Object.values(row)[0];
      console.log(`  - ${firstValue}`);
    }

    const checks = [
      'la_prospectos',
      'la_stg_prospectos',
      'la_stg_prospectos_contactos',
    ];

    for (const tableName of checks) {
      const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${tableName}`);
      console.log(`- ${tableName}: ${rows[0]?.total ?? '[sin dato]'}`);
    }
  } catch (error) {
    console.error(`❌ ${explainError(error)}`);
    console.error(`- code=${error.code || 'N/A'}`);
    console.error(`- message=${error.message}`);
    process.exitCode = 1;
  } finally {
    if (db) {
      await db.end();
    }
  }
}

main();
