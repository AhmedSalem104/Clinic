const crypto = require('node:crypto');
const repository = require('./patient.repository');
const { recordAudit } = require('../../services/audit.service');
const { AppError } = require('../../utils/errors');
const { canAccessPatient } = require('../medical-records/medical.access');

const normalizeText = (value) => String(value || '').trim().toLocaleLowerCase('ar-EG').replace(/\s+/g, ' ');
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const shape = (body) => ({
  fullName: String(body.fullName || '').trim(),
  normalizedName: normalizeText(body.fullName),
  dateOfBirth: body.dateOfBirth || null,
  phone: String(body.phone || '').trim(),
  normalizedPhone: normalizePhone(body.phone),
  alternatePhone: body.alternatePhone || null,
  preferredContactChannel: body.preferredContactChannel || null,
  address: body.address || null,
  emergencyContactName: body.emergencyContactName || null,
  emergencyContactPhone: body.emergencyContactPhone || null,
  profileStatus: body.profileStatus || null
});

const list = async (params) => repository.list({ ...params, search: normalizeText(params.search || '') });

const create = async (body, req) => {
  const data = shape(body);
  const duplicates = await repository.findPotentialDuplicates(data);
  if (duplicates.length && body.confirmDuplicate !== true) throw new AppError('يوجد سجل مريضة مشابه. راجع النتائج قبل الإنشاء.', 409, 'POTENTIAL_DUPLICATE', { matches: duplicates });
  const patient = await repository.create({ ...data, registrationSource: 'reception', profileStatus: 'complete', patientCode: `P-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}` });
  await recordAudit({ req, action: 'create', entity: 'patient', entityId: patient.Id, newValue: patient });
  return patient;
};

const getById = async (id, user) => {
  const patient = await repository.getById(id, user);
  if (!patient) throw new AppError('المريضة غير موجودة أو غير متاحة لهذا المستخدم.', 404, 'PATIENT_NOT_FOUND');
  if (user?.role === 'owner' || user?.role === 'doctor') {
    await recordAudit({ req: { user }, action: 'access_sensitive_record', entity: 'patient', entityId: id });
    return patient;
  }
  return { ...patient, CurrentCaseId: null, CurrentCase: null, CurrentCaseStatus: null, LatestVisitId: null, LatestVisitDate: null, LatestDiagnosis: null, ActivePregnancyId: null, EDD: null, LMP: null, medications: [], allergies: [] };
};

const update = async (id, body, req) => {
  const data = shape(body);
  const result = await repository.update(id, data);
  if (!result) throw new AppError('المريضة غير موجودة.', 404, 'PATIENT_NOT_FOUND');
  await recordAudit({ req, action: 'update', entity: 'patient', entityId: id, oldValue: result.before, newValue: result.patient });
  return result.patient;
};

const remove = async (id, req) => {
  const before = await repository.getDeleteTarget(id);
  if (!before) throw new AppError('المريضة غير موجودة.', 404, 'PATIENT_NOT_FOUND');
  const patient = await repository.remove(id);
  if (!patient) throw new AppError('المريضة غير موجودة.', 404, 'PATIENT_NOT_FOUND');
  await recordAudit({ req, action: 'delete', entity: 'patient', entityId: id, oldValue: before });
  return patient;
};

const assign = async (body, req) => {
  const previous = await repository.getAssignments(body.patientId);
  const assignment = await repository.assign({ ...body, assignedBy: req.user.id });
  const previousActive = previous.find((item) => item.AssignmentType === body.assignmentType && !item.EndedAt && (body.caseId ? item.CaseId === body.caseId : true));
  await recordAudit({ req, action: 'assign_doctor', entity: 'patient_assignment', entityId: assignment.Id, oldValue: previousActive || null, newValue: assignment });
  return assignment;
};

const getAssignments = async (patientId, user) => {
  if (user?.role === 'doctor' && !(await canAccessPatient(patientId, user))) throw new AppError('Patient is not assigned to this doctor.', 403, 'PATIENT_ACCESS_DENIED');
  return repository.getAssignments(patientId);
};

module.exports = { list, create, getById, update, remove, assign, getAssignments, normalizeText, normalizePhone };
