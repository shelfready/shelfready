export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingTime: string;
  author: { name: string; initials: string; role: string };
  content: { heading: string; paragraphs: string[] }[];
};

// Real articles, honest byline — no invented humans.
const shelfready = { name: "ShelfReady", initials: "SR", role: "The team" };

export const blogPosts: BlogPost[] = [
  {
    slug: "why-ai-shopping-agents-cant-see-your-store",
    title: "Why AI shopping agents can't see your store",
    excerpt:
      "Agents don't browse like people. They read structured data. Here's what they look for — and why most independent catalogs come up empty.",
    category: "Discovery",
    date: "2026-07-18",
    readingTime: "6 min read",
    author: shelfready,
    content: [
      {
        heading: "The shift from browsing to querying",
        paragraphs: [
          "For twenty years, getting found online meant ranking in a list of blue links a human would scan. That model is quietly being replaced. When a shopper asks an assistant to 'find a lightweight two-person tent under $300', there is no page of results — there is a single recommendation, assembled from structured product data.",
          "If your catalog doesn't expose that data in a machine-readable form, the agent simply has nothing to work with. You are not ranked low; you are invisible.",
        ],
      },
      {
        heading: "What agents actually read",
        paragraphs: [
          "Shopping agents rely on a small set of well-defined signals: a stable product identifier like a GTIN, an availability state, a price with an explicit currency, and rich attributes such as brand, material, and size. Each of these maps to a published specification — OpenAI's Agentic Commerce Protocol, Google's Merchant Center schema, and schema.org Product markup.",
          "The gap for most independent stores isn't quality — it's completeness. A beautiful product page with no GTIN and no structured availability is a dead end for an agent.",
        ],
      },
      {
        heading: "Closing the gap",
        paragraphs: [
          "The fix is unglamorous but effective: audit every product against the specs, fill the missing attributes, and publish clean feeds in the formats agents ingest. Then keep doing it, because catalogs drift the moment you add a new SKU or change a price.",
          "That loop — audit, fix, publish, monitor — is exactly what ShelfReady automates. You can see where your store stands in thirty seconds with the free scan on our homepage; it reads your real product pages, the same way an agent would.",
        ],
      },
    ],
  },
  {
    slug: "anatomy-of-an-acp-feed",
    title: "Anatomy of an OpenAI ACP product feed",
    excerpt:
      "A practical walkthrough of the Agentic Commerce Protocol feed format: required fields, the availability enum, and the mistakes that get catalogs rejected.",
    category: "Specs",
    date: "2026-07-18",
    readingTime: "8 min read",
    author: shelfready,
    content: [
      {
        heading: "What ACP is",
        paragraphs: [
          "The Agentic Commerce Protocol is OpenAI's specification for making product catalogs consumable by ChatGPT's shopping features. A merchant publishes a product feed in a defined shape; the surface ingests it and can then present those products, with accurate prices and availability, inside conversations.",
          "The spec is precise about the things merchants are most often sloppy about: identifiers, prices, and availability. That precision is good news — it means compliance is checkable by a machine, before you submit anything.",
        ],
      },
      {
        heading: "The fields that matter most",
        paragraphs: [
          "Every item needs a stable ID, a title, a link to a live product page, and an image. Prices must carry an explicit ISO-4217 currency — '19.99' is not a price, '19.99 EUR' is. Availability is a closed enum (in stock, out of stock, pre-order, backorder); free-text like 'ships soon' doesn't parse.",
          "Identifiers do the heavy lifting for matching: a valid GTIN (with a correct check digit — surprisingly often wrong) lets a surface connect your listing to a known product. Where no GTIN exists, brand plus MPN is the fallback.",
        ],
      },
      {
        heading: "Where catalogs fail",
        paragraphs: [
          "In the catalogs we audit, the same problems repeat: missing or checksum-invalid GTINs, prices without currencies, availability copy that doesn't map to the enum, thin one-line descriptions, and variant products flattened in ways that lose color and size options.",
          "None of these are hard to fix individually. The hard part is finding all of them across a few thousand SKUs and keeping them fixed as the catalog changes — which is why we built the audit as a continuous check rather than a one-time report.",
        ],
      },
      {
        heading: "One catalog, three feeds",
        paragraphs: [
          "The pleasant surprise: the work overlaps almost entirely with Google Merchant Center and schema.org JSON-LD. Clean canonical product data renders into all three formats. Fix the catalog once, and every surface that reads structured data benefits.",
          "One honest caveat we always attach: publishing a compliant feed makes you eligible and readable — surface operators still decide who they list. Anyone promising guaranteed placement in ChatGPT is selling something the protocol doesn't offer.",
        ],
      },
    ],
  },
  {
    slug: "gtin-hygiene-for-independent-stores",
    title: "GTIN hygiene: the least glamorous, highest-leverage fix",
    excerpt:
      "Bad barcodes quietly break product matching everywhere. How to find invalid GTINs in your catalog and what to do when a product genuinely has none.",
    category: "Catalog quality",
    date: "2026-07-18",
    readingTime: "5 min read",
    author: shelfready,
    content: [
      {
        heading: "Why GTINs matter to agents",
        paragraphs: [
          "A GTIN (the number under the barcode — UPC, EAN, ISBN) is the closest thing commerce has to a universal product key. Surfaces use it to match your listing against known products, aggregate reviews, and trust your data. A missing or invalid GTIN downgrades your product from 'a known thing' to 'a string of text'.",
        ],
      },
      {
        heading: "The failure modes we see",
        paragraphs: [
          "Invalid check digits from typos or spreadsheet mangling (Excel loves turning barcodes into scientific notation), the same GTIN pasted across every variant, placeholder values like 0000000000000, and SKUs entered where GTINs belong. All of these are machine-detectable — a GTIN's last digit is a checksum, so validation is exact, not heuristic.",
        ],
      },
      {
        heading: "When you genuinely have no GTIN",
        paragraphs: [
          "Handmade, custom, and own-brand products often have no barcode, and that's fine: the specs allow identifier-less products if you say so explicitly and provide brand plus MPN where applicable. What hurts is inventing values — wrong data is worse than absent data, because it breaks matching silently.",
          "ShelfReady's audit validates every GTIN's checksum, flags duplicates and placeholders, and tells you which products can legitimately ship without one.",
        ],
      },
    ],
  },
];

export function getPost(slug: string) {
  return blogPosts.find((p) => p.slug === slug);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
