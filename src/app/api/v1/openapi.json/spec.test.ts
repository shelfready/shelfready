import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OPENAPI_DOCUMENT } from "./route";

/** Every /api/v1 route directory must have a matching spec path — drift fails CI. */
function routePaths(dir: string, prefix: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const segment = entry.startsWith("[") ? `{${entry.slice(1, -1)}}` : entry;
    const sub = `${prefix}/${segment}`;
    const hasRoute = readdirSync(full).some((f) => f.startsWith("route."));
    if (hasRoute && segment !== "openapi.json") paths.push(sub);
    paths.push(...routePaths(full, sub));
  }
  return paths;
}

describe("openapi spec", () => {
  it("is a structurally valid 3.1 document", () => {
    expect(OPENAPI_DOCUMENT.openapi).toBe("3.1.0");
    expect(OPENAPI_DOCUMENT.info.title).toBeTruthy();
    expect(Object.keys(OPENAPI_DOCUMENT.paths).length).toBeGreaterThan(0);
    expect(OPENAPI_DOCUMENT.components.securitySchemes.apiKey.scheme).toBe("bearer");
  });

  it("documents every /api/v1 route (no drift)", () => {
    const dir = join(__dirname, "..");
    const actual = routePaths(dir, "/api/v1").sort();
    const documented = Object.keys(OPENAPI_DOCUMENT.paths).sort();
    expect(documented).toEqual(actual);
  });

  it("every spec path is covered by a docs page under /docs/api", () => {
    const docsApiDir = join(__dirname, "../../../docs/api");
    const pages: string[] = [];
    const collect = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) collect(full);
        else if (entry.startsWith("page.")) pages.push(readFileSync(full, "utf8"));
      }
    };
    collect(docsApiDir);
    const allDocs = pages.join("\n");
    for (const path of Object.keys(OPENAPI_DOCUMENT.paths)) {
      expect(allDocs, `no docs page under src/app/docs/api mentions ${path}`).toContain(path);
    }
  });

  it("every operation documents auth failures and references resolvable schemas", () => {
    const schemaNames = Object.keys(OPENAPI_DOCUMENT.components.schemas);
    const json = JSON.stringify(OPENAPI_DOCUMENT);
    for (const ref of json.matchAll(/"#\/components\/schemas\/(\w+)"/g)) {
      expect(schemaNames).toContain(ref[1]);
    }
    for (const [path, methods] of Object.entries(OPENAPI_DOCUMENT.paths)) {
      for (const [method, op] of Object.entries(
        methods as Record<string, { responses: Record<string, unknown> }>,
      )) {
        expect(op.responses["200"], `${method} ${path} 200`).toBeDefined();
        expect(op.responses["401"], `${method} ${path} 401`).toBeDefined();
        expect(op.responses["429"], `${method} ${path} 429`).toBeDefined();
      }
    }
  });
});
