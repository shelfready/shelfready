import { getDb } from "../src/db";
import { seedDemo } from "../src/db/seed-data";

const db = getDb();
const { merchant, products } = await seedDemo(db);
console.log(
  `seeded merchant ${merchant.slug} with ${products.length} products`,
);
process.exit(0);
