import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";

/**
 * Lightweight session probe for client components (header, enquiry prefill).
 * Content pages stay static/ISR by NOT reading cookies server-side; the browser
 * hydrates auth state from here instead. Never cached.
 */
export async function GET() {
  const user = await getSession();
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store" } },
  );
}
