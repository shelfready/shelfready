import { registerConnector } from "./registry";

/** Push-only source backing POST /api/v1/catalog (#58) — like CSV upload. */
registerConnector({
  type: "api",
  capabilities: { pull: false, watchInventory: false },
  async *fetchProducts() {
    throw new Error("api sources are push-only — POST /api/v1/catalog");
  },
});
