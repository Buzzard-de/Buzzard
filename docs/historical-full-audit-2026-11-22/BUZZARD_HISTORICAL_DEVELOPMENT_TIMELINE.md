# Historical development timeline

Dates below are the git author timestamps, shown in Europe/Berlin. A timestamp that already carries `+02:00` or `Z` was converted. Commit subjects are the evidence. They are not proof that the described feature is complete.

| When | Evidence | What the history shows |
|------|----------|------------------------|
| 25 July 2026, 17:11 | `d4f8ddc` | First commit. Static site and GitHub Pages workflow. |
| 25 July 2026, later the same day | next four commits | Further static-site preparation. Nine commits in July. |
| 8 August 2026 | tag `catalog-snapshot-2026-08-08` and `snapshot-2026-08-08-final` | Catalog snapshots. |
| 8 August 2026, 23:19 UTC (9 August, 01:19 Europe/Berlin) | “Disable sales and hide prices” | Sales turned off for catalog-only mode. |
| 9 August 2026 | PIM Product Catalog v1.9, then v3.0 | Product master, brands, variants, translations, SEO. |
| 10–13 August 2026 | soft-launch and catalog-mode commits | Legal pages and API sales gate. Sales stay off. |
| August 2026 overall | 570 commits on HEAD | The bulk of the repository history. |
| 28 August 2026 | Cursor Aufgaben status file | A 15-part task pack marks several rows done, including production readiness. Later evidence does not support that claim. |
| 29–30 August 2026 | Parts 6, 7, and 15 | Product core, storefront bridge, catalog import pipeline. |
| September 2026 | 79 commits | 27 September: product source-of-truth foundation and sales safety gate. |
| October 2026 | 3 commits on this HEAD | This line of history is thin in October. |
| 14 October 2026 | `4b0ce17` on `cursor/software-completion-local-c293` | 237-slot register created. Not an ancestor of HEAD. |
| 18 October 2026 | `6e9d192` on that branch | Last update found for the 237 register. Original titles still unknown. `VERIFIED_100` count in that file is 0. |
| 1 November 2026 | special-16 inventory; Esat Bey hooks | A 16-item command and an 8-phase command. Sales remain off. |
| 8 November 2026 | native-AI phases 10–18 | Local capability engines. Commit subjects say live media and cloning stay blocked. |
| 17–18 November 2026 | root audit and security-sprint reports | Independent audits, dev-list remainder, admin security. |
| 19 November 2026, 18:49 Europe/Berlin | `9b86c1b7` | Current HEAD. “Save the full worktree before the pause.” |
| 21–22 November 2026 | uncommitted worktree only | 21-phase gate work, canonical order and product writers, 51 individual behavior tests, explicit locale fallback. Not committed. This audit did not continue that implementation. |

The worktree reflog has two entries, both at `9b86c1b7`. It cannot show the July history. That history comes from the commit graph.

## Systems found in the tree

These names are directories or modules that exist. Presence is not implementation of a live service.

Commerce and catalog code under `server/lib` includes product, PIM, catalog, search, pricing, inventory, orders, customers, returns, payments, finance, tax, and supplier adapters. Logistics code includes a carrier contract. Marketplace connectors exist with publish blocked while sales are off. AI code includes Pusat, council, guardian/Esat hooks, and `server/lib/buzzardNative`. Localization covers 30 locales in the current catalog-locale data. International tax and sanctions code exists as local screens, not as a filed return or a live sanctions feed.

Buzzard Logistics appears as documents under `intelligence/buzzard_ai_complete/logistics/`. Buzzard24 appears as export packs and the storefront name. Buzzard Film and Buzzard Bank were not found as software modules in the filenames searched.

Planned marketplaces named in older completion notes (Amazon, eBay, Kaufland, Allegro, bol.com, Cdiscount, OTTO, eMAG, Skroutz) are classification or connector names. This audit did not find a live publishing integration. Carriers named in the carrier contract (including DHL) stay on a human gate for shipment creation.

## Superseded work

The static GitHub Pages site was superseded by the Next.js and Node server layout. The 237-slot scoring branch was not merged into HEAD. The August production-readiness checkmark was superseded by later audits that keep sales locked. The master-command 8 phases were not deleted when the special-16 list was declared binding.
