'use strict';

const crypto = require('node:crypto');
const { getAgent, isKnownAgent } = require('./agent-registry');

const MAX_TEXT_LENGTH = 4000;
const FORBIDDEN_INSTRUCTIONS = [
  /ignore\s+(?:all\s+)?previous\s+(?:instructions|rules)/i,
  /reveal\s+(?:the\s+)?(?:system|developer)\s+prompt/i,
  /bypass\s+(?:auth|authorization|permission|security)/i,
  /connect\s+direct(?:ly)?\s+to\s+(?:the\s+)?(?:database|sql\s*server)/i,
  /export\s+(?:all\s+)?(?:secrets|tokens|passwords)/i,
  /(?:تشخيص|شخّص|شخص)\s+(?:المريض|المريضة|الحالة)/i,
  /(?:وصف|اكتب)\s+(?:دواء|علاج)\s+(?:للمريض|للمريضة|للحالة)/i,
  /تجاوز\s+(?:الصلاحيات|الأمان|التفويض)/i
];

const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|api[-_]?key|connectionstring|access[-_]?key)/i;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const createRunId = () => `qa_${new Date().toISOString().replace(/[-:.TZ]/g, '')}_${crypto.randomBytes(4).toString('hex')}`;

const truncate = (value, max = MAX_TEXT_LENGTH) => {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const containsForbiddenInstruction = (value) => {
  if (typeof value !== 'string') return false;
  return FORBIDDEN_INSTRUCTIONS.some((pattern) => pattern.test(value));
};

const redactText = (value) => truncate(String(value ?? '')
  .replace(/(password|passwd|secret|token|authorization|cookie|api[-_]?key|connectionstring)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
  .replace(/bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]'));

const redactSensitive = (value, key = '') => {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactSensitive(item));
  if (isPlainObject(value)) {
    return Object.entries(value).reduce((result, [entryKey, entryValue]) => {
      result[entryKey] = redactSensitive(entryValue, entryKey);
      return result;
    }, {});
  }
  return value;
};

const validateAgentRequest = (request = {}) => {
  const errors = [];
  if (!isPlainObject(request)) return { ok: false, errors: ['request must be an object'] };
  if (!request.agentId || !isKnownAgent(request.agentId)) errors.push('unknown agentId');

  const agent = getAgent(request.agentId);
  if (agent && request.action && !agent.allowedActions.includes(request.action)) {
    errors.push(`action is not allowed for ${agent.id}`);
  }

  const instructionText = [request.action, request.instructions, request.scope, request.evidence]
    .filter(Boolean)
    .map((item) => typeof item === 'string' ? item : JSON.stringify(item))
    .join('\n');
  if (containsForbiddenInstruction(instructionText)) {
    errors.push('untrusted instruction or prohibited medical/security action detected');
  }

  if (request.writeIntent === true || request.directDatabaseAccess === true) {
    errors.push('agent runs are read-only and cannot access production data directly');
  }

  return {
    ok: errors.length === 0,
    errors,
    agent: agent || null,
    request: redactSensitive(request)
  };
};

const createRunContext = (overrides = {}) => ({
  runId: overrides.runId || createRunId(),
  requestId: overrides.requestId || null,
  actor: 'qa-system',
  environment: overrides.environment || process.env.NODE_ENV || 'development',
  startedAt: overrides.startedAt || new Date().toISOString(),
  metadata: redactSensitive(overrides.metadata || {})
});

const normalizeFinding = (finding = {}) => {
  const normalized = isPlainObject(finding) ? finding : { message: finding };
  return {
    id: truncate(normalized.id || 'UNSPECIFIED_FINDING', 120),
    severity: ['blocker', 'high', 'medium', 'low', 'info'].includes(normalized.severity) ? normalized.severity : 'info',
    message: redactText(normalized.message || 'No finding message provided.'),
    evidence: redactSensitive(normalized.evidence ?? null),
    recommendation: redactText(normalized.recommendation || '')
  };
};

const normalizeAgentResult = (result = {}) => {
  const status = ['pass', 'fail', 'blocked', 'needs_review'].includes(result.status) ? result.status : 'needs_review';
  return redactSensitive({
    agentId: result.agentId || null,
    status,
    riskLevel: result.riskLevel || 'medium',
    findings: Array.isArray(result.findings) ? result.findings.slice(0, 100).map(normalizeFinding) : [],
    recommendations: Array.isArray(result.recommendations) ? result.recommendations.slice(0, 100).map(redactText) : [],
    approvalRequired: Boolean(result.approvalRequired),
    evidence: redactSensitive(result.evidence || null),
    metrics: redactSensitive(result.metrics || null),
    delegations: Array.isArray(result.delegations) ? result.delegations.slice(0, 50).map(redactSensitive) : [],
    conflicts: Array.isArray(result.conflicts) ? result.conflicts.slice(0, 50).map(redactSensitive) : [],
    startedAt: result.startedAt || null,
    completedAt: result.completedAt || new Date().toISOString()
  });
};

const blockedResult = ({ agentId = null, reason, riskLevel = 'high' } = {}) => normalizeAgentResult({
  agentId,
  status: 'blocked',
  riskLevel,
  approvalRequired: true,
  findings: [{
    id: 'AGENT_RUN_BLOCKED',
    severity: 'blocker',
    message: reason,
    recommendation: 'Use an approved read-only action and route sensitive decisions to an authorized human.'
  }]
});

module.exports = {
  MAX_TEXT_LENGTH,
  createRunId,
  createRunContext,
  containsForbiddenInstruction,
  redactSensitive,
  validateAgentRequest,
  normalizeAgentResult,
  blockedResult
};
