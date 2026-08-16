const { query, withTransaction } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { ensureMedicalLinks } = require('./medical.integrity');

const listCases = async (patientId) => (await query(`SELECT mc.Id,mc.PatientId,mc.Type,mc.Status,mc.StartDate,mc.EndDate,mc.AssignedDoctorId,d.FullName AssignedDoctor,mc.Summary FROM MedicalCases mc LEFT JOIN Doctors d ON d.Id=mc.AssignedDoctorId WHERE mc.PatientId=@patientId ORDER BY CASE WHEN mc.Status=N'active' THEN 0 ELSE 1 END,mc.StartDate DESC`, q => q.input('patientId', sql.Int, patientId))).recordset;
const createCase = async (data) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, { patientId: data.patientId });
  return (await transaction.request()
    .input('patientId', sql.Int, data.patientId)
    .input('type', sql.NVarChar(80), data.type)
    .input('status', sql.NVarChar(30), data.status || 'active')
    .input('startDate', sql.Date, data.startDate || new Date())
    .input('doctorId', sql.Int, data.assignedDoctorId || null)
    .input('summary', sql.NVarChar(1000), data.summary || null)
    .input('createdBy', sql.Int, data.createdBy)
    .query('INSERT INTO MedicalCases (PatientId,Type,Status,StartDate,AssignedDoctorId,Summary,CreatedBy) OUTPUT INSERTED.* VALUES (@patientId,@type,@status,@startDate,@doctorId,@summary,@createdBy)')).recordset[0];
});

