"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import Image from "next/image";
import { AnimatePresence,motion } from "framer-motion";
import { CheckCircle2,Copy,Loader2,MapPin,MessageCircle,RefreshCw,ShieldCheck,Truck,Upload } from "lucide-react";
import type { Product } from "@/lib/products";
import { clearCart,readCart,type CartItem } from "@/lib/cart";
import { rememberOrder } from "@/lib/order-client";
import { deliveryChargeForPincode,isFreeDeliveryPincode,isValidPincode,normalizePincode } from "@/lib/delivery";

const UPI_ID="nagmahdfc303102@ybl";
const WHATSAPP="919599502046";
const SESSION_PREFIX="nagmeena-order-v14:";

function money(n:number){return `₹${Number(n||0).toLocaleString("en-IN")}`;}
function normalizeIndianPhone(value:string){
  let digits=String(value||"").replace(/\D/g,"");
  if(digits.length===12&&digits.startsWith("91"))digits=digits.slice(2);
  if(digits.length===11&&digits.startsWith("0"))digits=digits.slice(1);
  return digits.slice(0,10);
}
function validIndianPhone(value:string){return /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));}
type Item={product_code:string;product_name:string;image_url?:string|null;quantity:number;unit_price:number;line_total:number;variant_id?:string|null;variant_product_code?:string|null;variant_custom_code?:string|null;variant_color?:string|null};
type Order={id:string;order_code:string;public_token:string;product_code:string;product_name:string;amount:number;status:string;expires_at:string;proof_url?:string|null;customer_name?:string|null;customer_phone?:string|null;customer_email?:string|null;address?:string|null;city?:string|null;state?:string|null;pincode?:string|null};

async function requestJson(url:string,init?:RequestInit,retries=2,timeoutMs=30000){
  let last:any;
  for(let attempt=0;attempt<=retries;attempt++){
    const controller=new AbortController(); const timeout=window.setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(url,{...init,signal:controller.signal,cache:"no-store"});
      const d=await r.json().catch(()=>({}));
      window.clearTimeout(timeout); return {r,d};
    }catch(e){window.clearTimeout(timeout);last=e;if(attempt<retries)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}
  }
  throw last instanceof Error?last:new Error("Network request failed");
}


async function optimizeProofImage(file:File){
  // Vercel Functions have a much smaller request-body ceiling than the old 8 MB
  // browser-side limit. Compress large phone screenshots/photos before upload.
  const TARGET_BYTES=1.5*1024*1024;
  if(file.size<=TARGET_BYTES)return file;

  const objectUrl=URL.createObjectURL(file);
  try{
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const img=new window.Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("We could not read this screenshot. Please choose another JPG, PNG or WebP image."));
      img.src=objectUrl;
    });
    const maxSide=1600;
    const scale=Math.min(1,maxSide/Math.max(image.naturalWidth||1,image.naturalHeight||1));
    const width=Math.max(1,Math.round(image.naturalWidth*scale));
    const height=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement("canvas");
    canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext("2d");
    if(!ctx)return file;
    ctx.drawImage(image,0,0,width,height);

    const toBlob=(quality:number)=>new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    let blob=await toBlob(.86);
    if(blob&&blob.size>TARGET_BYTES)blob=await toBlob(.72);
    if(blob&&blob.size>TARGET_BYTES)blob=await toBlob(.58);
    if(!blob)return file;

    const base=(file.name||"payment-proof").replace(/\.[^.]+$/,"");
    return new File([blob],`${base}.jpg`,{type:"image/jpeg",lastModified:Date.now()});
  }finally{
    URL.revokeObjectURL(objectUrl);
  }
}


async function uploadProofDirectToImageKit(orderToken:string,file:File){
  const authResult=await requestJson("/api/orders/proof-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:orderToken})},2,30000);
  if(!authResult.r.ok)throw new Error(authResult.d?.error||"Could not prepare screenshot upload.");
  if(authResult.d?.reused&&authResult.d?.proofUrl)return String(authResult.d.proofUrl);
  const auth=authResult.d;
  if(!auth?.publicKey||!auth?.token||!auth?.signature||!auth?.expire||!auth?.folder||!auth?.fileName)throw new Error("Screenshot upload configuration is incomplete.");

  const formData=new FormData();
  formData.append("file",file,auth.fileName);formData.append("fileName",auth.fileName);formData.append("publicKey",auth.publicKey);formData.append("token",auth.token);formData.append("signature",auth.signature);formData.append("expire",String(auth.expire));formData.append("folder",auth.folder);formData.append("useUniqueFileName","false");

  let payload:any=null,lastUploadError:unknown=null;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),90000);
    try{
      const upload=await fetch("https://upload.imagekit.io/api/v1/files/upload",{method:"POST",body:formData,signal:controller.signal});
      payload=await upload.json().catch(()=>({}));
      if(!upload.ok)throw new Error(payload?.message||`Payment screenshot upload failed (${upload.status}).`);
      if(!payload?.url)throw new Error("ImageKit did not return the uploaded screenshot URL.");
      lastUploadError=null;break;
    }catch(error){lastUploadError=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,900*(attempt+1)));}
    finally{window.clearTimeout(timeout);}
  }
  if(lastUploadError||!payload?.url)throw lastUploadError instanceof Error?lastUploadError:new Error("Payment screenshot upload failed. Please try again.");
  const complete=await requestJson("/api/orders/proof-complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:orderToken,proofUrl:payload.url})},4,30000);
  if(!complete.r.ok)throw new Error(complete.d?.error||"Screenshot uploaded, but we could not save it to the order. Tap Retry Upload.");
  return String(complete.d?.proofUrl||payload.url);
}


