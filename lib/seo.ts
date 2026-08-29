import { CATEGORY_LABEL } from "./gpus";
import { providerById } from "./rentals/providers";
import type { RentalQuote, RentModel } from "./rentals/types";
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

/** The rental board, as a ranked list of the GPUs it prices by the hour. */
export function rentBoardItemListSchema(
  entries: { model: RentModel; quote: RentalQuote }[]
): Json {
  return {
    "@type": "ItemList",
    name: `GPUs rentable by the hour, tracked by ${SITE_NAME}`,
    description:
      "Every GPU whose hourly cloud rental rate is tracked on the board, with its current lowest price per GPU-hour.",
    numberOfItems: entries.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: entries.map(({ model, quote }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/rent/${model.slug}`),
      name:
        quote.best !== null
          ? `${model.name} — $${quote.best.toFixed(3)}/GPU-hour`
          : model.name,
    })),
  };
}

/**
 * One rentable GPU as a Service with live offers from every provider quoting
 * it. Renting is a service, not a product transfer, so the offers carry a
 * unitCode of HUR (hours) rather than a one-off price — which is what tells a
 * crawler that "$2.69" means per hour and not outright.
 */
export function rentalServiceSchema(
  model: RentModel,
  quote: RentalQuote,
  description: string
): Json {
  const offers = quote.rates
    .filter((r) => r.offers.length > 0)
    .flatMap((r) =>
      r.offers.slice(0, 3).map((o) => ({
        "@type": "Offer",
        name: `${model.name} × ${o.gpuCount} — ${o.instance}`,
        url: o.url ?? providerById(o.providerId).rentUrl,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: Number(o.perGpuHour.toFixed(4)),
          priceCurrency: "USD",
          unitCode: "HUR",
          referenceQuantity: {
            "@type": "QuantitativeValue",
            value: 1,
            unitCode: "HUR",
          },
        },
        availability:
          o.available === false
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: providerById(o.providerId).name,
        },
      }))
    );

  const schema: Json = {
    "@type": "Service",
    "@id": absoluteUrl(`/rent/${model.slug}#service`),
    name: `${model.name} cloud rental`,
    serviceType: "GPU cloud rental",
    description,
    url: absoluteUrl(`/rent/${model.slug}`),
    category: "Cloud computing",
    provider: { "@id": ORG_ID },
    additionalProperty: [
      { "@type": "PropertyValue", name: "GPU", value: model.name },
      { "@type": "PropertyValue", name: "VRAM", value: model.vram },
      { "@type": "PropertyValue", name: "Architecture", value: model.arch },
    ],
  };

  if (quote.best !== null && quote.spreadHigh !== null) {
    schema.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Number(quote.best.toFixed(4)),
      highPrice: Number(quote.spreadHigh.toFixed(4)),
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
