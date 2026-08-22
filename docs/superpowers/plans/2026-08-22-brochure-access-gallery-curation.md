# Brochure Access and Gallery Curation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the brochure in the hero, use concise active download copy, and hide four reviewed uploads from the public gallery.

**Architecture:** Reuse the existing direct PDF link, download-count hook and gallery exclusion set. Add no new endpoint or component; the change remains within the current semantic HTML, responsive CSS and client-side curation flow.

**Tech Stack:** Semantic HTML, CSS, vanilla JavaScript, Node.js built-in test runner.

---

### Task 1: Hero brochure access and direct copy

**Files:**
- Modify: `tests/download-entry.test.js`
- Modify: `tests/permanent-memorial.test.js`
- Modify: `public/index.html`
- Modify: `public/memorial.css`

- [ ] **Step 1: Write the failing interface tests**

Require a hero link labelled `Download Brochure`, two tracked brochure links in total, the text `Brochure & Readings`, the sentence `Download the memorial brochure or the bilingual Order of Mass.`, and a phone rule that lets the third hero action span both columns.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/download-entry.test.js tests/permanent-memorial.test.js`

Expected: FAIL because the hero lacks the download link and the resource section still uses `Her story, preserved`.

- [ ] **Step 3: Implement the hero link and direct resource copy**

Add the existing brochure URL to the hero with `download` and `data-download-resource="brochure"`. Add a `hero-download` class and, under 480 pixels, apply `grid-column: 1 / -1`. Replace the resource kicker, heading and sentence with the approved direct copy.

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/download-entry.test.js tests/permanent-memorial.test.js`

Expected: PASS.

### Task 2: Reviewed gallery exclusions

**Files:**
- Modify: `tests/memorial-interactions.test.js`
- Modify: `public/app.js`

- [ ] **Step 1: Write the failing curation test**

Require the reviewed exclusion set to contain IDs `51`, `52`, `53` and `69`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/memorial-interactions.test.js`

Expected: FAIL because those four IDs remain public.

- [ ] **Step 3: Add the four IDs to the exclusion set**

Extend `EXCLUDED_GALLERY_PHOTO_IDS` with `51, 52, 53, 69`; do not alter stored uploads or the API.

- [ ] **Step 4: Run focused and complete verification**

Run:

```powershell
node --test tests/memorial-interactions.test.js
node --test tests/*.test.js
git diff --check
```

Expected: all tests pass and no whitespace errors are reported.

### Task 3: Publish and verify

**Files:**
- Modify: `public/index.html` only if the deployment asset revision must change.

- [ ] **Step 1: Commit and push the verified revision**

Commit the implementation and tests, push `HEAD` to `origin/main`, and wait for the `Deploy to miriamngo.com` workflow to succeed.

- [ ] **Step 2: Verify production**

Confirm the hero brochure link downloads the PDF, the resource copy is direct, IDs 51, 52, 53 and 69 are absent from the public gallery, and the page has no broken images or horizontal overflow.
