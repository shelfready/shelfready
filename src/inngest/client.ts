import { Inngest, eventType, staticSchema } from "inngest";

export const inngest = new Inngest({ id: "shelfready" });

export const demoEchoEvent = eventType("demo/echo", {
  schema: staticSchema<{ message: string }>(),
});

export const syncRequestedEvent = eventType("source/sync.requested", {
  schema: staticSchema<{ merchantId: string; sourceId: string }>(),
});
