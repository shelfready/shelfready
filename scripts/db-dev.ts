import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

/**
 * Local dev database without Docker: PGlite persisted to .pglite/ behind a
 * pg-wire socket, so the app's normal `pg` driver connects to it.
 *
 *   npm run db:dev            # start (applies pending migrations first)
 *   DATABASE_URL=postgres://localhost:5433/postgres npm run dev
 */

// tsx runs these as CJS (no "type": "module") — no top-level await.
async function main() {
  const db = await PGlite.create({ dataDir: "./.pglite" });
  await migrate(drizzle(db), { migrationsFolder: "./drizzle" });

  const server = new PGLiteSocketServer({ db, port: 5433, maxConnections: 10 });
  await server.start();
  console.log(
    "pglite dev db on postgres://localhost:5433/postgres (data: ./.pglite)",
  );

  process.on("SIGINT", async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}

void main();
