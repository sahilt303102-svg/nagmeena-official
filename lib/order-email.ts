
import { getSiteUrl } from "@/lib/site";

type EmailItem = {
  product_name?: string | null;
  product_code?: string | null;
  variant_product_code?: string | null;
  variant_color?: string | null;
  quantity?: number | null;
  line_total?: number | null;
};

export type ConfirmationEmailOrder = {
  order_code: string;
  public_token?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  amount: number;
  items?: EmailItem[];
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendOrderConfirmationEmail(order: ConfirmationEmailOrder) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  const email = String(order.customer_email || "").trim();

  if (!email) return { status: "not_provided" as const };
  if (!apiKey || !from) return { status: "not_configured" as const, error: "RESEND_API_KEY or ORDER_EMAIL_FROM is missing." };

  const siteUrl = getSiteUrl();
  const statusUrl = order.public_token
    ? `${siteUrl}/payment-status?token=${encodeURIComponent(order.public_token)}`
    : `${siteUrl}/orders`;

  const items = order.items || [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const delivery = Math.max(0, Number(order.amount || 0) - subtotal);
  const itemRows = items.length
    ? items.map((item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee7da;">
          <div style="font-weight:700;color:#2a453f;">${esc(item.product_name || item.variant_product_code || item.product_code || "NAGMEENA Suit")}</div>
          <div style="font-size:12px;color:#6f817c;margin-top:4px;">
            ${esc(item.variant_product_code || item.product_code || "")}${item.variant_color ? ` · ${esc(item.variant_color)}` : ""} · Qty ${Number(item.quantity || 1)}
          </div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee7da;text-align:right;font-weight:700;color:#2a453f;">${money(Number(item.line_total || 0))}</td>
      </tr>`).join("")
    : `<tr><td style="padding:12px 0;">NAGMEENA Order</td><td></td></tr>`;

  const address = [order.address, order.city, order.state, order.pincode].filter(Boolean).join(", ");

  const html = `
  <div style="background:#f7f1e6;padding:28px 12px;font-family:Arial,sans-serif;color:#2a453f;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #eadfc8;border-radius:24px;overflow:hidden;">
      <div style="background:#2a453f;padding:28px;text-align:center;">
        <div style="color:#d3ad63;font-size:12px;letter-spacing:3px;font-weight:700;">NAGMEENA</div>
        <h1 style="color:#fff;margin:10px 0 0;font-size:28px;">Order Confirmed ✓</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 14px;">Hi ${esc(order.customer_name || "there")},</p>
        <p style="margin:0 0 22px;line-height:1.6;color:#60736d;">Your payment has been verified and your NAGMEENA order is confirmed.</p>
        <div style="background:#f7f1e6;border-radius:16px;padding:16px;margin-bottom:20px;">
          <div style="font-size:12px;color:#887247;">ORDER</div>
          <div style="font-weight:700;margin-top:4px;">${esc(order.order_code)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
        <div style="margin-top:18px;">
          <div style="display:flex;justify-content:space-between;margin:8px 0;"><span>Product subtotal</span><b>${money(subtotal)}</b></div>
          <div style="display:flex;justify-content:space-between;margin:8px 0;"><span>Delivery</span><b>${delivery === 0 ? "FREE" : money(delivery)}</b></div>
          <div style="display:flex;justify-content:space-between;margin:12px 0 0;padding-top:12px;border-top:1px solid #eadfc8;font-size:18px;"><span><b>Total paid</b></span><b>${money(order.amount)}</b></div>
        </div>
        ${address ? `<div style="margin-top:22px;background:#fbf8f2;border-radius:16px;padding:16px;"><div style="font-size:12px;color:#887247;">DELIVERY ADDRESS</div><div style="margin-top:5px;line-height:1.5;">${esc(address)}</div></div>` : ""}
        <div style="text-align:center;margin-top:26px;">
          <a href="${esc(statusUrl)}" style="display:inline-block;background:#2a453f;color:white;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;">View Order</a>
        </div>
        <div style="margin-top:22px;border:1px solid #eadfc8;background:#fbf8f2;border-radius:18px;padding:18px;text-align:center;">
          <div style="font-weight:700;color:#2a453f;">Need help with your order?</div>
          <div style="font-size:13px;line-height:1.6;color:#6f817c;margin-top:5px;">For order, payment or delivery queries, contact the NAGMEENA team on WhatsApp.</div>
          <div style="font-size:13px;font-weight:700;color:#2a453f;margin-top:8px;">+91 95995 02046</div>
          <a href="https://wa.me/919599502046?text=${encodeURIComponent(`Hello NAGMEENA, I need help with order ${order.order_code}.`)}" style="display:inline-block;background:#25D366;color:white;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:700;margin-top:12px;">WhatsApp NAGMEENA</a>
        </div>
        <p style="font-size:12px;color:#7f8c88;text-align:center;margin:24px 0 0;line-height:1.5;">This is an automated confirmation for your NAGMEENA order.</p>
      </div>
    </div>
  </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `NAGMEENA order ${order.order_code} confirmed`,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const detail=[payload?.message,payload?.name,payload?.statusCode].filter(Boolean).join(" · "); throw new Error(detail || `Resend rejected the email (${response.status}).`); }
  return { status: "sent" as const, id: payload?.id || null };
}

export type TrackingEmailOrder = ConfirmationEmailOrder & {
  shipping_courier?: string | null;
  tracking_id?: string | null;
  tracking_url?: string | null;
  estimated_delivery?: string | null;
  shipping_notes?: string | null;
};

export async function sendOrderTrackingEmail(order: TrackingEmailOrder) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  const email = String(order.customer_email || "").trim();
  if (!email) return { status: "not_provided" as const };
  if (!apiKey || !from) return { status: "not_configured" as const, error: "RESEND_API_KEY or ORDER_EMAIL_FROM is missing." };

  const siteUrl = getSiteUrl();
  const statusUrl = order.public_token
    ? `${siteUrl}/payment-status?token=${encodeURIComponent(order.public_token)}`
    : `${siteUrl}/orders`;
  const courier = String(order.shipping_courier || "").trim();
  const trackingId = String(order.tracking_id || "").trim();
  const trackingUrl = String(order.tracking_url || "").trim();
  const estimated = String(order.estimated_delivery || "").trim();
  const note = String(order.shipping_notes || "").trim();

  if (!trackingId && !trackingUrl) throw new Error("Tracking ID or Tracking URL is required before sending a tracking email.");

  const trackingButton = trackingUrl
    ? `<a href="${esc(trackingUrl)}" style="display:inline-block;background:#2a453f;color:white;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;">Track Shipment</a>`
    : "";

  const html = `
  <div style="background:#f7f1e6;padding:28px 12px;font-family:Arial,sans-serif;color:#2a453f;">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #eadfc8;border-radius:24px;overflow:hidden;">
      <div style="background:#2a453f;padding:28px;text-align:center;">
        <div style="color:#d3ad63;font-size:12px;letter-spacing:3px;font-weight:700;">NAGMEENA</div>
        <h1 style="color:#fff;margin:10px 0 0;font-size:27px;">Your order is on the way</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 14px;">Hi ${esc(order.customer_name || "there")},</p>
        <p style="margin:0 0 22px;line-height:1.6;color:#60736d;">We have an update for your NAGMEENA order <b>${esc(order.order_code)}</b>.</p>
        <div style="background:#fbf8f2;border:1px solid #eadfc8;border-radius:18px;padding:18px;">
          ${courier ? `<div style="margin-bottom:10px;"><span style="font-size:12px;color:#887247;">COURIER</span><div style="font-weight:700;margin-top:3px;">${esc(courier)}</div></div>` : ""}
          ${trackingId ? `<div style="margin-bottom:10px;"><span style="font-size:12px;color:#887247;">TRACKING ID</span><div style="font-weight:700;margin-top:3px;">${esc(trackingId)}</div></div>` : ""}
          ${estimated ? `<div><span style="font-size:12px;color:#887247;">ESTIMATED DELIVERY</span><div style="font-weight:700;margin-top:3px;">${esc(estimated)}</div></div>` : ""}
        </div>
        ${note ? `<div style="margin-top:16px;padding:15px;border-radius:16px;background:#f7f1e6;color:#60736d;line-height:1.6;">${esc(note)}</div>` : ""}
        <div style="text-align:center;margin-top:24px;">${trackingButton}${trackingButton ? `<div style="height:10px"></div>` : ""}<a href="${esc(statusUrl)}" style="display:inline-block;color:#2a453f;text-decoration:none;border:1px solid #d9c9a8;border-radius:999px;padding:12px 20px;font-weight:700;">View NAGMEENA Order</a></div>
        <p style="font-size:12px;color:#7f8c88;text-align:center;margin:24px 0 0;line-height:1.5;">For help, WhatsApp NAGMEENA at +91 95995 02046.</p>
      </div>
    </div>
  </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: `Tracking update for NAGMEENA order ${order.order_code}`, html }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const detail=[payload?.message,payload?.name,payload?.statusCode].filter(Boolean).join(" · "); throw new Error(detail || `Resend rejected the email (${response.status}).`); }
  return { status: "sent" as const, id: payload?.id || null };
}
