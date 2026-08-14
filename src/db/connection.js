const sql = require('mssql');
const { env } = require('../config/env');

let poolPromise;

const getPool = async () => {
  if (poolPromise) return poolPromise;
  if (!env.db.server || !env.db.database || !env.db.user || !env.db.password) {
    throw new Error('Database configuration is incomplete. Set DB_SERVER, DB_DATABASE, DB_USER and DB_PASSWORD.');
  }

  const config = {
    server: env.db.server,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
    options: {
      encrypt: env.db.encrypt,
      trustServerCertificate: env.db.trustServerCertificate,
      enableArithAbort: true,
      multipleActiveResultSets: env.db.multipleActiveResultSets
    },
    pool: env.db.pool
  };

  poolPromise = new sql.ConnectionPool(config).connect().catch((error) => {
    poolPromise = undefined;
    throw error;
  });

  return poolPromise;
};

const closePool = async () => {
  if (!poolPromise) return;
  const pool = await poolPromise;
  await pool.close();
  poolPromise = undefined;
};

module.exports = { sql, getPool, closePool };
