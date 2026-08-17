'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PERMISSIONS, ROLE_PERMISSIONS, ROLES, hasPermission } = require('../config/permissions');
const { redactSensitive } = require('./agent-contracts');

const ROOT = path.resolve(__dirname, '..', '..');
const MAX_PROCESS_OUTPUT = 3000;

const fileExists = (cwd, relativePath) => fs.existsSync(path.join(cwd, relativePath));
const readText = (cwd, relativePath) => {
  try { return fs.readFileSync(path.join(cwd, relativePath), 'utf8'); } catch (_) { return ''; }
};

const finding = (id, severity, message, evidence = null, recommendation = '') => ({
  id, severity, message, evidence, recommendation
});

const truncate = (value, max = MAX_PROCESS_OUTPUT) => {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const runProcess = (command, args, cwd, timeout = 120000) => {
  const useWindowsShell = process.platform === 'win32' && command === 'npm';
  const executable = useWindowsShell ? (process.env.ComSpec || 'cmd.exe') : command;
  const processArgs = useWindowsShell ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args;
  const result = spawnSync(executable, processArgs, {
    cwd,
    encoding: 'utf8',
    timeout,
    windowsHide: true,
    maxBuffer: 1024 * 1024
  });
  return {
    command: [command, ...args].join(' '),
    status: result.status,
    signal: result.signal,
    error: result.error ? result.error.message : null,
    stdout: truncate(redactSensitive(result.stdout || '')),
    stderr: truncate(redactSensitive(result.stderr || ''))
  };
};

const gate = async (definition, callback) => {
  const startedAt = Date.now();
  try {
    const result = await callback();
    return {
      id: definition.id,
      agentId: definition.agentId,
      status: result.status || 'pass',
      durationMs: Date.now() - startedAt,
      findings: result.findings || [],
      evidence: result.evidence || null,
      metrics: result.metrics || null
    };
  } catch (error) {
    return {
      id: definition.id,
      agentId: definition.agentId,
      status: 'fail',
      durationMs: Date.now() - startedAt,
      findings: [finding('GATE_EXECUTION_ERROR', 'blocker', 'The quality gate could not complete safely.', { error: error.message }, 'Fix the gate or repository error before release.')]
    };
  }
};

const syntaxFiles = (cwd) => {
  const result = ['server.js', 'tailwind.config.js'];
  const roots = ['src', 'scripts'];
  const visit = (relativeDir) => {
    const absoluteDir = path.join(cwd, relativeDir);
    if (!fs.existsSync(absoluteDir)) return;
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const relative = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile() && entry.name.endsWith('.js')) result.push(relative);
    }
  };
  roots.forEach(visit);
  return result.filter((item) => fileExists(cwd, item));
};

const syntaxGate = (cwd) => gate({ id: 'syntax', agentId: 'qa_automation' }, async () => {
  const failures = [];
  for (const relativePath of syntaxFiles(cwd)) {
    const result = runProcess(process.execPath, ['--check', path.resolve(cwd, relativePath)], cwd, 30000);
    if (result.status !== 0) {
      failures.push(finding('SYNTAX_ERROR', 'blocker', `JavaScript syntax check failed for ${relativePath}.`, result.stderr || result.stdout, 'Fix the syntax error before running the application.'));
    }
  }
  return { status: failures.length ? 'fail' : 'pass', findings: failures, evidence: { filesChecked: syntaxFiles(cwd).length } };
});

const testsGate = (cwd) => gate({ id: 'tests', agentId: 'qa_automation' }, async () => {
  const result = runProcess('npm', ['test'], cwd, 180000);
  if (result.status !== 0) {
    return {
      status: 'fail',
      findings: [finding('TEST_SUITE_FAILED', 'blocker', 'The automated test suite failed.', { status: result.status, stderr: result.stderr, stdout: result.stdout }, 'Fix the failing test or explicitly record an approved exception.')],
      evidence: { command: result.command, status: result.status }
    };
  }
  return { status: 'pass', evidence: { command: result.command, status: result.status, output: result.stdout } };
});

