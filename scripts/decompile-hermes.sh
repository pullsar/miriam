#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:?usage: decompile-hermes.sh <research-output-dir>}"
REPORTS="$ROOT/reports"
mkdir -p "$REPORTS" "$ROOT/jadx"

BUNDLE="$(find "$ROOT/apktool" "$ROOT/splits" -type f -path '*/assets/index.android.bundle' 2>/dev/null | head -n1 || true)"
if [[ -z "$BUNDLE" ]]; then
  echo "No index.android.bundle found" > "$REPORTS/hermes-status.txt"
  exit 0
fi

printf '%s\n' "$BUNDLE" > "$REPORTS/hermes-bundle-path.txt"
file "$BUNDLE" | tee "$REPORTS/hermes-bundle-type.txt"

if ! file "$BUNDLE" | grep -qi 'Hermes JavaScript bytecode'; then
  echo "Bundle is not Hermes bytecode; analyzer will scan it directly." > "$REPORTS/hermes-status.txt"
  exit 0
fi

echo "Hermes bytecode detected; parsing and decompiling." > "$REPORTS/hermes-status.txt"

set +e
hbc-file-parser "$BUNDLE" > "$REPORTS/hermes-header.txt" 2> "$REPORTS/hermes-header.err"
PARSER_RC=$?
# Full decompilation reconstructs object/function relationships that a raw
# strings scan loses. Bound it so a malformed bundle cannot consume the job.
timeout 420 hbc-decompiler "$BUNDLE" "$ROOT/jadx/hermes-decompiled.js" \
  > "$REPORTS/hermes-decompiler.stdout" 2> "$REPORTS/hermes-decompiler.stderr"
DECOMP_RC=$?
set -e

printf '%s\n' "$PARSER_RC" > "$REPORTS/hermes-parser-exit-code.txt"
printf '%s\n' "$DECOMP_RC" > "$REPORTS/hermes-decompiler-exit-code.txt"

if [[ -s "$ROOT/jadx/hermes-decompiled.js" ]]; then
  wc -c "$ROOT/jadx/hermes-decompiled.js" > "$REPORTS/hermes-decompiled-size.txt"
  echo "Hermes decompilation produced pseudo-JavaScript." >> "$REPORTS/hermes-status.txt"
else
  echo "Hermes decompilation produced no output; raw bundle/string evidence remains available." >> "$REPORTS/hermes-status.txt"
fi

# Decompiler failure is non-fatal to the APK extraction. The analyzer can still
# use the raw HBC string table and native/resource evidence.
exit 0
