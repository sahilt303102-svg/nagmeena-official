import { NextResponse } from "next/server";
import { deliveryChargeForPincode,isValidPincode,normalizePincode } from "@/lib/delivery";
export const runtime="nodejs";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY;
async function db(path:string,init?:RequestInit){
  if(!url||!key)throw new Error("Supabase server configuration is missing.");
  return fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});
}
async function rpc(name:string,args:Record<string,unknown>){return db(`rpc/${name}`,{method:"POST",body:JSON.stringify(args)});}
function normalizeIndianPhone(value:unknown){
  let digits=String(value||"").replace(/\D/g,"");
  if(digits.length===12&&digits.startsWith("91"))digits=digits.slice(2);
  if(digits.length===11&&digits.startsWith("0"))digits=digits.slice(1);
  return digits.slice(0,10);
}
function validIndianPhone(value:unknown){return /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));}
async function notifyWhatsApp(order:any){
  if(process.env.WHATSAPP_ENABLED!=="true"||!process.env.WHATSAPP_ACCESS_TOKEN||!process.env.WHATSAPP_PHONE_NUMBER_ID||!process.env.WHATSAPP_ADMIN_PHONE)return;
  const msg=`🔔 NEW NAGMEENA ORDER\nOrder: ${order.order_code}\nCustomer: ${order.customer_name}\nContact: ${order.customer_phone}\nAmount: ₹${Number(order.amount).toLocaleString("en-IN")}\nStatus: Payment verification pending\n\nOpen Admin Panel to verify.`;
  await fetch(`https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:"POST",headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:process.env.WHATSAPP_ADMIN_PHONE,type:"text",text:{body:msg}})}).catch(()=>{});
}
export async function POST(request:Request){
 try{
  const body=await request.json(); const token=String(body.token||""); const name=String(body.name||"").trim(); const phone=normalizeIndianPhone(body.phone); const address1=String(body.address1||"").trim(); const address2=String(body.address2||"").trim(); const landmark=String(body.landmark||"").trim(); const address=String(body.address||[address1,address2,landmark].filter(Boolean).join(", ")).trim(); const city=String(body.city||"").trim(); const state=String(body.state||"").trim(); const pincode=normalizePincode(body.pincode);
  if(!token||!name||!validIndianPhone(phone)||!address1||!address2||!address||!city||!state||!isValidPincode(pincode))return NextResponse.json({error:"Your delivery details are incomplete. Return to Step 1 and check your 10-digit mobile number, Address Line 1 and Address Line 2."},{status:400});
  const lookup=await db(`orders?public_token=eq.${encodeURIComponent(token)}&select=id,order_code,public_token,status,expires_at,proof_url,product_name,product_code,amount,stock_reserved&limit=1`);
  if(!lookup.ok)return NextResponse.json({error:"Could not find your order right now. Please try again."},{status:502});
  const order=(await lookup.json())[0];
  if(!order)return NextResponse.json({error:"Order not found."},{status:404});
  if(order.status!=="payment_pending"){
    if(["verification_pending","confirmed","cancelled"].includes(order.status))return NextResponse.json({order,alreadySubmitted:true});
    return NextResponse.json({error:"This payment session is no longer active. Please start a new order."},{status:409});
  }
  if(new Date(order.expires_at).getTime()<Date.now())return NextResponse.json({error:"This payment session has expired. Please start a new order."},{status:410});
  if(!order.proof_url)return NextResponse.json({error:"Please upload your payment confirmation screenshot first."},{status:400});

  const totalResponse=await db(`order_items?order_id=eq.${encodeURIComponent(order.id)}&select=line_total`);
  if(!totalResponse.ok)return NextResponse.json({error:"We could not verify your final amount right now. Please try again."},{status:502});
  const totalRows=await totalResponse.json(); const subtotal=totalRows.reduce((sum:number,item:{line_total?:number})=>sum+Number(item.line_total||0),0); const deliveryCharge=deliveryChargeForPincode(pincode);
  if(deliveryCharge===null)return NextResponse.json({error:"Please enter a valid delivery pincode."},{status:400});
  const finalAmount=subtotal+deliveryCharge;
  if(Number(order.amount)!==Number(finalAmount))return NextResponse.json({error:"Your delivery charge changed after the payment amount was prepared. Return to Step 1 and review the new total."},{status:409});

  // Reserve inventory only when the customer submits the completed payment proof.
  if(!order.stock_reserved){
    const reserve=await rpc("nagmeena_reserve_order_stock",{p_order_id:order.id});
    if(!reserve.ok)return NextResponse.json({error:"We could not reserve stock right now. Please try again."},{status:502});
    const ok=await reserve.json().catch(()=>false);
    if(ok!==true)return NextResponse.json({error:"One or more suits just went out of stock. Your order was not submitted. Please refresh your cart."},{status:409});
  }

  const patch={customer_name:name,customer_phone:phone,customer_email:body.email?String(body.email).trim():null,address,city,state,pincode,amount:finalAmount,payment_reference:body.paymentReference?String(body.paymentReference).trim():null,status:"verification_pending",submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const update=await db(`orders?id=eq.${encodeURIComponent(order.id)}&status=eq.payment_pending`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});
  if(!update.ok){await rpc("nagmeena_restore_order_stock",{p_order_id:order.id}).catch(()=>null);return NextResponse.json({error:"Your payment could not be submitted. Please try again."},{status:502});}
  const updatedRows=await update.json(); const updated=updatedRows[0];
  if(!updated){
    const current=await db(`orders?id=eq.${encodeURIComponent(order.id)}&select=id,order_code,public_token,status,proof_url,product_name,product_code,amount,customer_name,customer_phone,payment_reference,created_at,expires_at,submitted_at,verified_at&limit=1`);
    if(current.ok){const rows=await current.json();if(rows[0]&&rows[0].status!=="payment_pending")return NextResponse.json({order:rows[0],alreadySubmitted:true});}
    return NextResponse.json({error:"Your payment verification is being processed. Please open the payment status page.",alreadySubmitted:true},{status:409});
  }
  await notifyWhatsApp(updated); return NextResponse.json({order:updated});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not submit payment confirmation."},{status:500});}
}
