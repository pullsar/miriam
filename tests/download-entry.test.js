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

test('the memorial archive exposes both stable download links once', () => {
  const html = read('public/index.html');

  const brochureHref = '/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf';
  const readingsHref = '/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf';

  assert.equal(html.split(`href="${brochureHref}"`).length - 1, 1);
  assert.equal(html.split(`href="${readingsHref}"`).length - 1, 1);
  assert.match(html, /<section[^>]+id="memorial-archive"/);
});

test('the hero leads directly to tributes and gallery', () => {
  const html = read('public/index.html');

  assert.match(html, /href="#tributes"[^>]*>Read Her Tributes<\/a>/);
  assert.match(html, /href="#gallery"[^>]*>View Her Gallery<\/a>/);
  assert.doesNotMatch(html, /id="programme"|id="venues"|id="attire"|id="qr"/);
});

test('PDF links expose synchronized number-only counter hooks', () => {
  const html = read('public/index.html');

  assert.equal(html.split('data-download-resource="brochure"').length - 1, 1);
  assert.equal(html.split('data-download-resource="order-of-mass"').length - 1, 1);
  assert.equal(html.split('data-download-count="brochure"').length - 1, 1);
  assert.equal(html.split('data-download-count="order-of-mass"').length - 1, 1);
});

test('the tribute form contains no stray editorial text', () => {
  const html = read('public/index.html');

  assert.doesNotMatch(html, /21`\s*<p class="form-status"/);
});

test('download totals progressively enhance without blocking the PDF links', () => {
  const script = read('public/app.js');
  const styles = read('public/memorial.css');

  assert.match(script, /fetch\('\/api\/download-counts'/);
  assert.match(script, /new Intl\.NumberFormat/);
  assert.match(script, /badge\.removeAttribute\('hidden'\)/);
  assert.match(script, /querySelectorAll\(`\[data-download-count="\$\{resource\}"\]`\)/);
  assert.match(script, /querySelectorAll\('\[data-download-resource\]'\)/);
  assert.match(script, /fetch\(`\/api\/download-counts\/\$\{resource\}`,[\s\S]*?method:\s*'POST'[\s\S]*?keepalive:\s*true/);
  assert.match(styles, /\.download-count\s*\{/);
  assert.match(styles, /\.download-count\[hidden\]\s*\{[\s\S]*?display:\s*none/);
});

test('the permanent memorial opens without an entrance overlay', () => {
  const html = read('public/index.html');

  assert.doesNotMatch(html, /id="preloader"|preload-locked|Click or tap to enter/);
  assert.match(html, /<body>/);
});
