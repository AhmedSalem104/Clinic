const { z } = require('zod');

const optionalDate = z.string().date().optional().nullable().or(z.literal(''));
const optionalEnum = (values) => z.enum(values).optional().nullable().or(z.literal(''));
const optionalNumber = (schema) => schema.optional().nullable();

const caseSchema = z.object({
  patientId: z.coerce.number().int().positive(), type: z.string().trim().min(2).max(80),
  status: z.enum(['active', 'resolved', 'closed', 'on_hold']).optional(), startDate: optionalDate,
  assignedDoctorId: z.coerce.number().int().positive().optional().nullable(), summary: z.string().max(1000).optional().nullable()
});

const pregnancyVisitSchema = z.object({
  pregnancyId: z.coerce.number().int().positive(),
  fundalHeightCm: optionalNumber(z.coerce.number().min(0).max(100)),
  fetalHeartRateBpm: optionalNumber(z.coerce.number().int().min(0).max(250)),
  fetalMovementConcern: optionalEnum(['no_concern', 'concern_reported', 'not_assessed']),
  urineProtein: optionalEnum(['negative', 'trace', '+', '++', '+++', 'not_done']),
  edema: optionalEnum(['none', 'mild', 'moderate', 'severe', 'not_assessed']),
  presentation: z.string().max(40).optional().nullable(),
  riskAssessmentOutcome: optionalEnum(['routine', 'needs_review', 'refer']),
  symptoms: z.record(z.boolean()).optional(), fetalData: z.record(z.any()).optional()
});

const visitSchema = z.object({
  patientId: z.coerce.number().int().positive(), appointmentId: z.coerce.number().int().positive().optional().nullable(),
  caseId: z.coerce.number().int().positive().optional().nullable(), doctorId: z.coerce.number().int().positive().optional(),
  visitType: z.enum(['first_visit', 'follow_up', 'gynecology', 'pregnancy_follow_up', 'ultrasound', 'procedure']),
  status: z.enum(['draft', 'completed']).optional(), chiefComplaint: z.string().max(2000).optional().nullable(),
  symptoms: z.string().max(3000).optional().nullable(), examination: z.string().max(3000).optional().nullable(),
  assessment: z.string().max(3000).optional().nullable(), diagnosis: z.string().max(3000).optional().nullable(),
  treatmentPlan: z.string().max(3000).optional().nullable(), doctorNotes: z.string().max(5000).optional().nullable(),
  followUpPlan: z.string().max(2000).optional().nullable(), nextVisitDate: optionalDate,
  weightKg: optionalNumber(z.coerce.number().min(0).max(500)), heightCm: optionalNumber(z.coerce.number().min(0).max(250)),
  systolicBp: optionalNumber(z.coerce.number().int().min(0).max(300)), diastolicBp: optionalNumber(z.coerce.number().int().min(0).max(200)),
  pulseBpm: optionalNumber(z.coerce.number().int().min(0).max(250)), temperatureC: optionalNumber(z.coerce.number().min(20).max(50)),
  oxygenSaturation: optionalNumber(z.coerce.number().min(0).max(100)), painScore: optionalNumber(z.coerce.number().int().min(0).max(10)),
  pregnancyVisit: pregnancyVisitSchema.optional()
});

const pregnancySchema = z.object({
  patientId: z.coerce.number().int().positive(), caseId: z.coerce.number().int().positive().optional().nullable(),
  pregnancyNumber: optionalNumber(z.coerce.number().int().positive()), lmp: optionalDate, edd: optionalDate,
  eddMethod: optionalEnum(['lmp', 'early_ultrasound', 'other_clinician_assessment']), gravida: optionalNumber(z.coerce.number().int().min(0).max(30)),
  para: optionalNumber(z.coerce.number().int().min(0).max(30)), abortions: optionalNumber(z.coerce.number().int().min(0).max(30)),
  livingChildren: optionalNumber(z.coerce.number().int().min(0).max(30)), fetalCount: optionalNumber(z.coerce.number().int().min(1).max(10)),
  riskFactors: z.array(z.string().max(120)).optional(), assignedDoctorId: z.coerce.number().int().positive().optional().nullable()
});

