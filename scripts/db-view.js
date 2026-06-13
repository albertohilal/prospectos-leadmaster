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
    const [rows] = await db.query(
      `SELECT id, palabra_clave, es_valido, DATE(fecha_hora) AS fecha, LENGTH(texto_extraido) AS chars
       FROM la_prospectos
       ORDER BY id DESC
       LIMIT 10`
    );
    console.table(rows);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(`❌ db:view: ${error.message}`);
  process.exit(1);
});
