import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getCatalog } from "@/lib/catalog";
import { sendOrderConfirmationEmail, sendOrderTrackingEmail } from "@/lib/order-email";

export const runtime="nodejs";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;

async function db(path:string,init?:RequestInit){
 if(!url||!key)throw new Error("Supabase server configuration is missing.");
 return fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});
}
async function rpc(name:string,args:Record<string,unknown>){return db(`rpc/${name}`,{method:"POST",body:JSON.stringify(args)});}

async function attachImages(items:any[]){
 try{
  const {products}=await getCatalog();const m=new Map<string,string|null>();
  for(const p of products){const img=p.images?.[0]?.url||null;m.set(p.productCode,img);for(const v of p.variants||[])m.set(v.productCode,img);}
  return items.map(i=>({...i,image_url:m.get(i.variant_product_code||i.product_code)||m.get(i.product_code)||null}));
 }catch{return items.map(i=>({...i,image_url:null}));}
}

async function getOrderItems(orderId:string){
 const r=await db(`order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_code,product_name,quantity,unit_price,line_total,variant_product_code,variant_color&order=created_at.asc`);
 return r.ok?await r.json():[];
}

async function sendConfirmationOnce(order:any){
 if(!order?.customer_email)return {status:"not_provided"};
 if(order.confirmation_email_sent_at)return {status:"already_sent"};
 try{
  const items=await getOrderItems(order.id);
  const result=await sendOrderConfirmationEmail({...order,items});
  if(result.status==="sent"){
   const stamp=new Date().toISOString();
   await db(`orders?id=eq.${encodeURIComponent(order.id)}&confirmation_email_sent_at=is.null`,{
    method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({confirmation_email_sent_at:stamp,confirmation_email_last_error:null,updated_at:stamp})
   });
   return {status:"sent",sentAt:stamp};
  }
  if(result.status==="not_configured"){
   const message="Email service is not configured yet.";
   await db(`orders?id=eq.${encodeURIComponent(order.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({confirmation_email_last_error:message,updated_at:new Date().toISOString()})});
   return {status:"not_configured",error:message};
  }
  return result;
 }catch(e){
  const message=e instanceof Error?e.message:"Confirmation email failed.";
  await db(`orders?id=eq.${encodeURIComponent(order.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({confirmation_email_last_error:message.slice(0,500),updated_at:new Date().toISOString()})}).catch(()=>null);
  return {status:"failed",error:message};
 }
}

export async function GET(request:Request){
 if(!(await getAuthenticatedAdmin(request)))return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const r=await db("orders?select=*&order=created_at.desc&limit=200");
  if(!r.ok)return NextResponse.json({error:"Could not load orders."},{status:r.status});
  const orders=await r.json(),ids=orders.map((o:any)=>o.id);let items:any[]=[];
  if(ids.length){
   const ir=await db(`order_items?order_id=in.(${ids.join(",")})&select=order_id,product_code,product_name,quantity,unit_price,line_total,variant_id,variant_product_code,variant_custom_code,variant_color&order=created_at.asc`);
   if(ir.ok)items=await attachImages(await ir.json());
  }
  const grouped=new Map<string,any[]>();items.forEach(i=>grouped.set(i.order_id,[...(grouped.get(i.order_id)||[]),i]));
  return NextResponse.json({orders:orders.map((o:any)=>({...o,items:grouped.get(o.id)||[]}))});
 }catch{return NextResponse.json({error:"Could not load orders."},{status:500});}
}

export async function PATCH(request:Request){
 if(!(await getAuthenticatedAdmin(request)))return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const body=await request.json(),action=String(body.action||"");

  if(action==="save_tracking"){
   if(!body.id)return NextResponse.json({error:"Order is required."},{status:400});
   const clean=(value:unknown,max=500)=>String(value??"").trim().slice(0,max)||null;
   const trackingUrl=clean(body.tracking_url,1000);
   if(trackingUrl){try{const parsed=new URL(trackingUrl);if(!["http:","https:"].includes(parsed.protocol))throw new Error();}catch{return NextResponse.json({error:"Tracking URL must be a valid http(s) URL."},{status:400});}}
   const patch={shipping_courier:clean(body.shipping_courier,120),tracking_id:clean(body.tracking_id,180),tracking_url:trackingUrl,estimated_delivery:clean(body.estimated_delivery,180),shipping_notes:clean(body.shipping_notes,800),updated_at:new Date().toISOString()};
   const r=await db(`orders?id=eq.${encodeURIComponent(body.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});
   if(!r.ok)return NextResponse.json({error:"Could not save tracking details. Run the V23 tracking migration if this is the first deployment."},{status:r.status});
   return NextResponse.json({order:(await r.json())[0]});
  }

  if(action==="send_tracking_email"){
   if(!body.id)return NextResponse.json({error:"Order is required."},{status:400});
   const r=await db(`orders?id=eq.${encodeURIComponent(body.id)}&select=*&limit=1`);
   if(!r.ok)return NextResponse.json({error:"Could not load order."},{status:502});
   const order=(await r.json())[0];
   if(!order)return NextResponse.json({error:"Order not found."},{status:404});
   if(!order.customer_email)return NextResponse.json({error:"This customer did not provide an email address."},{status:400});
   if(!order.tracking_id&&!order.tracking_url)return NextResponse.json({error:"Add a Tracking ID or Tracking URL first."},{status:400});
   try{
    const items=await getOrderItems(order.id);
    const result=await sendOrderTrackingEmail({...order,items});
    const stamp=new Date().toISOString();
    const patch=result.status==="sent"?{tracking_email_sent_at:stamp,tracking_email_last_error:null,updated_at:stamp}:{tracking_email_last_error:"Email service is not configured.",updated_at:stamp};
    const update=await db(`orders?id=eq.${encodeURIComponent(order.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});
    return NextResponse.json({order:update.ok?(await update.json())[0]:order,email:result});
   }catch(e){
    const message=e instanceof Error?e.message:"Tracking email failed.";
    await db(`orders?id=eq.${encodeURIComponent(order.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({tracking_email_last_error:message.slice(0,500),updated_at:new Date().toISOString()})}).catch(()=>null);
    return NextResponse.json({error:message},{status:502});
   }
  }

  if(action==="resend_confirmation_email"){
   if(!body.id)return NextResponse.json({error:"Order is required."},{status:400});
   const r=await db(`orders?id=eq.${encodeURIComponent(body.id)}&select=*&limit=1`);
   if(!r.ok)return NextResponse.json({error:"Could not load order."},{status:502});
   const order=(await r.json())[0];
   if(!order||order.status!=="confirmed")return NextResponse.json({error:"Only confirmed orders can receive a confirmation email."},{status:409});
   if(!order.customer_email)return NextResponse.json({error:"This customer did not provide an email address."},{status:400});
   if(order.confirmation_email_sent_at)return NextResponse.json({order,email:{status:"already_sent"}});
   const email=await sendConfirmationOnce(order);
   const refreshed=await db(`orders?id=eq.${encodeURIComponent(order.id)}&select=*&limit=1`);
   return NextResponse.json({order:refreshed.ok?(await refreshed.json())[0]:order,email});
  }

  if(action==="return"){
   if(!body.id||!["restock","delete"].includes(body.returnAction))return NextResponse.json({error:"Invalid return action."},{status:400});
   const current=await db(`orders?id=eq.${encodeURIComponent(body.id)}&select=id,status,stock_reserved&limit=1`);
   if(!current.ok)return NextResponse.json({error:"Could not load order."},{status:502});
   const order=(await current.json())[0];
   if(!order||order.status!=="confirmed")return NextResponse.json({error:"Only confirmed orders can be returned."},{status:409});
   if(body.returnAction==="restock"){const rr=await rpc("nagmeena_restore_order_stock",{p_order_id:body.id});if(!rr.ok)return NextResponse.json({error:"Could not restock returned item."},{status:502});}
   const r=await db(`orders?id=eq.${encodeURIComponent(body.id)}&status=eq.confirmed`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"cancelled",returned_at:new Date().toISOString(),return_action:body.returnAction,updated_at:new Date().toISOString()})});
   if(!r.ok)return NextResponse.json({error:"Could not process return."},{status:r.status});
   const row=(await r.json())[0];if(!row)return NextResponse.json({error:"This order changed. Refresh and try again."},{status:409});
   return NextResponse.json({order:row});
  }

  const allowed=["confirmed","cancelled"];
  if(!body.id||!allowed.includes(body.status))return NextResponse.json({error:"Invalid order action."},{status:400});
  const current=await db(`orders?id=eq.${encodeURIComponent(body.id)}&select=*&limit=1`);
  if(!current.ok)return NextResponse.json({error:"Could not load order."},{status:502});
  const order=(await current.json())[0];
  if(!order||order.status!=="verification_pending")return NextResponse.json({error:"This order is no longer in the upcoming queue. Refresh and try again."},{status:409});

  if(body.status==="cancelled"&&order.stock_reserved){
   const rr=await rpc("nagmeena_restore_order_stock",{p_order_id:body.id});
   if(!rr.ok)return NextResponse.json({error:"Could not restore stock for this rejected order."},{status:502});
  }

  const patch:any={status:body.status,updated_at:new Date().toISOString()};
  if(body.status==="confirmed")patch.verified_at=new Date().toISOString();

  const r=await db(`orders?id=eq.${encodeURIComponent(body.id)}&status=eq.verification_pending`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});
  if(!r.ok)return NextResponse.json({error:"Could not update order."},{status:r.status});
  const rows=await r.json(),updated=rows[0];
  if(!updated)return NextResponse.json({error:"This order changed. Refresh and try again."},{status:409});

  let email:any={status:"skipped"};
  if(body.status==="confirmed")email=await sendConfirmationOnce(updated);

  const refreshed=await db(`orders?id=eq.${encodeURIComponent(updated.id)}&select=*&limit=1`);
  const finalOrder=refreshed.ok?(await refreshed.json())[0]:updated;

  return NextResponse.json({order:finalOrder,email});
 }catch(e){
  console.error("[admin/orders PATCH]",e);
  return NextResponse.json({error:"Could not update order."},{status:500});
 }
}

export async function DELETE(request:Request){
 if(!(await getAuthenticatedAdmin(request)))return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const body=await request.json(),ids=Array.isArray(body.ids)?body.ids.filter((x:any)=>typeof x==="string"&&x):[];
  if(!ids.length)return NextResponse.json({error:"Select at least one order."},{status:400});
  for(const id of ids){
   const current=await db(`orders?id=eq.${encodeURIComponent(id)}&select=id,status,stock_reserved&limit=1`);
   if(current.ok){const row=(await current.json())[0];if(row?.stock_reserved&&row.status!=="confirmed")await rpc("nagmeena_restore_order_stock",{p_order_id:id});}
  }
  const inList=ids.map(encodeURIComponent).join(",");
  await db(`order_items?order_id=in.(${inList})`,{method:"DELETE"});
  const r=await db(`orders?id=in.(${inList})`,{method:"DELETE"});
  if(!r.ok)return NextResponse.json({error:"Could not delete selected orders."},{status:r.status});
  return NextResponse.json({success:true,deleted:ids.length});
 }catch{return NextResponse.json({error:"Could not delete orders."},{status:500});}
}