const outcomeSchema = z.object({
  patientId: z.coerce.number().int().positive(), birthDate: optionalDate, deliveryType: z.string().max(50).optional().nullable(),
  birthOutcome: z.string().max(80).optional().nullable(), birthComplications: z.string().max(1000).optional().nullable(),
  hospital: z.string().max(180).optional().nullable(), postpartumPlan: z.string().max(2000).optional().nullable(),
  status: z.enum(['active', 'resolved', 'closed', 'on_hold']).default('closed')
});

const medicationSchema = z.object({
  patientId: z.coerce.number().int().positive(), caseId: z.coerce.number().int().positive().optional().nullable(), visitId: z.coerce.number().int().positive().optional().nullable(),
  drugName: z.string().trim().min(1).max(180), genericName: z.string().max(180).optional().nullable(), dose: z.string().trim().min(1).max(80), doseUnit: z.string().max(50).optional().nullable(),
  route: optionalEnum(['oral', 'topical', 'vaginal', 'intramuscular', 'intravenous', 'other']), frequency: z.string().trim().min(1).max(80), duration: z.string().max(80).optional().nullable(),
  startDate: z.string().date(), plannedEndDate: optionalDate, indication: z.string().max(500).optional().nullable(), prescribedBy: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'stopped', 'completed']).optional(), stopReason: z.string().max(500).optional().nullable(), notes: z.string().max(1000).optional().nullable()
});

const medicationStatusSchema = z.object({ patientId: z.coerce.number().int().positive(), status: z.enum(['active', 'stopped', 'completed']), plannedEndDate: optionalDate, stopReason: z.string().max(500).optional().nullable(), notes: z.string().max(1000).optional().nullable() });
const allergySchema = z.object({ patientId: z.coerce.number().int().positive(), substance: z.string().trim().min(1).max(180), reaction: z.string().max(500).optional().nullable(), severity: optionalEnum(['mild', 'moderate', 'severe', 'unknown']), status: z.enum(['active', 'inactive', 'entered_in_error']).optional(), notes: z.string().max(1000).optional().nullable() });

const labSchema = z.object({
  patientId: z.coerce.number().int().positive(), caseId: z.coerce.number().int().positive().optional().nullable(), visitId: z.coerce.number().int().positive().optional().nullable(),
  testName: z.string().trim().min(1).max(180), code: z.string().max(50).optional().nullable(), requestedDate: optionalDate, collectedDate: optionalDate, resultDate: optionalDate,
  resultNumeric: optionalNumber(z.coerce.number()), resultText: z.string().max(2000).optional().nullable(), unit: z.string().max(50).optional().nullable(), referenceRange: z.string().max(120).optional().nullable(),
  abnormalFlag: optionalEnum(['normal', 'high', 'low', 'critical', 'not_interpreted']), status: z.enum(['ordered', 'collected', 'resulted', 'cancelled']).optional(), requestedBy: z.coerce.number().int().positive().optional(), notes: z.string().max(1000).optional().nullable()
});

