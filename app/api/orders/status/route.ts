import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const runtime="nodejs";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
async function db(path:string,init?:RequestInit){if(!url||!key)throw new Error("Supabase server configuration is missing.");return fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});}
async function attachImages(rows:any[]){try{const {products}=await getCatalog();const m=new Map<string,string|null>();for(const p of products){const img=p.images?.[0]?.url||null;m.set(p.productCode,img);for(const v of p.variants||[])m.set(v.productCode,img);}return rows.map(x=>({...x,image_url:m.get(x.variant_product_code||x.product_code)||m.get(x.product_code)||null}));}catch{return rows.map(x=>({...x,image_url:null}));}}

const baseFields="id,order_code,product_code,product_name,amount,status,payment_method,proof_url,payment_reference,customer_name,customer_phone,customer_email,address,city,state,pincode,created_at,expires_at,submitted_at,verified_at,updated_at";
const trackingFields="shipping_courier,tracking_id,tracking_url,estimated_delivery,shipping_notes";

export async function GET(request:Request){
 try{
  const token=new URL(request.url).searchParams.get("token");
  if(!token)return NextResponse.json({error:"Order status link is missing."},{status:400});
  let r=await db(`orders?public_token=eq.${encodeURIComponent(token)}&select=${baseFields},${trackingFields}&limit=1`);
  // Keep existing order-status links working even if code is deployed a moment before the V23 migration.
  if(!r.ok){const detail=await r.text();if(detail.includes("tracking_")||detail.includes("shipping_")||detail.includes("estimated_delivery"))r=await db(`orders?public_token=eq.${encodeURIComponent(token)}&select=${baseFields}&limit=1`);else return NextResponse.json({error:"We could not load your order status right now."},{status:502});}
  if(!r.ok)return NextResponse.json({error:"We could not load your order status right now."},{status:502});
  const rows=await r.json();
  if(!rows[0])return NextResponse.json({error:"This payment session is no longer available. Please start a new order."},{status:404});
  const order=rows[0];
  if(order.status==="payment_pending"&&new Date(order.expires_at).getTime()<=Date.now()){await db(`orders?id=eq.${encodeURIComponent(order.id)}&status=eq.payment_pending`,{method:"PATCH",body:JSON.stringify({status:"expired",updated_at:new Date().toISOString()})});order.status="expired";}
  const ir=await db(`order_items?order_id=eq.${encodeURIComponent(order.id)}&select=product_code,product_name,quantity,unit_price,line_total,variant_id,variant_product_code,variant_custom_code,variant_color&order=created_at.asc`);
  const items=ir.ok?await attachImages(await ir.json()):[];
  return NextResponse.json({order,items});
 }catch{return NextResponse.json({error:"We could not load your order status right now. Please try again."},{status:502});}
}
