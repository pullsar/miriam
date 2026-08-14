#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 365|pworld [output-dir]" >&2
  exit 2
fi
APP="$1"
OUT="${2:-research-out/$APP}"

mkdir -p "$OUT"/{download,unpacked,apktool,jadx,reports}

case "$APP" in
  365)
    PACKAGE="cub.a360.igboreading"
    LABEL="Catholic Igbo Missal — 365 Readings"
    DIRECT="https://d.apkpure.net/b/XAPK/${PACKAGE}?version=latest"
    ;;
  pworld)
    PACKAGE="com.pworld_concept.Catholicigbomissal"
    LABEL="Catholic Missal-English & Igbo — PWorld Concept"
    DIRECT="https://d.apkpure.net/b/XAPK/${PACKAGE}?version=latest"
    ;;
  *)
    printf 'Unknown app argument: <%s>\n' "$APP" | tee "$OUT/reports/argument-error.txt" >&2
    exit 2
    ;;
esac

printf '%s\n' "$APP"     > "$OUT/reports/app-argument.txt"
printf '%s\n' "$PACKAGE" > "$OUT/reports/package.txt"
printf '%s\n' "$LABEL"   > "$OUT/reports/label.txt"
printf '%s\n' "$DIRECT"  > "$OUT/reports/download-url.txt"

PAYLOAD="$OUT/download/app.pkg"
rm -f "$PAYLOAD"

# Attempt 1: APKPure's public direct endpoint. Keep full diagnostics because
# this endpoint occasionally changes behavior for datacenter IPs.
printf 'Downloading directly: %s\n' "$LABEL"
set +e
curl --fail --location --retry 2 --retry-delay 2 \
  --connect-timeout 20 --max-time 180 \
  -A 'Mozilla/5.0 (Linux; Android 14)' \
  -D "$OUT/reports/curl-headers.txt" \
  "$DIRECT" -o "$PAYLOAD" \
  >"$OUT/reports/curl-stdout.txt" 2>"$OUT/reports/curl-stderr.txt"
CURL_RC=$?
set -e
printf '%s\n' "$CURL_RC" > "$OUT/reports/curl-exit-code.txt"

DIRECT_OK=0
if [[ $CURL_RC -eq 0 && -s "$PAYLOAD" ]]; then
  MIME="$(file -b --mime-type "$PAYLOAD" || true)"
  printf '%s\n' "$MIME" > "$OUT/reports/direct-mime.txt"
  case "$MIME" in
    application/zip|application/vnd.android.package-archive|application/octet-stream)
      DIRECT_OK=1
      printf 'direct-apkpure\n' > "$OUT/reports/download-method.txt"
      ;;
  esac
fi

# Attempt 2: apkeep. EFF's apkeep uses APKPure's version/API metadata and is
# substantially more resilient than depending on the public shortcut URL.
if [[ $DIRECT_OK -ne 1 ]]; then
  rm -f "$PAYLOAD"
  printf 'Direct download unavailable (curl rc=%s); trying apkeep.\n' "$CURL_RC" \
    | tee "$OUT/reports/fallback.txt"

  APKEEP_OUT="$OUT/download/apkeep"
  mkdir -p "$APKEEP_OUT"
  ABS_APKEEP_OUT="$(cd "$APKEEP_OUT" && pwd)"

  set +e
  docker run --rm \
    -v "$ABS_APKEEP_OUT:/output" \
    ghcr.io/efforg/apkeep:stable \
    -a "$PACKAGE" -d apk-pure /output \
    >"$OUT/reports/apkeep-stdout.txt" 2>"$OUT/reports/apkeep-stderr.txt"
  APKEEP_RC=$?
  set -e
  printf '%s\n' "$APKEEP_RC" > "$OUT/reports/apkeep-exit-code.txt"

  APKEEP_PAYLOAD="$(find "$APKEEP_OUT" -maxdepth 2 -type f \( -iname '*.apk' -o -iname '*.xapk' -o -iname '*.apks' \) -printf '%s %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2- || true)"
  if [[ $APKEEP_RC -eq 0 && -n "$APKEEP_PAYLOAD" && -s "$APKEEP_PAYLOAD" ]]; then
    cp "$APKEEP_PAYLOAD" "$PAYLOAD"
    printf 'apkeep-apkpure\n' > "$OUT/reports/download-method.txt"
    printf '%s\n' "$APKEEP_PAYLOAD" > "$OUT/reports/apkeep-payload.txt"
  else
    printf 'Both direct APKPure and apkeep downloads failed.\n' | tee "$OUT/reports/download-failure.txt" >&2
    find "$OUT/download" -maxdepth 3 -type f -printf '%p\t%s bytes\n' \
      > "$OUT/reports/download-directory.txt" || true
    exit 4
  fi
fi

sha256sum "$PAYLOAD" | tee "$OUT/reports/sha256.txt"
file "$PAYLOAD" | tee "$OUT/reports/file-type.txt"

# APKPure/apkeep may return APK or XAPK/ZIP.
if unzip -tqq "$PAYLOAD" >/dev/null 2>&1; then
  unzip -q "$PAYLOAD" -d "$OUT/unpacked"
else
  cp "$PAYLOAD" "$OUT/unpacked/base.apk"
fi

# Prefer an explicitly named base.apk. Otherwise select the largest APK; for
# split bundles that is normally the base package rather than a config split.
BASE_APK="$(find "$OUT/unpacked" -type f -name 'base.apk' | head -n1 || true)"
if [[ -z "$BASE_APK" ]]; then
  BASE_APK="$(find "$OUT/unpacked" -type f -name '*.apk' -printf '%s %p\n' 2>/dev/null \
    | sort -nr | head -n1 | cut -d' ' -f2- || true)"
fi
if [[ -z "$BASE_APK" ]]; then
  echo "No APK found after unpacking" >&2
  find "$OUT/unpacked" -maxdepth 3 -type f -printf '%p\t%s\n' \
    | tee "$OUT/reports/unpacked-files.txt"
  exit 3
fi
printf '%s\n' "$BASE_APK" | tee "$OUT/reports/base-apk.txt"

apksigner verify --print-certs "$BASE_APK" \
  > "$OUT/reports/apksigner.txt" 2>&1 || true

# JADX supports APK/XAPK directly, but apktool remains valuable for decoded
# Android resources. Run both so one can recover evidence if the other fails.
apktool d -f -o "$OUT/apktool" "$BASE_APK" >"$OUT/reports/apktool.log" 2>&1 || true
jadx --show-bad-code --deobf -d "$OUT/jadx" "$PAYLOAD" >"$OUT/reports/jadx.log" 2>&1 || \
jadx --show-bad-code --deobf -d "$OUT/jadx" "$BASE_APK" >>"$OUT/reports/jadx.log" 2>&1 || true

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
     -o -iname '*.java' -o -iname '*.dart' \) \
  -printf '%p\n' 2>/dev/null | sort -u > "$OUT/reports/data-candidates.txt" || true

rg -o --no-filename 'https?://[^"<> )]+' "$OUT/jadx" "$OUT/apktool" "$OUT/splits" 2>/dev/null \
  | sed 's/[;,]$//' | sort -u > "$OUT/reports/urls.txt" || true

rg -n -i --no-heading \
  'firebase|firestore|roomdatabase|sqlite|realm|retrofit|wordpress|wp-json|graphql|api/|database|assets/|raw/|flutter|sqflite|hive' \
  "$OUT/jadx" "$OUT/apktool" 2>/dev/null \
  | cut -d: -f1-2 | sort -u > "$OUT/reports/storage-network-locations.txt" || true

echo "Extraction finished: $OUT"
