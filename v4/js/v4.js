/* =====================================================================
   v4 "GREYBOX / GOLD" — one file, no dependencies.
   Everything here degrades to nothing: without JS the page is the
   finished PLAY build, complete and readable.
   ===================================================================== */
(function () {
  "use strict";
  var html = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Mode: one DOM, two skins ---------------- */
  var wipe = document.querySelector(".wipe");
  var switchBtn = document.querySelector(".mode-switch");
  var switchWord = switchBtn && switchBtn.querySelector(".mode-word");
  var flipping = false;

  function applyMode(mode) {
    html.setAttribute("data-mode", mode);
    try { sessionStorage.setItem("v4mode", mode); } catch (e) {}
    if (switchBtn) {
      var editing = mode === "edit";
      switchBtn.setAttribute("aria-pressed", String(editing));
      /* the button names the mode you'd switch TO */
      switchWord.textContent = editing ? "PLAY MODE" : "EDIT MODE";
    }
    renderHud();
  }
  function toggleMode() {
    if (flipping) return;
    var next = html.getAttribute("data-mode") === "edit" ? "play" : "edit";
    if (reduced || !wipe) { applyMode(next); return; }
    flipping = true;
    wipe.classList.add("run");
    setTimeout(function () { applyMode(next); }, 290);   /* mid-wipe, screen covered */
    setTimeout(function () { wipe.classList.remove("run"); flipping = false; }, 650);
  }
  if (switchBtn) switchBtn.addEventListener("click", toggleMode);
  addEventListener("keydown", function (ev) {
    if (ev.key !== "e" && ev.key !== "E") return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var t = ev.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    toggleMode();
  });
  try { if (sessionStorage.getItem("v4mode") === "edit") applyMode("edit"); } catch (e) {}

  /* ---------------- Bake: blockout resolves to gold, once per session ---------------- */
  var seen = false;
  try { seen = !!sessionStorage.getItem("v4baked"); } catch (e) {}
  if (!seen && "IntersectionObserver" in window) {
    html.classList.add("prebake");
    try { sessionStorage.setItem("v4baked", "1"); } catch (e) {}
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("baked");
        io.unobserve(en.target);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll(".bake").forEach(function (s) { io.observe(s); });
  }

  /* ---------------- Telemetry HUD: honest scroll math, nothing stored, nothing sent ---------------- */
  var hud = document.createElement("div");
  hud.className = "hud";
  hud.setAttribute("aria-hidden", "true"); /* live results render at #level-complete instead */
  hud.innerHTML = 'PLAYTEST <span class="hud-sig">// LIVE</span>' +
    '<span>PATH <b data-h="cov">0%</b></span>' +
    '<span>TIME <b data-h="time">0:00</b></span>' +
    '<span>NOTES <b data-h="notes">0/0</b></span>' +
    '<span>FLOCK <b data-h="flock">0/5</b></span>' +
    '<span>MODE <b data-h="mode">PLAY</b></span>';
  document.body.appendChild(hud);
  var H = {};
  hud.querySelectorAll("[data-h]").forEach(function (b) { H[b.getAttribute("data-h")] = b; });

  var cov = 0, secs = 0;
  var notesRead = {}, notesTotal = document.querySelectorAll(".ann-btn").length;
  var flock = {};
  try { (JSON.parse(sessionStorage.getItem("v4flock") || "[]")).forEach(function (id) { flock[id] = 1; }); } catch (e) {}

  function count(o) { return Object.keys(o).length; }
  function fmt(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function measure() {
    var doc = document.documentElement;
    var c = (scrollY + innerHeight) / doc.scrollHeight;
    if (c > cov) cov = Math.min(c, 1);
  }
  var tickingScroll = false;
  addEventListener("scroll", function () {
    if (tickingScroll) return;
    tickingScroll = true;
    requestAnimationFrame(function () { measure(); renderHud(); tickingScroll = false; });
  }, { passive: true });

  setInterval(function () {
    if (document.hidden) return;
    secs++;
    renderHud();
  }, 1000);

  /* results block at the exit door */
  var R = {};
  document.querySelectorAll("[data-r]").forEach(function (b) { R[b.getAttribute("data-r")] = b; });
  function grade() {
    var score = cov * 0.55 + (notesTotal ? count(notesRead) / notesTotal : 0) * 0.25 + (count(flock) / 5) * 0.2;
    if (score >= 0.9) return "S — SHIP IT";
    if (score >= 0.7) return "A — STRONG RUN";
    if (score >= 0.5) return "B — SOLID";
    return "C — SPEEDRUN?";
  }
  function renderHud() {
    var f = count(flock), n = count(notesRead);
    if (H.cov) H.cov.textContent = Math.round(cov * 100) + "%";
    if (H.time) H.time.textContent = fmt(secs);
    if (H.notes) H.notes.textContent = n + "/" + notesTotal;
    if (H.flock) H.flock.textContent = f + "/5";
    if (H.mode) H.mode.textContent = html.getAttribute("data-mode").toUpperCase();
    if (R.cov) R.cov.textContent = Math.round(cov * 100) + "%";
    if (R.time) R.time.textContent = fmt(secs);
    if (R.notes) R.notes.textContent = n + " / " + notesTotal;
    if (R.flock) R.flock.textContent = f + " / 5";
    if (R.grade) R.grade.textContent = grade();
  }

  /* ---------------- Annotations: the designer's voice ---------------- */
  document.querySelectorAll(".ann-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var note = btn.parentElement.querySelector(".ann-note");
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      if (note) note.hidden = open;
      if (!open) { notesRead[btn.getAttribute("data-ann")] = 1; renderHud(); }
    });
  });

  /* ---------------- Commentary nodes ---------------- */
  document.querySelectorAll("[data-node]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var body = btn.parentElement.querySelector(".node-body");
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      if (body) body.hidden = open;
    });
  });

  /* ---------------- The flock (collectibles) ---------------- */
  function saveFlock() {
    try { sessionStorage.setItem("v4flock", JSON.stringify(Object.keys(flock))); } catch (e) {}
  }
  function syncPigeons() {
    document.querySelectorAll(".pigeon").forEach(function (p) {
      if (flock[p.getAttribute("data-pigeon")]) p.classList.add("found");
    });
    var pm = document.getElementById("postmortem");
    if (pm && count(flock) >= 5) pm.hidden = false;
  }
  document.querySelectorAll(".pigeon").forEach(function (p) {
    p.addEventListener("click", function () {
      var id = p.getAttribute("data-pigeon");
      if (flock[id]) return;
      flock[id] = 1;
      p.classList.add("found");
      saveFlock(); syncPigeons(); renderHud();
    });
  });
  syncPigeons();

  /* ---------------- Critical path: highlight where you are ---------------- */
  var pathLinks = document.querySelectorAll(".path a");
  if (pathLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    pathLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = byId[en.target.id];
        if (a && en.isIntersecting) {
          pathLinks.forEach(function (x) { x.classList.remove("here"); });
          a.classList.add("here");
        }
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { pio.observe(s); });
  }

  /* ---------------- Copy email ---------------- */
  document.querySelectorAll(".copy-mail").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var v = btn.getAttribute("data-copy");
      var done = function () {
        var old = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(function () { btn.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(done, done);
      } else done();
    });
  });

  /* ---------------- Playable demo (same contract as v3: nothing loads until asked) ---------------- */
  document.querySelectorAll(".game-embed").forEach(function (el) {
    el.addEventListener("click", function () {
      if (el.classList.contains("is-playing")) return;
      var id = el.getAttribute("data-upload");
      if (!id) return;
      var page = el.getAttribute("data-page");
      /* phones: hand off to itch.io, which handles mobile properly */
      if (page && matchMedia("(max-width: 699px)").matches) {
        var a = document.createElement("a");
        a.href = page; a.target = "_blank"; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
        return;
      }
      /* itch renders the build at fixed pixel size: render native, scale to fit */
      var w = parseInt(el.getAttribute("data-w"), 10) || 1280;
      var h = parseInt(el.getAttribute("data-h"), 10) || 740;
      var f = document.createElement("iframe");
      f.src = "https://itch.io/embed-upload/" + id + "?color=0b0c10";
      f.title = el.getAttribute("data-title") || "Playable game";
      f.allow = "autoplay; fullscreen; gamepad";
      f.setAttribute("allowfullscreen", "");
      f.style.cssText = "position:absolute;top:0;left:0;border:0;width:" + w + "px;height:" + h + "px;transform-origin:0 0";
      var fit = function () { f.style.transform = "scale(" + (el.clientWidth / w).toFixed(5) + ")"; };
      el.classList.add("is-playing");
      el.style.cursor = "auto";
      el.appendChild(f);
      fit();
      addEventListener("resize", fit);
    });
  });

  measure();          /* the first viewport counts as covered ground */
  addEventListener("resize", function () { measure(); renderHud(); });
  renderHud();
})();
