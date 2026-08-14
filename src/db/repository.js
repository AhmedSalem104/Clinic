const { getPool } = require('./connection');

const query = async (statement, bind) => {
  const pool = await getPool();
  const request = pool.request();
  if (bind) bind(request);
  return request.query(statement);
};

const withTransaction = async (callback) => {
  const pool = await getPool();
  const transaction = pool.transaction();
  await transaction.begin();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    throw error;
  }
};

const requestFrom = (transactionOrPool) => transactionOrPool.request();

module.exports = { query, withTransaction, requestFrom };
