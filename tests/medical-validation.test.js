const test = require('node:test');
const assert = require('node:assert/strict');
const { visitSchema, medicationSchema, ultrasoundSchema } = require('../src/modules/medical-records/medical.validation');

test('antenatal visit accepts structured observations without requiring every optional field', () => {
  const result = visitSchema.safeParse({
    patientId: 1,
    doctorId: 2,
    visitType: 'pregnancy_follow_up',
    pregnancyVisit: {
      pregnancyId: 3,
      fundalHeightCm: 24.5,
      fetalHeartRateBpm: 142,
      fetalMovementConcern: 'no_concern',
      urineProtein: 'negative',
      edema: 'none',
      riskAssessmentOutcome: 'routine'
    }
  });
  assert.equal(result.success, true);
});

test('medication and ultrasound records require clinically meaningful identity fields', () => {
  assert.equal(medicationSchema.safeParse({ patientId: 1, drugName: 'Iron', dose: '1', frequency: 'daily', startDate: '2026-08-14' }).success, true);
  assert.equal(ultrasoundSchema.safeParse({ patientId: 1, performedBy: 2, studyDate: '2026-08-14', studyType: 'obstetric_standard' }).success, true);
  assert.equal(medicationSchema.safeParse({ patientId: 1, dose: '1', frequency: 'daily', startDate: '2026-08-14' }).success, false);
});
