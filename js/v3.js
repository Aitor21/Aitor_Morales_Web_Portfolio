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
          self.tx = clamp((e.gamma - self.calib.g) / 40, -1, 1);
          self.ty = clamp((e.beta - self.calib.b) / 40, -1, 1);
        };
        window.addEventListener("deviceorientation", self._orient);
        self.start();
      };
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        motionPrompt(function () { DeviceOrientationEvent.requestPermission().then(function (s) { if (s === "granted") attach(); }).catch(function () {}); });
      } else { attach(); }
    } else {
      self._move = function (e) { self.tx = (e.clientX / innerWidth) * 2 - 1; self.ty = (e.clientY / innerHeight) * 2 - 1; };
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
      var l = this.layers[i], d = parseFloat(l.getAttribute("data-depth")) || 0;
      l.style.transform = "translate3d(" + (-this.cx * d * this.scalar).toFixed(2) + "vmin," + (-this.cy * d * this.scalar).toFixed(2) + "vmin,0)";
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

  /* ===================== Header theme flip (global listener) ===================== */
  var header;
  function headerFlipResolve() {
    if (!header) return;
    var themed = document.querySelectorAll("[data-theme]:not(.site-header)");
    if (!themed.length) return;
    var LINE = 34, theme = themed[0].getAttribute("data-theme") || "dark";
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= LINE && r.bottom > LINE) { theme = themed[i].getAttribute("data-theme") || "dark"; break; }
    }
    if (header.getAttribute("data-theme") !== theme) {
      header.setAttribute("data-theme", theme);
      var c = theme === "light" ? "var(--ink)" : "var(--white)";
      var back = document.querySelector(".back-link"); if (back) back.style.color = c;
      var hint = document.querySelector(".scroll-hint"); if (hint) hint.style.color = c;
    }
  }

  /* ===================== Slide controller (global listeners + state) =====================
     slide.active  = the desktop JS controller (wheel/keys drive an eased scroll).
     The progress indicator is INDEPENDENT of it: it is built on every device that has a
     multi-panel .snap, and on touch it follows the native scroll-snap position. */
  var slide = { snap: null, panels: [], index: 0, animating: false, active: false, nav: null, dots: [], count: null };
  function setupSlides() {
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
          // remember where we are, so the case-study Back button can bring us right back
          try { sessionStorage.setItem("amSlide", String(slide.index)); } catch (_) {}
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
      b.addEventListener("click", function () { slideGo(i); });
      nav.appendChild(b); slide.dots.push(b);
    });
    var count = document.createElement("span");
    count.className = "slide-count"; count.setAttribute("aria-hidden", "true");
    count.innerHTML = '<b></b>' + pad2(slide.panels.length);
    nav.appendChild(count); slide.count = count;

    document.body.appendChild(nav); slide.nav = nav;
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
  function slideGo(i, alignBottom) {
    if (!slide.snap || !slide.panels.length) return;
    i = clamp(i, 0, slide.panels.length - 1);
    try { sessionStorage.setItem("amSlide", String(i)); } catch (_) {}
    var p = slide.panels[i];
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
    slide.index = i; slide.animating = true; updateSlideNav();
    var start = slide.snap.scrollTop, dist = end - start, t0 = null, dur = 320;
    var ease = function (t) { return 1 - Math.pow(1 - t, 4); }; // easeOutQuart — snappy, smooth settle
    function step(ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      slide.snap.scrollTop = start + dist * ease(p);
      if (p < 1) requestAnimationFrame(step);
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
    var lastWheel = 0, lastInner = 0;
    function panelRoom(dir) {   // px of hidden panel content in that direction
      var p = slide.panels[slide.index];
      if (!p) return 0;
      return dir > 0
        ? (p.offsetTop + p.offsetHeight) - (slide.snap.scrollTop + slide.snap.clientHeight)
        : slide.snap.scrollTop - p.offsetTop;
    }
    window.addEventListener("wheel", function (e) {
      if (!slide.active) return;
      if (e.ctrlKey) return;                   // pinch / Ctrl+wheel zoom stays the browser's
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var dir = e.deltaY > 0 ? 1 : -1;
      if (!slide.animating && e.deltaY && panelRoom(dir) > 1) {
        lastInner = now;                       // tall panel: hand the event to native scroll
        return;
      }
      e.preventDefault();
      if (slide.animating || Math.abs(e.deltaY) < 4) return;
      if (now - lastInner < 160) return;       // settle on the tall panel's edge first
      if (now - lastWheel < 90) return;        // swallow the momentum/inertia tail only
      lastWheel = now;
      slideGo(slide.index + dir, dir < 0);     // fire on the FIRST real notch — no wait
    }, { passive: false });
    window.addEventListener("keydown", function (e) {
      if (!slide.active || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
      var k = e.key;
      if (k === "Home") { e.preventDefault(); slideGo(0); return; }
      if (k === "End") { e.preventDefault(); slideGo(slide.panels.length - 1); return; }
      if (k === " " && t && t.closest && t.closest("a,button,summary")) return; // Space activates those
      var down = k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey);
      var up = k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey);
      if (!down && !up) return;
      e.preventDefault();                      // Space no longer scrolls to un-snapped spots
      if (slide.animating) return;
      var dir = down ? 1 : -1, room = panelRoom(dir);
      if (room > 1) {                          // tall panel: step through it, never past it
        var step = Math.min(room, k === "ArrowDown" || k === "ArrowUp" ? 140 : slide.snap.clientHeight * 0.85);
        scrollElTo(slide.snap, slide.snap.scrollTop + dir * step, true);
      } else {
        slideGo(slide.index + dir, dir < 0);
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
      if (refocus) btn.focus();
    };
    btn.addEventListener("click", function () {
      var open = !isOpen();
      document.body.classList.toggle("menu-open", open); btn.setAttribute("aria-expanded", open ? "true" : "false");
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
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, on = false;
    addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!on) { on = true; document.body.classList.add("cursor-on"); }
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    }, { passive: true });
    addEventListener("mouseout", function (e) { if (!e.relatedTarget) { document.body.classList.remove("cursor-on"); on = false; } });
    (function raf() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)"; requestAnimationFrame(raf); })();

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

  /* ===================== Magnetic buttons (per mount) ===================== */
  function initMagnetic() {
    if (!fine || reduce) return;
    document.querySelectorAll(".btn").forEach(function (el) {
      if (el._mag) return; el._mag = true;
      el.addEventListener("mousemove", function (e) {
        var b = el.getBoundingClientRect();
        el.style.transform = "translate(" + (e.clientX - (b.left + b.width / 2)) * 0.3 + "px," + (e.clientY - (b.top + b.height / 2)) * 0.4 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
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
        f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
        f.title = el.getAttribute("data-title") || "Trailer";
        f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        f.setAttribute("allowfullscreen", "");
        el.classList.add("is-playing");
        el.innerHTML = ""; el.appendChild(f);
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
        el.innerHTML = ""; el.appendChild(f);
        fit();
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
        var done = function () {
          b.classList.add("copied"); b.textContent = "Copied ✓";
          setTimeout(function () { b.classList.remove("copied"); b.textContent = base; }, 2000);
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
      var hero = document.querySelector(".hero, .about-hero, .project-hero");
      if (hero) hero.classList.add("is-in");
      e.viewTransition.finished.finally(function () { root.classList.remove("vt-arrive"); });

      var img = cameFromProjectImg();
      if (!img) return;
      var snap = document.querySelector(".snap"), panel = img.closest(".panel");
      if (snap && panel) snap.scrollTop = panel.offsetTop;
      tagMorph(img);
    });
  }

  /* ===================== Starfield (persistent) ===================== */
  function initStars() {
    var c = document.querySelector(".bg-stars"); if (!c) return;
    var ctx = c.getContext("2d"), w, h, dpr, stars = [];
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(150, (w * h) / 11000)); stars = [];
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.5 + 0.15, tw: Math.random() * 0.8 + 0.2, ph: Math.random() * 6.28 });
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) { var s = stars[i]; var a = reduce ? s.a : s.a * (0.55 + 0.45 * Math.sin(t * 0.001 * s.tw + s.ph));
        ctx.beginPath(); ctx.fillStyle = "rgba(210,220,255," + a.toFixed(3) + ")"; ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
      if (!reduce) requestAnimationFrame(draw);
    }
    size(); requestAnimationFrame(draw);
    document.body.classList.add("stars-on");
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

  /* ===================== Mount (per page) ===================== */
  function mountContent() {
    setupSlides();
    initReveals();
    initMagnetic();
    initVideoEmbeds();
    initGameEmbeds();
    initLoopVideos();
    initCopyMail();
    initReadProgress();
    initImgFade();
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
    initHashNav(); initBackReturn();
    mountContent(); headerFlipResolve();
    // the two rAF-hungry loops wait for the page morph to land
    afterTransition(function () {
      initStars();
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
