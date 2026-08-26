import { NextResponse } from "next/server";
import { bootstrapOwner, BootstrapOwnerError } from "@/lib/auth/bootstrapOwner";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await bootstrapOwner(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof BootstrapOwnerError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
