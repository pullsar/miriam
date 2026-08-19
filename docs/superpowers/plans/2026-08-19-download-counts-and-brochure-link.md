# Memorial Download Counts and Brochure Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count deliberate memorial brochure and mobile Order of Mass link activations, show compact number-only badges beside the existing download links, and replace the hero’s programme CTA with a direct memorial brochure download.

**Architecture:** Express will preserve and verify the two stable PDF URLs, while an anonymous POST endpoint records deliberate link activations in a dedicated SQLite counter. A read-only JSON endpoint will expose both totals. The existing single-page client will fetch those totals, reveal synchronized badges, optimistically update them when a tracked link is clicked, and record the activation without delaying the PDF; static assets and all existing programme navigation remain unchanged.

**Tech Stack:** Node.js, Express 5, better-sqlite3, vanilla JavaScript, HTML/CSS, Node’s built-in test runner.

---

### Task 1: Server-side download counters

**Files:**
- Create: `tests/download-counts.test.js`
- Modify: `server.js`

- [ ] **Step 1: Write the failing HTTP tests**

Create a temporary downloads directory and database before requiring `server.js`. Write small PDF fixtures using `Buffer.from('%PDF-1.4\n%%EOF')`, start the server on port `0`, and assert that:

```js
assert.deepEqual(await counts(), { brochure: 0, orderOfMass: 0 });
assert.equal((await fetch(`${baseUrl}${BROCHURE_PATH}`)).status, 200);
assert.deepEqual(await counts(), { brochure: 1, orderOfMass: 0 });
assert.equal((await fetch(`${baseUrl}${READINGS_PATH}`)).status, 200);
assert.deepEqual(await counts(), { brochure: 1, orderOfMass: 1 });
fs.unlinkSync(path.join(downloadsDir, READINGS_FILE));
assert.equal((await fetch(`${baseUrl}${READINGS_PATH}`)).status, 404);
assert.deepEqual(await counts(), { brochure: 1, orderOfMass: 1 });
```

Use `t.after()` to close the server, delete the temporary directory, and close the exported database.

- [ ] **Step 2: Run the HTTP tests and confirm the red state**

Run: `node --test tests/download-counts.test.js`

Expected: FAIL because `/api/download-counts` and tracked download handlers do not exist.

- [ ] **Step 3: Add the SQLite table, prepared statements and tracked routes**

In `server.js`, derive `downloadsDir` from `process.env.DOWNLOADS_DIR` with `public/downloads` as the default. Create:

```sql
CREATE TABLE IF NOT EXISTS download_click_counts (
  resource TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
)
```

Define exact route metadata for `brochure` and `order-of-mass`. Keep both `app.get()` download routes before `express.static()`, and add `POST /api/download-counts/:resource`. The POST checks that the resource and file exist, then executes:

```sql
INSERT INTO download_click_counts (resource, count) VALUES (?, 1)
ON CONFLICT(resource) DO UPDATE SET count = count + 1
```

Add `GET /api/download-counts`, map missing rows to zero, and return exactly:

```js
{ brochure: totals.brochure || 0, orderOfMass: totals['order-of-mass'] || 0 }
```

Export `db` with `app` and `startServer` for deterministic test cleanup.

- [ ] **Step 4: Run the HTTP tests and confirm the green state**

Run: `node --test tests/download-counts.test.js`

Expected: all counter, independence, serving, and missing-file assertions PASS.

- [ ] **Step 5: Commit the server slice**

```bash
git add server.js tests/download-counts.test.js
git commit -m "feat: track memorial PDF downloads"
```

### Task 2: Number-only badges and brochure CTA

**Files:**
- Modify: `tests/download-entry.test.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/style.css`

- [ ] **Step 1: Extend the static-entry tests**

Assert that the hero outline CTA reads `Memorial Brochure`, points directly to the brochure PDF, and has `download` plus `data-download-resource="brochure"`. Assert that the two preloader and two resource-card links have their matching `data-download-resource` values, and that four hidden badge elements exist:

```html
<span class="download-count" data-download-count="brochure" hidden></span>
<span class="download-count" data-download-count="order-of-mass" hidden></span>
```

Assert `public/app.js` fetches `/api/download-counts`, uses `Intl.NumberFormat`, removes `hidden` after a successful response, POSTs each clicked resource with `keepalive`, and updates every matching badge. Assert the CSS contains a compact `.download-count` pill and a `[hidden]` rule.

- [ ] **Step 2: Run the entry tests and confirm the red state**

Run: `node --test tests/download-entry.test.js`

Expected: FAIL because the CTA, tracking attributes, badges, client loader and badge styling are absent.

- [ ] **Step 3: Add semantic tracking hooks and badges to the HTML**

Add `data-download-resource="brochure"` or `data-download-resource="order-of-mass"` to both appearances of the PDF links. Insert a hidden `.download-count` span in each of those four links. Change only the hero’s second CTA to:

```html
<a class="btn-hero btn-hero-outline" href="/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf" download data-download-resource="brochure">Memorial Brochure</a>
```

Keep the `#programme` section and main navigation link intact.

- [ ] **Step 4: Implement synchronized client-side totals**

Inside the existing `DOMContentLoaded` callback, define resource labels, format counts with `Intl.NumberFormat`, and update all matching badge nodes. Fetch `/api/download-counts`; on success reveal the four badges and set their values. On failure, leave them hidden and do not block the links. Add a click listener to all `[data-download-resource]` links that POSTs the anonymous activation with `keepalive` and increments the currently displayed total for every badge of that resource.

- [ ] **Step 5: Style subtle number-only bubbles**

Make tracked links `position: relative`. Add a small, high-contrast gold/navy `.download-count` pill positioned at the upper-right of both preloader links and resource cards, and explicitly preserve `[hidden] { display: none; }`. Override the broad `.download-card span` typography so the badge is not underlined or rendered as metadata.

- [ ] **Step 6: Run the entry tests and confirm the green state**

Run: `node --test tests/download-entry.test.js`

Expected: all PDF, link-count, CTA, tracking-hook, progressive-enhancement and entrance-control assertions PASS.

- [ ] **Step 7: Commit the client slice**

```bash
git add public/index.html public/app.js public/style.css tests/download-entry.test.js
git commit -m "feat: show memorial download totals"
```

### Task 3: Full verification and deployment

**Files:**
- Verify: `server.js`
- Verify: `public/index.html`
- Verify: `public/app.js`
- Verify: `public/style.css`

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test tests/*.test.js`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the site locally and verify behavior**

Start with a temporary `DB_PATH`, visit the local site, and confirm the two badges load as `0`, the hero CTA downloads the brochure, each PDF download increments only its own total, and the programme navigation still scrolls to `#programme`.

- [ ] **Step 3: Inspect mobile and desktop rendering**

Check the entrance resource links, hero CTA, and Digital Memorial Resources section at mobile and desktop widths. Confirm bubbles contain only a number, remain legible, do not cover titles, and stay hidden when `/api/download-counts` is unavailable.

- [ ] **Step 4: Commit any verification fixes and push**

```bash
git status --short
git push origin HEAD:main
```

Expected: the deployment branch is pushed to `origin/main` without unrelated file changes.

- [ ] **Step 5: Verify production**

Confirm `https://miriamngo.com/api/download-counts` returns both numeric keys, both stable PDF URLs still respond with PDFs, the live hero says `Memorial Brochure`, and downloading each resource increases the corresponding production count.
