# GPU-AG · VRAMWATCH

A market board for gaming and AI silicon. Live street prices pulled from real
retailer and reseller search pages, tracked over time, with a chart and direct
buy links for every part — RTX 5090 to H200.

## How it works

- **Live sources (scraped server-side, verified working):** Newegg,
  Central Computer, Wiredzone (Supermicro-authorized — carries H100/A100/L40S),
  and PC Server & Parts (refurb datacenter/workstation specialist — the
  secondary-market signal for V100/A100-class cards).
- **Official APIs (free keys, optional):** eBay
  [Browse API](https://developer.ebay.com) for the used market (A100s, 4090s,
  SXM modules, gray-market parts) and the
  [Best Buy Products API](https://developer.bestbuy.com) for consumer cards.
- **Link-only sources:** Micro Center, B&H, Amazon bot-block server requests,
  so they get deep search links instead of fetched prices. (Also probed and
  blocked: Walmart, CDW, Insight, Connection, Server Supply, Provantage,
  IT Creations, Server Orbit, antonline; SabrePC renders client-side.)
- Every refresh records the day's lowest matching listing per (GPU, source)
  into `data/history.json` — **charts grow real history as the tracker runs**.
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

## Architecture

```
lib/gpus.ts          tracked parts: query, match/exclude regex, price band
lib/sources.ts       source registry (mode: scrape | api | link, chart color)
lib/adapters/*.ts    one fetcher per source — the seam to add more
lib/refresh.ts       sweep: fetch → filter → snapshot
lib/store.ts         data/*.json persistence (swap for a DB here)
lib/quotes.ts        best price, 24h/7d/30d deltas, spark series
app/                 dashboard, /gpu/[slug], /api/refresh
```

To add a source: write an adapter returning `{title, price, url}[]`, register
it in `lib/adapters/index.ts` and `lib/sources.ts`, and add its id to the
parts that carry it.
