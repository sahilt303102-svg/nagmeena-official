"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  PackageOpen,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { forgetOrder, readRememberedOrders, updateRememberedOrder } from "@/lib/order-client";

type Item={
  product_code:string;
  product_name:string;
  image_url?:string|null;
  quantity:number;
  line_total:number;
  variant_product_code?:string|null;
  variant_color?:string|null;
};
type Row={token:string;order:any;items:Item[]};

function money(value:number){return `₹${Number(value||0).toLocaleString("en-IN")}`;}
function statusMeta(status:string){
  if(status==="confirmed"||status==="verified")return{label:"Confirmed",Icon:CheckCircle2,cls:"bg-emerald/8 text-emerald border-emerald/15"};
  if(status==="rejected"||status==="cancelled")return{label:"Not approved",Icon:XCircle,cls:"bg-red-50 text-red-700 border-red-100"};
  return{label:"Under review",Icon:Clock3,cls:"bg-gold/8 text-[#866b32] border-gold/20"};
}
function OrderCard({row}:{row:Row}){
  const {token,order,items}=row,meta=statusMeta(String(order.status||"")),Icon=meta.Icon;
  return <a href={`/payment-status?token=${encodeURIComponent(token)}`} className="group block overflow-hidden rounded-[26px] border border-emerald/8 bg-white/80 shadow-[0_10px_34px_rgba(30,64,56,.08)] transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${meta.cls}`}><Icon size={20}/></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0"><p className="truncate font-mono text-xs font-semibold sm:text-sm">{order.order_code}</p><p className="mt-1 text-[11px] text-emerald/40">{new Date(order.created_at).toLocaleString("en-IN")}</p></div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
          </div>
          <div className="mt-4 space-y-2">
            {(items||[]).slice(0,2).map((item,index)=><div key={`${item.variant_product_code||item.product_code}-${index}`} className="flex items-center gap-3 rounded-2xl bg-base p-2.5">
              <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-[#eee7da]">{item.image_url&&<Image src={item.image_url} alt={item.product_name} fill sizes="48px" className="object-cover"/>}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.product_name}</p><p className="mt-0.5 truncate text-[10px] text-emerald/45">{item.variant_product_code||item.product_code}{item.variant_color?` • ${item.variant_color}`:""} • Qty {item.quantity}</p></div>
              <b className="text-xs">{money(item.line_total)}</b>
            </div>)}
            {items.length>2&&<p className="text-[10px] font-medium text-emerald/45">+{items.length-2} more item{items.length-2===1?"":"s"}</p>}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-emerald/8 pt-3">
            <div><span className="block text-[10px] uppercase tracking-wide text-emerald/40">Order total</span><b className="text-base">{money(Number(order.amount||0))}</b></div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald/55 transition group-hover:text-emerald">View Details <ChevronRight size={15}/></span>
          </div>
        </div>
      </div>
    </div>
  </a>;
}

export default function OrdersPage(){
  const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{
    const memories=readRememberedOrders(),next:Row[]=[];
    await Promise.all(memories.map(async mem=>{
      try{
        const response=await fetch(`/api/orders/status?token=${encodeURIComponent(mem.token)}`,{cache:"no-store"}),data=await response.json().catch(()=>({}));
        if(response.status===404||response.status===410){forgetOrder(mem.token);return;}
        if(!response.ok||!data.order)return;
        const status=String(data.order.status||"");
        if(status==="expired"){forgetOrder(mem.token);return;}
        if(status!==mem.lastStatus)updateRememberedOrder(mem.token,{lastStatus:status});
        next.push({token:mem.token,order:data.order,items:data.items||[]});
      }catch{}
    }));
    next.sort((a,b)=>String(b.order.created_at||"").localeCompare(String(a.order.created_at||"")));
    setRows(next);setLoading(false);
  },[]);
  useEffect(()=>{void refresh();const i=window.setInterval(()=>void refresh(),10000),onChange=()=>void refresh();window.addEventListener("nagmeena-orders-change",onChange);window.addEventListener("focus",onChange);return()=>{window.clearInterval(i);window.removeEventListener("nagmeena-orders-change",onChange);window.removeEventListener("focus",onChange);};},[refresh]);

  const current=useMemo(()=>rows.filter(r=>!["confirmed","verified","cancelled","rejected"].includes(String(r.order.status||""))),[rows]);
  const previous=useMemo(()=>rows.filter(r=>["confirmed","verified","cancelled","rejected"].includes(String(r.order.status||""))),[rows]);

  return <main className="min-h-screen bg-base px-4 pb-16 pt-28 text-emerald sm:px-6">
    <div className="mx-auto max-w-4xl">
      <div className="rounded-[30px] border border-white/60 bg-white/55 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.28em] text-gold">NAGMEENA</p><h1 className="mt-1 font-heading text-3xl">My Orders</h1><p className="mt-2 max-w-xl text-sm leading-6 text-emerald/50">Track current orders and revisit previous orders remembered securely on this device.</p></div>
          <a href="/#collections" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-5 py-3 text-sm font-semibold text-white shadow-md"><ShoppingBag size={16}/> Continue Shopping</a>
        </div>
      </div>

      {loading?<div className="mt-6 rounded-[28px] border border-white/60 bg-white/75 p-10 text-center shadow-sm"><Loader2 className="mx-auto animate-spin text-gold"/><p className="mt-3 text-sm text-emerald/50">Checking your orders…</p></div>
      :rows.length===0?<div className="mt-6 rounded-[28px] border border-white/60 bg-white/75 p-10 text-center shadow-sm"><PackageOpen className="mx-auto text-gold" size={34}/><h2 className="mt-3 font-heading text-xl">No recent orders on this device</h2><p className="mt-2 text-sm text-emerald/50">When you submit an order, its private status will appear here.</p><a href="/#collections" className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-3 text-sm font-semibold text-white"><ShoppingBag size={16}/> Continue Shopping</a></div>
      :<>
        <section className="mt-7"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gold">Active</p><h2 className="font-heading text-2xl">Current Orders</h2></div><span className="rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-xs font-semibold">{current.length}</span></div>{current.length?<div className="space-y-3">{current.map(row=><OrderCard key={row.token} row={row}/>)}</div>:<div className="rounded-3xl border border-dashed border-emerald/12 bg-white/45 p-6 text-center text-sm text-emerald/45">No order is currently under review.</div>}</section>
        <section className="mt-8"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gold">History</p><h2 className="font-heading text-2xl">Previous Orders</h2></div><span className="rounded-full border border-emerald/10 bg-white/60 px-3 py-1 text-xs font-semibold">{previous.length}</span></div>{previous.length?<div className="space-y-3">{previous.map(row=><OrderCard key={row.token} row={row}/>)}</div>:<div className="rounded-3xl border border-dashed border-emerald/12 bg-white/45 p-6 text-center text-sm text-emerald/45">Confirmed or closed orders will appear here.</div>}</section>
        <div className="mt-8 text-center"><a href="/#collections" className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/75 px-6 py-3 text-sm font-semibold shadow-sm"><ShoppingBag size={16}/> Continue Shopping</a></div>
      </>}
    </div>
  </main>;
}
