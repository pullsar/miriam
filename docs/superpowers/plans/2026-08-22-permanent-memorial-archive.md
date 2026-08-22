# Permanent Memorial Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the concluded funeral-event homepage with a permanent, ceremonial memorial centred on Professor Miriam Ngozi Mgbakor’s biography, 149 tributes, 60 photographs and continuing memory submissions.

**Architecture:** Keep Express and SQLite as the source of public memorial content, but expose privacy-safe tribute fields only. Add a small browser/Node-compatible utility module for deterministic name, category and tribute-layout rules, and a separate archive controller for tribute/gallery rendering. Preserve the proven upload forms, lightbox and PDF counters while replacing visible event content and styling the new hierarchy through a dedicated memorial stylesheet.

**Tech Stack:** Node.js, Express 5, better-sqlite3, vanilla HTML/CSS/JavaScript, Node’s built-in test runner.

---

### Task 1: Privacy-safe public tribute API

**Files:**
- Create: `tests/public-tributes-api.test.js`
- Modify: `server.js`

- [ ] **Step 1: Write the failing API privacy test**

Create a temporary `DB_PATH`, require `server.js`, insert one tribute directly through the exported database, and start `app` on port `0`. Fetch `/api/tributes` and assert the exact response object:

```js
assert.deepEqual(body[0], {
  id: Number(insert.lastInsertRowid),
  name: 'DR. TEST CONTRIBUTOR',
  relationship: 'Friend',
  message: 'A private-contact regression tribute.',
  created_at: body[0].created_at
});
assert.equal('email' in body[0], false);
assert.equal('phone' in body[0], false);
```

Close the HTTP server and database and remove the temporary directory through `t.after()`.

- [ ] **Step 2: Run the privacy test and confirm the red state**

Run: `node --test tests/public-tributes-api.test.js`

Expected: FAIL because the endpoint currently serialises `email` and `phone`.

- [ ] **Step 3: Select only public tribute columns**

Replace the public query with:

```sql
SELECT id, name, relationship, message, created_at
FROM tributes
ORDER BY created_at DESC, id DESC
```

Keep submission storage and notification emails unchanged.

- [ ] **Step 4: Run the privacy test and confirm the green state**

Run: `node --test tests/public-tributes-api.test.js`

Expected: PASS with no contributor contact fields in the response.

- [ ] **Step 5: Commit the privacy slice**

```bash
git add server.js tests/public-tributes-api.test.js
git commit -m "fix: protect memorial contributor contact details"
```

### Task 2: Memorial content rules

**Files:**
- Create: `public/memorial-utils.js`
- Create: `tests/memorial-utils.test.js`

- [ ] **Step 1: Write failing utility tests**

Test these exported functions:

```js
const {
  formatContributorName,
  normaliseTributeCategory,
  classifyTribute,
  filterTributes,
  uniquePhotos
} = require('../public/memorial-utils');

assert.equal(formatContributorName('CALLISTA NGOZIKA UMEH'), 'Callista Ngozika Umeh');
assert.equal(formatContributorName('Fr. Austin NWOSU, C.S.Sp.'), 'Fr. Austin Nwosu, C.S.Sp.');
assert.equal(formatContributorName('PROF. NGOZI OF ESUT'), 'Prof. Ngozi of ESUT');
assert.equal(normaliseTributeCategory('Church member'), 'Church & Community');
assert.equal(normaliseTributeCategory('Guestbook tribute'), 'Other Memories');
assert.equal(classifyTribute('x'.repeat(1900)), 'feature');
assert.equal(classifyTribute('x'.repeat(800)), 'standard');
assert.equal(classifyTribute('x'.repeat(200)), 'compact');
assert.equal(filterTributes(sample, 'Friends', 'ada').length, 1);
assert.equal(uniquePhotos([{ url: '/a.jpg' }, { url: '/a.jpg' }, { url: '/b.jpg' }]).length, 2);
```

- [ ] **Step 2: Run the utility tests and confirm the red state**

Run: `node --test tests/memorial-utils.test.js`

Expected: FAIL because `public/memorial-utils.js` does not exist.

