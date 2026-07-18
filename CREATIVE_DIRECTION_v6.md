# The Officer & the Nebula
### Creative Direction — aitormorales.com v6

> A gallery-at-night for a systems designer. Oxblood walls, warm-bone type, matte
> grain, museum wall-labels, and a nebula you only see once. Two eras of type
> colliding to make a third — exactly the way his games collide two genres to make a game.

**Status:** proposed direction, pending build. Supersedes the abandoned v4/v5 concepts
(which were "reskins of v3"). This is deliberately *not* a reskin — it's a different thesis
about what the site is.

**Source:** synthesized from four parallel research passes (award-tier interactive
portfolios; WebGL/motion craft; art direction & exhibition design; games-industry hiring
reality). Reference appendix at the end.

---

## 0 · The one rule that governs everything

> **Art on the surface. Evidence one click deep. Always a fast lane around the art.**

The artistic vision and the hiring outcome only conflict if the art *gates or buries* the
work. Every decision below is checked against two readers: the **recruiter** (10–20s, non-expert,
needs role + headline credential + resume + contact + playable build immediately) and the
**design lead** (goes deep on *how you think* — process, iteration, systems logic). The
exhibition wows the second; a boring-fast lane must never lose the first.

---

## 1 · Brand Interpretation

The reference image (naval officer, nebula for a face) is Aitor's résumé as a picture: a rigid
18th-century uniform (order, craft, discipline, history) fused with a cosmos where the face
should be (the interior, the unknown, the system underneath). Two incompatible things forced
into one frame to make a third.

That is literally his stated design DNA — **Papers, Please × Reigns = Love at First Bite** — and
his working identity twice over:

- **Designs systems, then builds them** → every finished thing has a *substructure*
  (greybox, state machine, economy loop) beneath the gold.
- **Never picked a side** between design and code → the classical craftsman and the machine,
  in one person.

The brand is not "space." It is **duality and collision: nothing here is only its surface.**

## 2 · Core Concept

**Surface ⇄ Substructure.** The site is a gallery-at-night where every artifact — the hero
portrait, each game, even the navigation — has a hidden layer underneath that the visitor
excavates. The face dissolves into cosmos. The finished level peels back to greybox. The
shipped game resolves into the collision that made it.

**The whole experience is the sentence "I design systems, then build them," turned into
something you feel with your hands.** One committed idea — expressed as entrance, scroll,
reveal, and identity. That single-mindedness is what separates reference-grade sites
(Santamaria, Igloo, Terminal Industries) from trend-salad that never wins.

## 3 · Experience Narrative

Paced like one of his levels — anticipation → reveal → vista → breath → gate — not a page of
sections.

1. **Arrival (no loader).** The world builds itself: a wireframe/blockout scaffold assembles
   in real time into the hero. No spinner, no percentage counter.
2. **The face.** A particle portrait rests as his actual face; on movement/scroll a curl-noise
   flow field unspools it into nebula, then reforms. Identity ⇄ depth in three seconds.
3. **The thesis line.** One true, plain sentence in big serif before any spectacle.
4. **The vitrines.** Each game is an artifact under gallery light. You enter *rooms*, not pages
   (ambient audio muffles "through a door"; thumbnail expands into the case study).
5. **The excavation.** Inside a project, the marketing shot peels to greybox → annotated map →
   systems diagram. The deeper you go, the more of *how he thinks* is exposed.
6. **The collision.** The About chapter is his DNA as a live equation. The one real cosmic
   reveal happens here, and only here.
7. **Contact as a clean exit**, never a gate.

## 4 · Visual Direction — "Gallery at Night"

**Retire Futura.** Era-less and over-exposed; it can't carry the classical-vs-cosmic tension.
Replace with a **three-voice type collision** that spells the concept out in the letters:

| Voice | Role | First choice | Free alternative |
|---|---|---|---|
| **The Uniform** — high-contrast display serif | Hero lines, titles, equations | GT Sectra Display | PP Editorial New / Canela |
| **The Present** — modern grotesque | UI, body | Söhne | Neue Montreal / Inter |
| **The Machine** — monospace | Wall-labels, dates, the `×` and `=` operators | GT America Mono | Space Mono / Commit Mono |

### Palette — "Gallery at Night" (dark, default)

