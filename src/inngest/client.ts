import { Inngest, eventType, staticSchema } from "inngest";

export const inngest = new Inngest({ id: "shelfready" });

export const demoEchoEvent = eventType("demo/echo", {
  schema: staticSchema<{ message: string }>(),
});
