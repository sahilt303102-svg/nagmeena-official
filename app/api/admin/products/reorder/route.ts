import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
export const runtime = "nodejs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY;
export async function POST(request: Request) {
  if (!(await getAuthenticatedAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!url || !key) return NextResponse.json({ error: "Supabase server key is not configured." }, { status: 500 });
  const { ids } = await request.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids must be an array." }, { status: 400 });
  for (const [index, id] of ids.entries()) {
    const response = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ display_order: index }) });
    if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
  }
  return NextResponse.json({ ok: true });
}
