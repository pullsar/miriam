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

  const brochureHref = '/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf';
  const readingsHref = '/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf';

  assert.equal(html.split(`href="${brochureHref}"`).length - 1, 3);
  assert.equal(html.split(`href="${readingsHref}"`).length - 1, 2);
  assert.match(html, /id="preloaderDownloads"/);
});

test('the hero links directly to the memorial brochure', () => {
  const html = read('public/index.html');

  assert.match(
    html,
    /<a class="btn-hero btn-hero-outline" href="\/downloads\/prof-miriam-ngozi-mgbakor-memorial-brochure\.pdf" download data-download-resource="brochure">Memorial Brochure<\/a>/
  );
  assert.match(html, /<li><a href="#programme">Programme<\/a><\/li>/);
  assert.match(html, /<section class="section programme" id="programme">/);
});

test('PDF links expose synchronized number-only counter hooks', () => {
  const html = read('public/index.html');

  assert.equal(html.split('data-download-resource="brochure"').length - 1, 3);
  assert.equal(html.split('data-download-resource="order-of-mass"').length - 1, 2);
  assert.equal(html.split('class="download-count" data-download-count="brochure" hidden').length - 1, 2);
  assert.equal(html.split('class="download-count" data-download-count="order-of-mass" hidden').length - 1, 2);
});

test('the tribute form contains no stray editorial text', () => {
  const html = read('public/index.html');

  assert.doesNotMatch(html, /21`\s*<p class="form-status"/);
});

test('download totals progressively enhance without blocking the PDF links', () => {
  const script = read('public/app.js');
  const styles = read('public/style.css');

  assert.match(script, /fetch\('\/api\/download-counts'/);
  assert.match(script, /new Intl\.NumberFormat/);
  assert.match(script, /badge\.removeAttribute\('hidden'\)/);
  assert.match(script, /querySelectorAll\(`\[data-download-count="\$\{resource\}"\]`\)/);
  assert.match(script, /querySelectorAll\('\[data-download-resource\]'\)/);
  assert.match(styles, /\.download-count\s*\{/);
  assert.match(styles, /\.download-count\[hidden\]\s*\{[\s\S]*?display:\s*none/);
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
