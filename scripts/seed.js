const bcrypt = require('bcryptjs');
const { getPool, closePool, sql } = require('../src/db/connection');

const add = (request, name, type, value) => request.input(name, type, value);

const main = async () => {
  const pool = await getPool();
  const ownerEmail = (process.env.SEED_OWNER_EMAIL || 'owner@clinic.local').toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'ChangeMe!123';
  const doctorPassword = process.env.SEED_DOCTOR_PASSWORD || 'ChangeMe!123';
  const receptionPassword = process.env.SEED_RECEPTION_PASSWORD || 'ChangeMe!123';
  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  let owner = (await pool.request().input('email', sql.NVarChar(255), ownerEmail).query('SELECT TOP 1 Id FROM Users WHERE Email = @email')).recordset[0];
  if (!owner) {
    owner = (await pool.request()
      .input('fullName', sql.NVarChar(160), 'Clinic Owner')
      .input('email', sql.NVarChar(255), ownerEmail)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query(`INSERT INTO Users (FullName, Email, PasswordHash, Role) OUTPUT INSERTED.Id VALUES (@fullName, @email, @passwordHash, N'owner')`)).recordset[0];
  }

  const doctors = [
    ['Dr. Ahmed Hassan', 'Obstetrics & Gynecology', '+20 100 000 0001'],
    ['Dr. Mohamed Ali', 'Ultrasound & Gynecology', '+20 100 000 0002']
  ];
  for (const [fullName, specialty, phone] of doctors) {
    const exists = await pool.request().input('fullName', sql.NVarChar(160), fullName).query('SELECT TOP 1 Id FROM Doctors WHERE FullName = @fullName');
    if (!exists.recordset[0]) {
      await pool.request().input('fullName', sql.NVarChar(160), fullName).input('specialty', sql.NVarChar(160), specialty).input('phone', sql.NVarChar(40), phone)
        .query(`INSERT INTO Doctors (FullName, Specialty, Phone) VALUES (@fullName, @specialty, @phone)`);
    }
  }

  // Operational service catalog for a women's health and obstetrics clinic.
  // Durations are starting defaults for scheduling only; the clinic owner can
  // adjust them from Services after the seed is complete.
  const services = [
    ['First Examination', 'Consultation', 30],
    ['Follow-up', 'Consultation', 20],
    ['Pregnancy Follow-up', 'Pregnancy Care', 20],
    ['Ultrasound', 'Ultrasound', 20],
    ['Consultation', 'Consultation', 30],
    ['كشف نساء وتوليد عام', 'الكشف والاستشارات', 30],
    ['كشف أول مرة', 'الكشف والاستشارات', 35],
    ['متابعة', 'الكشف والاستشارات', 20],
    ['استشارة نساء', 'الكشف والاستشارات', 30],
    ['استشارة ما قبل الزواج', 'الكشف والاستشارات', 30],
    ['متابعة الحمل', 'متابعة الحمل', 20],
    ['متابعة حمل عادي', 'متابعة الحمل', 20],
    ['متابعة حمل عالي الخطورة', 'متابعة الحمل', 30],
    ['متابعة بعد الولادة', 'متابعة الحمل', 20],
    ['متابعة ضغط/سكر الحمل', 'متابعة الحمل', 25],
    ['متابعة حمل بتوأم', 'متابعة الحمل', 30],
    ['السونار', 'السونار', 20],
    ['سونار نساء على البطن', 'السونار', 20],
    ['سونار مهبلي', 'السونار', 25],
    ['سونار حمل', 'السونار', 20],
    ['سونار 4D/5D', 'السونار', 35],
    ['متابعة نمو الجنين', 'السونار', 25],
    ['قياس نبض الجنين', 'السونار', 10],
    ['اضطرابات الدورة', 'مشاكل النساء', 25],
    ['نزيف غير طبيعي', 'مشاكل النساء', 30],
    ['تكيس المبايض', 'مشاكل النساء', 30],
    ['التهابات وإفرازات مهبلية', 'مشاكل النساء', 25],
    ['آلام الحوض', 'مشاكل النساء', 30],
    ['بطانة الرحم المهاجرة', 'مشاكل النساء', 30],
    ['أورام ليفية', 'مشاكل النساء', 30],
    ['مشاكل سن اليأس', 'مشاكل النساء', 30],
    ['تأخر الحمل والخصوبة', 'الخصوبة وتأخر الحمل', 35],
    ['تقييم تأخر الإنجاب', 'الخصوبة وتأخر الحمل', 35],
    ['متابعة التبويض', 'الخصوبة وتأخر الحمل', 20],
    ['تنشيط التبويض', 'الخصوبة وتأخر الحمل', 25],
    ['فحوصات الخصوبة', 'الخصوبة وتأخر الحمل', 30],
    ['متابعة ما قبل الحقن المجهري/أطفال الأنابيب', 'الخصوبة وتأخر الحمل', 35],
    ['تنظيم الأسرة', 'تنظيم الأسرة', 20],
    ['استشارة وسائل منع الحمل', 'تنظيم الأسرة', 25],
    ['تركيب/إزالة لولب', 'تنظيم الأسرة', 35],
    ['تركيب/إزالة شريحة منع الحمل', 'تنظيم الأسرة', 35],
    ['متابعة وسيلة منع الحمل', 'تنظيم الأسرة', 20],
    ['مسحة عنق الرحم Pap Smear', 'فحوصات وإجراءات', 25],
    ['فحص عنق الرحم', 'فحوصات وإجراءات', 20],
    ['أخذ مسحات وتحاليل', 'فحوصات وإجراءات', 20],
    ['كي/علاج بعض مشاكل عنق الرحم حسب تجهيز العيادة', 'فحوصات وإجراءات', 35],
    ['إزالة غرز بعد الولادة أو العمليات', 'فحوصات وإجراءات', 15],
    ['خدمات ما بعد الولادة', 'خدمات ما بعد الولادة', 25],
    ['متابعة ما بعد الولادة الطبيعية', 'خدمات ما بعد الولادة', 20],
    ['متابعة ما بعد القيصرية', 'خدمات ما بعد الولادة', 25],
    ['فحص الجرح', 'خدمات ما بعد الولادة', 20],
    ['استشارة الرضاعة الطبيعية', 'خدمات ما بعد الولادة', 30],
    ['تنظيم الأسرة بعد الولادة', 'خدمات ما بعد الولادة', 25]
  ];
  for (const [name, category, duration] of services) {
    const exists = await pool.request().input('name', sql.NVarChar(160), name).query('SELECT TOP 1 Id FROM Services WHERE Name = @name');
    if (!exists.recordset[0]) {
      await pool.request().input('name', sql.NVarChar(160), name).input('category', sql.NVarChar(100), category).input('duration', sql.Int, duration)
        .query(`INSERT INTO Services (Name, Category, BaseDurationMinutes) VALUES (@name, @category, @duration)`);
    }
  }

  const doctorRows = (await pool.request().query('SELECT Id,FullName FROM Doctors WHERE Status = N\'active\' ORDER BY Id')).recordset;
  const serviceRows = (await pool.request().query('SELECT Id FROM Services WHERE IsActive = 1')).recordset;
  for (const [doctorIndex, doctor] of doctorRows.entries()) {
    const doctorEmail = `doctor${doctorIndex + 1}@clinic.local`;
    const doctorHash = await bcrypt.hash(doctorPassword, 12);
    await pool.request().input('email', sql.NVarChar(255), doctorEmail).input('fullName', sql.NVarChar(160), doctor.FullName).input('passwordHash', sql.NVarChar(255), doctorHash).input('doctorId', sql.Int, doctor.Id)
      .query(`IF NOT EXISTS (SELECT 1 FROM Users WHERE Email=@email)
              INSERT INTO Users (FullName,Email,PasswordHash,Role,DoctorId) VALUES (@fullName,@email,@passwordHash,N'doctor',@doctorId)`);
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
      await pool.request().input('doctorId', sql.Int, doctor.Id).input('dayOfWeek', sql.TinyInt, dayOfWeek)
        .query(`IF NOT EXISTS (SELECT 1 FROM DoctorSchedules WHERE DoctorId=@doctorId AND DayOfWeek=@dayOfWeek)
                INSERT INTO DoctorSchedules (DoctorId,DayOfWeek,StartTime,EndTime,BreaksJson)
                VALUES (@doctorId,@dayOfWeek,'09:00','17:00',N'[{"start":"13:00","end":"14:00"}]')`);
    }
    for (const service of serviceRows) {
      await pool.request().input('doctorId', sql.Int, doctor.Id).input('serviceId', sql.Int, service.Id)
        .query(`IF NOT EXISTS (SELECT 1 FROM DoctorServices WHERE DoctorId = @doctorId AND ServiceId = @serviceId)
                INSERT INTO DoctorServices (DoctorId, ServiceId) VALUES (@doctorId, @serviceId)`);
      await pool.request().input('doctorId', sql.Int, doctor.Id).input('serviceId', sql.Int, service.Id).input('ownerId', sql.Int, owner.Id)
        .query(`IF NOT EXISTS (SELECT 1 FROM Pricing WHERE DoctorId = @doctorId AND ServiceId = @serviceId AND IsActive = 1)
                INSERT INTO Pricing (DoctorId, ServiceId, Price, EffectiveFrom, CreatedBy) VALUES (@doctorId, @serviceId, 350, CONVERT(date, SYSUTCDATETIME()), @ownerId)`);
    }
  }

  const receptionHash = await bcrypt.hash(receptionPassword, 12);
  await pool.request().input('email', sql.NVarChar(255), 'reception@clinic.local').input('fullName', sql.NVarChar(160), 'Clinic Reception').input('passwordHash', sql.NVarChar(255), receptionHash)
    .query(`IF NOT EXISTS (SELECT 1 FROM Users WHERE Email=N'reception@clinic.local')
            INSERT INTO Users (FullName,Email,PasswordHash,Role) VALUES (@fullName,@email,@passwordHash,N'reception')`);

  const settings = [
    ['clinic_name', 'Women Care Clinic'],
    ['queue_delay_notification_threshold_minutes', '10'],
    ['default_page_size', '25']
  ];
  for (const [key, value] of settings) {
    await pool.request().input('key', sql.NVarChar(120), key).input('value', sql.NVarChar(sql.MAX), value).input('ownerId', sql.Int, owner.Id)
      .query(`IF NOT EXISTS (SELECT 1 FROM Settings WHERE SettingKey = @key)
              INSERT INTO Settings (SettingKey, SettingValue, UpdatedBy) VALUES (@key, @value, @ownerId)`);
  }

  console.log(`Seed complete. Owner: ${ownerEmail}. Password is the value of SEED_OWNER_PASSWORD (default ChangeMe!123).`);
};

main().catch((error) => {
  console.error('Database seed failed:', error.message);
  process.exitCode = 1;
}).finally(() => closePool());
