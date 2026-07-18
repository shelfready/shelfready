import { NextResponse } from "next/server";

/**
 * OpenAPI 3.1 document for the public REST API (#59). Hand-authored and
 * kept in lockstep with the /api/v1 routes — the spec test asserts every
 * route file has a matching path entry so drift fails CI.
 */

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

const AUTH_RESPONSES = {
  "401": errorResponse("Missing, malformed, invalid, or revoked API key"),
  "403": errorResponse("Key lacks the required scope"),
  "429": errorResponse("Rate limit exceeded (60 requests/minute per key)"),
};

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "ShelfReady API",
    version: "1.0.0",
    description:
      "REST API for ShelfReady — push catalogs, trigger syncs, read hosted feed URLs and agent-readiness audit results. Authenticate with an API key from Dashboard → Settings → API keys, sent as `Authorization: Bearer sr_…`. Keys carry `read` and/or `write` scopes and are limited to 60 requests/minute.",
    contact: { url: "https://useshelfready.com" },
  },
  servers: [{ url: "https://useshelfready.com" }],
  security: [{ apiKey: [] }],
  paths: {
    "/api/v1/products": {
      get: {
        operationId: "listProducts",
        summary: "List products",
        description:
          "The canonical catalog with variants, paginated. Requires the `read` scope.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "page_size",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "A page of products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" },
                    },
                    page: { type: "integer" },
                    page_size: { type: "integer" },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/products/{id}": {
      get: {
        operationId: "getProduct",
        summary: "Get one product",
        description: "One product with its variants. Requires the `read` scope.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "The product",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Product" },
                  },
                },
              },
            },
          },
          "404": errorResponse("Product not found"),
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/catalog": {
      post: {
        operationId: "pushCatalog",
        summary: "Push catalog items",
        description:
          "Push canonical-shaped items through the sync pipeline (validation → upsert). Items land on an auto-provisioned `api` source; rejected items are reported per-item and never touch the catalog. Requires the `write` scope.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    minItems: 1,
                    maxItems: 5000,
                    items: { $ref: "#/components/schemas/CatalogItem" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sync run result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        run_id: { type: "string", format: "uuid" },
                        source_id: { type: "string", format: "uuid" },
                        stats: { $ref: "#/components/schemas/SyncStats" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid body"),
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/syncs": {
      get: {
        operationId: "listSyncs",
        summary: "List sync runs",
        description: "The 50 most recent sync runs, newest first. Requires the `read` scope.",
        responses: {
          "200": {
            description: "Sync runs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Run" },
                    },
                  },
                },
              },
            },
          },
          ...AUTH_RESPONSES,
        },
      },
      post: {
        operationId: "triggerSync",
        summary: "Trigger a sync",
        description:
          "Run a pull sync for one source (WooCommerce, BigCommerce, Magento, feed URL) now. Requires the `write` scope.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["source_id"],
                properties: {
                  source_id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sync run result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        run_id: { type: "string", format: "uuid" },
                        stats: { $ref: "#/components/schemas/SyncStats" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid body"),
          "422": errorResponse("Sync failed (unknown source, connector error)"),
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/feeds": {
      get: {
        operationId: "listFeeds",
        summary: "List hosted feed URLs",
        description:
          "Tokenized URLs for every feed surface (ACP CSV/JSON, Google Merchant Center TSV, JSON-LD) plus the last render run. Requires the `read` scope.",
        responses: {
          "200": {
            description: "Feed URLs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        feeds: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              file: { type: "string" },
                              content_type: { type: "string" },
                              url: { type: "string", format: "uri" },
                            },
                          },
                        },
                        last_render: {
                          oneOf: [
                            { $ref: "#/components/schemas/Run" },
                            { type: "null" },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...AUTH_RESPONSES,
        },
      },
      post: {
        operationId: "renderFeeds",
        summary: "Re-render feeds",
        description: "Regenerate all feed artifacts now. Requires the `write` scope.",
        responses: {
          "200": {
            description: "Render run result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        run_id: { type: "string", format: "uuid" },
                        stats: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
          "422": errorResponse("Render failed"),
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/audit": {
      get: {
        operationId: "getAudit",
        summary: "Get audit results",
        description:
          "The latest audit run and the current findings snapshot. Requires the `read` scope.",
        responses: {
          "200": {
            description: "Audit state",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        last_run: {
                          oneOf: [
                            { $ref: "#/components/schemas/Run" },
                            { type: "null" },
                          ],
                        },
                        findings: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Finding" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/audit/runs": {
      post: {
        operationId: "runAudit",
        summary: "Run the audit",
        description:
          "Score the catalog for agent readiness now. Requires the `write` scope.",
        responses: {
          "200": {
            description: "Audit result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        run_id: { type: "string", format: "uuid" },
                        catalog_score: { type: "integer", minimum: 0, maximum: 100 },
                        grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
                      },
                    },
                  },
                },
              },
            },
          },
          "422": errorResponse("Audit failed"),
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/usage": {
      get: {
        operationId: "getUsage",
        summary: "API usage",
        description:
          "Daily request counts for your merchant over the trailing 30 days (per-endpoint breakdown per day) plus per-key 7-day/30-day totals. Counters increment on every successfully authenticated request and are retained for 90 days. Requires the `read` scope.",
        responses: {
          "200": {
            description: "Usage report",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        window_days: { type: "integer" },
                        days: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              day: { type: "string", format: "date" },
                              total: { type: "integer" },
                              endpoints: {
                                type: "object",
                                additionalProperties: { type: "integer" },
                              },
                            },
                          },
                        },
                        keys: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string", format: "uuid" },
                              name: { type: "string" },
                              prefix: { type: "string" },
                              revoked: { type: "boolean" },
                              requests_7d: { type: "integer" },
                              requests_30d: { type: "integer" },
                            },
                          },
                        },
                      },
                    },
                    rate_limit: {
                      type: "object",
                      properties: {
                        requests_per_minute: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          ...AUTH_RESPONSES,
        },
      },
    },
    "/api/v1/webhooks": {
      get: {
        operationId: "listWebhooks",
        summary: "List webhooks",
        description:
          "Registered webhook endpoints (signing secrets are never returned). Requires the `read` scope.",
        responses: {
          "200": {
            description: "Webhook endpoints",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Webhook" },
                    },
                  },
                },
              },
            },
          },
          ...AUTH_RESPONSES,
        },
      },
      post: {
        operationId: "createWebhook",
        summary: "Register a webhook",
        description:
          "Register an HTTPS endpoint for event deliveries. The response includes the signing `secret` **once** — verify each delivery's `X-ShelfReady-Signature` (`t=<unix ts>,v1=<hex HMAC-SHA256 of \"<ts>.<body>\">`). Failed deliveries retry after 1m/5m/30m/2h/12h, then stop. Requires the `write` scope.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url", "events"],
                properties: {
                  url: { type: "string", format: "uri" },
                  events: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "string",
                      enum: ["sync.completed", "feeds.rendered", "audit.completed"],
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "The webhook, with its signing secret (shown once)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/Webhook" },
                        {
                          type: "object",
                          properties: { secret: { type: "string" } },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid body"),
          ...AUTH_RESPONSES,
        },
      },
      delete: {
        operationId: "deleteWebhook",
        summary: "Delete a webhook",
        description: "Remove a webhook endpoint. Requires the `write` scope.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: { id: { type: "string", format: "uuid" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: { ok: { type: "boolean" } },
                    },
                  },
                },
              },
            },
          },
          "404": errorResponse("Webhook not found"),
          ...AUTH_RESPONSES,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "sr_<64 hex> — create in Dashboard → Settings → API keys",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              status: { type: "integer" },
              message: { type: "string" },
            },
          },
        },
      },
      CatalogItem: {
        type: "object",
        required: ["externalId", "title"],
        description:
          "Canonical product input. Prices are integer minor units with an ISO-4217 currency; availability is the ACP enum.",
        properties: {
          externalId: { type: "string", description: "Stable ID in your system (SKU)" },
          title: { type: "string" },
          description: { type: "string" },
          brand: { type: "string" },
          url: { type: "string", format: "uri" },
          imageUrl: { type: "string", format: "uri" },
          priceMinor: { type: "integer", description: "e.g. 2450 for €24.50" },
          currency: { type: "string", description: "ISO-4217, e.g. EUR" },
          availability: {
            type: "string",
            enum: ["in_stock", "out_of_stock", "pre_order", "backorder", "unknown"],
          },
          gtin: { type: "string" },
          mpn: { type: "string" },
          variants: {
            type: "array",
            items: { type: "object" },
            description: "Variant objects (externalId, sku, priceMinor, currency, availability, gtin, mpn, color, size)",
          },
        },
      },
      Product: {
        type: "object",
        description: "A canonical product row including its variants.",
        properties: {
          id: { type: "string", format: "uuid" },
          externalId: { type: "string" },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          brand: { type: ["string", "null"] },
          url: { type: ["string", "null"] },
          imageUrl: { type: ["string", "null"] },
          priceMinor: { type: ["integer", "null"] },
          currency: { type: ["string", "null"] },
          availability: { type: "string" },
          gtin: { type: ["string", "null"] },
          mpn: { type: ["string", "null"] },
          variants: { type: "array", items: { type: "object" } },
        },
      },
      SyncStats: {
        type: "object",
        properties: {
          seen: { type: "integer" },
          upserted: { type: "integer" },
          rejected: { type: "integer" },
          warnings: { type: "integer" },
          rejections: {
            type: "array",
            description: "Per-item validation issues for rejected items (capped)",
            items: { type: "object" },
          },
        },
      },
      Run: {
        type: "object",
        properties: {
          run_id: { type: "string", format: "uuid" },
          source_id: { type: ["string", "null"], format: "uuid" },
          status: { type: "string", enum: ["running", "succeeded", "failed"] },
          stats: { type: "object" },
          started_at: { type: "string", format: "date-time" },
          finished_at: { type: ["string", "null"], format: "date-time" },
        },
      },
      Webhook: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" } },
          enabled: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Finding: {
        type: "object",
        description: "One audit finding, the audit_findings shape.",
        properties: {
          product_id: { type: ["string", "null"], format: "uuid" },
          variant_id: { type: ["string", "null"], format: "uuid" },
          code: { type: "string", description: "e.g. gtin_invalid_checksum" },
          severity: { type: "string", enum: ["error", "warning", "info"] },
          field: { type: ["string", "null"] },
          message: { type: "string" },
        },
      },
    },
  },
} as const;

/** GET /api/v1/openapi.json — public, no auth (it's documentation). */
export async function GET() {
  return NextResponse.json(OPENAPI_DOCUMENT, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
