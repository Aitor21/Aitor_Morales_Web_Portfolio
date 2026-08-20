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
# og:locale wants a full locale, not a language code. Left at en_US on a Spanish
# page it tells LinkedIn and Facebook the wrong thing about every share.
LOCALES = {"en": "en_US", "es": "es_ES", "fr": "fr_FR",
           "de": "de_DE", "it": "it_IT", "pt": "pt_PT"}
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


def og_locale(src, lang):
    """Set og:locale to this page's locale and advertise the others."""
    src = re.sub(r'<meta property="og:locale:alternate" content="[^"]*">\n[ \t]*', "", src)
    others = [l for l in (["en"] + built()) if l != lang]
    block = '<meta property="og:locale" content="%s">' % LOCALES[lang]
    for o in others:
        block += '\n  <meta property="og:locale:alternate" content="%s">' % LOCALES[o]
    return re.sub(r'<meta property="og:locale" content="[^"]*">', block, src, count=1)


def ld_json_urls(src, lang):
    """Point structured data at THIS language. A Spanish page whose breadcrumb says
       the site root is the English home is describing a different page than the one
       it is on. Asset URLs (the og images) stay where they are."""
    if lang == "en":
        return src

    def fix(m):
        return re.sub(r'(https://aitormorales\.com)/(?!assets/)',
                      lambda x: x.group(1) + "/" + lang + "/", m.group(0))

    return re.sub(r'<script type="application/ld\+json">.*?</script>', fix, src, flags=re.S)


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

    out = og_locale(out, lang)
    out = ld_json_urls(out, lang)

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
    out = og_locale(out, "en")
    out = re.sub(r'(<link rel="canonical" href="[^"]*">\n)',
                 lambda m: m.group(1) + alternates(page) + "\n", out, count=1)
    if out != src:
        io.open(path, "w", encoding="utf-8", newline="\n").write(out)
        return True
    return False



def write_sitemap():
    """Regenerate sitemap.xml covering every language.

       Google discovers translations far more reliably from sitemap hreflang
       annotations than from the page tags alone, and until this ran the 50
       localized pages were not listed anywhere at all. Every URL carries the
       full alternate set including itself, which is what the spec asks for.

       lastmod is preserved per URL from the previous sitemap when the page is
       unchanged, so the dates stay verifiably accurate — a sitemap that claims
       everything changed today is one Google learns to ignore."""
    import datetime, hashlib, json as _json

    path = os.path.join(ROOT, "sitemap.xml")
    stamp = os.path.join(HERE, ".sitemap-stamps.json")
    today = datetime.date.today().isoformat()

    prev = {}
    if os.path.exists(path):
        for m in re.finditer(r"<loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>",
                             io.open(path, encoding="utf-8").read()):
            prev[m.group(1)] = m.group(2)
    stamps = {}
    if os.path.exists(stamp):
        try:
            stamps = _json.load(io.open(stamp, encoding="utf-8"))
        except Exception:
            stamps = {}

    langs = ["en"] + built()
    rows = []
    new_stamps = {}
    for page in PAGES:
        if page == "404.html":
            continue                        # never list an error page
        for lang in langs:
            rel = page if lang == "en" else lang + "/" + page
            src_file = os.path.join(ROOT, *rel.split("/"))
            if not os.path.exists(src_file):
                continue
            url = (SITE + "/" + rel).replace("/index.html", "/")
            digest = hashlib.sha1(io.open(src_file, "rb").read()).hexdigest()
            new_stamps[url] = digest
            # unchanged content keeps its old date; changed content gets today
            when = prev.get(url, today) if stamps.get(url) == digest else today
            alts = []
            for l in langs:
                r2 = page if l == "en" else l + "/" + page
                if not os.path.exists(os.path.join(ROOT, *r2.split("/"))):
                    continue
                u2 = (SITE + "/" + r2).replace("/index.html", "/")
                alts.append('    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (l, u2))
            alts.append('    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>'
                        % (SITE + "/" + page).replace("/index.html", "/"))
            rows.append("  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n%s\n  </url>"
                        % (url, when, "\n".join(alts)))

    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           "<!-- Generated by tools/i18n/build.py - do not hand-edit.\n"
           "     No <priority> or <changefreq>: Google ignores both. <lastmod> is the one\n"
           "     field it does use, and only while it stays verifiably accurate, so it is\n"
           "     carried over untouched for any page whose bytes did not change. -->\n"
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    io.open(path, "w", encoding="utf-8", newline="\n").write(xml)
    io.open(stamp, "w", encoding="utf-8", newline="\n").write(
        _json.dumps(new_stamps, indent=1, sort_keys=True))
    return len(rows)


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
    print(f"  sitemap: {write_sitemap()} URLs with hreflang alternates")


if __name__ == "__main__":
    main()
