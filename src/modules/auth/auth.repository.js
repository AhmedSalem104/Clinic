const { query } = require('../../db/repository');
const { sql } = require('../../db/connection');

const findByEmail = async (email) => {
  const result = await query(`
    SELECT TOP 1 Id, FullName, Email, PasswordHash, Role, DoctorId, IsActive
    FROM Users WHERE Email = @email
  `, (request) => request.input('email', sql.NVarChar(255), email));
  return result.recordset[0] || null;
};

const findById = async (id) => {
  const result = await query(`
    SELECT TOP 1 Id, FullName, Email, Role, DoctorId, IsActive, LastLoginAt, CreatedAt
    FROM Users WHERE Id = @id
  `, (request) => request.input('id', sql.Int, id));
  return result.recordset[0] || null;
};

const touchLastLogin = (id) => query('UPDATE Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @id', (request) => request.input('id', sql.Int, id));

const list = async ({ pageSize, offset }) => {
  const result = await query(`
    SELECT u.Id, u.FullName, u.Email, u.Role, u.DoctorId, d.FullName AS DoctorName, u.IsActive, u.LastLoginAt, u.CreatedAt
    FROM Users u LEFT JOIN Doctors d ON d.Id = u.DoctorId
    ORDER BY u.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT COUNT_BIG(1) AS Total FROM Users;
  `, (request) => request.input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize));
  return { rows: result.recordsets[0], total: Number(result.recordsets[1][0].Total) };
};

const createUser = async ({ fullName, email, passwordHash, role, doctorId }) => {
  const result = await query(`
    INSERT INTO Users (FullName, Email, PasswordHash, Role, DoctorId)
    OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.DoctorId, INSERTED.IsActive
    VALUES (@fullName, @email, @passwordHash, @role, @doctorId)
  `, (request) => request.input('fullName', sql.NVarChar(160), fullName)
    .input('email', sql.NVarChar(255), email)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .input('role', sql.NVarChar(30), role)
    .input('doctorId', sql.Int, doctorId || null));
  return result.recordset[0];
};

const updateStatus = async (id, isActive) => {
  const result = await query(`UPDATE Users SET IsActive = @isActive, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`, (request) => request.input('id', sql.Int, id).input('isActive', sql.Bit, isActive));
  return result.rowsAffected[0] > 0;
};

module.exports = { findByEmail, findById, touchLastLogin, list, createUser, updateStatus };
