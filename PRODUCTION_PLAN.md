# Portfolio & CV Production Plan — Aitor Morales

Goal: land interviews for **Game Designer / Level Designer / Technical Designer** roles by making
aitormorales.com and the CV reflect current, senior-level work — readable by both human recruiters
and ATS/AI screeners.

---

## Audit — where we are today (July 2026)

### The #1 problem is content, not design
- **Your strongest credential is invisible.** The Gimica Level Designer role (Feb 2025–present:
  sole designer on a mobile F2P portfolio, hundreds of levels authored, boosters/economy systems,
  A/B tests owned end-to-end, shipping in Unity/Babylon.js/Godot) appears **nowhere** on the
  website or the CV image. This is exactly what studios hiring level/technical designers look for.
- The site shows **1 project (Blaster Buds, 2020)**. There are at least 6 shippable case studies:
  Love at First Bite, R4D10HEAD, Birds of a Feather, Viktor's Mayhem, Blaster Buds, Luzia demo
  (Bliss Pictures).
- Positioning is diluted: site says "Game Designer / UX/UI Designer"; target roles are game /
  level / technical designer. The about copy is generic template text, not a designer's voice.
- Projects are listed as titles + roles. No design breakdowns, no metrics, no playable links —
  nothing a hiring designer can evaluate.

### Technical debt on the current site
- **Google Analytics UA tag (UA-115155070-1) — dead.** Universal Analytics stopped collecting
  data in July 2023. Zero visitor data is being recorded. Must migrate to GA4 (or Plausible).
- 2018-era stack: jQuery 3.3.1, fullPage.js (scroll-jacking — poor mobile UX), barba.js 1.0,
  Font Awesome CDN. Heavy for what the site does.
- SEO basics missing: no `<meta name="description">`, no canonical URLs, no `sitemap.xml`,
  no `robots.txt`, no JSON-LD structured data. `og:locale` is invalid (`sp_ES` → `es_ES` or
  `en_US`). Typos in markup (`target="_balnk"`).
- Resume links out to a Google Drive PDF — recruiters bounce off that.
- Inconsistent contact identity: site uses aitormorales@honeybungames.com, CV uses
  aitor21m@gmail.com. Pick one canonical email everywhere.
- Old CV image has errors: "R1D10HEAD", "LOVE AT FIRST BITE 2023/2004", "English 2nit language".

---

## Vision

One coherent professional identity across site + CV + LinkedIn + itch.io:

> **Aitor Morales — Game & Level Designer who ships.** Designs systems and levels for live F2P
> games, prototypes his own tools, and takes features from spec to launch across Unity, Godot
> and Babylon.js.

The site's job: within 30 seconds a recruiter sees (1) current senior-level industry work,
(2) playable proof, (3) how you think as a designer.

### The "Living World" concept (decided July 2026)
The site is a space scene that **grows with Aitor's career**: every shipped game and job adds an
element to the world (the asteroids/moon already represent Blaster Buds). Planned additions —
e.g., a vampire/dating motif drifting in for Love at First Bite, a patrolling robot for R4D10HEAD,
a bird for Birds of a Feather, a city skyline glow for Gimica's mobile portfolio. Each element is
clickable and leads to its case study. This concept itself becomes a talking point: the portfolio
*is* a designed system that visibly versions with the career.

### Feature parity commitment (decided)
This is a rebuild that **keeps and improves the beloved features** of the current site, not a
minimal replacement: seamless page transitions, parallax scene reacting to mouse **and gyroscope
on mobile**, full-screen imagery, letter animations. The change is under the hood — same magic,
modern engine:

| Current (2018 stack) | Rebuilt with |
|---|---|
| barba.js page transitions | View Transitions API (native, with graceful fallback) |
| parallax.js + jQuery | Lightweight vanilla parallax + DeviceOrientation (gyroscope) |
| fullPage.js scroll-jacking | CSS scroll-snap sections (native feel, mobile-friendly) |
| anime.js letter animations | CSS/WAAPI animations, `prefers-reduced-motion` respected |
| Font Awesome CDN icon font | Inline SVG icons |
| jQuery 3.3.1 | Removed entirely |

---

## Phases

### Phase 0 — Positioning & asset gathering (no code)
- [x] Canonical email decided: **aitormorales@honeybungames.com** (primary),
      aitormorales94@gmail.com (fallback, shown as secondary on resume).
