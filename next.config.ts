import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted in Docker on a VPS (ADR-0005) — standalone bundles the
  // server + needed node_modules into .next/standalone.
  output: "standalone",
};

export default nextConfig;
