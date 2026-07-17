# V5 CONCEPT — "THE LONG SHOT"

*A portfolio you don't scroll. You traverse it.*
*July 2026. Supersedes V4_CONCEPT.md ("Greybox/Gold"), which was — correctly called out — a reskin.*

---

## First, the honest post-mortem of v4

v4 failed the brief for one specific reason: **it inherited v3's entire skeleton.** Both are the same website underneath —

| The shared skeleton (v3 = v4) | Why it reads as "the same site" |
|---|---|
| Vertical scroll, top to bottom | The reader's body does the identical thing |
| One stacked section per project | Same rhythm, same pacing, same shape |
| Hero on top → projects → about → contact at the bottom | Same information order, same mental map |
| A header with nav links | Same wayfinding model |
| Content fades/reveals on scroll | Same motion vocabulary |
| Rectangular blocks on a flat page | Same spatial model (2D, no depth) |

v4 repainted every one of those boxes and left the boxes. **"Greybox/Gold" was a theme, not an architecture.** This document keeps exactly one idea from it — that a level designer's portfolio should make its *design thinking* legible — and rebuilds everything else from zero.

---

## The pitch

**The portfolio is a single, continuous, side-scrolling level, and the visitor traverses it as one unbroken cinematic camera move — a "long shot."**

There is no scrolling down a page. There is a *world* that runs left-to-right, rendered in 2.5D with real depth, and you move a camera (and a small avatar — the pigeon) through it. Each project is a **zone** of the level with its own art direction, atmosphere, and — the crucial part — a **playable micro-interaction that teaches that project's design pillar in five seconds of doing, not a paragraph of reading.**

You don't read "R4D10HEAD is about the trade-off between moving (loud) and stopping (blind)." You walk into the R4D10HEAD zone, and moving lights you up while enemies turn; stop, and the screen goes dark and quiet. You *feel* the pillar. That is the whole thesis: **a level designer's portfolio should be a level, and every claim should be a mechanic you can touch.**

This is not "a platformer gimmick." It is the single most direct possible demonstration of the exact skill being hired for. Bruno Simon builds a driving game because he sells WebGL; Aitor builds a traversable, legible, well-paced level because he sells level and systems design. The medium *is* the portfolio.

---

## What is fundamentally different from v3/v4 (the architecture, not the paint)

1. **Axis flips: vertical → horizontal traversal.** The body's core motion changes. Scroll-wheel, arrow keys, drag, and swipe all drive a camera moving *through a world*, not down a page.
2. **Depth becomes hierarchy: flat page → 2.5D with a Z-axis.** 5–7 parallax layers. Foreground = interactive & primary. Midground = content. Background = atmosphere. Importance is expressed in *space*, the way a level designer actually stages a scene, not in font-size on a flat plane.
3. **Navigation becomes diegetic: header links → the pacing curve.** The persistent nav is a **level-design intensity curve** (the classic tension sawtooth) running along the bottom. It is simultaneously the progress bar, the scrubber (grab it, fly anywhere), the minimap, and a real artifact of the craft. There is no conventional header.
4. **A zoom-out "level map" replaces the menu.** Hit a key / pinch out and the camera pulls all the way back to reveal the **entire portfolio as one hand-annotated level cross-section** — every zone, the critical path, sightlines, pacing notes, in a single blueprint view. This is the "I've never seen this before" screenshot. Click any zone to dive back in.
5. **The visitor has presence: no avatar → a controllable pigeon.** The v3 mascot is promoted from decoration to *the player character*. It flaps when you move, idles when you stop, leads the eye, and reacts to each zone. Presence changes everything about how a site feels.
6. **Information is staged, not stacked.** Stats aren't a `<div>` row — the "50+ / 25M+ / 500K+" are **pickups** you pass through, each pinging as it's collected. A résumé isn't a page — it's a **character sheet / stats screen**. A case study isn't scrolled — you *enter the room* and the camera pushes in.
7. **Rendering: DOM document → real-time scene.** Canvas/WebGL particle systems, per-zone volumetric lighting, motion trails, physics on the avatar, a camera with easing and push-ins. VFX is finally load-bearing because the level *is* the demo.
8. **Fidelity is a world-state, not a color theme.** v4's best idea, spatialized: toggle the whole world between **BLOCKOUT** (greybox geometry, flow arrows, sightline cones, pacing annotations — the design intent) and **GOLD** (fully arted, lit, particled — the shipped result). Now it's not two skins of a document; it's two build-states of a *level*.

---

## Creative direction

A single continuous tracking shot through a handcrafted level, the way the best Metroidvanias open — the camera knows where to look, pushes in for intimacy, pulls back for awe, and never cuts. The visitor is a playtester walking the critical path while the designer's intent is visible in the world's bones. Curiosity (this is a *place*) → mastery (I can move, I can look, I can play) → recognition (every room is teaching me how he thinks) → trust.

## Mood