- [ ] **Step 3: Implement a browser/Node-compatible utility module**

Use a small UMD wrapper that assigns the API to `window.MemorialUtils` in the browser and `module.exports` in Node. Implement:

```js
function normaliseTributeCategory(value = '') {
  const key = value.trim().toLowerCase();
  if (key === 'family') return 'Family';
  if (key === 'friend') return 'Friends';
  if (key === 'student') return 'Students';
  if (key === 'colleague') return 'Colleagues';
  if (key === 'church member') return 'Church & Community';
  return 'Other Memories';
}

function classifyTribute(message = '') {
  if (message.length >= 1800) return 'feature';
  if (message.length >= 550) return 'standard';
  return 'compact';
}
```

Implement name formatting with a protected-token map for titles, suffixes, `ESUT`, conjunctions and prepositions. Implement case-insensitive name search without modifying tribute text. Implement photo deduplication by normalised URL.

- [ ] **Step 4: Run the utility tests and confirm the green state**

Run: `node --test tests/memorial-utils.test.js`

Expected: all name, category, layout, filter and deduplication assertions PASS.

- [ ] **Step 5: Commit the content-rule slice**

```bash
git add public/memorial-utils.js tests/memorial-utils.test.js
git commit -m "feat: add memorial archive content rules"
```

### Task 3: Permanent memorial page structure

**Files:**
- Create: `tests/permanent-memorial.test.js`
- Create: `public/images/miriam-academic-regalia.jpg`
- Create: `public/images/miriam-younger-years.jpg`
- Modify: `public/index.html`

- [ ] **Step 1: Write failing structural tests**

Assert the HTML:

```js
for (const absent of ['id="preloader"', 'id="programme"', 'id="venues"', 'id="attire"', 'id="qr"']) {
  assert.equal(html.includes(absent), false);
}
for (const present of ['id="life"', 'id="tributeArchive"', 'id="gallery"', 'id="shareMemory"', 'id="downloads"']) {
  assert.equal(html.includes(present), true);
}
assert.match(html, /Professor Miriam Ngozi Mgbakor/);
assert.match(html, /1960[—–-]2026/);
assert.match(html, /href="#tributeArchive">Read Her Tributes/);
assert.match(html, /href="#gallery">View Her Gallery/);
assert.match(html, /src="\/audio\/o-lord-my-god-how-great\.mp3"/);
assert.match(html, /\/images\/miriam-younger-years\.jpg/);
assert.doesNotMatch(html, /soon-ah-will-be-done|Programme of events|What to wear|Open in Google Maps/);
```

Also assert the biography contains the verified phrases `21 November 1960`, `Abidjan, Côte d’Ivoire`, `Haifa, Israel`, `31 January 2008`, and `1 October 2023`.

- [ ] **Step 2: Run the structural tests and confirm the red state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: FAIL because the invitation hierarchy and event sections still exist.

- [ ] **Step 3: Prepare the two memorial portraits**

Use Sharp to create optimised, colour-managed JPEGs from the user-approved sources:

```powershell
node -e "const sharp=require('sharp'); Promise.all([sharp('C:/Users/Son/Downloads/Miriam/ChatGPT Image Aug 15, 2026, 11_45_28 PM (3).png').rotate().resize({width:1800,withoutEnlargement:true}).jpeg({quality:88,mozjpeg:true}).toFile('public/images/miriam-academic-regalia.jpg'),sharp('C:/Users/Son/Downloads/Miriam/younger/ChatGPT Image Aug 12, 2026, 02_12_36 PM.png').rotate().resize({width:1400,withoutEnlargement:true}).jpeg({quality:88,mozjpeg:true}).toFile('public/images/miriam-younger-years.jpg')]).catch(error=>{console.error(error);process.exit(1)})"
```

Verify both files begin with a JPEG signature and are each smaller than their source PNG while remaining at least 1200 pixels wide.

- [ ] **Step 4: Replace the visible information architecture**

Remove the entrance overlay, programme, venue, attire and QR sections. Rebuild the navigation and hero with permanent memorial language. Include the two verified biography panels using the approved brochure facts:

