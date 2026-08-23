import { NextResponse } from "next/server";
import { deliveryChargeForPincode, isFreeDeliveryPincode, isValidPincode, normalizePincode } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

async function db(path: string, init?: RequestInit) {
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

function clean(value: unknown, max = 250) {
  return String(value || "").trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = clean(body.token, 200);
    const name = clean(body.name, 120);
    const phone = clean(body.phone, 30);
    const email = clean(body.email, 180);
    const address1 = clean(body.address1, 180); const address2 = clean(body.address2, 220); const landmark = clean(body.landmark, 120); const address = clean(body.address || [address1,address2,landmark].filter(Boolean).join(", "), 500);
    const city = clean(body.city, 120);
    const state = clean(body.state, 120);
    const pincode = normalizePincode(body.pincode);

    if (!token) return NextResponse.json({ error: "Your checkout session is missing." }, { status: 400 });
    if (!name || !phone || !address1 || !address2 || !address || !city || !state || !isValidPincode(pincode)) {
      return NextResponse.json({ error: "Please complete your name, 10-digit mobile number, Address Line 1, Address Line 2, city, state and 6-digit pincode." }, { status: 400 });
    }
    const phoneDigits=phone.replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"").replace(/^0(?=\d{10}$)/,"");
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      return NextResponse.json({ error: "Please enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address or leave it blank." }, { status: 400 });
    }

    const lookup = await db(`orders?public_token=eq.${encodeURIComponent(token)}&select=id,status,expires_at,proof_url&limit=1`);
    if (!lookup.ok) return NextResponse.json({ error: "Could not load your checkout right now." }, { status: 502 });
    const order = (await lookup.json())[0];
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status !== "payment_pending") return NextResponse.json({ error: "This checkout is no longer editable. Open your order status instead." }, { status: 409 });
    if (new Date(order.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "This payment session has expired. Please start a new order." }, { status: 410 });
    if (order.proof_url) return NextResponse.json({ error: "Delivery details cannot be changed after a payment screenshot has been submitted." }, { status: 409 });

    const itemsResponse = await db(`order_items?order_id=eq.${encodeURIComponent(order.id)}&select=line_total`);
    if (!itemsResponse.ok) return NextResponse.json({ error: "Could not calculate your order total." }, { status: 502 });
    const rows = await itemsResponse.json();
    const subtotal = rows.reduce((sum: number, item: { line_total?: number }) => sum + Number(item.line_total || 0), 0);
    const deliveryCharge = deliveryChargeForPincode(pincode);
    if (deliveryCharge === null) return NextResponse.json({ error: "Please enter a valid 6-digit pincode." }, { status: 400 });
    const amount = subtotal + deliveryCharge;

    const update = await db(`orders?id=eq.${encodeURIComponent(order.id)}&status=eq.payment_pending`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ customer_name: name, customer_phone: phone, customer_email: email || null, address, city, state, pincode, amount, updated_at: new Date().toISOString() }),
    });
    if (!update.ok) return NextResponse.json({ error: "Could not save your delivery details." }, { status: 502 });
    const updated = (await update.json())[0];
    if (!updated) return NextResponse.json({ error: "Your checkout changed while saving. Please refresh and try again." }, { status: 409 });

    return NextResponse.json({ order: updated, pricing: { subtotal, deliveryCharge, amount, freeDelivery: isFreeDeliveryPincode(pincode), pincode } });
  } catch (error) {
    console.error("[orders/delivery]", error);
    return NextResponse.json({ error: "We could not save your delivery details right now. Please try again." }, { status: 500 });
  }
}
