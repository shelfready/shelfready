import type { Metadata } from "next"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Endpoint, ParamTable } from "@/components/docs/endpoint"

export const metadata: Metadata = {
  title: "API · Products",
  description: "List and retrieve canonical products in your catalog.",
}

const toc = [
  { id: "list", title: "List products" },
  { id: "retrieve", title: "Retrieve a product" },
  { id: "object", title: "The product object" },
] as const

export default function ApiProductsPage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Products"
      description="Read your ingested canonical catalog. Products are read-only through this API; they change via syncs, catalog pushes, and approved enrichment."
      toc={[...toc]}
      prev={{ title: "Authentication", href: "/docs/api/authentication" }}
      next={{ title: "Catalog", href: "/docs/api/catalog" }}
    >
      <h2 id="list">List products</h2>
      <Endpoint method="GET" path="/api/v1/products" />
      <p>
        The canonical catalog with variants, paginated. Requires the <code>read</code> scope.
      </p>
      <ParamTable
        params={[
          { name: "page", type: "integer", description: "Page number, starting at 1. Defaults to 1." },
          { name: "page_size", type: "integer", description: "Page size, 1–100. Defaults to 50." },
        ]}
      />
      <CodeBlock
        code={`curl "https://useshelfready.com/api/v1/products?page=1&page_size=2" \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "data": [
    {
      "id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
      "externalId": "SKU-1",
      "title": "Ridgeline 2P Tent",
      "description": "Storm-tested and light…",
      "brand": "Alpine Outdoor",
      "url": "https://yourstore.com/products/ridgeline-2p",
      "imageUrl": "https://yourstore.com/images/ridgeline-2p.jpg",
      "priceMinor": 29900,
      "currency": "EUR",
      "availability": "in_stock",
      "gtin": "4006381333931",
      "mpn": null,
      "variants": []
    }
  ],
  "page": 1,
  "page_size": 2,
  "total": 1284
}`}
      />

      <h2 id="retrieve">Retrieve a product</h2>
      <Endpoint method="GET" path="/api/v1/products/{id}" />
      <p>
        One product with its variants, by its ShelfReady UUID. Requires the <code>read</code> scope.
        Returns <code>404</code> if the product does not exist in your workspace.
      </p>
      <CodeBlock
        code={`curl https://useshelfready.com/api/v1/products/0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0 \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />

      <h2 id="object">The product object</h2>
      <ParamTable
        params={[
          { name: "id", type: "uuid", description: "Unique ShelfReady product identifier." },
          { name: "externalId", type: "string", description: "Your stable ID for the product (SKU)." },
          { name: "title", type: "string", description: "Product title (150-character ACP cap)." },
          { name: "description", type: "string | null", description: "Plain-text description." },
          { name: "brand", type: "string | null", description: "Brand name." },
          { name: "url", type: "string | null", description: "HTTPS product page URL." },
          { name: "imageUrl", type: "string | null", description: "HTTPS primary image URL." },
          { name: "priceMinor", type: "integer | null", description: "Price in integer minor units (2450 = €24.50)." },
          { name: "currency", type: "string | null", description: "ISO-4217 currency code." },
          {
            name: "availability",
            type: "string",
            description: "ACP enum: in_stock, out_of_stock, pre_order, backorder, unknown.",
          },
          { name: "gtin", type: "string | null", description: "Global trade item number, if present." },
          { name: "mpn", type: "string | null", description: "Manufacturer part number, if present." },
          { name: "variants", type: "object[]", description: "Variant rows (externalId, sku, priceMinor, currency, availability, gtin, mpn, color, size)." },
        ]}
      />
    </DocPage>
  )
}