- [x] Visual identity decided: **evolve the space theme into the "Living World"** (see Vision).
- [ ] Decide canonical positioning line.
- [ ] Collect assets per project: gameplay GIFs/video, screenshots, level maps/diagrams,
      design doc excerpts, jam results, store/press links.
- [ ] Write the Gimica work summary (respecting NDA limits — describe systems and process,
      use relative metrics like "+X% retention in A/B test" if allowed, or describe without numbers).
- [ ] Design the scene element for each game/job (sketch pass before build).

### Phase 1 — Content: case studies (highest-value work)
Write 4–6 case studies with a consistent structure recruiters can skim:
**Role & team → Constraints → Design problem → Decisions (with visuals) → Outcome → What I'd do differently.**
- [ ] Professional work: Gimica (systems/level design at scale), Luzia demo (Bliss Pictures).
- [ ] Own games: Love at First Bite (shipped, ongoing), R4D10HEAD, Blaster Buds (jam winner —
      lead with the award), Birds of a Feather (solo dev — proves technical range).
- [ ] Embed playable itch.io builds directly in case study pages.

### Phase 2 — Website rebuild (decided: rebuild with feature parity + Living World)
Lightweight static site (semantic HTML + modern CSS + minimal vanilla JS), hosted on GitHub
Pages as now. See the parity table in Vision — every current feature is kept or upgraded.
- [ ] Pages: Home (living space scene + featured work) · Work (all case studies) · Case study
      template · About · Resume (HTML) · 404.
- [ ] Rebuild the parallax scene: mouse + gyroscope, clickable game elements linking to case
      studies, `prefers-reduced-motion` respected.
- [ ] Seamless page transitions via View Transitions API.
- [ ] Mobile-first; scroll-snap sections instead of scroll-jacking.
- [ ] Performance budget: Lighthouse ≥ 95, LCP < 2s on mobile.

### Phase 3 — CV/Resume system (two artifacts, one source of truth)
- [ ] **`/resume` HTML page**: visually strong, linked from nav, printable via print stylesheet
      → generates the PDF (single source of truth, never drifts).
- [ ] **ATS-safe PDF**: single column, standard section headings (Experience, Education, Skills),
      real text (no icon fonts for key info), reverse-chronological, quantified bullets,
      keywords matching job posts: level design, systems design, game economy, F2P, LiveOps,
      A/B testing, Unity, C#, Godot, Babylon.js, Figma, GDD, prototyping.
- [ ] Lead with Gimica; compress pre-2022 into short entries; fix all typos/dates.
- [ ] JSON-LD `Person` + downloadable PDF on the resume page so AI recruiters parse it cleanly.

### Phase 4 — SEO & discoverability
- [ ] GA4 (or Plausible) replacing dead UA tag.
- [ ] Per-page titles/meta descriptions targeting "game designer Madrid", "level designer",
      project names; canonical URLs; fixed OG tags + real OG images per page.
- [ ] JSON-LD: `Person` on home/about, `CreativeWork`/`VideoGame` on case studies.
- [ ] `sitemap.xml`, `robots.txt`; submit to Google Search Console.
- [ ] Cross-link everything: site ↔ LinkedIn ↔ itch.io ↔ GitHub (consistent name/headline/avatar).

### Build status (branch `website-v2`, July 2026) — v2.2 after Aitor's design review
Aitor's verdict on v2.1: worse than the old site — free-scroll home lost the slide feel, curtain
transitions missing, hamburger broken, horizontal overflow, disliked the generated SVGs, buttons
felt "AI". v2.2 rebuilt faithfully on the v1 architecture (extracted from `main`'s common.css /
common.min.js) with modern dependency-free code:
- ✅ FullPage slide sections restored on home (wheel/touch/keyboard, 1s cubic-bezier like v1),
  left nav dots with labels, hash anchors, moon slides out on leave, letters slide in per section,
  double-cover panel sweeps, page numbers rise — the v1 anime.js timelines re-created in CSS.
- ✅ Curtain page transitions on every internal link (barba.js-style, all browsers) + prefetch
  on hover. Loader curtain on first visit.
- ✅ v1 fullscreen gradient menu (two-bar icon → X, staggered giant links) — fixed the v2.1
  breakage (backdrop-filter containing block); nav now lives outside the header.