const listVisits = async ({ patientId, pageSize, offset }) => { const r=await query(`SELECT v.Id,v.PatientId,v.AppointmentId,v.CaseId,v.DoctorId,d.FullName DoctorName,v.VisitType,v.Status,v.ChiefComplaint,v.Assessment,v.Diagnosis,v.TreatmentPlan,v.NextVisitDate,v.WeightKg,v.SystolicBp,v.DiastolicBp,v.PainScore,v.StartedAt,v.CompletedAt,v.CreatedAt FROM Visits v JOIN Doctors d ON d.Id=v.DoctorId WHERE v.PatientId=@patientId ORDER BY v.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY; SELECT COUNT_BIG(1) Total FROM Visits WHERE PatientId=@patientId;`,q=>q.input('patientId',sql.Int,patientId).input('offset',sql.Int,offset).input('pageSize',sql.Int,pageSize));return{rows:r.recordsets[0],total:Number(r.recordsets[1][0].Total)}};
const getVisit = async (id) => { const r=await query(`SELECT v.*,d.FullName DoctorName,p.PatientCode,p.FullName PatientName,mc.Type CaseType FROM Visits v JOIN Doctors d ON d.Id=v.DoctorId JOIN Patients p ON p.Id=v.PatientId LEFT JOIN MedicalCases mc ON mc.Id=v.CaseId WHERE v.Id=@id; SELECT pv.*,pr.EDD,pr.LMP FROM PregnancyVisits pv JOIN Pregnancies pr ON pr.Id=pv.PregnancyId WHERE pv.VisitId=@id;`,q=>q.input('id',sql.Int,id));return r.recordsets[0][0]?{...r.recordsets[0][0],pregnancyVisit:r.recordsets[1][0]||null}:null};
const createVisit = async (data) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, {
    patientId: data.patientId,
    appointmentId: data.appointmentId,
    caseId: data.caseId,
    doctorId: data.doctorId,
    pregnancyId: data.pregnancyVisit?.pregnancyId
  });
  const result = await transaction.request()
    .input('patientId', sql.Int, data.patientId)
    .input('appointmentId', sql.Int, data.appointmentId || null)
    .input('caseId', sql.Int, data.caseId || null)
    .input('doctorId', sql.Int, data.doctorId)
    .input('visitType', sql.NVarChar(40), data.visitType)
    .input('chiefComplaint', sql.NVarChar(2000), data.chiefComplaint || null)
    .input('symptoms', sql.NVarChar(3000), data.symptoms || null)
    .input('examination', sql.NVarChar(3000), data.examination || null)
    .input('assessment', sql.NVarChar(3000), data.assessment || null)
    .input('diagnosis', sql.NVarChar(3000), data.diagnosis || null)
    .input('treatmentPlan', sql.NVarChar(3000), data.treatmentPlan || null)
    .input('doctorNotes', sql.NVarChar(sql.MAX), data.doctorNotes || null)
    .input('followUpPlan', sql.NVarChar(2000), data.followUpPlan || null)
    .input('nextVisitDate', sql.Date, data.nextVisitDate || null)
    .input('weightKg', sql.Decimal(5, 2), data.weightKg ?? null)
    .input('heightCm', sql.Decimal(5, 2), data.heightCm ?? null)
    .input('systolicBp', sql.SmallInt, data.systolicBp ?? null)
    .input('diastolicBp', sql.SmallInt, data.diastolicBp ?? null)
    .input('pulseBpm', sql.SmallInt, data.pulseBpm ?? null)
    .input('temperatureC', sql.Decimal(4, 1), data.temperatureC ?? null)
    .input('oxygenSaturation', sql.Decimal(5, 2), data.oxygenSaturation ?? null)
    .input('painScore', sql.TinyInt, data.painScore ?? null)
    .input('status', sql.NVarChar(20), data.status || 'draft')
    .query(`INSERT INTO Visits (PatientId,AppointmentId,CaseId,DoctorId,VisitType,Status,ChiefComplaint,Symptoms,Examination,Assessment,Diagnosis,TreatmentPlan,DoctorNotes,FollowUpPlan,NextVisitDate,WeightKg,HeightCm,SystolicBp,DiastolicBp,PulseBpm,TemperatureC,OxygenSaturation,PainScore,StartedAt)
      OUTPUT INSERTED.* VALUES (@patientId,@appointmentId,@caseId,@doctorId,@visitType,@status,@chiefComplaint,@symptoms,@examination,@assessment,@diagnosis,@treatmentPlan,@doctorNotes,@followUpPlan,@nextVisitDate,@weightKg,@heightCm,@systolicBp,@diastolicBp,@pulseBpm,@temperatureC,@oxygenSaturation,@painScore,SYSUTCDATETIME())`);
  const visit = result.recordset[0];
  if (data.pregnancyVisit) {
    await transaction.request()
      .input('pregnancyId', sql.Int, data.pregnancyVisit.pregnancyId)
      .input('visitId', sql.Int, visit.Id)
      .input('weeks', sql.TinyInt, data.pregnancyVisit.gestationalAgeWeeks ?? null)
      .input('days', sql.TinyInt, data.pregnancyVisit.gestationalAgeDays ?? null)
      .input('fundal', sql.Decimal(5, 2), data.pregnancyVisit.fundalHeightCm ?? null)
      .input('fhr', sql.SmallInt, data.pregnancyVisit.fetalHeartRateBpm ?? null)
      .input('movement', sql.NVarChar(30), data.pregnancyVisit.fetalMovementConcern || null)
      .input('urine', sql.NVarChar(20), data.pregnancyVisit.urineProtein || null)
      .input('edema', sql.NVarChar(30), data.pregnancyVisit.edema || null)
      .input('presentation', sql.NVarChar(40), data.pregnancyVisit.presentation || null)
      .input('risk', sql.NVarChar(40), data.pregnancyVisit.riskAssessmentOutcome || null)
      .input('symptomsJson', sql.NVarChar(sql.MAX), data.pregnancyVisit.symptoms ? JSON.stringify(data.pregnancyVisit.symptoms) : null)
      .input('fetalJson', sql.NVarChar(sql.MAX), data.pregnancyVisit.fetalData ? JSON.stringify(data.pregnancyVisit.fetalData) : null)
      .query(`INSERT INTO PregnancyVisits (PregnancyId,VisitId,GestationalAgeWeeks,GestationalAgeDays,FundalHeightCm,FetalHeartRateBpm,FetalMovementConcern,UrineProtein,Edema,Presentation,RiskAssessmentOutcome,SymptomsJson,FetalDataJson)
        VALUES (@pregnancyId,@visitId,@weeks,@days,@fundal,@fhr,@movement,@urine,@edema,@presentation,@risk,@symptomsJson,@fetalJson)`);
  }
  return visit;
});
const completeVisit = async (id) => { const r=await query(`UPDATE Visits SET Status=N'completed',CompletedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id AND Status<>N'voided'`,q=>q.input('id',sql.Int,id));return r.recordset[0]||null };

