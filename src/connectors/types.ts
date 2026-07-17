/**
 * Connector plugin contract (ADR-0003). Implementations yield raw,
 * canonical-shaped product objects; the sync pipeline owns validation
 * (src/model/product.ts) — a connector never decides what's valid.
 */
export interface ConnectorContext {
  /** Source config (column mappings, store URL, …) — sources.config. */
  config: unknown;
  /** Decrypted credentials, or null for credential-less sources (CSV). */
  credentials: unknown;
}

export interface Connector {
  /** Matches sources.type (text on purpose — no migration per plugin). */
  type: string;
  capabilities: {
    /** Can fetch on demand (false for push-style sources like CSV upload). */
    pull: boolean;
    /** Supports incremental inventory/price watching (M5). */
    watchInventory: boolean;
  };
  /** Streams raw product objects to be validated + upserted by runSync. */
  fetchProducts(ctx: ConnectorContext): AsyncIterable<unknown>;
}
