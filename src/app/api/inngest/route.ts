import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { demoEcho, heartbeat } from "@/inngest/functions/heartbeat";
import { enrichCatalog, syncSource } from "@/inngest/functions/sync";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [heartbeat, demoEcho, syncSource, enrichCatalog],
});
