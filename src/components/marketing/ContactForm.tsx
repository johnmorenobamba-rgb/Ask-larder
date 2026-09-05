"use client";

import { useState } from "react";

/**
 * Block N4 — the real contact form both "Contact us" and "Book a
 * walkthrough" lead to (`/api/contact`, sends via Resend to
 * hello@asklarder.com.au). Input styling matches the existing login forms
 * (`OwnerLoginForm.tsx`). The `company` field is a plain honeypot: hidden
 * from real visitors via CSS, checked server side, this is the first
 * fully public POST route in the app.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message || status === "loading") return;
    setStatus("loading");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, venueName, email, phone, message, company }),
    });

    setStatus(res.ok ? "sent" : "error");
  }

  if (status === "sent") {
    return <p className="font-sans text-lg text-ink">Message sent. We&apos;ll be in touch soon.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoFocus
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <input
        type="text"
        value={venueName}
        onChange={(e) => setVenueName(e.target.value)}
        placeholder="Venue name"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell us about your venue"
        rows={4}
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <input
        type="text"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {status === "error" && (
        <p className="font-sans text-sm text-preserve-red">
          Something went wrong. Try again, or email hello@asklarder.com.au directly.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading" || !name || !email || !message}
        className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
      >
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