```html
<section class="memorial-life" id="life">
  <p>Prof. Miriam Ngozi Mgbakor (née Ogbonna) was born on 21 November 1960...</p>
  <p>Her learning crossed borders: a French diploma in Abidjan, Côte d’Ivoire, the MASHAV training program in Haifa, Israel, and a doctorate in Agricultural Economics...</p>
  <p>She joined ESUT on 31 January 2008 and rose to Professor of Agricultural Economics and Extension on 1 October 2023...</p>
</section>
```

Use `/images/miriam-younger-years.jpg` alongside the biography and `/images/miriam-academic-regalia.jpg` as the hero background.

- [ ] **Step 5: Add archive, gallery and contribution landmarks**

Add:

```html
<section id="tributeArchive" aria-labelledby="tributeArchiveTitle">...</section>
<section id="gallery" aria-labelledby="galleryTitle">...</section>
<section id="shareMemory" aria-labelledby="shareMemoryTitle">...</section>
<section id="downloads" aria-labelledby="downloadsTitle">...</section>
```

The tribute section contains `tributeSearch`, `tributeFilters`, `tributeResults`, `tributeGrid`, `tributeLoadMore`, `tributeStatus` and `tributeDialog`. The gallery contains the curated lead images plus `photoGrid`, `photoStatus` and `photoRetry`. Move the existing tribute and photo forms into `shareMemory`, preserving every existing input and status ID. Keep only the two PDF resource cards and their counter spans.

- [ ] **Step 6: Load the new browser modules in dependency order**

Before `app.js`, include:

```html
<script src="/memorial-utils.js"></script>
<script src="/memorial-archive.js"></script>
<script src="/app.js"></script>
```

Load `/memorial.css` after `/style.css` in the document head.

- [ ] **Step 7: Run the structural tests and confirm the green state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: all permanent hierarchy, biography, music and archival-resource assertions PASS.

- [ ] **Step 8: Commit the page-structure slice**

```bash
git add public/index.html public/images/miriam-academic-regalia.jpg public/images/miriam-younger-years.jpg tests/permanent-memorial.test.js
git commit -m "feat: establish permanent memorial homepage"
```

### Task 4: Tribute archive controller

**Files:**
- Create: `public/memorial-archive.js`
- Modify: `tests/permanent-memorial.test.js`

- [ ] **Step 1: Add failing tribute-controller contract tests**

Assert the controller contains:

```js
fetch('/api/tributes')
textContent
data-tribute-id
history.replaceState
navigator.clipboard.writeText
aria-expanded
Load More Tributes
```

Assert it never assigns tribute content through `innerHTML`.

- [ ] **Step 2: Run the controller tests and confirm the red state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: FAIL because `public/memorial-archive.js` does not exist.

- [ ] **Step 3: Implement tribute loading and progressive rendering**

On `DOMContentLoaded`, fetch `/api/tributes`, normalise each category and display name through `MemorialUtils`, and maintain this state:

```js
const tributeState = {
  all: [],
  filtered: [],
  category: 'All',
  query: '',
  visible: 12
};
```

Render filters for All and each approved category with counts. Render 12 contributions initially and add 12 on each load-more activation. Create every contributor name, relationship, excerpt and full paragraph with `createElement()` and `textContent`.

- [ ] **Step 4: Implement feature, standard and compact tribute layouts**

Use `classifyTribute(message)` to apply `tribute-feature`, `tribute-standard` or `tribute-compact`. Feature tributes span the full grid and show more text before the full-reading control. Standard cards span half the desktop grid. Compact cards retain generous padding but use shorter excerpts.

- [ ] **Step 5: Implement full reading and deep links**

Open the selected tribute in the native dialog, splitting submitted line breaks into safe paragraphs. Update the URL to `#tribute-{id}` with `history.replaceState`. Copy the full canonical URL through the share control. On initial load or `hashchange`, open the matching tribute after data arrives. Restore focus to the originating card when the dialog closes.

- [ ] **Step 6: Implement loading, empty and retry states**

