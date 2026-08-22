const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../public/app.js'), 'utf8');

test('music control is a single-track glory-song experience', () => {
  assert.match(source, /Play the Glory Song/);
  assert.match(source, /Pause the Glory Song/);
  assert.doesNotMatch(source, /soon-ah-will-be-done|playlist|playNextTrack/);
});

test('gallery merges submitted photographs safely and supports lightbox navigation', () => {
  assert.match(source, /fetch\('\/api\/photos'/);
  assert.match(source, /uniquePhotos/);
  assert.match(source, /data-lightbox-src/);
  assert.match(source, /lightboxPrev/);
  assert.match(source, /lightboxNext/);
  assert.match(source, /textContent\s*=/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});

test('tribute and photograph forms retain their live upload endpoints', () => {
  assert.match(source, /'\/api\/tribute'/);
  assert.match(source, /'\/api\/upload-photos'/);
  assert.match(source, /new FormData/);
  assert.match(source, /compressImage/);
});

test('mobile menu exposes its expanded state', () => {
  assert.match(source, /setAttribute\('aria-expanded'/);
  assert.match(source, /setAttribute\('aria-label'/);
});
