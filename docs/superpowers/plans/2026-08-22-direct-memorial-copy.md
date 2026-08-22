# Direct Memorial Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the hero controls, make the biography speak directly about Miriam, paginate tributes for comfortable phone reading, and curate the public gallery to meaningful photographs with visible people.

**Architecture:** Preserve the existing HTML, CSS and JavaScript structure. Add a small pure pagination helper to the tribute archive, replace the progressive loader with Previous/Next controls, and apply a family-curated exclusion set to submitted gallery photos without deleting the stored uploads.

**Tech Stack:** Semantic HTML, CSS, vanilla browser JavaScript, Node.js built-in test runner.

---

### Task 1: Direct controls and biography copy

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `tests/download-entry.test.js`
- Modify: `tests/memorial-interactions.test.js`
- Modify: `tests/permanent-memorial.test.js`

- [x] **Step 1: Write the failing copy and interaction tests**

Require `View Gallery`, initial `Music Off`, runtime `Music On`/`Music Off`, accessible `Turn music on`/`Turn music off`, and the absence of the old song-command and reported-speech phrases.

- [x] **Step 2: Run the focused tests and verify the expected failures**

Run: `node --test tests/download-entry.test.js tests/memorial-interactions.test.js tests/permanent-memorial.test.js`

Expected: FAIL because the existing page still says `View Her Gallery`, `Play the Glory Song`, `Pause the Glory Song`, `the names spoken with most affection`, and `The photographs and tributes gathered here preserve`.

- [x] **Step 3: Implement the minimal copy and state changes**

Use `View Gallery`; render `Music Off` initially; toggle between `Music On` and `Music Off`; use `Turn music on` and `Turn music off` for the accessible label; rewrite the biographical sentences as direct statements about Miriam.

- [x] **Step 4: Run focused and complete verification**

Run:

```powershell
node --test tests/download-entry.test.js tests/memorial-interactions.test.js tests/permanent-memorial.test.js
node --test tests/*.test.js
git diff --check
```

Expected: all tests pass and no whitespace errors are reported.

- [ ] **Step 5: Commit, deploy and verify production**

Commit the tested files, push the verified commit to `origin/main`, wait for the deployment workflow, then confirm the new controls and direct copy on `https://miriamngo.com/`.

### Task 2: Mobile tribute pagination

**Files:**
- Modify: `public/index.html`
- Modify: `public/memorial.css`
- Modify: `public/memorial-archive.js`
- Modify: `tests/memorial-archive-script.test.js`

- [x] **Step 1: Write failing pagination tests**

Require Previous and Next controls, a live page indicator, twelve tributes per desktop page, six per phone page, and reset-to-first-page behavior after search or category changes.

- [x] **Step 2: Implement and style pagination**

Replace the load-more button with semantic pagination. Disable unavailable directions and keep controls at least 44px high on phones.

- [x] **Step 3: Verify filtering, page limits, and mobile layout**

Run the focused archive tests and inspect the archive at desktop and phone widths.

### Task 3: Curate submitted photographs

**Files:**
- Modify: `public/memorial-utils.js`
- Modify: `public/app.js`
- Modify: `tests/memorial-utils.test.js`
- Modify: `tests/memorial-interactions.test.js`

- [x] **Step 1: Write a failing non-destructive curation test**

Require selected upload IDs to be omitted from the public list while the original input remains unchanged.

- [x] **Step 2: Apply the reviewed exclusion set**

Suppress condolence-letter scans, phone screenshots, unrelated solitary contributor portraits, and images without a usable face. Keep the underlying uploads untouched.

- [x] **Step 3: Verify the public gallery and lightbox**

Confirm the curated count, image loading, and Previous/Next lightbox navigation at desktop and phone widths.
