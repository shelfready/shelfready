import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ACP availability vocabulary (ROADMAP §ACP) — fixed by the spec.
export const availabilityEnum = pgEnum("availability", [
  "in_stock",
  "out_of_stock",
  "pre_order",
  "backorder",
  "unknown",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
]);

export const feedRunStatusEnum = pgEnum("feed_run_status", [
  "running",
  "succeeded",
  "failed",
]);

export const findingSeverityEnum = pgEnum("finding_severity", [
  "error",
  "warning",
  "info",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// Tenant root. Every catalog-owning table hangs off merchants.id.
export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  // Entitlement flags driven by Stripe webhooks (M0 billing scaffold).
  entitlements: jsonb("entitlements").notNull().default({}),
  ...timestamps,
});

// Kept Auth.js-adapter-compatible; accounts/sessions tables land with #3.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  ...timestamps,
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("memberships_user_merchant_uq").on(t.userId, t.merchantId),
    index("memberships_merchant_idx").on(t.merchantId),
  ],
);

// A connected catalog source (csv upload, woocommerce, …). `type` is text,
// not an enum: adding a connector plugin must not require a migration
// (ADR-0003).
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").notNull().default({}),
    // AES-GCM ciphertext, never plaintext.
    // TODO(#9): encryption helper lands with the connector interface;
    // nothing writes this column until then.
    credentialsEnc: text("credentials_enc"),
    enabled: boolean("enabled").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("sources_merchant_idx").on(t.merchantId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    // Stable per-source identity; feeds derive item_id from this.
    externalId: text("external_id").notNull(),
    title: text("title"),
    description: text("description"),
    brand: text("brand"),
    url: text("url"),
    imageUrl: text("image_url"),
    // Integer minor units + ISO-4217, rendered to decimals per surface.
    priceMinor: integer("price_minor"),
    currency: text("currency"),
    availability: availabilityEnum("availability").notNull().default("unknown"),
    gtin: text("gtin"),
    mpn: text("mpn"),
    // Escape hatch until the canonical model ADR (M1) hardens fields.
    attributes: jsonb("attributes").notNull().default({}),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_source_external_uq").on(t.sourceId, t.externalId),
    index("products_merchant_idx").on(t.merchantId),
  ],
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    sku: text("sku"),
    title: text("title"),
    priceMinor: integer("price_minor"),
    currency: text("currency"),
    availability: availabilityEnum("availability").notNull().default("unknown"),
    gtin: text("gtin"),
    mpn: text("mpn"),
    color: text("color"),
    size: text("size"),
    sizeSystem: text("size_system"),
    gender: text("gender"),
    attributes: jsonb("attributes").notNull().default({}),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("variants_product_external_uq").on(t.productId, t.externalId),
    index("variants_merchant_idx").on(t.merchantId),
  ],
);

// One row per sync (connector → canonical) or render (canonical → artifact).
export const feedRuns = pgTable(
  "feed_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(), // 'sync' | 'render'
    surface: text("surface"), // render only: 'acp' | 'gmc' | 'jsonld'
    status: feedRunStatusEnum("status").notNull().default("running"),
    stats: jsonb("stats").notNull().default({}),
    artifactKeys: jsonb("artifact_keys").notNull().default([]),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("feed_runs_merchant_idx").on(t.merchantId)],
);

export const auditFindings = pgTable(
  "audit_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    variantId: uuid("variant_id").references(() => variants.id, {
      onDelete: "cascade",
    }),
    code: text("code").notNull(), // e.g. 'gtin_invalid_checksum'
    severity: findingSeverityEnum("severity").notNull(),
    field: text("field"),
    message: text("message").notNull(),
    data: jsonb("data").notNull().default({}),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("audit_findings_merchant_idx").on(t.merchantId),
    index("audit_findings_merchant_code_idx").on(t.merchantId, t.code),
  ],
);
