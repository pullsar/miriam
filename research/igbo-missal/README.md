# Miriam — Catholic Igbo Missal extraction

This research branch inspects Catholic Igbo Android sources without adding their whole copyrighted corpus to the public memorial repository.

## Apps

1. **Catholic Igbo Missal — 365 Readings**
   - Android package: `cub.a360.igboreading`
2. **Catholic Missal-English & Igbo — PWorld Concept**
   - Android package: `com.pworld_concept.Catholicigbomissal`

The workflow downloads the current APK/XAPK, records SHA-256 provenance, decompiles resources/code, inventories SQLite/JSON/XML/HTML assets, detects remote APIs/storage, and extracts only records/snippets matching:

- Wisdom 3:1–9
- Psalm 23
- 2 Timothy 4:6–8
- John 14:1–6

The evidence is uploaded as a **3-day GitHub Actions artifact** and is not committed to the repo.

## Analysis sequence

1. Verify package/version/SHA-256/signing identity.
2. Determine whether readings live in bundled SQLite/JSON/assets or a remote API.
3. Compare target rows against the supplied Frank Chibuko Catholic funeral booklet, NICCSJ/Ekwulobia Maranatha Catholic lectionary, and ICCUSA Igbo Catholic lectionary.
4. Reject Union/IGBOB and BIU fingerprints.
5. Build a verse-by-verse critical apparatus and select the funeral master text.

## Repository hygiene

- Workflow has `contents: read` only.
- No app payload or full decompiled tree is committed.
- Artifact retention is 3 days.
- Only target-matching database rows/snippets and source metadata are retained.
