import { NextResponse } from "next/server";

// Unmatched /api/* paths: answer with JSON, not the HTML 404 page.
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
