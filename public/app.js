document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const music = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicBtn');
  const musicLabel = document.getElementById('musicLabel');
  const tributeForm = document.getElementById('tributeForm');
  const formStatus = document.getElementById('formStatus');
  const tributeSuccess = document.getElementById('tributeSuccess');
  const successName = document.getElementById('successName');
  const writeAnother = document.getElementById('writeAnother');
  const tributeSubmit = document.getElementById('tributeSubmit');
  const preloader = document.getElementById('preloader');
  const preloaderEnter = document.getElementById('preloaderEnter');
  const preloaderDownloads = document.getElementById('preloaderDownloads');

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
      // Downloads remain fully usable when totals are temporarily unavailable.
    }
  }

  document.querySelectorAll('[data-download-resource]').forEach(link => {
    link.addEventListener('click', () => {
      const resource = link.dataset.downloadResource;
      if (downloadCountState.has(resource)) {
        updateDownloadCount(resource, downloadCountState.get(resource) + 1);
      }
    });
  });

  loadDownloadCounts();

  const playlist = [
    '/audio/soon-ah-will-be-done.mp3',
    '/audio/o-lord-my-god-how-great.mp3'
  ];
  let trackIndex = 0;
  let isPlaying = false;

  async function playMusic() {
    if (!music) return;
    try {
      await music.play();
      isPlaying = true;
      if (musicBtn) musicBtn.classList.add('playing');
      if (musicLabel) musicLabel.textContent = 'Pause music';
    } catch (err) {
      console.error('Audio play failed:', err);
    }
  }

  function pauseMusic() {
    if (!music) return;
    music.pause();
    isPlaying = false;
    if (musicBtn) musicBtn.classList.remove('playing');
    if (musicLabel) musicLabel.textContent = 'Play music';
  }

  function playNextTrack() {
    if (!music) return;
    trackIndex = (trackIndex + 1) % playlist.length;
    music.src = playlist[trackIndex];
    music.play().catch(err => console.error('Audio play failed:', err));
  }

  if (music) {
    music.removeAttribute('loop');
    music.addEventListener('ended', playNextTrack);
  }

  // Entrance overlay: click to flip the card, then autoplay music
  const preloaderLoading = document.getElementById('preloaderLoading');
  const preloaderHint = document.getElementById('preloaderHint');

  if (preloaderDownloads) {
    preloaderDownloads.addEventListener('click', event => event.stopPropagation());
    preloaderDownloads.addEventListener('keydown', event => event.stopPropagation());
  }

  if (preloader) {
    let entering = false;
    const LOADING_TIMEOUT = 4000;

    const enter = async () => {
      if (entering) return;
      entering = true;
      preloader.classList.add('opened', 'loading');

      try {
        await Promise.race([
          playMusic(),
          new Promise(resolve => setTimeout(resolve, LOADING_TIMEOUT))
        ]);
      } catch (err) {
        console.error('Music failed to start:', err);
      }

      setTimeout(() => {
        preloader.classList.add('hidden');
        document.body.classList.remove('preload-locked');
        sessionStorage.setItem('memorialEntered', '1');
      }, 1050);
    };

    if (preloaderEnter) {
      preloaderEnter.addEventListener('click', (event) => {
        event.stopPropagation();
        enter();
      });
    }

    preloader.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      enter();
    });

    if (sessionStorage.getItem('memorialEntered')) {
      preloader.classList.add('hidden');
      document.body.classList.remove('preload-locked');
    }
  } else {
    document.body.classList.remove('preload-locked');
  }

  // Sticky nav shadow
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Mobile menu
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }

  // Music toggle
  if (music && musicBtn) {
    musicBtn.addEventListener('click', () => {
      if (isPlaying) {
        pauseMusic();
      } else {
        playMusic();
      }
    });
  }

  // File upload helpers
  const COMPRESS_MAX_DIM = 1600;       // longest edge in px
  const COMPRESS_QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45];
  const COMPRESS_TARGET_BYTES = 450 * 1024; // ~450 KB target per image
  const COMPRESS_HARD_MAX_BYTES = 900 * 1024; // never exceed ~900 KB
  const COMPRESS_MIN_QUALITY = 0.4;

  // Reads an image File into an HTMLImageElement (decoded).
  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Compresses a single image File to JPEG, scaling down if needed and
  // walking through quality steps until under target size (or hard max).
  // Non-image files and tiny files are passed through unchanged.
  async function compressImage(file) {
    const isImage = file.type && file.type.startsWith('image/');
    if (!isImage) return file;
    // Already small enough — skip work.
    if (file.size && file.size <= COMPRESS_TARGET_BYTES) return file;

    try {
      const objectURL = URL.createObjectURL(file);
      const img = await loadImageElement(objectURL);
      URL.revokeObjectURL(objectURL);

      let { width, height } = img;
      if (width === 0 || height === 0) return file;

      // Scale down to fit within COMPRESS_MAX_DIM on the longest edge.
      if (Math.max(width, height) > COMPRESS_MAX_DIM) {
        const scale = COMPRESS_MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      // White background so transparent PNGs don't go black as JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Try decreasing quality until under target (or hit hard max / min quality).
      let blob = null;
      for (const quality of COMPRESS_QUALITY_STEPS) {
        const candidate = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!candidate) continue;
        blob = candidate;
        if (candidate.size <= COMPRESS_TARGET_BYTES) break;
        if (candidate.size <= COMPRESS_HARD_MAX_BYTES && quality <= COMPRESS_MIN_QUALITY) break;
      }
      if (!blob) return file;

      // Only use the compressed version if it's actually smaller.
      if (file.size && blob.size >= file.size) return file;

      const compressed = new File([blob], file.name.replace(/\.(png|webp|heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      compressed._originalSize = file.size;
      compressed._compressedSize = blob.size;
      return compressed;
    } catch (err) {
      console.warn('Image compression failed, sending original:', err);
      return file;
    }
  }

  // Compresses an array of Files in parallel (bounded concurrency).
  async function compressImages(files, concurrency = 3, onProgress) {
    const results = new Array(files.length);
    let nextIndex = 0;
    let done = 0;

    async function worker() {
      while (true) {
        const i = nextIndex++;
        if (i >= files.length) return;
        results[i] = await compressImage(files[i]);
        done++;
        if (onProgress) onProgress(done, files.length);
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, files.length) }, worker);
    await Promise.all(workers);
    return results;
  }

  // Uploads a single file with XHR so we can track progress. Resolves with
  // { success, response, error }.
  function uploadFile(url, formData, onProgress) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.responseType = 'json';
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(e.loaded, e.total);
        });
      }
      xhr.addEventListener('load', () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        resolve({ success: ok, response: xhr.response, status: xhr.status });
      });
      xhr.addEventListener('error', () => resolve({ success: false, error: 'network' }));
      xhr.addEventListener('abort', () => resolve({ success: false, error: 'aborted' }));
      xhr.send(formData);
    });
  }

  function setupFilePicker(input, drop, preview, maxFiles) {
    const files = [];

    function render() {
      preview.innerHTML = '';
      files.forEach((file, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        img.loading = 'lazy';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-photo';
        remove.setAttribute('aria-label', 'Remove photo');
        remove.innerHTML = '&times;';
        remove.addEventListener('click', () => {
          URL.revokeObjectURL(img.src);
          files.splice(idx, 1);
          render();
        });
        thumb.appendChild(img);
        thumb.appendChild(remove);
        preview.appendChild(thumb);
      });
    }

    function add(newFiles) {
      const available = maxFiles - files.length;
      if (available <= 0) return;
      const toAdd = Array.from(newFiles).slice(0, available);
      files.push(...toAdd);
      render();
    }

    input.addEventListener('change', () => {
      if (input.files && input.files.length) {
        add(input.files);
        input.value = '';
      }
    });

    ['dragenter', 'dragover'].forEach(evt => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.remove('drag-over');
      });
    });

    drop.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        add(e.dataTransfer.files);
      }
    });

    return {
      getFiles: () => files,
      clear: () => {
        preview.querySelectorAll('img').forEach(img => {
          if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        });
        files.length = 0;
        render();
      }
    };
  }

  // Tribute form
  if (tributeForm) {
    const nameInput = tributeForm.name;
    const emailInput = tributeForm.email;
    const phoneInput = tributeForm.phone;
    const relationshipInput = tributeForm.relationship;
    const messageInput = tributeForm.message;
    const charCount = tributeForm.querySelector('.char-count');
    const tributePhotos = document.getElementById('tributePhotos');
    const tributeFileDrop = document.getElementById('tributeFileDrop');
    const tributePhotoPreview = document.getElementById('tributePhotoPreview');
    const tributePhotoPicker = tributePhotos && tributeFileDrop
      ? setupFilePicker(tributePhotos, tributeFileDrop, tributePhotoPreview, 3)
      : null;

    function setError(field, message) {
      const wrapper = field.closest('.form-field');
      const errorEl = wrapper.querySelector('.field-error');
      if (message) {
        wrapper.classList.add('has-error');
        errorEl.textContent = message;
      } else {
        wrapper.classList.remove('has-error');
        errorEl.textContent = '';
      }
    }

    function clearErrors() {
      tributeForm.querySelectorAll('.form-field').forEach(el => el.classList.remove('has-error'));
      tributeForm.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    }

    function validateEmail(value) {
      if (!value) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validate() {
      clearErrors();
      let isValid = true;

      if (!nameInput.value.trim()) {
        setError(nameInput, 'Please enter your name.');
        isValid = false;
      }

      if (emailInput.value.trim() && !validateEmail(emailInput.value.trim())) {
        setError(emailInput, 'Please enter a valid email address.');
        isValid = false;
      }

      if (!messageInput.value.trim()) {
        setError(messageInput, 'Please write your tribute.');
        isValid = false;
      } else if (messageInput.value.trim().length < 5) {
        setError(messageInput, 'Your tribute is a little short. Please write at least a few words.');
        isValid = false;
      }

      return isValid;
    }

    function updateCharCount() {
      if (!charCount) return;
      const len = messageInput.value.length;
      charCount.textContent = `${len} / ${messageInput.maxLength}`;
      charCount.classList.toggle('near-limit', len > messageInput.maxLength * 0.9);
    }

    messageInput.addEventListener('input', updateCharCount);
    updateCharCount();

    tributeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate()) return;

      tributeSubmit.disabled = true;
      tributeSubmit.querySelector('.btn-text').textContent = 'Sending...';
      formStatus.textContent = '';
      formStatus.className = 'form-status';

      const rawPhotos = tributePhotoPicker ? tributePhotoPicker.getFiles() : [];
      let photos = rawPhotos;
      if (rawPhotos.length > 0) {
        tributeSubmit.querySelector('.btn-text').textContent = 'Optimising photos...';
        try {
          photos = await compressImages(rawPhotos, 3, (done, total) => {
            tributeSubmit.querySelector('.btn-text').textContent = `Optimising photos (${done}/${total})...`;
          });
        } catch (err) {
          console.warn('Compression skipped:', err);
          photos = rawPhotos;
        }
      }

      const formData = new FormData(tributeForm);
      formData.delete('photos');
      photos.forEach(file => formData.append('photos', file));

      tributeSubmit.querySelector('.btn-text').textContent = 'Sending tribute...';

      try {
        const result = await uploadFile('/api/tribute', formData, (loaded, total) => {
          if (total > 0) {
            const pct = Math.round((loaded / total) * 100);
            tributeSubmit.querySelector('.btn-text').textContent = `Sending... ${pct}%`;
          }
        });

        const resp = result.response;

        if (result.success && resp && resp.success) {
          tributeForm.hidden = true;
          tributeSuccess.hidden = false;
          if (successName) successName.textContent = nameInput.value.trim();
          tributeForm.reset();
          updateCharCount();
          if (tributePhotoPicker) tributePhotoPicker.clear();
          tributeSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          formStatus.textContent = (resp && resp.error) || 'Something went wrong. Please try again.';
          formStatus.className = 'form-status error';
        }
      } catch (err) {
        console.error('Tribute submit error:', err);
        formStatus.textContent = 'Could not connect. Please try again later.';
        formStatus.className = 'form-status error';
      } finally {
        tributeSubmit.disabled = false;
        tributeSubmit.querySelector('.btn-text').textContent = 'Send tribute';
      }
    });

    if (writeAnother) {
      writeAnother.addEventListener('click', () => {
        tributeSuccess.hidden = true;
        tributeForm.hidden = false;
        clearErrors();
        formStatus.textContent = '';
        formStatus.className = 'form-status';
        if (tributePhotoPicker) tributePhotoPicker.clear();
        tributeForm.reset();
        updateCharCount();
        nameInput.focus();
      });
    }
  }

  // Photo upload section
  const photoUploadForm = document.getElementById('photoUploadForm');
  if (photoUploadForm) {
    const photoUploadInput = document.getElementById('photoUploadInput');
    const photoFileDrop = document.getElementById('photoFileDrop');
    const photoUploadPreview = document.getElementById('photoUploadPreview');
    const photoUploadStatus = document.getElementById('photoUploadStatus');
    const photoUploadSubmit = document.getElementById('photoUploadSubmit');
    const photoUploadSuccess = document.getElementById('photoUploadSuccess');
    const uploadMorePhotos = document.getElementById('uploadMorePhotos');
    const photoUploadPicker = setupFilePicker(photoUploadInput, photoFileDrop, photoUploadPreview, 5);

    function setPhotoError(message) {
      const wrapper = photoUploadInput.closest('.form-field');
      const errorEl = wrapper.querySelector('.field-error');
      if (message) {
        wrapper.classList.add('has-error');
        errorEl.textContent = message;
      } else {
        wrapper.classList.remove('has-error');
        errorEl.textContent = '';
      }
    }

    function clearPhotoErrors() {
      photoUploadForm.querySelectorAll('.form-field').forEach(el => el.classList.remove('has-error'));
      photoUploadForm.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    }

    photoUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearPhotoErrors();
      photoUploadStatus.textContent = '';
      photoUploadStatus.className = 'form-status';

      const rawFiles = photoUploadPicker.getFiles();
      if (rawFiles.length === 0) {
        setPhotoError('Please select at least one photo.');
        return;
      }

      photoUploadSubmit.disabled = true;
      photoUploadSubmit.querySelector('.btn-text').textContent = 'Optimising photos...';

      let files = rawFiles;
      try {
        files = await compressImages(rawFiles, 3, (done, total) => {
          photoUploadSubmit.querySelector('.btn-text').textContent = `Optimising (${done}/${total})...`;
        });
      } catch (err) {
        console.warn('Compression skipped:', err);
        files = rawFiles;
      }

      const formData = new FormData(photoUploadForm);
      formData.delete('photos');
      files.forEach(file => formData.append('photos', file));

      photoUploadSubmit.querySelector('.btn-text').textContent = 'Uploading...';

      try {
        const result = await uploadFile('/api/upload-photos', formData, (loaded, total) => {
          if (total > 0) {
            const pct = Math.round((loaded / total) * 100);
            photoUploadSubmit.querySelector('.btn-text').textContent = `Uploading... ${pct}%`;
          }
        });

        const resp = result.response;

        if (result.success && resp && resp.success) {
          photoUploadForm.hidden = true;
          photoUploadSuccess.hidden = false;
          photoUploadForm.reset();
          photoUploadPicker.clear();
          loadSubmittedPhotos();
          photoUploadSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          photoUploadStatus.textContent = (resp && resp.error) || 'Something went wrong. Please try again.';
          photoUploadStatus.className = 'form-status error';
        }
      } catch (err) {
        console.error('Photo upload error:', err);
        photoUploadStatus.textContent = 'Could not connect. Please try again later.';
        photoUploadStatus.className = 'form-status error';
      } finally {
        photoUploadSubmit.disabled = false;
        photoUploadSubmit.querySelector('.btn-text').textContent = 'Upload photos';
      }
    });

    if (uploadMorePhotos) {
      uploadMorePhotos.addEventListener('click', () => {
        photoUploadSuccess.hidden = true;
        photoUploadForm.hidden = false;
        clearPhotoErrors();
        photoUploadStatus.textContent = '';
        photoUploadStatus.className = 'form-status';
        photoUploadPicker.clear();
        photoUploadForm.reset();
        photoUploadInput.focus();
      });
    }

    async function loadSubmittedPhotos() {
      const grid = document.getElementById('photoGrid');
      const section = document.getElementById('submittedPhotos');
      if (!grid || !section) return;

      try {
        const res = await fetch('/api/photos');
        if (!res.ok) return;
        const photos = await res.json();

        if (photos.length === 0) {
          section.hidden = true;
          return;
        }

        section.hidden = false;
        grid.innerHTML = '';

        photos.forEach(photo => {
          const figure = document.createElement('figure');
          const img = document.createElement('img');
          img.src = photo.url;
          img.alt = photo.caption || 'Shared photo';
          img.loading = 'lazy';
          img.decoding = 'async';
          figure.appendChild(img);

          const caption = [photo.uploader_name, photo.relationship, photo.caption]
            .filter(Boolean)
            .join(' · ');
          if (caption) {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = caption;
            figure.appendChild(figcaption);
          }

          grid.appendChild(figure);
        });
      } catch (err) {
        console.error('Failed to load photos:', err);
      }
    }

    loadSubmittedPhotos();
  }

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (!el) return;

      const text = el.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => (btn.textContent = original), 1500);
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    });
  });

  // Photo lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxCounter = document.getElementById('lightboxCounter');

  // Track the gallery the user opened and the active index so arrow keys
  // and the on-screen buttons can move between photos.
  let lightboxGallery = null;
  let lightboxIndex = -1;

  function lightboxFigures() {
    if (!lightboxGallery) return [];
    return Array.from(lightboxGallery.querySelectorAll('figure')).filter(fig => {
      const img = fig.querySelector('img');
      return img && img.src;
    });
  }

  function showLightboxAt(index) {
    const figures = lightboxFigures();
    if (!figures.length) return;
    const clamped = ((index % figures.length) + figures.length) % figures.length;
    const figure = figures[clamped];
    const img = figure.querySelector('img');
    if (!img) return;
    const figcaption = figure.querySelector('figcaption');
    const caption = figcaption ? figcaption.textContent : img.alt;
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt || '';
    lightboxCaption.textContent = caption || '';
    lightboxIndex = clamped;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${clamped + 1} / ${figures.length}`;
      lightboxCounter.hidden = figures.length <= 1;
    }
    if (lightboxPrev) lightboxPrev.hidden = figures.length <= 1;
    if (lightboxNext) lightboxNext.hidden = figures.length <= 1;
  }

  function openLightbox(grid, index) {
    if (!lightbox || !lightboxImage) return;
    lightboxGallery = grid;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    showLightboxAt(index);
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightboxImage.src = '';
    lightboxGallery = null;
    lightboxIndex = -1;
    document.body.style.overflow = '';
  }

  function lightboxStep(delta) {
    if (lightboxIndex < 0) return;
    showLightboxAt(lightboxIndex + delta);
  }

  document.querySelectorAll('.photo-grid, .photo-grid-live').forEach(grid => {
    grid.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      const figure = e.target.closest('figure');
      if (!figure) return;
      const img = figure.querySelector('img');
      if (!img) return;
      const figures = Array.from(grid.querySelectorAll('figure')).filter(fig => {
        const i = fig.querySelector('img');
        return i && i.src;
      });
      const index = figures.indexOf(figure);
      if (index < 0) return;
      openLightbox(grid, index);
    });
  });

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightboxClose) closeLightbox();
    });
  }

  if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    lightboxStep(-1);
  });
  if (lightboxNext) lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    lightboxStep(1);
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') lightboxStep(-1);
    else if (e.key === 'ArrowRight') lightboxStep(1);
  });

  // Scroll reveal / text animations
  function initReveal() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const textSelectors = '.section-eyebrow, .section-title, .prayer-text, .hero-eyebrow, .hero-title, .hero-subtitle, .hero-verse, .tribute-intro, .attire-note, .memories-note, .wear-note, .qr p';
    const revealSelectors = '.date-card, .event, .venue-card, .swatch, .photo, .download-card, .qr-image, .btn, .btn-outline, .btn-small, .tribute-form label, .tribute-form input, .tribute-form textarea';

    document.querySelectorAll(textSelectors).forEach(el => el.classList.add('text-reveal'));
    document.querySelectorAll(revealSelectors).forEach(el => el.classList.add('reveal'));

    const groups = document.querySelectorAll('.hero-content, .section');
    groups.forEach(group => {
      group.querySelectorAll('.reveal, .text-reveal, .reveal-left, .reveal-right').forEach((el, i) => {
        el.style.setProperty('--reveal-index', i);
      });
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.reveal, .text-reveal, .reveal-left, .reveal-right').forEach(el => {
            el.classList.add('is-visible');
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    groups.forEach(group => revealObserver.observe(group));
  }

  initReveal();
});
