(function attachMemorialUtils(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MemorialUtils = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createMemorialUtils() {
  const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'for', 'from', 'in', 'of', 'on', 'the', 'to']);
  const SPECIAL_WORDS = new Map([
    ['prof', 'Prof.'],
    ['prof.', 'Prof.'],
    ['dr', 'Dr.'],
    ['dr.', 'Dr.'],
    ['rev', 'Rev.'],
    ['rev.', 'Rev.'],
    ['fr', 'Fr.'],
    ['fr.', 'Fr.'],
    ['mr', 'Mr.'],
    ['mr.', 'Mr.'],
    ['mrs', 'Mrs.'],
    ['mrs.', 'Mrs.'],
    ['ms', 'Ms.'],
    ['ms.', 'Ms.'],
    ['assoc', 'Assoc.'],
    ['assoc.', 'Assoc.'],
    ['esut', 'ESUT'],
    ['c.s.sp', 'C.S.Sp.'],
    ['c.s.sp.', 'C.S.Sp.']
  ]);

  function titleCasePart(part) {
    if (!part) return part;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }

  function formatWord(word, index) {
    const leading = (word.match(/^[^\p{L}\p{N}]*/u) || [''])[0];
    const trailing = (word.match(/[^\p{L}\p{N}.]*$/u) || [''])[0];
    const core = word.slice(leading.length, trailing ? -trailing.length : undefined);
    const lower = core.toLowerCase();
    const special = SPECIAL_WORDS.get(lower);
    if (special) return `${leading}${special}${trailing}`;
    if (index > 0 && SMALL_WORDS.has(lower)) return `${leading}${lower}${trailing}`;
    const formatted = core
      .split(/([-’'])/)
      .map(part => (/^[-’']$/.test(part) ? part : titleCasePart(part)))
      .join('');
    return `${leading}${formatted}${trailing}`;
  }

  function formatContributorName(value) {
    const normalized = String(value || '').trim().replace(/\s+/g, ' ');
    if (!normalized) return 'Anonymous';
    return normalized.split(' ').map(formatWord).join(' ');
  }

  function normaliseTributeCategory(relationship) {
    const value = String(relationship || '').trim().toLowerCase();
    if (!value) return 'Other Memories';
    if (/friend|classmate|neighbou?r/.test(value)) return 'Friends';
    if (/daughter|son|child|husband|wife|mother|father|sister|brother|aunt|uncle|cousin|niece|nephew|grand|family|in-law|relative/.test(value)) return 'Family';
    if (/student|pupil|alumn/.test(value)) return 'Students';
    if (/colleague|vice.?chancellor|esut|academic|lecturer|faculty|department|staff|university/.test(value)) return 'Colleagues';
    if (/church|choir|parish|catholic|christian|community|association|union/.test(value)) return 'Church & Community';
    return 'Other Memories';
  }

  function classifyTribute(tribute) {
    const length = String((tribute && tribute.message) || '').trim().length;
    if (length >= 1400) return 'feature';
    if (length >= 400) return 'standard';
    return 'compact';
  }

  function filterTributes(tributes, options = {}) {
    const category = options.category || 'All';
    const query = String(options.query || '').trim().toLocaleLowerCase();
    return (Array.isArray(tributes) ? tributes : []).filter(tribute => {
      const inCategory = category === 'All' || normaliseTributeCategory(tribute.relationship) === category;
      if (!inCategory) return false;
      if (!query) return true;
      return [tribute.name, tribute.message, tribute.relationship]
        .some(value => String(value || '').toLocaleLowerCase().includes(query));
    });
  }

  function photoSource(photo) {
    const raw = String((photo && (photo.src || photo.url || photo.filename)) || '').trim();
    if (!raw) return '';
    const normalized = raw.replace(/\\/g, '/').replace(/^\.\//, '');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  function uniquePhotos(photos) {
    const seen = new Set();
    return (Array.isArray(photos) ? photos : []).filter(photo => {
      const source = photoSource(photo).toLowerCase();
      if (!source || seen.has(source)) return false;
      seen.add(source);
      return true;
    });
  }

  return {
    formatContributorName,
    normaliseTributeCategory,
    classifyTribute,
    filterTributes,
    photoSource,
    uniquePhotos
  };
}));
