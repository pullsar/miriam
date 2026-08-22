document.addEventListener('DOMContentLoaded', () => {
  const utils = window.MemorialUtils;
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  function setMenu(open) {
    if (!navToggle || !navLinks) return;
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  }
  if (nav) {
    const updateNav = () => nav.classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  const music = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicBtn');
  const musicLabel = document.getElementById('musicLabel');

  function setMusicState(playing) {
    if (!musicBtn || !musicLabel) return;
    musicBtn.classList.toggle('playing', playing);
    musicBtn.setAttribute('aria-label', playing ? 'Turn music off' : 'Turn music on');
    musicLabel.textContent = playing ? 'Music On' : 'Music Off';
  }

  if (music && musicBtn) {
    musicBtn.addEventListener('click', async () => {
      if (!music.paused) {
        music.pause();
        setMusicState(false);
        return;
      }
      try {
        await music.play();
        setMusicState(true);
      } catch (_) {
        setMusicState(false);
      }
    });
    music.addEventListener('ended', () => setMusicState(false));
    music.addEventListener('pause', () => setMusicState(false));
  }

  const downloadCountLabels = {
    brochure: 'Memorial brochure downloads',
    'order-of-mass': 'Order of Mass downloads'
  };
  const downloadCountState = new Map();
  const downloadCountFormatter = new Intl.NumberFormat();

  function updateDownloadCount(resource, count) {
    const numericCount = Math.max(0, Number.parseInt(count, 10) || 0);
    const formattedCount = downloadCountFormatter.format(numericCount);
    downloadCountState.set(resource, numericCount);
    document.querySelectorAll(`[data-download-count="${resource}"]`).forEach(badge => {
      badge.textContent = formattedCount;
      badge.setAttribute('aria-label', `${downloadCountLabels[resource]}: ${formattedCount}`);
      badge.removeAttribute('hidden');
    });
  }

  async function loadDownloadCounts() {
    try {
      const response = await fetch('/api/download-counts', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const counts = await response.json();
      updateDownloadCount('brochure', counts.brochure);
      updateDownloadCount('order-of-mass', counts.orderOfMass);
    } catch (_) {
      // The archive resources remain available if totals are temporarily unavailable.
    }
  }

  document.querySelectorAll('[data-download-resource]').forEach(link => {
    link.addEventListener('click', () => {
      const resource = link.dataset.downloadResource;
      fetch(`/api/download-counts/${resource}`, {
        method: 'POST',
        keepalive: true
      }).catch(() => {});
      if (downloadCountState.has(resource)) {
        updateDownloadCount(resource, downloadCountState.get(resource) + 1);
      }
    });
  });
  loadDownloadCounts();

  const galleryGrid = document.getElementById('galleryGrid');
  const galleryStatus = document.getElementById('galleryStatus');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxClose = document.getElementById('lightboxClose');
  let lightboxIndex = 0;
  // Family-reviewed exclusions remain stored on the server but are not shown in the memorial gallery.
  const EXCLUDED_GALLERY_PHOTO_IDS = new Set([
    11, 15, 16, 17, 29, 32, 35, 36, 37, 42, 43, 44, 45, 46, 48, 49, 50, 54, 58, 60, 63, 64, 65, 66, 71,
    51, 52, 53, 69
  ]);

  function lightboxItems() {
    return galleryGrid ? Array.from(galleryGrid.querySelectorAll('[data-lightbox-src]')) : [];
  }

  function showLightboxAt(index) {
    const items = lightboxItems();
    if (!items.length || !lightboxImage) return;
    lightboxIndex = (index + items.length) % items.length;
    const item = items[lightboxIndex];
    const caption = item.dataset.lightboxCaption || 'A photograph of Miriam';
    lightboxImage.src = item.dataset.lightboxSrc;
    lightboxImage.alt = caption;
    if (lightboxCaption) lightboxCaption.textContent = caption;
    if (lightboxCounter) lightboxCounter.textContent = `${lightboxIndex + 1} / ${items.length}`;
  }

  function openLightbox(button) {
    if (!lightbox) return;
    const index = lightboxItems().indexOf(button);
    showLightboxAt(Math.max(0, index));
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
  }

  function closeLightbox() {
    if (!lightbox) return;
    if (lightbox.open && typeof lightbox.close === 'function') lightbox.close();
    else lightbox.removeAttribute('open');
    if (lightboxImage) lightboxImage.removeAttribute('src');
  }

  if (galleryGrid) {
    galleryGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-lightbox-src]');
      if (button) openLightbox(button);
    });
  }
  lightboxPrev?.addEventListener('click', () => showLightboxAt(lightboxIndex - 1));
  lightboxNext?.addEventListener('click', () => showLightboxAt(lightboxIndex + 1));
  lightboxClose?.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
    lightbox.addEventListener('cancel', event => { event.preventDefault(); closeLightbox(); });
  }
  document.addEventListener('keydown', event => {
    if (!lightbox?.open) return;
    if (event.key === 'ArrowLeft') showLightboxAt(lightboxIndex - 1);
    if (event.key === 'ArrowRight') showLightboxAt(lightboxIndex + 1);
  });

  function createSubmittedPhoto(photo) {
    const figure = document.createElement('figure');
    figure.className = 'gallery-item gallery-item-submitted';
    const button = document.createElement('button');
    const captionText = String(photo.caption || '').trim()
      || (photo.uploader_name ? `Shared by ${utils.formatContributorName(photo.uploader_name)}` : 'A cherished memory');
    button.type = 'button';
    button.dataset.lightboxSrc = photo.url;
    button.dataset.lightboxCaption = captionText;
    const image = document.createElement('img');
    image.src = photo.url;
    image.alt = captionText;
    image.loading = 'lazy';
    image.decoding = 'async';
    const caption = document.createElement('figcaption');
    caption.textContent = captionText;
    button.append(image, caption);
    figure.append(button);
    return figure;
  }

  async function loadSubmittedPhotos() {
    if (!galleryGrid || !utils) return;
    try {
      const response = await fetch('/api/photos', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Photos unavailable');
      const submitted = utils.uniquePhotos(utils.curatePhotos(await response.json(), EXCLUDED_GALLERY_PHOTO_IDS));
      const existing = new Set(lightboxItems().map(item => item.dataset.lightboxSrc.toLowerCase()));
      const fragment = document.createDocumentFragment();
      let added = 0;
      submitted.forEach(photo => {
        if (!photo.url || existing.has(photo.url.toLowerCase())) return;
        existing.add(photo.url.toLowerCase());
        fragment.append(createSubmittedPhoto(photo));
        added += 1;
      });
      galleryGrid.append(fragment);
      if (galleryStatus) galleryStatus.textContent = added
        ? `${added} photographs shared by family and friends join this gallery.`
        : 'More photographs may be shared with this living archive below.';
    } catch (_) {
      if (galleryStatus) galleryStatus.textContent = 'The family gallery remains open for new photographs.';
    }
  }
  loadSubmittedPhotos();

  const MAX_IMAGE_EDGE = 1600;
  const COMPRESSION_TARGET = 650 * 1024;

  async function compressImage(file) {
    if (!file.type?.startsWith('image/') || file.size <= COMPRESSION_TARGET) return file;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch (_) {
      return file;
    } finally {
      bitmap?.close?.();
    }
  }

  function bindPreviews(input, preview, maximum) {
    if (!input || !preview) return;
    input.addEventListener('change', () => {
      preview.replaceChildren();
      Array.from(input.files || []).slice(0, maximum).forEach(file => {
        const item = document.createElement('span');
        item.className = 'photo-preview';
        const image = document.createElement('img');
        const source = URL.createObjectURL(file);
        image.src = source;
        image.alt = '';
        image.addEventListener('load', () => URL.revokeObjectURL(source), { once: true });
        const label = document.createElement('span');
        label.textContent = file.name;
        item.append(image, label);
        preview.append(item);
      });
    });
  }

  async function formDataWithCompressedFiles(form, input, maximum) {
    const data = new FormData(form);
    data.delete('photos');
    const files = Array.from(input?.files || []).slice(0, maximum);
    const compressed = await Promise.all(files.map(compressImage));
    compressed.forEach(file => data.append('photos', file));
    return data;
  }

  async function submitForm({ form, endpoint, input, maximum, submit, status, success, requiredFields = [] }) {
    status.textContent = '';
    form.querySelectorAll('.form-field').forEach(field => field.classList.remove('has-error'));
    let invalid = false;
    requiredFields.forEach(name => {
      const control = form.elements.namedItem(name);
      if (!control || String(control.value || '').trim()) return;
      control.closest('.form-field')?.classList.add('has-error');
      const error = control.closest('.form-field')?.querySelector('.field-error');
      if (error) error.textContent = 'This field is required.';
      invalid = true;
    });
    if (input?.required && !input.files.length) {
      input.closest('.form-field')?.classList.add('has-error');
      const error = input.closest('.form-field')?.querySelector('.field-error');
      if (error) error.textContent = 'Please choose at least one photograph.';
      invalid = true;
    }
    if (invalid) return;

    submit.disabled = true;
    const buttonText = submit.querySelector('.btn-text');
    const originalText = buttonText.textContent;
    buttonText.textContent = 'Preparing…';
    try {
      const data = await formDataWithCompressedFiles(form, input, maximum);
      buttonText.textContent = 'Sending…';
      const response = await fetch(endpoint, { method: 'POST', body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Your submission could not be sent.');
      form.hidden = true;
      success.hidden = false;
      form.reset();
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message || 'Your submission could not be sent. Please try again.';
      status.className = 'form-status error';
    } finally {
      submit.disabled = false;
      buttonText.textContent = originalText;
    }
  }

  const tributeForm = document.getElementById('tributeForm');
  const tributeInput = document.getElementById('tributePhotos');
  const tributePreview = document.getElementById('tributePhotoPreview');
  const tributeSubmit = document.getElementById('tributeSubmit');
  const tributeSuccess = document.getElementById('tributeSuccess');
  const formStatus = document.getElementById('formStatus');
  const writeAnother = document.getElementById('writeAnother');
  bindPreviews(tributeInput, tributePreview, 3);
  if (tributeForm) {
    const message = tributeForm.elements.namedItem('message');
    const count = tributeForm.querySelector('.char-count');
    message.addEventListener('input', () => { count.textContent = `${message.value.length} characters`; });
    tributeForm.addEventListener('submit', event => {
      event.preventDefault();
      const name = tributeForm.elements.namedItem('name').value.trim();
      document.getElementById('successName').textContent = name;
      submitForm({ form: tributeForm, endpoint: '/api/tribute', input: tributeInput, maximum: 3, submit: tributeSubmit, status: formStatus, success: tributeSuccess, requiredFields: ['name', 'message'] });
    });
  }
  writeAnother?.addEventListener('click', () => {
    tributeSuccess.hidden = true;
    tributeForm.hidden = false;
    tributePreview.replaceChildren();
    tributeForm.elements.namedItem('name').focus();
  });

  const photoForm = document.getElementById('photoUploadForm');
  const photoInput = document.getElementById('photoUploadInput');
  const photoPreview = document.getElementById('photoUploadPreview');
  const photoSubmit = document.getElementById('photoUploadSubmit');
  const photoSuccess = document.getElementById('photoUploadSuccess');
  const photoStatus = document.getElementById('photoUploadStatus');
  const uploadMore = document.getElementById('uploadMorePhotos');
  bindPreviews(photoInput, photoPreview, 5);
  photoForm?.addEventListener('submit', event => {
    event.preventDefault();
    submitForm({ form: photoForm, endpoint: '/api/upload-photos', input: photoInput, maximum: 5, submit: photoSubmit, status: photoStatus, success: photoSuccess });
  });
  uploadMore?.addEventListener('click', () => {
    photoSuccess.hidden = true;
    photoForm.hidden = false;
    photoPreview.replaceChildren();
    photoInput.focus();
  });
});
