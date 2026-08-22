const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../public/app.js'), 'utf8');

test('music control uses concise on and off states', () => {
  assert.match(source, /Music On/);
  assert.match(source, /Music Off/);
  assert.match(source, /Turn music on/);
  assert.match(source, /Turn music off/);
  assert.doesNotMatch(source, /Play the Glory Song|Pause the Glory Song/);
  assert.doesNotMatch(source, /soon-ah-will-be-done|playlist|playNextTrack/);
});

test('gallery merges submitted photographs safely and supports lightbox navigation', () => {
  assert.match(source, /fetch\('\/api\/photos'/);
  assert.match(source, /uniquePhotos/);
  assert.match(source, /curatePhotos/);
  assert.match(source, /EXCLUDED_GALLERY_PHOTO_IDS/);
  assert.match(source, /data-lightbox-src/);
  assert.match(source, /lightboxPrev/);
  assert.match(source, /lightboxNext/);
  assert.match(source, /textContent\s*=/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});

test('gallery omits the four reviewed uploads that do not show Miriam', () => {
  assert.match(source, /EXCLUDED_GALLERY_PHOTO_IDS\s*=\s*new Set\(\[[\s\S]*51,\s*52,\s*53,\s*69[\s\S]*\]\)/);
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
