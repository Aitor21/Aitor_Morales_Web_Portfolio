/* =====================================================================
   Aitor Morales — Portfolio v3.4 engine (dependency-free)
   Global-once listeners + per-page mount + seamless SPA transitions
   (native View Transition when available, JS FLIP fallback everywhere).
   ===================================================================== */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  var coarse = matchMedia("(hover:none) and (pointer:coarse)").matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  // Older WebKit ignores scroll options objects entirely (silent no-op) — detect once
  // and fall back to instant scrollTop writes so navigation always actually happens.
  var smoothOK = "scrollBehavior" in document.documentElement.style;
  function scrollElTo(el, top, smooth) {
    if (smoothOK) el.scrollTo({ top: top, behavior: smooth && !reduce ? "smooth" : "auto" });
    else el.scrollTop = top;
  }

  /* ---- Run heavy rAF work only AFTER the page-morph finishes ----
     A cross-document View Transition composites snapshots of both pages. Booting the
     starfield canvas and the parallax loops in the middle of that steals main-thread time
     and the morph judders. `pagereveal` hands us the incoming transition, so we simply
     wait for it. No transition (or no support) -> a short timer runs them anyway. */
  function afterTransition(cb) {
    var ran = false;
    var run = function () { if (!ran) { ran = true; cb(); } };
    addEventListener("pagereveal", function (e) {
      if (e.viewTransition) e.viewTransition.finished.then(run, run); else run();
    }, { once: true });
    setTimeout(run, 700);   // fallback: no pagereveal support, or a plain navigation
  }

  /* ===================== Parallax (mouse + gyroscope) ===================== */
  var parallaxes = [];
  function Parallax(scene) {
    this.scene = scene;
    this.layers = Array.prototype.slice.call(scene.querySelectorAll("[data-depth]"));
    // depths are static — read them once instead of parsing an attribute per layer per frame
    this.depths = this.layers.map(function (l) { return parseFloat(l.getAttribute("data-depth")) || 0; });
    this.scalar = parseFloat(scene.getAttribute("data-scalar")) || 4.2;
    this.friction = 0.09; this.tx = 0; this.ty = 0; this.cx = 0; this.cy = 0;
    this.calib = null; this.running = false; this.dead = false;
    if (reduce || !this.layers.length) return;
    this.loop = this.loop.bind(this);
    this.bind();
  }
  Parallax.prototype.bind = function () {
    var self = this;
    if (coarse && window.DeviceOrientationEvent) {
      var attach = function () {
        self._orient = function (e) {
          if (e.gamma == null || e.beta == null) return;
          if (self.calib == null) self.calib = { g: e.gamma, b: e.beta };
          var nx = clamp((e.gamma - self.calib.g) / 40, -1, 1);
          var ny = clamp((e.beta - self.calib.b) / 40, -1, 1);
          /* Deadzone. The loop is written to park once it catches up with the target, but
             deviceorientation fires continuously and a hand-held phone is never perfectly
             still — every tremor rewrote the target and woke it again, so on a phone it
             never parked at all and ran rAF for the life of the page. Only a deliberate
             tilt counts now; resting in someone's hand does not. */
          if (Math.abs(nx - self.tx) < 0.02 && Math.abs(ny - self.ty) < 0.02) return;
          self.tx = nx; self.ty = ny;
          self.start();   // the loop parks itself when settled; tilt wakes it
        };
        window.addEventListener("deviceorientation", self._orient);
        self.start();
      };
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        motionPrompt(function () { DeviceOrientationEvent.requestPermission().then(function (s) { if (s === "granted") attach(); }).catch(function () {}); });
      } else { attach(); }
    } else {
      self._move = function (e) {
        self.tx = (e.clientX / innerWidth) * 2 - 1; self.ty = (e.clientY / innerHeight) * 2 - 1;
        self.start();   // the loop parks itself when settled; input wakes it
      };
      window.addEventListener("mousemove", self._move, { passive: true });
      this.start();
    }
  };
  Parallax.prototype.start = function () { if (this.running) return; this.running = true; requestAnimationFrame(this.loop); };
  Parallax.prototype.loop = function () {
    if (this.dead) return;
    this.cx += (this.tx - this.cx) * this.friction;
    this.cy += (this.ty - this.cy) * this.friction;
    for (var i = 0; i < this.layers.length; i++) {
      var d = this.depths[i];
      this.layers[i].style.transform = "translate3d(" + (-this.cx * d * this.scalar).toFixed(2) + "vmin," + (-this.cy * d * this.scalar).toFixed(2) + "vmin,0)";
    }
    // Park the loop once the eased position has caught up to the target, instead of
    // burning a frame forever while the pointer sits still. _move / _orient restart it.
    if (Math.abs(this.tx - this.cx) < 0.0005 && Math.abs(this.ty - this.cy) < 0.0005) {
      this.running = false; return;
    }
    requestAnimationFrame(this.loop);
  };
  Parallax.prototype.destroy = function () {
    this.dead = true;
    if (this._move) window.removeEventListener("mousemove", this._move);
    if (this._orient) window.removeEventListener("deviceorientation", this._orient);
  };
  function motionPrompt(cb) {
    var el = document.createElement("button");
    el.className = "pill"; el.type = "button";
    el.style.cssText = "position:fixed;left:50%;bottom:3rem;transform:translateX(-50%);z-index:200;background:rgba(95,108,230,.16);color:#fff;border:1px solid rgba(139,150,255,.5)";
    el.textContent = "✦ Tap to enable motion";
    document.body.appendChild(el);
    el.addEventListener("click", function () { cb(); el.remove(); });
    setTimeout(function () { if (el.parentNode) el.remove(); }, 9000);
  }

  /* ===================== Header theme flip (global listener) =====================
     Runs on every scroll event, so it caches its inputs. When every themed section on
     the page shares one theme (the home deck is all `dark`), the answer is a constant —
     resolve it once and skip the per-element getBoundingClientRect loop entirely. */
  var header, themedEls = null, themedUniform = false;
  function themeOf(el) { return el.getAttribute("data-theme") || "dark"; }
  function headerFlipResolve() {
    if (!header) return;
    if (!themedEls) {
      themedEls = Array.prototype.slice.call(document.querySelectorAll("[data-theme]:not(.site-header)"));
      themedUniform = themedEls.length > 0 && themedEls.every(function (e) {
        return themeOf(e) === themeOf(themedEls[0]);
      });
    }
    if (!themedEls.length) return;
    var LINE = 34, theme = themeOf(themedEls[0]);
    if (!themedUniform) {
      for (var i = 0; i < themedEls.length; i++) {
        var r = themedEls[i].getBoundingClientRect();
        if (r.top <= LINE && r.bottom > LINE) { theme = themeOf(themedEls[i]); break; }
      }
    }
    if (header.getAttribute("data-theme") !== theme) {
      header.setAttribute("data-theme", theme);
      var c = theme === "light" ? "var(--ink)" : "var(--white)";
      var back = document.querySelector(".back-link"); if (back) back.style.color = c;
      var hint = document.querySelector(".scroll-hint"); if (hint) hint.style.color = c;
      // the replaced pointer is only 2.35:1 on the light sections — recolour it there
      document.body.classList.toggle("cursor-light", theme === "light");
    }
  }

  /* ===================== Slide controller (global listeners + state) =====================
     slide.active  = the desktop JS controller (wheel/keys drive an eased scroll).
     The progress indicator is INDEPENDENT of it: it is built on every device that has a
     multi-panel .snap, and on touch it follows the native scroll-snap position. */
  var slide = { snap: null, panels: [], index: 0, animating: false, active: false, nav: null, dots: [], count: null, pending: 0 };
  var lastStoredSlide = -1;
  function setupSlides() {
    themedEls = null;               // re-resolve the theme cache for this mount
    slide.snap = document.querySelector(".snap");
    slide.panels = slide.snap ? Array.prototype.slice.call(slide.snap.querySelectorAll(".panel")) : [];
    slide.index = 0; slide.animating = false;
    slide.active = !!(slide.snap && slide.panels.length > 1 && !coarse && !reduce);
    document.body.classList.toggle("slides-js", slide.active);
    if (slide.snap) {
      slide.snap.addEventListener("scroll", function () {
        headerFlipResolve();
        document.body.classList.toggle("scrolled", slide.snap.scrollTop > 40);
        if (!slide.animating) {
          slide.index = nearestPanel();
          updateSlideNav();
          // remember where we are, so the case-study Back button can bring us right back.
          // sessionStorage is synchronous and disk-backed, so only write on an actual
          // change — not once per scroll event through a momentum flick.
          if (slide.index !== lastStoredSlide) {
            lastStoredSlide = slide.index;
            try { sessionStorage.setItem("amSlide", String(slide.index)); } catch (_) {}
          }
        }
      }, { passive: true });

      /* Where should we land? Priority:
         1. We arrived from a case study -> the panel holding THAT study's card. This is
            derived from the previous URL, so it is exact: back always returns you to the
            card you left from, and it puts the morph target on screen before the
            transition snapshots this page.
         2. An explicit #hash.
         3. sessionStorage fallback (browsers without the Navigation API). */
      var target = panelIndexOfCard(cameFromProjectImg());
      if (target < 0 && location.hash) {
        var t = document.querySelector(location.hash);
        var p = t && (t.classList.contains("panel") ? t : t.closest(".panel"));
        target = p ? slide.panels.indexOf(p) : -1;
      }
      if (target < 0 && !hasNavActivation) {
        var amBack = false; try { amBack = sessionStorage.getItem("amBack") === "1"; } catch (_) {}
        if (amBack) {
          try { sessionStorage.removeItem("amBack"); } catch (_) {}
          try { target = parseInt(sessionStorage.getItem("amSlide") || "0", 10); } catch (_) {}
        }
      }
      if (target > 0 && target < slide.panels.length) restoreTo(target);
      else slide.index = nearestPanel();
    }
    buildSlideNav();
  }
  /* Keep the address bar honest about which panel you are on.
     The deck is a scroll container, so the hash you arrived with used to stick forever:
     open Gimica from #work, come back, scroll three panels down, and the URL still said
     #work. That made a reload or a shared link land somewhere the visitor had not been,
     and it is what made Back look like it was ignoring which card you opened — the hash
     was the only record of position and it was lying.
     replaceState, never pushState: scrolling a page must not fill the history stack. And
     the hash is cleared on panels that have no id, because a wrong hash is worse than
     none. */
  function syncHash() {
    if (!slide.panels.length) return;
    var p = slide.panels[slide.index];
    var want = location.pathname + location.search + (p && p.id ? "#" + p.id : "");
    if (location.pathname + location.search + location.hash === want) return;
    try { history.replaceState(history.state, "", want); } catch (_) {}
  }
  function panelIndexOfCard(img) {
    if (!img || !slide.panels.length) return -1;
    var p = img.closest(".panel");
    return p ? slide.panels.indexOf(p) : -1;
  }
  /* Jump straight to a panel, synchronously and exactly once. .snap has
     scroll-behavior:auto so the write lands immediately. This MUST stay synchronous:
     a deferred re-apply (rAF / load) would fire after the view transition has already
     snapshotted this page, which is what used to leave Back on a random slide. Panels
     are min-height:100dvh, so offsetTop is stable without waiting for images. */
  function restoreTo(i) {
    slide.index = i;
    slide.snap.scrollTop = slide.panels[i].offsetTop;
    updateSlideNav();
    headerFlipResolve();
    // If this restore happened during an arrival, whatever we just scrolled INTO view has
    // not been settled yet — settleForArrival ran earlier against a different panel. Re-run
    // it here or the panel we actually land on animates its content in, which is the
    // "information popping out of nowhere" on the way back from a case study.
    if (document.documentElement.classList.contains("vt-arrive")) settleForArrival();
  }
  function nearestPanel() {
    var y = slide.snap.scrollTop, best = 0, bestD = Infinity;
    for (var i = 0; i < slide.panels.length; i++) {
      var d = Math.abs(slide.panels[i].offsetTop - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  function buildSlideNav() {
    var old = document.querySelector(".slide-nav"); if (old) old.remove();
    slide.nav = null; slide.dots = []; slide.count = null;
    if (!slide.snap || slide.panels.length < 2) return;

    var nav = document.createElement("nav");
    nav.className = "slide-nav";
    nav.setAttribute("aria-label", "Sections");
    slide.panels.forEach(function (p, i) {
      var b = document.createElement("button");
      b.className = "slide-dot"; b.type = "button";
      b.setAttribute("aria-label", panelLabel(p, i));
      b.addEventListener("click", function () { slideGo(i, false, true); });
      nav.appendChild(b); slide.dots.push(b);
    });
    var count = document.createElement("span");
    count.className = "slide-count"; count.setAttribute("aria-hidden", "true");
    count.innerHTML = '<b></b>' + pad2(slide.panels.length);
    nav.appendChild(count); slide.count = count;

    /* Insert BEFORE <main>, not at the end of <body>: the rail is a fixed left-edge
       element that reads as page chrome, but appended last it landed at tab index 34 of
       41 — reachable only after traversing all seven panels, the opposite of a nav aid.
       position:fixed means the DOM move is visually invisible. */
    var mainEl = document.querySelector("main");
    if (mainEl && mainEl.parentNode === document.body) document.body.insertBefore(nav, mainEl);
    else document.body.appendChild(nav);
    slide.nav = nav;
    /* Activating a dot was completely silent to assistive tech: aria-current changes are
       not announced, and focus never moved. Announce on explicit activation only —
       never on wheel scroll, which would announce continuously. */
    if (!slide.live) {
      var live = document.createElement("span");
      live.className = "sr-only"; live.setAttribute("role", "status");
      document.body.appendChild(live); slide.live = live;
    }
    slide.index = nearestPanel();
    updateSlideNav();
  }
  function panelLabel(p, i) {
    var l = p.getAttribute("data-label");
    if (l) return l;
    var h = p.querySelector("h1, h2");
    return h ? h.textContent.replace(/\s+/g, " ").trim() : "Section " + (i + 1);
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function updateSlideNav() {
    syncHash();          // every panel change flows through here — before the rail guard
    if (!slide.nav) return;
    for (var i = 0; i < slide.dots.length; i++) {
      var on = i === slide.index;
      slide.dots[i].classList.toggle("active", on);
      slide.dots[i].setAttribute("aria-current", on ? "true" : "false");
    }
    if (slide.count) slide.count.firstChild.textContent = pad2(slide.index + 1);
  }
  /* alignBottom: when wheel/keys move UP into a panel taller than the viewport, land
     with its bottom edge in view — you arrive at the content you were headed for and
     scroll up through the panel, instead of skipping straight past its below-fold half.
     Dots, hash links and Home/End keep landing on the panel top (no flag). */
  function slideGo(i, alignBottom, announce) {
    if (!slide.snap || !slide.panels.length) return;
    i = clamp(i, 0, slide.panels.length - 1);
    try { sessionStorage.setItem("amSlide", String(i)); } catch (_) {}
    var p = slide.panels[i];
    if (announce) {
      // move the virtual cursor to the panel the visitor asked for, and say where we are
      p.setAttribute("tabindex", "-1");
      try { p.focus({ preventScroll: true }); } catch (_) {}
      if (slide.live) slide.live.textContent = panelLabel(p, i) + ", section " + (i + 1) + " of " + slide.panels.length;
    }
    var end = alignBottom
      ? Math.max(p.offsetTop, p.offsetTop + p.offsetHeight - slide.snap.clientHeight)
      : p.offsetTop;
    // touch / reduced-motion: hand it to the browser (native snap keeps the settle honest)
    if (!slide.active) {
      slide.index = i; updateSlideNav();
      scrollElTo(slide.snap, end, true);
      return;
    }
    if (slide.animating || Math.abs(slide.snap.scrollTop - end) < 2) { slide.index = i; updateSlideNav(); return; }
    var fromP = slide.panels[nearestPanel()], toP = p;
    slide.index = i; slide.animating = true; updateSlideNav();
    var start = slide.snap.scrollTop, dist = end - start, t0 = null, dur = 320;
    var ease = function (t) { return 1 - Math.pow(1 - t, 4); }; // easeOutQuart — snappy, smooth settle
    /* depth: both panels' content trails the jump by up to ~7% of the distance,
       bell-eased so the offset is zero at BOTH ends — layered mid-flight, no end pop. */
    var depthK = (reduce || fromP === toP) ? 0 : 0.07;
    function setDepth(off) {
      if (!depthK) return;
      var tf = off ? "translate3d(0," + off + "px,0)" : "";
      fromP.style.transform = tf; toP.style.transform = tf;
    }
    function step(ts) {
      if (t0 == null) t0 = ts;
      var pr = Math.min(1, (ts - t0) / dur);
      var e = ease(pr);
      slide.snap.scrollTop = start + dist * e;
      setDepth(pr < 1 ? +(dist * depthK * e * (1 - e) * 4).toFixed(1) : 0);
      if (pr < 1) requestAnimationFrame(step);
      else { slide.snap.scrollTop = end; slide.animating = false; }
    }
    requestAnimationFrame(step);
  }
  /* The deck's contract: every panel fits the viewport, or the controller degrades.
     A panel CAN run taller than the viewport (768px-tall laptops, 125% OS scaling,
     200% browser zoom), so wheel/keys scroll natively INSIDE the active panel and the
     deck only advances from the panel's edge. Room is measured per event — resize and
     zoom are always honoured. Ctrl+wheel (browser zoom) is never intercepted. */
  function initSlideListeners() {
    /* Advancing is gated on ACCUMULATED INTENT, not on a timer.
       The old logic used a flat 160ms quiet period after inner-scrolling plus a 90ms
       throttle, which produced the two complaints this replaces: a decisive scroll that
       arrived inside the quiet window was swallowed (so "it doesn't go to the next
       slide"), while a stray one-notch nudge at a panel edge could still fire.
       Now: wheel deltas in one direction add up, and the deck advances the moment they
       cross ADVANCE_PX. Small nudges never reach it (no false positives); a real scroll
       crosses it almost immediately (nothing to wait for). Intent decays after
       ACC_WINDOW and resets on a direction change, so it can never leak between
       gestures. EDGE_GRACE only has to outlast a trackpad's momentum tail, so it is
       much shorter than the old settle gate. */
    /* TALL_SLACK is the fix for the asymmetry. panelRoom > 1 meant a panel overflowing
       by even a few px counted as "scrollable", so wheeling DOWN always handed off to
       native scroll and never snapped, while wheeling UP from a panel top had zero room,
       hit the advance path, and chained. A panel now only earns inner-scroll if it hides
       a readable amount; below that it just advances, identically in both directions.
       LOCKOUT then swallows the whole momentum tail after an advance, which is what
       stops one flick from skipping several slides. */
    var TALL_SLACK = 90, ADVANCE_PX = 34, ACC_WINDOW = 260, EDGE_GRACE = 70, LOCKOUT = 430;
    var lastAdvance = -1e6, lastInner = -1e6, acc = 0, accDir = 0, accAt = 0;
    function overflowOf(i) {     // px this panel hides beyond the viewport
      var p = slide.panels[i];
      return p ? p.offsetHeight - slide.snap.clientHeight : 0;
    }
    function panelRoom(dir) {    // px of hidden panel content in that direction
      var p = slide.panels[slide.index];
      if (!p) return 0;
      return dir > 0
        ? (p.offsetTop + p.offsetHeight) - (slide.snap.scrollTop + slide.snap.clientHeight)
        : slide.snap.scrollTop - p.offsetTop;
    }
    window.addEventListener("wheel", function (e) {
      if (!slide.active) return;
      if (e.ctrlKey) return;                   // pinch / Ctrl+wheel zoom stays the browser's
      if (!e.deltaY) return;
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var dir = e.deltaY > 0 ? 1 : -1;

      // One advance per gesture: eat everything until the slide has landed and the
      // trackpad's inertia has died. Without this a single flick chains 3-4 panels.
      if (now - lastAdvance < LOCKOUT) { e.preventDefault(); acc = 0; return; }
      if (slide.animating) { e.preventDefault(); return; }

      if (panelRoom(dir) > TALL_SLACK) {       // genuinely tall: let them read it
        lastInner = now; acc = 0; accDir = 0;
        return;                                 // native scroll, not intercepted
      }
      e.preventDefault();
      if (Math.abs(e.deltaY) < 2) return;
      if (now - lastInner < EDGE_GRACE) return; // settle at the edge first

      if (dir !== accDir || now - accAt > ACC_WINDOW) { acc = 0; accDir = dir; }
      acc += Math.abs(e.deltaY);
      accAt = now;
      if (acc < ADVANCE_PX) return;             // not enough intent yet
      acc = 0; accDir = 0;
      lastAdvance = now;
      // only bottom-align when moving UP into a panel that really is taller than the
      // viewport — otherwise land on its top like every other jump
      slideGo(slide.index + dir, dir < 0 && overflowOf(slide.index - 1) > TALL_SLACK);
    }, { passive: false });
    window.addEventListener("keydown", function (e) {
      if (!slide.active || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
      var k = e.key;
      if (k === "Home") { e.preventDefault(); slideGo(0, false, true); return; }
      if (k === "End") { e.preventDefault(); slideGo(slide.panels.length - 1, false, true); return; }
      if (k === " " && t && t.closest && t.closest("a,button,summary")) return; // Space activates those
      var down = k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey);
      var up = k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey);
      if (!down && !up) return;
      e.preventDefault();                      // Space no longer scrolls to un-snapped spots
      if (slide.animating) return;
      var dir = down ? 1 : -1, room = panelRoom(dir);
      if (room > TALL_SLACK) {                 // tall panel: step through it, never past it
        var step = Math.min(room, k === "ArrowDown" || k === "ArrowUp" ? 140 : slide.snap.clientHeight * 0.85);
        scrollElTo(slide.snap, slide.snap.scrollTop + dir * step, true);
      } else {
        slideGo(slide.index + dir, dir < 0 && overflowOf(slide.index - 1) > TALL_SLACK, true);
      }
    });
  }

  /* ===================== Reveals (per mount) ===================== */
  function initReveals() {
    var t = document.querySelectorAll(".panel, .section-block, .reveal-solo");
    if (!t.length) return;
    var showAll = function () { t.forEach(function (x) { x.classList.add("is-in"); }); };
    if (reduce || !("IntersectionObserver" in window)) { showAll(); return; }
    var fired = false;
    var io = new IntersectionObserver(function (en) {
      fired = true;
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.16, rootMargin: "0px 0px -6% 0px" });
    t.forEach(function (x) { io.observe(x); });
    // watchdog: a healthy observer ALWAYS delivers an initial record. If a privacy
    // browser stubs it out, content must never stay invisible — reveal everything.
    setTimeout(function () { if (!fired) showAll(); }, 3000);
  }

  /* ===================== Menu (persistent chrome) =====================
     The drawer is a modal surface: opening it moves focus to its first link, Tab cycles
     through the drawer links plus the toggle button (so it can be closed by keyboard),
     and Escape / backdrop / closing return focus to the button. */
  var closeMenu = function () { document.body.classList.remove("menu-open"); };
  function initMenu() {
    var btn = document.querySelector(".menu-btn");
    if (!btn) return;
    var backdrop = document.querySelector(".drawer-backdrop"), drawer = document.querySelector(".drawer");
    var isOpen = function () { return document.body.classList.contains("menu-open"); };
    var focusables = function () {
      return drawer ? Array.prototype.slice.call(drawer.querySelectorAll("a[href],button:not([disabled])")) : [];
    };
    closeMenu = function (refocus) {
      if (!isOpen()) return;
      document.body.classList.remove("menu-open");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Open menu");
      if (refocus) btn.focus();
    };
    btn.addEventListener("click", function () {
      var open = !isOpen();
      document.body.classList.toggle("menu-open", open); btn.setAttribute("aria-expanded", open ? "true" : "false");
      // "Open menu, expanded" is nonsense — name the action the button now performs
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) { var f = focusables(); if (f.length) f[0].focus(); }
    });
    if (backdrop) backdrop.addEventListener("click", function () { closeMenu(true); });
    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      if (e.key === "Escape") { closeMenu(true); return; }
      if (e.key !== "Tab" || !drawer) return;
      var f = focusables(); if (!f.length) return;
      var a = document.activeElement;
      if (a !== btn && !drawer.contains(a)) { e.preventDefault(); f[0].focus(); return; }
      if (e.shiftKey && a === f[0]) { e.preventDefault(); btn.focus(); }
      else if (e.shiftKey && a === btn) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); btn.focus(); }
      else if (!e.shiftKey && a === btn) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ===================== Custom cursor (persistent, purposeful) =====================
     Over interactive media the ring becomes a filled disc showing what a click does
     ("View" / "Play" / "About" / "Read"); elsewhere it's a quiet follower ring. */
  function tagCursorTargets() {
    [[".work-media,.gimica-card,.more-card", "View"],
     [".about-portrait", "About"],
     [".press-hero,.press-card", "Read"]].forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) { if (!el.dataset.cursor) el.dataset.cursor = pair[1]; });
    });
    document.querySelectorAll('a[href*="itch.io"],a[href*="store.steampowered"]').forEach(function (el) { el.dataset.cursor = "Play"; });
  }
  function initCursor() {
    if (!fine || reduce) return;
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    var ring = document.createElement("div"); ring.className = "cursor-ring";
    var label = document.createElement("span"); label.className = "cursor-label"; ring.appendChild(label);
    document.body.appendChild(dot); document.body.appendChild(ring);
    tagCursorTargets();
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, on = false, ringRunning = false;
    /* body.cursor-on sets cursor:none. If anything later throws, the visitor would be
       left with no pointer at all — the one failure here that is worse than no feature.
       bootSafe cannot cover it (this class is added after boot, on first mouse move),
       so guarantee restoration unconditionally. */
    var restoreCursor = function () { document.body.classList.remove("cursor-on"); on = false; };
    addEventListener("error", restoreCursor);
    addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!on) { on = true; document.body.classList.add("cursor-on"); }
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
      startRing();
    }, { passive: true });
    addEventListener("mouseout", function (e) { if (!e.relatedTarget) restoreCursor(); });
    // the ring eases toward the pointer, so it only needs frames while it is catching up
    function startRing() {
      if (ringRunning) return;
      ringRunning = true;
      requestAnimationFrame(function raf() {
        try {
          rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
          ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
          if (Math.abs(mx - rx) < 0.5 && Math.abs(my - ry) < 0.5) { ringRunning = false; return; }
          requestAnimationFrame(raf);
        } catch (err) { ringRunning = false; restoreCursor(); }
      });
    }
    startRing();

    var inside = function (el, sel) { return el && el.closest && el.closest(sel); };
    document.addEventListener("mouseover", function (e) {
      var media = inside(e.target, "[data-cursor]");
      if (media) {
        document.body.classList.add("cursor-media");
        document.body.classList.remove("cursor-hover");
        label.textContent = media.dataset.cursor || "";
        return;
      }
      if (inside(e.target, "a,button")) document.body.classList.add("cursor-hover");
    });
    document.addEventListener("mouseout", function (e) {
      var to = e.relatedTarget;
      if (inside(e.target, "[data-cursor]") && !inside(to, "[data-cursor]")) {
        document.body.classList.remove("cursor-media"); label.textContent = "";
      }
      if (inside(e.target, "a,button") && !inside(to, "a,button")) document.body.classList.remove("cursor-hover");
    });
  }

  /* ===================== Card hover parallax (per mount) =====================
     The big work cards answer the cursor the way the hero scene does: the image
     drifts a few px against the pointer. The CSS transform transition (.9s ease-out)
     damps every write, so it reads as weight, not jitter. Fine pointers only. */
  function initCardParallax() {
    if (!fine || reduce) return;
    document.querySelectorAll(".work-media,.gimica-card,.about-portrait").forEach(function (card) {
      if (card._cp) return; card._cp = true;
      var img = card.querySelector("img,video");
      if (!img) return;
      // Measure once per hover, not once per mousemove: the card's own box does not move
      // while the pointer crosses it, and a layout read per pointer event is wasted work.
      var box = null, boxAt = -1;
      var scrollNow = function () { return (slide.snap ? slide.snap.scrollTop : 0) + (window.scrollY || 0); };
      var measure = function () { box = card.getBoundingClientRect(); boxAt = scrollNow(); };
      card.addEventListener("mouseenter", measure);
      card.addEventListener("mousemove", function (e) {
        if (!box || boxAt !== scrollNow()) measure();   // scrolled under the pointer
        var nx = (e.clientX - box.left) / box.width - 0.5;    // -0.5 .. 0.5
        var ny = (e.clientY - box.top) / box.height - 0.5;
        // scale slightly past the CSS hover zoom so the drift can never expose an edge
        img.style.transform = "scale(1.06) translate(" + (nx * -10).toFixed(1) + "px," +
                              (ny * -10).toFixed(1) + "px)";
        // and tip the card itself toward the pointer — a few degrees only, so it reads
        // as a physical card catching the light rather than a novelty 3D toy
        card.style.transform = "perspective(900px) rotateY(" + (nx * 5.5).toFixed(2) +
                               "deg) rotateX(" + (ny * -4.5).toFixed(2) + "deg)";
      });
      card.addEventListener("mouseleave", function () {
        box = null; img.style.transform = ""; card.style.transform = "";
      });
    });
  }

  /* ===================== Nebula follows the pointer (global) =====================
     The glow leans toward wherever you are working — far too slowly to catch in the act,
     but the background stops feeling like a printed backdrop. Writes two custom props on
     one element, eased on a self-parking rAF, so the cost is a single style write/frame
     while the pointer is moving and nothing at all when it rests. */
  function initGlowFollow() {
    if (!fine || reduce) return;
    var glow = document.querySelector(".bg-glow");
    if (!glow || glow._gf) return; glow._gf = true;
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    addEventListener("mousemove", function (e) {
      tx = ((e.clientX / innerWidth) * 2 - 1) * 46;    // px, max lean
      ty = ((e.clientY / innerHeight) * 2 - 1) * 34;
      start();
    }, { passive: true });
    function start() {
      if (running) return; running = true;
      requestAnimationFrame(function loop() {
        cx += (tx - cx) * 0.035; cy += (ty - cy) * 0.035;   // very slow follow
        glow.style.setProperty("--gx", cx.toFixed(1) + "px");
        glow.style.setProperty("--gy", cy.toFixed(1) + "px");
        if (Math.abs(tx - cx) < 0.3 && Math.abs(ty - cy) < 0.3) { running = false; return; }
        requestAnimationFrame(loop);
      });
    }
  }

  /* ===================== The pigeon hunt (per mount) =====================
     The bird from the hero scene hides on every other page too. Catch it once per page
     and the count follows you around in localStorage. Nine pages hold one; the tenth
     (404) deliberately does not, so nobody has to break the site to finish.
     Everything degrades quietly: no storage, no counter — the bird still flushes. */
  function huntKey() {
    var p = location.pathname.replace(/\/+$/, "");
    var f = p.substring(p.lastIndexOf("/") + 1).replace(/\.html$/, "");
    return f || "index";
  }
  function huntFound() {
    try { var v = JSON.parse(localStorage.getItem("amPigeons") || "[]"); return v.length ? v : []; }
    catch (_) { return []; }
  }
  /* Silent by design: the bird breaking cover IS the feedback, so there is no toast on
     top of it. The record is still kept, purely so a page you have already cleared stays
     cleared instead of respawning the same pigeon on every visit. */
  function huntRecord() {
    var found = huntFound(), k = huntKey();
    if (found.indexOf(k) < 0) {
      found.push(k);
      try { localStorage.setItem("amPigeons", JSON.stringify(found)); } catch (_) {}
    }
  }

  /* The hiding bird on every page that is not the home deck (the hero scene has its own,
     which is part of the artwork). It perches near an edge, hops every so often, and
     never sits over the middle of the page where the reading and the CTAs are. */
  function initPigeonHunt() {
    if (document.querySelector(".ms-pigeon")) return;          // home: the scene owns it
    if (document.querySelector(".hunt-pigeon")) return;
    if (huntFound().indexOf(huntKey()) > -1) return;           // already caught here
    var deep = location.pathname.indexOf("/projects/") > -1;
    var bird = document.createElement("button");
    bird.type = "button";
    bird.className = "hunt-pigeon";
    bird.setAttribute("aria-label", "A pigeon is hiding on this page. Activate to flush it out.");
    var im = document.createElement("img");
    // Root-absolute: relative guesswork breaks under a language prefix, where
    // /es/projects/x would resolve "../assets" to /es/assets and 404.
    im.src = "/assets/img/hero/pigeon.webp";
    im.alt = ""; im.setAttribute("aria-hidden", "true");
    bird.appendChild(im);
    // edge perches only — left/right gutters and the lower band, never centre stage
    var PERCHES = [[4, 74], [90, 40], [7, 30], [88, 76], [3, 52], [92, 60]];
    var at = Math.floor(Math.random() * PERCHES.length);
    function place() {
      bird.style.left = PERCHES[at][0] + "%";
      bird.style.top = PERCHES[at][1] + "%";
    }
    place();
    document.body.appendChild(bird);
    requestAnimationFrame(function () { bird.classList.add("perched"); });
    // hop to a new perch now and then, so it is never quite where you last saw it
    var hop = null;
    if (!reduce) hop = setInterval(function () {
      if (!bird.isConnected || bird.classList.contains("flushed")) { clearInterval(hop); return; }
      at = (at + 1 + Math.floor(Math.random() * (PERCHES.length - 1))) % PERCHES.length;
      place();
    }, 11000 + Math.random() * 6000);
    bird.addEventListener("click", function () {
      if (bird.classList.contains("flushed")) return;
      bird.classList.add("flushed");
      bird.blur();                       // no focus ring left sitting where the bird was
      if (hop) clearInterval(hop);
      huntRecord();
      setTimeout(function () { bird.remove(); }, 1600);
    });
  }

  /* ===================== The pigeon escape (per mount) =====================
     The hero scene tells a chase that never resolves. Clicking the pigeon resolves it
     once: it breaks away, the bats overshoot and give up. Purely CSS after one class
     toggle, fires once per load, and is skipped entirely under reduced motion (where
     the chase animations are already frozen, so there would be nothing to resolve). */
  function initPigeon() {
    if (!fine || reduce) return;
    var pigeon = document.querySelector(".ms-pigeon");
    if (!pigeon || pigeon._esc) return;
    pigeon._esc = true;
    pigeon.addEventListener("click", function () {
      var scene = pigeon.closest(".moon-scene");
      if (!scene || scene.classList.contains("escaped")) return;
      scene.classList.add("escaped");
      huntRecord();          // the hero bird counts toward the hunt like any other
    });
  }

  /* ===================== Magnetic buttons (per mount) =====================
     Pull factors stay below 1 so the button always still contains the pointer — that
     invariant is what stops the hover-boundary oscillation this pattern is prone to.
     The rect is measured on enter, BEFORE any translate is applied: measuring it per
     move meant reading the button's own displaced box mid-transition, so the pull was
     computed from a moving origin and felt mushy. */
  function initMagnetic() {
    if (!fine || reduce) return;
    document.querySelectorAll(".btn").forEach(function (el) {
      if (el._mag) return; el._mag = true;
      var box = null, boxAt = -1;
      var scrollNow = function () { return (slide.snap ? slide.snap.scrollTop : 0) + (window.scrollY || 0); };
      var measure = function () {
        el.style.transform = "";                  // read the resting box, not the pulled one
        box = el.getBoundingClientRect(); boxAt = scrollNow();
      };
      el.addEventListener("mouseenter", measure);
      el.addEventListener("mousemove", function (e) {
        if (!box || boxAt !== scrollNow()) measure();
        // cap the travel: uncapped this reached ±36px, so the target a user aimed at was
        // never where they clicked — a Fitts's-law cost paid entirely by anyone with
        // tremor or limited fine motor control. 8px still reads as weight and response.
        var cap = function (v) { return v < -8 ? -8 : v > 8 ? 8 : v; };
        el.style.transform = "translate(" + cap((e.clientX - (box.left + box.width / 2)) * 0.3).toFixed(1) +
                             "px," + cap((e.clientY - (box.top + box.height / 2)) * 0.4).toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", function () { box = null; el.style.transform = ""; });
    });
  }

  /* ===================== Trailer facade (per mount) =====================
     The poster is a local image; the YouTube iframe is injected only when the
     visitor clicks play, so the page stays fast and makes no third-party
     request until they choose to watch (privacy-first). Uses youtube-nocookie. */
  function initVideoEmbeds() {
    document.querySelectorAll(".video-embed").forEach(function (el) {
      if (el._v) return; el._v = true;
      var play = function () {
        var id = el.getAttribute("data-yt"); if (!id || el.classList.contains("is-playing")) return;
        var f = document.createElement("iframe");
        // cc_load_policy=1 turns on a caption track when the source video has one
        f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&cc_load_policy=1";
        f.title = el.getAttribute("data-title") || "Trailer";
        f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        f.setAttribute("allowfullscreen", "");
        el.classList.add("is-playing");
        // replaceChildren + focus, NOT innerHTML="": wiping the container destroys the
        // .ve-play button the user just activated, which strands focus on <body>. A
        // keyboard user would lose their place and conclude the button did nothing.
        el.replaceChildren(f);
        try { f.focus({ preventScroll: true }); } catch (_) {}
      };
      el.addEventListener("click", play);
      var btn = el.querySelector(".ve-play");
      if (btn) btn.addEventListener("click", function (e) { e.stopPropagation(); play(); });
    });
  }

  /* ===================== Ambient gameplay loops (per mount) =====================
     Case-study shots and the R4D10HEAD card are short muted <video> loops — a fraction
     of the animated-image weight they replaced. Reduced-motion visitors get the poster
     frame instead, and any loop that isn't inside a link is click/keyboard-pausable. */
  function initLoopVideos() {
    document.querySelectorAll("video.loop-video").forEach(function (v) {
      if (v._loop) return; v._loop = true;
      if (reduce) {
        v.removeAttribute("autoplay");
        try { v.pause(); } catch (_) {}
        return;
      }
      /* Deferred loops (preload="none", no autoplay) fetch nothing until they scroll
         into view — the home grid's card sits five panels down, so eagerly loading it
         spent ~166KB before the visitor saw panel 1. Pause on exit too, so an
         off-screen loop never burns battery. */
      if (!v.hasAttribute("autoplay")) {
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (en) {
            en.forEach(function (e) {
              if (e.isIntersecting) v.play().catch(function () {});
              else { try { v.pause(); } catch (_) {} }
            });
          }, { threshold: 0.2 }).observe(v);
        } else {
          v.play().catch(function () {});
        }
      }
      if (v.closest("a")) return;   // card loops: the whole card is a link, clicks navigate
      v.setAttribute("tabindex", "0");
      v.setAttribute("role", "button");
      var base = v.getAttribute("aria-label") || "animation";
      var sync = function () { v.setAttribute("aria-label", (v.paused ? "Play: " : "Pause: ") + base); };
      sync();
      v.addEventListener("play", sync);
      v.addEventListener("pause", sync);
      var toggle = function () { if (v.paused) v.play(); else v.pause(); };
      v.addEventListener("click", toggle);
      v.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ===================== Lazy image fade (per mount) =====================
     Lazy-loaded images fade in on decode instead of popping into the layout. */
  function initImgFade() {
    document.querySelectorAll('img[loading="lazy"]').forEach(function (im) {
      if (im._f) return; im._f = true;
      var done = function () { im.classList.add("is-loaded"); };
      if (im.complete) done();
      else { im.addEventListener("load", done); im.addEventListener("error", done); }
    });
  }

  /* ===================== Playable game facade (per mount) =====================
     Same contract as the trailer facade: the itch.io embed (the actual playable
     browser build) is injected only when the visitor chooses to play, so the page
     stays fast and makes no third-party request until then. data-upload is the
     itch upload id — adding a new playable game is one markup block. */
  function initGameEmbeds() {
    document.querySelectorAll(".game-embed").forEach(function (el) {
      if (el._g) return; el._g = true;
      var play = function () {
        var id = el.getAttribute("data-upload"); if (!id || el.classList.contains("is-playing")) return;
        // phones: a 720p build scaled into a phone column is unplayably small — hand
        // off to the game's itch.io page, which handles mobile properly
        var page = el.getAttribute("data-page");
        if (page && matchMedia("(max-width: 699px)").matches) {
          var a = document.createElement("a");
          a.href = page; a.target = "_blank"; a.rel = "noopener";
          document.body.appendChild(a); a.click(); a.remove();
          return;
        }
        // itch's embed page renders the build at its fixed pixel size and does NOT
        // scale itself — a smaller iframe just crops it. So: render at native size
        // (data-w/h = build viewport + itch's 20px bar) and scale to the container.
        // Pointer coordinates map through CSS transforms, so the game stays playable.
        var w = parseInt(el.getAttribute("data-w"), 10) || 1280;
        var h = parseInt(el.getAttribute("data-h"), 10) || 740;
        var f = document.createElement("iframe");
        f.src = "https://itch.io/embed-upload/" + id + "?color=020b16";
        f.title = el.getAttribute("data-title") || "Playable game";
        f.allow = "autoplay; fullscreen; gamepad";
        f.setAttribute("allowfullscreen", "");
        f.style.cssText = "position:absolute;top:0;left:0;border:0;width:" + w + "px;height:" + h + "px;transform-origin:0 0";
        var fit = function () { f.style.transform = "scale(" + (el.clientWidth / w).toFixed(5) + ")"; };
        el.classList.add("is-playing");
        // see the trailer facade: innerHTML="" would strand focus on <body>
        el.replaceChildren(f);
        fit();
        try { f.focus({ preventScroll: true }); } catch (_) {}
        addEventListener("resize", fit);
      };
      el.addEventListener("click", play);
      var btn = el.querySelector(".ve-play");
      if (btn) btn.addEventListener("click", function (e) { e.stopPropagation(); play(); });
    });
  }

  /* ===================== Copy email (per mount) =====================
     mailto: buttons silently dead-end on machines without a mail handler, so the
     address is also one click from the clipboard. Clipboard API first, execCommand
     for older engines. */
  function initCopyMail() {
    document.querySelectorAll(".copy-mail").forEach(function (b) {
      if (b._cm) return; b._cm = true;
      var base = b.textContent;
      b.addEventListener("click", function () {
        var text = b.getAttribute("data-copy") || "";
        /* The visual "Copied ✓" stays — but it is announced through a separate status
           region rather than aria-live on the button itself. A live region on the focused
           control is unreliable across screen readers AND it rewrites the button's own
           accessible name, so for two seconds the label stopped describing what it does. */
        var status = document.querySelector("[data-copy-status]");
        var done = function () {
          b.classList.add("copied"); b.textContent = "Copied ✓";
          if (status) status.textContent = "Email address copied to clipboard";
          setTimeout(function () {
            b.classList.remove("copied"); b.textContent = base;
            if (status) status.textContent = "";
          }, 2000);
        };
        var legacy = function () {
          var ta = document.createElement("textarea");
          ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0";
          document.body.appendChild(ta); ta.select();
          try { if (document.execCommand("copy")) done(); } catch (_) {}
          ta.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, legacy);
        } else legacy();
      });
    });
  }

  /* ===================== Reading progress (long-scroll pages) =====================
     Pure CSS scroll timeline (see .read-progress); this only mounts the element on
     pages that scroll the document — the deck has its own rail. */
  function initReadProgress() {
    if (document.querySelector(".snap") || document.querySelector(".read-progress")) return;
    if (!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"))) return;
    var bar = document.createElement("div");
    bar.className = "read-progress"; bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
  }

  /* ===================== Seamless page morph =====================
     A view-transition-name only morphs when the SAME name exists on both documents.
     So instead of a name per game (which could never pair two different case studies)
     there is exactly one name, `vt-hero`, moved onto whichever image is the subject of
     the current navigation:

       home  -> study : pageswap tags the card being opened; the study's hero is tagged
                        in markup, so the card expands into it.
       study -> study : both heroes are tagged in markup -> they morph into each other.
       study -> home  : the study's hero is tagged; on arrival we tag the card we came
                        back to (and scroll it into place first). Reverse of the open. */
  var VT = "vt-hero";
  var hasNavActivation = !!(window.navigation && window.navigation.activation);

  function samePath(a, b) {
    try { return new URL(a, location.href).pathname === new URL(b, location.href).pathname; }
    catch (_) { return false; }
  }
  /* The <img> (or loop <video>) inside the card on THIS page that links to `url` (null
     if there isn't one — e.g. a text-only "Next" link, or when we're not on the home page). */
  function cardImgFor(url) {
    if (!url) return null;
    var links = document.querySelectorAll('a[href*="projects/"]');
    for (var i = 0; i < links.length; i++) {
      if (!samePath(links[i].getAttribute("href"), url)) continue;
      var img = links[i].querySelector("img,video");
      if (img) return img;
    }
    return null;
  }
  function cameFromProjectImg() {
    if (!hasNavActivation) return null;
    var from = navigation.activation.from;
    return from ? cardImgFor(from.url) : null;
  }
  /* Park the deck where this navigation will actually land, BEFORE anything is settled or
     snapshotted. Runs at pagereveal, when setupSlides has not executed yet, so it works
     straight off the DOM rather than off slide state. Covers both routes home:
       1. the Navigation API tells us exactly which card we came back from, or
       2. the Back link's flag plus the remembered index.
     Route 2 previously only ran inside setupSlides at boot — i.e. after the page had
     already been settled around the hero — which is what made the return trip pop.
     Returns the card image so the caller can tag the morph. */
  function restoreDeckEarly() {
    var snap = document.querySelector(".snap");
    var img = cameFromProjectImg();
    if (!snap) return img;
    var panels = snap.querySelectorAll(".panel");
    if (panels.length < 2) return img;
    if (img) {
      var p = img.closest(".panel");
      if (p) { snap.scrollTop = p.offsetTop; return img; }
    }
    var amBack = false, idx = 0;
    try { amBack = sessionStorage.getItem("amBack") === "1"; } catch (_) {}
    if (!amBack) return img;
    try { idx = parseInt(sessionStorage.getItem("amSlide") || "0", 10); } catch (_) {}
    // deliberately does NOT clear amBack — setupSlides still consumes it, and repeating
    // the same jump is idempotent
    if (idx > 0 && idx < panels.length) snap.scrollTop = panels[idx].offsetTop;
    return img;
  }

  /* Everything that will be ON SCREEN when this navigation lands, forced to its final
     state synchronously — before the browser snapshots the incoming page. Sections
     below the fold are left alone, so their scroll reveals still play when reached.
     Called from pagereveal, after the deck has been scrolled into position. */
  function settleForArrival() {
    var vh = window.innerHeight || 0;
    var hero = document.querySelector(".hero, .about-hero, .project-hero");
    if (hero) { hero.classList.add("is-in", "vt-settled"); }
    document.querySelectorAll(".panel, .section-block, .reveal-solo").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 1.05 && r.bottom > -24) el.classList.add("is-in", "vt-settled");
    });
    // an image already decoded should be visible in the snapshot, not fade in after it
    document.querySelectorAll('img[loading="lazy"]').forEach(function (im) {
      if (im.complete && im.naturalWidth > 0) im.classList.add("is-loaded");
    });
  }

  function tagMorph(img) {
    if (!img) return;
    document.querySelectorAll("[data-vt]").forEach(function (el) {
      el.style.viewTransitionName = ""; el.removeAttribute("data-vt");
    });
    img.style.viewTransitionName = VT;
    img.setAttribute("data-vt", "");
  }
  function initMorph() {
    // leaving: if this page has a card for wherever we're going, that card morphs out
    addEventListener("pageswap", function (e) {
      if (!e.viewTransition) return;
      var dest = e.activation && e.activation.entry && e.activation.entry.url;
      tagMorph(cardImgFor(dest));
      try { sessionStorage.setItem("amSlide", String(slide.index)); } catch (_) {}
      /* Record which way this navigation travels so the ARRIVING document can animate
         with the direction instead of the same way every time. Only the outgoing page
         knows both ends of the jump, so it has to be handed over. */
      var deepNow = location.pathname.indexOf("/projects/") > -1;
      var deepNext = !!dest && String(dest).indexOf("/projects/") > -1;
      var dir = deepNext === deepNow ? "lateral" : (deepNext ? "in" : "out");
      try { sessionStorage.setItem("amVtDir", dir); } catch (_) {}
    });
    // arriving: if we came back from a study, that study's card morphs in — but only once
    // it is actually parked on screen, or the snapshot would target an off-screen box and
    // the morph would fly in from nowhere. setupSlides normally scrolls it into place
    // first; re-asserting here is idempotent and keeps this correct whatever the order.
    addEventListener("pagereveal", function (e) {
      if (!e.viewTransition) return;

      /* Land already composed. The browser snapshots this document at its first paint,
         so anything still waiting to animate in gets captured mid-entrance and then
         "pops" once the morph finishes. Mark the document and settle the hero NOW,
         synchronously, so the incoming snapshot is the finished page. */
      var root = document.documentElement;
      root.classList.add("vt-arrive");
      // travel direction handed over by the page we came from (see pageswap)
      var dir = "";
      try { dir = sessionStorage.getItem("amVtDir") || ""; } catch (_) {}
      if (dir === "in" || dir === "out") root.classList.add("vt-" + dir);
      e.viewTransition.finished.finally(function () {
        root.classList.remove("vt-arrive", "vt-in", "vt-out");
        try { sessionStorage.removeItem("amVtDir"); } catch (_) {}
      });

      /* ORDER MATTERS. Put the deck where it will actually land FIRST — until the
         restore has happened, "what is on screen" is the wrong answer, and we would
         settle the wrong sections and leave the visible ones to pop in. */
      var img = restoreDeckEarly();
      settleForArrival();
      if (img) tagMorph(img);
    });
  }

  /* ===================== Starfield (persistent) ===================== */
  function initStars() {
    // The canvas lives outside <main>, so it survives every page swap — start it once.
    var c = document.querySelector(".bg-stars"); if (!c || c._on) return; c._on = true;
    var ctx = c.getContext("2d"), w, h, dpr, stars = [];
    /* Cursor gravity: stars inside a radius lean very slightly toward the pointer and
       brighten. It is deliberately below the threshold of conscious notice — the field
       just feels alive rather than printed. Costs one distance check per star per frame
       and no extra allocation, and it is skipped entirely on touch and reduced motion. */
    var px = -9999, py = -9999, RADIUS = 190, near = [], ripples = [], running = false;
    if (fine && !reduce) addEventListener("mousemove", function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    addEventListener("mouseout", function (e) { if (!e.relatedTarget) { px = py = -9999; } });
    // a click sends a ring out through the field — the only effect that answers a click
    if (!reduce) addEventListener("pointerdown", function (e) {
      if (ripples.length < 4) ripples.push({ x: e.clientX, y: e.clientY, t0: 0 });
    }, { passive: true });
    /* A rare shooting star: one quiet streak, first ~12-30s in, then every 20-40s.
       Never drawn under prefers-reduced-motion (that loop renders a single static frame). */
    var shoot = null, nextShoot = 0;
    function drawShoot(t) {
      if (!nextShoot) { nextShoot = t + 12000 + Math.random() * 18000; return; }
      if (!shoot) {
        if (t < nextShoot) return;
        var ang = (25 + Math.random() * 20) * Math.PI / 180;   // shallow dive
        var dir = Math.random() < 0.5 ? 1 : -1;                // either heading
        var speed = 650 + Math.random() * 250;                 // px/s
        shoot = { x: w * (0.1 + Math.random() * 0.8), y: h * (0.05 + Math.random() * 0.35),
                  vx: Math.cos(ang) * speed * dir, vy: Math.sin(ang) * speed, t0: t, life: 900 };
      }
      var pr = (t - shoot.t0) / shoot.life;
      if (pr >= 1) { shoot = null; nextShoot = t + 20000 + Math.random() * 20000; return; }
      var el = (t - shoot.t0) / 1000;
      var x = shoot.x + shoot.vx * el, y = shoot.y + shoot.vy * el;
      var m = Math.hypot(shoot.vx, shoot.vy), tail = 90;
      var a = pr < 0.15 ? pr / 0.15 : 1 - (pr - 0.15) / 0.85;  // quick in, long fade
      var g = ctx.createLinearGradient(x, y, x - shoot.vx / m * tail, y - shoot.vy / m * tail);
      g.addColorStop(0, "rgba(220,230,255," + (0.85 * a).toFixed(3) + ")");
      g.addColorStop(1, "rgba(220,230,255,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - shoot.vx / m * tail, y - shoot.vy / m * tail); ctx.stroke();
    }
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(150, (w * h) / 11000)); stars = [];
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.5 + 0.15, tw: Math.random() * 0.8 + 0.2, ph: Math.random() * 6.28 });
    }
    /* Repaint budget. The field is ambient decoration, but it was redrawing on every
       animation frame — and a modern phone runs at 120Hz, so it was doing twice the work
       of a 60Hz desktop for a twinkle nobody tracks frame by frame. Capped to ~30fps on
       touch: the twinkle is driven by elapsed time, not frame count, so it moves at
       exactly the same speed, it is just sampled less often. Desktop is left uncapped. */
    var MIN_DT = coarse ? 32 : 0, lastPaint = -1e6;
    function draw(t) {
      if (running && MIN_DT && t - lastPaint < MIN_DT) {
        if (!document.hidden) requestAnimationFrame(draw);
        return;
      }
      lastPaint = t;
      ctx.clearRect(0, 0, w, h);
      // One fillStyle for the whole field, twinkle via globalAlpha. Writing an rgba()
      // string per star per frame meant ~7k string allocations AND CSS colour parses a
      // second; this is the same picture for a fraction of the cost.
      ctx.fillStyle = "rgb(210,220,255)";
      near.length = 0;
      for (var i = 0; i < stars.length; i++) { var s = stars[i];
        var a = reduce ? s.a : s.a * (0.55 + 0.45 * Math.sin(t * 0.001 * s.tw + s.ph));
        var x = s.x, y = s.y, r = s.r;
        if (!reduce) {
          var dx = px - s.x, dy = py - s.y, d2 = dx * dx + dy * dy;
          if (d2 < RADIUS * RADIUS) {
            var pull = 1 - Math.sqrt(d2) / RADIUS;   // 0 at the edge, 1 at the pointer
            x += dx * pull * 0.10; y += dy * pull * 0.10;
            a = Math.min(1, a + pull * 0.55);
            r += pull * 0.5;
            near.push(x, y, pull);                   // candidate for a constellation line
          }
        }
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;

      /* Constellations: stars lit by the cursor link up to their close neighbours, so a
         little figure forms under the pointer and dissolves as it moves on. Only the
         handful already inside RADIUS are considered, so the pair loop stays tiny. */
      if (!reduce && near.length > 5) {
        var LINK = 118, LINK2 = LINK * LINK;
        ctx.strokeStyle = "rgb(150,162,255)"; ctx.lineWidth = 0.7;
        for (var p1 = 0; p1 < near.length; p1 += 3) {
          for (var p2 = p1 + 3; p2 < near.length; p2 += 3) {
            var lx = near[p1] - near[p2], ly = near[p1 + 1] - near[p2 + 1];
            var ld2 = lx * lx + ly * ly;
            if (ld2 > LINK2) continue;
            ctx.globalAlpha = (1 - Math.sqrt(ld2) / LINK) * 0.55 *
                              Math.min(near[p1 + 2], near[p2 + 2]);
            ctx.beginPath();
            ctx.moveTo(near[p1], near[p1 + 1]); ctx.lineTo(near[p2], near[p2 + 1]);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // click ripples: a ring expanding out through the field, then gone
      for (var ri = ripples.length - 1; ri >= 0; ri--) {
        var rp = ripples[ri];
        if (!rp.t0) rp.t0 = t;
        var age = (t - rp.t0) / 850;
        if (age >= 1) { ripples.splice(ri, 1); continue; }
        ctx.globalAlpha = (1 - age) * (1 - age) * 0.42;
        ctx.strokeStyle = "rgb(139,150,255)";
        ctx.lineWidth = 2 * (1 - age);
        ctx.beginPath(); ctx.arc(rp.x, rp.y, 12 + age * 210, 0, 6.283); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Don't paint a starfield nobody can see: a background tab shouldn't burn frames
      // (or battery) on ambient decoration. visibilitychange resumes it.
      if (!reduce) { drawShoot(t); if (running && !document.hidden) requestAnimationFrame(draw); }
    }
    /* One static frame RIGHT NOW, before anything is deferred. The field used to be
       painted inside the post-transition callback, which meant the arriving page carried
       an empty canvas: the outgoing snapshot had stars, the incoming one did not, so the
       sky blinked out and refilled a beat later. Painting once synchronously costs ~150
       arcs and guarantees the backdrop is identical on both sides of every navigation.
       Only the animated loop waits for the morph to land. */
    size(); draw(0);
    document.body.classList.add("stars-on");
    afterTransition(function () { running = true; requestAnimationFrame(draw); });
    if (!reduce) document.addEventListener("visibilitychange", function () {
      if (running && !document.hidden) requestAnimationFrame(draw);   // resume where the loop bailed
    });
    var to; addEventListener("resize", function () { clearTimeout(to); to = setTimeout(size, 160); });
  }

  /* ===================== Scroll state (global) ===================== */
  function initScrollState() {
    addEventListener("scroll", function () { document.body.classList.toggle("scrolled", scrollY > 40); }, { passive: true });
  }

  /* ===================== Navigation =====================
     Only same-page hash links (Work / Contact on the home slides) are intercepted,
     to drive the slide controller / smooth scroll. Every other link is a normal
     browser navigation (reliable). The seamless card -> case-study image-morph comes
     from native cross-document View Transitions (see @view-transition in the CSS). */
  function initHashNav() {
    document.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var url; try { url = new URL(a.getAttribute("href"), location.href); } catch (_) { return; }
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      e.preventDefault();
      hashNav(url.hash);
      closeMenu();
    });
  }
  function hashNav(hash) {
    if (slide.snap && slide.panels.length) {
      var t = hash === "#top" ? slide.panels[0] : document.querySelector(hash);
      var p = t && (t.classList.contains("panel") ? t : t.closest(".panel"));
      var pi = p ? slide.panels.indexOf(p) : -1;
      if (pi >= 0) { slideGo(pi); if (history.replaceState) history.replaceState({}, "", hash); return; }
    }
    var el = document.querySelector(hash); if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }
  /* ===================== Back link: return to exactly where you were =====================
     history.back() is what makes Back correct: it traverses to the real previous entry
     (so study -> study -> Back lands on the study you came from, not the home page),
     keeps the history stack clean, and plays the reverse morph. Where we land on the home
     page is then decided in setupSlides from the previous URL, so it is always the card
     that was opened. The href is only a fallback for deep links / new tabs. */
  function initBackReturn() {
    var back = document.querySelector(".back-link");
    if (back) {
      back.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // let "open in new tab" work
        var href = back.getAttribute("href");
        var fromSite = false;
        try {
          var ref = document.referrer ? new URL(document.referrer) : null;
          fromSite = !!ref && ref.origin === location.origin && ref.pathname !== location.pathname;
        } catch (_) {}
        if (!fromSite || history.length < 2) return;   // deep link / new tab -> plain href, always works

        e.preventDefault();
        try { sessionStorage.setItem("amBack", "1"); } catch (_) {}

        // Safety net: if history.back() cannot actually move (replaced entry, odd history
        // stack, blocked navigation) the page just sits there. Watch for the unload; if it
        // never comes, fall back to the href so the button can never be a dead end.
        var leaving = false;
        var mark = function () { leaving = true; };
        addEventListener("pagehide", mark, { once: true });
        addEventListener("beforeunload", mark, { once: true });

        history.back();

        setTimeout(function () {
          removeEventListener("pagehide", mark);
          removeEventListener("beforeunload", mark);
          if (!leaving && document.visibilityState === "visible") location.href = href;
        }, 600);
      });
    }
    // bfcache restore: the browser already put us back exactly where we were, so the
    // restore flag is stale. (The full-reload case is handled in setupSlides.)
    addEventListener("pageshow", function (ev) {
      if (ev.persisted) {
        try { sessionStorage.removeItem("amBack"); } catch (_) {}
        if (slide.snap) { slide.index = nearestPanel(); updateSlideNav(); headerFlipResolve(); }
      }
    });
  }

  /* ===================== Language ===================== */
  /* The routing decision happens in lang.js, before first paint. This is only the
     UI around it: a switcher in the menu, and — when the visitor was moved
     automatically — one dismissible offer to go back to the language they arrived
     in. Auto-translating someone and giving them no way out is the failure mode
     worth avoiding; a device language is a good guess, not a fact. */
  var LANGS_UI = {
    en: { label: "English",    note: "Shown in your language.",        menu: "Language" },
    es: { label: "Español",    note: "Mostrado en tu idioma.",         menu: "Idioma" },
    fr: { label: "Français",   note: "Affiché dans votre langue.",    menu: "Langue" },
    de: { label: "Deutsch",    note: "In Ihrer Sprache angezeigt.",     menu: "Sprache" },
    it: { label: "Italiano",   note: "Mostrato nella tua lingua.",      menu: "Lingua" },
    pt: { label: "Português", note: "Exibido no seu idioma.",         menu: "Idioma" }
  };
  var LANG_PREFIX = /^\/(es|fr|de|it|pt)(?=\/|$)/;

  function currentLang() {
    var m = location.pathname.match(LANG_PREFIX);
    return m ? m[1] : "en";
  }
  function langHref(to) {
    var rest = location.pathname.replace(LANG_PREFIX, "") || "/";
    return (to === "en" ? "" : "/" + to) + rest + location.search + location.hash;
  }
  function rememberLang(code) {
    try { localStorage.setItem("am-lang", code); } catch (_) {}
    try { sessionStorage.removeItem("am-auto"); } catch (_) {}
  }

  /* Which languages exist is read off the hreflang tags the build wrote into this
     page, so the switcher can never offer a translation that was not generated. */
  function availableLangs() {
    var out = [];
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (l) {
      var c = l.getAttribute("hreflang");
      if (c && c !== "x-default" && LANGS_UI[c] && out.indexOf(c) < 0) out.push(c);
    });
    return out.length > 1 ? out : [];
  }

  /* The header control. The drawer list stays as well: on a phone the menu is where
     people look for settings, and this is the one they will find without opening it. */
  function buildLangButton(here, available) {
    var host = document.querySelector(".header-right");
    if (!host || host.querySelector(".lang-btn")) return;

    var wrap = document.createElement("div");
    wrap.style.position = "relative";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-btn";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-label", (LANGS_UI[here] || LANGS_UI.en).menu);
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>' +
      "</svg><span>" + here.toUpperCase() + "</span>";

    var pop = document.createElement("div");
    pop.className = "lang-pop";
    available.forEach(function (code) {
      var a = document.createElement("a");
      a.href = langHref(code);
      a.lang = code;
      a.setAttribute("rel", "external");        // a language change must reload the document
      if (code === here) a.setAttribute("aria-current", "true");
      a.innerHTML = "<span>" + LANGS_UI[code].label + '</span><span class="code">' +
                    code.toUpperCase() + "</span>";
      a.addEventListener("click", function () { rememberLang(code); });
      pop.appendChild(a);
    });

    var close = function (refocus) {
      pop.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (refocus) btn.focus();
    };
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = pop.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { var f = pop.querySelector("a"); if (f) f.focus(); }
    });
    pop.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { close(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && pop.classList.contains("is-open")) close(true);
    });

    wrap.appendChild(btn); wrap.appendChild(pop);
    host.insertBefore(wrap, host.querySelector(".menu-btn"));
  }

  function initLangUI() {
    var here = currentLang();
    var available = availableLangs();
    if (!available.length) return;               // single-language site, no UI needed
    buildLangButton(here, available);
    var drawer = document.querySelector(".drawer-foot");
    if (drawer && !drawer.querySelector(".lang-switch")) {
      var box = document.createElement("div");
      box.className = "lang-switch";
      var lbl = document.createElement("span");
      lbl.className = "lang-label";
      lbl.textContent = (LANGS_UI[here] || LANGS_UI.en).menu;
      box.appendChild(lbl);
      var list = document.createElement("div");
      list.className = "lang-list";
      available.forEach(function (code) {
        var a = document.createElement("a");
        a.href = langHref(code);
        a.textContent = LANGS_UI[code].label;
        a.lang = code;
        /* A language change must be a real navigation, not a content swap: the
           document's lang attribute has to change with it, or assistive tech and
           the browser's own translator keep reading the page as the old language. */
        a.setAttribute("rel", "external");
        if (code === here) { a.className = "is-current"; a.setAttribute("aria-current", "true"); }
        a.addEventListener("click", function () { rememberLang(code); });
        list.appendChild(a);
      });
      box.appendChild(list);
      drawer.insertBefore(box, drawer.firstChild);
    }

    var cameFrom = null;
    try { cameFrom = sessionStorage.getItem("am-auto"); } catch (_) {}
    if (!cameFrom || cameFrom === here || !LANGS_UI[cameFrom]) return;
    if (document.querySelector(".lang-bar")) return;

    var bar = document.createElement("div");
    bar.className = "lang-bar";
    bar.setAttribute("role", "status");
    var note = document.createElement("span");
    note.textContent = (LANGS_UI[here] || LANGS_UI.en).note;
    var back = document.createElement("a");
    back.href = langHref(cameFrom);
    back.lang = cameFrom;
    back.setAttribute("rel", "external");
    back.className = "lang-bar-go";
    back.textContent = LANGS_UI[cameFrom].label;
    back.addEventListener("click", function () { rememberLang(cameFrom); });
    var close = document.createElement("button");
    close.type = "button";
    close.className = "lang-bar-x";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";
    close.addEventListener("click", function () {
      rememberLang(here);                 // staying is a choice too — remember it
      bar.classList.remove("is-in");
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 400);
    });
    bar.appendChild(note); bar.appendChild(back); bar.appendChild(close);
    document.body.appendChild(bar);
    void bar.offsetWidth;                 // commit the start frame, then slide in
    bar.classList.add("is-in");
  }

  /* ===================== Owned navigation =====================
     The site swaps pages itself instead of letting the browser load them.

     Why: a cross-document navigation ALWAYS tears the old document down, so there is a
     real interval with no page — no backdrop, no header, no text. No amount of
     view-transition tuning removes it, because the gap is the navigation itself. And the
     native cross-document API is Chromium-only (plus Safari 18.2+), so in Firefox there
     was never any transition to tune.

     The model is the one v1 used (Barba's close -> fetch -> finish), rebuilt with no
     dependencies:

       1. a click on an internal link is intercepted;
       2. the fetch starts immediately — usually already warm, because links prefetch on
          hover — and the current content animates OUT while it is in flight, so the load
          happens behind the animation instead of after it;
       3. the incoming <main> is mounted while still invisible, and held there until its
          above-the-fold images have decoded;
       4. only then does it animate in.

     Step 3 is what stops things popping: nothing is ever revealed half-built. And because
     the document survives, the backdrop, starfield, header and drawer are the same live
     elements the whole way through — there is no frame in which they do not exist.

     Anything unexpected (a failed fetch, a page with no <main>, no fetch support) falls
     straight through to a normal browser navigation. A link on this site can never die. */
  var pjax = { busy: false, cache: Object.create(null), at: "" };
  var OUT_MS = 340;

  function pjaxSupported() {
    return !!(window.fetch && window.DOMParser && window.history && history.pushState &&
              window.Promise && document.querySelector("main"));
  }
  /* One identity per page, whatever the URL happens to look like.

     The deployed site does not serve the hrefs this repo contains: Netlify's pretty-URL
     processing rewrites ./projects/gimica.html to /projects/gimica on the way out. So the
     same page arrives as "/projects/gimica" from a link and "/projects/gimica.html" from a
     direct load or a bookmark, and "/" and "/index.html" are both the home page. Comparing
     raw paths made those look like different pages, which is why everything here worked
     locally and not once deployed. Normalise, and both spellings answer to one key. */
  function pageKey(u) {
    var p = String(u.pathname || "/").replace(/\.html?$/i, "").replace(/\/index$/i, "/");
    return (p || "/") + (u.search || "");
  }

  /* Which links we take over. Everything else — external, downloads, new tabs, mailto,
     PDFs, same-page anchors — is left to the browser, which already does it right. */
  function pjaxTarget(a) {
    if (!a || !a.getAttribute) return null;
    if (a.hasAttribute("download")) return null;
    if (a.target && a.target !== "_self") return null;
    if ((a.getAttribute("rel") || "").indexOf("external") > -1) return null;
    var raw = a.getAttribute("href");
    if (!raw || raw.charAt(0) === "#") return null;
    var u; try { u = new URL(raw, location.href); } catch (_) { return null; }
    if (u.origin !== location.origin) return null;
    /* Is this a page, or a file? It used to demand a path ending in .html or "/", which
       on the deployed site rejected EVERY internal link — Netlify serves them
       extensionless (/projects/gimica), so pjax never intercepted a single card click and
       opening a case study was a plain full page load with no morph at all.
       Inverted: anything without a file extension is a page; a real extension that is not
       .html (.pdf, .png, .zip) is a file and belongs to the browser. */
    var last = u.pathname.split("/").pop();
    if (last && /\.[a-z0-9]+$/i.test(last) && !/\.html?$/i.test(last)) return null;
    if (pageKey(u) === pageKey(location)) return null;       // same page -> hash nav
    return u;
  }

  function pjaxFetch(href) {
    if (pjax.cache[href]) return pjax.cache[href];
    var p = fetch(href, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
    pjax.cache[href] = p;
    p.catch(function () { delete pjax.cache[href]; });   // a failure must not be cached
    return p;
  }

  /* Depth decides which way the content travels, so going in and coming back are mirror
     images rather than the same move twice. */
  function pjaxDir(u) {
    var deepNow = location.pathname.indexOf("/projects/") > -1;
    var deepNext = u.pathname.indexOf("/projects/") > -1;
    // Only surfacing reverses the move; going deeper and moving sideways both read
    // as forward travel.
    return (deepNow && !deepNext) ? "out" : "in";
  }

  // Where we are right now, so Back can put us back exactly.
  function pjaxRemember() {
    var snap = document.querySelector(".snap");
    try {
      history.replaceState({ am: 1, y: window.pageYOffset || 0, snap: snap ? snap.scrollTop : 0 },
                           "", location.href);
    } catch (_) {}
  }

  /* Hold the reveal until what is about to be on screen has actually decoded. Bounded,
     because one slow image must never be able to stall a navigation. */
  function pjaxPainted(root) {
    var waits = [];
    root.querySelectorAll("img").forEach(function (im) {
      var r = im.getBoundingClientRect();
      if (r.top > (window.innerHeight || 0) * 1.15) return;      // below the fold, let it lazy-load
      if (im.complete && im.naturalWidth > 0) return;
      waits.push(im.decode ? im.decode().catch(function () {})
                           : new Promise(function (res) { im.onload = im.onerror = res; }));
    });
    if (!waits.length) return Promise.resolve();
    return Promise.race([
      Promise.all(waits),
      new Promise(function (res) { setTimeout(res, 450); })
    ]);
  }

  /* ---------- The morph ----------
     One element is continuously visible across the whole navigation: a fixed copy of the
     image you clicked, which flies from the card into the hero slot on the page you land
     on (and back into the card on the way out).

     It is not decoration. Because the ghost sits above everything and outlives the swap,
     there is no instant where the screen holds nothing — whatever else is still settling,
     the subject of the navigation is on screen the entire time, moving. That is what
     makes it read as one continuous thing rather than a page being replaced. It also
     means the incoming page can take its time loading without any of that being visible.

     If the source or destination cannot be identified — a nav link, a card scrolled out
     of view — nothing is created and the plain cross-fade runs instead. */
  /* Same normalisation for matching a card to a destination: "/projects/gimica" from a
     rewritten href and "/projects/gimica.html" from the address bar are the same thing.
     Comparing them literally is what sent Back to Gimica from every case study — no card
     ever matched, so it fell through to the back link's own #work href. */
  function pjaxFileKey(h) {
    var last = String(h || "").split("#")[0].split("?")[0].replace(/\/+$/, "").split("/").pop();
    return last.replace(/\.html?$/i, "").toLowerCase();
  }

  // The media that stands for a destination on THIS page: the card art for that project.
  function pjaxCardMedia(href) {
    var key = pjaxFileKey(href);
    if (!key) return null;
    var best = null, bestArea = 0;
    document.querySelectorAll("a[href]").forEach(function (a) {
      if (pjaxFileKey(a.getAttribute("href")) !== key) return;
      var m = a.querySelector("img, video");
      if (!m) return;
      var r = m.getBoundingClientRect();
      var area = r.width * r.height;
      if (area > bestArea) { bestArea = area; best = m; }        // the card, not a thumbnail
    });
    return best;
  }
  /* Scoped to the hero SECTION on purpose. `.project-shot` / `.about-portrait` also name
     cards on the home page, sitting in deck panels further down — matching those made the
     home page look like it had a hero, so the ghost aimed at a card three panels below
     the fold instead of the one just clicked. */
  function pjaxHeroMedia() {
    return document.querySelector(".project-hero .project-shot img, .project-hero .project-shot video," +
                                  ".about-hero .portrait img");
  }
  function pjaxStillOf(el) {
    if (el.tagName === "VIDEO") return el.getAttribute("poster") || "";
    return el.currentSrc || el.getAttribute("src") || "";
  }
  function pjaxRadius(el) {
    var cs = getComputedStyle(el);
    if (cs.borderRadius && cs.borderRadius !== "0px") return cs.borderRadius;
    var p = el.parentElement;                     // the radius usually sits on the wrapper
    return p ? getComputedStyle(p).borderRadius : "0px";
  }
  function pjaxGhost(el) {
    if (!el || reduce) return null;
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || 0, vw = window.innerWidth || 0;
    if (r.width < 8 || r.height < 8) return null;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return null;  // not on screen
    var src = pjaxStillOf(el);
    if (!src) return null;
    var g = document.createElement("img");
    g.src = src;
    g.className = "pjax-ghost";
    g.setAttribute("aria-hidden", "true");
    g.style.left = r.left + "px"; g.style.top = r.top + "px";
    g.style.width = r.width + "px"; g.style.height = r.height + "px";
    g.style.borderRadius = pjaxRadius(el);
    g.style.objectFit = getComputedStyle(el).objectFit || "cover";
    document.body.appendChild(g);
    return g;
  }
  /* Fly the ghost onto its destination, then hand over. The real media stays hidden until
     the ghost has both landed AND finished loading, so the hand-off is a swap of two
     identical rectangles — invisible — rather than a flicker. */
  function pjaxLand(ghost, dest, r) {
    if (!ghost) return;
    var finish = function (landed) {
      if (!ghost.parentNode) return;
      if (dest) {
        dest.style.visibility = "";
        /* Mark it arrived — but ONLY if the ghost actually set it down there. The ghost
           has carried this image across, so the destination must not then play its OWN
           entrance (the reveal wipe, the lazy fade) or you watch the same picture appear
           twice in a row. When the ghost merely dissolved, the destination never received
           anything and must keep its normal reveal for when it is scrolled to. */
        if (landed) {
          dest.classList.add("is-loaded", "pjax-landed");
          var wrap = dest.closest(".reveal-media, .reveal, .work-media, .about-portrait, .mc-shot, .project-shot");
          if (wrap) wrap.classList.add("is-in", "pjax-landed");
        }
      }
      ghost.parentNode.removeChild(ghost);
    };
    /* Fly only to somewhere the visitor can actually see. Landing on the home page from a
       link (rather than Back) puts the deck at the top, so the card this image belongs to
       can be thousands of pixels below the fold — flying there sends the image sailing off
       the bottom of the screen. It dissolves in place instead. */
    var vh = window.innerHeight || 0, vw = window.innerWidth || 0;
    var offscreen = !r || r.width < 8 || r.height < 8 ||
                    r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw;
    if (!dest || offscreen) {
      ghost.classList.add("is-done");
      setTimeout(function () { finish(false); }, 420);
      return;
    }
    dest.style.visibility = "hidden";
    ghost.classList.add("is-flying");
    void ghost.offsetWidth;                        // commit the start frame before moving
    ghost.style.left = r.left + "px"; ghost.style.top = r.top + "px";
    ghost.style.width = r.width + "px"; ghost.style.height = r.height + "px";
    ghost.style.borderRadius = pjaxRadius(dest);
    var done = false;
    var settle = function () {
      if (done) return; done = true;
      // don't uncover a hero that has not painted yet
      var img = dest.tagName === "IMG" ? dest : null;
      if (img && !(img.complete && img.naturalWidth > 0)) {
        var t = setTimeout(function () { finish(true); }, 500);
        img.addEventListener("load", function () { clearTimeout(t); finish(true); }, { once: true });
        img.addEventListener("error", function () { clearTimeout(t); finish(true); }, { once: true });
        return;
      }
      finish(true);
    };
    ghost.addEventListener("transitionend", settle, { once: true });
    setTimeout(settle, 900);                       // never strand the ghost on screen
  }

  function pjaxHead(doc) {
    if (doc.title) document.title = doc.title;
    [['meta[name="description"]', "content"], ['link[rel="canonical"]', "href"]]
      .forEach(function (pair) {
        var from = doc.querySelector(pair[0]), to = document.querySelector(pair[0]);
        if (from && to) to.setAttribute(pair[1], from.getAttribute(pair[1]) || "");
      });
  }

  function pjaxSwap(html, u, push, dir, state, ghost, from, isBack) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var incoming = doc.querySelector("main");
    var outgoing = document.querySelector("main");
    if (!incoming || !outgoing) throw new Error("no <main>");

    pjaxHead(doc);

    // Chrome that belongs to the page we are leaving, and lives outside <main>.
    var rp = document.querySelector(".read-progress"); if (rp) rp.remove();
    var hp = document.querySelector(".hunt-pigeon"); if (hp) hp.remove();
    parallaxes.length = 0;                       // drop scenes that no longer exist

    incoming = document.importNode(incoming, true);
    incoming.classList.add("page-hold");         // mounted, but not yet shown
    outgoing.replaceWith(incoming);

    // The back link differs per page (or is absent on the home page).
    var oldBack = document.querySelector(".back-link"), newBack = doc.querySelector(".back-link");
    if (oldBack && newBack) oldBack.replaceWith(document.importNode(newBack, true));
    else if (oldBack) oldBack.remove();
    else if (newBack) incoming.parentNode.insertBefore(document.importNode(newBack, true), incoming);

    var h = document.querySelector(".site-header"), nh = doc.querySelector(".site-header");
    if (h && nh) h.setAttribute("data-theme", nh.getAttribute("data-theme") || "dark");

    if (push) { try { history.pushState({ am: 1, y: 0, snap: 0 }, "", u.href); } catch (_) {} }
    pjax.at = pageKey(u);

    document.body.classList.remove("slides-js", "scrolled");
    mountContent();                              // rebuilds the deck, reveals, embeds…
    initPigeonHunt(); initReadProgress();
    document.querySelectorAll("[data-parallax]").forEach(function (s) { parallaxes.push(new Parallax(s)); });

    // Land in the right place BEFORE anything is visible, so nothing is seen jumping.
    var snap = incoming.classList.contains("snap") ? incoming : null;
    /* Returning to the deck: go to the panel holding the card for the page we just left,
       worked out from the DOM rather than remembered.

       This used to lean on a breadcrumb set at click time, falling back to the back
       link's own href — and every case study's back link points at #work, which is the
       GIMICA panel. So any time the breadcrumb did not match you were silently dumped on
       Gimica no matter which study you were in. It failed after a reload, after moving
       sideways between two studies, and after any history traversal (which cleared it),
       so it broke on the second visit to the same page.

       Deriving it from the card means it cannot drift out of sync: the panel containing
       the link back to where we came from is the panel we came from. It also puts the
       morph target on screen, which is why the return flight had stopped animating —
       the ghost was correctly refusing to fly to a card that was not visible. */
    var backCard = (isBack && snap && from) ? pjaxCardMedia(from) : null;
    var backPanel = backCard && backCard.closest ? backCard.closest(".panel") : null;
    if (backPanel) {
      snap.scrollTop = backPanel.offsetTop;
      window.scrollTo(0, 0);
    } else if (state && typeof state.y === "number") {
      if (snap) snap.scrollTop = state.snap || 0;
      window.scrollTo(0, state.y);
    } else if (u.hash) {
      var t = document.getElementById(u.hash.slice(1));
      var p = t && (t.classList.contains("panel") ? t : t.closest && t.closest(".panel"));
      if (snap && p) snap.scrollTop = p.offsetTop;
      else if (t) t.scrollIntoView({ behavior: "auto" });
      else window.scrollTo(0, 0);
    } else {
      if (snap) snap.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    headerFlipResolve();

    /* Where the flying image is headed: the hero of a case study, or — coming back — the
       card belonging to the page we just left. Hidden before the page is revealed, so the
       real one is never seen sitting there waiting to be flown onto. */
    var dest = ghost ? (pjaxHeroMedia() || pjaxCardMedia(from)) : null;
    var destRect = null;
    if (dest) {
      dest.style.visibility = "hidden";
      /* Measured NOW, before the entrance animation is applied. `page-in` translates and
         scales the whole page, so a rect read after it starts describes where the hero is
         passing through, not where it comes to rest — the ghost would land 30px off and
         the hand-off would jump. visibility:hidden still occupies layout, so this is the
         true settled position. */
      destRect = dest.getBoundingClientRect();
    }

    return pjaxPainted(incoming).then(function () {
      incoming.classList.remove("page-hold");
      incoming.classList.add("page-in");
      pjaxLand(ghost, dest, destRect);
      // Focus moves with the page, or keyboard users would be stranded at the top of a
      // document that changed under them. preventScroll keeps the landing exact, and a
      // pointer-driven focus draws no ring (:focus-visible does not match).
      try { incoming.focus({ preventScroll: true }); } catch (_) { incoming.focus(); }
      pjaxAnnounce(document.title);
      // Drop the class once it has played, so will-change stops holding a layer.
      incoming.addEventListener("animationend", function () {
        incoming.classList.remove("page-in");
      }, { once: true });
    });
  }

  // Screen readers get no page-load event here, so say what arrived.
  function pjaxAnnounce(title) {
    var live = document.getElementById("am-live");
    if (!live) {
      live = document.createElement("p");
      live.id = "am-live"; live.className = "sr-only";
      live.setAttribute("aria-live", "polite"); live.setAttribute("role", "status");
      document.body.appendChild(live);
    }
    live.textContent = (title || "").split("·")[0].trim() + " — page loaded";
  }

  function pjaxGo(u, push, state, isBack) {
    if (pjax.busy) return;
    pjax.busy = true;
    var dir = pjaxDir(u);
    var root = document.documentElement;
    var main = document.querySelector("main");
    var html = pjaxFetch(u.href);                 // in flight during the exit animation
    /* The page we are leaving — the one whose card the hero flies back into. NOT
       location.href: on a Back traversal popstate fires after the URL has already
       changed, so reading it there names the destination and the return flight had
       nothing to aim at. pjax.at still holds the page being left in both cases. */
    var from = pjax.at || location.href;

    /* Lift the subject of this navigation out of the page BEFORE anything moves: on the
       home page that is the card art for wherever we are going, on a case study it is the
       hero. It then stays on screen, above everything, for the whole swap. */
    // Try each candidate rather than committing to whichever merely EXISTS: a hero that
    // is scrolled out of view yields no ghost, and the card should still get its turn.
    var ghost = pjaxGhost(pjaxHeroMedia()) || pjaxGhost(pjaxCardMedia(u.href));

    if (push) pjaxRemember();                     // record where we are leaving from
    closeMenu();
    root.classList.add("nav-busy", "nav-" + dir);
    if (main) main.classList.add("page-out");

    var exited = new Promise(function (res) { setTimeout(res, reduce ? 0 : OUT_MS); });

    Promise.all([html, exited])
      .then(function (v) { return pjaxSwap(v[0], u, push, dir, state, ghost, from, isBack); })
      .then(function () {
        pjax.busy = false;
        root.classList.remove("nav-busy", "nav-in", "nav-out");
      })
      .catch(function () { location.href = u.href; });   // never leave a dead link
  }

  function initPjax() {
    if (!pjaxSupported()) return false;
    pjax.at = pageKey(location);
    try { history.replaceState({ am: 1, y: 0, snap: 0 }, "", location.href); } catch (_) {}

    // Warm the next page on intent, so by click time the HTML is usually already here.
    var warm = function (e) {
      var a = e.target && e.target.closest && e.target.closest("a[href]");
      var u = a && pjaxTarget(a);
      if (u) pjaxFetch(u.href);
    };
    document.addEventListener("mouseover", warm, { passive: true });
    document.addEventListener("touchstart", warm, { passive: true });

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      var a = e.target.closest && e.target.closest("a[href]");
      var u = a && pjaxTarget(a);
      if (!u) return;
      // A swap is already in flight: hand this click to the browser rather than
      // swallowing it. Worst case the visitor gets an ordinary page load — never a link
      // that visibly does nothing.
      if (pjax.busy) return;
      e.preventDefault();
      /* Back link: if it points at the page we actually came from, traverse history
         instead of pushing a new entry. That keeps the stack clean and restores the deck
         to the exact card you opened, because the position is in the history state. */
      var isBack = a.classList.contains("back-link");
      if (isBack && pjax.from === pageKey(u) && history.length > 1) {
        history.back();
        return;
      }
      pjax.from = pageKey(location);
      pjaxGo(u, true, null, isBack);
    });

    addEventListener("popstate", function (e) {
      if (pageKey(location) === pjax.at) { return; }   // hash-only move, not a page change
      var u; try { u = new URL(location.href); } catch (_) { return; }
      pjax.from = null;
      pjaxGo(u, false, e.state, true);   // a traversal is always a "return"
    });
    return true;
  }

  /* Park animations that are running where nobody is looking (touch only).
     A CSS animation keeps running when its element scrolls out of view, so on the home
     deck the hero's three loops and the ticker animate for the whole visit no matter
     which panel you are on. Desktop absorbs it; a phone pays for it in every frame it
     spends compositing something off screen. The margin keeps the neighbouring panel
     live, so a section is never seen frozen as it scrolls in. */
  function initIdleAnimations() {
    if (!coarse || reduce || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle("panel-idle", !en.isIntersecting);
      });
    }, { rootMargin: "25% 0px" });
    document.querySelectorAll(".panel, .project-hero, .ticker").forEach(function (el) { io.observe(el); });
  }

  /* ===================== Mount (per page) ===================== */
  function mountContent() {
    setupSlides();
    initReveals();
    initMagnetic();
    initCardParallax();
    initPigeon();
    initStars();          // paints one frame now; its rAF loop still waits (see initStars)
    initGlowFollow();
    initVideoEmbeds();
    initGameEmbeds();
    initLoopVideos();
    initCopyMail();
    initImgFade();
    initIdleAnimations();
    var hero = document.querySelector(".hero, .about-hero, .project-hero");
    if (hero) requestAnimationFrame(function () { hero.classList.add("is-in"); });
  }

  /* ===================== Boot ===================== */
  function boot() {
    // Only take scroll restoration into our own hands on the page that owns a custom
    // scroll container (.snap); everywhere else the browser's native restore is better
    // (it brings you back to where you were on About / Resume / a case study).
    try {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = document.querySelector(".snap") ? "manual" : "auto";
      }
    } catch (_) {}
    header = document.querySelector(".site-header");
    initCursor(); initMenu(); initScrollState();
    initSlideListeners(); addEventListener("scroll", headerFlipResolve, { passive: true }); addEventListener("resize", headerFlipResolve, { passive: true });
    initHashNav();
    /* initPjax owns every internal link from here on, back link included: it lands you on
       the exact card you opened via the scroll position in history state. Only if it
       can't run (no fetch / no DOMParser) does the old cross-document Back handling take
       over, so that path is never left unmanned. */
    if (!initPjax()) initBackReturn();
    initLangUI();
    mountContent(); headerFlipResolve();
    // Everything that INJECTS new chrome waits for the page morph to land. Injecting
    // mid-transition is what makes an element appear out of nowhere a beat after the
    // page arrives — the pigeon and the reading bar were doing exactly that. Held back,
    // they fade in on a settled page instead of popping onto a moving one.
    afterTransition(function () {
      initPigeonHunt();
      initReadProgress();
      document.querySelectorAll("[data-parallax]").forEach(function (s) { parallaxes.push(new Parallax(s)); });
    });
  }
  /* Failsafe: if ANYTHING in boot throws (an exotic engine, an aggressive privacy
     extension), the site must degrade to a fully readable static page — never a page
     of invisible content and dead buttons. Dropping .js restores all reveals;
     dropping slides-js restores native CSS scroll-snap. */
  function bootSafe() {
    try { boot(); }
    catch (err) {
      document.documentElement.classList.remove("js");
      if (document.body) document.body.classList.remove("slides-js");
      throw err;
    }
  }
  // Registered immediately (not in boot): pagereveal fires at the first render
  // opportunity, and the listener must exist before then.
  initMorph();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootSafe); else bootSafe();
})();
