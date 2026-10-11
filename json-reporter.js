class JsonReporter {
  onRunComplete(contexts, results) {
    const output = {};
    const failingBugChecks = new Set();
    for (const suite of results.testResults) {
      for (const test of suite.testResults) {
        const name = test.fullName || test.title;
        const entry = { Status: test.status === 'passed' ? 'passed' : 'failed', 'Execution time': `${test.duration || 0}ms` };
        if (entry.Status === 'failed') {
          if (name.includes('dates in the past')) failingBugChecks.add('validation');
          if (name.includes('overlaps an existing visit')) failingBugChecks.add('availability');
          if (name.includes('saved before replying') || name.includes('time for a new booking')) failingBugChecks.add('persistence');
          if (name.includes('doctor-only reschedule')) failingBugChecks.add('authorization');
          if (name.includes('cancelled appointments for the cancelled filter')) failingBugChecks.add('status-filter');
          const message = (test.failureMessages || []).join(' ').replace(/\s+/g, ' ').trim();
          entry.Error = message.slice(0, 350) || 'Expected behavior was not met.';
        }
        output[name] = entry;
      }
    }
    const passed = results.numPassedTests;
    const failed = results.numFailedTests;
    output.Passed = passed;
    output.Failed = failed;
    output['Total bugs'] = failingBugChecks.size;
    output['Total Execution time'] = `${results.testResults.reduce((sum, suite) => sum + suite.perfStats.runtime, 0)}ms`;
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  }
}

module.exports = JsonReporter;