The quiet confidence of a vertical slice — the one polished, playable segment a studio builds to prove a game is real. Golden-hour light raking across clean vector geometry. Dust in the air. The satisfying *thunk* of a well-tuned camera. Playful but never noisy; the wit is in the level design (a secret room, a sightline gag, a pacing note that breaks the fourth wall), not in decoration.

## Visual language

- **2.5D vector world.** Clean geometric shapes, bold silhouettes, generous negative space read as *sky* and *distance*. Not pixel-art (too retro, wrong signal), not photoreal (too heavy) — a crafted, illustrative, modern-vector look (think Monument Valley's clarity meets a AAA level-blockout's honesty).
- **Palette per biome.** The world moves through light: HERO at cold dawn-blue, GIMICA in a warm productive amber ("the hub"), the boss-room (Love at First Bite) in blood-rose dusk, the jam zones each with a signal hue, EXIT at night. Color tells you where you are in the level with your eyes closed.
- **BLOCKOUT state** is the one constant: strip any biome and underneath is the same honest greybox — grid, dimension ticks, flow arrows, orange (`#FF5C1F`) for intent. Toggling to blockout mid-traverse is like a designer flipping on wireframe view in-engine.
- **Typography:** display in a strong variable grotesk (Space Grotesk / Clash class) used at *architectural* scale — letters are objects in the world, not text on a page. Mono (IBM Plex Mono) for all diegetic HUD, annotations, the pacing curve, telemetry. Type has depth and casts light.
- **Depth cues everywhere:** atmospheric haze on far layers, motion blur on fast camera moves, focus/DOF pulls when the camera pushes into a room, parallax that actually reads as distance.

## Motion language

Motion is the whole point now. The vocabulary:

- **The camera is the narrator.** One continuous move; eased tracking (lerp toward target), anticipatory drift, push-in on room entry (scale + DOF), pull-back for the map. It leads slightly ahead of the pigeon in the direction of travel — it *anticipates*, like a good platformer cam.
- **Avatar life:** the pigeon flaps on the move, idles with a breathing bob, banks into direction changes, trails a few motion-ghosts at speed, and reacts per zone (perches on the résumé, spooks in the stealth zone).
- **Parallax as physics:** layers drift at depth-scaled rates; near layers overshoot slightly on stop (inertia), far layers glide. The world has *weight*.
- **Particle atmosphere:** drifting motes/dust/embers per biome on a canvas layer; density and hue are biome-scored.
- **The fidelity flip** is a wipe of "rendering" across the viewport — blockout dissolves into gold along a sweep, ~600ms, everything else holding position (object constancy absolute).
- Everything obeys `prefers-reduced-motion`: the camera stops easing and *cuts* cleanly between zones, particles freeze, parallax flattens, and the experience becomes a calm, navigable set of rooms — still spatial, never nauseating.

## Interaction ideas (the memorable ones)

1. **Traverse the level.** Wheel / arrows / drag / swipe move the camera through the world. It feels like moving through a game, not reading a page — the core novelty.
2. **The pacing curve = nav.** Grab the tension curve along the bottom and scrub the entire portfolio like a video timeline. Zone labels ride the peaks. It's a scrubber, a minimap, a progress bar, and a level-design artifact in one object.
3. **Pull back to the blueprint.** One gesture zooms the camera out to the full annotated level cross-section — the whole career as one readable map. Click a zone to dive in. This *is* the site map, and it's beautiful.
4. **Per-zone playable pillars** (the heart):
   - *Blaster Buds* — a 3×3 board where your move is mirrored by a rival token. Two clicks and you understand the whole game.
   - *R4D10HEAD* — move the camera and you emit light+sound (enemies orient to you); hold still and the world darkens and quiets. The pillar, embodied.
   - *Love at First Bite* — a swipe-deck micro-demo (spot the vampire) *and* the full playable itch build in the boss room.
   - *Gimica* — walk the feature pipeline: a token rides BRIEF→SPEC→PROTO→BUILD→QA→A/B→ROLLOUT, and the A/B gate literally forks.
5. **Stats as pickups.** The credential numbers float in the GIMICA zone; passing through collects them with a satisfying ping and they dock into a persistent HUD — proof you *earn* as you move.
6. **The character sheet.** The résumé/skills as an RPG stats screen (skill tree, XP-style timeline), openable anywhere — the same data as a downloadable PDF for recruiters who want the boring version.
7. **Secret room.** A hidden vertical shaft the pigeon can find (the flock/easter-egg spirit from v4, evolved) containing the site's own postmortem and a thank-you.

## Hero experience

Cold open: dawn-blue sky, a single ground plane, dust drifting, and the pigeon idling at screen-center. Foreground: **"AITOR MORALES"** as enormous vector letterforms standing *in the world* like level geometry — you're seeing them at an angle, with depth, casting long dawn shadows. Above, small mono: `THE LONG SHOT — ONE LEVEL, ONE TAKE · GAME & LEVEL DESIGNER`. A gentle prompt: `▸ scroll / drag / → to move`.

The instant the visitor gives *any* input, the camera eases right and the letters part with parallax to reveal the tagline suspended in space — **"Game & level designer who ships, and builds what he designs."** — and the GIMICA credential glows on the horizon as the next objective. The site has, in one gesture, taught its entire control scheme and its whole value proposition, and the visitor is already *playing*. No loader, no tutorial, no wall of text. First input = first delight.