| Token | Hex | Role & rule |
|---|---|---|
| Void | `#0C0A0D` | Page background — near-black with a red-violet cast, **never `#000`** |
| Oxblood | `#4A121A` | The "walls" — large blocks, section thresholds |
| Maroon Deep | `#5B1620` | Raised surfaces / vitrines / cards |
| Ash Rose | `#C29A9C` | Secondary text, 0.5px ledger hairlines, captions |
| Star Bone | `#EFE6D8` | Primary type — warm off-white, **never `#FFF`** (biggest anti-AI move) |
| **Nebula Verd** | `#5F7A66` | **The only accent** — links, active states, the `=`, focus. Cap ~5% of any view |
| Starlight | `#E4C978` | Pinpoint glints, focus dot — used like punctuation. **<1%** |

### Palette — "The Catalogue" (light, secondary)

| Token | Hex | Role |
|---|---|---|
| Bone Paper | `#ECE3D4` | Warm paper background |
| Void Ink | `#1A1416` | Body text |
| Oxblood | `#4A121A` | Headlines / ink accents (carries across modes) |
| Ash Rose | `#B98A8C` | Rules and tints |
| Nebula Verd (dk) | `#4C6A54` | Accent, darkened for AA on paper |

**Usage discipline:** ~70% Void/Oxblood · ~22% Star Bone/Ash Rose · ~5% Nebula Verd · <1% Starlight.

**Materiality that kills the template look:**
- **Duotone-grade all game media** into Oxblood→Star Bone (eight genres read as one exhibition);
  reserve *one* full-color still per project as its reveal.
- **Ban raw CSS gradients** — grain-dither any ramp (`feTurbulence`) so it reads risograph, not default-tool.
- **Film grain everywhere at 5–8%** (`feTurbulence` overlay, `pointer-events:none`, `aria-hidden`) so
  screens read as matte gallery prints. Rasterize to a small tiling PNG on mobile.
- **Hairline ledger rules** (0.5px Ash Rose) as the "engineering-drawing" layer.
- **The real nebula appears exactly once.** Scarcity is what makes it land like the face finally turning.

## 5 · Interaction Language

- **Excavation over decoration.** A soft spotlight/flashlight cursor exposes the layer beneath the
  surface (radial-gradient mask — the quick-win route to Greybox→Gold). Hold/hover peels a systems
  diagram out from under a marketing shot.
- **Rooms, not pages.** Cross-document View Transitions expand a thumbnail into a case-study hero;
  Web Audio lowpass-muffles the ambient bed on entry.
- **Physics you feel.** Magnetic cursor (lerp ~0.15, pull that ramps with proximity); depth-map
  parallax gives the portrait volume.
- **The index is a system, not a card grid** — projects numbered `Nº 01…08` with museum wall-labels:
  `Nº 04 · 2024 · Dating sim × political roguelike · Design + build · Unity · Status: SHIPPED`.
- Everything **pointer-gated** (no custom cursor/magnetism on touch) and **reduced-motion-safe**.

## 6 · Motion System

