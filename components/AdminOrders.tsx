"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Truck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

type Item = {
  product_code: string;
  product_name: string;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  variant_product_code?: string | null;
  variant_custom_code?: string | null;
  variant_color?: string | null;
};

type Order = {
  id: string;
  order_code: string;
  public_token?: string | null;
  amount: number;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  payment_reference?: string | null;
  proof_url?: string | null;
  created_at: string;
  return_action?: string | null;
  confirmation_email_sent_at?: string | null;
  confirmation_email_last_error?: string | null;
  shipping_courier?: string | null;
  tracking_id?: string | null;
  tracking_url?: string | null;
  estimated_delivery?: string | null;
  shipping_notes?: string | null;
  tracking_email_sent_at?: string | null;
  tracking_email_last_error?: string | null;
  customer_record_visible?: boolean | null;
  items?: Item[];
};

type Tab = "upcoming" | "accepted" | "rejected";

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const WA_COUNTRY = "91";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function normalizedWhatsApp(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `${WA_COUNTRY}${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return "";
}

function formatStatus(tab: Tab, order: Order) {
  if (tab === "accepted") return "Accepted";
  if (tab === "rejected") return order.return_action ? "Returned" : "Rejected";
  return "Awaiting review";
}

export default function AdminOrders({ onNotify }: { onNotify: (type: "success" | "error", text: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [search, setSearch] = useState("");
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [customerOrder, setCustomerOrder] = useState<Order | null>(null);
  const [newOrder, setNewOrder] = useState<Order | null>(null);
  const [savingTracking, setSavingTracking] = useState(false);
  const [sendingTracking, setSendingTracking] = useState(false);
  const [removingCustomer, setRemovingCustomer] = useState(false);
  const [tracking, setTracking] = useState({
    shipping_courier: "",
    tracking_id: "",
    tracking_url: "",
    estimated_delivery: "",
    shipping_notes: "",
  });

  function openCustomer(order: Order) {
    setCustomerOrder(order);
    setTracking({
      shipping_courier: String(order.shipping_courier || ""),
      tracking_id: String(order.tracking_id || ""),
      tracking_url: String(order.tracking_url || ""),
      estimated_delivery: String(order.estimated_delivery || ""),
      shipping_notes: String(order.shipping_notes || ""),
    });
  }

  async function load({ notifyNew = true }: { notifyNew?: boolean } = {}) {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/orders", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load orders.");
      const next: Order[] = d.orders || [];
      setOrders(next);
      setSelected([]);
      const latest = next[0];
      if (typeof window !== "undefined" && latest) {
        const key = "nagmeena-admin-last-order-created";
        const previous = window.localStorage.getItem(key);
        if (previous && notifyNew) {
          const fresh = next.filter(
            (o) => o.status === "verification_pending" && new Date(o.created_at).getTime() > new Date(previous).getTime(),
          );
          if (fresh.length) setNewOrder(fresh[0]);
        }
        window.localStorage.setItem(key, latest.created_at);
      }
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const upcoming = orders.filter((o) => o.status === "verification_pending");
  const accepted = orders.filter((o) => o.status === "confirmed");
  const rejected = orders.filter((o) => o.status === "cancelled");
  const base = tab === "upcoming" ? upcoming : tab === "accepted" ? accepted : rejected;
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((o) =>
      [
        o.order_code,
        o.customer_name,
        o.customer_phone,
        o.customer_email,
        o.address,
        o.city,
        o.pincode,
        o.tracking_id,
        o.shipping_courier,
        ...(o.items || []).flatMap((i) => [
          i.product_code,
          i.variant_product_code,
          i.variant_custom_code,
          i.variant_color,
          i.product_name,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [base, search]);

  const visible = showMore ? searched : searched.slice(0, 4);
  const now = new Date();
  const monthly = accepted.filter((o) => {
    const d = new Date(o.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthlyTotal = monthly.reduce((s, o) => s + Number(o.amount || 0), 0);
  const customerRecords = useMemo(
    () => orders.filter((o) => o.customer_record_visible !== false).slice(0, 100),
    [orders],
  );
  const visibleCustomerRecords = showAllCustomers ? customerRecords : customerRecords.slice(0, 3);

  async function decide(id: string, status: "confirmed" | "cancelled") {
    setUpdating(id);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not update order.");
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...d.order } : o)));
      if (status === "confirmed") {
        const emailStatus = d.email?.status;
        const suffix =
          emailStatus === "sent"
            ? " Confirmation email sent."
            : emailStatus === "not_provided"
              ? " Customer did not provide email."
              : emailStatus === "not_configured"
                ? " Email service not configured yet."
                : emailStatus === "failed"
                  ? " Order confirmed, but email failed."
                  : "";
        onNotify("success", `Order accepted and confirmed.${suffix}`);
      } else {
        onNotify("success", "Order rejected and stock restored.");
      }
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Could not update order.");
    } finally {
      setUpdating(null);
    }
  }

  async function retryEmail(id: string) {
    setUpdating(id);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "resend_confirmation_email" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not send confirmation email.");
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...d.order } : o)));
      onNotify("success", d.email?.status === "already_sent" ? "Confirmation email was already sent." : "Confirmation email sent.");
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Could not send confirmation email.");
    } finally {
      setUpdating(null);
    }
  }

  async function processReturn(action: "restock" | "delete") {
    if (!returnOrder) return;
    setUpdating(returnOrder.id);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: returnOrder.id, action: "return", returnAction: action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not process return.");
      setOrders((os) => os.map((o) => (o.id === returnOrder.id ? { ...o, ...d.order } : o)));
      setReturnOrder(null);
      onNotify("success", action === "restock" ? "Return completed and stock restored." : "Return recorded without restocking.");
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Could not process return.");
    } finally {
      setUpdating(null);
    }
  }

  async function deleteSelected() {
    if (!selected.length || !window.confirm(`Delete ${selected.length} selected order(s)?`)) return;
    try {
      const r = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not delete orders.");
      setOrders((os) => os.filter((o) => !selected.includes(o.id)));
      setSelected([]);
      onNotify("success", `${d.deleted} order(s) deleted.`);
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Could not delete orders.");
    }
  }

  async function saveTracking(showSuccess = true) {
    if (!customerOrder) return null;
    setSavingTracking(true);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerOrder.id, action: "save_tracking", ...tracking }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save tracking details.");
      const updated = { ...customerOrder, ...d.order };
      setCustomerOrder(updated);
      setOrders((os) => os.map((o) => (o.id === updated.id ? updated : o)));
      if (showSuccess) onNotify("success", "Tracking details saved.");
      return updated;
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Could not save tracking details.");
      return null;
    } finally {
      setSavingTracking(false);
    }
  }

  async function sendTrackingEmail() {
    if (!customerOrder?.customer_email) {
      onNotify("error", "Email not sent — this customer did not provide an email address.");
      return;
    }
    if (!tracking.tracking_id.trim() && !tracking.tracking_url.trim()) {
      onNotify("error", "Email not sent — add a Tracking ID or Tracking URL first.");
      return;
    }
    setSendingTracking(true);
    try {
      const saved = await saveTracking(false);
      if (!saved) return;
      const r = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: saved.id, action: "send_tracking_email" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not send tracking email.");
      const updated = { ...saved, ...d.order };
      setCustomerOrder(updated);
      setOrders((os) => os.map((o) => (o.id === updated.id ? updated : o)));
      onNotify(
        "success",
        `Email sent successfully to ${saved.customer_name || "customer"}${saved.customer_email ? ` • ${saved.customer_email}` : ""}.`,
      );
    } catch (e) {
      onNotify("error", `Email not sent — ${e instanceof Error ? e.message : "please try again."}`);
    } finally {
      setSendingTracking(false);
    }
  }

  async function openCustomerWhatsApp() {
    if (!customerOrder) return;
    const phone = normalizedWhatsApp(customerOrder.customer_phone);
    if (!phone) {
      onNotify("error", "Customer phone number is not valid for WhatsApp.");
      return;
    }
    const saved = await saveTracking(false);
    if (!saved) return;
    const statusUrl = saved.public_token
      ? `${window.location.origin}/payment-status?token=${encodeURIComponent(saved.public_token)}`
      : `${window.location.origin}/orders`;
    const text = [
      `Hello ${saved.customer_name || "there"},`,
      `Your NAGMEENA order ${saved.order_code} has a delivery update.`,
      tracking.shipping_courier ? `Courier: ${tracking.shipping_courier}` : null,
      tracking.tracking_id ? `Tracking ID: ${tracking.tracking_id}` : null,
      tracking.tracking_url ? `Track shipment: ${tracking.tracking_url}` : null,
      tracking.estimated_delivery ? `Estimated delivery: ${tracking.estimated_delivery}` : null,
      `Order status: ${statusUrl}`,
      tracking.shipping_notes ? `Note: ${tracking.shipping_notes}` : null,
      "Thank you for shopping with NAGMEENA.",
    ]
      .filter(Boolean)
      .join("\n\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function removeCustomerRecord() {
    if (!customerOrder) return;
    if (!window.confirm("Remove this entry from Customer Records? The order itself will remain safely stored in Order Management.")) return;
    setRemovingCustomer(true);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerOrder.id, action: "remove_customer_record" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not remove customer record.");
      setOrders((os) => os.map((o) => (o.id === customerOrder.id ? { ...o, customer_record_visible: false } : o)));
      setCustomerOrder(null);
      onNotify("success", "Customer entry removed from Customer Records. The order history is still preserved.");
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Could not remove customer record.");
    } finally {
      setRemovingCustomer(false);
    }
  }

  function exportCsv() {
    const headers = [
      "Order ID",
      "Customer Name",
      "Phone",
      "Email",
      "Address",
      "City",
      "State",
      "PIN",
      "Amount",
      "Status",
      "Courier",
      "Tracking ID",
      "Tracking URL",
      "Estimated Delivery",
      "Created At",
    ];
    const rows = customerRecords.map((o) => [
      o.order_code,
      o.customer_name,
      o.customer_phone,
      o.customer_email,
      o.address,
      o.city,
      o.state,
      o.pincode,
      o.amount,
      o.status,
      o.shipping_courier,
      o.tracking_id,
      o.tracking_url,
      o.estimated_delivery,
      new Date(o.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nagmeena-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allSelected = visible.length > 0 && visible.every((o) => selected.includes(o.id));
  const tabMeta: Array<{ value: Tab; label: string; count: number; helper: string; icon: typeof Clock3 }> = [
    { value: "upcoming", label: "Upcoming", count: upcoming.length, helper: "Needs review", icon: Clock3 },
    { value: "accepted", label: "Accepted", count: accepted.length, helper: "Confirmed orders", icon: CheckCircle2 },
    { value: "rejected", label: "Rejected", count: rejected.length, helper: "Closed / returned", icon: XCircle },
  ];

  return (
    <>
      <section className="mb-6 rounded-[30px] border border-white/50 bg-white/50 p-4 shadow-[0_18px_60px_rgba(17,55,47,0.07)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-gold">Orders</p>
            <h2 className="mt-1 font-heading text-xl">Order Management</h2>
            <p className="mt-1 text-xs text-emerald/50">Review, confirm and manage customer orders from one clean workspace.</p>
          </div>
          <button onClick={() => void load()} className="w-full rounded-full border border-emerald/10 bg-white/75 px-4 py-2.5 text-[11px] font-semibold shadow-sm transition hover:border-gold/25 sm:w-auto">
            Refresh orders
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-emerald/8 bg-white/65 p-3 sm:p-4">
            <p className="text-[9px] uppercase tracking-[.14em] text-emerald/40">Accepted this month</p>
            <p className="mt-1 text-xl font-semibold sm:text-2xl">{monthly.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald/8 bg-white/65 p-3 sm:p-4">
            <p className="text-[9px] uppercase tracking-[.14em] text-emerald/40">Accepted value</p>
            <p className="mt-1 text-xl font-semibold sm:text-2xl">{money(monthlyTotal)}</p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald/40" size={16} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowMore(false);
            }}
            placeholder="Search order, customer, tracking or product"
            className="field !pl-12 !pr-12 text-xs sm:text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald/50">
              Clear
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[24px] border border-emerald/8 bg-white/45 p-1.5">
          {tabMeta.map(({ value, label, count, helper, icon: Icon }) => {
            const active = tab === value;
            const activeClass =
              value === "accepted"
                ? "border-emerald/20 bg-emerald text-white shadow-[0_8px_24px_rgba(31,82,70,.16)]"
                : value === "rejected"
                  ? "border-red-200 bg-red-50 text-red-700 shadow-[0_8px_20px_rgba(185,28,28,.06)]"
                  : "border-gold/25 bg-gold/10 text-gold shadow-[0_8px_20px_rgba(190,145,35,.08)]";
            return (
              <button
                key={value}
                onClick={() => {
                  setTab(value);
                  setShowMore(false);
                  setSelected([]);
                }}
                className={`min-w-0 rounded-[18px] border px-2 py-2.5 text-left transition sm:px-3 ${active ? activeClass : "border-transparent bg-transparent text-emerald/50 hover:bg-white/70"}`}
              >
                <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                  <Icon size={13} />
                  <span className="truncate text-[10px] font-semibold sm:text-[11px]">{label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${active && value === "accepted" ? "bg-white/15 text-white" : "bg-white/75 text-current"}`}>{count}</span>
                </div>
                <p className={`mt-1 hidden text-[9px] sm:block ${active && value === "accepted" ? "text-white/65" : "text-current opacity-55"}`}>{helper}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {visible.length ? (
            <label className="flex items-center gap-2 text-[11px] font-semibold text-emerald/55">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...new Set([...selected, ...visible.map((o) => o.id)])]
                      : selected.filter((id) => !visible.some((o) => o.id === id)),
                  )
                }
              />
              Select visible
            </label>
          ) : (
            <span />
          )}
          <button
            disabled={!selected.length}
            onClick={() => void deleteSelected()}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700 disabled:opacity-35"
          >
            <Trash2 size={13} /> Delete selected
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gold" /></div>
        ) : (
          <div className="mt-4 space-y-3">
            {visible.map((o) => {
              const subtotal = (o.items || []).reduce((s, i) => s + Number(i.line_total || 0), 0);
              const delivery = Math.max(0, Number(o.amount || 0) - subtotal);
              const cardStyle =
                tab === "accepted"
                  ? "border-emerald/15 bg-[linear-gradient(135deg,rgba(255,255,255,.9),rgba(231,242,237,.76))]"
                  : tab === "rejected"
                    ? "border-red-100 bg-[linear-gradient(135deg,rgba(255,255,255,.92),rgba(254,242,242,.78))]"
                    : "border-gold/12 bg-[linear-gradient(135deg,rgba(255,255,255,.92),rgba(250,247,239,.8))]";
              return (
                <article key={o.id} className={`overflow-hidden rounded-[26px] border shadow-[0_10px_32px_rgba(24,57,48,.05)] ${cardStyle}`}>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={selected.includes(o.id)}
                        onChange={(e) => setSelected((current) => (e.target.checked ? [...current, o.id] : current.filter((id) => id !== o.id)))}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="break-all font-mono text-xs font-semibold sm:text-sm">{o.order_code}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${tab === "accepted" ? "bg-emerald text-white" : tab === "rejected" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-gold/10 text-gold ring-1 ring-gold/15"}`}>{formatStatus(tab, o)}</span>
                            {o.tracking_id && <span className="rounded-full border border-gold/20 bg-white px-2 py-1 text-[9px] font-semibold text-gold"><Truck size={10} className="mr-1 inline" />Tracked</span>}
                          </div>
                          <span className="text-sm font-semibold text-emerald">{money(o.amount)}</span>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
                          {o.items?.[0]?.image_url && (
                            <div className="relative h-24 w-20 overflow-hidden rounded-2xl bg-[#eee7da] shadow-sm">
                              <Image src={o.items[0].image_url} alt={o.items[0].product_name} fill sizes="80px" className="object-cover" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-5">{o.items?.map((i) => `${i.product_name}${i.variant_color ? ` (${i.variant_color})` : ""} × ${i.quantity}`).join(", ") || "Order"}</p>
                            <p className="mt-1 text-xs text-emerald/55">{o.customer_name || "Customer"} • {o.customer_phone || "No phone"}</p>
                            <p className="mt-1 text-[11px] text-emerald/40">{new Date(o.created_at).toLocaleString("en-IN")}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full border border-emerald/8 bg-white/80 px-2.5 py-1 text-[10px] font-semibold">Subtotal {money(subtotal)}</span>
                              <span className="rounded-full border border-emerald/8 bg-white/80 px-2.5 py-1 text-[10px] font-semibold">Delivery {delivery ? money(delivery) : "FREE"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={() => openCustomer(o)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald/15 bg-white/85 px-3 py-2 text-[10px] font-semibold transition hover:border-gold/30">
                            <UserRound size={13} /> Customer Info
                          </button>
                          {o.proof_url && <a href={o.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald/15 bg-white/85 px-3 py-2 text-[10px] font-semibold"><ExternalLink size={12} /> Payment proof</a>}
                          {tab === "accepted" && o.customer_email && !o.confirmation_email_sent_at && <button disabled={updating === o.id} onClick={() => void retryEmail(o.id)} className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/5 px-3 py-2 text-[10px] font-semibold"><Mail size={12} /> Send confirmation</button>}
                        </div>

                        {tab === "upcoming" && (
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button disabled={updating === o.id} onClick={() => void decide(o.id, "confirmed")} className="rounded-full bg-emerald px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(31,82,70,.14)] transition hover:-translate-y-px disabled:opacity-50">Accept order</button>
                            <button disabled={updating === o.id} onClick={() => void decide(o.id, "cancelled")} className="rounded-full border border-red-200 bg-white/80 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">Reject</button>
                          </div>
                        )}
                        {tab === "accepted" && <button disabled={updating === o.id} onClick={() => setReturnOrder(o)} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald/15 bg-white/85 px-3 py-2 text-[10px] font-semibold"><RotateCcw size={12} /> Process return</button>}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {!searched.length && <div className="rounded-3xl border border-dashed border-emerald/12 bg-white/45 p-8 text-center text-sm text-emerald/45">No orders match this view.</div>}
            {searched.length > 4 && <button onClick={() => setShowMore((v) => !v)} className="w-full rounded-full border border-emerald/10 bg-white/65 py-2.5 text-xs font-semibold">{showMore ? "Show less" : `View all ${searched.length}`}</button>}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[30px] border border-white/50 bg-white/50 p-4 shadow-[0_18px_60px_rgba(17,55,47,0.07)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-gold">Customers</p>
            <h2 className="mt-1 font-heading text-xl">Customer Records</h2>
            <p className="mt-1 text-xs text-emerald/50">Showing the 3 most recent entries first. Open View all when you need the rest.</p>
          </div>
          <button onClick={exportCsv} disabled={!customerRecords.length} className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/20 bg-white/80 px-4 py-2.5 text-[11px] font-semibold shadow-sm disabled:opacity-35">
            <Download size={14} /> Export CSV ({customerRecords.length})
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCustomerRecords.map((o, index) => (
            <button key={o.id} onClick={() => openCustomer(o)} className="group rounded-[22px] border border-emerald/8 bg-white/70 p-4 text-left shadow-[0_8px_26px_rgba(17,55,47,.04)] transition hover:-translate-y-0.5 hover:border-gold/25 hover:bg-white">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald/5 text-emerald"><UserRound size={15} /></span>
                <span className="rounded-full bg-gold/8 px-2 py-1 text-[9px] font-semibold text-gold">#{index + 1}</span>
              </div>
              <p className="mt-3 truncate text-sm font-semibold">{o.customer_name || "Customer"}</p>
              <p className="mt-1 truncate text-[10px] text-emerald/45">{o.customer_phone || "No phone"}</p>
              <p className="mt-0.5 truncate text-[10px] text-emerald/40">{o.customer_email || "No email provided"}</p>
              <div className="mt-3 flex items-center justify-between border-t border-emerald/7 pt-3">
                <span className="font-mono text-[9px] text-emerald/45">{o.order_code}</span>
                <span className="text-[11px] font-semibold">{money(o.amount)}</span>
              </div>
            </button>
          ))}
        </div>

        {!customerRecords.length && <div className="mt-4 rounded-3xl border border-dashed border-emerald/12 bg-white/45 p-7 text-center text-sm text-emerald/45">No customer records yet.</div>}
        {customerRecords.length > 3 && (
          <button onClick={() => setShowAllCustomers((v) => !v)} className="mt-4 w-full rounded-full border border-emerald/10 bg-white/70 py-3 text-xs font-semibold transition hover:border-gold/25">
            {showAllCustomers ? "Show recent 3" : `View all ${customerRecords.length}`}
          </button>
        )}
      </section>

      {newOrder && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-emerald/55 p-4" onClick={() => setNewOrder(null)}>
          <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-gold/25 bg-base p-6 text-center shadow-[0_30px_90px_rgba(12,38,32,.34)]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setNewOrder(null)} className="absolute right-4 top-4 rounded-full border bg-white p-2"><X size={15} /></button>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald text-white"><PackageCheck size={25} /></span>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.25em] text-gold">New order arrived</p>
            <h3 className="mt-2 font-heading text-2xl">{newOrder.order_code}</h3>
            <p className="mt-2 text-sm text-emerald/55">{newOrder.customer_name || "Customer"} • {money(newOrder.amount)}</p>
            <button onClick={() => { openCustomer(newOrder); setNewOrder(null); }} className="mt-5 w-full rounded-full bg-emerald py-3 text-sm font-semibold text-white">View customer & order</button>
          </div>
        </div>
      )}

      {customerOrder && (
        <div className="fixed inset-0 z-[220] bg-emerald/50 backdrop-blur-sm" onClick={() => setCustomerOrder(null)}>
          <aside className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-base shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-emerald/8 bg-base/95 px-4 py-4 backdrop-blur-xl sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-gold">Customer workspace</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h3 className="break-all font-heading text-xl sm:text-2xl">{customerOrder.order_code}</h3>
                    <span className="rounded-full border border-gold/15 bg-gold/8 px-2.5 py-1 text-[9px] font-semibold text-gold">{customerOrder.status.replaceAll("_", " ")}</span>
                  </div>
                </div>
                <button onClick={() => setCustomerOrder(null)} className="shrink-0 rounded-full border border-emerald/10 bg-white p-2.5 shadow-sm"><X size={16} /></button>
              </div>
            </div>

            <div className="space-y-4 p-4 pb-28 sm:p-5 sm:pb-28">
              <section className="overflow-hidden rounded-[26px] border border-emerald/10 bg-white/75 shadow-[0_10px_30px_rgba(17,55,47,.04)]">
                <div className="border-b border-emerald/7 bg-[linear-gradient(135deg,rgba(31,82,70,.06),rgba(190,145,35,.05))] p-4">
                  <div className="flex items-center gap-2 text-gold"><UserRound size={16} /><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Customer information</span></div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="min-w-0"><h4 className="truncate text-lg font-semibold">{customerOrder.customer_name || "Customer"}</h4><p className="mt-1 text-[11px] text-emerald/45">Placed {new Date(customerOrder.created_at).toLocaleString("en-IN")}</p></div>
                    <span className="shrink-0 text-lg font-semibold text-emerald">{money(customerOrder.amount)}</span>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald/7 bg-base/55 p-3"><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-emerald/40">Phone</p><p className="mt-1.5 break-all text-sm font-medium">{customerOrder.customer_phone || "No phone"}</p></div>
                  <div className="rounded-2xl border border-emerald/7 bg-base/55 p-3"><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-emerald/40">Email</p><p className="mt-1.5 break-all text-sm font-medium">{customerOrder.customer_email || "No email provided"}</p></div>
                </div>
              </section>

              <section className="rounded-[26px] border border-emerald/10 bg-white/75 p-4 shadow-[0_10px_30px_rgba(17,55,47,.04)]">
                <div className="flex items-center gap-2 text-gold"><MapPin size={16} /><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Delivery information</span></div>
                <p className="mt-3 text-sm leading-6 text-emerald/75">{[customerOrder.address, customerOrder.city, customerOrder.state, customerOrder.pincode].filter(Boolean).join(", ") || "No delivery address"}</p>
              </section>

              <section className="rounded-[26px] border border-gold/20 bg-[linear-gradient(145deg,rgba(255,255,255,.82),rgba(190,145,35,.06))] p-4 shadow-[0_10px_30px_rgba(190,145,35,.05)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold"><Truck size={16} /></span>
                  <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold">Shipping & tracking</p><p className="mt-1 text-[11px] leading-5 text-emerald/50">Save once, then use the same information for email, WhatsApp and customer tracking.</p></div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input value={tracking.shipping_courier} onChange={(e) => setTracking((v) => ({ ...v, shipping_courier: e.target.value }))} placeholder="Courier (e.g. Delhivery)" className="field" />
                  <input value={tracking.tracking_id} onChange={(e) => setTracking((v) => ({ ...v, tracking_id: e.target.value }))} placeholder="Tracking ID" className="field" />
                  <input value={tracking.tracking_url} onChange={(e) => setTracking((v) => ({ ...v, tracking_url: e.target.value }))} placeholder="Tracking URL" type="url" className="field sm:col-span-2" />
                  <input value={tracking.estimated_delivery} onChange={(e) => setTracking((v) => ({ ...v, estimated_delivery: e.target.value }))} placeholder="Estimated delivery" className="field sm:col-span-2" />
                  <textarea value={tracking.shipping_notes} onChange={(e) => setTracking((v) => ({ ...v, shipping_notes: e.target.value }))} placeholder="Optional delivery note" rows={3} className="field sm:col-span-2" />
                </div>
                <button disabled={savingTracking} onClick={() => void saveTracking()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-emerald/15 bg-white/85 py-3 text-xs font-semibold shadow-sm">
                  {savingTracking ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />} Save tracking details
                </button>
              </section>

              {customerOrder.tracking_email_sent_at && <p className="rounded-2xl border border-emerald/10 bg-emerald/5 px-4 py-3 text-xs text-emerald/65"><CheckCircle2 size={13} className="mr-1.5 inline" />Last tracking email: {new Date(customerOrder.tracking_email_sent_at).toLocaleString("en-IN")}</p>}
              {customerOrder.tracking_email_last_error && !customerOrder.tracking_email_sent_at && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700"><XCircle size={13} className="mr-1.5 inline" />Last email attempt: {customerOrder.tracking_email_last_error}</p>}

              <section className="rounded-[24px] border border-red-100 bg-white/65 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-red-600">Customer Records cleanup</p>
                <p className="mt-1 text-[11px] leading-5 text-emerald/50">Removes this customer snapshot from Customer Records only. The actual order remains available in Order Management.</p>
                <button disabled={removingCustomer} onClick={() => void removeCustomerRecord()} className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-[11px] font-semibold text-red-700 disabled:opacity-40">
                  {removingCustomer ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Remove from Customer Records
                </button>
              </section>
            </div>

            <div className="fixed bottom-0 right-0 z-20 grid w-full max-w-xl grid-cols-2 gap-2 border-t border-emerald/8 bg-base/95 p-3 backdrop-blur-xl sm:p-4">
              <button disabled={!customerOrder.customer_email || sendingTracking} onClick={() => void sendTrackingEmail()} className="flex items-center justify-center gap-2 rounded-full bg-emerald py-3.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(31,82,70,.15)] disabled:opacity-35">
                {sendingTracking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Email customer
              </button>
              <button disabled={!normalizedWhatsApp(customerOrder.customer_phone)} onClick={() => void openCustomerWhatsApp()} className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(37,211,102,.14)] disabled:opacity-35"><MessageCircle size={16} /> WhatsApp</button>
              {!customerOrder.customer_email && <p className="col-span-2 text-center text-[10px] text-emerald/45">Email is unavailable because this customer did not provide an email address.</p>}
            </div>
          </aside>
        </div>
      )}

      {returnOrder && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-emerald/50 p-4">
          <div className="w-full max-w-md rounded-[30px] bg-base p-6 shadow-2xl">
            <h3 className="font-heading text-2xl">Process return</h3>
            <p className="mt-2 text-sm text-emerald/55">Choose whether returned pieces should go back into inventory.</p>
            <div className="mt-5 grid gap-2">
              <button disabled={updating === returnOrder.id} onClick={() => void processReturn("restock")} className="rounded-2xl bg-emerald px-4 py-4 text-left text-sm font-semibold text-white">Restock returned item<span className="block text-xs font-normal text-white/75">Add the returned quantity back to inventory.</span></button>
              <button disabled={updating === returnOrder.id} onClick={() => void processReturn("delete")} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left text-sm font-semibold text-red-700">Delete / do not restock<span className="block text-xs font-normal text-red-600/70">Record the return without increasing stock.</span></button>
              <button onClick={() => setReturnOrder(null)} className="rounded-full border px-4 py-3 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
