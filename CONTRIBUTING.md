# Contributing

## The pull request is the second reader

Rule 9.3 requires two-person review for any new tariff structure. That review
is the pull request. It is not a formality and it is not self-approvable.

## Adding or changing a tariff

1. Capture the primary document. Save it to `archive/` and record its SHA-256
   in the source record. A URL is not provenance — utility pages are replaced
   without notice and a dead link stops proving anything.
2. Write the tariff as **published**, not as simplified. If the utility prints a
   rate per m³, store a rate. If it prints a percentage, store a percentage.
   The two agree today and diverge at the next tariff change.
3. Keep statutory names. Do not rename a component to something more familiar.
4. Mark any assumption with `"assumed": true` and an `assumption_note`. The
   engine will then refuse Grade A, which is the intended behaviour.
5. Run `npm test && npm run build`.

## Superseding a value

Never edit a historical tariff in place. Close it with `effective_to` and add a
new file for the new schedule. Rule 7.3 is append-only, and it is the asset:
five years of dated, sourced, normalised history is the one thing a competitor
cannot assemble in a quarter.

## Corrections

Wrong figures are corrected in `data/corrections.json` with the old value, the
new value, the reason and the timestamp — then fixed at source. Corrections are
tracked as a health metric. A long run with zero corrections suggests
insufficient checking, not perfection.

## Review checklist

- [ ] Primary document archived and hashed
- [ ] Source tier is 1 or 2
- [ ] Components match the published form, not a simplification
- [ ] Every assumption declared and noted
- [ ] Grade justified against §5 of the methodology
- [ ] Fixtures pass; no fixture edited to accommodate the change
- [ ] `effective_from` set; any superseded schedule closed, not deleted
