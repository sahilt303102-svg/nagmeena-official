import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SECRET_KEY;

async function supabaseRequest(path: string, init?: RequestInit) {
  if (!supabaseUrl || !supabaseAdminKey) throw new Error("SUPABASE_SECRET_KEY is not configured.");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAdminKey,
      Authorization: `Bearer ${supabaseAdminKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

export async function GET(request: Request) {
  if (!(await getAuthenticatedAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const response = await supabaseRequest("hero_slides?select=id,slide_number,title,desktop_image_url,mobile_image_url,desktop_image_path,mobile_image_path,is_active&order=slide_number.asc");
    if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
    return NextResponse.json({ slides: await response.json() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load hero slides." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await getAuthenticatedAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const slides = Array.isArray(body.slides) ? body.slides : [];
  if (slides.length !== 3) return NextResponse.json({ error: "Exactly 3 hero slides are required." }, { status: 400 });

  try {
    for (const slide of slides) {
      const slideNumber = Number(slide.slide_number);
      if (![1, 2, 3].includes(slideNumber)) continue;
      const response = await supabaseRequest(`hero_slides?slide_number=eq.${slideNumber}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          title: String(slide.title || `Hero Slide ${slideNumber}`).trim(),
          desktop_image_url: String(slide.desktop_image_url || "").trim(),
          mobile_image_url: String(slide.mobile_image_url || "").trim(),
          desktop_image_path: slide.desktop_image_path || null,
          mobile_image_path: slide.mobile_image_path || null,
          is_active: true,
        }),
      });
      if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save hero slides." }, { status: 500 });
  }
}
