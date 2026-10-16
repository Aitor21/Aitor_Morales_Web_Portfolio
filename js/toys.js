/* =====================================================================
   Playable toys: one small, honest slice of each game's core mechanic,
   sitting on that game's case study. Loaded on demand by v3.js (initToys)
   the first time a page with a [data-toy] block is shown, so the home page
   and the résumé never pay for it.

   Every word a visitor reads lives in the page's HTML ([data-msg] spans),
   not here, so tools/i18n translates the toys along with everything else.
   ===================================================================== */
(function () {
  "use strict";
  if (window.AMToys) return;

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/js\/toys\.js.*$/, "");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var track = function (name) { try { if (window.amTrack) window.amTrack(name); } catch (_) {} };

  function msg(root, key, vars) {
    var el = root.querySelector('[data-msg="' + key + '"]');
    var t = el ? el.textContent.replace(/\s+/g, " ").trim() : key;
    if (vars) Object.keys(vars).forEach(function (k) { t = t.split("{" + k + "}").join(vars[k]); });
    return t;
  }
  function img(src) { var i = new Image(); i.decoding = "async"; i.src = BASE + src; return i; }

  /* ---------- the shared frame: start card, end card, live region ---------- */
  function Frame(root, name) {
    var start = $("[data-toy-start]", root), end = $("[data-toy-end]", root);
    var live = $("[data-toy-live]", root), focusEl = $("[data-toy-focus]", root) || root;
    var f = {
      started: false,
      begin: function () {
        if (start) start.hidden = true;
        if (!f.started) { f.started = true; track("toy-" + name + "-start"); }
        try { focusEl.focus({ preventScroll: true }); } catch (_) {}
      },
      say: function (t) { if (live) live.textContent = t; },
      over: function (win, kicker, title) {
        $("[data-end-k]", end).textContent = kicker;
        $("[data-end-t]", end).textContent = title;
        end.classList.toggle("is-win", !!win);
        end.hidden = false;
        f.say(kicker + " " + title);
        track("toy-" + name + (win ? "-win" : "-lose"));
        var again = $("[data-toy-again]", end);
        if (again) setTimeout(function () { try { again.focus({ preventScroll: true }); } catch (_) {} }, 60);
      },
      hideEnd: function () { end.hidden = true; }
    };
    return f;
  }

  /* A requestAnimationFrame loop that pauses while the toy is off screen or the tab
     is hidden, and stops for good once the page swap removes the toy from the DOM. */
  function Loop(root, step) {
    var on = false, raf = 0, last = 0, visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && on) kick(); }, { threshold: 0.05 }).observe(root);
    }
    function frame(t) {
      raf = 0;
      if (!root.isConnected) { on = false; return; }
      if (!on || !visible || document.hidden) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      step(dt);
      kick();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    document.addEventListener("visibilitychange", function () { last = 0; if (!document.hidden && on) kick(); });
    return {
      start: function () { on = true; last = 0; kick(); },
      stop: function () { on = false; }
    };
  }

  /* Canvas sized to its box at device resolution, drawn in fixed world units. */
  function Stage(canvas, W, H) {
    var ctx = canvas.getContext("2d"), s = { ctx: ctx, W: W, H: H, k: 1 };
    function fit() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!r.width) return;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      s.k = r.width / W;
      ctx.setTransform(s.k * dpr, 0, 0, s.k * dpr, 0, 0);
    }
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(canvas);
    s.toWorld = function (e) {
      var r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    return s;
  }

  /* Arrow keys / WASD, as a held-direction vector. */
  function Keys(el) {
    var held = {};
    var map = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
    el.addEventListener("keydown", function (e) { var k = map[e.code]; if (k) { held[k] = true; e.preventDefault(); } });
    el.addEventListener("keyup", function (e) { var k = map[e.code]; if (k) held[k] = false; });
    el.addEventListener("blur", function () { held = {}; });
    return {
      vec: function () {
        var x = (held.r ? 1 : 0) - (held.l ? 1 : 0), y = (held.d ? 1 : 0) - (held.u ? 1 : 0), m = Math.hypot(x, y);
        return m ? { x: x / m, y: y / m } : null;
      },
      clear: function () { held = {}; }
    };
  }

  function wire(root, frame, startFn, againFn) {
    var go = $("[data-toy-go]", root), again = $("[data-toy-again]", root);
    if (go) go.addEventListener("click", function () { frame.begin(); startFn(); });
    if (again) again.addEventListener("click", function () { frame.hideEnd(); frame.begin(); againFn(); });
  }

  /* =====================================================================
     BLASTER BUDS: one input, two buds. Up and down are copied, left and
     right are mirrored, and a wall stops one bud and not the other. Steer
     the rival into a black hole without falling in yourself. Every level
     was checked with a solver; par is the shortest solution.
     ===================================================================== */
  var MIRROR_LEVELS = [
    { par: 2, map: [".......", ".P...R.", ".......", ".....O.", "......."] },
    { par: 2, map: [".......", "O#P.R.O", ".......", ".......", "......."] },
    { par: 5, map: ["...#...", ".P.#.R.", "O..#...", "...O.#.", ".#...O."] },
    { par: 10, map: [".......", ".....R.", "..#.#..", "O..#.#.", ".PO.#.."] }
  ];
  var DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };

  function mirror(root) {
    var frame = Frame(root, "mirror");
    var board = $("[data-mb]", root), hud = { lvl: $("[data-h-level]", root), moves: $("[data-h-moves]", root), par: $("[data-h-par]", root) };
    var next = $("[data-toy-next]", root);
    var L, W, H, walls, pits, p, r, moves, hist, busy, lost, li = 0, you, riv;

    function parse(level) {
      var m = level.map; W = m[0].length; H = m.length; walls = {}; pits = {};
      m.forEach(function (row, y) {
        row.split("").forEach(function (c, x) {
          var k = x + "," + y;
          if (c === "#") walls[k] = 1; else if (c === "O") pits[k] = 1;
          else if (c === "P") p = [x, y]; else if (c === "R") r = [x, y];
        });
      });
    }
    function build() {
      L = MIRROR_LEVELS[li]; parse(L); moves = 0; hist = []; busy = false; lost = false;
      board.style.setProperty("--w", W); board.style.setProperty("--h", H);
      board.innerHTML = "";
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var c = document.createElement("span"), k = x + "," + y;
        c.className = "mb__cell" + (walls[k] ? " is-rock" : pits[k] ? " is-hole" : "");
        if (walls[k]) c.innerHTML = '<img src="' + BASE + "assets/img/blasteroid_" + ((x + y) % 2 ? "dark" : "light") + '.svg" alt="" draggable="false">';
        c.style.setProperty("--x", x); c.style.setProperty("--y", y);
        board.appendChild(c);
      }
      // the axis the mirror flips across, drawn so the rule is visible before it is felt
      var axis = document.createElement("span"); axis.className = "mb__axis"; board.appendChild(axis);
      you = bud("you"); riv = bud("rival");
      place(); hudSet();
      if (next) next.hidden = true;
    }
    function bud(kind) {
      var b = document.createElement("span");
      b.className = "mb__bud mb__bud--" + kind;
      b.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#mb-bud"/></svg>';
      board.appendChild(b); return b;
    }
    function place() {
      you.style.setProperty("--x", p[0]); you.style.setProperty("--y", p[1]);
      riv.style.setProperty("--x", r[0]); riv.style.setProperty("--y", r[1]);
    }
    function hudSet() {
      hud.lvl.textContent = (li + 1) + " / " + MIRROR_LEVELS.length;
      hud.moves.textContent = moves; hud.par.textContent = L.par;
    }
    function open(x, y) { return x >= 0 && y >= 0 && x < W && y < H && !walls[x + "," + y]; }
    function bump(el, dx, dy) {
      el.style.setProperty("--bx", dx); el.style.setProperty("--by", dy);
      el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump");
    }
    function move(d) {
      if (busy || !frame.started) return;
      var dx = DIRS[d][0], dy = DIRS[d][1];
      var pt = open(p[0] + dx, p[1] + dy) ? [p[0] + dx, p[1] + dy] : p.slice();
      var rt = open(r[0] - dx, r[1] + dy) ? [r[0] - dx, r[1] + dy] : r.slice();
      var same = function (a, b) { return a[0] === b[0] && a[1] === b[1]; };
      if (same(pt, rt) || (same(pt, r) && same(rt, p))) { pt = p.slice(); rt = r.slice(); }
      if (same(pt, r) && same(rt, r)) pt = p.slice();
      if (same(rt, p) && same(pt, p)) rt = r.slice();
      if (same(pt, p)) bump(you, dx, dy);
      if (same(rt, r)) bump(riv, -dx, dy);
      if (same(pt, p) && same(rt, r)) return;
      hist.push([p.slice(), r.slice()]);
      p = pt; r = rt; moves++; place(); hudSet();
      var youIn = pits[p[0] + "," + p[1]], rivIn = pits[r[0] + "," + r[1]];
      if (youIn || rivIn) {
        busy = true;
        setTimeout(function () {
          if (youIn) {
            you.classList.add("is-falling"); lost = true;
            setTimeout(function () { if (lost) frame.over(false, msg(root, "lose-k"), msg(root, "lose-t")); }, 650);
          } else {
            riv.classList.add("is-falling");
            setTimeout(win, 650);
          }
        }, 180);
      }
    }
    function win() {
      var last = li === MIRROR_LEVELS.length - 1;
      var line = msg(root, "win-t", { n: moves, par: L.par });
      if (last) frame.over(true, msg(root, "final-k"), line + " " + msg(root, "final-t"));
      else { frame.over(true, msg(root, "win-k"), line); if (next) next.hidden = false; }
    }
    function undo() {
      if (!hist.length) return;
      if (busy && !lost) return;
      if (lost) { lost = false; busy = false; you.classList.remove("is-falling"); frame.hideEnd(); } // a fall can be taken back
      var h = hist.pop(); p = h[0]; r = h[1]; moves--; place(); hudSet();
    }

    root.addEventListener("keydown", function (e) {
      var k = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" }[e.code];
      if (k) { e.preventDefault(); move(k); }
      // U sits in the same place on QWERTY, AZERTY and QWERTZ; Z does not, so Z only undoes with Ctrl/Cmd
      else if (e.code === "KeyU" || e.code === "Backspace" || ((e.ctrlKey || e.metaKey) && /^z$/i.test(e.key))) { e.preventDefault(); undo(); }
      else if (e.code === "KeyR") { e.preventDefault(); frame.hideEnd(); build(); }
    });
    // swipe on the board (touch) and the on-screen pad
    var sw = null;
    board.addEventListener("pointerdown", function (e) { sw = { x: e.clientX, y: e.clientY }; });
    board.addEventListener("pointerup", function (e) {
      if (!sw) return;
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u"));
    });
    $$("[data-pad]", root).forEach(function (b) { b.addEventListener("click", function () { move(b.dataset.pad); }); });
    $("[data-toy-undo]", root).addEventListener("click", undo);
    $("[data-toy-reset]", root).addEventListener("click", function () { frame.hideEnd(); build(); });
    if (next) next.addEventListener("click", function () { li++; frame.hideEnd(); build(); try { root.querySelector("[data-toy-focus]").focus({ preventScroll: true }); } catch (_) {} });
    wire(root, frame, function () {}, function () {
      // "Play again" after a loss retries the level; after the last win it starts over
      if (li === MIRROR_LEVELS.length - 1 && $("[data-toy-end]", root).classList.contains("is-win")) li = 0;
      build();
    });
    build();
  }

  /* =====================================================================
     LOVE AT FIRST BITE: the honeybungames.com swipe demo, ported. You are a
     vampire on a dating app: right on humans, left on vampires, keep your
     thirst up until sunrise.
     ===================================================================== */
  function swipe(root) {
    var frame = Frame(root, "swipe");
    var deck = $("[data-deck]", root), cards = $$(".pcard", deck);
    var bar = $("[data-thirst]", root), fill = $("span", bar), thirstRow = $(".app-thirst", root);
    var queue = $("[data-queue]", root), result = $("[data-result]", root), screen = $(".phone__screen", root);
    var R = { k: $("[data-result-kicker]", root), t: $("[data-result-title]", root), s: $("[data-result-sub]", root),
      fangs: $("[data-result-fangs]", root), actions: $("[data-result-actions]", root) };
    var index = 0, thirst = 50, caught = 0, busy = false, timer = 0, began = false;

    queue.innerHTML = cards.map(function () { return '<svg viewBox="0 0 24 24"><use href="#lb-user"/></svg>'; }).join("");
    var icons = $$("svg", queue);

    function layout() {
      cards.forEach(function (c, i) {
        var depth = i - index;
        c.style.zIndex = String(cards.length - i);
        c.style.setProperty("--depth", Math.max(0, Math.min(depth, 2)));
        c.style.opacity = depth < 0 || depth > 2 ? "0" : "1";
        c.setAttribute("aria-hidden", String(depth !== 0));
        if (depth >= 0) { c.classList.remove("is-gone"); c.style.transform = ""; }
      });
      icons.forEach(function (ic, i) { ic.classList.toggle("is-done", i < index); });
    }
    function setThirst(v) {
      thirst = clamp(v, 0, 100);
      fill.style.setProperty("--t", (thirst / 100).toFixed(2));
      bar.setAttribute("aria-valuenow", String(Math.round(thirst)));
      thirstRow.classList.remove("is-pulse"); void thirstRow.offsetWidth; thirstRow.classList.add("is-pulse");
    }
    function drips(n) {
      if (reduce) return;
      for (var i = 0; i < n; i++) {
        var d = document.createElement("span");
        d.className = "drip";
        d.innerHTML = '<svg viewBox="0 0 24 24"><use href="#lb-drop"/></svg>';
        d.style.left = 6 + Math.random() * 88 + "%";
        d.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
        d.style.setProperty("--fall", 300 + Math.random() * 300 + "px");
        screen.appendChild(d);
        d.addEventListener("animationend", function () { this.remove(); });
      }
    }
    function show(k, t, s, o) {
      o = o || {};
      R.k.textContent = k; R.t.textContent = t; R.s.textContent = s;
      R.fangs.hidden = !(o.fangs || o.chomp || o.end);
      R.actions.hidden = !o.end;
      result.hidden = false;
      result.classList.toggle("is-chomp", !!o.chomp);
      frame.say(k + " " + t + ". " + s);
      clearTimeout(timer);
      if (!o.end) timer = setTimeout(hide, 1700);
    }
    function hide() {
      result.hidden = true; busy = false;
      if (index >= cards.length || thirst <= 0) endNight();
    }
    function endNight() {
      busy = true;
      if (thirst <= 0) { track("toy-swipe-lose"); show(msg(root, "over-k"), msg(root, "over-t"), msg(root, "over-s"), { end: true }); }
      else {
        track("toy-swipe-win");
        var humans = cards.filter(function (c) { return c.dataset.human === "true"; }).length;
        show(msg(root, "dawn-k"), msg(root, "dawn-t"), msg(root, "dawn-s", { n: caught, of: humans }), { end: true });
      }
    }
    function decide(dir) {
      if (busy || index >= cards.length) return;
      busy = true;
      if (!began) { began = true; track("toy-swipe-start"); }
      var card = cards[index], human = card.dataset.human === "true", right = dir > 0;
      card.classList.remove("is-dragging"); card.classList.add("is-gone");
      card.style.transition = "transform .55s cubic-bezier(.3,.6,.4,1), opacity .55s";
      card.style.transform = "translate(" + (deck.offsetWidth * 1.6 * dir) + "px, -40px) rotate(" + (dir * 28) + "deg)";
      card.style.opacity = "0";
      $(".stamp--yum", card).style.opacity = right ? "1" : "0";
      $(".stamp--yuck", card).style.opacity = right ? "0" : "1";
      index++;
      setTimeout(function () {
        card.style.transition = "";
        layout();
        if (right && human) { caught++; setThirst(thirst + 40); drips(14); show(msg(root, "yy-k"), msg(root, "yy-t"), msg(root, "yy-s"), { chomp: true }); }
        else if (right) { setThirst(thirst - 15); show(msg(root, "yv-k"), msg(root, "yv-t"), msg(root, "yv-s"), { fangs: true }); }
        else if (!human) { setThirst(thirst - 5); show(msg(root, "nv-k"), msg(root, "nv-t"), msg(root, "nv-s"), { fangs: true }); }
        else { setThirst(thirst - 20); show(msg(root, "nh-k"), msg(root, "nh-t"), msg(root, "nh-s")); }
      }, 260);
    }
    function restart() {
      track("toy-swipe-replay");
      index = 0; caught = 0; busy = false; result.hidden = true;
      cards.forEach(function (c) { c.style.transition = "none"; $$(".stamp", c).forEach(function (st) { st.style.opacity = ""; }); });
      layout();
      requestAnimationFrame(function () { cards.forEach(function (c) { c.style.transition = ""; }); });
      setThirst(50);
      frame.say(msg(root, "new-night"));
    }

    var drag = null;
    deck.addEventListener("pointerdown", function (e) {
      var card = cards[index];
      if (busy || !card || !card.contains(e.target)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, card: card };
      card.setPointerCapture(e.pointerId);
      card.classList.add("is-dragging");
    });
    deck.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      var dy = (e.clientY - drag.y) * 0.4, card = drag.card, dx = drag.dx, k = Math.min(1, Math.abs(dx) / 110);
      card.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + dx / 14 + "deg)";
      var yum = $(".stamp--yum", card), yuck = $(".stamp--yuck", card);
      yum.style.opacity = dx > 0 ? k : 0; yuck.style.opacity = dx < 0 ? k : 0;
      yum.style.setProperty("--sy", 0.6 + 0.4 * (dx > 0 ? k : 0));
      yuck.style.setProperty("--sn", 0.6 + 0.4 * (dx < 0 ? k : 0));
    });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var card = drag.card, dx = drag.dx; drag = null;
      if (Math.abs(dx) > 90) { decide(Math.sign(dx)); return; }
      card.classList.remove("is-dragging"); card.style.transform = "";
      $$(".stamp", card).forEach(function (st) { st.style.opacity = ""; });
    }
    deck.addEventListener("pointerup", release);
    deck.addEventListener("pointercancel", release);
    function press(btn) { btn.classList.add("is-press"); setTimeout(function () { btn.classList.remove("is-press"); }, 140); }
    $$("[data-swipe-btn]", root).forEach(function (b) { b.addEventListener("click", function () { decide(b.dataset.swipeBtn === "right" ? 1 : -1); }); });
    deck.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      var right = e.key === "ArrowRight";
      press($('[data-swipe-btn="' + (right ? "right" : "left") + '"]', root));
      decide(right ? 1 : -1);
    });
    result.addEventListener("click", function (e) { if (!R.actions.hidden || e.target.closest("a, button")) return; clearTimeout(timer); hide(); });
    $("[data-swipe-restart]", root).addEventListener("click", restart);
    layout();
  }

  /* =====================================================================
     BIRDS OF A FEATHER: followers are your health bar, your army and your
     responsibility. Fly through scattered pigeons to recruit them; crows
     steal from a small flock and lose to a big one. Then the Crow Boss.
     ===================================================================== */
  var PIGEON = null;
  function flock(root) {
    var frame = Frame(root, "flock");
    var canvas = $("canvas", root), st = Stage(canvas, 800, 480), ctx = st.ctx, W = 800, H = 480;
    var keys = Keys(root), hud = { flock: $("[data-h-flock]", root), time: $("[data-h-time]", root), goal: $("[data-h-goal]", root) };
    PIGEON = PIGEON || img("assets/img/hero/pigeon.webp");
    var BOSS_AT = 24, BOSS_NEED = 15, LIMIT = 60;
    var me, birds, crows, boss, fx, t, pointer, running, nextCrow, nextStray, sky;

    function reset() {
      me = { x: 120, y: 240, vx: 0, vy: 0, face: 1 };
      birds = []; crows = []; fx = []; boss = null; t = 0; pointer = null; running = true;
      nextCrow = 5; nextStray = 0;
      for (var i = 0; i < 9; i++) spawnStray();
      hudSet();
    }
    function roof(x) { // the skyline's height at x, so strays perch on it
      var h = 380 - ((Math.sin(x * 0.021) + Math.sin(x * 0.0071 + 2)) * 34) - (Math.floor(x / 70) % 3) * 26;
      return Math.min(440, Math.max(250, h));
    }
    function spawnStray() {
      var x = rand(220, 770), perch = Math.random() < 0.55;
      birds.push({ x: x, y: perch ? roof(x) - 10 : rand(60, 300), vx: 0, vy: 0, f: false, ph: Math.random() * 6 });
    }
    function followers() { return birds.filter(function (b) { return b.f; }); }
    function spawnCrow() {
      var left = Math.random() < 0.5, s = t > 12 && Math.random() < 0.45 ? 2 : 1;
      crows.push({ x: left ? -20 : W + 20, y: rand(40, 300), vx: 0, vy: 0, s: s, r: 10 + s * 4, life: 0 });
    }
    function pop(x, y, text, color) { fx.push({ x: x, y: y, text: text, c: color || "#fff", life: 0 }); }
    function scatter(n) {
      var fol = followers();
      for (var i = 0; i < n && fol.length; i++) {
        var b = fol.pop(); b.f = false; b.vx = rand(-260, 260); b.vy = rand(-260, -60); b.flee = 1.2;
      }
    }
    function hudSet() {
      hud.flock.textContent = followers().length;
      hud.time.textContent = Math.max(0, Math.ceil(LIMIT - t));
      hud.goal.textContent = boss ? msg(root, "goal-boss", { n: BOSS_NEED }) : msg(root, "goal-grow", { s: Math.max(0, Math.ceil(BOSS_AT - t)) });
    }
    function steer(o, tx, ty, max, acc, dt) {
      var dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1;
      var want = Math.min(max, d * 3);
      o.vx += ((dx / d) * want - o.vx) * Math.min(1, acc * dt);
      o.vy += ((dy / d) * want - o.vy) * Math.min(1, acc * dt);
    }
    function step(dt) {
      if (!running) { draw(); return; }
      t += dt;
      // the leader: keys, or fly toward the pointer
      var k = keys.vec();
      if (k) steer(me, me.x + k.x * 200, me.y + k.y * 200, 250, 5, dt);
      else if (pointer) steer(me, pointer.x, pointer.y, 250, 5, dt);
      else { me.vx *= 0.96; me.vy *= 0.96; }
      me.x = clamp(me.x + me.vx * dt, 20, W - 20); me.y = clamp(me.y + me.vy * dt, 24, H - 24);
      if (Math.abs(me.vx) > 20) me.face = me.vx > 0 ? 1 : -1;

      var fol = followers();
      birds.forEach(function (b, i) {
        if (b.f) {
          // trail the leader, each bird keeping a little personal space
          var idx = fol.indexOf(b), ang = idx * 2.4, rad = 22 + Math.sqrt(idx) * 14;
          steer(b, me.x - me.face * 26 + Math.cos(ang + t) * rad, me.y + Math.sin(ang + t * 1.3) * rad * 0.7, 300, 4, dt);
        } else if (b.flee > 0) {
          b.flee -= dt; b.vy += 200 * dt;
          if (b.flee <= 0) { b.vx = b.vy = 0; b.y = clamp(b.y, 40, roof(b.x) - 10); }
        } else {
          b.vx *= 0.9; b.vy *= 0.9;
          if (Math.hypot(b.x - me.x, b.y - me.y) < 46) { b.f = true; pop(b.x, b.y - 14, "+1", "#9fe3b8"); }
        }
        b.x = clamp(b.x + b.vx * dt, 8, W - 8); b.y = clamp(b.y + b.vy * dt, 12, H - 12);
      });

      if (t > nextStray && birds.filter(function (b) { return !b.f; }).length < 6) { spawnStray(); nextStray = t + 2.1; }
      if (t > nextCrow && crows.length < 4 && !boss) { spawnCrow(); nextCrow = t + rand(2.4, 3.6); }
      if (!boss && t >= BOSS_AT) { boss = { x: W + 40, y: 120, vx: 0, vy: 0, r: 30 }; pop(W - 120, 60, msg(root, "boss-in"), "#ff8aa0"); }

      fol = followers();
      var flockN = fol.length;
      crows.forEach(function (c) {
        c.life += dt;
        var target = fol.length ? fol[Math.floor(c.s * 7) % fol.length] : me;
        steer(c, target.x, target.y, 130 + c.s * 15 + t * 1.2, 2.2, dt);
        c.x += c.vx * dt; c.y += c.vy * dt;
        var hit = Math.hypot(c.x - me.x, c.y - me.y) < c.r + 14 ||
          fol.some(function (b) { return Math.hypot(c.x - b.x, c.y - b.y) < c.r + 8; });
        if (!hit) return;
        if (flockN >= c.s * 4) { c.dead = true; pop(c.x, c.y, msg(root, "bonk"), "#ffd27a"); }
        else { c.dead = true; scatter(c.s); pop(c.x, c.y, "-" + c.s, "#ff8aa0"); }
      });
      crows = crows.filter(function (c) { return !c.dead && c.life < 14; });

      if (boss) {
        steer(boss, me.x, me.y, 78, 1.4, dt);
        boss.x += boss.vx * dt; boss.y += boss.vy * dt;
        if (Math.hypot(boss.x - me.x, boss.y - me.y) < boss.r + 16) {
          running = false;
          if (followers().length >= BOSS_NEED) frame.over(true, msg(root, "win-k"), msg(root, "win-t", { n: followers().length }));
          else { scatter(99); frame.over(false, msg(root, "lose-k"), msg(root, "lose-t", { n: BOSS_NEED })); }
        }
      }
      if (running && t >= LIMIT) { running = false; frame.over(false, msg(root, "time-k"), msg(root, "time-t")); }
      fx.forEach(function (f) { f.life += dt; f.y -= 28 * dt; });
      fx = fx.filter(function (f) { return f.life < 0.9; });
      hudSet();
      draw();
    }
    function drawSky() {
      if (sky) return sky;
      sky = document.createElement("canvas"); sky.width = W; sky.height = H;
      var c = sky.getContext("2d"), g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#7fb8e8"); g.addColorStop(0.65, "#cfe6f2"); g.addColorStop(1, "#e9f2df");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = "rgba(255,255,255,.75)";
      [[140, 70, 46], [180, 64, 34], [520, 96, 40], [560, 90, 28], [690, 50, 30]].forEach(function (cl) { c.beginPath(); c.arc(cl[0], cl[1], cl[2], 0, 7); c.fill(); });
      c.fillStyle = "#8aa3b8";
      for (var x = 0; x < W; x += 70) { var h = roof(x + 35); c.fillRect(x, h, 66, H - h); }
      c.fillStyle = "rgba(255,255,255,.35)";
      for (x = 0; x < W; x += 70) for (var y = roof(x + 35) + 14; y < H - 10; y += 26) { c.fillRect(x + 10, y, 10, 12); c.fillRect(x + 34, y, 10, 12); }
      c.fillStyle = "#6f9a5a"; c.fillRect(0, H - 14, W, 14);
      return sky;
    }
    function bird(x, y, size, face, alpha) {
      ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.translate(x, y); ctx.scale(face < 0 ? -1 : 1, 1);
      if (PIGEON.complete && PIGEON.naturalWidth) ctx.drawImage(PIGEON, -size / 2, -size / 2, size, size);
      else { ctx.fillStyle = "#7d8597"; ctx.beginPath(); ctx.arc(0, 0, size / 3, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    function crow(c, big) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.vx < 0 ? -1 : 1, 1);
      var r = c.r, flap = Math.sin(t * 14 + c.x) * 0.5;
      ctx.fillStyle = big ? "#1a0f24" : "#20202a";
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.62, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.2); ctx.lineTo(-r * 1.4, -r * (1 + flap)); ctx.lineTo(r * 0.3, -r * 0.1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.1); ctx.lineTo(r * 1.45, r * 0.05); ctx.lineTo(r * 0.8, r * 0.2); ctx.fillStyle = "#f2b33d"; ctx.fill();
      ctx.fillStyle = "#ff4a5e"; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.18, r * 0.12, 0, 7); ctx.fill();
      if (big) { ctx.fillStyle = "#f2b33d"; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.6); ctx.lineTo(0, -r * 1.05); ctx.lineTo(r * 0.2, -r * 0.6); ctx.lineTo(r * 0.4, -r * 0.95); ctx.lineTo(r * 0.5, -r * 0.55); ctx.fill(); }
      ctx.restore();
      if (!big && c.s > 1) { ctx.fillStyle = "#fff"; ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("×" + c.s * 4, c.x, c.y - c.r - 6); }
    }
    function draw() {
      ctx.drawImage(drawSky(), 0, 0, W, H);
      birds.forEach(function (b) {
        if (b.f) return;
        bird(b.x, b.y + Math.sin(t * 3 + b.ph) * 2, 30, Math.sin(b.ph) > 0 ? 1 : -1, 0.85);
      });
      followers().forEach(function (b) { bird(b.x, b.y, 30, b.vx >= 0 ? 1 : -1); });
      crows.forEach(function (c) { crow(c, false); });
      if (boss) {
        crow(boss, true);
        ctx.fillStyle = "#fff"; ctx.font = "700 13px system-ui"; ctx.textAlign = "center";
        ctx.fillText("×" + BOSS_NEED, boss.x, boss.y - boss.r - 10);
      }
      // the leader, with a soft ring so it never gets lost in its own flock
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(me.x, me.y, 24, 0, 7); ctx.stroke();
      bird(me.x, me.y, 46, me.face);
      fx.forEach(function (f) {
        ctx.globalAlpha = 1 - f.life / 0.9; ctx.fillStyle = f.c; ctx.font = "700 15px system-ui"; ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(10,20,40,.6)"; ctx.lineWidth = 3; ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      });
    }
    canvas.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse" || e.buttons) pointer = st.toWorld(e); });
    canvas.addEventListener("pointerdown", function (e) { pointer = st.toWorld(e); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
    canvas.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") pointer = null; });
    canvas.addEventListener("pointerleave", function () { pointer = null; });
    // read-only state for the automated play-tests (bots steer by key events and read this)
    root._dbg = function () { return { me: me, birds: birds, crows: crows, boss: boss, t: t, running: running }; };
    var loop = Loop(root, step);
    reset(); PIGEON.addEventListener("load", draw); draw();
    wire(root, frame, function () { reset(); loop.start(); }, function () { reset(); loop.start(); });
  }

  /* =====================================================================
     R4D10HEAD: move and the whole floor hears you; stop and you go blind.
     Movement is all or nothing. Guards walk to whatever they heard.
     ===================================================================== */
  function radio(root) {
    var frame = Frame(root, "radio");
    var canvas = $("canvas", root), st = Stage(canvas, 800, 480), ctx = st.ctx, W = 800, H = 480;
    var keys = Keys(root), hud = { noise: $("[data-h-noise]", root), state: $("[data-h-state]", root) };
    var SPEED = 150, NOISE = 100;
    var WALLS = [[0, 0, 800, 12], [0, 468, 800, 12], [0, 0, 12, 480], [788, 0, 12, 480],
      [190, 12, 18, 300], [395, 168, 18, 300], [595, 12, 18, 300]];
    var EXIT = { x: 740, y: 26, w: 40, h: 40 };
    var me, guards, rings, t, moving, noise, vision, pointer, running, ringT, caughtBy;

    function reset() {
      me = { x: 60, y: 420, r: 12 };
      // Readable rhythms: each guard sweeps across the middle of its section and pauses
      // at both ends, leaving quiet pockets above and below. The first section has no
      // guard, so the noise ring can be learned before it matters.
      guards = [
        { path: [[228, 240], [372, 240]] },
        { path: [[578, 250], [432, 250]] },
        { path: [[632, 230], [768, 230]] }
      ].map(function (g, i) { return { x: g.path[0][0], y: g.path[0][1], path: g.path, wp: 1, alert: 0, tx: 0, ty: 0, look: 0, wait: i * 0.6, r: 13, sp: 46 + i * 3 }; });
      rings = []; t = 0; moving = false; noise = 0; vision = 1; pointer = null; running = true; ringT = 0; caughtBy = null;
    }
    function hitsWall(x, y, r) {
      return WALLS.some(function (w) { return x + r > w[0] && x - r < w[0] + w[2] && y + r > w[1] && y - r < w[1] + w[3]; });
    }
    function blocked(ax, ay, bx, by) { // does a wall stand between two points? (sound is muffled by walls)
      for (var i = 0; i <= 20; i++) {
        var x = ax + (bx - ax) * i / 20, y = ay + (by - ay) * i / 20;
        if (WALLS.slice(4).some(function (w) { return x > w[0] && x < w[0] + w[2] && y > w[1] && y < w[1] + w[3]; })) return true;
      }
      return false;
    }
    function moveBody(o, vx, vy, dt) {
      var nx = o.x + vx * dt, ny = o.y + vy * dt;
      if (!hitsWall(nx, o.y, o.r)) o.x = nx;
      if (!hitsWall(o.x, ny, o.r)) o.y = ny;
    }
    function step(dt) {
      if (!running) { draw(); return; }
      t += dt;
      var dir = keys.vec();
      if (!dir && pointer) {
        var dx = pointer.x - me.x, dy = pointer.y - me.y, d = Math.hypot(dx, dy);
        if (d > 6) dir = { x: dx / d, y: dy / d };
      }
      moving = !!dir;
      if (moving) moveBody(me, dir.x * SPEED, dir.y * SPEED, dt); // all or nothing: full speed, full volume
      noise = clamp(noise + (moving ? 5 : -4) * dt, 0, 1);
      vision = clamp(vision + (moving ? 6 : -1.8) * dt, 0.06, 1);
      var nr = NOISE * noise;
      if (moving && (ringT -= dt) <= 0) { rings.push({ x: me.x, y: me.y, life: 0 }); ringT = 0.28; }
      rings.forEach(function (r) { r.life += dt; });
      rings = rings.filter(function (r) { return r.life < 0.8; });

      guards.forEach(function (g) {
        var heard = nr > 4 && Math.hypot(g.x - me.x, g.y - me.y) < nr + g.r && !blocked(g.x, g.y, me.x, me.y);
        if (heard) { if (!g.alert) g.look = 0.35; g.alert = 3.2; g.tx = me.x; g.ty = me.y; }
        if (g.look > 0) { g.look -= dt; return; } // the double take before the chase
        if (!(g.alert > 0) && g.wait > 0) { g.wait -= dt; return; }       // the pause at each end of a patrol
        var tx, ty, sp;
        if (g.alert > 0) { g.alert -= dt; tx = g.tx; ty = g.ty; sp = 100; }
        else { tx = g.path[g.wp][0]; ty = g.path[g.wp][1]; sp = g.sp; }
        var dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
        if (d < 4) { if (g.alert > 0) g.alert = Math.min(g.alert, 0.9); else { g.wp = (g.wp + 1) % g.path.length; g.wait = 1.3; } }
        else moveBody(g, dx / d * sp, dy / d * sp, dt);
        g.fx = dx; g.fy = dy;
        if (Math.hypot(g.x - me.x, g.y - me.y) < g.r + me.r - 2) { running = false; caughtBy = g; }
      });
      if (!running) { frame.over(false, msg(root, "lose-k"), msg(root, "lose-t")); }
      else if (me.x > EXIT.x - 6 && me.y < EXIT.y + EXIT.h + 6) {
        running = false; frame.over(true, msg(root, "win-k"), msg(root, "win-t", { s: t.toFixed(1) }));
      }
      hud.noise.style.setProperty("--n", noise.toFixed(2));
      hud.state.textContent = msg(root, moving ? "state-loud" : vision < 0.2 ? "state-blind" : "state-quiet");
      root.classList.toggle("is-loud", moving);
      draw();
    }
    function draw() {
      ctx.fillStyle = "#0b1622"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(120,200,220,.07)"; ctx.lineWidth = 1;
      for (var x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // exit
      ctx.fillStyle = "#1f8f63"; ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
      ctx.fillStyle = "#c9ffe6"; ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("EXIT", EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 4);
      // guards
      guards.forEach(function (g) {
        ctx.save(); ctx.translate(g.x, g.y);
        var a = Math.atan2(g.fy || 1, g.fx || 0);
        ctx.fillStyle = "rgba(255,190,90,.12)"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 58, a - 0.5, a + 0.5); ctx.fill();
        ctx.fillStyle = g.alert > 0 ? "#ff5a5a" : "#e0a03a"; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, 7); ctx.fill();
        ctx.fillStyle = "#1b2633"; ctx.fillRect(-8, -3, 16, 6);
        if (g.alert > 0 || g.look > 0) { ctx.fillStyle = "#fff"; ctx.font = "800 16px system-ui"; ctx.textAlign = "center"; ctx.fillText(g.look > 0 ? "?" : "!", 0, -g.r - 6); }
        ctx.restore();
      });
      // walls
      ctx.fillStyle = "#3b5267";
      WALLS.forEach(function (w) { ctx.fillRect(w[0], w[1], w[2], w[3]); });
      ctx.fillStyle = "rgba(255,255,255,.08)";
      WALLS.slice(4).forEach(function (w) { ctx.fillRect(w[0], w[1], 4, w[3]); });
      // noise: what the guards can hear
      var nr = NOISE * noise;
      if (nr > 2) {
        ctx.strokeStyle = "rgba(255,90,140," + (0.25 + noise * 0.35) + ")"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(me.x, me.y, nr, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
      rings.forEach(function (r) {
        ctx.strokeStyle = "rgba(255,120,170," + (0.7 - r.life) + ")"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(r.x, r.y, 14 + r.life * NOISE * 1.1, 0, 7); ctx.stroke();
      });
      // blind: everything beyond a few steps goes black while the robot recharges
      if (vision < 1) {
        var vr = 30 + vision * 900, g = ctx.createRadialGradient(me.x, me.y, vr * 0.55, me.x, me.y, vr);
        g.addColorStop(0, "rgba(3,6,10,0)"); g.addColorStop(1, "rgba(3,6,10," + (0.97 - vision * 0.5) + ")");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      // the robot: a radio for a head
      ctx.save(); ctx.translate(me.x, me.y);
      ctx.fillStyle = "#d9e6f2"; ctx.fillRect(-11, -9, 22, 18);
      ctx.fillStyle = "#e05a7a"; ctx.fillRect(-7, -5, 8, 8);
      ctx.fillStyle = "#1b2633"; for (var i = 0; i < 3; i++) ctx.fillRect(3, -5 + i * 3, 5, 1.5);
      ctx.strokeStyle = "#d9e6f2"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(10, -17); ctx.stroke();
      ctx.fillStyle = moving ? "#ff5a8a" : "#4ad3ff"; ctx.beginPath(); ctx.arc(10, -18, 2.5, 0, 7); ctx.fill();
      ctx.restore();
    }
    canvas.addEventListener("pointerdown", function (e) { pointer = st.toWorld(e); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
    canvas.addEventListener("pointermove", function (e) { if (pointer) pointer = st.toWorld(e); });
    canvas.addEventListener("pointerup", function () { pointer = null; });
    canvas.addEventListener("pointercancel", function () { pointer = null; });
    // read-only state for the automated play-tests (bots steer by key events and read this)
    root._dbg = function () { return { me: me, guards: guards, noise: noise, t: t, running: running }; };
    var loop = Loop(root, step);
    reset(); draw();
    wire(root, frame, function () { reset(); keys.clear(); loop.start(); }, function () { reset(); keys.clear(); loop.start(); });
  }

  /* =====================================================================
     VIKTOR'S MAYHEM: pull the lever, take your curse, survive the arena.
     Each misfortune changes how you play, not just a number.
     ===================================================================== */
  var CURSES = ["mirror", "big", "butter", "dark", "coffee", "glass"];
  var ICONS = { mirror: "🪞", big: "🍔", butter: "🧈", dark: "💡", coffee: "☕", glass: "🦴" };
  function slots(root) {
    var frame = Frame(root, "slots");
    var machine = $("[data-slot]", root), reels = $$("[data-reel]", root), lever = $("[data-lever]", root);
    var card = $("[data-curse]", root), fight = $("[data-fight]", root), arena = $("[data-arena]", root);
    var canvas = $("canvas", root), st = Stage(canvas, 800, 480), ctx = st.ctx, W = 800, H = 480;
    var keys = Keys(root), hud = { hearts: $("[data-h-hearts]", root), time: $("[data-h-time]", root), curse: $("[data-h-curse]", root) };
    var LEN = 15, curse, me, shots, t, running, spinning = false, pointer, nextShot, dashT, dashCd, hurtT, lastCurse = "";

    reels.forEach(function (r) {
      var strip = document.createElement("div"); strip.className = "reel__strip";
      for (var i = 0; i < 24; i++) { var s = document.createElement("span"); s.textContent = ICONS[CURSES[i % 6]]; strip.appendChild(s); }
      r.appendChild(strip);
    });
    function pull() {
      if (spinning) return;
      spinning = true; frame.begin(); frame.hideEnd();
      arena.hidden = true; machine.hidden = false; card.hidden = true;
      lever.classList.remove("is-pulled"); void lever.offsetWidth; lever.classList.add("is-pulled");
      do { curse = CURSES[Math.floor(Math.random() * CURSES.length)]; } while (curse === lastCurse);
      lastCurse = curse;
      var land = 18 + CURSES.indexOf(curse);
      reels.forEach(function (r, i) {
        var strip = $(".reel__strip", r);
        strip.style.transition = "none"; strip.style.transform = "translateY(0)"; void strip.offsetWidth;
        strip.style.transition = reduce ? "none" : "transform " + (1.1 + i * 0.45) + "s cubic-bezier(.2,.7,.25,1.02)";
        strip.style.transform = "translateY(" + (-land * 100 / 24) + "%)";
      });
      setTimeout(function () {
        spinning = false;
        $("[data-curse-icon]", card).textContent = ICONS[curse];
        $("[data-curse-name]", card).textContent = msg(root, "c-" + curse);
        $("[data-curse-rule]", card).textContent = msg(root, "r-" + curse);
        $("[data-curse-quip]", card).textContent = "“" + msg(root, "q-" + curse) + "”";
        card.hidden = false;
        frame.say(msg(root, "c-" + curse) + ". " + msg(root, "r-" + curse));
        try { fight.focus({ preventScroll: true }); } catch (_) {}
      }, reduce ? 50 : 2100);
    }
    function reset() {
      me = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: curse === "big" ? 26 : 13, hp: curse === "glass" ? 1 : 3 };
      shots = []; t = 0; running = true; pointer = null; nextShot = 0.8; dashT = 0; dashCd = 0; hurtT = 0;
      hud.curse.textContent = ICONS[curse] + " " + msg(root, "c-" + curse);
    }
    function enter() {
      machine.hidden = true; arena.hidden = false; reset(); keys.clear(); loop.start();
      try { root.querySelector("[data-toy-focus]").focus({ preventScroll: true }); } catch (_) {}
    }
    function dash() {
      if (!running || dashCd > 0) return;
      dashT = 0.32; dashCd = curse === "glass" ? 0.6 : 1.2;
      var sp = Math.hypot(me.vx, me.vy) || 1; me.vx = me.vx / sp * 560; me.vy = me.vy / sp * 560;
    }
    function step(dt) {
      if (!running) { draw(); return; }
      t += dt; dashT -= dt; dashCd -= dt; hurtT -= dt;
      var dir = keys.vec();
      if (!dir && pointer) { var dx = pointer.x - me.x, dy = pointer.y - me.y, d = Math.hypot(dx, dy); if (d > 8) dir = { x: dx / d, y: dy / d }; }
      if (dir && curse === "mirror") dir = { x: -dir.x, y: -dir.y };
      var top = curse === "coffee" ? 400 : 230, grip = curse === "butter" ? 1.6 : 14;
      if (dashT <= 0) {
        var tx = dir ? dir.x * top : 0, ty = dir ? dir.y * top : 0;
        me.vx += (tx - me.vx) * Math.min(1, grip * dt); me.vy += (ty - me.vy) * Math.min(1, grip * dt);
      }
      me.x += me.vx * dt; me.y += me.vy * dt;
      if (me.x < 40 + me.r || me.x > W - 40 - me.r) { me.vx *= -0.4; me.x = clamp(me.x, 40 + me.r, W - 40 - me.r); }
      if (me.y < 40 + me.r || me.y > H - 40 - me.r) { me.vy *= -0.4; me.y = clamp(me.y, 40 + me.r, H - 40 - me.r); }

      // the studio audience throws tomatoes, faster as the clock runs down
      if (t > nextShot) {
        var side = Math.floor(Math.random() * 4), sx = side === 0 ? -10 : side === 1 ? W + 10 : rand(40, W - 40), sy = side < 2 ? rand(40, H - 40) : side === 2 ? -10 : H + 10;
        var lead = 0.25, ax = me.x + me.vx * lead - sx, ay = me.y + me.vy * lead - sy, m = Math.hypot(ax, ay) || 1, v = 200 + t * 9;
        shots.push({ x: sx, y: sy, vx: ax / m * v, vy: ay / m * v, r: 9 });
        nextShot = t + Math.max(0.28, 0.85 - t * 0.04);
      }
      shots.forEach(function (s) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (!s.dead && dashT <= 0 && hurtT <= 0 && Math.hypot(s.x - me.x, s.y - me.y) < s.r + me.r) {
          s.dead = true; me.hp--; hurtT = 0.8;
          if (me.hp <= 0) { running = false; frame.over(false, msg(root, "lose-k"), msg(root, "lose-t", { s: t.toFixed(1) })); }
        }
      });
      shots = shots.filter(function (s) { return !s.dead && s.x > -40 && s.x < W + 40 && s.y > -40 && s.y < H + 40; });
      if (running && t >= LEN) { running = false; frame.over(true, msg(root, "win-k"), msg(root, "win-t")); }
      hud.hearts.textContent = "❤".repeat(Math.max(0, me.hp)) || "–";
      hud.time.textContent = Math.max(0, Math.ceil(LEN - t));
      draw();
    }
    function draw() {
      var g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 480);
      g.addColorStop(0, "#5a2470"); g.addColorStop(1, "#1d0b2a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#f6c64a"; ctx.lineWidth = 4; ctx.setLineDash([2, 14]);
      ctx.strokeRect(36, 36, W - 72, H - 72); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(246,198,74,.08)"; ctx.beginPath(); ctx.arc(W / 2, H / 2, 150, 0, 7); ctx.fill();
      shots.forEach(function (s) {
        ctx.fillStyle = "#e8323c"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
        ctx.fillStyle = "#3fa34d"; ctx.fillRect(s.x - 3, s.y - s.r - 2, 6, 4);
      });
      if (!me) return;
      var blink = hurtT > 0 && Math.floor(hurtT * 12) % 2;
      if (!blink) {
        ctx.save(); ctx.translate(me.x, me.y);
        if (dashT > 0) { ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.arc(-me.vx * 0.03, -me.vy * 0.03, me.r, 0, 7); ctx.fill(); }
        ctx.fillStyle = "#7fd3ff"; ctx.beginPath(); ctx.arc(0, 0, me.r, 0, 7); ctx.fill();
        ctx.fillStyle = "#14243a"; ctx.beginPath(); ctx.arc(-me.r * 0.35, -me.r * 0.15, me.r * 0.16, 0, 7); ctx.arc(me.r * 0.35, -me.r * 0.15, me.r * 0.16, 0, 7); ctx.fill();
        ctx.restore();
      }
      if (curse === "dark" && running) {
        var d = ctx.createRadialGradient(me.x, me.y, 40, me.x, me.y, 120);
        d.addColorStop(0, "rgba(8,2,14,0)"); d.addColorStop(1, "rgba(8,2,14,.96)");
        ctx.fillStyle = d; ctx.fillRect(0, 0, W, H);
      }
    }
    root.addEventListener("keydown", function (e) {
      if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (!arena.hidden) { e.preventDefault(); dash(); }
      }
    });
    canvas.addEventListener("pointerdown", function (e) { pointer = st.toWorld(e); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
    canvas.addEventListener("pointermove", function (e) { if (pointer) pointer = st.toWorld(e); });
    canvas.addEventListener("pointerup", function () { pointer = null; });
    canvas.addEventListener("pointercancel", function () { pointer = null; });
    // read-only state for the automated play-tests (bots steer by key events and read this)
    root._dbg = function () { return { me: me, shots: shots, t: t, running: running, curse: curse, dashCd: dashCd }; };
    $("[data-dash]", root).addEventListener("click", dash);
    lever.addEventListener("click", pull);
    fight.addEventListener("click", enter);
    var loop = Loop(root, step);
    wire(root, frame, pull, pull);
  }

  var GAMES = { mirror: mirror, swipe: swipe, flock: flock, radio: radio, slots: slots };
  window.AMToys = {
    mount: function (el) {
      if (el._toy) return; el._toy = true;
      var g = GAMES[el.getAttribute("data-toy")];
      if (g) try { g(el); } catch (err) { el.classList.add("is-broken"); if (window.console) console.error(err); }
    }
  };
})();
