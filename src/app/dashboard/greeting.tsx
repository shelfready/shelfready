"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function clientGreeting() {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function serverGreeting() {
  return "Welcome back";
}

/** Time-of-day greeting in the viewer's timezone (server renders a neutral
 * fallback; the client snapshot swaps in the local greeting on hydration). */
export function Greeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(subscribe, clientGreeting, serverGreeting);

  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      {greeting}
      {name ? `, ${name}` : ""}
    </h1>
  );
}
