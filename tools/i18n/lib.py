"""Shared extraction logic for the localized builds.

Works on the raw HTML and splices only the spans that hold human-readable
text, so every byte of markup, whitespace and attribute ordering survives
untouched. That matters: these files are hand-written and the English ones
stay the source of truth.
"""
import re
from html.parser import HTMLParser

# Never translate what is inside these.
SKIP = {"script", "style"}
# Attributes that hold prose a visitor or a screen reader will encounter.
ATTRS = ("alt", "aria-label", "data-label", "placeholder", "title")
# <meta>/<link> content worth localizing, keyed by the identifying attribute.
META = ("description", "og:title", "og:description", "og:image:alt", "og:site_name")


class _Spans(HTMLParser):
    """Collect (start, end) byte spans of translatable text nodes."""
    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.lines = [0]
        for line in src.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))
        self.spans = []
        self.stack = []

    def _off(self, pos):
        line, col = pos
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:                     # tolerate unclosed inline tags
            while self.stack and self.stack.pop() != tag:
                pass

    def handle_data(self, data):
        if not data.strip():
            return
        if any(t in SKIP for t in self.stack):
            return
        start = self._off(self.getpos())
        # getpos() is the start of this data run; find its true extent in source
        end = start + len(data)
        if self.src[start:end] != data:             # entity refs shift things
            idx = self.src.find(data, start - 2 if start >= 2 else 0)
            if idx < 0:
                return
            start, end = idx, idx + len(data)
        self.spans.append((start, end))


def text_spans(src):
    p = _Spans(src)
    p.feed(src)
    return p.spans


def attr_spans(src):
    """Spans of translatable attribute VALUES (the inside of the quotes)."""
    out = []
    for name in ATTRS:
        for m in re.finditer(r'\b%s="([^"]*)"' % re.escape(name), src):
            if m.group(1).strip():
                out.append((m.start(1), m.end(1)))
    for key in META:
        pat = r'<meta\s+(?:name|property)="%s"\s+content="([^"]*)"' % re.escape(key)
        for m in re.finditer(pat, src):
            if m.group(1).strip():
                out.append((m.start(1), m.end(1)))
    return out


def all_spans(src):
    spans = text_spans(src) + attr_spans(src)
    spans.sort()
    # drop overlaps (an attribute inside a skipped region, etc.)
    clean, last = [], -1
    for s, e in spans:
        if s >= last:
            clean.append((s, e))
            last = e
    return clean


def strings(src):
    return [src[s:e] for s, e in all_spans(src)]


def splice(src, mapping):
    """Rebuild src with every translatable span replaced via mapping."""
    out, last = [], 0
    for s, e in all_spans(src):
        out.append(src[last:s])
        original = src[s:e]
        lead = original[: len(original) - len(original.lstrip())]
        trail = original[len(original.rstrip()):]
        core = original.strip()
        out.append(lead + mapping.get(core, core) + trail)
        last = e
    out.append(src[last:])
    return "".join(out)
