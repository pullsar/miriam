const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.resolve(__dirname, '../public/memorial.css'), 'utf8');

test('ceremonial palette and editorial type system are explicit', () => {
  for (const token of ['--midnight', '--ivory', '--gold', '--plum', '--ink']) {
    assert.match(css, new RegExp(`${token}:`));
  }
  assert.match(css, /Cormorant Garamond/);
  assert.match(css, /Source Serif 4/);
  assert.match(css, /Inter/);
});

test('tribute archive visibly distinguishes feature, standard, and compact memories', () => {
  assert.match(css, /\.archive-tribute-feature/);
  assert.match(css, /\.archive-tribute-standard/);
  assert.match(css, /\.archive-tribute-compact/);
  assert.match(css, /\.archive-tribute-name/);
  assert.match(css, /\.archive-tribute-rule/);
});

test('layout responds at mobile and tablet widths with readable touch targets', () => {
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
  assert.match(css, /min-height:\s*44px/);
});

test('focus, contrast, dialogs, and reduced motion are deliberately handled', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /::backdrop/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /scroll-margin-top/);
});

test('hero copy shares the centered editorial shell', () => {
  assert.match(css, /\.hero-copy\s*\{[^}]*margin-inline:\s*auto/s);
});

test('mobile tribute filters scroll discreetly without a native scrollbar or offset strip', () => {
  assert.match(css, /\.tribute-filters\s*\{[^}]*scrollbar-width:\s*none/s);
  assert.match(css, /\.tribute-filters::\-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*768px\)[\s\S]*scroll-margin-top:\s*68px/);
});
