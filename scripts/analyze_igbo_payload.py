#!/usr/bin/env python3
"""
Create a compact research artifact from a decompiled Catholic Igbo app.

The artifact is intended for source identification and passage comparison, not
for republishing an app or an entire copyrighted corpus. It records provenance,
database schemas, candidate file locations, URLs, and narrowly targeted matching
records/snippets for the four funeral readings.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sqlite3
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
out.mkdir(parents=True, exist_ok=True)

READINGS = {
    "wisdom_3_1_9": [
        "amamihe", "wisdom 3", "mkpuru obi", "mkpụrụ obi", "eziomume",
        "ezi omume", "aja nsureoku", "aja nsuruoku", "aja nsureọkụ",
    ],
    "psalm_23": [
        "abuoma 23", "abụ ọma 23", "psalm 23", "dinwenu bu onye nche",
        "dinwenụ bụ onye nche", "ihe m ga-acho", "ihe m ga-achọ",
    ],
    "2_timothy_4_6_8": [
        "2 timoti", "2 timothy", "aluola m ezigbo ogu", "alụọla m ezigbo ọgụ",
        "okpueze", "onyeokaikpe", "onye ọkaikpe",
    ],
    "john_14_1_6": [
        "jon 14", "jọn 14", "john 14", "obi alola unu mmiri",
        "obi alọla unu mmiri", "mu onwe m bu uzo", "mụ onwe m bụ ụzọ",
    ],
}

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest()

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def reading_hits(text: str) -> list[str]:
    low = text.lower()
    return [k for k, anchors in READINGS.items() if any(a in low for a in anchors)]

manifest = {
    "root": str(root),
    "package": (root / "reports/package.txt").read_text(errors="replace").strip()
               if (root / "reports/package.txt").exists() else None,
    "label": (root / "reports/label.txt").read_text(errors="replace").strip()
             if (root / "reports/label.txt").exists() else None,
    "download_url": (root / "reports/download-url.txt").read_text(errors="replace").strip()
                    if (root / "reports/download-url.txt").exists() else None,
}
pkg = root / "download/app.pkg"
if pkg.exists():
    manifest["payload_sha256"] = sha256(pkg)
    manifest["payload_bytes"] = pkg.stat().st_size

(out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))

if (root / "reports").exists():
    shutil.copytree(root / "reports", out / "raw-reports", dirs_exist_ok=True)

text_results = []
scan_roots = [root / "apktool", root / "jadx", root / "splits"]
# React Native production code is commonly stored in extensionless or .bundle
# files (especially assets/index.android.bundle). Include it explicitly and
# permit large bundles while still refusing arbitrary huge binary files.
text_ext = {
    ".txt", ".json", ".xml", ".html", ".htm", ".js", ".bundle", ".java",
    ".kt", ".csv", ".md", ".properties", ".dart"
}
MAX_TEXT_BYTES = 100 * 1024 * 1024

for base in scan_roots:
    if not base.exists():
        continue
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        # Accept standard text extensions plus the canonical React Native bundle
        # name even when an app vendor omits a suffix.
        is_rn_bundle = p.name in {"index.android.bundle", "main.jsbundle"}
        if p.suffix.lower() not in text_ext and not is_rn_bundle:
            continue
        try:
            if p.stat().st_size > MAX_TEXT_BYTES:
                continue
            text = p.read_text("utf-8", errors="ignore")
        except Exception:
            continue
        low = text.lower()
        for reading, anchors in READINGS.items():
            positions = []
            for a in anchors:
                start = 0
                while True:
                    i = low.find(a, start)
                    if i < 0:
                        break
                    positions.append((i, a))
                    start = i + max(1, len(a))
                    if len(positions) >= 20:
                        break
            if not positions:
                continue
            for i, anchor in sorted(positions)[:12]:
                lo = max(0, i - 700)
                hi = min(len(text), i + len(anchor) + 2200)
                excerpt = norm(text[lo:hi])
                text_results.append({
                    "reading": reading,
                    "file": str(p.relative_to(root)),
                    "anchor": anchor,
                    "offset": i,
                    "excerpt": excerpt[:3000],
                })

seen = set()
dedup = []
for r in text_results:
    key = (r["reading"], r["file"], r["offset"])
    if key not in seen:
        seen.add(key)
        dedup.append(r)
(out / "target-text-snippets.json").write_text(
    json.dumps(dedup[:500], ensure_ascii=False, indent=2)
)

db_report = []
for base in scan_roots:
    if not base.exists():
        continue
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        try:
            with p.open("rb") as f:
                head = f.read(16)
        except Exception:
            continue
        if head != b"SQLite format 3\x00":
            continue

        item = {"file": str(p.relative_to(root)), "sha256": sha256(p), "tables": []}
        try:
            con = sqlite3.connect(f"file:{p}?mode=ro", uri=True)
            con.row_factory = sqlite3.Row
            tables = [x[0] for x in con.execute(
                "select name from sqlite_master where type='table' and name not like 'sqlite_%'"
            )]
            for t in tables:
                safe_t = t.replace('"', '""')
                cols = list(con.execute(f'pragma table_info("{safe_t}")'))
                colnames = [c[1] for c in cols]
                table = {"name": t, "columns": colnames, "matches": []}
                try:
                    rows = con.execute(f'SELECT * FROM "{safe_t}" LIMIT 50000')
                    for row in rows:
                        vals = []
                        for c in colnames:
                            v = row[c]
                            if isinstance(v, str):
                                vals.append(v)
                        joined = "\n".join(vals)
                        hits = reading_hits(joined)
                        if hits:
                            table["matches"].append({
                                "readings": hits,
                                "row": {
                                    c: (row[c][:12000] if isinstance(row[c], str) else row[c])
                                    for c in colnames
                                    if row[c] is None or isinstance(row[c], (str, int, float))
                                }
                            })
                            if len(table["matches"]) >= 100:
                                break
                except Exception as e:
                    table["scan_error"] = repr(e)
                item["tables"].append(table)
            con.close()
        except Exception as e:
            item["error"] = repr(e)
        db_report.append(item)

(out / "sqlite-target-records.json").write_text(
    json.dumps(db_report, ensure_ascii=False, indent=2)
)

urls = []
url_file = root / "reports/urls.txt"
if url_file.exists():
    urls = [u.strip() for u in url_file.read_text(errors="replace").splitlines() if u.strip()]
(out / "endpoints.txt").write_text("\n".join(urls[:4000]) + ("\n" if urls else ""))

summary = []
summary.append("# Catholic Igbo app evidence")
summary.append("")
summary.append(f"- App: **{manifest.get('label') or 'unknown'}**")
summary.append(f"- Package: `{manifest.get('package') or 'unknown'}`")
summary.append(f"- SHA-256: `{manifest.get('payload_sha256') or 'unknown'}`")
summary.append("")
summary.append("## Target evidence counts")
for k in READINGS:
    n_text = sum(1 for r in dedup if r["reading"] == k)
    n_db = sum(
        1 for d in db_report for t in d.get("tables", [])
        for m in t.get("matches", []) if k in m.get("readings", [])
    )
    summary.append(f"- `{k}`: {n_text} text-location matches; {n_db} SQLite row matches")
summary.append("")
summary.append("## Files")
summary.append("- `manifest.json` — package, download provenance and payload hash")
summary.append("- `target-text-snippets.json` — bounded target excerpts + locations")
summary.append("- `sqlite-target-records.json` — schemas and target-only matching rows")
summary.append("- `endpoints.txt` — discovered network/API endpoints")
summary.append("- `raw-reports/` — inventory, hashes, decoder logs and storage/network locations")
summary.append("")
summary.append("The artifact is retained for 3 days and is not committed to the memorial repository.")
(out / "README.md").write_text("\n".join(summary) + "\n")
