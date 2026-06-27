import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { contact } = await request.json().catch(() => ({ contact: null }));

  if (!contact || typeof contact !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // MVP: simulation only. Swap this block for a real SMS provider (e.g. Twilio) later.
  console.log(`[ALERT-SIMULATION] would notify contact: ${contact}`);

  return NextResponse.json({ ok: true });
}
