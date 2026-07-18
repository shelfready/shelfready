/**
 * Internal-link crawler (issue #99): BFS every internal href reachable from
 * the public seed routes and fail on any non-OK response. Catches the class
 * of bug the v0 export shipped with (footer links to pages that don't exist).
 *
 *   node scripts/check-links.mjs [baseUrl]   (default http://localhost:3000)
 *
 * Auth-gated routes (/dashboard…) redirect to /login — redirects are
 * followed by fetch, so they pass as long as the target renders.
 */
const base = process.argv[2] ?? "http://localhost:3000";

const SEEDS = ["/", "/docs", "/status", "/login", "/register", "/reset"];
// External hosts and non-page schemes are out of scope.
const SKIP = /^(https?:\/\/(?!localhost)|mailto:|tel:|#)/;
// Binary/data endpoints where a 200 is all we assert (no HTML to crawl).
const NO_PARSE = /\.(json|xml|csv|tsv|txt|png|jpg|svg|ico|webmanifest)$|^\/api\//;

const seen = new Set();
const queue = [...SEEDS];
const failures = [];
let checked = 0;

function normalize(href, from) {
  try {
    const url = new URL(href, new URL(from, base));
    if (url.origin !== new URL(base).origin) return null;
    return url.pathname + (url.search ?? "");
  } catch {
    return null;
  }
}

while (queue.length > 0) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);

  let res;
  try {
    res = await fetch(base + path, { redirect: "follow" });
  } catch (e) {
    failures.push(`${path} — fetch failed: ${e.message}`);
    continue;
  }
  checked++;
  if (!res.ok) {
    failures.push(`${path} — HTTP ${res.status}`);
    continue;
  }
  if (NO_PARSE.test(path)) continue;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) continue;

  const html = await res.text();
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (SKIP.test(href)) continue;
    const next = normalize(href, path);
    if (next && !seen.has(next)) queue.push(next);
  }
}

console.log(`checked ${checked} internal URLs`);
if (failures.length > 0) {
  console.error(`\n${failures.length} broken link(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("all internal links OK");
