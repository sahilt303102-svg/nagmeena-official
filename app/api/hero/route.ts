import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET() {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ slides: [] });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/hero_slides?select=id,slide_number,title,desktop_image_url,mobile_image_url&is_active=eq.true&order=slide_number.asc`,
    { headers: { apikey: supabaseKey }, cache: "no-store" },
  );

  if (!response.ok) return NextResponse.json({ slides: [] });
  return NextResponse.json({ slides: await response.json() });
}
