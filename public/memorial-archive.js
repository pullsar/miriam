(function attachMemorialArchive(root, factory) {
  const utils = typeof module === 'object' && module.exports
    ? require('./memorial-utils')
    : root.MemorialUtils;
  const api = factory(utils);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MemorialArchive = api;
  if (root && root.document) root.document.addEventListener('DOMContentLoaded', api.boot);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createArchive(utils) {
  const PAGE_SIZE = 12;

  function createTributeViewModel(tribute) {
    const message = String((tribute && tribute.message) || '').trim();
    const id = Number(tribute && tribute.id);
    return {
      id,
      name: utils.formatContributorName(tribute && tribute.name),
      relationship: String((tribute && tribute.relationship) || '').trim(),
      category: utils.normaliseTributeCategory(tribute && tribute.relationship),
      layout: utils.classifyTribute({ message }),
      message,
      paragraphs: message.split(/\r?\n\s*\r?\n|\r?\n/).map(value => value.trim()).filter(Boolean),
      hash: `#tribute-${id}`
    };
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function excerpt(message, layout) {
    const limit = layout === 'feature' ? 820 : layout === 'standard' ? 520 : 300;
    if (message.length <= limit) return message;
    const clipped = message.slice(0, limit);
    const lastSpace = clipped.lastIndexOf(' ');
    return `${clipped.slice(0, lastSpace > limit * 0.75 ? lastSpace : limit).trim()}…`;
  }

  function createTributeCard(tribute, openTribute) {
    const card = makeElement('article', `archive-tribute archive-tribute-${tribute.layout}`);
    card.id = `tribute-${tribute.id}`;
    card.dataset.tributeId = String(tribute.id);

    const top = makeElement('div', 'archive-tribute-top');
    top.append(makeElement('p', 'archive-tribute-category', tribute.category));
    top.append(makeElement('span', 'archive-tribute-mark', '“'));

    const title = makeElement('h3', 'archive-tribute-name', tribute.name);
    const rule = makeElement('span', 'archive-tribute-rule');
    rule.setAttribute('aria-hidden', 'true');
    const copy = makeElement('p', 'archive-tribute-copy', excerpt(tribute.message, tribute.layout));
    const read = makeElement('button', 'archive-tribute-read', 'Read full tribute');
    read.type = 'button';
    read.setAttribute('aria-label', `Read the full tribute by ${tribute.name}`);
    read.addEventListener('click', () => openTribute(tribute, true));

    card.append(top, title, rule, copy, read);
    return card;
  }

  function boot() {
    const grid = document.getElementById('tributeGrid');
    if (!grid || !utils) return;

    const status = document.getElementById('tributeStatus');
    const search = document.getElementById('tributeSearch');
    const filters = document.getElementById('tributeFilters');
    const loadMoreTributes = document.getElementById('loadMoreTributes');
    const dialog = document.getElementById('tributeDialog');
    const dialogName = document.getElementById('tributeDialogName');
    const dialogCategory = document.getElementById('tributeDialogCategory');
    const dialogMessage = document.getElementById('tributeDialogMessage');
    const dialogShare = document.getElementById('tributeDialogShare');
    let tributes = [];
    let selectedCategory = 'All';
    let visibleCount = PAGE_SIZE;
    let activeTribute = null;
    let hashWasOpened = false;

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function closeDialog() {
      if (!dialog) return;
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      if (hashWasOpened && /^#tribute-\d+$/.test(window.location.hash)) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
      activeTribute = null;
      hashWasOpened = false;
    }

    function openTribute(tribute, updateHash) {
      if (!dialog || !tribute) return;
      activeTribute = tribute;
      dialogName.textContent = tribute.name;
      dialogCategory.textContent = tribute.category;
      dialogMessage.replaceChildren();
      tribute.paragraphs.forEach(paragraph => dialogMessage.append(makeElement('p', '', paragraph)));
      if (updateHash) {
        history.replaceState(null, '', tribute.hash);
        hashWasOpened = true;
      }
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    function currentFiltered() {
      return utils.filterTributes(tributes, {
        category: selectedCategory,
        query: search ? search.value : ''
      });
    }

    function render() {
      const filtered = currentFiltered();
      const visible = filtered.slice(0, visibleCount);
      const fragment = document.createDocumentFragment();
      visible.forEach(tribute => fragment.append(createTributeCard(tribute, openTribute)));
      grid.replaceChildren(fragment);

      if (!filtered.length) {
        setStatus('No tributes match this search. Try another name or category.');
      } else {
        setStatus(`Showing ${visible.length} of ${filtered.length} tributes`);
      }
      if (loadMoreTributes) loadMoreTributes.hidden = visible.length >= filtered.length;
    }

    function resetAndRender() {
      visibleCount = PAGE_SIZE;
      render();
    }

    if (search) search.addEventListener('input', resetAndRender);
    if (filters) {
      filters.addEventListener('click', event => {
        const button = event.target.closest('[data-category]');
        if (!button) return;
        selectedCategory = button.dataset.category;
        filters.querySelectorAll('[data-category]').forEach(candidate => {
          const active = candidate === button;
          candidate.classList.toggle('is-active', active);
          candidate.setAttribute('aria-pressed', String(active));
        });
        resetAndRender();
      });
    }
    if (loadMoreTributes) {
      loadMoreTributes.addEventListener('click', () => {
        visibleCount += PAGE_SIZE;
        render();
      });
    }
    if (dialog) {
      dialog.querySelector('[data-close-tribute]')?.addEventListener('click', closeDialog);
      dialog.addEventListener('click', event => {
        if (event.target === dialog) closeDialog();
      });
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        closeDialog();
      });
    }
    if (dialogShare) {
      dialogShare.addEventListener('click', async () => {
        if (!activeTribute) return;
        const url = `${window.location.origin}${window.location.pathname}${activeTribute.hash}`;
        try {
          await navigator.clipboard.writeText(url);
          dialogShare.textContent = 'Link copied';
        } catch (_) {
          window.prompt('Copy this link', url);
        }
        window.setTimeout(() => { dialogShare.textContent = 'Copy link to this tribute'; }, 1800);
      });
    }

    fetch('/api/tributes', { headers: { Accept: 'application/json' } })
      .then(response => {
        if (!response.ok) throw new Error('Tributes could not be loaded');
        return response.json();
      })
      .then(data => {
        tributes = (Array.isArray(data) ? data : []).map(createTributeViewModel);
        render();
        const match = window.location.hash.match(/^#tribute-(\d+)$/);
        if (match) {
          const tribute = tributes.find(item => item.id === Number(match[1]));
          if (tribute) openTribute(tribute, false);
        }
      })
      .catch(() => setStatus('Her tributes are temporarily unavailable. Please try again shortly.'));
  }

  return { boot, createTributeViewModel, excerpt };
}));
