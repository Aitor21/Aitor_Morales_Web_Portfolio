/* Language routing — loaded synchronously in <head>, on purpose.

   It has to decide before the first paint, or the visitor sees a flash of
   English and then a jump. It is deliberately tiny and dependency-free, and
   every branch is wrapped so a blocked localStorage (private mode, strict
   cookie settings) can never stop the page loading.

   Rules, in order:
     1. A URL that names a language wins. If you are on /es/ you asked for
        /es/, so nothing here moves you — that keeps shared links honest.
     2. A remembered choice wins next. Picking a language sticks.
     3. Otherwise the device language decides, once, and we leave a marker so
        the page can offer a way back in the language they came from.

   Only the English URLs are ever redirected away from, which is also what
   keeps this safe for search engines: crawlers request the canonical English
   page without an Accept-Language preference and stay on it, and the
   hreflang tags tell them the translations exist. */
(function () {
  var SUPPORTED = ["en", "es", "fr", "de", "it", "pt"];
  var PREFIX = /^\/(es|fr|de|it|pt)(?=\/|$)/;
  try {
    var path = location.pathname;
    var current = (path.match(PREFIX) || [null, "en"])[1];
    if (current !== "en") return;                       // rule 1

    var saved = null;
    try { saved = localStorage.getItem("am-lang"); } catch (_) {}
    if (SUPPORTED.indexOf(saved) < 0) saved = null;

    var want = saved;                                    // rule 2
    if (!want) {                                         // rule 3
      var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
      nav = String(nav).toLowerCase().split("-")[0];
      want = SUPPORTED.indexOf(nav) > -1 ? nav : "en";
      if (want !== "en") {
        // Tells the page it was moved automatically, so it can offer the undo.
        try { sessionStorage.setItem("am-auto", "en"); } catch (_) {}
      }
    }
    if (!want || want === "en") return;

    var rest = path.replace(PREFIX, "") || "/";
    location.replace("/" + want + rest + location.search + location.hash);
  } catch (_) {}
})();
