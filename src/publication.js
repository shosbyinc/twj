/**
 * Provenance is asked per metric, not per city.
 *
 * A city record cites every document behind every figure it carries. Asking
 * "is this city archived" of that whole list answers the wrong question: one
 * unobtained decree behind the sewerage rate marked Dubai's water supply
 * figure as unpublished, although that figure rests on archived legislation,
 * a hashed tariff capture and an exact invoice reconciliation.
 *
 * A city may therefore declare `sources_by_metric`. Where it does, each metric
 * is judged on its own documents. Where it does not, every source counts
 * toward every metric — the conservative reading, and the right default.
 */

export const METRICS = ['water_supply', 'total_water_services'];

/** A source proves something only once it is archived under a real hash. */
export function isArchived(source) {
  const h = source?.archive_sha256;
  return Boolean(h) && !String(h).startsWith('PENDING');
}

/**
 * Which files of a capture the verbatim second pass can actually read.
 *
 * The second pass goes back to the archived document and looks for each stored
 * rate as text. A print-to-PDF defeats it, and for a while the only answer was
 * to declare the rate unreachable — which is honest and is also the check
 * switching itself off exactly where the strongest captures are.
 *
 * A PDF made by printing a web page still carries a text layer. Extracting it
 * mechanically is not transcription: nobody retypes a figure, and a tool that
 * mangles Japanese glyphs does not mangle Arabic numerals. Where a source
 * stores such an extract beside the PDF, the pass reads it and the rates are
 * checked against the publisher's own bytes rather than excused.
 *
 * The PDF remains the capture. This is the machine-readable face of it, hashed
 * separately so a swapped extract is as visible as a swapped document.
 */
export function readableArchives(source) {
  const out = [];
  const isText = p => typeof p === 'string' && p.length > 0 && !/\.(pdf|png|jpe?g)$/i.test(p);
  if (isText(source?.archive_path)) out.push(source.archive_path);
  if (isText(source?.archive_text_path)) out.push(source.archive_text_path);
  return out;
}

/** The capture files a source claims, readable or not. */
export function archiveFiles(source) {
  return [source?.archive_path, source?.archive_text_path]
    .filter(p => typeof p === 'string' && p.length > 0);
}

/**
 * @param {object} city     a data/cities record
 * @param {object} sources  id → source record
 * @returns {{ by_metric: object, sources_missing: object, archived: boolean }}
 */
export function archiveStatus(city, sources) {
  const all = city.sources ?? [];
  const map = city.sources_by_metric ?? null;

  const forMetric = metric => {
    if (!map) return all;
    const ids = map[metric];
    if (ids === undefined) return all;
    /* A metric may declare sources of its own; it always inherits the shared
       ones, so a document cannot be lost by being listed under one heading. */
    const shared = map.shared ?? [];
    return [...new Set([...shared, ...ids])];
  };

  const by_metric = {}, sources_missing = {};
  for (const m of METRICS) {
    const ids = forMetric(m);
    const missing = ids.filter(id => !isArchived(sources[id]));
    by_metric[m] = missing.length === 0;
    sources_missing[m] = missing;
  }

  /* The city-level flag now means what the site uses it for: the headline
     water supply figure has complete provenance. A held services figure is a
     held metric, not an unpublished city. */
  return { by_metric, sources_missing, archived: by_metric.water_supply };
}
