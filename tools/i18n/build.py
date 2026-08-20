"""Generate the localized sites from the English pages.

English stays the single source of truth: edit index.html, re-run this, and
every language follows. Nothing here is hand-maintained except the
translation catalogues in this folder.

  python tools/i18n/build.py
"""
import sys, io, os, re, json, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import lib

SITE = "https://aitormorales.com"
LANGS = ["es", "fr", "de", "it", "pt"]          # English is the source, not a build
NAMES = {"en": "English", "es": "Español", "fr": "Français",
         "de": "Deutsch", "it": "Italiano", "pt": "Português"}
# Forward slashes always: these strings become URLs as well as paths, and on
# Windows os.path.join would put a backslash inside every hreflang.
PAGES = ["index.html", "about.html", "resume.html", "404.html"] + [
    "projects/" + os.path.basename(p)
    for p in sorted(glob.glob(os.path.join(ROOT, "projects", "*.html")))]

# Files shared by every language — one directory deeper means one more "../".
# `poster` matters as much as src: the video posters are shared assets too, and
# leaving them out sent every localized page looking for /it/assets/... (404).
# The résumé PDF is treated as a shared asset: localized copies live at the repo
# root next to the English one, never inside a generated language folder (which
# is deleted and rebuilt on every run, and must contain no binaries).
SHARED = re.compile(r'((?:href|src|poster)=")((?:\.\./|\./)*)((?:css|js|assets)/|favicon\.png|apple-touch-icon\.png|Aitor_Morales_Resume\.pdf)')
SRCSET = re.compile(r'(srcset=")((?:\.\./|\./)*)(assets/)')


def up(m):
    """One directory deeper: count the existing levels and add one.
       String-editing the prefix instead turned "../css/" into "../.css/"."""
    return m.group(1) + "../" * (m.group(2).count("../") + 1) + m.group(3)


def localize_paths(src):
    src = SHARED.sub(up, src)
    return SRCSET.sub(up, src)


def built():
    """Only languages that actually have a catalogue. Advertising an hreflang
       for a page that 404s is worse than not advertising it at all, and the
       language switcher is derived from these tags at runtime, so this is the
       single place that decides which languages exist."""
    return [l for l in LANGS if os.path.exists(os.path.join(HERE, f"{l}.json"))]


def alternates(page):
    """hreflang block: every built language plus x-default, so search engines
       pair the versions instead of reading them as duplicates."""
    url = f"{SITE}/{page}".replace("/index.html", "/")
    rows = [f'  <link rel="alternate" hreflang="en" href="{url}">']
    for l in built():
        lu = f"{SITE}/{l}/{page}".replace("/index.html", "/")
        rows.append(f'  <link rel="alternate" hreflang="{l}" href="{lu}">')
    rows.append(f'  <link rel="alternate" hreflang="x-default" href="{url}">')
    return "\n".join(rows)


def strip_alternates(src):
    return re.sub(r'[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n', "", src)


def build_page(page, lang, catalog):
    src = io.open(os.path.join(ROOT, *page.split("/")), encoding="utf-8").read()
    src = strip_alternates(src)
    out = lib.splice(src, catalog)
    out = localize_paths(out)
    out = out.replace('<html lang="en"', f'<html lang="{lang}"', 1)

    # canonical / og:url point at THIS language's copy
    def prefix(m):
        return m.group(1) + f"{SITE}/{lang}" + (m.group(2) or "/")
    out = re.sub(r'(<link rel="canonical" href=")' + re.escape(SITE) + r'(/[^"]*|/?)"',
                 lambda m: m.group(1) + f"{SITE}/{lang}" + (m.group(2) or "/") + '"', out)
    out = re.sub(r'(<meta property="og:url" content=")' + re.escape(SITE) + r'(/[^"]*|/?)"',
                 lambda m: m.group(1) + f"{SITE}/{lang}" + (m.group(2) or "/") + '"', out)

    # localized résumé PDF, if one exists for this language
    out = out.replace("Aitor_Morales_Resume.pdf", f"Aitor_Morales_Resume_{lang.upper()}.pdf")

    # hreflang, injected right after the canonical
    out = re.sub(r'(<link rel="canonical" href="[^"]*">\n)',
                 lambda m: m.group(1) + alternates(page) + "\n", out, count=1)
    out = out.replace('<html lang', f'<html data-lang="{lang}" lang', 1)

    dest = os.path.join(ROOT, lang, *page.split("/"))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    io.open(dest, "w", encoding="utf-8", newline="\n").write(out)
    return dest


def annotate_english(page):
    """English pages need the same hreflang set, pointing at the translations."""
    path = os.path.join(ROOT, *page.split("/"))
    src = io.open(path, encoding="utf-8").read()
    out = strip_alternates(src)
    out = re.sub(r'(<link rel="canonical" href="[^"]*">\n)',
                 lambda m: m.group(1) + alternates(page) + "\n", out, count=1)
    if out != src:
        io.open(path, "w", encoding="utf-8", newline="\n").write(out)
        return True
    return False


def main():
    langs = sys.argv[1:] or LANGS
    for lang in langs:
        cat_path = os.path.join(HERE, f"{lang}.json")
        if not os.path.exists(cat_path):
            print(f"  {lang}: no catalogue yet, skipped")
            continue
        catalog = json.load(io.open(cat_path, encoding="utf-8"))
        n = 0
        for page in PAGES:
            build_page(page, lang, catalog)
            n += 1
        missing = 0
        for page in PAGES:
            src = io.open(os.path.join(ROOT, *page.split("/")), encoding="utf-8").read()
            for s in lib.strings(src):
                if s.strip() and s.strip() not in catalog:
                    missing += 1
        print(f"  {lang}: {n} pages, {len(catalog)} strings translated"
              + (f", {missing} untranslated instances left as English" if missing else ""))
    changed = sum(1 for p in PAGES if annotate_english(p))
    print(f"  en: hreflang added/refreshed on {changed} pages")


if __name__ == "__main__":
    main()
