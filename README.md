# GPU-AG · VRAMWATCH

A market board for gaming and AI silicon. Live street prices pulled from real
retailer and reseller search pages, tracked over time, with a chart and direct
buy links for every part — RTX 5090 to H200.

## How it works

For the full walkthrough — the sweep, the filter gate, the store, and how
the crawler surface is generated — see **[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)**.

- **Live sources (fetched server-side, verified working):** Newegg,
  Central Computer, Wiredzone (Supermicro-authorized — carries H100/A100/L40S),
  PC Server & Parts, TechMikeNY and Server Part Deals (refurb specialists, read
  through Shopify's structured product JSON — the secondary-market signal for
  V100/A6000-class cards), and the **Supermicro store**, the manufacturer
  selling direct, which is what lets the board price whole GPU systems.
- **Official APIs (free keys, optional):** eBay
  [Browse API](https://developer.ebay.com) for the used market (A100s, 4090s,
  SXM modules, gray-market parts) and the
  [Best Buy Products API](https://developer.bestbuy.com) for consumer cards.
- **Link-only sources:** Micro Center, B&H and Amazon bot-block server
  requests, so they get deep search links instead of fetched prices. Micro
  Center 403s a server on every path including `robots.txt`; the only ways
  around that are UA spoofing or proxy evasion, so it stays link-only. (Also probed and
  blocked: Walmart, CDW, Insight, Connection, Server Supply, Provantage,
  IT Creations, Server Orbit, antonline; SabrePC renders client-side.)
- Every refresh accumulates into `data/history.json` as `{lo, hi, n, at}` per
  (GPU, source, day), so `lo` is the day's **true** low across every sweep —
  **charts grow real history as the tracker runs**.
  Matched listings with URLs land in `data/listings.json` and power the
  "where to buy" cards.

Listings are filtered per part by title regex (`match` / `exclude`) and a
price sanity band (see `lib/gpus.ts`) so waterblocks, server barebones and
GH200 superchips don't pollute the series. Retail series track new-condition
prices; used/refurb belongs to eBay (EOL parts like the RTX 4090 are exempt
via `usedOk`).

## Run it

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

## Production

```sh
pnpm build && pnpm start
```

The site keeps itself fresh: the UI polls `/api/tick` every 10 seconds, and
the server re-sweeps all sources in the background whenever the stored data
is older than the sweep interval (default 10 minutes — tune with
`SWEEP_INTERVAL_MS`, floored at 60s to stay polite to the sources). No cron
required; `pnpm refresh` still exists for warming data ahead of a deploy.

Note: the store is process-local JSON (`data/*.json`) — run a single
instance, or swap `lib/store.ts` for a shared database before scaling out.

### API keys (optional but recommended)

```sh
# .env.local
EBAY_CLIENT_ID=...       # developer.ebay.com
EBAY_CLIENT_SECRET=...
BESTBUY_API_KEY=...      # developer.bestbuy.com
```

### Canonical origin

Every canonical tag, `sitemap.xml` entry and absolute OG image URL is built
from one value:

```sh
NEXT_PUBLIC_SITE_URL=https://vram.swarms.world
```

It defaults to `https://vram.swarms.world` (and picks up
`VERCEL_PROJECT_PRODUCTION_URL` on Vercel), so set it only when deploying
somewhere else — a wrong origin here silently poisons canonicals.

## SEO

Everything a crawler consumes is generated, never hand-maintained:

- `lib/site.ts` — canonical origin, brand, boilerplate copy, keyword set.
- `lib/seo.ts` — JSON-LD builders. Home ships `CollectionPage` + `ItemList`
  (all tracked parts, with live prices) + `FAQPage`; every GPU page ships a
  `Product` with an `AggregateOffer` built from that part's real listings
  (per-seller `Offer`s, condition tagged from the source) plus a
  `BreadcrumbList`. `Organization` + `WebSite` sit in the root layout.
- Per-GPU `generateMetadata` puts the live price in the title and meta
  description (`GeForce RTX 5090 Price — $4,400 (Live, Central Computer)`),
  so the SERP snippet is current rather than boilerplate.
- `app/opengraph-image.tsx` and `app/gpu/[slug]/opengraph-image.tsx` render
  1200×630 social cards with `next/og`; the per-GPU card shows the current
  best price and 24h move and revalidates every 10 minutes.
- `app/icon.svg` (the green box), `app/apple-icon.tsx`, `app/manifest.ts`,
  `app/robots.ts`, `app/sitemap.ts` (hourly, all 23 parts), `app/not-found.tsx`.
- The FAQ copy on the home page and its `FAQPage` markup are rendered from
  the same `FAQ` array — Google requires the two to match, so they can't drift.

## Architecture

```
lib/gpus.ts          tracked parts: query, match/exclude regex, price band
lib/adapters/shopify.ts  one factory covering any Shopify storefront
lib/sources.ts       source registry (mode: scrape | api | link, chart color)
lib/adapters/*.ts    one fetcher per source — the seam to add more
lib/refresh.ts       sweep: fetch → filter → snapshot
lib/store.ts         data/*.json persistence (swap for a DB here)
lib/quotes.ts        best price, 24h/7d/30d deltas, spark series
lib/site.ts          canonical origin + brand/boilerplate copy
lib/seo.ts           JSON-LD builders (Product, ItemList, FAQ, breadcrumbs)
app/                 dashboard, /gpu/[slug], /sources, /api/refresh
app/*-image.tsx      generated OG cards, favicon, apple icon
app/{robots,sitemap,manifest}.ts   crawler surface
```

To add a source: write an adapter returning `{title, price, url}[]`, register
it in `lib/adapters/index.ts` and `lib/sources.ts`, and add its id to the
parts that carry it.
