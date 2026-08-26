import { CATEGORY_LABEL } from "./gpus";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";
import { sourceById } from "./sources";
import type { Gpu, GpuQuote, Listing } from "./types";

/**
 * Structured data builders. Everything Google reads about this site as data
 * rather than prose is assembled here so the shapes stay consistent and
 * every URL is absolute.
 */

type Json = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export function organizationSchema(): Json {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon.svg"),
      width: 512,
      height: 512,
    },
    description: SITE_DESCRIPTION,
    sameAs: ["https://github.com/kyegomez/GPU-AG"],
  };
}

export function websiteSchema(): Json {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "en-US",
    publisher: { "@id": ORG_ID },
  };
}

export function breadcrumbSchema(
  items: { name: string; path: string }[]
): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** The board itself, as a ranked list of the parts it tracks. */
export function boardItemListSchema(
  entries: { gpu: Gpu; quote: GpuQuote }[]
): Json {
  return {
    "@type": "ItemList",
    name: `GPUs tracked by ${SITE_NAME}`,
    description:
      "Every gaming, workstation and datacenter GPU tracked on the board, with its current best street price.",
    numberOfItems: entries.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: entries.map(({ gpu, quote }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/gpu/${gpu.slug}`),
      name:
        quote.best !== null
          ? `${gpu.name} — $${quote.best.toLocaleString("en-US")}`
          : gpu.name,
    })),
  };
}

export function faqSchema(items: { q: string; a: string }[]): Json {
  return {
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** One GPU as a Product with live offers from every source that quoted it. */
export function gpuProductSchema(
  gpu: Gpu,
  quote: GpuQuote,
  book: Record<string, Listing[]>,
  description: string
): Json {
  const offers = gpu.sources.flatMap((sourceId) => {
    const source = sourceById(sourceId);
    return (book[sourceId] ?? []).slice(0, 3).map((listing) => ({
      "@type": "Offer",
      url: listing.url,
      name: listing.title,
      price: listing.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      itemCondition: source.usedSource
        ? "https://schema.org/UsedCondition"
        : "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: source.name },
    }));
  });

  const prices = offers.map((o) => o.price);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : quote.best;
  const highPrice = prices.length > 0 ? Math.max(...prices) : quote.best;

  const schema: Json = {
    "@type": "Product",
    "@id": absoluteUrl(`/gpu/${gpu.slug}#product`),
    name: gpu.name,
    description,
    url: absoluteUrl(`/gpu/${gpu.slug}`),
    image: [absoluteUrl(`/gpu/${gpu.slug}/opengraph-image`)],
    sku: gpu.slug,
    category: `${CATEGORY_LABEL[gpu.category]} GPU`,
    brand: { "@type": "Brand", name: gpu.vendor },
    manufacturer: { "@type": "Organization", name: gpu.vendor },
    additionalProperty: [
      { "@type": "PropertyValue", name: "VRAM", value: gpu.vram },
      { "@type": "PropertyValue", name: "Architecture", value: gpu.arch },
      {
        "@type": "PropertyValue",
        name: "Segment",
        value: CATEGORY_LABEL[gpu.category],
      },
      ...(gpu.msrp !== null
        ? [
            {
              "@type": "PropertyValue",
              name: "MSRP",
              value: `$${gpu.msrp.toLocaleString("en-US")}`,
            },
          ]
        : []),
    ],
  };

  if (lowPrice !== null && highPrice !== null) {
    schema.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice,
      highPrice,
      offerCount: Math.max(offers.length, 1),
      ...(offers.length > 0 ? { offers } : {}),
    };
  }

  return schema;
}

/** Wrap one or more nodes in a single @graph document. */
export const jsonLdGraph = (...nodes: Json[]): Json => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});
