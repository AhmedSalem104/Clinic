const { getPool, closePool, sql } = require('../src/db/connection');

const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';
const DEFAULT_BREAKS = JSON.stringify([{ start: '13:00', end: '14:00' }]);
const DEFAULT_PRICE = 350;

const main = async () => {
  const pool = await getPool();
  const transaction = pool.transaction();
  let committed = false;

  try {
    await transaction.begin();

    const ownerResult = await transaction.request().query(`
      SELECT TOP 1 Id
      FROM Users
      WHERE Role=N'owner' AND IsActive=1
      ORDER BY Id;
    `);
    const ownerId = ownerResult.recordset[0]?.Id || null;
    if (!ownerId) throw new Error('An active clinic owner is required to create pricing configuration.');

    const doctorsResult = await transaction.request().query(`
      SELECT d.Id,d.FullName
      FROM Doctors d
      WHERE d.Status=N'active'
      ORDER BY d.Id;
    `);
    const servicesResult = await transaction.request().query(`
      SELECT Id,Name
      FROM Services
      WHERE IsActive=1 AND RequiresBooking=1
      ORDER BY Id;
    `);

    const preparedDoctors = [];
    for (const doctor of doctorsResult.recordset) {
      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
        await transaction.request()
          .input('doctorId', sql.Int, doctor.Id)
          .input('dayOfWeek', sql.TinyInt, dayOfWeek)
          .input('startTime', sql.VarChar(5), DEFAULT_START)
          .input('endTime', sql.VarChar(5), DEFAULT_END)
          .input('breaksJson', sql.NVarChar(sql.MAX), DEFAULT_BREAKS)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM DoctorSchedules
              WHERE DoctorId=@doctorId AND DayOfWeek=@dayOfWeek AND IsActive=1
            )
            INSERT INTO DoctorSchedules (DoctorId,DayOfWeek,StartTime,EndTime,BreaksJson,IsActive)
            VALUES (@doctorId,@dayOfWeek,@startTime,@endTime,@breaksJson,1);
          `);
      }

      for (const service of servicesResult.recordset) {
        await transaction.request()
          .input('doctorId', sql.Int, doctor.Id)
          .input('serviceId', sql.Int, service.Id)
          .input('ownerId', sql.Int, ownerId)
          .input('defaultPrice', sql.Decimal(12, 2), DEFAULT_PRICE)
          .query(`
            IF EXISTS (SELECT 1 FROM DoctorServices WHERE DoctorId=@doctorId AND ServiceId=@serviceId)
              UPDATE DoctorServices SET IsActive=1 WHERE DoctorId=@doctorId AND ServiceId=@serviceId;
            ELSE
              INSERT INTO DoctorServices (DoctorId,ServiceId,IsActive) VALUES (@doctorId,@serviceId,1);

            IF NOT EXISTS (
              SELECT 1 FROM Pricing
              WHERE DoctorId=@doctorId AND ServiceId=@serviceId AND IsActive=1
                AND EffectiveFrom<=CONVERT(date,SYSUTCDATETIME())
                AND (EffectiveTo IS NULL OR EffectiveTo>=CONVERT(date,SYSUTCDATETIME()))
            )
            BEGIN
              DECLARE @sourcePrice DECIMAL(12,2);
              SELECT TOP 1 @sourcePrice=Price
              FROM Pricing
              WHERE ServiceId=@serviceId AND IsActive=1
                AND EffectiveFrom<=CONVERT(date,SYSUTCDATETIME())
                AND (EffectiveTo IS NULL OR EffectiveTo>=CONVERT(date,SYSUTCDATETIME()))
              ORDER BY EffectiveFrom DESC,Id DESC;

              INSERT INTO Pricing (DoctorId,ServiceId,Price,EffectiveFrom,IsActive,CreatedBy,Notes)
              VALUES (@doctorId,@serviceId,COALESCE(@sourcePrice,@defaultPrice),CONVERT(date,SYSUTCDATETIME()),1,@ownerId,N'تهيئة تلقائية لطبيب نشط قابل للحجز');
            END;
          `);
      }
      preparedDoctors.push({ id: doctor.Id, name: doctor.FullName });
    }

    await transaction.commit();
    committed = true;
    console.log(JSON.stringify({ preparedDoctors, services: servicesResult.recordset.length, schedule: { start: DEFAULT_START, end: DEFAULT_END, break: '13:00-14:00' } }, null, 2));
  } catch (error) {
    if (!committed) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
};

main()
  .catch((error) => {
    console.error('Active doctor booking setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
