import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentStaff } from "@/lib/auth/session";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { buildVisionContentBlock, fetchOnboardingUpload } from "@/lib/ai/onboardingUpload";

// Block Q5 -- pre-fills the RSA marshal / Food Safety Supervisor
// certificate confirmation form Q4 owns (wizard Pages 6b/7a "may not have a
// login yet" flow, and later the standalone post-invite cert-upload flow --
// see q2-wizard-flow-and-schema.md §5 item 2 on why a named key role's own
// certificate can't be captured until they have an app_users login). This
// route never writes to staff_certificates or venue_key_roles; it only
// returns what it read off the photo so the owner can confirm/correct it.

const MODEL = "claude-sonnet-5";

const CERT_KINDS = ["rsa_marshal", "food_safety_supervisor"] as const;
type CertKind = (typeof CERT_KINDS)[number];

const proposeCertDetailsTool: Anthropic.Tool = {
  name: "propose_certificate_details",
  description: "Return the details read off a certificate photo, for the owner to confirm before anything is saved.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      holder_name: { type: "string", description: "The certificate holder's full name as printed. Empty string if not legible." },
      cert_type: { type: "string", description: "The certificate's name/title as printed (e.g. 'Responsible Service of Alcohol', 'Food Safety Supervisor'). Empty string if not legible." },
      issued_date: { type: "string", description: "ISO date (YYYY-MM-DD) if printed and legible, otherwise empty string. Never guess a date." },
      expiry_date: { type: "string", description: "ISO date (YYYY-MM-DD) if printed and legible, otherwise empty string. Never guess a date." },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence these fields were read correctly from the photo (photo quality, glare, handwriting, cropping, etc.).",
      },
    },
    required: ["holder_name", "cert_type", "issued_date", "expiry_date", "confidence"],
    additionalProperties: false,
  },
};

interface ProposedCertDetails {
  holder_name: string;
  cert_type: string;
  issued_date: string;
  expiry_date: string;
  confidence: "high" | "medium" | "low";
}

function isProposedCertDetails(value: unknown): value is ProposedCertDetails {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.holder_name === "string" &&
    typeof v.cert_type === "string" &&
    typeof v.issued_date === "string" &&
    typeof v.expiry_date === "string" &&
    typeof v.confidence === "string"
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
  const certKind = typeof body?.certKind === "string" ? (body.certKind as CertKind) : null;
  if (!storagePath || !certKind || !CERT_KINDS.includes(certKind)) {
    return NextResponse.json({ error: "storagePath and a valid certKind are required." }, { status: 400 });
  }

  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let file;
  try {
    file = await fetchOnboardingUpload(storagePath, staff.venue_id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't read the uploaded file." },
      { status: 400 },
    );
  }
  if (file.kind !== "image" && file.kind !== "pdf") {
    return NextResponse.json({ error: "Certificate file must be a photo, image, or PDF." }, { status: 400 });
  }

  const certLabel = certKind === "rsa_marshal" ? "RSA marshal" : "Food Safety Supervisor";

  const client = createAnthropicClient();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `You are reading the details off a photo of a ${certLabel}'s certificate, for an owner to confirm before it's saved as a compliance record. Read only what's actually printed or handwritten on the certificate. Never guess or infer a date, name, or certificate type that isn't legible -- return an empty string for that field instead, and reflect the real uncertainty in confidence.`,
      messages: [
        {
          role: "user",
          content: [buildVisionContentBlock(file), { type: "text", text: "Read this certificate's details." }],
        },
      ],
      tools: [proposeCertDetailsTool],
      tool_choice: { type: "tool", name: "propose_certificate_details" },
      output_config: { effort: "medium" },
    });

    const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUseBlock || !isProposedCertDetails(toolUseBlock.input)) {
      throw new Error("Model did not return the expected structured response.");
    }

    const result = toolUseBlock.input;
    return NextResponse.json({
      holderName: result.holder_name,
      certType: result.cert_type,
      issuedDate: result.issued_date,
      expiryDate: result.expiry_date,
      confidence: result.confidence,
    });
  } catch (err) {
    console.error("parse-cert error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't read this certificate right now." }, { status: 502 });
  }
}