const listPregnancies = async (patientId) => (await query(`SELECT pr.*,d.FullName AssignedDoctor,mc.Type CaseType FROM Pregnancies pr LEFT JOIN Doctors d ON d.Id=pr.AssignedDoctorId LEFT JOIN MedicalCases mc ON mc.Id=pr.CaseId WHERE pr.PatientId=@patientId ORDER BY CASE WHEN pr.Status=N'active' THEN 0 ELSE 1 END,pr.CreatedAt DESC`,q=>q.input('patientId',sql.Int,patientId))).recordset;
const createPregnancy = async (data) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, { patientId: data.patientId, caseId: data.caseId });
  return (await transaction.request()
    .input('patientId', sql.Int, data.patientId)
    .input('caseId', sql.Int, data.caseId || null)
    .input('number', sql.Int, data.pregnancyNumber ?? null)
    .input('lmp', sql.Date, data.lmp || null)
    .input('edd', sql.Date, data.edd || null)
    .input('eddMethod', sql.NVarChar(40), data.eddMethod || null)
    .input('gravida', sql.TinyInt, data.gravida ?? null)
    .input('para', sql.TinyInt, data.para ?? null)
    .input('abortions', sql.TinyInt, data.abortions ?? null)
    .input('living', sql.TinyInt, data.livingChildren ?? null)
    .input('fetalCount', sql.TinyInt, data.fetalCount ?? null)
    .input('risk', sql.NVarChar(sql.MAX), data.riskFactors ? JSON.stringify(data.riskFactors) : null)
    .input('doctorId', sql.Int, data.assignedDoctorId || null)
    .input('createdBy', sql.Int, data.createdBy)
    .query('INSERT INTO Pregnancies (PatientId,CaseId,PregnancyNumber,LMP,EDD,EDDMethod,Gravida,Para,Abortions,LivingChildren,FetalCount,RiskFactorsJson,AssignedDoctorId,CreatedBy) OUTPUT INSERTED.* VALUES (@patientId,@caseId,@number,@lmp,@edd,@eddMethod,@gravida,@para,@abortions,@living,@fetalCount,@risk,@doctorId,@createdBy)')).recordset[0];
});
const updatePregnancyOutcome = async (id,data) => (await query(`UPDATE Pregnancies SET BirthDate=@date,DeliveryType=@delivery,BirthOutcome=@outcome,BirthComplications=@complications,Hospital=@hospital,PostpartumPlan=@postpartum,Status=@status,ClosedAt=CASE WHEN @status IN (N'closed',N'resolved') THEN SYSUTCDATETIME() ELSE ClosedAt END,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id AND PatientId=@patientId`,q=>q.input('id',sql.Int,id).input('patientId',sql.Int,data.patientId).input('date',sql.Date,data.birthDate||null).input('delivery',sql.NVarChar(50),data.deliveryType||null).input('outcome',sql.NVarChar(80),data.birthOutcome||null).input('complications',sql.NVarChar(1000),data.birthComplications||null).input('hospital',sql.NVarChar(180),data.hospital||null).input('postpartum',sql.NVarChar(2000),data.postpartumPlan||null).input('status',sql.NVarChar(30),data.status||'closed'))).recordset[0]||null;

