import { NextResponse } from "next/server";
import { fetchAccountExport } from "@/server/auth";
import { ApiError } from "@/server/api-client";

/**
 * GDPR data export (Art. 15/20): streams the signed-in user's own data as a
 * downloadable JSON file. The httpOnly session token never leaves the server —
 * this handler reads it and proxies to the backend. Never cached.
 */
export async function GET() {
  try {
    const json = await fetchAccountExport();
    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="my-homes-data.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(
      { error: status === 401 ? "Not signed in" : "Could not export your data" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
