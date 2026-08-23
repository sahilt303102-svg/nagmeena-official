
import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
async function db(path:string, init?:RequestInit) {
  if(!url || !key) throw new Error("Supabase server configuration is missing.");
  return fetch(`${url}/rest/v1/${path}`, {...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});
}
export async function GET(request:Request) {
  if(!(await getAuthenticatedAdmin(request))) return NextResponse.json({error:"Unauthorized"},{status:401});
  try { const r=await db("site_promotions?select=*&order=updated_at.desc&limit=1"); if(!r.ok)return NextResponse.json({error:await r.text()},{status:r.status}); return NextResponse.json({promotion:(await r.json())[0]||null}); }
  catch(e){ return NextResponse.json({error:e instanceof Error?e.message:"Could not load promotion."},{status:500}); }
}
export async function PUT(request:Request) {
  if(!(await getAuthenticatedAdmin(request))) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const body=await request.json();
    const currentR=await db("site_promotions?select=id&order=updated_at.desc&limit=1"); if(!currentR.ok)return NextResponse.json({error:await currentR.text()},{status:currentR.status});
    const current=(await currentR.json())[0];
    const payload={
      title:String(body.title||"Special Offer").trim().slice(0,120),
      image_url:String(body.image_url||"").trim(), image_path:body.image_path||null,
      cta_text:String(body.cta_text||"Browse Collection").trim().slice(0,50),
      cta_url:String(body.cta_url||"/#collections").trim().slice(0,500),
      is_active:Boolean(body.is_active), starts_at:body.starts_at||null, ends_at:body.ends_at||null,
      display_seconds:Math.min(15,Math.max(3,Number(body.display_seconds||6))),
      show_once_per_session:body.show_once_per_session!==false,
      updated_at:new Date().toISOString(),
    };
    if(payload.is_active&&!payload.image_url)return NextResponse.json({error:"Upload a poster before enabling it."},{status:400});
    if(payload.starts_at&&payload.ends_at&&new Date(payload.ends_at).getTime()<=new Date(payload.starts_at).getTime())return NextResponse.json({error:"End date must be after start date."},{status:400});
    const r=current
      ? await db(`site_promotions?id=eq.${encodeURIComponent(current.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)})
      : await db("site_promotions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)});
    if(!r.ok)return NextResponse.json({error:await r.text()},{status:r.status});
    return NextResponse.json({promotion:(await r.json())[0]});
  } catch(e){ return NextResponse.json({error:e instanceof Error?e.message:"Could not save promotion."},{status:500}); }
}
