#!/usr/bin/env bash
# Regenerate the downloadable résumé PDFs (with real, clickable hyperlinks).
# Run whenever resume.html, the résumé styles, or a translation changes.
#
#   bash .claude/build-resume-pdf.sh          # every built language
#   bash .claude/build-resume-pdf.sh en es    # just these
#
# Needs the local server running on :8123  (python .claude/serve.py)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PUBLIC="https://aitormorales.com"

# English is the source page at the repo root; every other language is a folder.
langs=("$@")
if [ ${#langs[@]} -eq 0 ]; then
  langs=(en)
  for code in es fr de it pt; do
    [ -f "$ROOT/$code/resume.html" ] && langs+=("$code")
  done
fi

for lang in "${langs[@]}"; do
  if [ "$lang" = "en" ]; then
    SRC="$ROOT/resume.html";       BASE="";       SUFFIX=""
  else
    SRC="$ROOT/$lang/resume.html"; BASE="/$lang"; SUFFIX="_$(echo "$lang" | tr '[:lower:]' '[:upper:]')"
  fi
  OUT="$ROOT/Aitor_Morales_Resume${SUFFIX}.pdf"
  [ -f "$SRC" ] || { echo "skip $lang (no resume page)"; continue; }

  # A temp copy at the ROOT — so relative asset paths resolve from one place for
  # every language — whose internal links point at the public site. A recruiter
  # opening the PDF should land on aitormorales.com, not on someone's localhost.
  TMP="$ROOT/_resume_print.html"
  sed -e "s|href=\"\./projects/|href=\"$PUBLIC$BASE/projects/|g" \
      -e "s|\(href\|src\|srcset\)=\"\.\./|\1=\"./|g" \
      "$SRC" > "$TMP"

  OUT_WIN="$(cygpath -w "$OUT" 2>/dev/null || echo "$OUT")"
  # A private profile per run: without it a second invocation attaches to the
  # Chrome still shutting down from the previous language and writes nothing.
  PROFILE="$(mktemp -d)"
  PROFILE_WIN="$(cygpath -w "$PROFILE" 2>/dev/null || echo "$PROFILE")"
  # Headless Chrome embeds real PDF link annotations (Windows "Print to PDF" does not).
  "$CHROME" --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
    --user-data-dir="$PROFILE_WIN" --print-to-pdf="$OUT_WIN" \
    "http://localhost:8123/_resume_print.html" >/dev/null 2>&1 || true
  rm -f "$TMP"; rm -rf "$PROFILE"

  if [ -f "$OUT" ]; then
    echo "Built: $(basename "$OUT")  ($(( $(stat -c%s "$OUT") / 1024 )) KB)"
  else
    echo "FAILED: $(basename "$OUT")"
  fi
done
