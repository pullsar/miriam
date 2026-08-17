const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pdfHeader = file => {
  const descriptor = fs.openSync(file, 'r');
  const header = Buffer.alloc(4);
  try {
    fs.readSync(descriptor, header, 0, header.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return header.toString('ascii');
};

test('approved memorial PDFs are publicly downloadable', () => {
  const brochure = path.join(root, 'public/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf');
  const readings = path.join(root, 'public/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf');

  assert.ok(fs.statSync(brochure).size > 10_000_000);
  assert.ok(fs.statSync(readings).size > 400_000);
  assert.equal(pdfHeader(brochure), '%PDF');
  assert.equal(pdfHeader(readings), '%PDF');
});

test('entrance and in-site sections expose both stable download links', () => {
  const html = read('public/index.html');

  for (const href of [
    '/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf',
    '/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf',
  ]) {
    assert.equal(html.split(`href="${href}"`).length - 1, 2);
  }
  assert.match(html, /id="preloaderDownloads"/);
});

test('download controls cannot trigger the entrance interaction', () => {
  const script = read('public/app.js');

  assert.match(script, /preloaderDownloads\.addEventListener\('click',[\s\S]*?stopPropagation\(\)/);
  assert.match(script, /preloaderDownloads\.addEventListener\('keydown',[\s\S]*?stopPropagation\(\)/);
});

test('the entrance has a standalone control instead of nesting links in an ARIA button', () => {
  const html = read('public/index.html');
  const script = read('public/app.js');

  assert.match(html, /<section class="preloader" id="preloader" aria-labelledby="preloaderTitle">/);
  assert.doesNotMatch(html, /class="preloader"[^>]*role="button"/);
  assert.match(html, /<button class="preloader-cta" id="preloaderEnter" type="button">/);
  assert.match(script, /preloaderEnter\.addEventListener\('click',[\s\S]*?enter\(\)/);
});
