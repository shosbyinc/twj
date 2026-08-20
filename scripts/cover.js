#!/usr/bin/env node
/**
 * Extracts an article cover from the supplied layout PDF.
 *
 *   npm run cover -- <slug> <path/to/Article_TWJ_*.pdf>
 *
 * The Article_ PDFs embed the cover as a lossless PNG at exactly 1080×1350 —
 * the production size. So this lifts the original bytes out rather than
 * rasterising the page, which would resample a perfectly good image through a
 * renderer and lose the type edges.
 *
 * Two files are written, because the site wants two things from one picture:
 *
 *   <slug>.jpg       1080×1350, the archival copy kept in the repository
 *   <slug>.web.jpg     700× 875, what the page actually loads
 *
 * render.js prefers the .web variant when it exists. The single-file preview
 * inlines whichever it finds, and 700px wide is the difference between a
 * preview that travels and one that does not.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const [slug, pdf] = process.argv.slice(2);

if (!slug || !pdf) {
  console.log('Usage: npm run cover -- <slug> <path/to/Article_TWJ_*.pdf>');
  process.exit(0);
}
if (!existsSync(pdf)) { console.error(`No such file: ${pdf}`); process.exit(1); }

const out = join(ROOT, 'content/images');
mkdirSync(out, { recursive: true });

/* Python holds the PDF and image libraries in this environment; the alternative
   is a dependency, and this project has none. */
const script = `
import sys, io, pypdf
from PIL import Image
pdf, out, slug = sys.argv[1], sys.argv[2], sys.argv[3]
page = pypdf.PdfReader(pdf).pages[0]
best = None
for im in page.images:
    img = im.image
    if best is None or img.size[0] * img.size[1] > best.size[0] * best.size[1]:
        best = img
if best is None:
    print("NO_IMAGE"); sys.exit(1)
w, h = best.size
if (w, h) != (1080, 1350):
    print(f"WARN unexpected cover size {w}x{h}; expected 1080x1350")
full = best.convert("RGB")
full.save(f"{out}/{slug}.jpg", quality=92, optimize=True, progressive=True)
web = full.resize((700, round(700 * h / w)), Image.LANCZOS)
web.save(f"{out}/{slug}.web.jpg", quality=82, optimize=True, progressive=True)
print(f"OK {w}x{h}")
`;

try {
  const res = execFileSync('python3', ['-c', script, pdf, out, slug], { encoding: 'utf8' });
  process.stdout.write(res);
  for (const f of [`${slug}.jpg`, `${slug}.web.jpg`]) {
    const p = join(out, f);
    console.log(`  content/images/${f}`);
  }
  console.log(`  reference it as  cover: images/${slug}.jpg`);
} catch (e) {
  console.error('Extraction failed.');
  console.error(e.stdout ?? e.message);
  process.exit(1);
}
