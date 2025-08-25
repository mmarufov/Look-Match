const test = require('node:test');
const assert = require('node:assert/strict');

const { extractColorFallback, extractColorFromMask } = require('../dist/server/vision/color.js');

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

test('extractColorFromMask classifies dim white as white, not gray', () => {
  const width = 4, height = 4;
  const rgba = new Uint8ClampedArray(width * height * 4);
  // Simulate a slightly underexposed white (e.g., RGB 225-235) with low chroma
  for (let i = 0; i < rgba.length; i += 4) {
    const base = 230 + ((i / 4) % 3) - 1; // small variation 229..231
    rgba[i] = base; rgba[i + 1] = base; rgba[i + 2] = base; rgba[i + 3] = 255;
  }
  const mask = new Uint8Array(width * height).fill(255);
  const c = extractColorFromMask(rgba, width, height, mask);
  assert.equal(c.base, 'white');
});

test('extractColorFromMask differentiates gray vs white', () => {
  const width = 4, height = 4;
  const rgba = new Uint8ClampedArray(width * height * 4);
  // mid gray ~ 128
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 128; rgba[i + 1] = 128; rgba[i + 2] = 128; rgba[i + 3] = 255;
  }
  const mask = new Uint8Array(width * height).fill(255);
  const c = extractColorFromMask(rgba, width, height, mask);
  assert.ok(['gray', 'darkgray', 'lightgray'].includes(c.base));
});

test('extractColorFromMask detects navy vs blue', () => {
  const width = 4, height = 4;
  const rgba = new Uint8ClampedArray(width * height * 4);
  // navy: very low R,G, moderate B
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 5; rgba[i + 1] = 10; rgba[i + 2] = 40; rgba[i + 3] = 255;
  }
  const mask = new Uint8Array(width * height).fill(255);
  const c = extractColorFromMask(rgba, width, height, mask);
  assert.equal(c.base, 'navy');
});

test('extractColorFromMask detects green', () => {
  const width = 4, height = 4;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 20; rgba[i + 1] = 200; rgba[i + 2] = 60; rgba[i + 3] = 255;
  }
  const mask = new Uint8Array(width * height).fill(255);
  const c = extractColorFromMask(rgba, width, height, mask);
  assert.equal(c.base, 'green');
});
