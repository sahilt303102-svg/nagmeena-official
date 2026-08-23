import { NextResponse } from "next/server";
import { getImageKitAuth } from "@/lib/imagekit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SECRET_KEY;
const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;

async function db(path: string, init?: RequestInit) {
  if (!supabaseUrl || !supabaseAdminKey) {
    throw new Error("Supabase server configuration is missing.");
  }

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

export async function POST(request: Request) {
  try {
    if (!publicKey || !process.env.IMAGEKIT_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "ImageKit is not configured for payment proof uploads." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "");

    if (!token) {
      return NextResponse.json(
        { error: "Order token is required." },
        { status: 400 }
      );
    }

    const response = await db(
      `orders?public_token=eq.${encodeURIComponent(
        token
      )}&select=id,order_code,status,expires_at,proof_url&limit=1`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not find your order." },
        { status: 502 }
      );
    }

    const order = (await response.json())[0];

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.proof_url) {
      return NextResponse.json({
        reused: true,
        proofUrl: order.proof_url,
      });
    }

    if (order.status !== "payment_pending") {
      return NextResponse.json(
        { error: "This order is no longer accepting payment proof." },
        { status: 409 }
      );
    }

    if (new Date(order.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This payment session has expired. Please start a new order." },
        { status: 410 }
      );
    }

    const auth = getImageKitAuth();

    return NextResponse.json({
      publicKey,
      token: auth.token,
      signature: auth.signature,
      expire: auth.expire,
      folder: `/nagmeena/payment-proofs/${order.order_code}`,
      fileName: `${order.order_code}-payment-proof-${Date.now()}.jpg`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not prepare payment screenshot upload.",
      },
      { status: 500 }
    );
  }
}
