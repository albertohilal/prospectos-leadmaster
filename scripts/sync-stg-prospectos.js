#!/usr/bin/env node

require('dotenv').config();

const mysql = require('mysql2/promise');

function normalizeLandingUrl(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';
    parsed.search = '';
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin.toLowerCase()}${normalizedPath}`;
  } catch {
    const withoutHash = trimmed.split('#')[0].trim();
    const withoutQuery = withoutHash.split('?')[0].trim();
    if (!withoutQuery) {
      return null;
    }
    if (withoutQuery === '/') {
      return '/';
    }
    return withoutQuery.replace(/\/+$/, '');
  }
}

async function syncStgProspectos() {
  const dryRun = process.argv.includes('--dry-run');
  const clienteId = Number(process.env.STG_CLIENTE_ID || 52);

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'leadmaster_user',
    password: process.env.DB_PASSWORD || 'leadmaster_password',
    database: process.env.DB_NAME || 'leadmaster'
  });

  try {
    console.log('🔄 Sincronizando prospectos → stg_prospectos...');
    console.log(`🧾 cliente_id: ${clienteId}`);
    if (dryRun) {
      console.log('🧪 Modo dry-run: no se escriben cambios');
    }

    const [prospectos] = await db.execute(
      `SELECT id, palabra_clave, url_landing, texto_extraido
       FROM prospectos`
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const prospecto of prospectos) {
      const normalizedUrl = normalizeLandingUrl(prospecto.url_landing);

      if (!normalizedUrl) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        continue;
      }

      const [result] = await db.execute(
        `INSERT INTO stg_prospectos
           (prospecto_id, cliente_id, ref_ext, palabra_clave, url_landing, texto_extraido, place_id, estado)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 'pendiente_place_id')
         ON DUPLICATE KEY UPDATE
           palabra_clave = VALUES(palabra_clave),
           url_landing = VALUES(url_landing),
           texto_extraido = VALUES(texto_extraido),
           updated_at = CURRENT_TIMESTAMP`,
        [
          prospecto.id,
          clienteId,
          `leadmaster:${prospecto.id}`,
          prospecto.palabra_clave,
          normalizedUrl,
          prospecto.texto_extraido
        ]
      );

      if (result.affectedRows === 1) {
        inserted += 1;
      } else if (result.affectedRows >= 2) {
        updated += 1;
      }
    }

    console.log('✅ Sincronización finalizada');
    console.log(`📥 Prospectos origen: ${prospectos.length}`);
    console.log(`➕ Insertados: ${dryRun ? 0 : inserted}`);
    console.log(`♻️ Actualizados: ${dryRun ? 0 : updated}`);
    console.log(`⏭️ Omitidos por URL inválida/vacía: ${skipped}`);
  } finally {
    await db.end();
  }
}

syncStgProspectos().catch((error) => {
  console.error(`❌ Error en sync de stg_prospectos: ${error.message}`);
  process.exit(1);
});
