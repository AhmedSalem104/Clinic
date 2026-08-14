const test = require('node:test');
const assert = require('node:assert/strict');
const { registrationSchema } = require('../src/modules/patient-portal/patient-portal.validation');

const validRegistration = {
  fullName: 'Sara Ahmed',
  dateOfBirth: '1992-04-12',
  phone: '01012345678',
  email: 'sara@example.com',
  password: 'ChangeMe!123',
  confirmPassword: 'ChangeMe!123',
  preferredContactChannel: 'whatsapp',
  consent: true
};

test('patient self-registration accepts email/password without OTP fields', () => {
  const result = registrationSchema.safeParse(validRegistration);
  assert.equal(result.success, true);
  assert.equal(Object.hasOwn(result.data, 'otp'), false);
});

test('patient self-registration rejects mismatched passwords and missing consent', () => {
  const mismatch = registrationSchema.safeParse({
    ...validRegistration,
    confirmPassword: 'Different!123'
  });
  assert.equal(mismatch.success, false);
  assert.ok(mismatch.error.issues.some((issue) => issue.path[0] === 'confirmPassword'));

  const missingConsent = registrationSchema.safeParse({ ...validRegistration, consent: false });
  assert.equal(missingConsent.success, false);
  assert.ok(missingConsent.error.issues.some((issue) => issue.path[0] === 'consent'));
});
