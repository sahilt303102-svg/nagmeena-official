import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SECRET_KEY;

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

function isTrustedImageKitUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const configured = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (configured) {
      const endpoint = new URL(configured);
      if (url.hostname !== endpoint.hostname) return false;
    } else if (!url.hostname.endsWith("imagekit.io")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "");
    const proofUrl = String(body?.proofUrl || "");

    if (!token || !proofUrl) {
      return NextResponse.json(
        { error: "Order token and payment screenshot URL are required." },
        { status: 400 }
      );
    }

    if (!isTrustedImageKitUrl(proofUrl)) {
      return NextResponse.json(
        { error: "Payment screenshot URL is invalid." },
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
        proofUrl: order.proof_url,
        reused: true,
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

    // The folder path contains this order code. Refuse unrelated ImageKit URLs.
    if (!decodeURIComponent(new URL(proofUrl).pathname).includes(`/${order.order_code}-payment-proof-`)) {
      return NextResponse.json(
        { error: "This screenshot does not belong to the current order." },
        { status: 400 }
      );
    }

    const update = await db(
      `orders?id=eq.${encodeURIComponent(order.id)}&status=eq.payment_pending`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          proof_url: proofUrl,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!update.ok) {
      return NextResponse.json(
        { error: "Could not save payment screenshot." },
        { status: 502 }
      );
    }

    const updated = await update.json();

    if (!updated[0]) {
      const current = await db(
        `orders?id=eq.${encodeURIComponent(
          order.id
        )}&select=proof_url&limit=1`
      );

      if (current.ok) {
        const row = (await current.json())[0];
        if (row?.proof_url) {
          return NextResponse.json({
            proofUrl: row.proof_url,
            reused: true,
          });
        }
      }

      return NextResponse.json(
        {
          error:
            "This order changed while the screenshot was being saved. Open your status page.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ proofUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save payment screenshot.",
      },
      { status: 500 }
    );
  }
}
