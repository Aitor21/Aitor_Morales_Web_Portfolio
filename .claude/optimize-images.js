/* =============================================================================
   Image optimizer for the portfolio.  Generates a resized .webp next to every
   raster image under assets/img, and shrinks two oversized originals in place.
   Animated GIFs become animated WebP (no video tooling needed).

   The site serves these via <picture><source type="image/webp"> ... </picture>,
   so modern browsers download only the small WebP and never fetch the fallback.

   USAGE (needs sharp — not a repo dependency):
     npm i sharp        # once, anywhere; or:  npx --yes -p sharp node .claude/optimize-images.js
     node .claude/optimize-images.js

   After adding NEW images, either wrap them in <picture> by hand, or re-run the
   one-time rewrite that added the wrappers (see git history for rewrite-html.js).
   ============================================================================= */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const IMG = path.join(__dirname, "..", "assets", "img");
sharp.cache(false);

const CAP_HERO = 1366;   // project-hero / work-card covers
const CAP_SHOT = 640;    // gallery shots (displayed small)
const CAP_PORTRAIT = 1200;
const kb = (n) => (n / 1024).toFixed(0) + " KB";

// oversized originals worth shrinking in place (fallback for the ~3% without WebP)
const shrinkInPlace = {
  "portrait.jpg": { w: CAP_PORTRAIT, fmt: "jpeg", opts: { quality: 82, mozjpeg: true } },
  "projects/gimica.png": { w: CAP_HERO, fmt: "png", opts: { compressionLevel: 9 } },
};

const capFor = (rel) =>
  /portrait\.jpg$/.test(rel) ? CAP_PORTRAIT : /shot-\d/.test(rel) ? CAP_SHOT : CAP_HERO;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(png|jpe?g|gif)$/i.test(e.name)) acc.push(p);
  }
  return acc;
}

(async () => {
  let webpTotal = 0, origTotal = 0;
  for (const abs of walk(IMG)) {
    const rel = path.relative(IMG, abs).replace(/\\/g, "/");
    const meta = await sharp(abs).metadata();
    const animated = (meta.pages || 1) > 1;
    const cap = capFor(rel);
    const webpPath = abs.replace(/\.(png|jpe?g|gif)$/i, ".webp");

    let img = sharp(abs, { animated });
    if (meta.width > cap) img = img.resize({ width: cap, withoutEnlargement: true });
    await img.webp(animated ? { quality: 50, effort: 6 } : { quality: 80, effort: 5 }).toFile(webpPath);

    if (shrinkInPlace[rel]) {
      const c = shrinkInPlace[rel];
      const buf = await sharp(abs).resize({ width: c.w, withoutEnlargement: true })[c.fmt](c.opts).toBuffer();
      fs.writeFileSync(abs, buf);
    }
    origTotal += fs.statSync(abs).size;
    webpTotal += fs.statSync(webpPath).size;
    console.log(rel.padEnd(46), animated ? "anim" : "    ", "->", kb(fs.statSync(webpPath).size));
  }
  console.log("\nWebP total:", kb(webpTotal), "(fallbacks on disk:", kb(origTotal) + ")");
})();