const listMedications = async (patientId) => (await query(`SELECT m.*,d.FullName PrescriberName FROM Medications m JOIN Doctors d ON d.Id=m.PrescribedBy WHERE m.PatientId=@patientId ORDER BY m.StartDate DESC,m.CreatedAt DESC`,q=>q.input('patientId',sql.Int,patientId))).recordset;
const createMedication = async (d) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, { patientId: d.patientId, caseId: d.caseId, visitId: d.visitId });
  return (await transaction.request().input('patientId',sql.Int,d.patientId).input('caseId',sql.Int,d.caseId||null).input('visitId',sql.Int,d.visitId||null).input('drug',sql.NVarChar(180),d.drugName).input('generic',sql.NVarChar(180),d.genericName||null).input('dose',sql.NVarChar(80),d.dose).input('unit',sql.NVarChar(50),d.doseUnit||null).input('route',sql.NVarChar(40),d.route||null).input('frequency',sql.NVarChar(80),d.frequency).input('duration',sql.NVarChar(80),d.duration||null).input('start',sql.Date,d.startDate).input('end',sql.Date,d.plannedEndDate||null).input('indication',sql.NVarChar(500),d.indication||null).input('doctor',sql.Int,d.prescribedBy).input('status',sql.NVarChar(30),d.status||'active').input('notes',sql.NVarChar(1000),d.notes||null).query('INSERT INTO Medications (PatientId,CaseId,VisitId,DrugName,GenericName,Dose,DoseUnit,Route,Frequency,Duration,StartDate,PlannedEndDate,Indication,PrescribedBy,Status,Notes) OUTPUT INSERTED.* VALUES (@patientId,@caseId,@visitId,@drug,@generic,@dose,@unit,@route,@frequency,@duration,@start,@end,@indication,@doctor,@status,@notes)')).recordset[0];
});
const updateMedication = async (id,d) => (await query(`UPDATE Medications SET Status=@status,PlannedEndDate=@end,StopReason=@reason,Notes=@notes,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id AND PatientId=@patientId`,q=>q.input('id',sql.Int,id).input('patientId',sql.Int,d.patientId).input('status',sql.NVarChar(30),d.status).input('end',sql.Date,d.plannedEndDate||null).input('reason',sql.NVarChar(500),d.stopReason||null).input('notes',sql.NVarChar(1000),d.notes||null))).recordset[0]||null;

const listAllergies = async (patientId) => (await query(`SELECT al.*,u.FullName RecordedByName FROM Allergies al LEFT JOIN Users u ON u.Id=al.RecordedBy WHERE al.PatientId=@patientId ORDER BY al.RecordedAt DESC`,q=>q.input('patientId',sql.Int,patientId))).recordset;
const createAllergy = async (d) => (await query(`INSERT INTO Allergies (PatientId,Substance,Reaction,Severity,Status,Notes,RecordedBy) OUTPUT INSERTED.* VALUES (@patientId,@substance,@reaction,@severity,@status,@notes,@recordedBy)`,q=>q.input('patientId',sql.Int,d.patientId).input('substance',sql.NVarChar(180),d.substance).input('reaction',sql.NVarChar(500),d.reaction||null).input('severity',sql.NVarChar(30),d.severity||null).input('status',sql.NVarChar(30),d.status||'active').input('notes',sql.NVarChar(1000),d.notes||null).input('recordedBy',sql.Int,d.recordedBy||null))).recordset[0];

const listLabs = async (patientId) => (await query(`SELECT l.*,d.FullName RequestedByName FROM LabTests l LEFT JOIN Doctors d ON d.Id=l.RequestedBy WHERE l.PatientId=@patientId ORDER BY COALESCE(l.ResultDate,l.RequestedDate) DESC,l.CreatedAt DESC`,q=>q.input('patientId',sql.Int,patientId))).recordset;
const createLab = async (d) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, { patientId: d.patientId, caseId: d.caseId, visitId: d.visitId });
  return (await transaction.request().input('patientId',sql.Int,d.patientId).input('caseId',sql.Int,d.caseId||null).input('visitId',sql.Int,d.visitId||null).input('name',sql.NVarChar(180),d.testName).input('code',sql.NVarChar(50),d.code||null).input('requested',sql.Date,d.requestedDate||null).input('collected',sql.Date,d.collectedDate||null).input('resultDate',sql.Date,d.resultDate||null).input('numeric',sql.Decimal(18,6),d.resultNumeric??null).input('text',sql.NVarChar(2000),d.resultText||null).input('unit',sql.NVarChar(50),d.unit||null).input('range',sql.NVarChar(120),d.referenceRange||null).input('flag',sql.NVarChar(30),d.abnormalFlag||null).input('status',sql.NVarChar(30),d.status||'ordered').input('doctor',sql.Int,d.requestedBy||null).input('notes',sql.NVarChar(1000),d.notes||null).query('INSERT INTO LabTests (PatientId,CaseId,VisitId,TestName,Code,RequestedDate,CollectedDate,ResultDate,ResultNumeric,ResultText,Unit,ReferenceRange,AbnormalFlag,Status,RequestedBy,Notes) OUTPUT INSERTED.* VALUES (@patientId,@caseId,@visitId,@name,@code,@requested,@collected,@resultDate,@numeric,@text,@unit,@range,@flag,@status,@doctor,@notes)')).recordset[0];
});

