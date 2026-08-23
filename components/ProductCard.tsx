"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  Link2,
  Mail,
  MessageCircle,
  Share2,
  Send,
  X,
} from "lucide-react";
import { Product, ProductVariant } from "@/lib/products";
import { addToCart, cartItemKey, getCartQuantity, readCart, setQuantity } from "@/lib/cart";

function stockLabel(status: Product["stockStatus"]) {
  return { in_stock: "In Stock", low_stock: "Low Stock", out_of_stock: "Out of Stock", preorder: "Pre-Order" }[status];
}

function stockClass(status: Product["stockStatus"]) {
  return { in_stock: "border-emerald/20 bg-emerald text-white", low_stock: "border-amber-300 bg-amber-100 text-amber-800", out_of_stock: "border-red-200 bg-red-100 text-red-700", preorder: "border-gold/30 bg-gold/10 text-gold" }[status];
}

function SpecRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 border-t border-emerald/10 py-2.5 text-sm">
      <dt className="w-20 shrink-0 font-medium text-gold">{label}</dt>
      <dd className="min-w-0 text-emerald/80">{value}</dd>
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareState, setShareState] = useState("Share");
  const primaryVariant = product.variants?.find((v) => v.isPrimary && v.isActive) || product.variants?.find((v) => v.isActive) || null;
  const preferredVariant = product.variants?.find((v) => v.isPrimary && v.isActive && v.stockQuantity > 0) || product.variants?.find((v) => v.isActive && v.stockQuantity > 0) || primaryVariant;
  const [selectedVariantId, setSelectedVariantId] = useState(preferredVariant?.id || "");
  const [cartQty, setCartQty] = useState(0);
  const [toast,setToast]=useState("");
  const touchStartX = useRef<number | null>(null);

  const imageList = product.images.length ? product.images : [{ url: "/logo.jpg", sortOrder: 0, isPrimary: true }];
  const detailImage = imageList[detailImageIndex] || imageList[0];
  const price = product.price == null ? null : `₹${product.price.toLocaleString("en-IN")}`;
  const hasUpperSpecs = Object.values(product.specifications.upper).some(Boolean);
  const hasBottomSpecs = Object.values(product.specifications.bottom).some(Boolean);
  const hasDupattaSpecs = Object.values(product.specifications.dupatta).some(Boolean);
  const variants = (product.variants || []).filter((v) => v.isActive);
  const selectedVariant: ProductVariant | null = variants.find((v) => v.id === selectedVariantId) || preferredVariant || primaryVariant;
  const selectedStock = selectedVariant ? selectedVariant.stockQuantity : Number(product.stockQuantity || 0);
  const selectedStatus: Product["stockStatus"] = selectedStock <= 0 ? "out_of_stock" : selectedStock <= 2 ? "low_stock" : "in_stock";
  const selectedCode = selectedVariant?.productCode || product.productCode;
  const selectedCustomCode = selectedVariant?.customCode || null;

  const buildProductUrl = () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("product", product.productCode);
    return url.toString();
  };

  const shareText = [
    `NAGMEENA — ${product.name}`,
    `Product Code: ${selectedCode}`,
    product.price != null ? `Price: ₹${product.price.toLocaleString("en-IN")}` : null,
    product.fabric ? `Fabric: ${product.fabric}` : null,
    product.work ? `Work: ${product.work}` : null,
    selectedVariant?.color ? `Color: ${selectedVariant.color}` : (product.color ? `Color: ${product.color}` : null),
    hasUpperSpecs ? `Upper: ${Object.entries(product.specifications.upper).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(", ")}` : null,
    hasBottomSpecs ? `Bottom: ${Object.entries(product.specifications.bottom).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(", ")}` : null,
    hasDupattaSpecs ? `Dupatta: ${Object.entries(product.specifications.dupatta).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(", ")}` : null,
  ].filter(Boolean).join("\n");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("product") === product.productCode) {
      setDetailImageIndex(0);
      setDetailsOpen(true);
    }
  }, [product.productCode]);

  useEffect(() => {
    if (!detailsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [detailsOpen]);

  useEffect(() => {
    if (!detailsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
      if (event.key === "ArrowLeft") setDetailImageIndex((v) => (v - 1 + imageList.length) % imageList.length);
      if (event.key === "ArrowRight") setDetailImageIndex((v) => (v + 1) % imageList.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailsOpen, imageList.length]);

  useEffect(() => {
    if (!variants.length) return;
    const current = variants.find(v => v.id === selectedVariantId);
    if (current && current.stockQuantity > 0) return;
    const replacement = variants.find(v => v.isPrimary && v.stockQuantity > 0) || variants.find(v => v.stockQuantity > 0);
    if (replacement && replacement.id !== selectedVariantId) {
      setSelectedVariantId(replacement.id);
      if (current) { setToast(`${current.color} is sold out — ${replacement.color} selected instead.`); window.setTimeout(()=>setToast(""),2600); }
    }
  }, [variants, selectedVariantId]);

  useEffect(() => {
    const sync = () => setCartQty(getCartQuantity(product, selectedVariant));
    sync();
    window.addEventListener("nagmeena-cart-change", sync);
    return () => window.removeEventListener("nagmeena-cart-change", sync);
  }, [product, selectedVariantId]);

  function closeDetails() {
    setDetailsOpen(false);
    setShareOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.get("product") === product.productCode) {
      url.searchParams.delete("product");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  function openDetails() {
    setDetailImageIndex(0);
    setDetailsOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("product", product.productCode);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function shareProduct() {
    const url = buildProductUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: `NAGMEENA — ${product.name}`, text: shareText, url });
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setShareState("Copied");
      window.setTimeout(() => setShareState("Share"), 1600);
    } catch {
      // User cancelled the native share sheet.
    }
  }

  async function copyProductLink() {
    const text = `${shareText}\n${buildProductUrl()}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const area=document.createElement("textarea"); area.value=text; area.style.position="fixed"; area.style.opacity="0"; document.body.appendChild(area); area.select(); const ok=document.execCommand("copy"); area.remove(); if(!ok) throw new Error("copy failed"); }
      setShareState("Copied");
      window.setTimeout(() => setShareState("Share"), 1600);
      setShareOpen(false);
    } catch { setShareState("Copy failed"); window.setTimeout(()=>setShareState("Share"),1800); }
  }

  function socialUrl(network: "whatsapp" | "facebook" | "x" | "telegram" | "linkedin" | "pinterest" | "email") {
    const url = buildProductUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(shareText);
    const imageUrl = detailImage.url.startsWith("http") ? detailImage.url : new URL(detailImage.url, window.location.origin).toString();
    const image = encodeURIComponent(imageUrl);
    if (network === "whatsapp") return `https://wa.me/?text=${encodedText}%0A${encodedUrl}`;
    if (network === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    if (network === "x") return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    if (network === "telegram") return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    if (network === "linkedin") return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    if (network === "pinterest") return `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&media=${image}&description=${encodedText}`;
    return `mailto:?subject=${encodeURIComponent(`NAGMEENA — ${product.name}`)}&body=${encodedText}%0A${encodedUrl}`;
  }

  function openSocial(network: "whatsapp" | "facebook" | "x" | "telegram" | "linkedin" | "pinterest" | "email") {
    window.open(socialUrl(network), "_blank", "noopener,noreferrer,width=720,height=620");
    setShareOpen(false);
  }

  function scrollCardImage(direction: "prev" | "next") {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction === "next" ? track.clientWidth : -track.clientWidth, behavior: "smooth" });
  }

  const previousImage = () => setDetailImageIndex((v) => (v - 1 + imageList.length) % imageList.length);
  const nextImage = () => setDetailImageIndex((v) => (v + 1) % imageList.length);

  function addProductToCart() {
    const result = addToCart(product, selectedVariant);
    if (!result.ok) {
      const text = result.reason === "max_stock" ? `Only ${selectedStock} piece${selectedStock === 1 ? "" : "s"} available in ${selectedVariant?.color || "this option"}.` : "This colour is out of stock.";
      window.dispatchEvent(new CustomEvent("nagmeena-toast", { detail: { text, image: imageList[0]?.url, error: true } }));
      return;
    }
    setCartQty(result.quantity);
    window.dispatchEvent(new CustomEvent("nagmeena-toast", { detail: { text: `${product.name}${selectedVariant?.color ? ` — ${selectedVariant.color}` : ""} added to your cart`, image: imageList[0]?.url } }));
  }
  function changeCardQuantity(next:number){
    const key = selectedVariant?.id || selectedVariant?.productCode || product.productCode;
    const result=setQuantity(key,next,selectedStock); setCartQty(result.quantity);
    if(!result.ok && result.reason==="max_stock") window.dispatchEvent(new CustomEvent("nagmeena-toast",{detail:{text:`Only ${selectedStock} available in ${selectedVariant?.color || "this option"}.`,error:true}}));
  }

  function buyNow() {
    if (selectedStatus === "out_of_stock") return;
    const params = new URLSearchParams({ product: product.productCode });
    if (selectedVariant?.id) params.set("variant", selectedVariant.id);
    window.location.href = `/buy-now?${params.toString()}`;
  }

  function handleDetailTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleDetailTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = event.changedTouches[0]?.clientX;
    if (end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 45 || imageList.length < 2) return;
    if (delta < 0) nextImage();
    else previousImage();
  }

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-3xl border border-white/30 bg-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.6)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.12),inset_0_1px_1px_0_rgba(255,255,255,0.8)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[calc(1.5rem-1px)]">
          <div ref={trackRef} onScroll={() => { const track = trackRef.current; if (track) setActiveSlide(Math.round(track.scrollLeft / track.clientWidth)); }} className="no-scrollbar flex h-full snap-x-mandatory overflow-x-auto">
            {imageList.map((image, i) => (
              <div key={image.id || `${image.url}-${i}`} className="relative h-full w-full flex-shrink-0 snap-start bg-gradient-to-br from-[#f2ece0] to-[#e8ddc9]">
                {image.url.startsWith("http") ? (
                  <img src={`${image.url}${image.url.includes("?") ? "&" : "?"}tr=w-900`} alt={`${product.productCode} — view ${i + 1}`} loading="lazy" fetchPriority="low" className="h-full w-full object-cover object-center brightness-[0.98] transition-transform duration-500 hover:scale-105" />
                ) : (
                  <Image src={image.url} alt={`${product.productCode} — view ${i + 1}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover object-center brightness-[0.98] transition-transform duration-500 hover:scale-105" priority={false} />
                )}
              </div>
            ))}
          </div>
          {imageList.length > 1 && <>
            <div className="absolute bottom-3 left-3 right-3 hidden items-center justify-between md:flex">
              <motion.button type="button" onClick={() => scrollCardImage("prev")} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} aria-label="Previous product image" className="flex h-9 w-11 items-center justify-center rounded-full border border-white/55 bg-white/85 text-emerald shadow-md backdrop-blur-md"><ChevronLeft size={18} /></motion.button>
              <div className="pointer-events-none flex items-center gap-1.5 rounded-full border border-white/30 bg-white/45 px-3 py-1.5 backdrop-blur-md">{imageList.map((image, i) => <span key={image.id || i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlide ? "w-4 bg-gold" : "w-1.5 bg-emerald/20"}`} />)}</div>
              <motion.button type="button" onClick={() => scrollCardImage("next")} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} aria-label="Next product image" className="flex h-9 w-11 items-center justify-center rounded-full border border-white/55 bg-white/85 text-emerald shadow-md backdrop-blur-md"><ChevronRight size={18} /></motion.button>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/30 bg-white/40 px-3 py-1.5 backdrop-blur-md md:hidden">{imageList.map((image, i) => <span key={image.id || i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlide ? "w-4 bg-gold" : "w-1.5 bg-emerald/20"}`} />)}</div>
            <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/30 bg-white/40 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-wide text-emerald/80 backdrop-blur-md md:hidden">Swipe <ChevronRight size={11} /></div>
          </>}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 font-heading text-lg font-medium text-emerald">{product.name}</h3>
            <span className={`mt-1 flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-wide shadow-sm ${stockClass(selectedStatus)}`}>
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full bg-current align-middle ${selectedStatus === "in_stock" || selectedStatus === "low_stock" ? "animate-pulse" : ""}`} />
              {stockLabel(selectedStatus)}
            </span>
          </div>
          <div className="mt-3 rounded-2xl border border-emerald/8 bg-white/45 p-3.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold/85">Product code</p><p className="mt-1 truncate text-xs font-semibold text-emerald/80">{selectedCode}</p></div>
              {price && <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold/85">Price</p><p className="mt-1 text-sm font-semibold text-emerald">{price}</p></div>}
              {product.fabric && <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold/85">Fabric</p><p className="mt-1 truncate text-sm text-emerald/75">{product.fabric}</p></div>}
              {product.work && <div className="min-w-0 text-right"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold/85">Work</p><p className="mt-1 truncate text-sm text-emerald/75">{product.work}</p></div>}
            </div>
            {selectedCustomCode && <div className="mt-3 border-t border-emerald/8 pt-2.5"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold/75">Custom code</p><p className="mt-1 break-all font-mono text-[11px] text-emerald/55">{selectedCustomCode}</p></div>}
          </div>
          {variants.length > 0 && <div className="mt-3 rounded-2xl border border-emerald/8 bg-white/35 p-3.5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold/85">Colour</p><p className="mt-0.5 text-sm font-semibold text-emerald/80">{selectedVariant?.color}{selectedVariant?.isPrimary ? " · Primary" : ""}</p></div><span className="text-[10px] font-medium text-emerald/45">{selectedStock} available</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{variants.map(v=>{const active=v.id===selectedVariant?.id;return <button type="button" key={v.id} disabled={v.stockQuantity<=0} onClick={()=>setSelectedVariantId(v.id)} aria-pressed={active} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active?"border-gold bg-gold/10 text-emerald shadow-sm":"border-emerald/10 bg-white/75 text-emerald/65 hover:border-emerald/25"} disabled:cursor-not-allowed disabled:border-red-100 disabled:bg-red-50 disabled:text-red-400 disabled:line-through`}>{v.color}{v.stockQuantity<=0?" · Out":""}</button>})}</div></div>}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <motion.button type="button" onClick={openDetails} whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 24 }} className="group flex min-w-0 items-center justify-center gap-1.5 rounded-full border border-emerald/15 bg-white/60 px-3 py-3 text-[0.68rem] font-semibold uppercase tracking-wide text-emerald shadow-sm transition-[background-color,box-shadow,transform] duration-300 hover:bg-white/85 hover:shadow-md"><Info size={14} className="shrink-0 transition-transform duration-300 group-hover:rotate-6" /> More Info</motion.button>
            <motion.button type="button" onClick={buyNow} disabled={product.price == null || selectedStatus === "out_of_stock"} whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 24 }} className="flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-emerald px-3 py-3 text-[0.68rem] font-semibold uppercase tracking-wide text-white shadow-[0_8px_22px_rgba(42,69,63,0.18)] transition-all duration-300 hover:bg-emerald/90 disabled:cursor-not-allowed disabled:opacity-40"><span>Buy Now</span></motion.button>
          </div>
          {cartQty > 0 ? <div className="mt-2.5 rounded-full border border-emerald/15 bg-white/75 px-3 py-2"><div className="flex w-full items-center justify-center gap-4"><button type="button" onClick={()=>changeCardQuantity(cartQty-1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald/15 bg-white text-lg font-semibold">−</button><span className="min-w-6 text-center text-sm font-semibold">{cartQty}</span><button type="button" onClick={()=>changeCardQuantity(cartQty+1)} disabled={cartQty>=selectedStock || selectedStock<=0} aria-label={cartQty>=selectedStock?`Maximum ${selectedStock} available for ${selectedVariant?.color || "this option"}`:"Increase quantity"} className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald/15 bg-white text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-35">+</button></div>{cartQty>=selectedStock&&selectedStock>0&&<p className="mt-1 text-center text-[9px] font-medium text-emerald/45">Maximum available for {selectedVariant?.color || "this option"}</p>}</div> : <motion.button type="button" onClick={addProductToCart} disabled={product.price == null || selectedStatus === "out_of_stock"} whileTap={{scale:.98}} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full border border-emerald/15 bg-white/70 px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-emerald transition hover:bg-white disabled:opacity-40">Add to Cart</motion.button>}
        </div>
      </motion.article>

      <AnimatePresence>{toast&&<motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}} className="fixed bottom-5 left-1/2 z-[180] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-gold/20 bg-base/95 px-4 py-3 text-center text-xs font-semibold text-emerald shadow-xl backdrop-blur-xl">{toast}</motion.div>}</AnimatePresence>

      <AnimatePresence>
        {detailsOpen && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 p-3 backdrop-blur-md sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: "easeOut" }} onClick={closeDetails}>
            <motion.div role="dialog" aria-modal="true" aria-label={`${product.name} details`} className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-white/50 bg-white/80 shadow-[0_25px_80px_rgba(0,0,0,0.16)] backdrop-blur-2xl" initial={{ opacity: 0, y: 28, scale: 0.965 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.975 }} transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }} onClick={(event) => event.stopPropagation()}>
              <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
                <div className="relative">
                  <motion.button type="button" onClick={() => setShareOpen((v) => !v)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} aria-label="Share this suit" aria-expanded={shareOpen} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/85 text-emerald shadow-md backdrop-blur-md transition-colors duration-300 hover:bg-white"><Share2 size={17} /></motion.button>
                  <AnimatePresence>
                    {shareOpen && <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-xl backdrop-blur-xl">
                      <button type="button" onClick={shareProduct} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-emerald hover:bg-emerald/5"><Share2 size={15} /> Share to apps</button>
                      <div className="my-1 border-t border-emerald/8" />
                      <button type="button" onClick={() => openSocial("whatsapp")} className="share-item"><MessageCircle size={15} /> WhatsApp</button>
                      <button type="button" onClick={() => openSocial("facebook")} className="share-item"><span className="w-[15px] text-center font-bold">f</span> Facebook</button>
                      <button type="button" onClick={() => openSocial("x")} className="share-item"><span className="w-[15px] text-center font-bold">𝕏</span> X</button>
                      <button type="button" onClick={() => openSocial("telegram")} className="share-item"><Send size={15} /> Telegram</button>
                      <button type="button" onClick={() => openSocial("linkedin")} className="share-item"><Link2 size={15} /> LinkedIn</button>
                      <button type="button" onClick={() => openSocial("pinterest")} className="share-item"><span className="w-[15px] text-center font-bold">P</span> Pinterest</button>
                      <button type="button" onClick={() => openSocial("email")} className="share-item"><Mail size={15} /> Email</button>
                      <button type="button" onClick={copyProductLink} className="share-item"><Copy size={15} /> Copy product link</button>
                    </motion.div>}
                  </AnimatePresence>
                </div>
                <motion.button type="button" onClick={closeDetails} whileHover={{ scale: 1.06, rotate: 3 }} whileTap={{ scale: 0.92 }} aria-label="Close details" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/85 text-emerald shadow-md backdrop-blur-md transition-colors duration-300 hover:bg-white"><X size={17} /></motion.button>
              </div>

              <div className="overflow-y-auto px-4 pb-5 pt-16 sm:px-7 sm:pb-7 sm:pt-20">
                <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-2xl bg-[#eee7da] touch-pan-y" onTouchStart={handleDetailTouchStart} onTouchEnd={handleDetailTouchEnd}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={detailImage.url} className="absolute inset-0" initial={{ opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.995 }} transition={{ duration: 0.28, ease: "easeOut" }}>
                      {detailImage.url.startsWith("http") ? <img src={`${detailImage.url}${detailImage.url.includes("?") ? "&" : "?"}tr=w-1200`} alt={product.productCode} className="h-full w-full object-cover" /> : <Image src={detailImage.url} alt={product.productCode} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />}
                    </motion.div>
                  </AnimatePresence>
                  {imageList.length > 1 && <>
                    <motion.button type="button" onClick={previousImage} whileHover={{ scale: 1.08, x: -2 }} whileTap={{ scale: 0.92 }} aria-label="Previous image" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/75 text-emerald shadow-md backdrop-blur-md md:flex"><ChevronLeft size={19} /></motion.button>
                    <motion.button type="button" onClick={nextImage} whileHover={{ scale: 1.08, x: 2 }} whileTap={{ scale: 0.92 }} aria-label="Next image" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/75 text-emerald shadow-md backdrop-blur-md md:flex"><ChevronRight size={19} /></motion.button>
                    <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5 backdrop-blur-md">{imageList.map((image, i) => <span key={image.id || i} className={`h-1.5 rounded-full ${i === detailImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />)}</div>
                  </>}
                </div>

                <motion.div className="mt-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.3 }}>
                  <div className="min-w-0"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold">Product Details</p><h3 className="mt-1 font-heading text-2xl text-emerald">{product.name}</h3><p className="mt-1 text-xs text-emerald/55">Product Code: {selectedCode}</p></div>
                </motion.div>

                {(hasUpperSpecs || hasBottomSpecs || hasDupattaSpecs) && <motion.div className="mt-6 grid gap-4 md:grid-cols-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } } }}>
                  {hasUpperSpecs && <motion.section variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-emerald/10 bg-white/55 p-4"><h4 className="font-heading text-base text-emerald">Upper Specifications</h4><dl className="mt-2"><SpecRow label="Fabric" value={product.specifications.upper.fabric} /><SpecRow label="Work" value={product.specifications.upper.work} /><SpecRow label="Print" value={product.specifications.upper.print} /><SpecRow label="Length" value={product.specifications.upper.length} /></dl></motion.section>}
                  {hasBottomSpecs && <motion.section variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-emerald/10 bg-white/55 p-4"><h4 className="font-heading text-base text-emerald">Bottom Specifications</h4><dl className="mt-2"><SpecRow label="Fabric" value={product.specifications.bottom.fabric} /><SpecRow label="Length" value={product.specifications.bottom.length} /></dl></motion.section>}
                  {hasDupattaSpecs && <motion.section variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-emerald/10 bg-white/55 p-4"><h4 className="font-heading text-base text-emerald">Dupatta Specifications</h4><dl className="mt-2"><SpecRow label="Fabric" value={product.specifications.dupatta.fabric} /><SpecRow label="Work" value={product.specifications.dupatta.work} /><SpecRow label="Length" value={product.specifications.dupatta.length} /><SpecRow label="Print" value={product.specifications.dupatta.print} /></dl></motion.section>}
                </motion.div>}
                {selectedVariant?.color && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }} className="mt-4 rounded-2xl border border-emerald/10 bg-white/55 px-4 py-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-medium text-gold">Color</span><span className="text-xs font-semibold text-emerald/70">{selectedVariant.color}{selectedVariant.isPrimary?" · Primary":""}</span></div>{variants.length>1&&<div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{variants.map(v=><button type="button" key={v.id} disabled={v.stockQuantity<=0} onClick={()=>setSelectedVariantId(v.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${v.id===selectedVariant.id?"border-gold bg-gold/10 text-emerald":"border-emerald/10 bg-white text-emerald/65"} disabled:cursor-not-allowed disabled:bg-red-50 disabled:text-red-400 disabled:line-through`}>{v.color}{v.stockQuantity<=0?" · Out":""}</button>)}</div>}{selectedCustomCode && <p className="mt-2 font-mono text-[11px] text-emerald/45">{selectedCustomCode}</p>}</motion.div>}
                {price && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.3 }} className="mt-4 rounded-2xl border border-gold/20 bg-gold/5 px-4 py-3 text-center font-semibold text-emerald">{price}</motion.div>}
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.3,duration:.3}} className="mt-3 grid grid-cols-2 gap-2.5">
                  {cartQty>0?<div className="flex min-w-0 items-center justify-center gap-3 rounded-full border border-emerald/15 bg-white px-2 py-2 shadow-sm"><button type="button" onClick={()=>changeCardQuantity(cartQty-1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald/15 bg-white text-lg font-semibold">−</button><span className="min-w-5 text-center text-sm font-semibold">{cartQty}</span><button type="button" onClick={()=>changeCardQuantity(cartQty+1)} disabled={cartQty>=selectedStock||selectedStock<=0} className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald/15 bg-white text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-35">+</button></div>:<button type="button" onClick={addProductToCart} disabled={product.price==null||selectedStatus==="out_of_stock"} className="flex min-w-0 items-center justify-center rounded-full border border-emerald/15 bg-white px-3 py-3 text-xs font-semibold text-emerald shadow-sm transition hover:bg-emerald/5 disabled:cursor-not-allowed disabled:opacity-40">Add to Cart</button>}
                  <button type="button" onClick={buyNow} disabled={product.price==null||selectedStatus==="out_of_stock"} className="flex min-w-0 items-center justify-center rounded-full bg-emerald px-3 py-3 text-xs font-semibold text-white shadow-md transition hover:bg-emerald/90 disabled:cursor-not-allowed disabled:opacity-40">Buy Now</button>
                </motion.div>
                {cartQty>=selectedStock&&selectedStock>0&&<p className="mt-2 text-center text-[10px] font-medium text-emerald/45">Maximum {selectedStock} available for {selectedVariant?.color||"this option"}.</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
