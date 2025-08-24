const test = require('node:test');
const assert = require('node:assert/strict');

const { extractColorFallback } = require('../dist/server/vision/color.js');

test('extractColorFallback identifies white for high luminance low chroma', () => {
  const width = 2, height = 2;
  const rgba = new Uint8ClampedArray(width * height * 4);
  // Fill with white
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 255; rgba[i + 1] = 255; rgba[i + 2] = 255; rgba[i + 3] = 255;
  }
  const mask = new Uint8Array(width * height).fill(255);
  const c = extractColorFallback(rgba, width, height, mask);
  assert.equal(c.base, 'white');
  assert.ok(c.confidence >= 0.8);
});
