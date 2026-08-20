"""Write tools/i18n/strings.json — every unique translatable string, in page order."""
import sys, io, json, glob, os
sys.path.insert(0, os.path.dirname(__file__))
import lib

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
FILES = ["index.html", "about.html", "resume.html", "404.html"] + sorted(
    glob.glob(os.path.join(ROOT, "projects", "*.html")))

seen, order = set(), []
for f in FILES:
    path = f if os.path.isabs(f) else os.path.join(ROOT, f)
    src = io.open(path, encoding="utf-8").read()
    for s in lib.strings(src):
        s = s.strip()
        if s and s not in seen:
            seen.add(s); order.append(s)

out = os.path.join(os.path.dirname(__file__), "strings.json")
io.open(out, "w", encoding="utf-8").write(json.dumps(order, ensure_ascii=False, indent=1))
print(f"{len(order)} unique strings -> {out}")
