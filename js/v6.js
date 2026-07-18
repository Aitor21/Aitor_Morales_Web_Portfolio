/* ============================================================================
   THE OFFICER & THE NEBULA — v6 behaviour layer
   Progressive enhancement only. The site is complete and readable with this
   file absent; nothing here gates content, navigation, or meaning.

   Markup contract (all optional, all may repeat):
     .rise                     reveal on scroll (stagger via --i)
     [data-theme-toggle]       theme switch, label in [data-theme-label]
     .menu-btn + .mh-nav       mobile navigation
     canvas[data-nebula]       particle hero
     .gb + [data-gb-toggle]    greybox ⇄ gold reveal
     .flash                    flashlight excavation
     [data-copy]               copy-to-clipboard (email)
   ========================================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduce = mq("(prefers-reduced-motion:reduce)");
  var finePointer = mq("(hover:hover) and (pointer:fine)");

  /* ---- capability tier: full / lite / static -------------------------- */
  var tier = (function () {
    if (reduce) return "static";
    var mem = navigator.deviceMemory || 4;
    var cpu = navigator.hardwareConcurrency || 4;
    if (mem <= 2 || cpu <= 2) return "lite";
    if (!finePointer && window.innerWidth < 720) return "lite";
    return "full";
  })();
  root.setAttribute("data-tier", tier);

  /* ---- theme ---------------------------------------------------------- */
  (function () {
    var btns = document.querySelectorAll("[data-theme-toggle]");
    if (!btns.length) return;
    var stored = null;
    try { stored = localStorage.getItem("v6-theme"); } catch (e) {}
    if (stored === "dark" || stored === "light") root.setAttribute("data-theme", stored);

    function isDark() {
      var t = root.getAttribute("data-theme");
      if (t) return t === "dark";
      return !mq("(prefers-color-scheme:light)");
    }
    function sync() {
      var d = isDark();
      [].forEach.call(document.querySelectorAll("[data-theme-label]"), function (l) {
        l.textContent = d ? "Catalogue" : "Gallery";
      });
      [].forEach.call(btns, function (b) {
        b.setAttribute("aria-label", d ? "Switch to the light catalogue" : "Switch to the night gallery");
      });
    }
    [].forEach.call(btns, function (b) {
      b.addEventListener("click", function () {
        var next = isDark() ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("v6-theme", next); } catch (e) {}
        sync();
      });
    });
    sync();
  })();

  /* ---- mobile navigation ---------------------------------------------- */
  (function () {
    var btn = document.querySelector(".menu-btn");
    var nav = document.querySelector(".mh-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Close" : "Menu";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Menu";
      }
    });
  })();

  /* ---- reveal on scroll ------------------------------------------------ */
  (function () {
    var els = [].slice.call(document.querySelectorAll(".rise"));
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---- greybox ⇄ gold --------------------------------------------------- */
  [].forEach.call(document.querySelectorAll(".gb"), function (gb) {
    var btn = gb.querySelector("[data-gb-toggle]");
    var locked = false;
    function set(on) {
      gb.classList.toggle("gold", on);
      if (btn) {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? "Back to blockout" : "Reveal the gold";
      }
    }
    if (btn) {
      btn.addEventListener("click", function () {
        locked = !gb.classList.contains("gold");
        set(locked);
      });
    }
    if (finePointer) {
      gb.addEventListener("mouseenter", function () { if (!locked) set(true); });
      gb.addEventListener("mouseleave", function () { if (!locked) set(false); });
    }
  });

  /* ---- flashlight excavation ------------------------------------------- */
  [].forEach.call(document.querySelectorAll(".flash"), function (flash) {
    function move(x, y) {
      var r = flash.getBoundingClientRect();
      flash.style.setProperty("--mx", ((x - r.left) / r.width * 100) + "%");
      flash.style.setProperty("--my", ((y - r.top) / r.height * 100) + "%");
    }
    flash.addEventListener("mousemove", function (e) { move(e.clientX, e.clientY); });
    flash.addEventListener("touchmove", function (e) {
      if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  });

  /* ---- copy to clipboard ------------------------------------------------ */
  [].forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
    var original = btn.textContent;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = original; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {});
      }
    });
  });

  /* ---- the nebula ------------------------------------------------------- *
     A particle field that rests as a luminous presence and breathes on a
     flow field. Production target: seed particle homes from Aitor's own
     portrait so the galaxy is literally made of him (see CREATIVE_DIRECTION_v6).
     Degrades to a single still frame under reduced-motion, and is skipped
     entirely on the 'lite' tier.
   * ---------------------------------------------------------------------- */
  (function () {
    var cv = document.querySelector("canvas[data-nebula]");
    if (!cv || !cv.getContext || tier === "lite") return;

    var ctx = cv.getContext("2d");
    var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    var W = 0, H = 0, parts = [], N = 0, raf = null, t = 0;
    var mouse = { x: -9999, y: -9999, on: false };

    var palette = [
      { c: [200, 120, 120], w: 34 },  /* rose glow  */
      { c: [122, 42, 52],  w: 26 },   /* oxblood    */
      { c: [150, 110, 116], w: 16 },  /* dusty      */
      { c: [110, 150, 120], w: 14 },  /* verd       */
      { c: [228, 201, 120], w: 4 }    /* starlight  */
    ];
    function makeSprite(rgb) {
      var s = 64, o = document.createElement("canvas");
      o.width = o.height = s;
      var g = o.getContext("2d");
      var rad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      var c = rgb[0] + "," + rgb[1] + "," + rgb[2];
      rad.addColorStop(0, "rgba(" + c + ",0.9)");
      rad.addColorStop(0.4, "rgba(" + c + ",0.25)");
      rad.addColorStop(1, "rgba(" + c + ",0)");
      g.fillStyle = rad; g.fillRect(0, 0, s, s);
      return o;
    }
    var sprites = palette.map(function (p) { return makeSprite(p.c); });
    var weighted = [];
    palette.forEach(function (p, i) { for (var k = 0; k < p.w; k++) weighted.push(i); });

    function seed() {
      parts.length = 0;
      var target = Math.round((W * H) / 9000);
      N = Math.max(320, Math.min(tier === "full" ? 1400 : 700, target));
      var cx = W * 0.30, cy = H * 0.46, ell = Math.min(W, H) * 0.42;
      for (var i = 0; i < N; i++) {
        var halo = Math.random() < 0.34, hx, hy;
        if (halo) { hx = Math.random() * W; hy = Math.random() * H; }
        else {
          var a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), 0.7);
          hx = cx + Math.cos(a) * rr * ell * 1.15;
          hy = cy + Math.sin(a) * rr * ell * 1.35;
        }
        var pi = weighted[(Math.random() * weighted.length) | 0];
        parts.push({
          x: hx, y: hy, hx: hx, hy: hy, vx: 0, vy: 0, pi: pi,
          r: (Math.random() * 2.4 + 0.8) * (pi === 4 ? 1.6 : 1),
          a: Math.random() * 0.5 + 0.25,
          ph: Math.random() * 6.28
        });
      }
    }
    function resize() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    }
    function field(x, y, tt) {
      return Math.sin(x * 0.0032 + tt) * 1.4 +
             Math.cos(y * 0.0041 - tt * 0.7) * 1.4 +
             Math.sin((x + y) * 0.0016 + tt * 0.35);
    }
    function frame() {
      t += 0.0016;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < N; i++) {
        var p = parts[i];
        var a = field(p.x, p.y, t);
        p.vx += Math.cos(a) * 0.02; p.vy += Math.sin(a) * 0.02;
        p.vx += (p.hx - p.x) * 0.0016; p.vy += (p.hy - p.y) * 0.0016;
        if (mouse.on) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 18000) {
            var f = (18000 - d2) / 18000 * 0.9, d = Math.sqrt(d2) || 1;
            p.vx += dx / d * f; p.vy += dy / d * f;
          }
        }
        p.vx *= 0.94; p.vy *= 0.94; p.x += p.vx; p.y += p.vy;
        var sz = p.r * 7;
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 8 + p.ph));
        ctx.drawImage(sprites[p.pi], p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    frame(); /* under reduced-motion this paints exactly one still frame */

    if (finePointer && !reduce) {
      cv.addEventListener("mousemove", function (e) {
        var r = cv.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
      });
      var host = cv.parentNode;
      if (host) host.addEventListener("mouseleave", function () { mouse.on = false; });
    }

    var rz;
    window.addEventListener("resize", function () {
      clearTimeout(rz);
      rz = setTimeout(function () {
        resize();
        if (reduce) frame();
      }, 180);
    });

    /* stop burning frames when the hero is off-screen */
    if ("IntersectionObserver" in window && !reduce) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (!raf) frame(); }
          else if (raf) { cancelAnimationFrame(raf); raf = null; }
        });
      }, { threshold: 0 }).observe(cv);
    }
  })();
})();
