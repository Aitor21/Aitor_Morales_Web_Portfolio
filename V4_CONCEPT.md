# V4 CONCEPT — "GREYBOX / GOLD"

*A full reinvention of aitormorales.com, conceived as if the site had never existed.*
*July 2026. Concept only — nothing here touches the live v3.*

---

## The one-line pitch

**The portfolio is a level, and the visitor is walking through it while the designer's annotations are still pinned to the walls.**

Every section of the site exists in two states — **EDIT MODE** (the designed intent: greybox, wireframe, annotations, metrics, the "why") and **PLAY MODE** (the shipped result: full art, motion, cinematics, the "what"). The site's single identity move is the transition between them: things *bake* from blockout to gold as you scroll, and the visitor can flip the entire site between the two skins at will.

This is not decoration. It is the exact artifact a game-studio hiring manager scans for — blockout→final, intent→result, spec→ship — promoted from "missing case-study content" (the one gap the July 2026 audit named) to the *organizing principle of the whole site*. The spectacle **is** the evidence.

### Why this passes the Bruno Simon test

Bruno Simon's portfolio is a driving game because he sells WebGL. Aitor sells **level design and systems design that ship**. A site that presents itself as an annotated, playtested level — with visible critical path, sightlines, pacing notes, and end-of-level telemetry — demonstrates precisely the competence being sold, to precisely the audience that can read it. A recruiter gets a fast, legible page; a design lead gets an in-joke they've never seen a portfolio make structurally.

### The three-ideas ladder (what was discarded)

1. ~~"The portfolio is a game you play"~~ — obvious, done, and hostile to a 30-second recruiter.
2. ~~"Deep space, but bigger: WebGL starfield, shader nebulae"~~ — more spectacular v3; decoration demonstrating nothing.
3. **"The portfolio is a level mid-design, and it annotates itself"** — surprising, unfakeable, and every flourish doubles as proof of craft.

---

## Creative direction

The site behaves like a level editor and a shipped game sharing one body. The visitor is cast — quietly, never with a tutorial — as a **playtester** on the level "AITOR MORALES." The designer is present the whole time in the margins: a second, smaller voice in monospace that explains *why the page in front of you is shaped the way it is*, in level-design vocabulary.

Two voices, two layers:

- **The level** (display type, imagery, motion): confident, finished, cinematic.
- **The designer's notes** (mono type, hairline leader-lines, measurement ticks): dry, specific, self-aware. *"Sightline: the Gimica credential is placed on the golden path. You were meant to read it first. You did."*

The self-referential annotation layer is the personality engine. It lets the site be witty without a single adjective, and it converts UX decisions into portfolio content: the page demonstrates breadcrumbing *while labeling its own breadcrumbs*.

## Mood

Walking through a test chamber ten minutes before the texture artists go home. Grid paper and gold light. The calm authority of a spec that survived contact with players. Curiosity → recognition ("wait, the site is doing the thing it's describing") → trust. Never loud, never desperate; the joke is always deadpan and the numbers are always real.

## Visual language

**The flip: v4 is light where v3 was dark.** The base world is the *editor* — a warm paper-and-graphite daylight surface — and darkness is reserved for PLAY MODE moments, where shipped games appear full-bleed like a monitor turned on in a bright room. Dark becomes a reward instead of a default.

