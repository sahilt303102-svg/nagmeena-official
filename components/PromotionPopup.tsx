"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

type Promotion = {
  id:string;
  title:string;
  image_url:string;
  cta_text:string;
  cta_url:string;
  display_seconds:number;
  show_once_per_session:boolean;
  updated_at?:string|null;
};

export default function PromotionPopup(){
  const [promotion,setPromotion]=useState<Promotion|null>(null);
  const [open,setOpen]=useState(false);
  const [progress,setProgress]=useState(100);
  const timerRef=useRef<number|undefined>();

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{
        const r=await fetch("/api/promotion",{cache:"no-store"});
        const d=await r.json().catch(()=>({}));
        const p=d?.promotion as Promotion|null;
        if(cancelled||!r.ok||!p?.image_url)return;
        const key=`nagmeena-promo-seen:${p.id}:${p.updated_at||"v1"}`;
        if(p.show_once_per_session&&sessionStorage.getItem(key)==="1")return;
        setPromotion(p);
        window.setTimeout(()=>{
          if(cancelled)return;
          setOpen(true);
          if(p.show_once_per_session)sessionStorage.setItem(key,"1");
          const total=Math.max(3,Math.min(15,Number(p.display_seconds||6)))*1000;
          const started=Date.now();
          timerRef.current=window.setInterval(()=>{
            const remaining=Math.max(0,total-(Date.now()-started));
            setProgress((remaining/total)*100);
            if(remaining<=0){
              if(timerRef.current)window.clearInterval(timerRef.current);
              setOpen(false);
            }
          },100);
        },450);
      }catch{}
    }
    void load();
    return()=>{cancelled=true;if(timerRef.current)window.clearInterval(timerRef.current);};
  },[]);

  function close(){
    if(timerRef.current)window.clearInterval(timerRef.current);
    setOpen(false);
  }

  return <AnimatePresence>{open&&promotion&&
    <motion.div className="fixed inset-0 z-[180] flex items-center justify-center bg-emerald/60 p-3 sm:p-6"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={close}>
      <motion.div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-gold/25 bg-base shadow-[0_30px_100px_rgba(18,45,38,.38)]"
        initial={{y:25,scale:.97,opacity:0}} animate={{y:0,scale:1,opacity:1}} exit={{y:18,scale:.98,opacity:0}}
        transition={{type:"spring",stiffness:300,damping:28}} onClick={e=>e.stopPropagation()}>
        <div className="relative min-h-[58vh] flex-1 bg-[#eee7da] sm:min-h-[66vh]">
          <Image src={promotion.image_url} alt={promotion.title||"NAGMEENA special offer"} fill priority sizes="(max-width: 768px) 96vw, 768px" className="object-contain"/>
          <button type="button" onClick={close} aria-label="Close offer" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/85 text-emerald shadow-md backdrop-blur-md"><X size={18}/></button>
        </div>
        <div className="border-t border-gold/15 bg-base p-4 sm:p-5">
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-emerald/10"><div className="h-full bg-gold transition-[width] duration-100" style={{width:`${progress}%`}}/></div>
          <a href={promotion.cta_url||"/#collections"} onClick={close} className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-white">{promotion.cta_text||"Browse Collection"}<ArrowRight size={16}/></a>
          <div className="mt-2 text-center"><button type="button" onClick={close} className="rounded-full border border-emerald/15 bg-white px-6 py-2.5 text-xs font-semibold text-emerald">Close & Continue Shopping</button></div>
        </div>
      </motion.div>
    </motion.div>}</AnimatePresence>;
}
