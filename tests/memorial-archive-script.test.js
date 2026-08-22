const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'public', 'memorial-archive.js');

test('tribute view models carry clean names, categories, layouts, and permalinks', () => {
  const { createTributeViewModel } = require(sourcePath);
  const tribute = createTributeViewModel({
    id: 42,
    name: 'REV. JAMES OGBONNA',
    relationship: 'Brother',
    message: `First paragraph.\n\n${'A'.repeat(1500)}`
  });

  assert.equal(tribute.name, 'Rev. James Ogbonna');
  assert.equal(tribute.category, 'Family');
  assert.equal(tribute.layout, 'feature');
  assert.equal(tribute.hash, '#tribute-42');
  assert.deepEqual(tribute.paragraphs[0], 'First paragraph.');
});

test('archive controller loads all tributes and renders user copy without HTML injection', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.match(source, /fetch\('\/api\/tributes'/);
  assert.match(source, /filterTributes/);
  assert.match(source, /formatContributorName/);
  assert.match(source, /textContent\s*=/);
  assert.match(source, /document\.createElement/);
  assert.match(source, /previousTributes/);
  assert.match(source, /nextTributes/);
  assert.match(source, /tributePageStatus/);
  assert.match(source, /matchMedia\('\(max-width: 480px\)'\)/);
  assert.doesNotMatch(source, /loadMoreTributes/);
  assert.match(source, /tributeDialog/);
  assert.match(source, /previousTribute/);
  assert.match(source, /nextTribute/);
  assert.match(source, /navigateDialog/);
  assert.match(source, /#tribute-/);
  assert.match(source, /history\.pushState/);
  assert.match(source, /addEventListener\('popstate'/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});

test('pagination clamps the page and returns a stable visible range', () => {
  const { paginateTributes } = require(sourcePath);
  const tributes = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }));

  assert.deepEqual(paginateTributes(tributes, 2, 12), {
    items: tributes.slice(12, 24),
    page: 2,
    totalPages: 3,
    start: 13,
    end: 24,
    total: 25
  });
  assert.equal(paginateTributes(tributes, 99, 12).page, 3);
  assert.deepEqual(paginateTributes([], 1, 6), {
    items: [], page: 1, totalPages: 1, start: 0, end: 0, total: 0
  });
});
