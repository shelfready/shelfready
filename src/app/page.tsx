import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>ShelfReady</h1>
        <p>
          Make any store shoppable and discoverable by AI shopping agents —
          compliant product feeds, an agent-readiness audit, catalog
          enrichment, and freshness monitoring.
        </p>
        <p className={styles.status}>
          Pre-release · <Link href="/dashboard">Sign in</Link>
        </p>
      </main>
    </div>
  );
}
