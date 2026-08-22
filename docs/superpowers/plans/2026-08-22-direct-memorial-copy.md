# Direct Memorial Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the hero controls and make the biography speak directly about Miriam without editorial or reported-speech phrasing.

**Architecture:** Preserve the existing HTML, CSS and JavaScript structure. Change only the visible gallery and music labels, the music accessibility state, and the two biographical sentences that currently sound narrated or reported.

**Tech Stack:** Semantic HTML, CSS, vanilla browser JavaScript, Node.js built-in test runner.

---

### Task 1: Direct controls and biography copy

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `tests/download-entry.test.js`
- Modify: `tests/memorial-interactions.test.js`
- Modify: `tests/permanent-memorial.test.js`

- [ ] **Step 1: Write the failing copy and interaction tests**

Require `View Gallery`, initial `Music Off`, runtime `Music On`/`Music Off`, accessible `Turn music on`/`Turn music off`, and the absence of the old song-command and reported-speech phrases.

- [ ] **Step 2: Run the focused tests and verify the expected failures**

Run: `node --test tests/download-entry.test.js tests/memorial-interactions.test.js tests/permanent-memorial.test.js`

Expected: FAIL because the existing page still says `View Her Gallery`, `Play the Glory Song`, `Pause the Glory Song`, `the names spoken with most affection`, and `The photographs and tributes gathered here preserve`.

- [ ] **Step 3: Implement the minimal copy and state changes**

Use `View Gallery`; render `Music Off` initially; toggle between `Music On` and `Music Off`; use `Turn music on` and `Turn music off` for the accessible label; rewrite the biographical sentences as direct statements about Miriam.

- [ ] **Step 4: Run focused and complete verification**

Run:

```powershell
node --test tests/download-entry.test.js tests/memorial-interactions.test.js tests/permanent-memorial.test.js
node --test tests/*.test.js
git diff --check
```

Expected: all tests pass and no whitespace errors are reported.

- [ ] **Step 5: Commit, deploy and verify production**

Commit the tested files, push the verified commit to `origin/main`, wait for the deployment workflow, then confirm the new controls and direct copy on `https://miriamngo.com/`.