const listUltrasounds = async (patientId) => (await query(`SELECT u.*,d.FullName PerformedByName FROM Ultrasounds u JOIN Doctors d ON d.Id=u.PerformedBy WHERE u.PatientId=@patientId ORDER BY u.StudyDate DESC,u.CreatedAt DESC`,q=>q.input('patientId',sql.Int,patientId))).recordset;
const createUltrasound = async (d) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, { patientId: d.patientId, caseId: d.caseId, visitId: d.visitId });
  return (await transaction.request().input('patientId',sql.Int,d.patientId).input('caseId',sql.Int,d.caseId||null).input('visitId',sql.Int,d.visitId||null).input('doctor',sql.Int,d.performedBy).input('date',sql.Date,d.studyDate).input('type',sql.NVarChar(50),d.studyType).input('indication',sql.NVarChar(500),d.indication||null).input('technique',sql.NVarChar(40),d.technique||null).input('weeks',sql.TinyInt,d.gestationalAgeWeeks??null).input('days',sql.TinyInt,d.gestationalAgeDays??null).input('fetalCount',sql.TinyInt,d.fetalCount??null).input('fhr',sql.SmallInt,d.fetalHeartRateBpm??null).input('crl',sql.Decimal(6,2),d.crlMm??null).input('bpd',sql.Decimal(6,2),d.bpdMm??null).input('hc',sql.Decimal(6,2),d.hcMm??null).input('ac',sql.Decimal(6,2),d.acMm??null).input('fl',sql.Decimal(6,2),d.flMm??null).input('efw',sql.Int,d.estimatedFetalWeightGrams??null).input('placenta',sql.NVarChar(180),d.placenta||null).input('fluid',sql.NVarChar(180),d.amnioticFluid||null).input('cervix',sql.Decimal(6,2),d.cervixLengthMm??null).input('uterus',sql.NVarChar(120),d.uterusDimensions||null).input('endo',sql.Decimal(6,2),d.endometriumThicknessMm??null).input('rightOvary',sql.NVarChar(120),d.rightOvaryDimensions||null).input('leftOvary',sql.NVarChar(120),d.leftOvaryDimensions||null).input('adnexa',sql.NVarChar(2000),d.adnexaFindings||null).input('findings',sql.NVarChar(4000),d.findings||null).input('impression',sql.NVarChar(3000),d.impression||null).input('status',sql.NVarChar(30),d.status||'final').query('INSERT INTO Ultrasounds (PatientId,CaseId,VisitId,PerformedBy,StudyDate,StudyType,Indication,Technique,GestationalAgeWeeks,GestationalAgeDays,FetalCount,FetalHeartRateBpm,CrlMm,BpdMm,HcMm,AcMm,FlMm,EstimatedFetalWeightGrams,Placenta,AmnioticFluid,CervixLengthMm,UterusDimensions,EndometriumThicknessMm,RightOvaryDimensions,LeftOvaryDimensions,AdnexaFindings,Findings,Impression,Status) OUTPUT INSERTED.* VALUES (@patientId,@caseId,@visitId,@doctor,@date,@type,@indication,@technique,@weeks,@days,@fetalCount,@fhr,@crl,@bpd,@hc,@ac,@fl,@efw,@placenta,@fluid,@cervix,@uterus,@endo,@rightOvary,@leftOvary,@adnexa,@findings,@impression,@status)')).recordset[0];
});

