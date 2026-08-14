const { getPool, sql } = require('../db/connection');
const { logger } = require('../config/logger');

const recordAudit = async ({ req, action, entity, entityId, oldValue, newValue }) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req?.user?.id || null)
      .input('action', sql.NVarChar(100), action)
      .input('entity', sql.NVarChar(100), entity)
      .input('entityId', sql.NVarChar(100), entityId == null ? null : String(entityId))
      .input('ipAddress', sql.NVarChar(64), req?.ip || null)
      .input('oldValue', sql.NVarChar(sql.MAX), oldValue == null ? null : JSON.stringify(oldValue))
      .input('newValue', sql.NVarChar(sql.MAX), newValue == null ? null : JSON.stringify(newValue))
      .query(`
        INSERT INTO AuditLogs (UserId, Action, Entity, EntityId, IpAddress, OldValue, NewValue)
        VALUES (@userId, @action, @entity, @entityId, @ipAddress, @oldValue, @newValue)
      `);
  } catch (error) {
    logger.error({ err: error, action, entity, entityId }, 'Audit log write failed');
  }
};

module.exports = { recordAudit };
