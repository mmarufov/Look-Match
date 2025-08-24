const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeVisionAttributes } = require('../dist/server/vision/normalize.js');

function mkLabel(desc, score = 0.9) { return { description: desc, score }; }

test('normalizeVisionAttributes maps t-shirt to shirt and detects white', () => {
  const labels = [mkLabel('t-shirt'), mkLabel('apparel')];
  const webTags = ['white cotton tee'];
  const colors = [{ name: 'white', score: 0.9 }];
  const attrs = normalizeVisionAttributes(labels, webTags, colors);
  assert.equal(attrs.category, 'shirt');
  assert.ok(attrs.colors.includes('white'));
  assert.ok(attrs.confidence >= 0.7);
});