const getTrackedFiles = (cwd) => {
  const executable = process.platform === 'win32' ? 'git.exe' : 'git';
  const result = spawnSync(executable, ['ls-files', '-z'], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.status !== 0) return { error: result.stderr || result.error?.message || 'git ls-files failed', files: [] };
  return { files: String(result.stdout || '').split('\0').filter(Boolean), error: null };
};

const secretScanGate = (cwd) => gate({ id: 'secret_scan', agentId: 'security' }, async () => {
  const tracked = getTrackedFiles(cwd);
  if (tracked.error) {
    return { status: 'needs_review', findings: [finding('TRACKED_FILE_LIST_UNAVAILABLE', 'high', 'Could not establish the tracked-file set for the secret scan.', tracked.error, 'Run the gate from a Git checkout.') ] };
  }

  const findings = [];
  const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i;
  const connectionSecretPattern = /(?:server|data\s+source|database|connectionstring)[^\r\n]{0,180}password\s*=\s*(?!your-|replace-|change-|<)[^\s;]+/i;
  const envSecretPattern = /\b(?:JWT_SECRET|DB_PASSWORD|SESSION_SECRET|API_KEY)\s*=\s*(?!your-|replace-|change-|<|\$\{)[^\s#]{16,}/i;

  for (const relativePath of tracked.files) {
    if (relativePath === '.env' || relativePath.endsWith('.env')) {
      findings.push(finding('ENV_FILE_TRACKED', 'blocker', 'A real environment file is tracked by Git.', relativePath, 'Remove it from Git history and keep secrets in deployment environment variables.'));
      continue;
    }
    if (/\.example$|\.md$|package-lock\.json$/i.test(relativePath)) continue;
    const contents = readText(cwd, relativePath);
    if (privateKeyPattern.test(contents) || connectionSecretPattern.test(contents) || envSecretPattern.test(contents)) {
      findings.push(finding('POSSIBLE_SECRET', 'blocker', `A possible secret was found in tracked file ${relativePath}.`, { file: relativePath }, 'Move the value to .env/Vercel environment variables and rotate it if it was real.'));
    }
  }
  return { status: findings.length ? 'fail' : 'pass', findings, evidence: { trackedFiles: tracked.files.length } };
});

const permissionGate = (cwd) => gate({ id: 'permission_contract', agentId: 'security' }, async () => {
  const findings = [];
  if (!hasPermission(ROLES.OWNER, PERMISSIONS.VIEW_MEDICAL)) findings.push(finding('OWNER_PERMISSION_MISSING', 'blocker', 'Owner must be able to view medical records.'));
  if (hasPermission(ROLES.RECEPTION, PERMISSIONS.VIEW_MEDICAL)) findings.push(finding('RECEPTION_MEDICAL_ACCESS', 'blocker', 'Reception must not receive medical-record permission by default.', null, 'Keep clinical data behind a server-side permission check.'));
  if (hasPermission(ROLES.DOCTOR, PERMISSIONS.VIEW_ALL_PATIENTS)) findings.push(finding('DOCTOR_SCOPE_TOO_BROAD', 'blocker', 'A regular doctor must not have all-patients permission by default.'));
  if (!hasPermission(ROLES.PATIENT, PERMISSIONS.BOOK_SELF_APPOINTMENT)) findings.push(finding('PATIENT_SELF_BOOKING_MISSING', 'blocker', 'Patient self-booking permission is missing.'));
  if (hasPermission(ROLES.PATIENT, PERMISSIONS.MANAGE_BOOKINGS)) findings.push(finding('PATIENT_BOOKING_ADMIN_ACCESS', 'blocker', 'Patient must not have staff booking-management permission.'));

  const authSource = readText(cwd, 'src/middleware/auth.js');
  for (const marker of ['requireAppointmentCreate', 'req.user.patientId', 'bookingSource', "'online'"]) {
    if (!authSource.includes(marker)) findings.push(finding('PATIENT_BOOKING_BOUNDARY_MISSING', 'high', `Server-side patient booking boundary is missing: ${marker}.`));
  }
  return { status: findings.some((item) => item.severity === 'blocker') ? 'fail' : findings.length ? 'needs_review' : 'pass', findings, evidence: { roles: Object.keys(ROLE_PERMISSIONS) } };
});

const routeContractGate = (cwd) => gate({ id: 'route_contract', agentId: 'booking' }, async () => {
  const routeIndex = readText(cwd, 'src/routes/index.js');
  const required = [
    ['patients', 'src/modules/patients/patient.routes.js'],
    ['doctors', 'src/modules/doctors/doctor.routes.js'],
    ['appointments', 'src/modules/appointments/appointment.routes.js'],
    ['queue', 'src/modules/queue/queue.routes.js'],
    ['public/booking', 'src/modules/public-booking/public-booking.routes.js'],
    ['patient-portal', 'src/modules/patient-portal/patient-portal.routes.js'],
    ['medical-history', 'src/modules/history/history.routes.js']
  ];
  const findings = [];
  for (const [mount, file] of required) {
    if (!fileExists(cwd, file) || !routeIndex.includes(`'/${mount}'`)) {
      findings.push(finding('ROUTE_MISSING', 'blocker', `Required API route is not mounted correctly: /${mount}.`, { file }, 'Restore the module route and keep the API contract documented.'));
    }
  }
  const packageJson = readText(cwd, 'package.json');
  if (!packageJson.includes('"express"') || !packageJson.includes('"mssql"')) findings.push(finding('STACK_CONTRACT_MISSING', 'high', 'The required Express/mssql runtime dependencies are missing.'));
  return { status: findings.length ? 'fail' : 'pass', findings, evidence: { checkedRoutes: required.length } };
});

const transactionGate = (cwd) => gate({ id: 'transaction_and_race_conditions', agentId: 'data_integrity' }, async () => {
  const repository = readText(cwd, 'src/modules/appointments/appointment.repository.js');
  const dbRepository = readText(cwd, 'src/db/repository.js');
  const schema = readText(cwd, 'database/schema.sql');
  const findings = [];
  if (!repository.includes('withTransaction')) findings.push(finding('BOOKING_TRANSACTION_MISSING', 'blocker', 'Booking writes are not wrapped in a transaction.'));
  if (!repository.includes('UPDLOCK,HOLDLOCK')) findings.push(finding('BOOKING_LOCK_MISSING', 'blocker', 'Booking overlap/queue allocation is missing SQL Server locking protection.', null, 'Use a transaction with UPDLOCK/HOLDLOCK around the slot and queue allocation.'));
  if (!dbRepository.includes('transaction.rollback')) findings.push(finding('ROLLBACK_MISSING', 'blocker', 'The shared transaction helper does not visibly rollback failed work.'));
  if (!schema.includes('UX_Queue_DoctorDateNumber')) findings.push(finding('QUEUE_UNIQUE_CONSTRAINT_MISSING', 'high', 'Queue number uniqueness is not represented in the schema.'));
  if (!schema.includes('OVERLAPPING_BOOKING') && !repository.includes('OVERLAPPING_BOOKING')) findings.push(finding('BOOKING_CONFLICT_CODE_MISSING', 'medium', 'A stable booking conflict code is not visible in the booking layer.'));
  return { status: findings.some((item) => item.severity === 'blocker') ? 'fail' : findings.length ? 'needs_review' : 'pass', findings, evidence: { transactionHelper: 'src/db/repository.js', bookingRepository: 'src/modules/appointments/appointment.repository.js' } };
});

const bookingGate = (cwd) => gate({ id: 'booking_contract', agentId: 'booking' }, async () => {
  const source = `${readText(cwd, 'src/modules/appointments/appointment.repository.js')}\n${readText(cwd, 'src/modules/appointments/appointment.service.js')}\n${readText(cwd, 'src/modules/public-booking/public-booking.routes.js')}`;
  const findings = [];
  for (const marker of ['availableSlots', 'validateBookableTime', 'bookingSource', 'PublicTrackingToken', 'OVERLAPPING_BOOKING']) {
    if (!source.includes(marker)) findings.push(finding('BOOKING_FLOW_MARKER_MISSING', 'high', `Booking flow marker is missing: ${marker}.`));
  }
  return { status: findings.length ? 'fail' : 'pass', findings, evidence: { flow: ['patient/public', 'reception', 'owner', 'availability', 'pricing', 'tracking'] } };
});

const queueGate = (cwd) => gate({ id: 'queue_realtime_contract', agentId: 'queue' }, async () => {
  const service = readText(cwd, 'src/modules/queue/queue.service.js');
  const repository = readText(cwd, 'src/modules/queue/queue.repository.js');
  const realtime = readText(cwd, 'src/realtime/socket.js');
  const tracking = readText(cwd, 'public/js/public-queue.js');
  const findings = [];
  for (const marker of ['emitRecalculated', 'queue:updated', 'doctor:paused', 'doctor:resumed']) {
    if (!`${service}\n${realtime}\n${tracking}`.includes(marker)) findings.push(finding('QUEUE_REALTIME_MARKER_MISSING', 'high', `Queue realtime marker is missing: ${marker}.`));
  }
  if (!repository.includes('peopleAhead') && !repository.includes('ExpectedStartAt')) findings.push(finding('QUEUE_ETA_DATA_MISSING', 'high', 'Queue repository does not expose ETA/people-ahead data.'));
  if (!tracking.includes('setInterval') && !tracking.includes('setTimeout')) findings.push(finding('QUEUE_FALLBACK_REFRESH_MISSING', 'high', 'Patient queue tracking has no polling fallback when realtime is unavailable.'));
  return { status: findings.length ? 'fail' : 'pass', findings, evidence: { realtime: 'socket.io + API fallback' } };
});

const medicalFormsGate = (cwd) => gate({ id: 'medical_forms_contract', agentId: 'medical_forms' }, async () => {
  const requiredDocs = ['patient-history.md', 'gynecology-visit.md', 'pregnancy-record.md', 'antenatal-visit.md', 'medication-record.md', 'ultrasound-record.md', 'allergy-lab-records.md'];
  const findings = [];
  for (const document of requiredDocs) {
    if (!fileExists(cwd, `docs/medical-forms/${document}`)) findings.push(finding('MEDICAL_FORM_DOC_MISSING', 'high', `Clinical form documentation is missing: ${document}.`, null, 'Document purpose, structured fields, requiredness, and source before adding the form.'));
  }
  const medicalDocs = requiredDocs.map((document) => readText(cwd, `docs/medical-forms/${document}`)).join('\n');
  if (!/required|optional|conditional/i.test(medicalDocs)) findings.push(finding('MEDICAL_REQUIREDNESS_UNDOCUMENTED', 'medium', 'Medical form docs do not declare required/optional/conditional field behavior.'));
  if (/automatic\s+diagnos|automated\s+diagnos|تشخيص\s*آلي/i.test(medicalDocs)) findings.push(finding('AUTOMATIC_DIAGNOSIS_LANGUAGE', 'blocker', 'Medical form documentation contains an automatic diagnosis claim.', null, 'Keep alerts rule-based and subject to clinician validation.'));
  return { status: findings.some((item) => item.severity === 'blocker') ? 'fail' : findings.length ? 'needs_review' : 'pass', findings, evidence: { documents: requiredDocs } };
});

const frontendGate = (cwd) => gate({ id: 'frontend_contract', agentId: 'ui_ux' }, async () => {
  const index = readText(cwd, 'public/index.html');
  const router = readText(cwd, 'public/js/core/router.js');
  const api = readText(cwd, 'public/js/core/api-service.js');
  const files = [];
  const visit = (relativeDir) => {
    const absoluteDir = path.join(cwd, relativeDir);
    if (!fs.existsSync(absoluteDir)) return;
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const relative = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(relative);
    }
  };
  visit('public/js');
  const findings = [];
  if (!/<html[^>]+dir=["']rtl["']/i.test(index)) findings.push(finding('RTL_CONTRACT_MISSING', 'high', 'The application shell is not marked as RTL.'));
  if (!index.includes('type="module"') || !index.includes('/js/core/app.js')) findings.push(finding('MODULE_BOOTSTRAP_MISSING', 'blocker', 'The frontend is not bootstrapped through the modular entrypoint.'));
  if (/cdn\.tailwindcss\.com/i.test(index)) findings.push(finding('TAILWIND_CDN_IN_PRODUCTION', 'high', 'The Tailwind CDN runtime is present in the production shell.', null, 'Use the checked-in compiled Tailwind CSS build.'));
  for (const relativePath of files) {
    if (/\brequire\s*\(/.test(readText(cwd, relativePath))) findings.push(finding('BROWSER_REQUIRE_ERROR', 'blocker', `Browser JavaScript uses CommonJS require(): ${relativePath}.`, null, 'Use ES modules/imports in public JavaScript.'));
  }
  if (!api.includes('AbortController') || !api.includes('inFlightGets')) findings.push(finding('API_REQUEST_GUARD_MISSING', 'medium', 'Frontend API request cancellation/deduplication is missing.'));
  if (!router.includes('import(')) findings.push(finding('FRONTEND_LAZY_ROUTE_MISSING', 'medium', 'Feature routes are not lazy-loaded through dynamic imports.'));
  return { status: findings.some((item) => item.severity === 'blocker') ? 'fail' : findings.length ? 'needs_review' : 'pass', findings, evidence: { browserFilesChecked: files.length } };
});

const schemaGate = (cwd) => gate({ id: 'schema_and_indexes', agentId: 'performance' }, async () => {
  const schema = readText(cwd, 'database/schema.sql');
  const requiredTables = ['Doctors', 'Services', 'Patients', 'Appointments', 'QueueEntries', 'Visits', 'MedicalCases', 'Pregnancies', 'AuditLogs'];
  const requiredIndexes = ['IX_Patients_NormalizedPhone', 'IX_Patients_NormalizedName', 'IX_Appointments_DoctorDateStatus', 'IX_Appointments_StartStatusDoctor', 'IX_Queue_DoctorDatePosition', 'IX_AuditLogs_CreatedAt'];
  const findings = [];
  for (const table of requiredTables) if (!schema.includes(`dbo.${table}`)) findings.push(finding('SCHEMA_TABLE_MISSING', 'blocker', `Schema does not mention required table ${table}.`));
  for (const index of requiredIndexes) if (!schema.includes(index)) findings.push(finding('SCHEMA_INDEX_MISSING', 'high', `Schema does not mention required high-volume index ${index}.`));
  if (!schema.includes('NormalizedPhone') || !schema.includes('NormalizedName')) findings.push(finding('PATIENT_SEARCH_INDEX_FIELDS_MISSING', 'high', 'Patient search fields are not represented in schema.'));
  return { status: findings.some((item) => item.severity === 'blocker') ? 'fail' : findings.length ? 'needs_review' : 'pass', findings, evidence: { tables: requiredTables.length, indexes: requiredIndexes.length } };
});

const performanceGate = (cwd) => gate({ id: 'performance_contract', agentId: 'performance' }, async () => {
  const findings = [];
  const api = readText(cwd, 'public/js/core/api-service.js');
  const patients = readText(cwd, 'src/modules/patients/patient.repository.js');
  const appointments = readText(cwd, 'src/modules/appointments/appointment.repository.js');
  const app = readText(cwd, 'src/app.js');
  if (!/OFFSET\s+@offset\s+ROWS\s+FETCH/i.test(patients + appointments)) findings.push(finding('SERVER_PAGINATION_MISSING', 'high', 'High-volume patient/appointment queries do not visibly use server-side pagination.'));
  if (!api.includes('timeoutMs') || !api.includes('cache: cacheMode')) findings.push(finding('API_TIMEOUT_CACHE_GUARD_MISSING', 'medium', 'Frontend requests do not have explicit timeout/cache behavior.'));
  if (!app.includes('compression') || !app.includes('rateLimit')) findings.push(finding('HTTP_HARDENING_MISSING', 'high', 'Compression or rate limiting is not present in the Express app.'));
  return { status: findings.some((item) => item.severity === 'high') ? 'fail' : findings.length ? 'needs_review' : 'pass', findings, evidence: { targets: ['pagination', 'deduplication', 'timeouts', 'compression', 'rate limiting'] } };
});

const releaseGate = (cwd) => gate({ id: 'release_preflight', agentId: 'release' }, async () => {
  const findings = [];
  const packageJson = readText(cwd, 'package.json');
  const envExample = readText(cwd, '.env.example');
  if (!fileExists(cwd, 'vercel.json')) findings.push(finding('VERCEL_CONFIG_MISSING', 'high', 'Vercel configuration is missing.'));
  if (!fileExists(cwd, '.env.example') || !envExample.includes('JWT_SECRET') || !envExample.includes('DB_PASSWORD')) findings.push(finding('ENV_CONTRACT_MISSING', 'high', 'The environment-variable contract is incomplete.'));
  if (!/"node"\s*:\s*">=20"/.test(packageJson)) findings.push(finding('NODE_RUNTIME_UNPINNED', 'medium', 'Node.js runtime requirement is not pinned to the supported major version.'));
  const tracked = getTrackedFiles(cwd);
  if (!tracked.error && tracked.files.includes('.env')) findings.push(finding('ENV_FILE_TRACKED', 'blocker', 'A real .env file is tracked and would be unsafe to release.'));
  return { status: findings.some((item) => item.severity === 'blocker' || item.severity === 'high') ? 'fail' : findings.length ? 'needs_review' : 'pass', findings, evidence: { deployment: 'read-only preflight; deployment requires explicit human approval' } };
});

const GATE_BUILDERS = Object.freeze({
  syntax: syntaxGate,
  tests: testsGate,
  secret_scan: secretScanGate,
  permission_contract: permissionGate,
  route_contract: routeContractGate,
  transaction_and_race_conditions: transactionGate,
  booking_contract: bookingGate,
  queue_realtime_contract: queueGate,
  medical_forms_contract: medicalFormsGate,
  frontend_contract: frontendGate,
  schema_and_indexes: schemaGate,
  performance_contract: performanceGate,
  release_preflight: releaseGate
});

const DEFAULT_GATES = Object.freeze(Object.keys(GATE_BUILDERS));

const runSelectedGates = async ({ cwd = ROOT, gateIds = DEFAULT_GATES, skipTests = false } = {}) => {
  const selected = gateIds.filter((id) => GATE_BUILDERS[id] && !(skipTests && id === 'tests'));
  const results = [];
  for (const id of selected) results.push(await GATE_BUILDERS[id](cwd));
  const summary = results.reduce((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] || 0) + 1;
    return accumulator;
  }, { pass: 0, fail: 0, blocked: 0, needs_review: 0 });
  const status = summary.fail > 0 ? 'fail' : summary.blocked > 0 ? 'blocked' : summary.needs_review > 0 ? 'needs_review' : 'pass';
  return {
    runId: `quality_${Date.now().toString(36)}`,
    status,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    summary,
    gates: results
  };
};

const runQualityGates = (options = {}) => runSelectedGates({ ...options, gateIds: options.gateIds || DEFAULT_GATES });

module.exports = {
  DEFAULT_GATES,
  GATE_BUILDERS,
  runSelectedGates,
  runQualityGates,
  finding
};
