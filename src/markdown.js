/**
 * A small, dependency-free Markdown subset — enough for an editorial site and
 * nothing more. Everything it does not understand is left as a paragraph
 * rather than guessed at.
 *
 * Supported: frontmatter, # ## ###, paragraphs, **bold**, *italic*, links,
 * > pull quotes, - lists, --- rules, ![](images), and one house block:
 *
 *     :::figure AED 9.59 | per 1,000 litres | Dubai, July 2026
 *
 * which renders a large figure with its unit and source, so a writer can drop
 * a number into prose without hand-writing HTML.
 */

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<i>$2</i>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

export function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('[') && v.endsWith(']'))
      v = v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
    meta[k] = v;
  }
  return { meta, body: text.slice(m[0].length) };
}

export function render(md) {
  const out = [];
  const lines = md.split('\n');
  let para = [], list = null, numbers = null;

  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
    if (list) { out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) { flush(); continue; }

    let m;
    if ((m = /^:::figure\s+(.+)$/.exec(line))) {
      flush();
      const [fig, unit, src] = m[1].split('|').map(s => s.trim());
      out.push(`<figure class="fig"><div class="v num">${esc(fig)}</div>` +
        (unit ? `<div class="u">${esc(unit)}</div>` : '') +
        (src ? `<figcaption>${esc(src)}</figcaption>` : '') + '</figure>');
      continue;
    }
    if ((m = /^:::numbers\s*(.*)$/.exec(line))) {
      flush();
      numbers = { source: m[1].trim() || null, rows: [] };
      continue;
    }
    if (numbers) {
      if (/^:::$/.test(line)) {
        out.push(`<div class="numbers">${numbers.rows.map(r =>
          `<div class="n"><span class="dot"></span><div class="txt"><div class="amount">${esc(r[0])}</div>` +
          `<div class="cap">${inline(r[1] ?? '')}</div></div></div>`).join('')}` +
          (numbers.source ? `<div class="src">Source: ${esc(numbers.source)}</div>` : '') + '</div>');
        numbers = null;
        continue;
      }
      const [fig, ...rest] = line.split('|');
      numbers.rows.push([fig.trim(), rest.join('|').trim()]);
      continue;
    }
    if ((m = /^!\[(.*?)\]\((.+?)\)$/.exec(line))) {
      flush();
      out.push(`<figure class="img"><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">` +
        (m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : '') + '</figure>');
      continue;
    }
    if ((m = /^(#{1,3})\s+(.+)$/.exec(line))) {
      flush(); out.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); continue;
    }
    if ((m = /^>\s?(.*)$/.exec(line))) {
      flush(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue;
    }
    if (/^---+$/.test(line)) { flush(); out.push('<hr>'); continue; }
    if ((m = /^[-*]\s+(.+)$/.exec(line))) {
      if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
      (list ??= []).push(m[1]); continue;
    }
    if (list) { out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; }
    para.push(line.trim());
  }
  flush();

  /**
   * Two structural facts the markdown already states and the HTML did not.
   *
   * A paragraph whose entire content is bold is not a paragraph. In every
   * article it is a label — "01 — The continuous record" — and it was reaching
   * the page as body copy set in bold, which is the one thing the brand book
   * says the voice is not.
   *
   * And a horizontal rule before a "Sources and notes" heading is not a
   * decorative break: it is where the article stops and its evidence begins.
   * The reader can now see that, because everything after it is a region with
   * its own ground and its own smaller setting.
   */
  const html = out
    .map(h => h.replace(/^<p><b>(.+?)<\/b><\/p>$/, '<h5>$1</h5>'))
    .join('\n');

  const cut = html.lastIndexOf('<hr>');
  if (cut === -1 || !/<h[1-6]>[^<]*(sources|notes)/i.test(html.slice(cut))) return html;
  return html.slice(0, cut)
    + '<div class="notes">' + html.slice(cut + '<hr>'.length).trim() + '</div>';
}

/** Reading time, rounded up, from a words-per-minute that assumes prose. */
/* One number, one function, one rate. The site computes reading time from the
   prose it publishes, deliberately excluding the source list — a bibliography is
   looked up, not read. Any other artifact showing a different figure was not
   built from this, and the fix belongs there: two numbers for one piece of
   metadata means one of them is guessed. */
export const READING_WPM = 220;
export const readingMinutes = md => Math.max(1, Math.ceil(md.split(/\s+/).filter(Boolean).length / READING_WPM));
