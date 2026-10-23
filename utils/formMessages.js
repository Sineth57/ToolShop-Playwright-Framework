const { test, expect } = require('@playwright/test');

// Checks that a message is visible, records its exact text in the report and the console,
// and returns it, so the text can be asserted precisely once it has been seen
async function expectErrorMessage(locator, label) {
  await expect(locator).toBeVisible();
  const text = (await locator.innerText()).trim().replace(/\s+/g, ' ');
  await test.info().attach(`message: ${label}`, { body: text, contentType: 'text/plain' });
  console.log(`[message] ${label}: "${text}"`);
  return text;
}

function watchDialogs(page) {
  const dialogs = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  return dialogs;
}

module.exports = { expectErrorMessage, watchDialogs };