const ultrasoundSchema = z.object({
  patientId: z.coerce.number().int().positive(), caseId: z.coerce.number().int().positive().optional().nullable(), visitId: z.coerce.number().int().positive().optional().nullable(), performedBy: z.coerce.number().int().positive().optional(),
  studyDate: z.string().date(), studyType: z.enum(['obstetric_standard', 'obstetric_detailed', 'gynecological_pelvic', 'follow_up', 'other']), indication: z.string().max(500).optional().nullable(), technique: optionalEnum(['transabdominal', 'transvaginal', 'both', 'other']),
  gestationalAgeWeeks: optionalNumber(z.coerce.number().int().min(0).max(45)), gestationalAgeDays: optionalNumber(z.coerce.number().int().min(0).max(6)), fetalCount: optionalNumber(z.coerce.number().int().min(1).max(10)), fetalHeartRateBpm: optionalNumber(z.coerce.number().int().min(0).max(250)),
  crlMm: optionalNumber(z.coerce.number().min(0)), bpdMm: optionalNumber(z.coerce.number().min(0)), hcMm: optionalNumber(z.coerce.number().min(0)), acMm: optionalNumber(z.coerce.number().min(0)), flMm: optionalNumber(z.coerce.number().min(0)), estimatedFetalWeightGrams: optionalNumber(z.coerce.number().int().min(0)),
  placenta: z.string().max(180).optional().nullable(), amnioticFluid: z.string().max(180).optional().nullable(), cervixLengthMm: optionalNumber(z.coerce.number().min(0)), uterusDimensions: z.string().max(120).optional().nullable(), endometriumThicknessMm: optionalNumber(z.coerce.number().min(0)), rightOvaryDimensions: z.string().max(120).optional().nullable(), leftOvaryDimensions: z.string().max(120).optional().nullable(), adnexaFindings: z.string().max(2000).optional().nullable(), findings: z.string().max(4000).optional().nullable(), impression: z.string().max(3000).optional().nullable(), status: z.string().max(30).optional()
});

const progressSchema = z.object({
  patientId: z.coerce.number().int().positive(), caseId: z.coerce.number().int().positive().optional().nullable(), visitId: z.coerce.number().int().positive().optional().nullable(),
  indicatorName: z.enum(['weight', 'systolic_bp', 'diastolic_bp', 'pain_score', 'fundal_height', 'fetal_heart_rate', 'lab_value']), valueNumeric: optionalNumber(z.coerce.number()), valueText: z.string().max(300).optional().nullable(), unit: z.string().max(40).optional().nullable(), recordedAt: z.string().datetime().optional(), trendStatus: optionalEnum(['improving', 'stable', 'worsening', 'needs_review']), doctorValidated: z.boolean().optional()
});

const gyneHistorySchema = z.object({
  patientId: z.coerce.number().int().positive(),
  menarcheAge: optionalNumber(z.coerce.number().int().min(8).max(20)),
  cycleIntervalDays: optionalNumber(z.coerce.number().int().min(1).max(120)),
  mensesDurationDays: optionalNumber(z.coerce.number().int().min(1).max(30)),
  cycleRegularity: optionalEnum(['regular', 'irregular', 'unknown']),
  lastMenstrualPeriod: optionalDate,
  menstrualFlow: optionalEnum(['light', 'average', 'heavy', 'unknown']),
  clots: z.boolean().optional().nullable(),
  dysmenorrhea: optionalEnum(['none', 'mild', 'moderate', 'severe']),
  contraceptionMethod: z.string().max(120).optional().nullable(),
  stiHistory: z.string().max(1000).optional().nullable(),
  cervicalScreening: z.record(z.any()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});

const obstetricHistorySchema = z.object({
  patientId: z.coerce.number().int().positive(),
  pregnancyYear: optionalNumber(z.coerce.number().int().min(1900).max(2200)),
  outcome: z.enum(['live_birth', 'stillbirth', 'miscarriage', 'termination', 'ectopic', 'other']),
  gestationalAgeWeeks: optionalNumber(z.coerce.number().int().min(0).max(45)),
  deliveryMode: z.string().max(40).optional().nullable(),
  birthWeightGrams: optionalNumber(z.coerce.number().int().min(0).max(10000)),
  majorComplication: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});

module.exports = { caseSchema, visitSchema, pregnancySchema, outcomeSchema, medicationSchema, medicationStatusSchema, allergySchema, labSchema, ultrasoundSchema, progressSchema, gyneHistorySchema, obstetricHistorySchema };
