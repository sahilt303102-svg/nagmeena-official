
import { NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
export async function GET(){
 try{
  if(!url||!key)return NextResponse.json({promotion:null});
  const r=await fetch(`${url}/rest/v1/site_promotions?is_active=eq.true&select=id,title,image_url,cta_text,cta_url,starts_at,ends_at,display_seconds,show_once_per_session,updated_at&order=updated_at.desc&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
  if(!r.ok)return NextResponse.json({promotion:null});
  const p=(await r.json())[0]; if(!p)return NextResponse.json({promotion:null});
  if(p.starts_at&&new Date(p.starts_at).getTime()>Date.now())return NextResponse.json({promotion:null});
  if(p.ends_at&&new Date(p.ends_at).getTime()<Date.now())return NextResponse.json({promotion:null});
  return NextResponse.json({promotion:p});
 }catch{return NextResponse.json({promotion:null});}
}
