const { query, withTransaction } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { AppError } = require('../../utils/errors');

const findByEmail = async (email) => {
  const result = await query(`
    SELECT TOP 1 Id, FullName, Email, PasswordHash, Role, DoctorId, PatientId, IsActive
    FROM Users WHERE Email = @email
  `, (request) => request.input('email', sql.NVarChar(255), email));
  return result.recordset[0] || null;
};

const findById = async (id) => {
  const result = await query(`
    SELECT TOP 1 Id, FullName, Email, Role, DoctorId, PatientId, IsActive, LastLoginAt, CreatedAt
    FROM Users WHERE Id = @id
  `, (request) => request.input('id', sql.Int, id));
  return result.recordset[0] || null;
};

const getManageableById = async (id) => {
  const result = await query(`SELECT TOP 1 Id, FullName, Email, Role, DoctorId, PatientId, IsActive, CreatedAt, UpdatedAt FROM Users WHERE Id = @id`, (request) => request.input('id', sql.Int, id));
  return result.recordset[0] || null;
};

const touchLastLogin = (id) => query('UPDATE Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @id', (request) => request.input('id', sql.Int, id));

const list = async ({ pageSize, offset }) => {
  const result = await query(`
    SELECT u.Id, u.FullName, u.Email, u.Role, u.DoctorId, u.PatientId, d.FullName AS DoctorName, u.IsActive, u.LastLoginAt, u.CreatedAt
    FROM Users u LEFT JOIN Doctors d ON d.Id = u.DoctorId
    ORDER BY u.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT COUNT_BIG(1) AS Total FROM Users;
  `, (request) => request.input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize));
  return { rows: result.recordsets[0], total: Number(result.recordsets[1][0].Total) };
};

const createUser = async ({ fullName, email, passwordHash, role, doctorId, patientId }) => {
  const result = await query(`
    INSERT INTO Users (FullName, Email, PasswordHash, Role, DoctorId, PatientId)
    OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.DoctorId, INSERTED.PatientId, INSERTED.IsActive
    VALUES (@fullName, @email, @passwordHash, @role, @doctorId, @patientId)
  `, (request) => request.input('fullName', sql.NVarChar(160), fullName)
    .input('email', sql.NVarChar(255), email)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .input('role', sql.NVarChar(30), role)
    .input('doctorId', sql.Int, doctorId || null)
    .input('patientId', sql.Int, patientId || null));
  return result.recordset[0];
};

const updateStatus = async (id, isActive) => {
  const result = await query(`UPDATE Users SET IsActive = @isActive, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`, (request) => request.input('id', sql.Int, id).input('isActive', sql.Bit, isActive));
  return result.rowsAffected[0] > 0;
};

const updateUser = async (id, { fullName, email, role, doctorId, patientId, passwordHash }) => {
  const result = await query(`
    UPDATE Users
    SET FullName=@fullName, Email=@email, Role=@role, DoctorId=@doctorId, PatientId=@patientId,
      PasswordHash=COALESCE(@passwordHash, PasswordHash), UpdatedAt=SYSUTCDATETIME()
    OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.DoctorId, INSERTED.PatientId, INSERTED.IsActive, INSERTED.UpdatedAt
    WHERE Id=@id
  `, (request) => request.input('id', sql.Int, id)
    .input('fullName', sql.NVarChar(160), fullName)
    .input('email', sql.NVarChar(255), email)
    .input('role', sql.NVarChar(30), role)
    .input('doctorId', sql.Int, doctorId || null)
    .input('patientId', sql.Int, patientId || null)
    .input('passwordHash', sql.NVarChar(255), passwordHash || null));
  return result.recordset[0] || null;
};

const removeUser = async (id) => withTransaction(async (transaction) => {
  const request = transaction.request().input('id', sql.Int, id);
  const dependencyResult = await request.query(`
    SELECT
      (SELECT COUNT_BIG(1) FROM Documents WHERE UploadedBy=@id) AS DocumentsCount,
      (SELECT COUNT_BIG(1) FROM Users WHERE Role=N'owner' AND IsActive=1 AND Id<>@id) AS OtherActiveOwnersCount;
  `);
  const dependencies = dependencyResult.recordset[0] || {};
  if (Number(dependencies.DocumentsCount) > 0) {
    throw new AppError(`لا يمكن حذف المستخدم نهائيًا لأنه رفع ${dependencies.DocumentsCount} مستندًا طبيًا. انقل ملكية المستندات أولًا أو عطّل الحساب.`, 409, 'USER_HAS_DOCUMENTS', { documentsCount: Number(dependencies.DocumentsCount) });
  }
  if (Number(dependencies.OtherActiveOwnersCount) === 0) {
    throw new AppError('لا يمكن حذف آخر مالك نشط للعيادة. أضف مالكًا نشطًا آخر أولًا.', 409, 'LAST_ACTIVE_OWNER');
  }

  // Preserve operational and medical history while removing the login account.
  await transaction.request().input('id', sql.Int, id).query(`
    UPDATE AuditLogs SET UserId=NULL WHERE UserId=@id;
    UPDATE Pricing SET CreatedBy=NULL WHERE CreatedBy=@id;
    UPDATE PatientAssignments SET AssignedBy=NULL WHERE AssignedBy=@id;
    UPDATE MedicalCases SET CreatedBy=NULL WHERE CreatedBy=@id;
    UPDATE PatientGyneHistories SET RecordedBy=NULL WHERE RecordedBy=@id;
    UPDATE ObstetricHistory SET RecordedBy=NULL WHERE RecordedBy=@id;
    UPDATE Pregnancies SET CreatedBy=NULL WHERE CreatedBy=@id;
    UPDATE Appointments SET CreatedBy=NULL WHERE CreatedBy=@id;
    UPDATE DoctorPauses SET CreatedBy=NULL WHERE CreatedBy=@id;
    UPDATE Notifications SET UserId=NULL WHERE UserId=@id;
    UPDATE Settings SET UpdatedBy=NULL WHERE UpdatedBy=@id;
  `);
  const result = await transaction.request().input('id', sql.Int, id).query('DELETE FROM Users OUTPUT DELETED.Id, DELETED.FullName, DELETED.Email, DELETED.Role, DELETED.DoctorId, DELETED.PatientId WHERE Id=@id');
  return result.recordset[0] || null;
});

module.exports = { findByEmail, findById, getManageableById, touchLastLogin, list, createUser, updateUser, updateStatus, removeUser };