On fetch failure, show “The tributes could not be loaded just now” and a retry button. A zero-result search displays “No contributor names match this search.” Neither state hides the biography, gallery, forms or archive links.

- [ ] **Step 7: Run the controller contract tests and confirm the green state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: all tribute loading, safe rendering, progressive display and deep-link contract assertions PASS.

- [ ] **Step 8: Commit the tribute archive slice**

```bash
git add public/memorial-archive.js tests/permanent-memorial.test.js
git commit -m "feat: present the complete tribute archive"
```

### Task 5: Gallery, contribution panels and single-track audio

**Files:**
- Modify: `public/memorial-archive.js`
- Modify: `public/app.js`
- Modify: `tests/permanent-memorial.test.js`

- [ ] **Step 1: Add failing interaction contract tests**

Assert:

```js
assert.match(archive, /fetch\('\/api\/photos'\)/);
assert.match(archive, /uniquePhotos/);
assert.match(archive, /memorial:photos-updated/);
assert.match(app, /o-lord-my-god-how-great\.mp3/);
assert.doesNotMatch(app, /soon-ah-will-be-done|trackIndex|playNextTrack/);
assert.match(app, /aria-expanded/);
```

- [ ] **Step 2: Run the interaction tests and confirm the red state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: FAIL because uploaded-gallery ownership, panel switching and single-track audio are not implemented.

- [ ] **Step 3: Render the uploaded gallery**

Fetch `/api/photos`, combine those records with the curated figures already in HTML, and deduplicate with `uniquePhotos`. Create responsive figures with lazy images, meaningful alt text, uploader/caption metadata and a failure handler that removes only the broken figure. Reuse the existing lightbox container and navigation behavior.

- [ ] **Step 4: Refresh photos after successful submission**

Remove the old nested `loadSubmittedPhotos()` implementation from `app.js`. After a successful photo upload, dispatch:

```js
document.dispatchEvent(new CustomEvent('memorial:photos-updated'));
```

Have `memorial-archive.js` listen for that event and refetch the gallery.

- [ ] **Step 5: Add accessible contribution-panel switching**

Create two controls linked to the existing forms. Set `aria-expanded` and the target panel’s `hidden` attribute so only one form is open. Default both forms to collapsed until a visitor selects “Write a Tribute” or “Share Photographs.” Preserve form IDs, validation and success behavior.

- [ ] **Step 6: Simplify audio to the glory song**

Set the HTML audio source to `/audio/o-lord-my-god-how-great.mp3`. Remove playlist rotation, `trackIndex`, `playNextTrack`, the `ended` listener and every reference to `soon-ah-will-be-done.mp3`. Keep a single play/pause control with the label “Play the Glory Song” / “Pause the Glory Song.”

- [ ] **Step 7: Run the interaction tests and confirm the green state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: all gallery, form-panel and single-track audio assertions PASS.

- [ ] **Step 8: Commit the interaction slice**

```bash
git add public/memorial-archive.js public/app.js tests/permanent-memorial.test.js
git commit -m "feat: add living gallery and memory contributions"
```

### Task 6: Grand ceremonial visual system

**Files:**
- Create: `public/memorial.css`
- Modify: `public/index.html`
- Modify: `tests/permanent-memorial.test.js`

- [ ] **Step 1: Add failing visual-token tests**

Assert the stylesheet contains semantic tokens and component contracts:

```css
--memorial-navy: #101d33;
--memorial-ivory: #fbf7ef;
--memorial-gold: #c7a75a;
--memorial-plum: #5d315f;
--memorial-reading: 'Source Serif 4';
```

Assert it defines `.memorial-hero`, `.memorial-life`, `.tribute-feature`, `.tribute-dialog`, `.gallery-masonry`, `.memory-choice`, responsive breakpoints and `prefers-reduced-motion`.

- [ ] **Step 2: Run the visual-token tests and confirm the red state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: FAIL because `public/memorial.css` does not exist.

- [ ] **Step 3: Implement the foundations and hero**

