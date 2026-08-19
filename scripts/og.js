#!/usr/bin/env node
/**
 * Social cards.
 *
 *   npm run og            every published article
 *   npm run og -- <slug>  one of them
 *
 * The covers are 1080x1350 — portrait, because that is the format the feed
 * wants. Every social platform crops a shared image to about 1.91:1, and a
 * centre crop of a TWJ cover cuts off the hook line at the bottom, which is
 * the one sentence the card exists to carry.
 *
 * So the card is not a crop. The whole poster is placed, unaltered, on the
 * brand ground and centred: 1200x630, nothing lost, no type added. The result
 * is letterboxed by design and reads as a framed page rather than a mistake.
 *
 * Written to content/images/<slug>.og.jpg. render.js prefers it for og:image
 * and twitter:image when it exists, and falls back to the cover when it does
 * not, so this step is optional and never blocks a build.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from '../src/markdown.js';

const ROOT = new URL('..', import.meta.url).pathname;
const only = process.argv[2];

const slugs = readdirSync(join(ROOT, 'content/articles'))
  .filter(f => f.endsWith('.md'))
  .map(f => frontmatter(readFileSync(join(ROOT, 'content/articles', f), 'utf8')).meta)
  .filter(m => m.status !== 'draft' && m.cover)
  .map(m => m.slug)
  .filter(s => !only || s === only);

if (!slugs.length) {
  console.log(only ? `No published article with slug "${only}"` : 'No published articles with covers');
  process.exit(0);
}

const script = `
import sys
from PIL import Image
GROUND = (248, 248, 245)          # Pure White, the site's own ground
W, H, PAD = 1200, 630, 24
for path in sys.argv[1:]:
    slug = path.rsplit("/", 1)[-1].rsplit(".jpg", 1)[0]
    src = Image.open(path).convert("RGB")
    scale = (H - 2 * PAD) / src.height
    poster = src.resize((round(src.width * scale), H - 2 * PAD), Image.LANCZOS)
    card = Image.new("RGB", (W, H), GROUND)
    card.paste(poster, ((W - poster.width) // 2, PAD))
    out = path.rsplit(".jpg", 1)[0] + ".og.jpg"
    card.save(out, quality=88, optimize=True, progressive=True)
    print(f"  content/images/{slug}.og.jpg  {W}x{H}")
`;

const files = slugs.map(s => join(ROOT, 'content/images', `${s}.jpg`)).filter(existsSync);
if (!files.length) { console.error('No cover files found in content/images'); process.exit(1); }

try {
  process.stdout.write(execFileSync('python3', ['-c', script, ...files], { encoding: 'utf8' }));
  console.log(`${files.length} social card${files.length === 1 ? '' : 's'} · 1200x630 · run npm run deploy to ship them`);
} catch (e) {
  console.error('Card generation failed.');
  console.error(e.stdout ?? e.message);
  process.exit(1);
}
