"use client"

import { CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const topics = ["General question", "Sales & pricing", "Technical support", "Partnership", "Press"]

export function ContactForm() {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  if (state === "sent") {
    return (
      <div className="flex flex-col items-center rounded-xl border border-border bg-card p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
          <CheckCircle2 className="size-6" />
        </span>
        <h3 className="mt-4 text-lg font-semibold">Message sent</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Thanks for reaching out. We&apos;ll reply within one business day.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setState("idle")}>
          Send another message
        </Button>
      </div>
    )
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState("busy")
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        topic: form.get("topic"),
        message: form.get("message"),
      }),
    }).catch(() => null)
    if (!res?.ok) {
      const data = await res?.json().catch(() => null)
      setError(data?.error ?? "Something went wrong — email us directly at support@useshelfready.com.")
      setState("idle")
      return
    }
    setState("sent")
  }

  return (
    <form className="rounded-xl border border-border bg-card p-6 sm:p-8" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Your name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="you@store.com" required />
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <Label htmlFor="topic">Topic</Label>
        <select
          id="topic"
          name="topic"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          defaultValue={topics[0]}
        >
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <Label htmlFor="message">How can we help?</Label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="Tell us a bit about your store and what you're trying to do…"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      {error && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="animate-spin" /> : null}
        {state === "busy" ? "Sending…" : "Send message"}
      </Button>
    </form>
  )
}