Add Source Serif 4 to the existing Google Fonts request. Define the approved navy/ivory/gold/plum tokens, focus ring, reading measure and section spacing. Give the hero a strong lower-left content composition on desktop, centred composition on narrow screens, and a contrast-safe multi-stop overlay over the academic portrait.

- [ ] **Step 4: Implement biography and tribute typography**

Style the biography as an editorial image/text spread. Keep long tribute paragraphs at `1.05rem–1.15rem`, line height `1.75`, and a maximum reading width of `72ch`. Feature tributes use gold rules and an ivory surface; standard and compact cards use restrained shadows and border transitions without excessive animation.

- [ ] **Step 5: Implement filters, dialog and gallery**

Make filter controls horizontally scrollable on small screens and clearly selected. Style the full-tribute dialog as a centred reading page with a sticky close/share header. Implement a CSS-column or grid-based masonry composition that preserves natural image proportions and collapses to one column on small phones.

- [ ] **Step 6: Implement contribution panels and archive**

Present the two memory choices as ceremonial bordered panels. Retain clear form labels, error contrast and touch-friendly controls. Restyle the two PDF archive cards as quiet closing resources with the existing number bubbles.

- [ ] **Step 7: Add responsive and reduced-motion rules**

At widths below `760px`, use one-column biography and tribute layouts, readable 16px-or-larger body text, full-width action controls and compact section spacing. Disable nonessential transforms and reveal transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 8: Run the visual-token tests and confirm the green state**

Run: `node --test tests/permanent-memorial.test.js`

Expected: all palette, typography, component and responsive-contract assertions PASS.

- [ ] **Step 9: Commit the ceremonial design slice**

```bash
git add public/memorial.css public/index.html tests/permanent-memorial.test.js
git commit -m "design: create grand ceremonial memorial experience"
```

### Task 7: Full verification and production deployment

**Files:**
- Verify: `server.js`
- Verify: `public/index.html`
- Verify: `public/memorial-utils.js`
- Verify: `public/memorial-archive.js`
- Verify: `public/app.js`
- Verify: `public/memorial.css`

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
node --test tests/*.test.js
node --check server.js
node --check public/memorial-utils.js
node --check public/memorial-archive.js
node --check public/app.js
```

Expected: every test and syntax check exits successfully with zero failures.

- [ ] **Step 2: Audit the built HTML and public API**

Run the site against a temporary database and verify:

- `/api/tributes` contains no `email` or `phone` properties;
- the homepage contains none of the concluded event sections;
- only the glory-song source appears;
- the two stable PDF URLs still respond successfully;
- tribute and photo submission endpoints remain registered.

- [ ] **Step 3: Perform desktop visual QA**

At approximately `1440 × 900`, inspect the hero, biography spread, each tribute format, filter/search controls, full-tribute dialog, gallery/lightbox, contribution forms and archive cards. Correct clipping, weak contrast, inconsistent spacing, line lengths over `75ch` and unbalanced image crops.

- [ ] **Step 4: Perform mobile visual QA**

At approximately `390 × 844`, verify navigation, hero actions, tribute filters, long-form reading, dialog controls, one-column gallery, forms and archive cards without squinting, horizontal overflow or text-over-image contrast failures.

- [ ] **Step 5: Verify production-data scale locally**

Load a privacy-safe capture of the production tribute/photo responses or proxy the read-only endpoints during local QA. Confirm 149 or more tributes can be searched, filtered and progressively revealed, and 60 or more photographs render without duplicate URLs.

- [ ] **Step 6: Commit verification corrections**

```bash
git add public server.js tests
git commit -m "fix: refine permanent memorial presentation"
```

Skip the commit if verification required no code changes.

- [ ] **Step 7: Push the deployment branch**

```bash
git status --short
git push origin HEAD:main
```

Expected: the clean deployment branch is published to `origin/main` without unrelated worktree files.

- [ ] **Step 8: Verify the live memorial**

Confirm the live homepage uses the permanent memorial hierarchy; `/api/tributes` exposes no contact fields; tribute filters and full reading work; the gallery loads production photographs; the glory song is the only audio option; submission forms still work without sending test content; and both archival PDFs remain downloadable.
