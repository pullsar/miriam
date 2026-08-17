# Entrance Download Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add elegant brochure and mobile-reading downloads to the memorial entrance screen without entering the site or starting music.

**Architecture:** Publish the two approved PDFs as static files under `public/downloads`, render the same stable links in the entrance overlay and the existing downloads section, and stop download-control events before they reach the overlay's entrance handler. Keep all changes within the existing HTML, CSS, and browser JavaScript structure.

**Tech Stack:** Express static hosting, semantic HTML, CSS, vanilla browser JavaScript, Node.js built-in test runner.

---

### Task 1: Lock the public download contract with tests

**Files:**
- Create: `tests/download-entry.test.js`

- [ ] **Step 1: Write the failing contract tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('approved memorial PDFs are publicly downloadable', () => {
  const brochure = path.join(root, 'public/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf');
  const readings = path.join(root, 'public/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf');
  assert.ok(fs.statSync(brochure).size > 10_000_000);
  assert.ok(fs.statSync(readings).size > 400_000);
  assert.equal(fs.readFileSync(brochure, { encoding: 'ascii', flag: 'r' }).slice(0, 4), '%PDF');
  assert.equal(fs.readFileSync(readings, { encoding: 'ascii', flag: 'r' }).slice(0, 4), '%PDF');
});

test('entrance and in-site sections expose both stable download links', () => {
  const html = read('public/index.html');
  for (const href of [
    '/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf',
    '/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf',
  ]) {
    assert.equal(html.split(`href="${href}"`).length - 1, 2);
  }
  assert.match(html, /id="preloaderDownloads"/);
});

test('download controls cannot trigger the entrance interaction', () => {
  const script = read('public/app.js');
  assert.match(script, /preloaderDownloads\.addEventListener\('click',[\s\S]*?stopPropagation\(\)/);
  assert.match(script, /preloaderDownloads\.addEventListener\('keydown',[\s\S]*?stopPropagation\(\)/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/download-entry.test.js`

Expected: failures for missing public PDFs, missing entrance links, and missing propagation guards.

### Task 2: Publish the approved PDF assets

**Files:**
- Create: `public/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf`
- Create: `public/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf`

- [ ] **Step 1: Copy the verified PDFs using stable public names**

```powershell
Copy-Item -LiteralPath 'output/brochure/prof-miriam-ngozi-mgbakor-memorial-book-personal-edition.pdf' -Destination 'public/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf'
Copy-Item -LiteralPath 'output/brochure/prof-miriam-ngozi-mgbakor-mobile-order-of-mass.pdf' -Destination 'public/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf'
```

- [ ] **Step 2: Verify byte-for-byte source parity**

Run: `Get-FileHash output/brochure/*.pdf, public/downloads/prof-miriam-*.pdf -Algorithm SHA256`

Expected: each public file has the same SHA-256 value as its corresponding approved source PDF.

### Task 3: Add the entrance and permanent download markup

**Files:**
- Modify: `public/index.html:14-32`
- Modify: `public/index.html:392-410`

- [ ] **Step 1: Add the restrained entrance download group**

Insert before `.preloader-loading`:

```html
<div class="preloader-downloads" id="preloaderDownloads" aria-label="Memorial resources">
  <p class="preloader-downloads-label">Memorial resources</p>
  <div class="preloader-download-actions">
    <a class="preloader-download" href="/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf" download aria-label="Download the full memorial brochure as a PDF">
      <span class="preloader-download-title">Full Memorial Brochure</span>
      <span class="preloader-download-meta">PDF · 11.9 MB</span>
    </a>
    <a class="preloader-download" href="/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf" download aria-label="Download the mobile readings and Order of Mass as a PDF">
      <span class="preloader-download-title">Mobile Readings &amp; Order of Mass</span>
      <span class="preloader-download-meta">PDF · 0.5 MB</span>
    </a>
  </div>
</div>
```

- [ ] **Step 2: Replace the outdated in-site brochure card and retain the QR card**

Use two memorial-resource cards with the same stable PDF links, followed by the existing website QR-code card. Use the visible titles **Full Memorial Brochure** and **Mobile Readings & Order of Mass**.

### Task 4: Protect download interaction and add classy responsive styling

**Files:**
- Modify: `public/app.js:14-95`
- Modify: `public/style.css:1113-1350`

- [ ] **Step 1: Stop entrance activation from the download controls**

```js
const preloaderDownloads = document.getElementById('preloaderDownloads');

if (preloaderDownloads) {
  preloaderDownloads.addEventListener('click', event => event.stopPropagation());
  preloaderDownloads.addEventListener('keydown', event => event.stopPropagation());
}
```

- [ ] **Step 2: Add the entrance download styles**

Implement a centered label and two translucent, gold-bordered actions with white titles and muted cream metadata. Use a maximum combined width of `620px`, a minimum touch height of `58px`, subtle hover elevation, and a visible gold focus outline. Stack the actions at `max-width: 640px` and reduce envelope spacing at phone height breakpoints so all controls remain visible without clipping.

- [ ] **Step 3: Hide the resource group only while entrance loading is active**

Extend the loading selector so `.preloader-downloads` disappears alongside the hint and entrance CTA after a visitor chooses to enter.

### Task 5: Verify behavior and presentation

**Files:**
- Test: `tests/download-entry.test.js`

- [ ] **Step 1: Run the focused tests**

Run: `node --test tests/download-entry.test.js`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 2: Run the existing project checks**

Run: `node test.js`

Expected: the server/API smoke checks complete without regression.

- [ ] **Step 3: Verify the static HTTP responses**

Start `node server.js`, then request `/`, `/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf`, and `/downloads/prof-miriam-ngozi-mgbakor-mobile-readings.pdf`.

Expected: all return HTTP 200 and both PDF responses use `application/pdf`.

- [ ] **Step 4: Review the entrance visually at desktop and mobile sizes**

Check that the entrance remains uncluttered, neither title wraps awkwardly, keyboard focus is visible, the controls fit at 390×844, and activating a download leaves the overlay visible without playing music.
