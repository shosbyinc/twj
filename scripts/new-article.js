#!/usr/bin/env node
/** Scaffolds an article with the frontmatter already filled in.
 *    npm run new -- "Title of the piece" cities [city-id]                    */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const [title, rubric, city] = process.argv.slice(2);
const rubrics = JSON.parse(readFileSync(join(ROOT, 'content/rubrics.json'), 'utf8'))
  .rubrics.filter(r => r.active);

if (!title || !rubric) {
  console.log('Usage: npm run new -- "Title" <rubric> [city-id]\n');
  console.log('Active rubrics: ' + rubrics.map(r => r.id).join(' · '));
  process.exit(0);
}
if (!rubrics.some(r => r.id === rubric)) {
  console.error(`"${rubric}" is not an active rubric. Active: ${rubrics.map(r => r.id).join(', ')}`);
  process.exit(1);
}
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const path = join(ROOT, 'content/articles', `${slug}.md`);
if (existsSync(path)) { console.error(`${slug}.md already exists`); process.exit(1); }

writeFileSync(path, `---
slug: ${slug}
rubric: ${rubric}
title: ${title}
standfirst: One sentence that makes the reader want the next one.
question: The question this piece leaves open.
${city ? `city: ${city}` : '# city: singapore   # uncomment to link a city record'}
cover: images/${slug}.jpg
cover_alt: Describe the image for a reader who cannot see it
published: ${new Date().toISOString().slice(0, 10)}
author: The Water Journal
status: draft
---

Open with the fact, not the context.

## The why

Explain it once, plainly.

:::figure 00.00 | unit | source and date

## The system

What sits behind the number.

> A line worth pulling out.

---

End on the question, not a summary.
`);
console.log(`created content/articles/${slug}.md`);
console.log(`  cover image goes at content/images/${slug}.jpg`);
console.log(`  set status: published when it is ready, then npm run build`);
