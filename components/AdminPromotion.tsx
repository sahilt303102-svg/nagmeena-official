"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Eye, Loader2, Save, Upload, X } from "lucide-react";

type Promotion={
 id?:string;title:string;image_url:string;image_path?:string|null;cta_text:string;cta_url:string;is_active:boolean;
 starts_at?:string|null;ends_at?:string|null;display_seconds:number;show_once_per_session:boolean;
};
const empty:Promotion={title:"Special Offer",image_url:"",image_path:null,cta_text:"Browse Collection",cta_url:"/#collections",is_active:false,starts_at:null,ends_at:null,display_seconds:6,show_once_per_session:true};

function toLocalInput(value?:string|null){if(!value)return "";const d=new Date(value);const offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,16);}
function toIso(value:string){return value?new Date(value).toISOString():null;}

export default function AdminPromotion({onNotify}:{onNotify:(type:"success"|"error",text:string)=>void}){
 const [form,setForm]=useState<Promotion>(empty),[file,setFile]=useState<File|null>(null),[filePreview,setFilePreview]=useState(""),[previewOpen,setPreviewOpen]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 useEffect(()=>{void (async()=>{try{const r=await fetch("/api/admin/promotion",{cache:"no-store"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load offer poster.");if(d.promotion)setForm(d.promotion);}catch(e){onNotify("error",e instanceof Error?e.message:"Could not load offer poster.");}finally{setLoading(false);}})();},[]);
 useEffect(()=>()=>{if(filePreview)URL.revokeObjectURL(filePreview);},[filePreview]);
 const previewUrl=filePreview||form.image_url;
 async function save(){
  setSaving(true);
  try{
   let next={...form};
   if(file){
    const fd=new FormData();fd.append("file",file);fd.append("uploadType","promotion");
    const ur=await fetch("/api/admin/upload",{method:"POST",body:fd}),ud=await ur.json();
    if(!ur.ok)throw new Error(ud.error||"Poster upload failed.");
    next={...next,image_url:ud.url,image_path:ud.filePath};
   }
   const payload={...next,starts_at:toIso(String(next.starts_at||"")),ends_at:toIso(String(next.ends_at||""))};
   const r=await fetch("/api/admin/promotion",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json();
   if(!r.ok)throw new Error(d.error||"Could not save poster.");
   setForm(d.promotion);setFile(null);if(filePreview)URL.revokeObjectURL(filePreview);setFilePreview("");onNotify("success","Festival / offer popup saved.");
  }catch(e){onNotify("error",e instanceof Error?e.message:"Could not save poster.");}
  finally{setSaving(false);}
 }
 if(loading)return <section className="mb-6 rounded-3xl border border-white/40 bg-white/45 p-6 text-center"><Loader2 className="mx-auto animate-spin text-gold"/></section>;
 return <section className="mb-6 rounded-3xl border border-white/40 bg-white/45 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl sm:p-6">
  <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Homepage</p><h2 className="mt-1 font-heading text-xl">Festival / Offer Popup</h2><p className="mt-1 text-xs leading-5 text-emerald/50">A short full-screen poster shown after homepage load. Default 6 seconds, with an immediate close button and once-per-session protection.</p></div>
  <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
   <div className="rounded-2xl border border-emerald/10 bg-white/60 p-3">
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#eee7da]">{previewUrl?<Image src={previewUrl} alt={form.title} fill sizes="360px" className="object-contain" unoptimized={Boolean(filePreview)}/>:<div className="flex h-full items-center justify-center px-6 text-center text-xs text-emerald/40">Upload your festival / discount poster</div>}</div>
    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-emerald/20 bg-white px-4 py-3 text-xs font-semibold"><Upload size={14}/> {file?file.name:"Choose Poster"}<input type="file" accept="image/*" className="hidden" onChange={e=>{const next=e.target.files?.[0]||null;setFile(next);if(filePreview)URL.revokeObjectURL(filePreview);setFilePreview(next?URL.createObjectURL(next):"");}}/></label>
   </div>
   <div className="grid content-start gap-3 sm:grid-cols-2">
    <input className="field sm:col-span-2" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Offer title"/>
    <input className="field" value={form.cta_text} onChange={e=>setForm({...form,cta_text:e.target.value})} placeholder="CTA text"/>
    <input className="field" value={form.cta_url} onChange={e=>setForm({...form,cta_url:e.target.value})} placeholder="/#collections"/>
    <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald/45">Starts (optional)</label><input type="datetime-local" className="field" value={toLocalInput(form.starts_at)} onChange={e=>setForm({...form,starts_at:e.target.value})}/></div>
    <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald/45">Ends (optional)</label><input type="datetime-local" className="field" value={toLocalInput(form.ends_at)} onChange={e=>setForm({...form,ends_at:e.target.value})}/></div>
    <div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald/45">Display seconds</label><input type="number" min={3} max={15} className="field" value={form.display_seconds} onChange={e=>setForm({...form,display_seconds:Number(e.target.value||6)})}/></div>
    <div className="flex flex-col justify-center gap-2 rounded-2xl border border-emerald/10 bg-white/60 p-3 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/> Enable popup</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.show_once_per_session} onChange={e=>setForm({...form,show_once_per_session:e.target.checked})}/> Show once per session</label></div>
    <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2"><button type="button" onClick={()=>setPreviewOpen(true)} disabled={!previewUrl} className="flex items-center justify-center gap-2 rounded-full border border-emerald/15 bg-white py-3.5 text-sm font-semibold disabled:opacity-40"><Eye size={16}/> Preview Popup</button><button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-sand to-gold py-3.5 text-sm font-semibold text-white shadow-gold disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} Save Offer Popup</button></div>
   </div>
  </div>
  {previewOpen&&previewUrl&&<div className="fixed inset-0 z-[220] flex items-center justify-center bg-emerald/60 p-3 sm:p-6" onClick={()=>setPreviewOpen(false)}><div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-gold/25 bg-base shadow-2xl" onClick={e=>e.stopPropagation()}><div className="relative min-h-[58vh] flex-1 bg-[#eee7da] sm:min-h-[66vh]"><Image src={previewUrl} alt={form.title||"Offer preview"} fill sizes="(max-width:768px) 96vw,768px" className="object-contain" unoptimized={Boolean(filePreview)}/><button type="button" onClick={()=>setPreviewOpen(false)} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/90 text-emerald shadow-md"><X size={18}/></button></div><div className="border-t border-gold/15 bg-base p-4 sm:p-5"><div className="flex w-full items-center justify-center rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-white">{form.cta_text||"Browse Collection"}</div><button type="button" onClick={()=>setPreviewOpen(false)} className="mx-auto mt-2 block rounded-full border border-emerald/15 bg-white px-6 py-2.5 text-xs font-semibold text-emerald">Close Preview</button></div></div></div>}
 </section>;
}
