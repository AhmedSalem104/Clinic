'use strict';

/**
 * The registry is the single source of truth for the internal QA agents.
 *
 * These are governance contracts, not autonomous access grants. Every agent
 * runs through the Supervisor and the deterministic checks in qa-gates.js.
 * No agent is allowed to connect to SQL Server or mutate production data.
 */

const AGENT_IDS = Object.freeze({
  SUPERVISOR: 'supervisor',
  SECURITY: 'security',
  DATA_INTEGRITY: 'data_integrity',
  BOOKING: 'booking',
  QUEUE: 'queue',
  MEDICAL_FORMS: 'medical_forms',
  UI_UX: 'ui_ux',
  PERFORMANCE: 'performance',
  QA_AUTOMATION: 'qa_automation',
  RELEASE: 'release'
});

const commonProhibitedActions = [
  'direct_database_connection',
  'direct_production_write',
  'secret_access',
  'permission_bypass',
  'medical_diagnosis',
  'prescription_or_treatment_decision',
  'unapproved_destructive_operation'
];

const defineAgent = (agent) => Object.freeze({
  ...agent,
  writeAccess: 'none',
  prohibitedActions: Object.freeze([...(agent.prohibitedActions || []), ...commonProhibitedActions]),
  allowedTools: Object.freeze([...(agent.allowedTools || [])]),
  allowedActions: Object.freeze([...(agent.allowedActions || [])]),
  inputSchema: Object.freeze([...(agent.inputSchema || [])]),
  outputSchema: Object.freeze([...(agent.outputSchema || [])])
});