export default function BuyNowCheckout({ product, variantId }: { product?: Product; variantId?: string }) {
  const isCart = !product;
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(!isCart);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address1: "", address2: "", landmark: "", city: "", state: "", pincode: "", paymentReference: "" });
  const [deliveryReady, setDeliveryReady] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsAppClicked, setWhatsAppClicked] = useState(false);
  const [paidConfirm, setPaidConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingProof, setProcessingProof] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [phoneTouched,setPhoneTouched]=useState(false);
  const [addressLookup,setAddressLookup]=useState(false);
  const [proofUploadState,setProofUploadState]=useState<"idle"|"uploading"|"uploaded"|"failed">("idle");
  const [proofUploadMessage,setProofUploadMessage]=useState("");
  const [cityTouched,setCityTouched]=useState(false);
  const [citySuggestions,setCitySuggestions]=useState<Array<{pincode:string;name:string;district:string;state:string}>>([]);
  const [addressAutoFillAvailable,setAddressAutoFillAvailable]=useState(true);
  const [paymentDoneConfirmed,setPaymentDoneConfirmed]=useState(false);
  const [toast,setToast]=useState<{type:"success"|"info";text:string}|null>(null);
  const initialized = useRef(false);

  useEffect(() => { if (!isCart) return; setCartItems(readCart()); setCartReady(true); }, [isCart]);

  const directVariant = useMemo(() => product?.variants?.find(v => v.id === variantId) || product?.variants?.find(v => v.isPrimary && v.isActive) || product?.variants?.find(v => v.isActive) || null, [product, variantId]);
  const selectedItems = useMemo(() => isCart ? cartItems : (product ? [{ product, quantity: 1, variant: directVariant }] : []), [isCart, cartItems, product, directVariant]);
  const requestItems = useMemo(() => selectedItems.map(i => ({ productCode: i.product.productCode, variantId: i.variant?.id || null, variantProductCode: i.variant?.productCode || null, quantity: i.quantity })), [selectedItems]);
  const requestSignature = useMemo(() => requestItems.map(i => `${i.productCode}:${i.variantId || i.variantProductCode || "base"}:${i.quantity}`).join("|"), [requestItems]);
  const cartSubtotal = useMemo(() => selectedItems.reduce((sum, i) => sum + Number(i.product.price || 0) * i.quantity, 0), [selectedItems]);
  const sessionKey = useMemo(() => isCart ? `${SESSION_PREFIX}cart:${requestSignature || "empty"}` : `${SESSION_PREFIX}${product?.productCode || ""}`, [isCart, product?.productCode, requestSignature]);

  useEffect(() => {
    if (!cartReady) return;
    let cancelled = false;
    async function init() {
      try {
        if (!requestItems.length) { setError("Your cart is empty. Please add a suit first."); setLoading(false); return; }
        setLoading(true); setError("");
        let saved: any = null;
        try { const raw = sessionStorage.getItem(sessionKey); saved = raw ? JSON.parse(raw) : null; } catch { sessionStorage.removeItem(sessionKey); }
        if (saved?.token) {
          try {
            const { r, d } = await requestJson(`/api/orders/status?token=${encodeURIComponent(saved.token)}`, undefined, 1);
            if (r.ok && d.order) {
              const status = d.order.status;
              if (status === "payment_pending") {
                if (!cancelled) {
                  setOrder(d.order); setItems(d.items || []);
                  setForm(current => ({ ...current, ...(saved.form || {}), name: d.order.customer_name || saved.form?.name || current.name, phone: d.order.customer_phone || saved.form?.phone || current.phone, email: d.order.customer_email || saved.form?.email || current.email, address1: saved.form?.address1 || d.order.address || current.address1, address2: saved.form?.address2 || current.address2, landmark: saved.form?.landmark || current.landmark, city: d.order.city || saved.form?.city || current.city, state: d.order.state || saved.form?.state || current.state, pincode: d.order.pincode || saved.form?.pincode || current.pincode }));
                  setDeliveryReady(Boolean(d.order.customer_name && d.order.customer_phone && d.order.address && d.order.pincode));
                  if(d.order.proof_url){setProofUploadState("uploaded");setProofUploadMessage("Payment screenshot securely uploaded ✓");}
                  setWhatsAppClicked(Boolean(saved.whatsAppClicked)); setLoading(false);
                }
                return;
              }
              if (status === "verification_pending") { rememberOrder(saved.token, status); window.location.replace(`/payment-status?token=${encodeURIComponent(saved.token)}`); return; }
              sessionStorage.removeItem(sessionKey); saved = null;
            } else if ([404, 410].includes(r.status)) { sessionStorage.removeItem(sessionKey); saved = null; }
          } catch { /* idempotent create below safely recovers */ }
        }
        const idempotencyKey = saved?.idempotencyKey || (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        sessionStorage.setItem(sessionKey, JSON.stringify({ idempotencyKey, ...(saved || {}) }));
        const { r, d } = await requestJson("/api/orders/create", { method: "POST", headers: { "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey }, body: JSON.stringify({ idempotencyKey, items: requestItems }) }, 2);
        if (!r.ok) throw new Error(d.error || "We could not start your order. Please try again.");
        if (cancelled) return;
        setOrder(d.order); setItems(d.items || []);
        sessionStorage.setItem(sessionKey, JSON.stringify({ token: d.order.public_token, idempotencyKey }));
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          const network = e instanceof TypeError || String(e).toLowerCase().includes("failed to fetch") || String(e).toLowerCase().includes("network");
          setError(network ? "We could not reach the order server. Please check your connection and tap Try again. Your cart is still safe." : (e instanceof Error ? e.message : "We could not start your order. Please try again."));
          setLoading(false);
        }
      }
    }
    initialized.current = true; void init();
    return () => { cancelled = true; };
  }, [cartReady, requestSignature, sessionKey]);

  useEffect(() => {
    if (!order?.expires_at) return;
    const tick = () => setRemaining(Math.max(0, new Date(order.expires_at).getTime() - Date.now()));
    tick(); const id = window.setInterval(tick, 1000); return () => window.clearInterval(id);
  }, [order?.expires_at]);

  const displayItems: Item[] = items.length ? items : selectedItems.map(i => ({ product_code: i.variant?.productCode || i.product.productCode, product_name: i.product.name, image_url: i.product.images?.[0]?.url, quantity: i.quantity, unit_price: Number(i.product.price || 0), line_total: Number(i.product.price || 0) * i.quantity, variant_color: i.variant?.color || null, variant_custom_code: i.variant?.customCode || null }));
  const subtotal = displayItems.reduce((sum, i) => sum + Number(i.line_total || 0), 0) || cartSubtotal;
  useEffect(()=>{
    if(!isValidPincode(form.pincode)){setAddressAutoFillAvailable(true);return;}
    let cancelled=false;
    const timer=window.setTimeout(async()=>{
      setAddressLookup(true);
      try{
        const {r,d}=await requestJson(`/api/location?pincode=${encodeURIComponent(form.pincode)}`,undefined,1,12000);
        if(cancelled)return;
        if(r.ok){
          setForm(current=>({...current,city:d.city||current.city,state:d.state||current.state}));
          setCitySuggestions([]);setAddressAutoFillAvailable(true);
        }else setAddressAutoFillAvailable(false);
      }catch{if(!cancelled)setAddressAutoFillAvailable(false);}finally{if(!cancelled)setAddressLookup(false);}
    },350);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[form.pincode]);

  useEffect(()=>{
    if(!cityTouched||form.city.trim().length<3||isValidPincode(form.pincode)){setCitySuggestions([]);return;}
    let cancelled=false;
    const timer=window.setTimeout(async()=>{
      try{
        const {r,d}=await requestJson(`/api/location?city=${encodeURIComponent(form.city.trim())}`,undefined,0,12000);
        if(!cancelled&&r.ok)setCitySuggestions(Array.isArray(d.matches)?d.matches:[]);
      }catch{if(!cancelled)setCitySuggestions([]);}
    },550);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[form.city,cityTouched,form.pincode]);


  const localCharge = deliveryChargeForPincode(form.pincode);
  const deliveryCharge = deliveryReady && localCharge !== null ? localCharge : 0;
  const payableTotal = deliveryReady ? subtotal + deliveryCharge : Number(order?.amount || subtotal);
  const upiUri = useMemo(() => order ? `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=NAGMEENA&am=${Number(order.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(order.order_code)}` : "", [order]);

  function showToast(text:string,type:"success"|"info"="success"){setToast({text,type});window.setTimeout(()=>setToast(current=>current?.text===text?null:current),2300);}
  function retry() { initialized.current = false; window.location.reload(); }
  function updateField(key: keyof typeof form, value: string) {
    const next = key === "pincode" ? normalizePincode(value) : value;
    if (key === "pincode" && next !== form.pincode) {
      setDeliveryReady(false); setPaymentDoneConfirmed(false); setPaidConfirm(false); setWhatsAppClicked(false);
      if (preview && proofUploadState!=="uploaded") URL.revokeObjectURL(preview); if(proofUploadState!=="uploaded"){setProof(null);setPreview("");setProofUploadState("idle");setProofUploadMessage("");}
    } else if (key !== "paymentReference") { setDeliveryReady(false); setPaymentDoneConfirmed(false); }
    setForm(current => ({ ...current, [key]: next }));
  }
  function validateDelivery() {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!validIndianPhone(form.phone)) return "Please enter a valid 10-digit Indian mobile number.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address or leave it blank.";
    if (!form.address1.trim()) return "Please enter Address Line 1.";
    if (!form.address2.trim()) return "Please enter Address Line 2.";
    if (!form.city.trim()) return "Please enter your city.";
    if (!form.state.trim()) return "Please enter your state.";
    if (!isValidPincode(form.pincode)) return "Please enter a valid 6-digit pincode.";
    return "";
  }
  async function saveDelivery() {
    setError("");
    if (!order) return setError("Your order is still being prepared.");
    if (remaining <= 0) return setError("This payment session has expired. Please start a new order.");
    const validation = validateDelivery(); if (validation) return setError(validation);
    setSavingDelivery(true);
    try {
      const { r, d } = await requestJson("/api/orders/delivery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: order.public_token, ...form, address: [form.address1, form.address2, form.landmark].filter(Boolean).join(", ") }) }, 2, 30000);
      if (!r.ok) throw new Error(d.error || "Could not save your delivery details.");
      setOrder(d.order); setDeliveryReady(true); setPaymentDoneConfirmed(false); setPaidConfirm(false); setWhatsAppClicked(false); showToast("Delivery details saved. Payment step unlocked ✓");
      try { const saved = JSON.parse(sessionStorage.getItem(sessionKey) || "{}"); sessionStorage.setItem(sessionKey, JSON.stringify({ ...saved, token: order.public_token, form, whatsAppClicked: false })); } catch {}
      setStep(2);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your delivery details."); }
    finally { setSavingDelivery(false); }
  }
  function openUpi() {
    if (!deliveryReady) { setError("Complete Step 1 before making payment."); setStep(1); return; }
    if (!upiUri) return;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
    if (mobile) window.location.href = upiUri; else setShowQr(true);
  }
  async function copyUpi() {
    try { await navigator.clipboard.writeText(UPI_ID); }
    catch { const t = document.createElement("textarea"); t.value = UPI_ID; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setCopied(true); showToast("UPI ID copied ✓","info"); window.setTimeout(() => setCopied(false), 1800);
  }
  async function uploadPreparedProof(file:File){
    if(!order)throw new Error("Your order is still being prepared.");
    setUploading(true);setProofUploadState("uploading");setProofUploadMessage("Uploading securely… keep this page open.");
    try{
      const proofUrl=await uploadProofDirectToImageKit(order.public_token,file);
      setOrder(current=>current?{...current,proof_url:proofUrl}:current);setProofUploadState("uploaded");setProofUploadMessage("Payment screenshot securely uploaded ✓");showToast("Payment screenshot securely uploaded ✓");return proofUrl;
    }catch(error){setProofUploadState("failed");const message=error instanceof Error?error.message:"Payment screenshot upload failed.";setProofUploadMessage(message);throw error;}
    finally{setUploading(false);}
  }
  async function chooseProof(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please upload a JPG, PNG or WebP payment screenshot.");
    if (file.size > 12 * 1024 * 1024) return setError("Payment screenshot is too large. Please choose an image smaller than 12MB.");
    setProcessingProof(true); setError(""); setWhatsAppClicked(false); setPaidConfirm(false);
    try {
      const optimized = await optimizeProofImage(file);
      if (optimized.size > 2.2 * 1024 * 1024) throw new Error("This screenshot is still too large for a reliable mobile upload. Please crop it or take a fresh screenshot.");
      if (preview) URL.revokeObjectURL(preview); setProof(optimized); setPreview(URL.createObjectURL(optimized)); setProcessingProof(false);
      await uploadPreparedProof(optimized);
    } catch (e) { setError(e instanceof Error ? e.message : "We could not prepare or upload this screenshot. Please try again."); }
    finally { setProcessingProof(false); }
  }
  async function retryProofUpload(){
    setError("");if(!proof)return setError("Please choose the payment screenshot again.");
    try{await uploadPreparedProof(proof);}catch(e){setError(e instanceof Error?e.message:"Payment screenshot upload failed. Please try again.");}
  }
  function sendWhatsAppInfo() {
    setError("");
    if (!order) return setError("Your order is still being prepared.");
    if (!deliveryReady) { setStep(1); return setError("Complete your delivery details first."); }
    if (!order.proof_url || proofUploadState!=="uploaded") return setError("Please wait until your payment screenshot shows Uploaded ✓.");
    if (!paidConfirm) return setError("Please review and confirm your order/payment details.");
    const charge = Math.max(0, Number(order.amount || 0) - subtotal);
    const addressLine = [form.address1, form.address2, form.landmark, form.city, form.state, form.pincode].filter(Boolean).join(", ");
    const text = `Hello NAGMEENA, I have completed payment for my order.\n\nOrder: ${order.order_code}\nCustomer: ${form.name}\nContact: ${form.phone}\nDelivery: ${addressLine}\nProduct subtotal: ${money(subtotal)}\nDelivery charge: ${charge === 0 ? "FREE" : money(charge)}\nAmount paid: ${money(order.amount)}\n\nI have uploaded my payment screenshot and will now submit the order for manual verification.`;
    setWhatsAppClicked(true);
    try { const saved = JSON.parse(sessionStorage.getItem(sessionKey) || "{}"); sessionStorage.setItem(sessionKey, JSON.stringify({ ...saved, token: order.public_token, form, whatsAppClicked: true })); } catch {}
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  async function submitVerification() {
    setError("");
    if (!order) return setError("Your order is still being prepared.");
    if (remaining <= 0) return setError("This payment session has expired. Please start a new order.");
    if (!deliveryReady) { setStep(1); return setError("Please complete your delivery details first."); }
    if (!order.proof_url || proofUploadState!=="uploaded") return setError("Please upload your payment screenshot successfully before continuing.");
    if (!paidConfirm) return setError("Please review and confirm your order/payment details.");
    if (!whatsAppClicked) return setError("Please open the prepared WhatsApp message first, then return here and confirm your order.");
    setSubmitting(true);
    try {
      const { r, d } = await requestJson("/api/orders/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: order.public_token, ...form, address: [form.address1, form.address2, form.landmark].filter(Boolean).join(", ") }) }, 2, 30000);
      if (!r.ok) {
        if (d.alreadySubmitted) { rememberOrder(order.public_token, "verification_pending"); window.location.assign(`/payment-status?token=${encodeURIComponent(order.public_token)}`); return; }
        throw new Error(d.error || "Payment verification could not be submitted. Please try again.");
      }
      const finalOrder = d.order || order; setOrder(finalOrder);
      try { sessionStorage.setItem(sessionKey, JSON.stringify({ token: order.public_token, idempotencyKey: (JSON.parse(sessionStorage.getItem(sessionKey) || "{}") || {}).idempotencyKey, form, whatsAppClicked: true })); } catch {}
      if (isCart) clearCart(); rememberOrder(order.public_token, finalOrder.status || "verification_pending");
      window.location.assign(`/payment-status?token=${encodeURIComponent(order.public_token)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment verification could not be submitted. Please try again.";
      const lower = msg.toLowerCase();
      const interrupted = (e instanceof DOMException && e.name === "AbortError") || lower.includes("failed to fetch") || lower.includes("network") || lower.includes("aborted");
      setError(interrupted ? "The final confirmation request was interrupted. Your screenshot is already saved — tap Confirm & Submit again; a duplicate order will not be created." : msg);
    } finally { setSubmitting(false); setUploading(false); }
  }

  const deliveryValidation = validateDelivery();
  const deliveryFormValid = !deliveryValidation && !addressLookup;
  const finalReady = deliveryReady && paymentDoneConfirmed && proofUploadState==="uploaded" && Boolean(order?.proof_url) && paidConfirm && whatsAppClicked && !processingProof && !uploading && !submitting;
  const minutes = Math.floor(remaining / 60000), seconds = Math.floor((remaining % 60000) / 1000);
  if (loading) return <main className="min-h-screen bg-base px-5 pt-32 text-emerald"><div className="mx-auto max-w-4xl rounded-3xl bg-white/70 p-10 text-center"><Loader2 className="mx-auto animate-spin text-gold"/><p className="mt-4 text-sm text-emerald/55">Preparing your secure order…</p></div></main>;
  if (error && !order) return <main className="min-h-screen bg-base px-5 pt-32 text-emerald"><div className="mx-auto max-w-xl rounded-3xl bg-white/75 p-8 text-center"><p className="font-semibold text-red-600">{error}</p><div className="mt-5 flex justify-center gap-3"><button onClick={retry} className="rounded-full bg-emerald px-5 py-3 text-sm font-semibold text-white">Try again</button><a href="/#collections" className="rounded-full border px-5 py-3 text-sm font-semibold">Back to Collection</a></div></div></main>;

  const freeDelivery = isValidPincode(form.pincode) && isFreeDeliveryPincode(form.pincode);
  const steps: Array<{ n: 1 | 2 | 3; label: string }> = [{ n: 1, label: "Delivery details" }, { n: 2, label: "Make payment" }, { n: 3, label: "Proof & submit" }];

  return <main className="min-h-screen bg-base px-4 pb-16 pt-28 text-emerald sm:px-6"><div className="mx-auto max-w-4xl">
    <div className="grid gap-3 sm:grid-cols-3">{steps.map(({n,label}) => <button key={n} type="button" onClick={() => { if (n === 1 || (n === 2 && deliveryReady) || (n === 3 && deliveryReady && paymentDoneConfirmed)) { setStep(n); setError(""); } }} className={`rounded-3xl border px-4 py-5 text-left transition ${step === n ? "border-gold bg-gold/5 shadow-sm" : "border-emerald/10 bg-white/55"}`}><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Step {n}</span><span className="mt-1 block text-lg font-semibold">{label}</span></button>)}</div>
    {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => setError("")} className="ml-2 font-semibold underline">Dismiss</button></div>}
    <AnimatePresence>{toast&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} className="fixed left-1/2 top-4 z-[180] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-3xl border border-gold/20 bg-base/95 px-4 py-3 text-center text-xs font-semibold text-emerald shadow-xl backdrop-blur-xl">{toast.text}</motion.div>}</AnimatePresence>

    {step === 1 && <section className="mt-5 overflow-hidden rounded-[30px] border border-emerald/10 bg-white/75 shadow-xl">
      <div className="bg-emerald px-5 py-5 text-white sm:px-7"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#dec27f]">Step 1</p><h1 className="mt-1 font-heading text-3xl">Review & delivery details</h1><p className="mt-2 text-sm text-white/70">Check your selected suit and enter where you want it delivered. Your final payable amount is calculated before payment.</p></div>
      <div className="p-5 sm:p-7">
        <div className="space-y-3">{displayItems.map((i,index) => <div key={`${i.variant_product_code || i.product_code}-${index}`} className="flex gap-4 rounded-2xl border border-emerald/8 bg-base p-3"><div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#eee7da]">{i.image_url && <Image src={i.image_url} alt={i.product_name} fill sizes="80px" className="object-cover"/>}</div><div className="min-w-0 flex-1"><p className="font-semibold">{i.product_name}</p><p className="mt-1 text-xs text-emerald/50">{i.variant_product_code || i.product_code}{i.variant_color ? ` • ${i.variant_color}` : ""} • Qty {i.quantity}</p>{i.variant_custom_code && <p className="mt-0.5 font-mono text-[10px] text-emerald/40">{i.variant_custom_code}</p>}<p className="mt-2 font-semibold">{money(i.line_total)}</p></div></div>)}</div>
        <div className="mt-6 flex items-center gap-2"><MapPin size={18} className="text-gold"/><h2 className="font-heading text-xl">Delivery information</h2></div><p className="mt-2 text-[11px] leading-5 text-emerald/45">Enter your pincode first. City and state are filled automatically when postal data is available.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="Full name *" autoComplete="name" className="field"/>
          <div><input value={form.phone} onChange={e=>updateField("phone",e.target.value)} onBlur={()=>setPhoneTouched(true)} placeholder="10-digit mobile / WhatsApp number *" type="tel" inputMode="numeric" autoComplete="tel" maxLength={13} className={`field ${phoneTouched&&form.phone&&!validIndianPhone(form.phone)?"!border-red-300":""}`}/>{phoneTouched&&form.phone&&!validIndianPhone(form.phone)&&<p className="mt-1.5 text-[11px] font-medium text-red-600">Enter a valid 10-digit Indian mobile number.</p>}</div>
          <input value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="Email (optional)" type="email" autoComplete="email" className="field sm:col-span-2"/>
          <div><input value={form.pincode} onChange={e => updateField("pincode", e.target.value)} placeholder="6-digit pincode *" inputMode="numeric" autoComplete="postal-code" maxLength={6} className="field"/>{addressLookup&&<p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald/45"><Loader2 size={12} className="animate-spin"/>Checking pincode…</p>}</div>
          <div className="relative"><input value={form.city} onFocus={()=>setCityTouched(true)} onChange={e=>{setCityTouched(true);updateField("city",e.target.value);if(isValidPincode(form.pincode))updateField("pincode","");}} placeholder="City *" autoComplete="address-level2" className="field"/>{citySuggestions.length>0&&<div className="mt-2 max-h-48 overflow-auto rounded-2xl border border-emerald/10 bg-white p-2 shadow-lg">{citySuggestions.map((s,index)=><button type="button" key={`${s.pincode}-${s.name}-${index}`} onClick={()=>{setForm(current=>({...current,city:s.district||s.name||form.city,state:s.state||current.state,pincode:s.pincode}));setCitySuggestions([]);setDeliveryReady(false);}} className="block w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-emerald/5"><b>{s.name||s.district}</b><span className="ml-2 text-emerald/45">{s.district} • {s.pincode}</span></button>)}</div>}</div>
          <input value={form.state} onChange={e=>updateField("state",e.target.value)} placeholder={addressAutoFillAvailable?"State (auto-filled)":"State *"} readOnly={addressAutoFillAvailable&&Boolean(form.state)} className={`field sm:col-span-2 ${addressAutoFillAvailable&&form.state?"bg-emerald/5 text-emerald/70":""}`}/>
          <input value={form.address1} onChange={e=>updateField("address1",e.target.value)} placeholder="Address Line 1 * — House / Flat / Building" autoComplete="address-line1" className="field sm:col-span-2"/>
          <input value={form.address2} onChange={e=>updateField("address2",e.target.value)} placeholder="Address Line 2 * — Street / Locality / Area" autoComplete="address-line2" className="field sm:col-span-2"/>
          <input value={form.landmark} onChange={e=>updateField("landmark",e.target.value)} placeholder="Landmark (optional)" className="field sm:col-span-2"/>
        </div>
        {isValidPincode(form.pincode) && <div className={`mt-3 flex items-start gap-3 rounded-2xl border p-4 ${freeDelivery ? "border-emerald/15 bg-emerald/5" : "border-gold/20 bg-gold/5"}`}><Truck size={19} className={freeDelivery ? "mt-0.5 text-emerald" : "mt-0.5 text-gold"}/><div><p className="text-sm font-semibold">{freeDelivery ? "Free delivery available for this pincode" : "₹100 delivery charge applies"}</p><p className="mt-1 text-xs text-emerald/55">{freeDelivery ? "Your delivery charge is ₹0." : `${money(subtotal)} + ₹100 delivery = ${money(subtotal + 100)} final payable amount.`}</p></div></div>}
        <div className="mt-5 rounded-2xl bg-emerald/5 p-4"><div className="flex justify-between text-sm"><span>Product subtotal</span><b>{money(subtotal)}</b></div><div className="mt-2 flex justify-between text-sm"><span>Delivery</span><b>{!isValidPincode(form.pincode) ? "Enter pincode" : freeDelivery ? "FREE" : "₹100"}</b></div><div className="mt-3 flex justify-between border-t border-emerald/10 pt-3"><span className="font-semibold">Final payable</span><b className="text-xl">{money(isValidPincode(form.pincode) ? subtotal + (freeDelivery ? 0 : 100) : subtotal)}</b></div></div>
        <button disabled={savingDelivery||!deliveryFormValid} onClick={() => void saveDelivery()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-emerald py-3.5 text-sm font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:bg-emerald/35 disabled:shadow-none">{savingDelivery && <Loader2 size={17} className="animate-spin"/>}{savingDelivery ? "Saving delivery details…" : deliveryFormValid ? "Continue to Payment" : "Complete required details to continue"}</button>{!deliveryFormValid&&<p className="mt-2 text-center text-[11px] text-emerald/45">{addressLookup?"Checking your pincode…":deliveryValidation}</p>}
      </div>
    </section>}

    {step === 2 && <section className="mt-5 rounded-[30px] border border-emerald/10 bg-white/75 p-5 shadow-xl sm:p-7"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-gold">Step 2</p><h2 className="mt-2 font-heading text-3xl">Make payment</h2><p className="mt-2 text-sm text-emerald/55">Pay exactly <b>{money(Number(order?.amount || payableTotal))}</b>. Your delivery charge is already included.</p>
      <div className="mt-5 rounded-2xl bg-base p-4"><div className="flex justify-between text-sm"><span>Product subtotal</span><b>{money(subtotal)}</b></div><div className="mt-2 flex justify-between text-sm"><span>Delivery</span><b>{deliveryCharge === 0 ? "FREE" : money(deliveryCharge)}</b></div><div className="mt-3 flex justify-between border-t border-emerald/10 pt-3"><span className="font-semibold">Pay now</span><b className="text-xl">{money(Number(order?.amount || payableTotal))}</b></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_.9fr]"><div className="rounded-3xl border border-gold/15 bg-gradient-to-br from-white to-[#f5efe3] p-5"><p className="text-sm font-semibold">1. Open your UPI app</p><p className="mt-2 text-xs text-emerald/55">PhonePe, Google Pay, Paytm, BHIM or any UPI app.</p><p className="mt-5 text-sm font-semibold">2. Pay using this UPI ID</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-3 text-xs">{UPI_ID}</code><button onClick={copyUpi} className="rounded-xl border bg-white px-3 text-xs font-semibold">{copied ? "Copied ✓" : "Copy"}</button></div><button disabled={!deliveryReady} onClick={openUpi} className="mt-4 w-full rounded-full bg-emerald py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Pay {money(Number(order?.amount || payableTotal))} with UPI</button><p className="mt-3 text-center text-[11px] text-emerald/45">On mobile this opens your UPI app. On desktop use the QR code.</p></div><div className="rounded-3xl border border-emerald/10 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-widest text-gold">Secure order</p><p className="mt-3 text-2xl font-semibold">{minutes}:{String(seconds).padStart(2,"0")}</p><p className="mt-1 text-xs text-emerald/50">Complete proof submission before the timer ends.</p><button disabled={!deliveryReady} onClick={() => setShowQr(true)} className="mt-5 w-full rounded-full border py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Show QR code</button></div></div>
      <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm"><p className="font-semibold text-emerald">After payment, take a screenshot of the successful transaction.</p><p className="mt-1 text-xs leading-5 text-emerald/55">You will upload that screenshot in Step 3 so we can manually verify the payment.</p></div><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald/10 bg-white/65 p-4 text-sm"><input type="checkbox" checked={paymentDoneConfirmed} onChange={e=>setPaymentDoneConfirmed(e.target.checked)} className="mt-1"/><span><b className="block">I completed the payment and saved the screenshot.</b><span className="mt-1 block text-xs text-emerald/50">Check this only after your UPI app shows payment successful.</span></span></label><button disabled={!deliveryReady||!paymentDoneConfirmed} onClick={() => { setError(""); setStep(3); showToast("Payment step completed. Upload your screenshot next ✓","info"); }} className="mt-4 w-full rounded-full bg-emerald py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">{paymentDoneConfirmed?"Continue to Proof Upload":"Confirm payment above to continue"}</button><button onClick={() => setStep(1)} className="mt-2 w-full py-2 text-xs font-semibold text-emerald/55">Edit delivery details</button>
    </section>}

    {step === 3 && <section className="mt-5 rounded-[30px] border border-emerald/10 bg-white/75 p-5 shadow-xl sm:p-7"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-gold">Step 3</p><h2 className="mt-2 font-heading text-3xl">Proof & confirmation</h2><p className="mt-2 text-sm leading-6 text-emerald/55">Upload your payment screenshot, review the details, send the prepared WhatsApp message and then submit the order for manual verification.</p>
      <label className={`mt-5 flex cursor-pointer items-center gap-4 rounded-3xl border border-dashed p-5 transition ${proofUploadState==="uploaded"?"border-emerald/25 bg-emerald/5":"border-emerald/20 bg-base"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${proofUploadState==="uploaded"?"bg-emerald text-white":"bg-gold/10 text-gold"}`}>{proofUploadState==="uploaded"?<CheckCircle2 size={20}/>:processingProof||uploading?<Loader2 size={20} className="animate-spin"/>:<Upload size={20}/>}</span><span className="min-w-0 flex-1"><b className="block">{proofUploadState==="uploaded"?"Payment screenshot uploaded ✓":"Upload payment screenshot *"}</b><small className="text-emerald/50">{processingProof?"Optimizing for mobile…":uploading?"Uploading securely — keep this page open…":proofUploadState==="uploaded"?"Safe to open WhatsApp now.":proofUploadState==="failed"?"Upload interrupted. Use Retry Upload below.":"We optimize first, then upload immediately before WhatsApp."}</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" disabled={uploading||processingProof} onChange={e => void chooseProof(e.target.files?.[0])}/></label>
      {proofUploadMessage&&<div className={`mt-3 rounded-2xl border px-4 py-3 text-xs ${proofUploadState==="uploaded"?"border-emerald/15 bg-emerald/5 text-emerald":proofUploadState==="failed"?"border-red-200 bg-red-50 text-red-700":"border-gold/20 bg-gold/5 text-emerald/65"}`}>{proofUploadMessage}{proofUploadState==="failed"&&proof&&<button type="button" onClick={()=>void retryProofUpload()} disabled={uploading} className="ml-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw size={12}/> Retry Upload</button>}</div>}
      {preview && <div className="mt-4 overflow-hidden rounded-2xl border bg-base p-2"><img src={preview} alt="Payment proof preview" className="mx-auto max-h-72 w-full rounded-xl object-contain"/></div>}
      <div className="mt-5 rounded-2xl bg-emerald/5 p-4 text-sm"><div className="flex justify-between"><span>Order</span><b>{order?.order_code}</b></div><div className="mt-2 flex justify-between"><span>Final payment</span><b>{money(Number(order?.amount || payableTotal))}</b></div><div className="mt-2 flex justify-between"><span>Deliver to</span><b className="max-w-[65%] text-right">{form.city}, {form.pincode}</b></div></div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-gold/15 bg-gold/5 p-4 text-sm"><input type="checkbox" checked={paidConfirm} onChange={e => { setPaidConfirm(e.target.checked); if (!e.target.checked) setWhatsAppClicked(false); }} className="mt-1"/><span><b className="block">I have reviewed my order and payment details.</b><span className="mt-1 block text-xs text-emerald/55">I paid {money(Number(order?.amount || payableTotal))} and the uploaded screenshot belongs to this order.</span></span></label>
      <div className="mt-4 rounded-2xl border border-emerald/10 bg-base px-4 py-3 text-center text-xs leading-5 text-emerald/60">For faster verification, send the prepared order information to us on WhatsApp. Payment is still manually verified before the order becomes confirmed.</div>
      <div className="mt-4 grid gap-3"><button disabled={processingProof || uploading || whatsAppClicked || proofUploadState!=="uploaded" || !order?.proof_url || !paidConfirm} onClick={sendWhatsAppInfo} className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white disabled:opacity-40 ${whatsAppClicked ? "bg-[#1ea952] opacity-75" : "bg-[#25D366]"}`}><MessageCircle size={18}/>{whatsAppClicked ? "WhatsApp Opened ✓" : "Send Order Info on WhatsApp"}</button>{whatsAppClicked && <div className="rounded-2xl border border-emerald/15 bg-emerald/5 px-4 py-3 text-center text-xs text-emerald/65">Send the prepared message in WhatsApp, return here, then use the final button below.</div>}<button disabled={!finalReady} onClick={submitVerification} className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald py-3.5 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none">{submitting ? <Loader2 className="animate-spin" size={18}/> : <ShieldCheck size={18}/>} {submitting ? "Confirming your order…" : proofUploadState!=="uploaded" ? "Upload screenshot to continue" : !paidConfirm ? "Review details to continue" : !whatsAppClicked ? "Open WhatsApp to continue" : "Confirm & Submit Order"}</button></div>
      <p className="mt-3 text-center text-xs text-emerald/50"><ShieldCheck size={14} className="mr-1 inline"/>After submission, payment verification is normally completed within 30 minutes.</p>
    </section>}
  </div>

  <AnimatePresence>{showQr && <motion.div className="fixed inset-0 z-[120] flex items-center justify-center bg-emerald/55 p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowQr(false)}><motion.div className="w-full max-w-md rounded-[30px] border border-gold/20 bg-base p-5 shadow-2xl" initial={{y:20,scale:.97}} animate={{y:0,scale:1}} onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-widest text-gold">Secure UPI</p><h3 className="font-heading text-2xl">Scan to pay</h3></div><button onClick={() => setShowQr(false)} className="rounded-full border bg-white px-3 py-2">×</button></div><div className="mt-4 rounded-3xl border border-gold/15 bg-white p-5"><div className="relative mx-auto aspect-square max-w-[280px] overflow-hidden rounded-2xl bg-white p-3 shadow-lg"><Image src="/payment-qr.jpg" alt="NAGMEENA UPI QR" fill sizes="280px" className="object-contain"/></div></div><div className="mt-4 rounded-2xl bg-emerald p-4 text-white"><div className="flex justify-between text-sm"><span>Pay exactly</span><b className="text-lg">{money(Number(order?.amount || payableTotal))}</b></div></div><button onClick={copyUpi} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border bg-white py-3 text-sm font-semibold"><Copy size={15}/>{copied ? "UPI ID copied ✓" : "Copy UPI ID"}</button></motion.div></motion.div>}</AnimatePresence>
 </main>;
}
