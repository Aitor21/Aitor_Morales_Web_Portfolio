/* =====================================================================
   v5 "THE LONG SHOT" — traversal engine (prototype)
   One worldX camera lerps toward targetX. Parallax layers, avatar,
   pacing-curve scrubber, blockout/gold flip, zoom-out map, Read Mode.
   No dependencies. Degrades to Read Mode without JS.
   ===================================================================== */
(function () {
  "use strict";
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stage = document.getElementById("stage");
  var world = document.getElementById("world");
  var content = document.getElementById("content");
  var pigeon = document.getElementById("pigeon");
  var sky = document.getElementById("sky");
  var sun = document.getElementById("sun");
  var layers = [].slice.call(document.querySelectorAll(".layer"));
  var zones = [].slice.call(document.querySelectorAll(".zone")).map(function (el) {
    return { el: el, x: parseFloat(el.getAttribute("data-x")), id: el.id };
  });
  // place each zone in the content plane at its world x (it's then centered by translateX(-50%))
  zones.forEach(function (z) { z.el.style.left = z.x + "px"; });

  var MAXX = zones[zones.length - 1].x;      // world extent (last zone)
  var worldX = 0, targetX = 0, vel = 0;
  var halfVw = innerWidth / 2;

  /* per-biome scoring: sky gradient + sun + ground, chosen by nearest zone */
  var biomes = {
    "zone-hero":    { top:"#0a1836", mid:"#16305c", low:"#3a4f7a", sun:"#ffd9a8", g1:"#0c1526", g2:"#05070d" },
    "zone-gimica":  { top:"#3a2a12", mid:"#7a4e1e", low:"#c98a3a", sun:"#ffdca0", g1:"#2a1c0c", g2:"#0a0703" },
    "zone-blaster": { top:"#0a1a3a", mid:"#123a6e", low:"#2f6ab0", sun:"#bfe0ff", g1:"#0a1526", g2:"#04070f" },
    "zone-exit":    { top:"#0a0a1e", mid:"#241a4e", low:"#5a2a52", sun:"#ffb0c8", g1:"#0a0814", g2:"#030209" }
  };
  var curBiome = "";
  function scoreBiome() {
    var nearest = zones[0], best = Infinity;
    zones.forEach(function (z) { var d = Math.abs(worldX - z.x); if (d < best) { best = d; nearest = z; } });
    if (nearest.id === curBiome) return;
    curBiome = nearest.id;
    var b = biomes[curBiome]; if (!b) return;
    sky.style.setProperty("--sky-top", b.top);
    sky.style.setProperty("--sky-mid", b.mid);
    sky.style.setProperty("--sky-low", b.low);
    sun.style.setProperty("--sun", b.sun);
    var g = document.getElementById("ground");
    g.style.setProperty("--ground-top", b.g1);
    g.style.setProperty("--ground-low", b.g2);
    // reflect active zone on the pacing curve
    document.querySelectorAll(".pc-label").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-for") === curBiome);
    });
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function setTarget(x) { targetX = clamp(x, 0, MAXX); }

  /* ---------------- Input ---------------- */
  addEventListener("wheel", function (e) {
    if (isOverlayOpen()) return;
    setTarget(targetX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 1.1);
  }, { passive: true });

  addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k === "arrowright") { setTarget(targetX + 380); e.preventDefault(); }
    else if (k === "arrowleft") { setTarget(targetX - 380); e.preventDefault(); }
    else if (k === "home") setTarget(0);
    else if (k === "end") setTarget(MAXX);
    else if (k === "g") flipFidelity();
    else if (k === "m") toggleMap();
    else if (k === "r") toggleRead();
    else if (k === "escape") { closeMap(); if (!rm.hidden) toggleRead(); }
  });

  /* drag to pan */
  var dragging = false, dragStartX = 0, dragStartTarget = 0, moved = 0;
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".cell, a, button")) return;
    dragging = true; moved = 0; dragStartX = e.clientX; dragStartTarget = targetX;
    stage.classList.add("dragging"); stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragStartX; moved += Math.abs(dx);
    setTarget(dragStartTarget - dx * 1.6);
  });
  function endDrag() { dragging = false; stage.classList.remove("dragging"); }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  /* jump to a zone by id (brand link, deep links) */
  function gotoZone(id) {
    var z = zones.filter(function (z) { return z.id === id; })[0];
    if (z) { closeMap(); setTarget(z.x); }
  }
  document.querySelectorAll('a[href^="#zone"]').forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); gotoZone(a.getAttribute("href").slice(1)); });
  });

  /* ---------------- Pacing-curve nav ---------------- */
  var pcSvg = document.getElementById("pcSvg");
  var W = 1000, H = 88;
  // an intensity profile sampled across the world (the level's tension curve)
  function intensityAt(fx) { // fx 0..1
    // hand-shaped sawtooth: calm start, hub bump, chamber spike, boss peak, resolve
    var pts = [[0,.28],[.18,.34],[.33,.62],[.5,.5],[.63,.82],[.78,.6],[.9,.95],[1,.4]];
    for (var i = 0; i < pts.length - 1; i++) {
      if (fx >= pts[i][0] && fx <= pts[i + 1][0]) {
        var t = (fx - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      }
    }
    return .4;
  }
  (function buildCurve() {
    var d = "", fill = "M0," + H;
    for (var i = 0; i <= W; i += 8) {
      var y = H - intensityAt(i / W) * (H - 8) - 4;
      d += (i === 0 ? "M" : "L") + i + "," + y.toFixed(1) + " ";
      fill += "L" + i + "," + y.toFixed(1) + " ";
    }
    fill += "L" + W + "," + H + " Z";
    var ns = "http://www.w3.org/2000/svg";
    var f = document.createElementNS(ns, "path"); f.setAttribute("d", fill); f.setAttribute("class", "pc-fill"); pcSvg.appendChild(f);
    var p = document.createElementNS(ns, "path"); p.setAttribute("d", d); p.setAttribute("class", "pc-line"); pcSvg.appendChild(p);
    // zone ticks + labels
    zones.forEach(function (z) {
      var fx = z.x / MAXX, x = fx * W, y = H - intensityAt(fx) * (H - 8) - 4;
      var dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 3); dot.setAttribute("class", "pc-tick");
      pcSvg.appendChild(dot);
      var lab = document.createElementNS(ns, "text");
      lab.setAttribute("x", clamp(x, 30, W - 30)); lab.setAttribute("y", 84);
      lab.setAttribute("text-anchor", "middle"); lab.setAttribute("class", "pc-label");
      lab.setAttribute("data-for", z.id);
      lab.textContent = ({ "zone-hero": "DAWN", "zone-gimica": "HUB", "zone-blaster": "CH.01", "zone-exit": "EXIT" })[z.id] || z.id;
      pcSvg.appendChild(lab);
    });
    // marker
    var mk = document.createElementNS(ns, "line"); mk.setAttribute("class", "pc-marker"); mk.id = "pcMarker";
    mk.setAttribute("y1", 0); mk.setAttribute("y2", H); pcSvg.appendChild(mk);
    var md = document.createElementNS(ns, "circle"); md.setAttribute("class", "pc-dot"); md.id = "pcDot"; md.setAttribute("r", 4); pcSvg.appendChild(md);
  })();
  var pcMarker = document.getElementById("pcMarker"), pcDot = document.getElementById("pcDot");

  function scrubFromEvent(e) {
    var r = pcSvg.getBoundingClientRect();
    var fx = clamp((e.clientX - r.left) / r.width, 0, 1);
    setTarget(fx * MAXX);
  }
  var scrubbing = false;
  var pacing = document.getElementById("pacing");
  pacing.addEventListener("pointerdown", function (e) { scrubbing = true; scrubFromEvent(e); pacing.setPointerCapture(e.pointerId); });
  pacing.addEventListener("pointermove", function (e) { if (scrubbing) scrubFromEvent(e); });
  pacing.addEventListener("pointerup", function () { scrubbing = false; });
  pcSvg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { setTarget(targetX + 380); e.preventDefault(); }
    if (e.key === "ArrowLeft") { setTarget(targetX - 380); e.preventDefault(); }
  });

  /* ---------------- Stat pickups ---------------- */
  var picks = [].slice.call(document.querySelectorAll(".pickup"));
  var got = {};
  function checkPickups() {
    picks.forEach(function (p) {
      if (p._got) return;
      var px = parseFloat(p.style.left);
      if (Math.abs(worldX - px) < 130) {
        p._got = true; p.classList.add("got");
        var key = p.getAttribute("data-pickup"); got[key] = 1;
        var chip = document.querySelector('.chip[data-chip="' + key + '"]');
        if (chip) chip.classList.add("on");
      }
    });
  }

  /* ---------------- Blaster Buds mirror board ---------------- */
  (function board() {
    var cells = [].slice.call(document.querySelectorAll("#board .cell"));
    var cap = document.getElementById("boardcap");
    cells.forEach(function (c) {
      c.addEventListener("click", function () {
        var i = +c.getAttribute("data-i"), row = Math.floor(i / 3), col = i % 3;
        var mirCol = 2 - col, mir = row * 3 + mirCol;
        cells.forEach(function (x) { x.classList.remove("you", "mir"); });
        cells[i].classList.add("you");
        cells[mir].classList.add("mir");
        cap.textContent = mir === i ? "On the axis, you and your mirror collide — that's the trap." : "Your move (blue) is mirrored (orange). Read both boards at once.";
      });
    });
  })();

  /* ---------------- Fidelity flip ---------------- */
  var wipe = document.getElementById("flipWipe");
  var fidWord = document.getElementById("fidWord");
  var flipping = false;
  function applyFid(mode) {
    document.body.setAttribute("data-fidelity", mode);
    fidWord.textContent = mode === "blockout" ? "Gold view" : "Blockout view";
  }
  function flipFidelity() {
    if (flipping) return;
    var next = document.body.getAttribute("data-fidelity") === "blockout" ? "gold" : "blockout";
    if (reduced || !wipe) { applyFid(next); return; }
    flipping = true; wipe.classList.add("run");
    setTimeout(function () { applyFid(next); }, 290);
    setTimeout(function () { wipe.classList.remove("run"); flipping = false; }, 650);
  }
  document.getElementById("btnFid").addEventListener("click", flipFidelity);

  /* ---------------- Zoom-out level map ---------------- */
  function toggleMap() { stage.classList.contains("mapview") ? closeMap() : openMap(); }
  function openMap() { stage.classList.add("mapview"); }
  function closeMap() { stage.classList.remove("mapview"); }
  document.getElementById("btnMap").addEventListener("click", toggleMap);
  // click a zone while zoomed out to dive in
  stage.addEventListener("click", function (e) {
    if (!stage.classList.contains("mapview")) return;
    var z = e.target.closest(".zone");
    if (z) { setTarget(parseFloat(z.getAttribute("data-x"))); closeMap(); }
  });

  /* ---------------- Read Mode ---------------- */
  var rm = document.getElementById("readmode");
  function toggleRead() {
    rm.hidden = !rm.hidden;
    document.body.style.overflow = rm.hidden ? "hidden" : "auto";
  }
  function isOverlayOpen() { return !rm.hidden; }
  document.getElementById("btnRead").addEventListener("click", toggleRead);
  document.getElementById("rmClose").addEventListener("click", toggleRead);

  /* ---------------- Particles (canvas atmosphere) ---------------- */
  var cv = document.getElementById("fx"), cx = cv.getContext("2d");
  var motes = [];
  function sizeCanvas() { cv.width = innerWidth; cv.height = innerHeight; halfVw = innerWidth / 2; }
  sizeCanvas();
  addEventListener("resize", function () { sizeCanvas(); });
  if (!reduced) {
    for (var i = 0; i < 70; i++) motes.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 2 + .4, s: Math.random() * .3 + .05, d: Math.random() * .5 });
  }
  function drawFx() {
    cx.clearRect(0, 0, cv.width, cv.height);
    if (reduced) return;
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.x -= (m.s + vel * 0.02 * m.d);
      if (m.x < -5) { m.x = innerWidth + 5; m.y = Math.random() * innerHeight; }
      cx.globalAlpha = 0.15 + m.d * 0.4;
      cx.fillStyle = "#ffe6c0";
      cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 6.28); cx.fill();
    }
    cx.globalAlpha = 1;
  }

  /* ---------------- Telemetry ---------------- */
  var secs = 0, cov = 0;
  setInterval(function () { if (!document.hidden) { secs++; renderTel(); } }, 1000);
  function fmt(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function renderTel() {
    cov = Math.max(cov, Math.round((worldX / MAXX) * 100));
    var pc = Object.keys(got).length;
    var set = function (k, v) { var el = document.querySelector('[data-t="' + k + '"]'); if (el) el.textContent = v; };
    set("cov", cov + "%"); set("time", fmt(secs)); set("pick", pc + "/3");
    pcSvg.setAttribute("aria-valuenow", Math.round((worldX / MAXX) * 100));
  }

  /* ---------------- Main loop ---------------- */
  function frame() {
    var prev = worldX;
    worldX += (targetX - worldX) * (reduced ? 0.5 : 0.09);
    vel = worldX - prev;
    if (Math.abs(vel) < 0.02) vel = 0;

    // parallax: every layer offset by depth-scaled camera
    for (var i = 0; i < layers.length; i++) {
      var d = parseFloat(layers[i].getAttribute("data-depth"));
      layers[i].style.transform = "translate3d(" + (halfVw - worldX * d) + "px,0,0)";
    }

    // pigeon: banks into travel direction, flaps when moving
    if (Math.abs(vel) > 0.6) {
      pigeon.classList.add("flap"); pigeon.classList.remove("idle");
      pigeon.style.setProperty("--bank", clamp(vel * 0.4, -12, 12) + "deg");
      var flip = vel < 0 ? " scaleX(-1)" : "";
      pigeon.querySelector("img").style.transform = flip;
    } else {
      pigeon.classList.remove("flap"); pigeon.classList.add("idle");
      pigeon.style.setProperty("--bank", "0deg");
    }

    // pacing marker
    var mx = (worldX / MAXX) * W;
    var my = H - intensityAt(worldX / MAXX) * (H - 8) - 4;
    pcMarker.setAttribute("x1", mx); pcMarker.setAttribute("x2", mx);
    pcDot.setAttribute("cx", mx); pcDot.setAttribute("cy", my);

    scoreBiome();
    checkPickups();
    if (Math.abs(vel) > 0.1) renderTel();
    drawFx();
    requestAnimationFrame(frame);
  }

  // deep-link on load
  if (location.hash && document.getElementById(location.hash.slice(1))) {
    var z = zones.filter(function (z) { return "#" + z.id === location.hash; })[0];
    if (z) { worldX = targetX = z.x; }
  }
  scoreBiome(); renderTel();
  requestAnimationFrame(frame);
})();
