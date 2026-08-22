const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatContributorName,
  normaliseTributeCategory,
  classifyTribute,
  filterTributes,
  curatePhotos,
  uniquePhotos
} = require('../public/memorial-utils');

test('contributor names use respectful capitalization and preserve titles', () => {
  assert.equal(formatContributorName('PROF. VERONICA EGONEKWU MOGBOH'), 'Prof. Veronica Egonekwu Mogboh');
  assert.equal(formatContributorName('rev. james ogbonna, c.s.sp.'), 'Rev. James Ogbonna, C.S.Sp.');
  assert.equal(formatContributorName('DR MRS VERA MOGBOH'), 'Dr. Mrs. Vera Mogboh');
  assert.equal(formatContributorName('ESUT MANAGEMENT'), 'ESUT Management');
  assert.equal(formatContributorName('CWO, NFCS AND FANRM'), 'CWO, NFCS and FANRM');
  assert.equal(formatContributorName('R.I.T.A. AMSSRN'), 'R.I.T.A. AMSSRN');
  assert.equal(formatContributorName('family of late mr. ogbonna'), 'Family of Late Mr. Ogbonna');
});

test('relationships resolve into the six approved memorial categories', () => {
  assert.equal(normaliseTributeCategory('Daughter'), 'Family');
  assert.equal(normaliseTributeCategory('close friend'), 'Friends');
  assert.equal(normaliseTributeCategory('Former Student'), 'Students');
  assert.equal(normaliseTributeCategory('Vice Chancellor, ESUT'), 'Colleagues');
  assert.equal(normaliseTributeCategory('St Mulumba Choir'), 'Church & Community');
  assert.equal(normaliseTributeCategory(''), 'Other Memories');
});

test('tribute length selects a compact, standard, or feature treatment', () => {
  assert.equal(classifyTribute({ message: 'Short remembrance.' }), 'compact');
  assert.equal(classifyTribute({ message: 'A'.repeat(700) }), 'standard');
  assert.equal(classifyTribute({ message: 'A'.repeat(1800) }), 'feature');
});

test('archive filtering searches names and messages inside the selected category', () => {
  const tributes = [
    { name: 'Lauretta Aniagolu', relationship: 'Friend', message: 'Her laughter filled every room.' },
    { name: 'Rev. James Ogbonna', relationship: 'Brother', message: 'A beloved sister.' },
    { name: 'Ada Student', relationship: 'Student', message: 'Professor Mgbakor encouraged us.' }
  ];

  assert.deepEqual(filterTributes(tributes, { category: 'Friends', query: '' }), [tributes[0]]);
  assert.deepEqual(filterTributes(tributes, { category: 'All', query: 'encouraged' }), [tributes[2]]);
  assert.deepEqual(filterTributes(tributes, { category: 'Family', query: 'james' }), [tributes[1]]);
});

test('gallery photos are deduplicated by their normalized source', () => {
  const photos = [
    { src: '/images/main.jpeg', caption: 'Portrait' },
    { url: '/images/main.jpeg', caption: 'Duplicate portrait' },
    { filename: 'uploads/photos/family.jpg', caption: 'Family' },
    { filename: '/uploads/photos/family.jpg', caption: 'Duplicate family' }
  ];

  assert.deepEqual(uniquePhotos(photos), [photos[0], photos[2]]);
});

test('gallery curation hides reviewed uploads without mutating the stored list', () => {
  const photos = [
    { id: 11, url: '/uploads/letter.jpg' },
    { id: 12, url: '/uploads/family.jpg' },
    { id: 13, url: '/uploads/portrait.jpg' }
  ];
  const snapshot = structuredClone(photos);

  assert.deepEqual(curatePhotos(photos, new Set([11, 13])), [photos[1]]);
  assert.deepEqual(photos, snapshot);
});