Cinematic, engineered, narrative-bound. Motion must resolve a story beat (identity, depth, a
project's mood), never perform. Philosophy: **one signature, many whispers** — exactly one
show-stopper (the particle portrait); everything else quiet (type resolving into focus, reveals
that wipe not pop, a cursor that lags). Timing favors physical plausibility (real easing,
believable depth, bloom that behaves like light) because *engineered* is the brand, not decorated.

**Every effect passes three gates before shipping:** survives `prefers-reduced-motion`; holds
60fps on a mid Android (degrades, not dies, below); and makes a lead remember **the work, not the effect**.

## 7 · Information Architecture

Reorganized around narrative *and* the recruiter's clock.

- **Masthead** always carries the non-negotiables: role + seniority, the **Gimica headline credential**,
  resume (one click), contact, playable links.
- **Hero** → thesis line → **Work** (3–5 curated, strongest first, not chronological) → per-project
  **case rooms** → **About / collision + the single cosmic reveal** → **Contact.**
- Each **case room** follows the hiring-proven shape:
  *hook (motion) → fact block → "what **I** built" → problem → **process evidence** → playtest/data →
  outcome + "what I'd do next."*
- A dedicated **NDA-safe systems exhibit** — a live Machinations-style economy diagram/sim (built on a
  jam game or Love at First Bite) — proving F2P/economy/LiveOps thinking that can't be shown from Gimica directly.

## 8 · Technical Direction

**Verdict: stay vanilla and static — layer capability, not a framework.** The existing multi-page
HTML/CSS/JS is the durable base and the fallback.

- **Tier 0 — content/layout:** unchanged semantic HTML; renders fully with zero JS (protects SEO, load,
  maintainability for a solo dev).
- **Tier 1 — motion:** CSS-first (native scroll-driven animations + View Transitions — which *reward* the
  MPA), plus **Lenis + GSAP** (now 100% free, all plugins) only where CSS can't reach.
- **Tier 2 — one Three.js canvas:** the GPGPU particle-portrait hero, lazy-loaded (dynamic `import()`),
  mounted only in view, never blocking first paint.

**Fallback built first, not last.** A boot check (`prefers-reduced-motion`, `hover/pointer`, WebGL2,
`deviceMemory`, DPR) yields a tier: `full / lite / static`.
- reduce → a single still nebula-portrait frame; View Transitions become instant cuts; freeze all motion.
- low-power / no-WebGL → pre-rendered poster `<picture>`; skip the canvas.
- mobile → down-scale (cap DPR ~1.5, cut particle counts, throttle ambient to ~30fps, drop bloom); don't disable.
- **The site is never dependent on any effect.**

**No React/Next/R3F** — a rewrite's worth of risk for one hero scene, against the brief's own
performance mandate. Cross-document View Transitions, Lenis, and Three.js are all reachable from the
existing static MPA.

**Verified build facts (mid-2026):** GSAP is 100% free incl. former Club plugins (Webflow acquisition).
Lenis ships as the plain `lenis` package (Darkroom Engineering). CSS scroll-driven animations: solid in
Chromium/Safari, still flagged in Firefox stable → enhancement only. View Transitions: same-document is
Baseline (incl. FF 144+); cross-document is Chromium + Safari 18.2+, not Firefox → clean progressive
enhancement. Reach for OGL/curtains.js for lightweight image-shader work, Three.js only for the GPGPU hero.

## 9 · Signature Moments

| # | Moment | Effort | Why it lands |
|---|---|---|---|
| 1 | **Greybox → Gold** — imagery renders as blockout (blockmesh, nav volumes) and resolves to finished art on scroll/hold | High | Simultaneously award-tier and un-copyable by any non-level-designer. It *is* "designs systems, then builds them." The site's one defended idea. |
| 2 | **The portrait made of you** — GPGPU particles rest as his real face, disperse into nebula, reform | High | Renders the reference metaphor literally; visibly engineered (GPU sim, FBO ping-pong, flow field), which is the differentiator. The single bespoke build. |
| 3 | **Flashlight excavation** — cursor light reveals the map/system beneath a dark surface | Quick | Cheap (radial mask), maximally on-theme for "something larger beneath." Quick-win route to #1. |
| 4 | **The collision equation** — operate `Papers, Please × Reigns = Love at First Bite`; hover a factor to see the mechanic it contributed | Quick | Impossible to clone (his DNA), communicates taste instantly, the shareable moment that earns Site-of-the-Day traction. |
| 5 | **The world builds itself** — wireframe scaffold assembles into the hero on arrival; no loader | Mid | Separates the site from 90% of portfolios; re-states "I build it" in three seconds. |
| 6 | **Muffled-room transitions** — ambient audio lowpass-filters when entering a project | Quick | ~20 lines of Web Audio, huge perceived polish, makes projects feel spatially *inside* the world. |
| 7 | **The economy that runs** — a live NDA-safe Machinations sim you can tweak | Mid | The rare place where "interactive art" and "hiring evidence" are the same object. |

## 10 · Why This Design Exists

Every decision reinforces one claim rather than showing off: the surface/substructure duality *is*
his craft; the type collision *is* his design DNA; the "build itself" entrance *is* "I build what I
spec"; the reduced-motion rigor *is* the systems-engineer's discipline made visible.

---

## What lands — commit

- ✅ **Surface⇄Substructure** as the site's one idea (Greybox→Gold + particle portrait + flashlight).
- ✅ **"Gallery at Night"** art direction — palette, three-voice type, wall-labels, duotone media, grain, cosmos-once.
- ✅ **Vanilla + progressive enhancement**, everything degrading to a fast static site.
- ✅ **The process layer** — sketch→greybox→iteration→final with annotated maps + "what I cut and why."
  *This is the #1 gap and the highest-ROI work.*
- ✅ A **recruiter fast-lane** — role, Gimica headline, resume, contact, playable build in ~20s; the WebGL is opt-in, never a gate.

## What to cut — do not be seduced

- ❌ Bruno-Simon "drive-a-jeep-to-projects" (recognized 2026 template; exists only to impress).
- ❌ Fake OS / fake game HUD / desktop metaphor (banned by the brief; undercuts "I build real things").
- ❌ Percentage-counter loaders, forced intro animations, scroll-jacking, autoplay-gated content.
- ❌ Generic gradients / glassmorphism, and **trend-salad** (five WebGL tricks, no through-line — the #1 reason ambitious portfolios don't win).
- ❌ Raw employer metrics — relative-% only ("+18% D7"), anonymized titles, "specifics under NDA" stated plainly.

## Ground rules carried from prior sessions

- The particle hero uses **Aitor's actual portrait** — the reference image influences the *concept*, not literal pixels.
- Gameplay stays **muted MP4** `<video>`; stills stay **WebP `<picture>`**; never animated GIF/WebP.
- Never silently substitute a provided image.

---

## Case-study template (apply to each game)

For each of the 6 works, and 1–2 anonymized Gimica systems studies:

- **A. Hook** — one trailer/GIF/muted-MP4 loop + a one-line "what this is."
- **B. Fact block** — role, engine, studio/team size, duration, platforms, project URL, playable link.
- **C. "My role"** — the specific systems/levels *he personally* built, named plainly, with tools.
- **D. Problem / design goal** — the player experience or metric being solved (1–2 sentences).
- **E. Process evidence (the core / current gap)** — layout sketch → blockout/greybox → playtested
  iteration → final, side by side; four standard views (isometric, plan, section, player-perspective);
  annotated top-down maps (sightlines, cover, pacing, critical path); "what I cut and why"; for systems,
  Machinations-style faucet/sink diagrams.
- **F. Playtest / data** — what was tested, learned, changed (qualitative counts too).
- **G. Outcome + reflection** — result (press, jam win, relative metric) + candid "what I'd do next."
- **H. Attribution** — collaborators and third-party assets.

Presentation: short paragraphs + bullets separated by visuals; don't over-format; clarity beats
artist-grade fidelity for a designer.

---

## Recommended build order

1. **Foundation** — palette + three-voice type + grain + wall-label system on the *existing* static
   structure (no WebGL yet). This alone transforms the site.
2. **One process case study** — rebuild a single project (R4D10HEAD or Blaster Buds) with the full
   greybox→gold evidence shape. Proves the concept end-to-end.
3. **Flashlight excavation** (quick win) → then **the particle-portrait hero** (the deep build).
4. **View Transitions + Lenis choreography** as the connective tissue.

---

## Reference appendix (principles, not pixels)

**Interactive / journey:** Joseph Santamaria (scroll-as-camera with a narrative turn) · Igloo Inc
(no-loader, world builds itself) · Terminal Industries (render↔wireframe reveal) · Phantom Land
(index as a living system) · Obys (type-only award-tier path) · Thibault Introvigne (biography gated
behind exploration) · Samuel Day (hidden interactivity). *Avoid literal Bruno Simon jeep clone.*

**Motion craft:** Lenis + GSAP (free) · native CSS scroll-driven animations · cross-document View
Transitions · Three.js GPGPU particles (Three.js Journey, Codrops "dreamy particle effect") · curl/simplex
flow fields · restrained bloom/grain post · variable-font kinetic type (GSAP SplitText) · magnetic cursor ·
depth-map RGBD portrait parallax.

**Art direction:** Klim Type Foundry (specimen-as-artifact / wall-labels) · Pentagram × Cartier (rooms
as emotionally-graded stages) · Gucci Cosmos / 180 Studios (infinite-depth illusion, used once) · MONOLOG
(type as primary material) · The Record Institute (personal work framed as an institution).

**Hiring reality:** gamedesignskills (two-audience model, process over polish) · Level Design Book
(blockout presentation: layout→blockout→final, four views) · Alexia Mandeville (granular "what I built") ·
Machinations (economy diagrams) · GameMakers F2P LiveOps playbook · NDA guidance (relative-% only, anonymize).
