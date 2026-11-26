# curacaofiles_graphics

An interactive relationship graph of the public **Casino Secrets** register data published at [curacaofiles.com](https://curacaofiles.com/) (mirror: [casinosecrets.lol](https://casinosecrets.lol/)).

The source site lets you search companies and domains one page at a time. This project puts the same records into a single network so that links between them become visible: one person who appears in three companies is **one node** connected to all three, a company is connected to its local representative and master licensor, and companies that list the same casino domain are connected to each other.

> **Read before use.** The inclusion of a person, company, domain, or other entity in the Casino Secrets database does not imply illegal or improper conduct. Records may be incomplete, outdated, or contain errors from the underlying source systems. Verify identities before drawing conclusions. All credit for the investigation and the data goes to [Casino Secrets](https://www.lilithwittmann.de/series/casinosecrets/) and its partners.

## Features

- Search by company, person, licence number or domain; filter node types.
- Side panel for every node, with links back to the source page (main site and mirror), every document's open / download link on the source site, licensing process, domains, roles (as badges) and the other people of each company.
- **Country filter**: one or several countries, most common first, with counts and SVG flags. Each country is shown under its own name and the register's English name (for example "Deutschland (Germany)") and can be searched by either, or by its name in the interface language. Matches passport countries; optionally also residence countries and name-based hints. The graph then shows only those people and what they connect to, laid out on their own so related nodes sit together.
- **Map view** (the "Map" switch next to the search box): people on a world map at their residence and passport countries, linked to the licensing jurisdiction of their companies (Curaçao, or Anjouan / Kahnawà:ke for foreign licence holders). Select a person, company or country to see only its network. The source has no company addresses, so positions are approximate. The graph stays the default view.
- **Media mentions** (optional): curated notes on what a video or article says about records, with a timestamped link. They are shown as third-party claims. See [docs/adding-media-mentions.md](docs/adding-media-mentions.md) to add one.
- **Link notices**: betting and casino domains are shown as plain text, not links. Clicking one opens a disclaimer, and the site can only be opened from there after a 5-second wait, every time. Video links first show a short notice that the video may be blocked in some countries (another network or a VPN may help).
- 28 interface languages (English by default), RTL for Arabic and Hebrew. The register's fixed vocabulary (roles such as "Managing Director", entity groups, company types, domain statuses) is translated, with the original as a tooltip; names, free text and claims are not. A legend in the bottom-left corner explains colours and shapes. The selected node, filters and language are kept in the URL, so a view can be shared.

## What is in the graph

| Node | Comes from |
| --- | --- |
| Company | every entity on `/casinos/` and its own page (operators, holdings, master licensors, representatives, trust services) |
| Person | "Related Entities" on company pages (beneficial owners, directors, compliance officers, …) |
| Organisation | related entities without a page of their own |
| Foreign licence holder | `/other-jurisdictions` (Anjouan, Kahnawà:ke registers) and "Also recorded for" domain notes |
| Country | passport and residence countries of people |
| Domain | a company's licensed domains, added to the graph on demand from the side panel |

| Edge | Meaning |
| --- | --- |
| `role` | person / organisation holds a role in a company |
| `representative`, `master_licensor`, `related` | company-to-company links listed on the pages |
| `shared_domain` | two companies list the same domain |
| `foreign_licence` | a foreign licence holder lists a domain that a Curaçao company also lists |
| `passport`, `residence` | person to country |

**People.** The source has no person ids. Records are merged into one person when the normalised name and the birth month match; filings that differ by a month (or a one-letter spelling) but share the name, birth year and a passport or residence country are merged too, and keep every birth month seen. Same-name records with other details stay separate and are shown as possible matches.

**Name-based country hints** are only hints and only used when turned on. They combine statistics learned from the passport data itself, per-country naming patterns (`scraper/src/curacao_scraper/name_profiles.py`) and per-country name lists generated from [Faker](https://github.com/joke2k/faker)'s dummy-data providers (MIT, `scraper/tools/build_name_lists.py`).

Nothing is copied from the documents. Each record keeps links to its source page, and every document keeps its original link on the source site.

**Domains.** The register lists a domain once per status period when it was deleted and added again. The scraper keeps one entry per domain with its current status and lists the earlier periods under it.

## Layout

```text
scraper/             Python: crawls the site politely and writes one JSON file
web/                 Vite + React + TypeScript + Sigma.js: the graph viewer
docs/                guides (adding media mentions)
highlights/          media mentions: one JSON file + transcript per video or article
.github/workflows/   GitHub Pages build and deploy
```

## Usage

### 1. Build the data

Python 3.11+.

```sh
cd scraper
pip install -e .             # or: uv sync
curacao-scraper              # crawl + build
```

- `crawl` downloads `/casinos/`, `/other-jurisdictions` and every company page into `scraper/.cache/html/`, one request at a time with a pause between requests (`--delay`, default 1.5 s). Cached pages are not downloaded again, so an interrupted crawl continues where it stopped. `--mirror` uses casinosecrets.lol, `--refresh` downloads everything again, `--limit N` takes only the first N company pages.
- `build` parses the cached pages into `web/public/data/graph.json` and adds the media mentions from `highlights/` (`--highlights DIR` for another folder; see [docs/adding-media-mentions.md](docs/adding-media-mentions.md)). Each company's documents and licensing process go into a separate file, `web/public/data/companies/<company id>.json`, which the viewer loads only when that company is opened. This keeps `graph.json` small (about 7.5 MB, under 1 MB compressed).

Tests use synthetic pages only: `python -m pytest`.

### 2. Run the viewer

Node 22.12+ and pnpm.

```sh
cd web
pnpm install
pnpm run layout              # precompute node positions into graph.json
pnpm run centroids           # only after updating world-atlas: country points for the map (src/map/centroids.json)
pnpm run dev                 # development server
pnpm test                    # unit tests (Vitest, web/tests/)
pnpm run build               # static site in web/dist/ (includes data/)
```

### Adding a language

Interface strings live in `web/src/locales/`, one file per language. Copy `en.ts` to `<code>.ts`, translate the values (keep `{n}`-style placeholders as they are) and add a line to `LANGUAGES` in `locales/index.ts`, keeping the list alphabetical by language code. TypeScript and `pnpm test` fail if a key or a placeholder is missing.

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` runs the tests, builds the site and deploys `web/dist` to GitHub Pages. It deploys the data committed in `web/public/data/` and does not crawl the source. To crawl again (for example if the source publishes new records), run the workflow by hand with the `crawl` option (`refresh` downloads every page again instead of reusing the cached ones). Enable Pages with "GitHub Actions" as the source in the repository settings.

## License

Code: [MIT](LICENSE). Flags: [flag-icons](https://github.com/lipis/flag-icons) (MIT). Map shapes: [world-atlas](https://github.com/topojson/world-atlas) / Natural Earth (ISC, public domain). The data belongs to its publishers; check the source site before republishing it.
