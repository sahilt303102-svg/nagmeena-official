"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import MobileDrawer from "@/components/MobileDrawer";
import OrderStatusStrip from "@/components/OrderStatusStrip";
import Image from "next/image";
import { readCart } from "@/lib/cart";

type Toast={text:string;image?:string}|null;
export default function HeaderClient(){
 const [drawerOpen,setDrawerOpen]=useState(false); const [cartCount,setCartCount]=useState(0); const [toast,setToast]=useState<Toast>(null);
 useEffect(()=>{const sync=()=>{try{setCartCount(readCart().reduce((sum,item)=>sum+Number(item.quantity||0),0));}catch{setCartCount(0)}};sync();window.addEventListener("nagmeena-cart-change",sync);window.addEventListener("storage",sync);return()=>{window.removeEventListener("nagmeena-cart-change",sync);window.removeEventListener("storage",sync);};},[]);
 useEffect(()=>{let timer:number|undefined;const show=(e:Event)=>{const d=(e as CustomEvent).detail||{};setToast({text:d.text||"Added to your cart",image:d.image});if(timer)window.clearTimeout(timer);timer=window.setTimeout(()=>setToast(null),3200);};window.addEventListener("nagmeena-toast",show as EventListener);return()=>{window.removeEventListener("nagmeena-toast",show as EventListener);if(timer)window.clearTimeout(timer);};},[]);
 return <><Header drawerOpen={drawerOpen} onToggleDrawer={()=>setDrawerOpen(v=>!v)} onOpenCart={()=>{window.location.href="/cart";}} cartCount={cartCount}/><MobileDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)}/><OrderStatusStrip/>{toast&&<button onClick={()=>{setToast(null);window.location.href="/cart";}} className="fixed right-4 top-20 z-[150] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-emerald/15 bg-white/95 px-3 py-3 text-left text-emerald shadow-2xl backdrop-blur-xl"><div className="relative h-11 w-9 shrink-0 overflow-hidden rounded-lg bg-[#eee7da]">{toast.image&&<Image src={toast.image} alt="Cart item" fill sizes="36px" className="object-cover"/>}</div><span><b className="block text-sm">Added to cart ✓</b><small className="block max-w-[220px] truncate text-[11px] text-emerald/55">{toast.text}</small></span></button>}</>;
}
