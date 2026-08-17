'use strict';

const { AGENT_IDS, getAgent, isKnownAgent } = require('./agent-registry');
const {
  blockedResult,
  createRunContext,
  normalizeAgentResult,
  validateAgentRequest
} = require('./agent-contracts');
const { runSelectedGates, DEFAULT_GATES } = require('./qa-gates');

const AGENT_GATE_MAP = Object.freeze({
  [AGENT_IDS.SECURITY]: ['secret_scan', 'permission_contract'],
  [AGENT_IDS.DATA_INTEGRITY]: ['transaction_and_race_conditions', 'schema_and_indexes'],
  [AGENT_IDS.BOOKING]: ['route_contract', 'booking_contract', 'transaction_and_race_conditions'],
  [AGENT_IDS.QUEUE]: ['queue_realtime_contract'],
  [AGENT_IDS.MEDICAL_FORMS]: ['medical_forms_contract'],
  [AGENT_IDS.UI_UX]: ['frontend_contract'],
  [AGENT_IDS.PERFORMANCE]: ['schema_and_indexes', 'performance_contract'],
  [AGENT_IDS.QA_AUTOMATION]: ['syntax', 'tests'],
  [AGENT_IDS.RELEASE]: DEFAULT_GATES,
  [AGENT_IDS.SUPERVISOR]: DEFAULT_GATES
});

const aggregateReport = (agentId, report, context) => {
  const gates = report.gates || [];
  const findings = gates.flatMap((item) => (item.findings || []).map((itemFinding) => ({
    ...itemFinding,
    id: `${item.id}:${itemFinding.id}`,
    evidence: { gate: item.id, ...(itemFinding.evidence || {}) }
  })));
  const findingGroups = findings.reduce((groups, item) => {
    const baseId = item.id.split(':').pop();
    groups[baseId] = groups[baseId] || [];
    groups[baseId].push(item);
    return groups;
  }, {});
  const conflicts = Object.entries(findingGroups)
    .filter(([, items]) => new Set(items.map((item) => `${item.severity}:${item.message}`)).size > 1)
    .map(([id, items]) => ({ id: `CONFLICT_${id}`, severity: 'high', message: 'Multiple gates reported different evidence for the same finding.', evidence: items }));
  const status = gates.some((item) => item.status === 'fail')
    ? 'fail'
    : gates.some((item) => item.status === 'blocked')
      ? 'blocked'
      : gates.some((item) => item.status === 'needs_review')
        ? 'needs_review'
        : 'pass';
  return normalizeAgentResult({
    agentId,
    status,
    riskLevel: getAgent(agentId)?.riskLevel || 'medium',
    approvalRequired: Boolean(getAgent(agentId)?.requiresHumanApproval),
    startedAt: context.startedAt,
    completedAt: report.completedAt,
    findings,
    delegations: gates.map((item) => ({ agentId: item.agentId, gateId: item.id, status: item.status, durationMs: item.durationMs })),
    conflicts,
    evidence: {
      runId: report.runId,
      gates: gates.map((item) => ({ id: item.id, status: item.status, durationMs: item.durationMs }))
    },
    metrics: report.summary
  });
};

const runSupervisor = async (request, options = {}) => {
  if (request.action === 'summarize_findings') {
    return normalizeAgentResult({
      agentId: AGENT_IDS.SUPERVISOR,
      status: 'needs_review',
      riskLevel: 'high',
      approvalRequired: true,
      findings: [{
        id: 'SUPERVISOR_SUMMARY_REQUIRES_EVIDENCE',
        severity: 'medium',
        message: 'A summary cannot be produced without a quality-gate report.',
        recommendation: 'Run the read-only quality gates and review blockers before release.'
      }]
    });
  }

  if (request.action === 'route_review') {
    if (!isKnownAgent(request.targetAgentId) || request.targetAgentId === AGENT_IDS.SUPERVISOR) {
      return blockedResult({ agentId: AGENT_IDS.SUPERVISOR, reason: 'The requested target agent is unknown or would create recursive delegation.' });
    }
    return runAgent(request.targetAgentId, { ...request, agentId: request.targetAgentId, action: request.targetAction || 'review_security_contract' }, options);
  }

  const context = createRunContext({ requestId: request.requestId, environment: options.environment });
  const report = await runSelectedGates({ cwd: options.cwd, gateIds: DEFAULT_GATES, skipTests: options.skipTests });
  return aggregateReport(AGENT_IDS.SUPERVISOR, report, context);
};

const runAgent = async (agentId, request = {}, options = {}) => {
  const validation = validateAgentRequest({ ...request, agentId });
  if (!validation.ok) {
    return blockedResult({ agentId, reason: validation.errors.join('; ') });
  }

  if (agentId === AGENT_IDS.SUPERVISOR) return runSupervisor({ ...request, agentId }, options);

  const agent = getAgent(agentId);
  if (!agent) return blockedResult({ agentId, reason: 'Unknown agent.' });
  const gateIds = AGENT_GATE_MAP[agentId] || [];
  if (!gateIds.length) return blockedResult({ agentId, reason: 'This agent has no approved deterministic checks.' });

  const context = createRunContext({ requestId: request.requestId, environment: options.environment });
  const report = await runSelectedGates({ cwd: options.cwd, gateIds, skipTests: options.skipTests });
  return aggregateReport(agentId, report, context);
};

const runQualityReview = (options = {}) => runSupervisor({
  agentId: AGENT_IDS.SUPERVISOR,
  action: 'run_quality_gates',
  requestId: options.requestId || null
}, options);

module.exports = { AGENT_GATE_MAP, runAgent, runQualityReview };
