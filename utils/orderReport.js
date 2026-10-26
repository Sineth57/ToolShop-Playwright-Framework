const { test, expect } = require('@playwright/test');

// Adds a marker line to a list of recorded requests, so the report shows when each action happened
function mark(calls, text) {
  calls.push({ line: `--- ${text} ---`, detail: '', ready: Promise.resolve() });
}

// Attaches the recorded payment and invoice requests to the report and prints them,
// so they are visible when a test fails too
async function reportOrderRequests(calls) {
  await Promise.all(calls.map((call) => call.ready));
  const text = calls.length
    ? calls.map((call) => (call.detail ? `${call.line}\n${call.detail}` : call.line)).join('\n')
    : 'no payment or invoice requests were sent';
  await test.info().attach('order requests', { body: text, contentType: 'text/plain' });
  console.log(`[${test.info().title}] order requests:\n${text}`);
}

async function expectKnownIssue(description, check) {
  let passed = false;
  try {
    await check();
    passed = true;
  } catch {
    // the defect is still there
  }
  test.info().annotations.push({ type: 'known issue', description });
  expect(passed, `The known issue seems to be fixed: "${description}". Remove the workaround.`).toBe(false);
}

module.exports = { mark, reportOrderRequests, expectKnownIssue };