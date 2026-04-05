// Provider configuration is now handled client-side.
// This route is no longer needed but kept to avoid 404s.

import { NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/providers";

export async function GET() {
  return NextResponse.json(Object.values(PROVIDERS));
}
