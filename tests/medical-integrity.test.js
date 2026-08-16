const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureRelationBelongsToPatient } = require('../src/modules/medical-records/medical.integrity');

const fakeTransaction = ({ valid = true } = {}) => ({
  request() {
    const values = {};
    return {
      input(name, _type, value) { values[name] = value; return this; },
      async query(statement) {
        if (statement.includes('MedicalCases')) return { recordset: valid ? [{ Id: values.relationId }] : [] };
        return { recordset: [] };
      }
    };
  }
});

test('medical relation integrity accepts a relation belonging to the patient', async () => {
  await assert.doesNotReject(() => ensureRelationBelongsToPatient(fakeTransaction(), 'case', 10, 5));
});

test('medical relation integrity rejects a relation belonging to another patient', async () => {
  await assert.rejects(
    () => ensureRelationBelongsToPatient(fakeTransaction({ valid: false }), 'case', 10, 5),
    (error) => error.code === 'CASE_PATIENT_MISMATCH' && error.statusCode === 400
  );
});
