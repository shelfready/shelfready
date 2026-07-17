import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Lazy singleton so importing this module never requires DATABASE_URL
// (tests use PGlite via src/db/test-db.ts instead).
let _db: ReturnType<typeof create> | undefined;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(new Pool({ connectionString: url }), { schema });
}

export function getDb() {
  return (_db ??= create());
}

export { schema };
