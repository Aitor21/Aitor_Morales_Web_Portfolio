# The Anatomy of an Exceptional Website

*The standard against which every design decision on aitormorales.com is evaluated.*
*Written July 2026, from a study of premium product sites (Apple, Stripe, Linear, Vercel, Raycast, Notion, Arc, Framer, Airbnb), the award scene (Awwwards, FWA, Godly, SiteInspire, Codrops and the studios that dominate them — Locomotive, Obys, Lusion, Basement, Active Theory), luxury brands (Aesop, Hermès, Celine), editorial craft (The Pudding, NYT features), and the deliberately plain sites that outconvert all of them (Basecamp, McMaster-Carr, gov.uk).*

---

## The core thesis

Exceptional websites are not decorated — they are **argued**. Every one of the sites people trust, remember, and buy from replaces adjectives with artifacts:

- Linear's hero isn't a screenshot; it's a live simulation of the product working a realistic issue.
- Stripe doesn't say "reliable"; it says **99.999% uptime, 135+ currencies, 50% of the Fortune 100**.
- Vercel puts actual CLI output and customer metrics (Zapier: 100M visits/month) on a marketing page.
- Raycast's social proof is named humans, and its reliability claim is native to its domain: **99.8% crash-free**.
- Basecamp converts with a nearly plain text page, 84 million accounts, and twenty years of testimonials.
- Aesop sells $40 soap with two products per viewport and prose that respects the reader.

The visual system of a great site exists to make its **evidence** legible, and the motion system exists to make its **structure** legible. Everything else is noise. "Premium" is what it feels like when nothing on the page is desperate.

---

## Core principles

**1. Hierarchy is the product of sacrifice.**
One message per viewport. Emphasis on everything is emphasis on nothing; attention is zero-sum and the designer's job is to spend it deliberately.
*Fails when:* content is genuinely dense (dashboards, docs, catalogs) — there, hierarchy must come from structure and typography, not sparsity. McMaster-Carr is beloved *because* it is dense and findable.

**2. Typography carries most of the perceived quality.**
Stripe and Linear feel expensive with almost no imagery. Type is ~90% of an interface's surface; craft there (a real scale, tight tracking on display sizes, generous line-height on body, tabular numerals, true apostrophes) is subliminally read as competence.
*Fails when:* font loading strategy is an afterthought — a flash of fallback or a blocking wait costs more trust than a custom face earns.

**3. White space is confidence made visible.**
Emptiness signals the absence of desperation — the luxury-brand move. But whitespace only reads as intent when the underlying grid is strict; whitespace without alignment reads as unfinished.

