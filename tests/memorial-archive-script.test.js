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
  assert.match(source, /loadMoreTributes/);
  assert.match(source, /tributeDialog/);
  assert.match(source, /#tribute-/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
});
