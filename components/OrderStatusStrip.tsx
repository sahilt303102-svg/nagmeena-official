"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Clock3, X, XCircle } from "lucide-react";
import { forgetOrder, readRememberedOrders, updateRememberedOrder } from "@/lib/order-client";

type Row = { token: string; order: any; returnedVisit: boolean };
type Celebration = { rows: Row[]; returnedVisit: boolean; kind: "confirmed" | "rejected" };

function isConfirmed(status: string) {
  return status === "confirmed" || status === "verified";
}
function isPending(status: string) {
  return status === "verification_pending" || status === "payment_pending";
}
function isRejected(status: string) { return status === "cancelled" || status === "rejected"; }

export default function OrderStatusStrip() {
  const [rows, setRows] = useState<Row[]>([]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const mountedAt = useRef(Date.now());
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const memories = readRememberedOrders();
      const next: Row[] = [];
      const newlyConfirmed: Row[] = [];
      const newlyRejected: Row[] = [];
      const returnedVisit = Date.now() - mountedAt.current < 7000;

      await Promise.all(memories.map(async (mem) => {
        try {
          const response = await fetch(`/api/orders/status?token=${encodeURIComponent(mem.token)}`, { cache: "no-store" });
          const data = await response.json().catch(() => ({}));

          if (response.status === 404 || response.status === 410) {
            forgetOrder(mem.token);
            return;
          }
          if (!response.ok || !data.order) return;

          const status = String(data.order.status || "");
          if (isConfirmed(status)) {
            const transitioned = !isConfirmed(String(mem.lastStatus || ""));
            if (!mem.celebrationSeen && transitioned) {
              newlyConfirmed.push({ token: mem.token, order: data.order, returnedVisit });
              updateRememberedOrder(mem.token, {
                lastStatus: "confirmed",
                celebrationSeen: true,
                confirmedSeenAt: Date.now(),
              });
            } else if (mem.lastStatus !== "confirmed") {
              updateRememberedOrder(mem.token, { lastStatus: "confirmed" });
            }

            // Confirmed orders stay in the shared status surface for 15 seconds.
            const confirmedAt = mem.confirmedSeenAt || Date.now();
            if (Date.now() - confirmedAt < 15000 || newlyConfirmed.some((row) => row.token === mem.token)) {
              next.push({ token: mem.token, order: data.order, returnedVisit });
            }
            return;
          }

          if (isRejected(status)) {
            const transitioned = !isRejected(String(mem.lastStatus || ""));
            if (!(mem as any).rejectionSeen && transitioned) {
              newlyRejected.push({ token: mem.token, order: data.order, returnedVisit });
              updateRememberedOrder(mem.token, { lastStatus: "cancelled", rejectionSeen: true, rejectedSeenAt: Date.now() } as any);
            } else if (mem.lastStatus !== "cancelled") updateRememberedOrder(mem.token, { lastStatus: "cancelled" });
            const rejectedAt=(mem as any).rejectedSeenAt||Date.now();
            if(Date.now()-rejectedAt<15000||newlyRejected.some(row=>row.token===mem.token))next.push({token:mem.token,order:data.order,returnedVisit});
            return;
          }
          if (status !== mem.lastStatus) updateRememberedOrder(mem.token, { lastStatus: status });
          if (isPending(status)) next.push({ token: mem.token, order: data.order, returnedVisit });
          else if (status === "expired") forgetOrder(mem.token);
        } catch {
          // Connectivity interruptions never erase a customer's remembered order.
        }
      }));

      // Newest order first keeps the latest action the most accessible.
      next.sort((a, b) => String(b.order.created_at || "").localeCompare(String(a.order.created_at || "")));
      setRows(next);
      if (newlyConfirmed.length) {
        newlyConfirmed.sort((a, b) => String(b.order.created_at || "").localeCompare(String(a.order.created_at || "")));
        setCelebration({ rows: newlyConfirmed, returnedVisit, kind: "confirmed" });
      } else if (newlyRejected.length) {
        newlyRejected.sort((a, b) => String(b.order.created_at || "").localeCompare(String(a.order.created_at || "")));
        setCelebration({ rows: newlyRejected, returnedVisit, kind: "rejected" });
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 8000);
    const onChange = () => void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("nagmeena-orders-change", onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("nagmeena-orders-change", onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!celebration) return;
    const timeout = window.setTimeout(() => setCelebration(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  useEffect(() => {
    const terminalRows = rows.filter((row) => isConfirmed(String(row.order.status || "")) || isRejected(String(row.order.status || "")));
    if (!terminalRows.length) return;
    const timers = terminalRows.map((row) => {
      const mem = readRememberedOrders().find((item) => item.token === row.token);
      const seenAt=isRejected(String(row.order.status||""))?(mem as any)?.rejectedSeenAt:mem?.confirmedSeenAt;
      const elapsed=seenAt?Date.now()-seenAt:0;
      const remaining = Math.max(250, 15000 - elapsed);
      return window.setTimeout(() => {
        // Hide only the temporary confirmed state; keep the private token so Orders can still show history on this device.
        setRows((current) => current.filter((item) => item.token !== row.token));
      }, remaining);
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [rows.map((row) => `${row.token}:${row.order.status}`).join("|")]);

  const pending = useMemo(() => rows.filter((row) => isPending(String(row.order.status || ""))), [rows]);
  const confirmed = useMemo(() => rows.filter((row) => isConfirmed(String(row.order.status || ""))), [rows]);
  const rejected = useMemo(() => rows.filter((row) => isRejected(String(row.order.status || ""))), [rows]);
  const latest = rows[0];
  const celebrationTarget = celebration?.rows[0];
  const celebrationCount = celebration?.rows.length || 0;

  const title = rejected.length
    ? `${rejected.length === 1 ? "Order" : `${rejected.length} orders`} not approved`
    : confirmed.length && pending.length
      ? `${confirmed.length} confirmed · ${pending.length} under review`
      : confirmed.length
        ? `${confirmed.length === 1 ? "Order" : `${confirmed.length} orders`} confirmed`
        : pending.length === 1 ? "1 order under review" : `${pending.length} orders under review`;
  const subtitle = rejected.length
    ? "View details · this notice closes in 15 seconds"
    : confirmed.length && pending.length
      ? "Your newest order statuses are together here"
      : confirmed.length ? "View receipt · confirmation closes in 15 seconds" : "Manual verification is in progress";

  if (!latest && !celebration) return null;

  return (
    <>
      <AnimatePresence>
        {celebration && celebrationTarget && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-emerald/55 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 24, scale: 0.975, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.985, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 27 }}
              className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-gold/25 bg-base p-7 text-center shadow-[0_30px_90px_rgba(12,38,32,.34)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gold" />
              <button
                onClick={() => setCelebration(null)}
                aria-label="Close confirmation"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-emerald/10 bg-white/75 text-emerald/65 shadow-sm transition hover:bg-white"
              >
                <X size={15} />
              </button>

              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border shadow-[0_10px_30px_rgba(35,77,67,.12)] ${celebration.kind==="rejected"?"border-red-200 bg-red-600 text-white":"border-gold/25 bg-emerald text-white"}`}>{celebration.kind==="rejected"?<XCircle size={30} strokeWidth={1.8}/>:<CheckCircle2 size={30} strokeWidth={1.8}/>}</div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.3em] text-gold">NAGMEENA</p>
              <h2 className="mt-2 font-heading text-[2rem] leading-tight text-emerald">
                {celebration.kind==="rejected"?(celebrationCount>1?`${celebrationCount} orders were not approved`:"Your order was not approved"):(celebrationCount>1?`${celebrationCount} orders confirmed`:"Your order is confirmed")}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-emerald/65">
                {celebration.kind==="rejected"?`Order ${celebrationTarget.order.order_code} was not approved. Open the order for details or continue shopping.`:celebrationCount>1?"Your confirmed orders are ready to view.":`Order ${celebrationTarget.order.order_code} has been verified successfully.`}
              </p>
              {celebration.returnedVisit && (
                <p className="mt-2 text-xs font-medium text-emerald/45">{celebration.kind==="rejected"?"Updated while you were away.":"Confirmed while you were away."}</p>
              )}
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <a
                  href={`/payment-status?token=${encodeURIComponent(celebrationTarget.token)}`}
                  className="rounded-full bg-emerald px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(42,69,63,.20)]"
                >
                  {celebration.kind==="rejected"?"View Order":"View Receipt"}
                </a>
                <button
                  onClick={() => setCelebration(null)}
                  className="rounded-full border border-gold/25 bg-white px-5 py-3 text-sm font-semibold text-emerald"
                >
                  Continue Shopping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {latest && (
        <motion.a
          initial={{ y: 24, opacity: 0, scale: 0.985 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          href="/orders"
          className={`fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-2xl items-center justify-between gap-3 overflow-hidden rounded-[22px] border px-4 py-3 shadow-[0_18px_52px_rgba(26,59,51,.22)] sm:bottom-5 sm:px-5 ${rejected.length?"border-red-200 bg-red-50 text-red-700":confirmed.length?"border-emerald bg-emerald text-white":"border-gold/30 bg-base text-emerald"}`}
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gold" />
          <span className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${rejected.length?"border-red-200 bg-white text-red-600":confirmed.length ? "border-white/20 bg-white/10 text-white" : "border-gold/30 bg-gold/10 text-gold"}`}>
              {rejected.length?<XCircle size={20}/>:confirmed.length ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
            </span>
            <span className="min-w-0">
              <b className="block text-sm">{title}</b>
              <span className={`block truncate text-[11px] ${rejected.length?"text-red-600/70":confirmed.length?"text-white/70":"text-emerald/60"}`}>{subtitle}</span>
            </span>
          </span>
          <span className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${rejected.length?"border-red-200 bg-white text-red-700":confirmed.length?"border-white/20 bg-white/10 text-white":"border-emerald/10 bg-white text-emerald"}`}>
            View <ChevronRight size={13} />
          </span>
        </motion.a>
      )}
    </>
  );
}