const AGENT_REGISTRY = Object.freeze({
  [AGENT_IDS.SUPERVISOR]: defineAgent({
    id: AGENT_IDS.SUPERVISOR,
    name: 'Supervisor Agent',
    purpose: 'Coordinate checks, route work to the least-privileged agent, detect conflicts, and produce one quality report.',
    riskLevel: 'high',
    requiresHumanApproval: true,
    inputSchema: ['requestId', 'agentId', 'action', 'scope', 'evidence'],
    outputSchema: ['runId', 'status', 'delegations', 'conflicts', 'findings', 'approvalRequired'],
    allowedActions: ['run_quality_gates', 'route_review', 'summarize_findings'],
    allowedTools: ['registry_read', 'whitelisted_gate_runner', 'report_redactor']
  }),
  [AGENT_IDS.SECURITY]: defineAgent({
    id: AGENT_IDS.SECURITY,
    name: 'Security Agent',
    purpose: 'Review authentication, authorization, input boundaries, secrets handling, uploads, rate limits, and audit coverage.',
    riskLevel: 'high',
    requiresHumanApproval: true,
    inputSchema: ['requestId', 'scope', 'diff', 'testResults'],
    outputSchema: ['status', 'riskLevel', 'findings', 'recommendations', 'approvalRequired'],
    allowedActions: ['review_permissions', 'scan_secrets', 'review_security_contract'],
    allowedTools: ['read_repo', 'inspect_permissions', 'scan_tracked_files', 'run_security_tests']
  }),
  [AGENT_IDS.DATA_INTEGRITY]: defineAgent({
    id: AGENT_IDS.DATA_INTEGRITY,
    name: 'Data Integrity Agent',
    purpose: 'Verify transactions, constraints, race-condition defenses, relationships, and medical-history preservation.',
    riskLevel: 'high',
    requiresHumanApproval: true,
    inputSchema: ['requestId', 'scope', 'diff', 'testResults'],
    outputSchema: ['status', 'riskLevel', 'findings', 'recommendations', 'approvalRequired'],
    allowedActions: ['review_transactions', 'review_constraints', 'review_race_conditions'],
    allowedTools: ['read_repo', 'inspect_sql_schema', 'inspect_transactions', 'run_integrity_tests']
  }),
  [AGENT_IDS.BOOKING]: defineAgent({
    id: AGENT_IDS.BOOKING,
    name: 'Booking Agent',
    purpose: 'Validate public, patient, reception, and owner booking flows, availability, pricing, and double-booking behavior.',
    riskLevel: 'high',
    requiresHumanApproval: false,
    inputSchema: ['requestId', 'scope', 'diff', 'testResults'],
    outputSchema: ['status', 'riskLevel', 'findings', 'recommendations'],
    allowedActions: ['review_booking_flow', 'run_booking_tests', 'review_slot_rules'],
    allowedTools: ['read_repo', 'inspect_routes', 'inspect_booking_service', 'run_booking_tests']
  }),
  [AGENT_IDS.QUEUE]: defineAgent({
    id: AGENT_IDS.QUEUE,
    name: 'Queue Agent',
    purpose: 'Validate stable queue numbers, people-ahead calculations, ETA updates, pause/resume behavior, and realtime fallback.',
    riskLevel: 'medium',
    requiresHumanApproval: false,
    inputSchema: ['requestId', 'scope', 'diff', 'testResults'],
    outputSchema: ['status', 'riskLevel', 'findings', 'recommendations'],
    allowedActions: ['review_queue_flow', 'run_queue_tests', 'review_realtime_contract'],
    allowedTools: ['read_repo', 'inspect_queue_service', 'inspect_realtime', 'run_queue_tests']
  }),
  [AGENT_IDS.MEDICAL_FORMS]: defineAgent({
    id: AGENT_IDS.MEDICAL_FORMS,
    name: 'Medical Forms Agent',
    purpose: 'Check clinical form documentation, structured fields, conditional fields, and human-review boundaries without diagnosing patients.',
    riskLevel: 'high',
    requiresHumanApproval: true,
    inputSchema: ['requestId', 'scope', 'diff', 'medicalFormSpec'],
    outputSchema: ['status', 'riskLevel', 'findings', 'fieldReview', 'approvalRequired'],
    allowedActions: ['review_form_documentation', 'review_structured_fields', 'review_requiredness'],
    allowedTools: ['read_repo', 'inspect_medical_form_docs', 'inspect_validation_contracts']
  }),
  [AGENT_IDS.UI_UX]: defineAgent({
    id: AGENT_IDS.UI_UX,
    name: 'UI/UX Agent',
    purpose: 'Review navigation, RTL, responsive behavior, loading/error/empty states, accessibility labels, and low-friction workflows.',
    riskLevel: 'medium',
    requiresHumanApproval: false,
    inputSchema: ['requestId', 'scope', 'diff', 'screenshots', 'routeList'],
    outputSchema: ['status', 'riskLevel', 'findings', 'recommendations'],
    allowedActions: ['review_frontend_contract', 'review_accessibility', 'review_responsive_contract'],
    allowedTools: ['read_repo', 'inspect_frontend_contract', 'run_frontend_checks']
  }),
  [AGENT_IDS.PERFORMANCE]: defineAgent({
    id: AGENT_IDS.PERFORMANCE,
    name: 'Performance Agent',
    purpose: 'Review pagination, query indexes, request deduplication, timeouts, lazy loading, and queue update efficiency.',
    riskLevel: 'medium',
    requiresHumanApproval: false,
    inputSchema: ['requestId', 'scope', 'diff', 'benchmarkResults'],
    outputSchema: ['status', 'riskLevel', 'findings', 'recommendations', 'metrics'],
    allowedActions: ['review_performance_contract', 'run_performance_checks', 'review_query_indexes'],
    allowedTools: ['read_repo', 'inspect_sql_schema', 'inspect_api_service', 'inspect_frontend_requests']
  }),
  [AGENT_IDS.QA_AUTOMATION]: defineAgent({
    id: AGENT_IDS.QA_AUTOMATION,
    name: 'QA Automation Agent',
    purpose: 'Run unit, integration, permission, security, and regression checks and report reproducible evidence.',
    riskLevel: 'medium',
    requiresHumanApproval: false,
    inputSchema: ['requestId', 'scope', 'diff', 'testSelection'],
    outputSchema: ['status', 'riskLevel', 'findings', 'testResults', 'approvalRequired'],
    allowedActions: ['run_tests', 'run_quality_gates', 'summarize_test_results'],
    allowedTools: ['whitelisted_process_runner', 'report_redactor']
  }),
  [AGENT_IDS.RELEASE]: defineAgent({
    id: AGENT_IDS.RELEASE,
    name: 'Release Agent',
    purpose: 'Perform read-only release preflight: repository state, environment shape, migrations, health checks, and rollback readiness.',
    riskLevel: 'high',
    requiresHumanApproval: true,
    inputSchema: ['requestId', 'scope', 'diff', 'deploymentTarget', 'healthChecks'],
    outputSchema: ['status', 'riskLevel', 'findings', 'releaseChecklist', 'approvalRequired'],
    allowedActions: ['preflight', 'verify_health', 'review_migration_readiness'],
    allowedTools: ['read_repo', 'inspect_env_shape', 'inspect_migrations', 'run_quality_gates', 'run_health_checks']
  })
});

const listAgents = () => Object.values(AGENT_REGISTRY);
const getAgent = (agentId) => AGENT_REGISTRY[agentId] || null;
const isKnownAgent = (agentId) => Boolean(getAgent(agentId));

module.exports = { AGENT_IDS, AGENT_REGISTRY, listAgents, getAgent, isKnownAgent };
