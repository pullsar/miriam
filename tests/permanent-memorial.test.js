const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('homepage is a permanent tribute and gallery archive', () => {
  const html = read('public/index.html');

  assert.match(html, /<title>Professor Miriam Ngozi Mgbakor \| Memorial Archive<\/title>/);
  assert.match(html, /<nav[^>]+aria-label="Primary navigation"/);
  assert.match(html, /href="#her-life"[^>]*>Her Life<\/a>/);
  assert.match(html, /href="#tributes"[^>]*>Tributes<\/a>/);
  assert.match(html, /href="#gallery"[^>]*>Gallery<\/a>/);
  assert.match(html, /href="#share-a-memory"[^>]*>Share a Memory<\/a>/);
  assert.match(html, /href="#memorial-archive"[^>]*>Memorial Archive<\/a>/);
  assert.doesNotMatch(html, /Programme of events|The Journey Home|Venues|Attire|Scan to Visit/);
});

test('memorial styles and scripts carry a shared deployment revision', () => {
  const html = read('public/index.html');
  const revision = '20260822b';

  for (const asset of ['memorial.css', 'memorial-utils.js', 'memorial-archive.js', 'app.js']) {
    assert.match(html, new RegExp(`/${asset.replace('.', '\\.')}` + `\\?v=${revision}`));
  }
});

test('hero honours Miriam directly and uses only the approved glory song', () => {
  const html = read('public/index.html');

  assert.match(html, /Professor Miriam Ngozi Mgbakor/);
  assert.match(html, /1960[–-]2026/);
  assert.match(html, /id="musicBtn"[^>]+aria-label="Turn music on"/);
  assert.match(html, /id="musicLabel">Music Off<\/span>/);
  assert.match(html, /<audio id="bgMusic" src="\/audio\/o-lord-my-god-how-great\.mp3"/);
  assert.doesNotMatch(html, /soon-ah-will-be-done|Play the Glory Song|Pause the Glory Song/);
});

test('biography speaks directly about Miriam without editorial reporting', () => {
  const html = read('public/index.html');

  assert.match(html, /At home and among those closest to her, she was Mimi, May May, Aunty Mimi, Mummy and Sister Mgbakor\./);
  assert.match(html, /She carried that remarkable warmth into every part of her life\./);
  assert.doesNotMatch(html, /the names spoken with most affection|photographs and tributes gathered here preserve/i);
});

test('biography, tribute archive, gallery, submissions, and archive resources are present', () => {
  const html = read('public/index.html');

  for (const id of ['her-life', 'tributes', 'gallery', 'share-a-memory', 'memorial-archive']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="tributeSearch"/);
  assert.match(html, /data-category="Family"/);
  assert.match(html, /data-category="Church &amp; Community"/);
  assert.match(html, /id="tributeGrid"/);
  assert.match(html, /id="galleryGrid"/);
  assert.match(html, /id="tributeForm"/);
  assert.match(html, /id="photoUploadForm"/);
  assert.match(html, /id="tributeDialog"/);
  assert.match(html, /id="previousTribute"[^>]*aria-label="Previous tribute"[^>]*>Previous<\/button>/);
  assert.match(html, /id="nextTribute"[^>]*aria-label="Next tribute"[^>]*>Next<\/button>/);
  assert.match(html, /id="tributeDialogPosition"/);
});

test('optimized academic and younger-years portraits exist', () => {
  for (const file of ['miriam-academic-regalia.jpg', 'miriam-younger-years.jpg']) {
    const image = path.join(root, 'public/images', file);
    assert.ok(fs.existsSync(image), `${file} should exist`);
    assert.ok(fs.statSync(image).size > 50_000, `${file} should retain useful detail`);
    assert.ok(fs.statSync(image).size < 1_500_000, `${file} should be web optimized`);
  }
});

test('lightbox does not request the page itself as an empty image source', () => {
  const html = read('public/index.html');
  assert.doesNotMatch(html, /id="lightboxImage"\s+src=""/);
});
