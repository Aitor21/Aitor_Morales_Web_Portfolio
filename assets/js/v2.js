/* Aitor Morales — Portfolio v2.2
   Faithful vanilla reimplementation of the v1 experience:
   loader + curtain page transitions (barba.js-style), fullscreen gradient menu,
   fullpage slide sections with left dots (fullPage.js-style), line reveals,
   mouse + gyroscope parallax, scroll reveals. No dependencies. */
(function () {
  "use strict";

  var EASE = "cubic-bezier(0.645, 0.045, 0.355, 1)";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= Line reveals: wrap .js-letter content in a mask ================= */
  document.querySelectorAll(".js-letter").forEach(function (el) {
    if (el.querySelector(".l")) return;
    var inner = document.createElement("span");
    inner.className = "l";
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
  });

  /* ================= Curtain page transitions ================= */
  var curtain = document.querySelector(".curtain");
  var loader = document.querySelector(".loader");

  function revealPage() {
    document.documentElement.classList.add("is-ready");
    // Activate hero/page-top reveals shortly after the cover leaves
    setTimeout(function () {
      var first = document.querySelector(".fp-section") || document.body;
      first.classList.add("is-active");
      document.querySelectorAll(".page-top .js-letter").forEach(function (el) { el.classList.add("in"); });
    }, 150);
  }

  var cameThroughCurtain = false;
  try { cameThroughCurtain = sessionStorage.getItem("curtain") === "1"; sessionStorage.removeItem("curtain"); } catch (e) {}

  if (cameThroughCurtain && curtain) {
    // Previous page slid the curtain up — start covered, then slide it away upward.
    if (loader) loader.remove();
    curtain.classList.add("curtain--cover");
    var swapped = false;
    var swapOut = function () {
      if (swapped) return;
      swapped = true;
      curtain.classList.remove("curtain--cover");
      curtain.classList.add("is-out");
      var clear = function () { curtain.classList.remove("is-out"); };
      curtain.addEventListener("transitionend", clear, { once: true });
      setTimeout(clear, 1200); // safety if transitionend never fires
      revealPage();
    };
    requestAnimationFrame(function () { requestAnimationFrame(swapOut); });
    setTimeout(swapOut, 500); // rAF can be frozen in throttled/background tabs
  } else if (loader) {
    // First load: loader curtain lifts once everything is ready.
    var lift = function () {
      loader.classList.add("is-done");
      revealPage();
      setTimeout(function () { loader.remove(); }, 900);
    };
    if (document.readyState === "complete") setTimeout(lift, 200);
    else window.addEventListener("load", function () { setTimeout(lift, 200); });
    // Safety: never leave the loader stuck.
    setTimeout(function () { if (document.body.contains(loader)) lift(); }, 3500);
  } else {
    revealPage();
  }

  function internalLink(a) {
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return null;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^mailto:|^tel:/.test(href)) return null;
    if (a.origin !== location.origin) return null;
    // same page + hash → let the fullpage/anchor logic handle it
    if (a.pathname === location.pathname && a.hash) return null;
    return a;
  }

  document.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = internalLink(e.target.closest("a"));
    if (!a || !curtain) return;
    e.preventDefault();
    try { sessionStorage.setItem("curtain", "1"); } catch (err) {}
    curtain.classList.add("is-in");
    setTimeout(function () { location.href = a.href; }, 820);
  });

  // Barba-style prefetch on hover/touch
  var prefetched = {};
  document.addEventListener("pointerover", function (e) {
    var a = internalLink(e.target.closest("a"));
    if (!a || prefetched[a.href]) return;
    prefetched[a.href] = 1;
    var l = document.createElement("link");
    l.rel = "prefetch"; l.href = a.href;
    document.head.appendChild(l);
  });

  // Restore state when page is served from bfcache with curtain up
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && curtain) curtain.classList.remove("is-in");
  });

  /* ================= Fullscreen gradient menu ================= */
  var menuBtn = document.querySelector(".menuIcon");
  var globalNav = document.querySelector(".global-nav");
  if (menuBtn && globalNav) {
    menuBtn.addEventListener("click", function () {
      var open = globalNav.classList.toggle("js-open");
      menuBtn.classList.toggle("js-menuOpen", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    globalNav.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      // same-page anchors: close the menu and jump
      if (a.pathname === location.pathname && a.hash) {
        globalNav.classList.remove("js-open");
        menuBtn.classList.remove("js-menuOpen");
      }
      // cross-page links fall through to the curtain handler above
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && globalNav.classList.contains("js-open")) {
        globalNav.classList.remove("js-open");
        menuBtn.classList.remove("js-menuOpen");
      }
    });
  }

  /* ================= FullPage engine (home) ================= */
  var track = document.getElementById("js-fullpage");
  var fp = null;
  if (track) {
    var sections = Array.prototype.slice.call(track.querySelectorAll(".fp-section"));
    var anchors = sections.map(function (s) { return s.getAttribute("data-anchor") || ""; });
    var labels = sections.map(function (s) { return s.getAttribute("data-label") || ""; });
    var current = 0, locked = false;
    var scrollDown = document.querySelector(".scrollDown");
    var navEl = document.querySelector(".fp-nav");

    var useFullpage = function () {
      return !reduceMotion && window.innerHeight >= 480 && window.innerWidth >= 480;
    };

    var buildNav = function () {
      if (!navEl) return;
      navEl.innerHTML = "";
      sections.forEach(function (_, i) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.setAttribute("aria-label", labels[i] || "Section " + (i + 1));
        var lab = document.createElement("span");
        lab.className = "label"; lab.textContent = labels[i];
        b.appendChild(lab);
        b.addEventListener("click", function () { goTo(i); });
        li.appendChild(b);
        navEl.appendChild(li);
      });
    };

    var setActive = function (i) {
      sections.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      if (navEl) Array.prototype.forEach.call(navEl.children, function (li, k) {
        li.classList.toggle("is-active", k === i);
      });
      if (scrollDown) scrollDown.classList.toggle("is-hidden", i !== 0);
      if (anchors[i]) history.replaceState(null, "", "#" + anchors[i]);
    };

    var goTo = function (i, instant) {
      if (i < 0 || i >= sections.length || (locked && !instant)) return;
      current = i;
      if (document.body.classList.contains("no-fullpage")) {
        sections[i].scrollIntoView({ behavior: instant ? "auto" : "smooth" });
        setActive(i);
        return;
      }
      locked = true;
      track.style.transform = "translate3d(0,-" + i * 100 + "%,0)";
      setActive(i);
      setTimeout(function () { locked = false; }, instant ? 0 : 1100);
    };
    fp = { goTo: goTo, sectionsLength: sections.length };

    var applyMode = function () {
      var on = useFullpage();
      document.body.classList.toggle("has-fullpage", on);
      document.body.classList.toggle("no-fullpage", !on);
      if (on) {
        track.style.transition = "none";
        track.style.transform = "translate3d(0,-" + current * 100 + "%,0)";
        void track.offsetHeight;
        track.style.transition = "";
      } else {
        track.style.transform = "";
        // In scroll mode, mark sections active as they enter view
        if ("IntersectionObserver" in window && !track._io) {
          track._io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              if (en.isIntersecting) en.target.classList.add("is-active");
            });
          }, { threshold: 0.35 });
          sections.forEach(function (s) { track._io.observe(s); });
        }
      }
    };

    buildNav();
    applyMode();
    window.addEventListener("resize", applyMode);
    window.addEventListener("orientationchange", applyMode);
    window.addEventListener("load", applyMode);
    setTimeout(applyMode, 400);

    // Deep link (#anchor)
    if (location.hash) {
      var idx = anchors.indexOf(location.hash.slice(1));
      if (idx > 0) setTimeout(function () { goTo(idx, true); }, 50);
    }

    // Wheel — one gesture, one slide (fullPage.js feel)
    var wheelBlock = 0;
    window.addEventListener("wheel", function (e) {
      if (!document.body.classList.contains("has-fullpage")) return;
      e.preventDefault();
      var now = Date.now();
      if (locked || now - wheelBlock < 150) { wheelBlock = now; return; }
      if (Math.abs(e.deltaY) < 8) return;
      wheelBlock = now;
      goTo(current + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    // Touch swipe
    var touchY = null, touchX = null;
    window.addEventListener("touchstart", function (e) {
      touchY = e.touches[0].clientY; touchX = e.touches[0].clientX;
    }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (document.body.classList.contains("has-fullpage")) e.preventDefault();
    }, { passive: false });
    window.addEventListener("touchend", function (e) {
      if (!document.body.classList.contains("has-fullpage") || touchY === null) return;
      var dy = touchY - e.changedTouches[0].clientY;
      var dx = touchX - e.changedTouches[0].clientX;
      touchY = touchX = null;
      if (Math.abs(dy) < 46 || Math.abs(dy) < Math.abs(dx)) return;
      goTo(current + (dy > 0 ? 1 : -1));
    }, { passive: true });

    // Keyboard
    window.addEventListener("keydown", function (e) {
      if (!document.body.classList.contains("has-fullpage")) return;
      if (globalNav && globalNav.classList.contains("js-open")) return;
      var k = e.key;
      if (k === "ArrowDown" || k === "PageDown" || k === " ") { e.preventDefault(); goTo(current + 1); }
      else if (k === "ArrowUp" || k === "PageUp") { e.preventDefault(); goTo(current - 1); }
      else if (k === "Home") { e.preventDefault(); goTo(0); }
      else if (k === "End") { e.preventDefault(); goTo(sections.length - 1); }
    });

    // In-page anchor links (menu, buttons) slide instead of jump
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a || a.origin !== location.origin || a.pathname !== location.pathname || !a.hash) return;
      var idx2 = anchors.indexOf(a.hash.slice(1));
      if (idx2 === -1) return;
      e.preventDefault();
      goTo(idx2);
    });
  }

  /* ================= Scroll reveals (subpages + no-fullpage mode) ================= */
  var revealEls = document.querySelectorAll(".js-scroll");
  if (revealEls.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.15 });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("in"); });
    }
  }

  /* ================= Parallax scene: mouse + gyroscope ================= */
  var scene = document.querySelector(".scene");
  if (scene && !reduceMotion) {
    var layers = Array.prototype.slice.call(scene.querySelectorAll("[data-depth]"));
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    var paint = function () {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      layers.forEach(function (layer) {
        var d = parseFloat(layer.getAttribute("data-depth")) || 0;
        layer.style.transform = "translate3d(" + cx * d + "px," + cy * d + "px,0)";
      });
      if (Math.abs(tx - cx) > 0.15 || Math.abs(ty - cy) > 0.15) raf = requestAnimationFrame(paint);
      else raf = null;
    };
    var kick = function () { if (raf === null) raf = requestAnimationFrame(paint); };

    window.addEventListener("mousemove", function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * -44;
      ty = (e.clientY / window.innerHeight - 0.5) * -32;
      kick();
    }, { passive: true });

    var onOrient = function (e) {
      if (e.gamma == null || e.beta == null) return;
      var g = Math.max(-28, Math.min(28, e.gamma));
      var b = Math.max(-28, Math.min(28, e.beta - 42));
      tx = (g / 28) * -38;
      ty = (b / 28) * -28;
      kick();
    };

    var motionBtn = document.querySelector(".motion-btn");
    var needsPerm = typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function";

    if (needsPerm) {
      if (motionBtn) {
        motionBtn.classList.add("is-shown");
        motionBtn.addEventListener("click", function () {
          DeviceOrientationEvent.requestPermission().then(function (state) {
            if (state === "granted") window.addEventListener("deviceorientation", onOrient, { passive: true });
            motionBtn.classList.remove("is-shown");
          }).catch(function () { motionBtn.classList.remove("is-shown"); });
        });
      }
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientation", onOrient, { passive: true });
    }
  }
})();
