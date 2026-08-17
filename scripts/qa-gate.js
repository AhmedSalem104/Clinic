'use strict';

const { runQualityReview } = require('../src/agents/supervisor');

const args = new Set(process.argv.slice(2));

const main = async () => {
  const report = await runQualityReview({
    cwd: process.cwd(),
    skipTests: args.has('--skip-tests')
  });

  if (args.has('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`QA Gate: ${report.status.toUpperCase()}\n`);
    for (const gate of report.evidence?.gates || []) {
      process.stdout.write(`- ${gate.id}: ${gate.status} (${gate.durationMs}ms)\n`);
    }
    if (report.findings?.length) {
      process.stdout.write('\nFindings:\n');
      for (const item of report.findings) process.stdout.write(`- [${item.severity}] ${item.id}: ${item.message}\n`);
    }
    process.stdout.write(`\nSummary: ${JSON.stringify(report.metrics)}\n`);
  }

  process.exitCode = report.status === 'pass' ? 0 : 1;
};

main().catch((error) => {
  process.stderr.write(`QA Gate could not complete: ${error.message}\n`);
  process.exitCode = 1;
});
