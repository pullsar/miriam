#!/usr/bin/env bash
set -euo pipefail

APP="${1:?usage: $0 {365|pworld} [output-dir]}"
OUT="${2:-research-out/$APP}"

mkdir -p "$OUT"/{download,unpacked,apktool,jadx,reports}

case "$APP" in
  365)
    PACKAGE="cub.a360.igboreading"
    LABEL="Catholic Igbo Missal — 365 Readings"
    # Current APKPure package endpoint; ?version=latest avoids hard-coding the build.
    DIRECT="https://d.apkpure.net/b/XAPK/${PACKAGE}?version=latest"
    ;;
  pworld)
    PACKAGE="com.pworld_concept.Catholicigbomissal"
    LABEL="Catholic Missal-English & Igbo — PWorld Concept"
    DIRECT="https://d.apkpure.net/b/XAPK/${PACKAGE}?version=latest"
    ;;
  *)
    echo "Unknown app: $APP" >&2
    exit 2
    ;;
esac

printf '%s\n' "$PACKAGE" > "$OUT/reports/package.txt"
printf '%s\n' "$LABEL"   > "$OUT/reports/label.txt"
printf '%s\n' "$DIRECT"  > "$OUT/reports/download-url.txt"

echo "Downloading: $LABEL"
curl --fail --location --retry 4 --retry-delay 3 \
  -A 'Mozilla/5.0 (Linux; Android 14)' \
  "$DIRECT" -o "$OUT/download/app.pkg"

sha256sum "$OUT/download/app.pkg" | tee "$OUT/reports/sha256.txt"
file "$OUT/download/app.pkg" | tee "$OUT/reports/file-type.txt"

# APKPure can return APK or XAPK/ZIP.
if unzip -tqq "$OUT/download/app.pkg" >/dev/null 2>&1; then
  unzip -q "$OUT/download/app.pkg" -d "$OUT/unpacked"
else
  cp "$OUT/download/app.pkg" "$OUT/unpacked/base.apk"
fi

# Prefer an APK explicitly named base.apk, otherwise the largest APK is normally
# the base split and is a better choice than architecture/config splits.
BASE_APK="$(find "$OUT/unpacked" -type f -name 'base.apk' | head -n1 || true)"
if [[ -z "$BASE_APK" ]]; then
  BASE_APK="$(find "$OUT/unpacked" -type f -name '*.apk' -printf '%s %p\n' \
    | sort -nr | head -n1 | cut -d' ' -f2- || true)"
fi
if [[ -z "$BASE_APK" ]]; then
  echo "No APK found after unpacking" >&2
  find "$OUT/unpacked" -maxdepth 3 -type f -printf '%p\t%s\n' \
    | tee "$OUT/reports/unpacked-files.txt"
  exit 3
fi
printf '%s\n' "$BASE_APK" | tee "$OUT/reports/base-apk.txt"

# Record signing certificate identity. This helps catch an unexpected/repacked
# payload even when the package name is correct.
apksigner verify --print-certs "$BASE_APK" \
  > "$OUT/reports/apksigner.txt" 2>&1 || true

# Decode resources and decompile bytecode. Keep going if one decoder encounters
# malformed resources; the other often still succeeds.
apktool d -f -o "$OUT/apktool" "$BASE_APK" >"$OUT/reports/apktool.log" 2>&1 || true
jadx --show-bad-code --deobf -d "$OUT/jadx" "$BASE_APK" >"$OUT/reports/jadx.log" 2>&1 || true

# Also unzip every split so assets bundled in non-base splits are visible.
mkdir -p "$OUT/splits"
while IFS= read -r apk; do
  d="$OUT/splits/$(basename "$apk" .apk)"
  mkdir -p "$d"
  unzip -q -o "$apk" -d "$d" || true
done < <(find "$OUT/unpacked" -type f -name '*.apk' | sort)

find "$OUT/apktool" "$OUT/jadx" "$OUT/splits" -type f -printf '%p\t%s\n' 2>/dev/null \
  | sort > "$OUT/reports/file-inventory.txt" || true

find "$OUT/apktool" "$OUT/jadx" "$OUT/splits" -type f \
  \( -iname '*.db' -o -iname '*.sqlite' -o -iname '*.sqlite3' -o -iname '*.realm' \
     -o -iname '*.json' -o -iname '*.xml' -o -iname '*.html' -o -iname '*.htm' \
     -o -iname '*.txt' -o -iname '*.csv' -o -iname '*.js' -o -iname '*.kt' \
     -o -iname '*.java' \) \
  -printf '%p\n' 2>/dev/null | sort -u > "$OUT/reports/data-candidates.txt" || true

# Network/storage fingerprints. These tell us whether the readings are local,
# Firebase/Room/SQLite-backed, or loaded from a CMS/API.
rg -o --no-filename 'https?://[^"<> )]+' "$OUT/jadx" "$OUT/apktool" "$OUT/splits" 2>/dev/null \
  | sed 's/[;,]$//' | sort -u > "$OUT/reports/urls.txt" || true

rg -n -i --no-heading \
  'firebase|firestore|roomdatabase|sqlite|realm|retrofit|wordpress|wp-json|graphql|api/|database|assets/|raw/' \
  "$OUT/jadx" "$OUT/apktool" 2>/dev/null \
  | cut -d: -f1-2 | sort -u > "$OUT/reports/storage-network-locations.txt" || true

echo "Extraction finished: $OUT"