const listDocuments = async (patientId) => (await query(`SELECT doc.Id,doc.PatientId,doc.CaseId,doc.VisitId,doc.DocumentType,doc.FileName,doc.MimeType,doc.FileSizeBytes,doc.DocumentDate,doc.UploadedBy,u.FullName UploadedByName,doc.IsArchived,doc.CreatedAt FROM Documents doc JOIN Users u ON u.Id=doc.UploadedBy WHERE doc.PatientId=@patientId AND doc.IsArchived=0 ORDER BY doc.DocumentDate DESC,doc.CreatedAt DESC`,q=>q.input('patientId',sql.Int,patientId))).recordset;
const createDocument = async (d) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, { patientId: d.patientId, caseId: d.caseId, visitId: d.visitId });
  return (await transaction.request().input('patientId',sql.Int,d.patientId).input('caseId',sql.Int,d.caseId||null).input('visitId',sql.Int,d.visitId||null).input('type',sql.NVarChar(60),d.documentType).input('fileName',sql.NVarChar(255),d.fileName).input('mime',sql.NVarChar(120),d.mimeType).input('size',sql.BigInt,d.fileSizeBytes).input('path',sql.NVarChar(1000),d.storagePath).input('date',sql.Date,d.documentDate||null).input('userId',sql.Int,d.uploadedBy).query('INSERT INTO Documents (PatientId,CaseId,VisitId,DocumentType,FileName,MimeType,FileSizeBytes,StoragePath,DocumentDate,UploadedBy) OUTPUT INSERTED.* VALUES (@patientId,@caseId,@visitId,@type,@fileName,@mime,@size,@path,@date,@userId)')).recordset[0];
});
const findDocument = async (id) => (await query('SELECT * FROM Documents WHERE Id=@id AND IsArchived=0',q=>q.input('id',sql.Int,id))).recordset[0]||null;

const listProgress = async (patientId, indicator) => (await query(`SELECT TOP 100 pi.*,v.VisitType FROM ProgressIndicators pi LEFT JOIN Visits v ON v.Id=pi.VisitId WHERE pi.PatientId=@patientId AND (@indicator=N'' OR pi.IndicatorName=@indicator) ORDER BY pi.RecordedAt DESC`,q=>q.input('patientId',sql.Int,patientId).input('indicator',sql.NVarChar(80),indicator||''))).recordset;
const createIndicator = async (d) => withTransaction(async (transaction) => {
  await ensureMedicalLinks(transaction, { patientId: d.patientId, caseId: d.caseId, visitId: d.visitId });
  return (await transaction.request().input('patientId',sql.Int,d.patientId).input('caseId',sql.Int,d.caseId||null).input('visitId',sql.Int,d.visitId||null).input('name',sql.NVarChar(80),d.indicatorName).input('numeric',sql.Decimal(18,6),d.valueNumeric??null).input('text',sql.NVarChar(300),d.valueText||null).input('unit',sql.NVarChar(40),d.unit||null).input('recordedAt',sql.DateTime2,d.recordedAt||new Date()).input('trend',sql.NVarChar(30),d.trendStatus||null).input('validated',sql.Bit,d.doctorValidated===true).input('doctor',sql.Int,d.createdBy||null).query('INSERT INTO ProgressIndicators (PatientId,CaseId,VisitId,IndicatorName,ValueNumeric,ValueText,Unit,RecordedAt,TrendStatus,DoctorValidated,CreatedBy) OUTPUT INSERTED.* VALUES (@patientId,@caseId,@visitId,@name,@numeric,@text,@unit,@recordedAt,@trend,@validated,@doctor)')).recordset[0];
});