## The traversal journey (replaces "scroll journey")

One unbroken camera move, left to right, biome to biome:

1. **DAWN — Hero.** Controls taught by doing. Tagline + credential-on-the-horizon.
2. **THE HUB — Gimica (amber).** The headline credential as the level's central plaza. Stat-pickups; the feature-pipeline walkway; the A/B fork. The "now."
3. **CHAMBER — Blaster Buds (vacuum blue).** Enter the room; camera push-in; the mirror-board micro-game.
4. **BOSS ROOM — Love at First Bite (blood-rose dusk).** The largest space; the swipe-deck taste, then the full playable build lit like a monitor in the dark; the pressure-economy diagram in blockout on the walls.
5. **THE SHELF — jam zone (R4D10HEAD stealth beat + Birds + Viktor's).** Three compact rooms, each a one-mechanic taste.
6. **THE STUDIO — Commentary/About (interior).** The pigeon perches; dev-commentary nodes; the character-sheet résumé opens here.
7. **NIGHT — Exit.** Level-complete: the traversal telemetry (path %, time, rooms played, secrets) resolves into a results screen and the email, huge, under the stars.

At any point: pull back to the blueprint map; flip blockout↔gold; or hit **Read Mode**.

## The non-negotiable: Read Mode (this is what keeps it a portfolio)

The framework is law: the visitor's job is *find evidence, fast*, sometimes on a train, on a phone, with a screen reader. So the spatial world is **progressive enhancement over a complete, fast, accessible document.**

- **Read Mode** is one key (`R`) / one button away, and is the *default* for: no-JS, `prefers-reduced-motion` (if the user also indicates low-power), screen readers, and narrow/low-power mobile. It is a clean, refined vertical document — essentially the best of v3 — carrying 100% of the content.
- Every zone has a real URL (`/#gimica`), the **back button steps through zones**, deep links land correctly, and the pacing-curve is keyboard-operable.
- The spatial experience must never be a *toll* on the content. A recruiter can get everything in 60 seconds in Read Mode; a design lead can play the level. Both are first-class.
- **The tradeoff, named out loud** (per the framework): a traversable level costs first-load weight and asks more of the visitor than a document does. We pay it *only* because, for this specific audience and this specific candidate, the medium is itself the strongest evidence — and we fully refund anyone who doesn't want to pay, via Read Mode. That refund is not a fallback bolted on; it's designed first.

## Technical implementation

- **Rendering:** DOM/SVG for crisp typography and UI + a `<canvas>` layer for particles/atmosphere; parallax via GPU `transform: translate3d` on layered elements driven by one `worldX` variable. A camera loop (rAF) lerps `worldX → targetX`. This gets 90% of the "AAA" feel with none of a full engine's weight and stays debuggable and accessible.
- **Optional WebGL tier:** for capable desktops, upgrade select layers to WebGL/Three.js (real DOF, lighting, volumetric dust) behind a capability + `prefers-reduced-motion` check. Never required; pure enhancement.
- **Physics/feel:** lightweight — avatar inertia and camera easing are a few lines of lerp/spring math, not a physics library.
- **Performance:** the world streams by zone (each biome's heavy art lazy-loads as it approaches); blockout assets are near-free (flat vector). Hero is type + CSS = sub-second first paint; particles boot after. Budget target: interactive under ~2.5s on mid mobile, with Read Mode instant.
- **Accessibility:** full keyboard traversal, focus order in the document layer, `prefers-reduced-motion` → cut-camera + frozen particles, Read Mode for AT, AA contrast in both fidelity states, every micro-interaction has a non-interactive equivalent statement in Read Mode.
- **Build order:** ① traversal engine (worldX camera + parallax + input) ② pacing-curve nav + zoom-out map ③ hero + Gimica hub as the vertical slice ④ one playable pillar (Blaster Buds mirror-board) ⑤ fidelity flip ⑥ Read Mode ⑦ remaining biomes ⑧ WebGL tier + secret room as polish.

## What this refuses

Loaders and tutorials (the hero teaches by play). A conventional header. Vertical scrolling as the primary axis. Decorative motion (every move is camera, avatar, or feedback). And anything that makes the content *hostage* to the spectacle — Read Mode is the standing guarantee that it never is.

---

*Message unchanged and sacred: Madrid game & level designer who ships and builds what he designs; Gimica × JustPlay is the headline credential; the evidence is playable. v3 stated it. v4 restyled the statement. v5 makes you walk through it.*

---

## Prototype status

A working proof-of-concept of the core model lives at `v5/` (noindex, separate from the live site): the traversal camera, 2.5D parallax depth, the controllable pigeon, the pacing-curve scrubber nav, the blockout↔gold world-flip, a stat-pickup moment, the Blaster Buds mirror-board playable pillar, and the Read Mode escape hatch. It is a *slice*, not the finished site — built so the ambition can be felt, not just read.
