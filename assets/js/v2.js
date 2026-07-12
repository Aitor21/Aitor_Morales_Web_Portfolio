/* Aitor Morales — Portfolio v2. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Parallax scene (mouse + gyroscope) ---------- */
  var scene = document.querySelector(".scene");
  if (!scene || reduceMotion) return;

  var layers = Array.prototype.slice.call(scene.querySelectorAll("[data-depth]"));
  if (!layers.length) return;

  var targetX = 0, targetY = 0, curX = 0, curY = 0, rafId = null;

  function render() {
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    layers.forEach(function (layer) {
      var d = parseFloat(layer.getAttribute("data-depth")) || 0;
      layer.style.transform = "translate3d(" + (curX * d) + "px," + (curY * d) + "px,0)";
    });
    if (Math.abs(targetX - curX) > 0.1 || Math.abs(targetY - curY) > 0.1) {
      rafId = requestAnimationFrame(render);
    } else {
      rafId = null;
    }
  }
  function kick() { if (rafId === null) rafId = requestAnimationFrame(render); }

  /* Mouse */
  window.addEventListener("mousemove", function (e) {
    targetX = (e.clientX / window.innerWidth - 0.5) * -40;
    targetY = (e.clientY / window.innerHeight - 0.5) * -30;
    kick();
  }, { passive: true });

  /* Gyroscope */
  function onOrientation(e) {
    if (e.gamma === null || e.beta === null) return;
    var g = Math.max(-30, Math.min(30, e.gamma)); // left-right
    var b = Math.max(-30, Math.min(30, e.beta - 40)); // front-back, offset for hand-held angle
    targetX = (g / 30) * -34;
    targetY = (b / 30) * -26;
    kick();
  }

  var motionBtn = document.querySelector(".motion-btn");
  var needsPermission = typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";

  if (needsPermission && motionBtn) {
    // iOS 13+: permission must come from a user gesture.
    motionBtn.classList.add("is-shown");
    motionBtn.addEventListener("click", function () {
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === "granted") {
          window.addEventListener("deviceorientation", onOrientation, { passive: true });
        }
        motionBtn.classList.remove("is-shown");
      }).catch(function () { motionBtn.classList.remove("is-shown"); });
    });
  } else if (window.DeviceOrientationEvent && "ontouchstart" in window) {
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
  }
})();
