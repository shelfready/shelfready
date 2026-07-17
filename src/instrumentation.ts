/**
 * Next.js instrumentation hook: OpenLLMetry/Traceloop exports every
 * server-side Claude call as OTel traces (Kalin's Otterscope at
 * OTEL_EXPORTER_OTLP_ENDPOINT — issue #19). Strictly non-blocking:
 * absent env → no-op; init failure → logged, never thrown.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;
  try {
    const { initialize } = await import("@traceloop/node-server-sdk");
    initialize({
      appName: "shelfready",
      baseUrl: endpoint,
      disableBatch: true,
      silenceInitializationMessage: true,
    });
  } catch (error) {
    console.warn("[otel] traceloop init failed (non-fatal):", (error as Error).message);
  }
}
