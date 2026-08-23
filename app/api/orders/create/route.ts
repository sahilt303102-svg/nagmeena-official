import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCatalog } from "@/lib/catalog";
export const runtime="nodejs";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
const ACTIVE=["payment_pending","verification_pending"];
async function db(path:string,init?:RequestInit){if(!url||!key)throw new Error("Supabase server configuration is missing.");return fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});}
function code(){return `NAG-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${Math.floor(1000+Math.random()*9000)}`;}
async function attachImages(rows:any[]){try{const {products}=await getCatalog();const m=new Map(products.map(p=>[p.id,p.images?.[0]?.url||null]));return rows.map(x=>({...x,image_url:m.get(x.product_id)||null}));}catch{return rows;}}
async function readItems(orderId:string){const r=await db(`order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_id,product_code,product_name,quantity,unit_price,line_total,variant_id,variant_product_code,variant_custom_code,variant_color&order=created_at.asc`);return r.ok?attachImages(await r.json()):[];}
export async function POST(request:Request){
 try{
  const body=await request.json();const idempotencyKey=String(request.headers.get("X-Idempotency-Key")||body.idempotencyKey||"").trim();
  if(!idempotencyKey)return NextResponse.json({error:"Your checkout session is invalid. Please restart checkout."},{status:400});
  const raw=Array.isArray(body.items)?body.items:[{productCode:body.productCode,quantity:1}];
  const requested=raw.map((x:any)=>({productCode:String(x?.productCode||"").trim(),variantId:x?.variantId?String(x.variantId):null,variantProductCode:x?.variantProductCode?String(x.variantProductCode).trim():null,quantity:Math.max(1,Math.min(10,Math.floor(Number(x?.quantity)||1)))})).filter((x:any)=>x.productCode);
  if(!requested.length)return NextResponse.json({error:"At least one product is required."},{status:400});
  const prior=await db(`orders?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=id,order_code,public_token,status,expires_at,product_code,product_name,amount&limit=1`);
  if(prior.ok){const rows=await prior.json();if(rows[0]){const o=rows[0];if(ACTIVE.includes(o.status)&&new Date(o.expires_at).getTime()>Date.now())return NextResponse.json({order:o,items:await readItems(o.id),reused:true});}}
  const {products}=await getCatalog();
  const items:any[]=[];
  for(const r of requested){
    const p=products.find(x=>x.productCode===r.productCode); if(!p||p.price==null)return NextResponse.json({error:`${r.productCode} is no longer available.`},{status:409});
    const activeVariants=(p.variants||[]).filter(v=>v.isActive);
    const variant=activeVariants.length ? (activeVariants.find(v=>v.id===r.variantId)||activeVariants.find(v=>v.productCode===r.variantProductCode)||activeVariants.find(v=>v.isPrimary)||activeVariants[0]) : null;
    const stock=variant?variant.stockQuantity:Number(p.stockQuantity||0); if(stock<r.quantity)return NextResponse.json({error:`Only ${stock} available for ${variant?.color||p.name}. Please update your cart.`},{status:409});
    items.push({product_id:p.id,product_code:variant?.productCode||p.productCode,product_name:p.name,quantity:r.quantity,unit_price:Number(p.price),line_total:Number(p.price)*r.quantity,variant_id:variant?.id||null,variant_product_code:variant?.productCode||null,variant_custom_code:variant?.customCode||null,variant_color:variant?.color||null,image_url:p.images?.[0]?.url||null});
  }
  const amount=items.reduce((s,x)=>s+x.line_total,0),expiresAt=new Date(Date.now()+30*60*1000).toISOString();
  const order={idempotency_key:idempotencyKey,order_code:code(),public_token:crypto.randomBytes(24).toString("hex"),product_id:items[0].product_id,product_code:items[0].product_code,product_name:items.length===1?items[0].product_name:`${items.length} suits`,amount,status:"payment_pending",payment_method:"UPI",expires_at:expiresAt};
  const createdR=await db("orders",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(order)});
  if(!createdR.ok){const detail=await createdR.text();if(createdR.status===409||detail.includes("duplicate key")){const retry=await db(`orders?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=id,order_code,public_token,status,expires_at,product_code,product_name,amount&limit=1`);if(retry.ok){const rows=await retry.json();if(rows[0])return NextResponse.json({order:rows[0],items:await readItems(rows[0].id),reused:true});}}return NextResponse.json({error:"We could not create your order. Please try again."},{status:500});}
  const created=(await createdR.json())[0];
  const payload=items.map(({image_url,...x})=>({...x,order_id:created.id})); const itemR=await db("order_items",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)});
  if(!itemR.ok){await db(`orders?id=eq.${encodeURIComponent(created.id)}`,{method:"DELETE"});return NextResponse.json({error:"We could not finish setting up your order. Run the V15 database migration, then try again."},{status:500});}
  return NextResponse.json({order:created,items:await attachImages(items)});
 }catch(e){console.error("[orders/create]",e);return NextResponse.json({error:"We could not start your order right now. Please try again."},{status:500});}
}
