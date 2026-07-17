import { getDb } from "../src/db";
import { seedDemo } from "../src/db/seed-data";

// tsx runs these as CJS (no "type": "module") — no top-level await.
async function main() {
  const db = getDb();
  const { merchant, products } = await seedDemo(db);
  console.log(
    `seeded merchant ${merchant.slug} with ${products.length} products`,
  );
  process.exit(0);
}

void main();