**4. Motion must model intent, not decorate.**
Legitimate jobs for animation: preserve object constancy across state changes (the user's mental model of where things went), communicate causality (this opened because you clicked that), and direct attention. UI motion lives at 150–450ms, ease-out entrances, springs only for direct manipulation. One choreographed hero moment per page; everything else quiet.
*Fails when:* it breaks the scrollbar contract, replays on every visit, or delays task completion. Scroll-hijacking's contract is absolute: **every panel fits every viewport, or the controller degrades to native scroll** (learned first-hand on this site, July 2026).

**5. Perceived performance is an emotion, not a metric.**
Instant first paint reads as respect; a loading bar is an apology. Prefetch on hover, optimistic UI, honest skeletons only where content is truly async. Speed is the one aesthetic every audience shares.

**6. Trust is built in details users only notice subconsciously.**
Consistent radii and spacing scale, aligned baselines, branded focus states, correct punctuation, coherent empty/error states. Users cannot articulate craft, but they detect its absence — "something feels off" *is* the distrust.

**7. Narrative wins the first visit; navigation wins every return.**
First-visit structure is a story: promise → proof → process → person → prompt. Returning visitors need shortcuts: persistent nav, a footer sitemap, working deep links and Back button. A scroll narrative that punishes return visits is a brochure, not a website.

**8. Copy is design.**
The best sites read as if one confident person wrote every word. Specificity signals seriousness ("purpose-built for planning and building products"); vagueness is visual noise in verbal form ("passionate about crafting experiences"). Value is carried by nouns and numbers, not adjectives.

**9. One identity decision, executed everywhere.**
Memorable sites make a single ownable move and let it constrain everything: Stripe's gradient mesh, Linear's dark glass, Notion's hand-drawn people, Raycast's keyboard glow — this site's deep-space scene with the pigeon chase. Brand is the constraint that makes a hundred small decisions coherent.
*Fails when:* the move fights usability (novelty cursors that hide affordances, identity colors that break contrast).

**10. Accessibility is a quality forcing-function, not a checkbox.**
Designing for keyboard, contrast, reduced motion, and zoom tightens the design for everyone. Every accessibility failure on an award site is also a usability failure for someone with a trackpad, sunlight, or a train ride.

**11. Progressive enhancement is respect.**
Content in HTML, identity in CSS, delight in JS, spectacle only where the spectacle *is* the message. Bruno Simon's portfolio is a driving game because he sells creative WebGL development — the technology demonstrates the competence being sold. That is the only test advanced tech must pass.

**12. The audience's job-to-be-done governs everything.**
gov.uk, Wikipedia, and McMaster-Carr "outperform" award winners because their visitors' task completion *is* the experience. Know what the visitor came to do, and count every element against it.

---

## Non-negotiables

- Back button always works; deep links always land correctly.
- The scrollbar tells the truth, or the custom controller degrades to native.
- Browser zoom (Ctrl+wheel, 200% reflow) is never intercepted.
- Text is selectable, real, and never an image.
- WCAG AA contrast (≥4.5:1 body text) on every backdrop a token actually sits on.
- `prefers-reduced-motion` yields a complete, calm experience — not a broken one.
- Visible, branded focus states; a keyboard path to everything, including closing what opened.
- LCP under ~2.5s on mid-range mobile; no loader screens on content pages.
- Semantic headings and landmarks; alt text that describes, labels that name actions.
- Mobile gets the same content, not a consolation version.

## Anti-patterns

- Loader theater; entrance choreography that replays on every navigation.
- Scroll-jacking without an escape hatch (the pattern's failure, not its use).
- Mystery-meat navigation; unlabeled icon-only controls.
- Cursor replacement that hides affordances (a cursor may add a label; it must never remove meaning).
- Carousels for primary content; text baked into images; infinite footers.
- Adjective copy: "passionate," "stunning," "cutting-edge" — replace each with an artifact.
- Award-chasing: optimizing for other designers instead of the visitor's task.
- Decorative WebGL/3D that demonstrates nothing the visitor came to evaluate.

## Decision heuristics

1. **The removal test** — would deleting this element weaken the argument? If not, delete it.
2. **The artifact test** — can this adjective be replaced with evidence? Then it must be.
3. **The state test** — does this animation explain a state change? If not, cut or halve it.
4. **The return test** — is the second visit better or worse for this choice?
5. **The squint test** — blur the page; the hierarchy should still be obvious.
6. **The train test** — does it work on a 3-year-old phone, one bar of signal, one thumb?
7. **The 5-second test** — after five seconds, can a stranger say what this is and for whom?
8. **The tradeoff rule** — when beauty and usability conflict, name the tradeoff out loud and decide; never default silently to either side.

## Rules by discipline

**Typography.** One display face, one text face, one mono for labels — each with a job. Scale from a ratio, not taste-per-page. Body 16px+ equivalent, line-height ≥1.5, measure 45–75ch. Letter-spacing tightens as size grows. Numerals that align. Load ≤4 weights, WOFF2, with a deliberate display strategy.

**Layout.** A real grid with a spacing scale (4/8-based). Every block aligns to something; accidental alignment is the tell of template work. Max-widths for prose. Density matches audience task, not fashion.

**Motion.** 150–450ms; ease-out in, ease-in out; springs only under the pointer. Choreograph one moment per page. Everything obeys `prefers-reduced-motion`. Never animate layout properties the compositor can't handle (stick to transform/opacity).

**UX.** The primary action of every screen is unmistakable. Progressive disclosure over walls of options. Labels over icons; both over neither. Errors say what happened and what to do. Trust elements (names, numbers, dates, artifacts) close to every claim.

**Performance.** Budget: HTML+CSS+JS under ~200KB compressed before media. Media lazy, sized, and modern-format (stills: WebP/AVIF; loops: muted MP4, never animated GIF). Fonts subset. Third parties behind consent facades. Measure on hardware, not on a MacBook.

**Brand.** One identity move, total consistency in its execution. Voice as considered as the palette. Personality lives in the details (microcopy, hover states, 404s), not in obstruction of the task.

**Accessibility.** AA is the floor. Keyboard-complete, screen-reader-sensible, zoom-proof, motion-safe, contrast-checked against real backdrops (gradients included — check the lightest stop).

---

## The award-site tension, honestly

Awwwards SOTD culture (this week: a type foundry, a luxury AI e-commerce build, narrative experiences, personal portfolios) rewards *sites where the site itself is the product demo* — studios and creative developers selling exactly the spectacle on display. For them, breaking a few UX conventions is a defensible sales cost. Importing those patterns into a site whose visitor has a *different* job — evaluating a candidate, buying a product — imports the cost without the payoff. Borrow the craft (typography, choreography, finish); refuse the obstruction (loaders, hijacks, mystery nav).

---

## The standard applied: aitormorales.com

**Audience & job-to-be-done:** hiring managers, design leads, and recruiters at game studios, arriving mostly from LinkedIn/CV links, giving the site 30–90 seconds on a laptop. Their task: *find evidence this person can do the job.*

**Where the site already meets the standard (July 2026):** dependency-free and fast; one identity move (deep-space scene with the chase vignette — itself a piece of staging and readability, i.e. level-design sensibility on display); honest deck (degrades to native scroll inside tall panels); AA contrast; keyboard-complete drawer; reduced-motion complete; muted MP4 loops; view-transition morphs that explain navigation rather than decorate it; copy that already leans specific ("who ships, and builds what he designs"; 50+ live games, 25M+ downloads).

**Where it falls short of the standard:** the **artifact test**. The case studies describe outcomes but show little *process evidence* — the exact thing this audience scans for. Stripe shows uptime; Linear shows the product working; this site must show design thinking working: annotated level maps, blockout→final comparisons, difficulty/pacing curves, a feature's brief→prototype→test→rollout story at Gimica (within public-information limits), pillars→mechanics tables for the jam games. One honest artifact per case study outweighs any visual upgrade the site could receive.

**Deliberately rejected for this site:** loader screens; WebGL spectacle (the visitor's job is evidence-scanning, not play — the playfulness already lives in the identity layer); light/dark theming (the identity is the dark); gated PDFs; testimonial walls (wrong genre for an individual); any pattern that costs the first five seconds.
