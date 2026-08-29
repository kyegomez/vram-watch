# GPU-AG · VRAMWATCH

A market board for gaming and AI silicon, on both sides of the market: what a
GPU costs to **buy**, pulled live from real retailer and reseller search pages,
and what the same silicon costs to **rent** by the hour across twenty-three
cloud providers. Both tracked over time, with charts, direct links, and a
rent-vs-buy breakeven for every part tracked on both sides.

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

## The rental market (`/rent`)

The same board, priced by the hour. Five live feeds, no keys, no blocked
sources:

- **Shadeform's public catalog** — live rates and per-region availability for
  19 GPU clouds (Lambda, Crusoe, Nebius, Voltage Park, Hyperstack, Denvr,
  Paperspace, DigitalOcean, Scaleway, Vultr, Latitude, Massed Compute and
  partner clouds). Rates are attributed to the cloud that charges them.
  *Its `hourly_price` is in cents.*
- **RunPod** — public GraphQL `gpuTypes`, on-demand and spot, per GPU.
- **Vast.ai** — public bundles endpoint, queried per model, `rentable` only.
- **AWS** — the public JSON feed behind the pricing calculator (us-east-1 Linux
  on-demand).
- **Azure** — the Retail Prices API (eastus, consumption; Windows, Spot and
  Low Priority meters filtered out).

Every offer is stored twice over: `perGpuHour` (node price ÷ GPU count), which
is the only number that compares across a single RunPod GPU and an 8-way HGX
box, and `nodeHour`, which is what you are actually billed and the only honest
way to price a cluster. Rates accumulate into `data/rentals-history.json` in the
same `{lo, hi, n, at}` shape as retail prices.

The one static thing on the rental side: how many GPUs each AWS instance type
and Azure VM SKU carries, since neither publishes accelerator counts in its
price feed. Shapes whose count isn't unambiguous are **skipped rather than
guessed at**.

```sh
pnpm rent              # sweep, then every model's low, spread and 8x node price
pnpm rent raw          # per-adapter fetch, listing every rate-band rejection
pnpm rent h100-sxm     # every live offer for one model, cheapest first
```

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
`SWEEP_INTERVAL_MS` for retail and `RENTAL_SWEEP_INTERVAL_MS` for rentals, both
floored at 60s to stay polite to the sources). The two markets sweep
independently, so a slow retail source never delays the rental board. No cron
required; `pnpm refresh` and `pnpm rent` still exist for warming data ahead of
a deploy, and `POST /api/refresh?market=retail|rentals` forces one side.

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