- **Palette — EDIT:** bone paper `#F4F1EA`, graphite ink `#1C1E22`, blockout grey `#B8BCC4` (the untextured-BSP grey every game dev knows), grid-line blue-grey at 8% opacity, and one signal color: **playtest orange `#FF5C1F`** — the color of dev markers, nav-mesh debug, and blockout props. Used only for annotations, the critical path, and interactive affordances. One accent, total consistency.
- **Palette — PLAY:** near-black `#0B0C10` with each project bringing its own key light (Love at First Bite's blood-rose, R4D10HEAD's radar green, Blaster Buds' vacuum blue). The space vignette from v3 retires with honor; its pigeon and bats survive as hidden collectibles (see Gamification).
- **Typography:** a hard break from Futura. Display: a variable grotesk with real character at 200px+ (Clash Display or Space Grotesk class — licensed, subset, two weights). Body: same family, book weight, 16px+, 1.6 line-height. **Mono is the co-star, not a label face:** the entire annotation layer runs in it (IBM Plex Mono class), including oversized mono numerals for stats — telemetry as typography. Three faces, ≤4 weights, WOFF2, `font-display: block` (the v3 lesson, kept).
- **Texture:** engineering grid that fades in near annotations; checkerboard "missing texture" pattern as the loading/placeholder aesthetic (an in-joke that doubles as honest skeleton UI); paper grain at 2%; measurement ticks and dimension lines as ornament. No glassmorphism, no mesh gradients — the craft references are Valve dev-commentary, blockout screenshots, and drafting tables, not SaaS.
- **Imagery rule:** every project image exists in two states wherever the source material allows — the real blockout/wireframe/spec sketch, and the shipped frame. Where a true blockout doesn't exist (jam games), the EDIT state is an honest reconstruction: pillars→mechanics table, level map redrawn as a diagram, input maps. Never fake a screenshot; the annotation layer says "reconstructed from the jam postmortem" when it is one.

## Motion language

Motion has exactly one metaphor: **baking**. Everything enters the page the way a level gains fidelity — wireframe → flat grey → lit → final — compressed into 300–450ms, ease-out, transform/opacity only. No fades-from-nowhere; things *resolve*.

- **The bake wipe:** a thin orange scanline sweeps a section once as it enters the viewport; ahead of the line, blockout; behind it, gold. One choreographed moment per section, never replayed on return visits (sessionStorage remembers).
- **Annotations type on** in mono, 12–18 characters fast, with a leader-line that draws from the note to its subject — motion that literally directs attention, the only job motion has.
- **Camera grammar:** sections don't slide, the "camera" dollies — subtle parallax between the grid layer, content, and annotation layer (3 depths, max 24px travel). The v3 snap-deck dies; v4 is honest native scroll with pinned moments only where a diagram needs to assemble (and every pinned moment fits every viewport or degrades — the July 2026 rule is law).
- **The mode flip** (the flagship transition): triggering EDIT⇄PLAY runs a full-viewport bake wipe, ~600ms, and the two skins are the *same DOM* restyled — object constancy absolute, layout stable, text identical. Reduced motion: instant swap, no wipe.
- `prefers-reduced-motion`: bakes become opacity resolves, leader-lines pre-drawn, everything readable and complete.

## Interaction ideas (the memorable ones)

1. **The TAB — Edit/Play switch.** A persistent, labeled control (bottom-right, mono: `[TAB] EDIT MODE`) flips the entire site's skin. In EDIT, annotations, grids, and measurements are visible everywhere and imagery shows blockouts/specs. In PLAY, the site is a clean cinematic portfolio with zero meta-commentary — genuinely fully usable in both, so the gimmick is optional, not a toll. Keyboard: actual Tab is sacred (focus); the key is `E`. This one control is the site's business card.
2. **Playtest telemetry, running honestly.** A hairline HUD strip (mono, top edge) quietly counts the visitor's real session: `PATH: 42% · TIME: 1:12 · NOTES READ: 3`. No tracking beyond the page itself, no cookies — it's scroll math. It demonstrates A/B-test/telemetry literacy and sets up the ending (see Scroll journey §7).
3. **Annotation hover = designer's voice.** Orange annotation markers (`▲ n.04`) sit beside real decisions across the site. Hover/tap opens a one-sentence note in mono: on the Gimica stats — *"Numbers close to claims. See: every site you've ever trusted."* On the contact button — *"Exit placed after the evidence. Standard breadcrumbing."* Fifteen of these, hand-written, replace every "passionate about crafting experiences" sentence the genre usually commits.
4. **Collectibles: the flock.** Five tiny pigeons (the v3 mascot, migrated) hide across the site — in a diagram margin, inside the 404, behind the mode flip. Finding one pings the HUD: `4/5 FOUND`. Finding all five unlocks a single secret annotation: the honest postmortem note of the site itself. Rewarding exploration without gating anything.
5. **Magnetic critical path.** In EDIT mode, a thin orange path line runs down the page — the "golden path" through the level — threading the exact elements a 30-second recruiter must hit: credential → proof → demo → contact. It is simultaneously a skip-nav, a progress indicator, and a level-design artifact. Click any node to jump. (The framework's return-visit rule, wearing a costume.)

## Hero experience

**Cold open, no loader — the blockout paints in under a second because it's just type and CSS grid.**

The viewport is a greybox room: paper background, faint grid, and the name set as *untextured geometry* — "AITOR MORALES" in enormous blockout-grey display caps, flat, unlit, with mono dimension ticks measuring the letterforms like BSP brushes (`≈ 22vw · cap height 0.71em`). Above it, small: `LEVEL 01 — WHITEBOX_v14`. It reads for one beat as a level editor screenshot of a name.

Then the bake wipe crosses once, left to right: behind the scanline the letters take ink and weight, the tagline resolves — **"Game & level designer who ships, and builds what he designs."** — and one annotation types on beside the headline: `▲ n.01 — First read under 5s. That was the spec.` The Gimica credential line (`NOW: GIMICA · JUSTPLAY — 50+ live games · 25M+ downloads`) bakes in immediately below, because the framework is right: the credential is the hero's real payload.

If the visitor flips to EDIT here, the hero returns to whitebox and reveals the sightline diagram of itself — arrows marking the intended eye path (name → tagline → credential → CTA). The hero *is* its own level-design breakdown. That is the "never seen this before" screenshot.

## Scroll journey

One continuous level, native scroll, seven beats. The critical path line threads them all.

1. **WHITEBOX (hero)** — the bake, the credential, the first annotation. Exit breadcrumb: the path line visibly continues below the fold.
2. **THE CRITICAL PATH (Gimica)** — the headline credential as the level's main objective. EDIT state: a feature's real lifecycle drawn as a level map — `BRIEF → SPEC → PROTOTYPE → IMPLEMENTATION → QA → A/B TEST → ROLLOUT`, with the A/B gate drawn as a literal branching path (variant A / variant B / kill). PLAY state: the shipped portfolio (50+ games, 25M+, 500K+ daily) in huge mono numerals. This section is the process-evidence gap, closed, within public-information limits — it documents the *shape* of the work, not confidential numbers, and an annotation says exactly that.
3. **CHAMBER 01 — BLASTER BUDS** — each project is a "chamber" with a doorframe transition (brief dark threshold, project's key light). EDIT: pillars→mechanics table (mirror-movement pillar, its three mechanics) plus the grid logic diagram. PLAY: the shipped puzzle. Annotation: `Jam constraint: 72h. Winner, Mechanics category — the pillar held.`
4. **CHAMBER 02 — LOVE AT FIRST BITE (the boss room)** — the largest chamber, because it contains the site's trump card: the **playable demo**, presented as a monitor lit in the dark, framed by EDIT-mode margin notes (the Papers, Please × Reigns collision formula, the thirst-economy loop diagram, the endings flowchart). The visitor plays an actual shipped system *inside* its own design document. Nothing else on the site needs to work as hard as this moment.
5. **CHAMBER 03 — THE JAM SHELF** — Birds of a Feather, R4D10HEAD, Viktor's Mayhem as three compact chambers on one shelf, each with its one-line design thesis as the *primary* text (v3's best copy, promoted): "Move and you are loud. Stop and you are blind." EDIT state: each shows its single proven idea as a one-diagram spec.
6. **DEV COMMENTARY (about)** — the About section as floating commentary nodes (the Half-Life grammar, uncopied): portrait in PLAY mode; in EDIT mode the nodes open — U-tad, the design/code refusal-to-choose, Honey Bun, Bliss Pictures, Madrid. The skill tree survives as a nav-mesh-style diagram.
7. **LEVEL COMPLETE (contact)** — the ending the telemetry was building toward. A results screen, deadpan: `PATH COVERAGE 94% · TIME 3:41 · NOTES READ 7/15 · FLOCK 2/5 — PLAYTESTER FEEDBACK WELCOME:` and then the email, enormous, with copy-to-clipboard, socials, and the resume link. Annotation: `▲ n.15 — Every level ends at a door. This one opens with an email.` The exit is unmissable, which is the entire point of the genre.

**Case study pages** keep the chamber grammar: each opens IN EDIT MODE by default — spec first, artifact first — with the mode flip revealing the shipped gloss. That inversion (design document as the front door, beauty as the layer behind it) is the portfolio's thesis stated structurally: *this person leads with intent.*

## Section-by-section vs v3 (what each beat replaces)

| v3 | v4 | The reinvention, not the increment |
|---|---|---|
| Space-scene hero + ticker | Whitebox bake hero | Identity move becomes self-demonstrating; ticker's keywords migrate into annotations, where they carry context instead of listing |
| Gimica panel + 3 stats | Critical Path chamber | Stats stay; the feature-lifecycle map is new and is the audit's missing artifact |
| Snap-scroll deck | Native scroll + path line | The scrollbar tells the truth; the deck's drama is replaced by doorframe thresholds |
| Case study pages, outcome-led | Chambers, EDIT-first | Process evidence is the default view, not an appendix |
| About page prose | Dev-commentary nodes | Same facts, explorable; the DNA formula (Papers, Please × Reigns) becomes a diagram |
| Contact panel | Level-complete screen | The only contact section in the genre the visitor will screenshot |
| 404 | `AREA NOT YET BLOCKED OUT` + checkerboard void + one hidden pigeon | The best personality-per-byte page on the site |

## Technical implementation

- **Architecture:** stays static, stays dependency-light — Vite build, vanilla TS + CSS; view transitions API kept for page navigation (v3's best tech, retained). The mode flip is a `data-mode` attribute on `<html>` and two token sets — zero duplicate DOM, instant, resilient.
- **Motion:** GSAP + ScrollTrigger *only* for the bake wipes and the assembling diagrams (the two things IntersectionObserver does badly); everything else stays CSS. No Lenis, no smooth-scroll library — native scroll is a stated feature of this concept. Total JS budget: <90KB compressed.
- **The bake effect:** CSS `clip-path` sweep over two stacked states (grayscale/flat vs final) — compositor-only, no WebGL. The checkerboard and grids are CSS gradients. **No Three.js anywhere:** the concept's entire power is that it demonstrates design thinking, not GPU budget, to an audience evaluating a designer.
- **Telemetry HUD:** ~40 lines of scroll/time math, in-memory only, no storage, no network. Reduced-motion and no-JS: the HUD simply absent, the site complete without it.
- **Accessibility:** both modes AA-contrast-checked (orange `#FF5C1F` on bone paper passes only at large/bold sizes — annotations therefore pair orange markers with ink text, never orange body copy). Annotations are `<button>` + disclosure, keyboard-complete; the path line is a real skip-nav (`<nav>`); collectibles never gate content. Full experience without JS: all EDIT-mode content server-rendered visible, PLAY imagery as the fallback state.
- **Performance:** hero is type + CSS — sub-second LCP on mobile is structural, not aspirational. Two-state imagery uses one `<picture>` per state, lazy below the fold; blockout states are tiny (near-flat WebP compresses brutally well — the aesthetic is a performance strategy). Existing pipeline (`.claude/optimize-images.js`, muted MP4 loops) carries over.
- **Build order (when green-lit):** ① token system + both skins ② hero bake ③ one full chamber (Love at First Bite, since the demo embed exists) as the vertical slice ④ telemetry + annotations ⑤ remaining chambers ⑥ collectibles last, as polish.

## What this concept refuses

Loaders (the bake *is* first paint). Cursor replacement. Scroll hijacking. WebGL spectacle. A tutorial for the conceit — if the metaphor needs explaining, the annotations aren't writing hard enough. And any annotation that isn't true: the voice only works if every note describes a real decision. The moment one note is decorative, the whole level is set dressing.

---

*The message is unchanged and sacred: Madrid game & level designer who ships and builds what he designs; Gimica × JustPlay is the headline credential; the evidence is playable. v4 just stops saying it and starts staging it.*