const getGyneHistory = async (patientId) => (await query(`SELECT TOP 1 * FROM PatientGyneHistories WHERE PatientId=@patientId`, (request) => request.input('patientId', sql.Int, patientId))).recordset[0] || null;
const upsertGyneHistory = async (data) => withTransaction(async (transaction) => {
  const existing = await transaction.request().input('patientId', sql.Int, data.patientId).query('SELECT TOP 1 Id FROM PatientGyneHistories WITH (UPDLOCK,HOLDLOCK) WHERE PatientId=@patientId');
  const request = transaction.request()
    .input('patientId', sql.Int, data.patientId)
    .input('menarcheAge', sql.TinyInt, data.menarcheAge ?? null)
    .input('cycleIntervalDays', sql.TinyInt, data.cycleIntervalDays ?? null)
    .input('mensesDurationDays', sql.TinyInt, data.mensesDurationDays ?? null)
    .input('cycleRegularity', sql.NVarChar(30), data.cycleRegularity || null)
    .input('lastMenstrualPeriod', sql.Date, data.lastMenstrualPeriod || null)
    .input('menstrualFlow', sql.NVarChar(30), data.menstrualFlow || null)
    .input('clots', sql.Bit, data.clots ?? null)
    .input('dysmenorrhea', sql.NVarChar(30), data.dysmenorrhea || null)
    .input('contraceptionMethod', sql.NVarChar(120), data.contraceptionMethod || null)
    .input('stiHistory', sql.NVarChar(1000), data.stiHistory || null)
    .input('cervicalScreening', sql.NVarChar(sql.MAX), data.cervicalScreening ? JSON.stringify(data.cervicalScreening) : null)
    .input('notes', sql.NVarChar(2000), data.notes || null)
    .input('recordedBy', sql.Int, data.recordedBy || null);
  if (existing.recordset[0]) {
    return (await request.input('id', sql.Int, existing.recordset[0].Id).query(`UPDATE PatientGyneHistories SET MenarcheAge=@menarcheAge,CycleIntervalDays=@cycleIntervalDays,MensesDurationDays=@mensesDurationDays,CycleRegularity=@cycleRegularity,LastMenstrualPeriod=@lastMenstrualPeriod,MenstrualFlow=@menstrualFlow,Clots=@clots,Dysmenorrhea=@dysmenorrhea,ContraceptionMethod=@contraceptionMethod,StiHistory=@stiHistory,CervicalScreeningJson=@cervicalScreening,Notes=@notes,RecordedBy=@recordedBy,RecordedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id`)).recordset[0];
  }
  return (await request.query(`INSERT INTO PatientGyneHistories (PatientId,MenarcheAge,CycleIntervalDays,MensesDurationDays,CycleRegularity,LastMenstrualPeriod,MenstrualFlow,Clots,Dysmenorrhea,ContraceptionMethod,StiHistory,CervicalScreeningJson,Notes,RecordedBy) OUTPUT INSERTED.* VALUES (@patientId,@menarcheAge,@cycleIntervalDays,@mensesDurationDays,@cycleRegularity,@lastMenstrualPeriod,@menstrualFlow,@clots,@dysmenorrhea,@contraceptionMethod,@stiHistory,@cervicalScreening,@notes,@recordedBy)`)).recordset[0];
});
const listObstetricHistory = async (patientId) => (await query(`SELECT * FROM ObstetricHistory WHERE PatientId=@patientId ORDER BY COALESCE(PregnancyYear,0) DESC,RecordedAt DESC`, (request) => request.input('patientId', sql.Int, patientId))).recordset;
const createObstetricHistory = async (data) => (await query(`INSERT INTO ObstetricHistory (PatientId,PregnancyYear,Outcome,GestationalAgeWeeks,DeliveryMode,BirthWeightGrams,MajorComplication,Notes,RecordedBy) OUTPUT INSERTED.* VALUES (@patientId,@year,@outcome,@weeks,@mode,@weight,@complication,@notes,@recordedBy)`, (request) => request.input('patientId', sql.Int, data.patientId).input('year', sql.SmallInt, data.pregnancyYear ?? null).input('outcome', sql.NVarChar(40), data.outcome).input('weeks', sql.TinyInt, data.gestationalAgeWeeks ?? null).input('mode', sql.NVarChar(40), data.deliveryMode || null).input('weight', sql.Int, data.birthWeightGrams ?? null).input('complication', sql.NVarChar(500), data.majorComplication || null).input('notes', sql.NVarChar(1000), data.notes || null).input('recordedBy', sql.Int, data.recordedBy || null))).recordset[0];

module.exports={listCases,createCase,listVisits,getVisit,createVisit,completeVisit,listPregnancies,createPregnancy,updatePregnancyOutcome,listMedications,createMedication,updateMedication,listAllergies,createAllergy,listLabs,createLab,listUltrasounds,createUltrasound,listDocuments,createDocument,findDocument,listProgress,createIndicator,getGyneHistory,upsertGyneHistory,listObstetricHistory,createObstetricHistory};
