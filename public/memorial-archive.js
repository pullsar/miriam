(function attachMemorialArchive(root, factory) {
  const utils = typeof module === 'object' && module.exports
    ? require('./memorial-utils')
    : root.MemorialUtils;
  const api = factory(utils);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MemorialArchive = api;
  if (root && root.document) root.document.addEventListener('DOMContentLoaded', api.boot);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createArchive(utils) {
  const DESKTOP_PAGE_SIZE = 12;
  const MOBILE_PAGE_SIZE = 6;

  function paginateTributes(tributes, requestedPage, pageSize) {
    const source = Array.isArray(tributes) ? tributes : [];
    const safePageSize = Math.max(1, Number(pageSize) || DESKTOP_PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(source.length / safePageSize));
    const page = Math.min(totalPages, Math.max(1, Number(requestedPage) || 1));
    const offset = (page - 1) * safePageSize;
    const items = source.slice(offset, offset + safePageSize);
    return {
      items,
      page,
      totalPages,
      start: items.length ? offset + 1 : 0,
      end: items.length ? offset + items.length : 0,
      total: source.length
    };
  }

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
    const pagination = document.getElementById('tributePagination');
    const previousTributes = document.getElementById('previousTributes');
    const nextTributes = document.getElementById('nextTributes');
    const tributePageStatus = document.getElementById('tributePageStatus');
    const dialog = document.getElementById('tributeDialog');
    const dialogName = document.getElementById('tributeDialogName');
    const dialogCategory = document.getElementById('tributeDialogCategory');
    const dialogMessage = document.getElementById('tributeDialogMessage');
    const dialogShare = document.getElementById('tributeDialogShare');
    const previousTribute = document.getElementById('previousTribute');
    const nextTribute = document.getElementById('nextTribute');
    const tributeDialogPosition = document.getElementById('tributeDialogPosition');
    let tributes = [];
    let selectedCategory = 'All';
    const phoneMedia = window.matchMedia('(max-width: 480px)');
    let currentPage = 1;
    let activeTribute = null;
    let openedWithHistory = false;

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function closeDialog(options = {}) {
      if (!dialog) return;
      const fromHistory = options.fromHistory === true;
      const returnToArchive = openedWithHistory && /^#tribute-\d+$/.test(window.location.hash);
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      activeTribute = null;
      openedWithHistory = false;
      if (!fromHistory && returnToArchive) {
        history.back();
      } else if (!fromHistory && /^#tribute-\d+$/.test(window.location.hash)) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    }

    function dialogSequence() {
      const filtered = currentFiltered();
      return activeTribute && filtered.some(tribute => tribute.id === activeTribute.id) ? filtered : tributes;
    }

    function updateDialogNavigation() {
      const sequence = dialogSequence();
      const index = sequence.findIndex(tribute => tribute.id === activeTribute?.id);
      if (previousTribute) previousTribute.disabled = index <= 0;
      if (nextTribute) nextTribute.disabled = index < 0 || index >= sequence.length - 1;
      if (tributeDialogPosition) {
        tributeDialogPosition.textContent = index >= 0 ? `${index + 1} of ${sequence.length}` : '';
      }
    }

    function openTribute(tribute, updateHash) {
      if (!dialog || !tribute) return;
      activeTribute = tribute;
      dialogName.textContent = tribute.name;
      dialogCategory.textContent = tribute.category;
      dialogMessage.replaceChildren();
      tribute.paragraphs.forEach(paragraph => dialogMessage.append(makeElement('p', '', paragraph)));
      if (updateHash) {
        history.pushState({ tributeId: tribute.id }, '', tribute.hash);
        openedWithHistory = true;
      }
      updateDialogNavigation();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    function navigateDialog(delta) {
      const sequence = dialogSequence();
      const index = sequence.findIndex(tribute => tribute.id === activeTribute?.id);
      const target = sequence[index + delta];
      if (!target) return;
      history.replaceState({ tributeId: target.id }, '', target.hash);
      openTribute(target, false);
      dialog.scrollTop = 0;
    }

    function currentFiltered() {
      return utils.filterTributes(tributes, {
        category: selectedCategory,
        query: search ? search.value : ''
      });
    }

    function pageSize() {
      return phoneMedia.matches ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
    }

    function updatePagination(page) {
      if (!pagination) return;
      pagination.hidden = page.total <= pageSize();
      if (tributePageStatus) tributePageStatus.textContent = `Page ${page.page} of ${page.totalPages}`;
      if (previousTributes) previousTributes.disabled = page.page <= 1;
      if (nextTributes) nextTributes.disabled = page.page >= page.totalPages;
    }

    function render() {
      const filtered = currentFiltered();
      const page = paginateTributes(filtered, currentPage, pageSize());
      currentPage = page.page;
      const fragment = document.createDocumentFragment();
      page.items.forEach(tribute => fragment.append(createTributeCard(tribute, openTribute)));
      grid.replaceChildren(fragment);

      if (!filtered.length) {
        setStatus('No tributes match this search. Try another name or category.');
      } else {
        setStatus(`Showing ${page.start}–${page.end} of ${page.total} tributes`);
      }
      updatePagination(page);
    }

    function resetAndRender() {
      currentPage = 1;
      render();
    }

    function changePage(delta) {
      currentPage += delta;
      render();
      document.getElementById('tributes')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
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
    previousTributes?.addEventListener('click', () => changePage(-1));
    nextTributes?.addEventListener('click', () => changePage(1));
    previousTribute?.addEventListener('click', () => navigateDialog(-1));
    nextTribute?.addEventListener('click', () => navigateDialog(1));
    phoneMedia.addEventListener?.('change', resetAndRender);
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
    window.addEventListener('popstate', () => {
      const match = window.location.hash.match(/^#tribute-(\d+)$/);
      const tribute = match ? tributes.find(item => item.id === Number(match[1])) : null;
      if (tribute && !dialog?.open) {
        openTribute(tribute, false);
      } else if (dialog?.open && (!tribute || tribute.id !== activeTribute?.id)) {
        closeDialog({ fromHistory: true });
      }
    });

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

  return { boot, createTributeViewModel, excerpt, paginateTributes };
}));
