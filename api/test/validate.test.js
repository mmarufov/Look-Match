const test = require('node:test');
const assert = require('node:assert/strict');

const validateMod = require('../dist/server/urls/validate.js');

const { validateProductUrls } = validateMod;

test('validateProductUrls handles invalid URLs gracefully', async () => {
  const results = await validateProductUrls(['not-a-url', 'https://example.com/search?q=shirt']);
  assert.equal(Array.isArray(results), true);
  assert.equal(results.length, 2);
  // Expect at least one to be unverified
  assert.equal(results.some(r => r.verified === false), true);
});
