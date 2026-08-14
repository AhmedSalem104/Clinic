const fs = require('node:fs/promises');
const path = require('node:path');
const { getPool, closePool } = require('../src/db/connection');

const main = async () => {
  const file = await fs.readFile(path.join(process.cwd(), 'database', 'schema.sql'), 'utf8');
  const batches = file.split(/^\s*GO\s*$/gim).map((batch) => batch.trim()).filter(Boolean);
  const pool = await getPool();
  for (const batch of batches) await pool.request().batch(batch);
  console.log(`Applied ${batches.length} SQL Server schema batches.`);
};

main().catch((error) => {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
}).finally(() => closePool());
