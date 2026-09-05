import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Block N4 — the real send behind both "Contact us" and "Book a
// walkthrough". Follows report-near-miss/route.ts's convention (plain
// body validation, NextResponse). This is the app's first fully public
// POST route, so `company` is a plain honeypot: a real visitor never
// fills it (hidden via CSS on the form), a bot usually does -- filled
// requests are accepted with a fake ok so the bot doesn't learn to skip it.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  if (body.company) {
    return NextResponse.json({ ok: true });
  }

  const { name, venueName, email, phone, message } = body;

  const { data, error } = await resend.emails.send({
    from: "Ask Larder <hello@asklarder.com.au>",
    to: "hello@asklarder.com.au",
    replyTo: email,
    subject: `New enquiry from ${name}${venueName ? ` (${venueName})` : ""}`,
    text: [
      `Name: ${name}`,
      venueName ? `Venue: ${venueName}` : null,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (error) {
    console.error("contact form send failed:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
