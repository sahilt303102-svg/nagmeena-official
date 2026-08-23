import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAuthenticatedAdmin, isAllowedAdminEmail } from "@/lib/admin-auth";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, email: admin.email });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: payload?.error_description || payload?.msg || "Invalid login details." }, { status: 401 });
  }

  const userEmail = payload?.user?.email as string | undefined;
  if (!isAllowedAdminEmail(userEmail)) {
    return NextResponse.json({ error: "This account is not authorized for the NAGMEENA admin panel." }, { status: 403 });
  }

  const result = NextResponse.json({ authenticated: true, email: userEmail });
  result.cookies.set(ADMIN_COOKIE, payload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Number(payload.expires_in || 3600)),
  });
  return result;
}

export async function DELETE() {
  const result = NextResponse.json({ success: true });
  result.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return result;
}
