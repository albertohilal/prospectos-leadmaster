#!/usr/bin/env node

require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.KEYWORDS_DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.KEYWORDS_DB_PORT || 3306),
    user: process.env.DB_USER || process.env.KEYWORDS_DB_USER || '',
    password: process.env.DB_PASSWORD || process.env.KEYWORDS_DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.KEYWORDS_DB_NAME || 'iunaorg_dyd',
  });

  try {
    const [rows] = await db.query('SELECT COUNT(*) AS total_prospectos FROM la_prospectos');
    console.table(rows);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(`❌ db:status: ${error.message}`);
  process.exit(1);
});