- ✅ v1 button style restored (solid violet pill), 62.5% rem base, v1 title/border language.
- ✅ Placeholder scene SVGs deleted; hero uses original moon + asteroids + stars. Gimica/Luzia
  use typographic panels. Living-World element idea parked until real art exists.
- ✅ Gimica facts scraped & added (Berlin, founded 2021; JustPlay: 35+ games, 25M+ downloads,
  500K+ DAU) — stats row on the Gimica page.
- ✅ Responsive verified programmatically: no horizontal overflow at 360×800, 800×360, 1280×800
  on home/about/resume/project pages; short-landscape falls back to normal scroll.
- ✅ Cache-busted asset URLs (?v=…). Gyroscope parallax kept (iOS permission button).
- ⏳ TODO: GA4 tag (Aitor must create the property), image optimization (GIF→MP4/WebM),
  delete unused v1 assets after sign-off, Search Console after launch, Aitor's visual pass
  on a real browser + phone (pane can't render animations).

### Phase 5 — QA & launch
- [ ] Accessibility pass (contrast, keyboard nav, alt text, heading order).
- [ ] Cross-device test (mobile Safari/Chrome, desktop), print test of resume.
- [ ] Run the resume PDF through an ATS parser check.
- [ ] Ask 1–2 industry friends for a 30-second recruiter-simulation review.
- [ ] Update LinkedIn (link to site, refresh headline/featured section) and itch.io profile.

---

## Asset inventory (July 2026)

### In repo now
- `assets/img/projects/<game>/` — covers + screenshots scraped from Aitor's itch.io links for:
  blaster-buds, r4d10-head, birds-of-a-feather, love-at-first-bite, la-ruleta-del-infortunio.
  ⚠ The GIFs are 2–3 MB each — convert to MP4/WebM (or optimized stills) before production use.
- `assets/img/scene/` — placeholder SVGs for the Living World scene, drawn in the site's
  two-tone flat style: `justin-squirrel` (Gimica/JustPlay), `vampire-heart` (Love at First Bite),
  `r4d10-robot`, `bird-feather`, `roulette-wheel`, `rainbow-luzia` (Bliss).
  Review them at `assets/img/scene/_contact-sheet.html` (serve repo root, e.g. port 8734).

### Missing — Aitor to provide when possible (placeholders used meanwhile)
- [ ] **Justin the squirrel official art** (JustPlay mascot) — current SVG is a generic squirrel.
      Also confirm Gimica/JustPlay logo usage is OK.
- [ ] **Luzia: Rainbow in the Darkness** — any key art, screenshots, or trailer link for the demo.
- [ ] **Viktor's Mayhem** — itch.io link or assets (not among the links shared).
- [ ] **Love at First Bite** — current-build gameplay video/GIFs (store screenshots are static).
- [ ] **Level-design artifacts** — annotated level maps, editor screenshots, GDD/spec excerpts
      (NDA-safe) — these are the strongest possible portfolio material for level/technical design roles.
- [ ] **Updated portrait photo** (current one is from ~2021).
- [ ] **Older projects decision**: include Pizzarre / Finding the Colmers (had IGN, HobbyConsolas,
      Vandal coverage — worth a "press" mention) / Nyama? Assets exist?
- [ ] **La Ruleta del Infortunio** — confirm Aitor's exact role/credit on this jam game.
- [ ] Gimica metrics shareability (relative percentages OK?).

## Decisions log
1. ✅ **Rebuild with feature parity** — keep transitions/parallax/gyroscope/imagery, modernize the engine. (July 2026)
2. ✅ **Visual identity: Living World** — space theme evolves, each game/job adds a scene element. (July 2026)
3. ✅ **Email**: aitormorales@honeybungames.com primary, aitormorales94@gmail.com fallback. (July 2026)
4. ✅ **Gimica representation**: no game names. Represent via **Justin the squirrel** (JustPlay
   mascot) and link to JustPlay (https://justplayapps.com/). Describe systems/process, not titles.
   Metrics shareability still open — use qualitative outcomes until confirmed. (July 2026)
5. ✅ **Bliss Pictures case study**: talk about **"Luzia: Rainbow in the Darkness"** (demo). (July 2026)
6. ✅ **Assets strategy**: placeholder art now — scrape covers/screenshots from Aitor's shared
   itch.io links + generate representative SVGs; Aitor replaces with real assets over time. (July 2026)
