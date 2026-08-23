import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_COOKIE = "nagmeena_admin_token";

export function isAllowedAdminEmail(email: string | undefined) {
  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}

export async function getAdminToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value || null;
}

export async function getAuthenticatedAdmin(request?: Request) {
  // Client requests to /api/admin/* normally carry the HttpOnly cookie,
  // not an Authorization header. Prefer an explicit Bearer token when one
  // is supplied, otherwise fall back to the session cookie.
  const authorizationToken = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const token = authorizationToken || (await getAdminToken());

  if (!token || !supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const user = (await response.json()) as { id: string; email?: string };
  if (!isAllowedAdminEmail(user.email)) return null;
  return { ...user, token };
}
