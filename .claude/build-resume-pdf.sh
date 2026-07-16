#!/usr/bin/env bash
# Regenerate the downloadable résumé PDF (with real, clickable hyperlinks).
# Run this whenever resume.html or the résumé styles change.
#
#   bash .claude/build-resume-pdf.sh
#
# Needs the local server running on :8123  (python .claude/serve.py)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PUBLIC="https://aitormorales.com"
OUT_WIN="$(cygpath -w "$ROOT/v3/Aitor_Morales_Resume.pdf" 2>/dev/null || echo "$ROOT/v3/Aitor_Morales_Resume.pdf")"

# 1. Temp copy whose internal links point at the PUBLIC site, so the PDF's links
#    work for a recruiter (not at localhost).
sed "s|href=\"./projects/|href=\"$PUBLIC/projects/|g" "$ROOT/v3/resume.html" > "$ROOT/v3/_resume_print.html"

# 2. Headless Chrome embeds real PDF link annotations (Windows "Print to PDF" does not).
"$CHROME" --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf="$OUT_WIN" \
  "http://localhost:8123/v3/_resume_print.html" >/dev/null 2>&1 || true

# 3. Clean up
rm -f "$ROOT/v3/_resume_print.html"

echo "Built: v3/Aitor_Morales_Resume.pdf"
