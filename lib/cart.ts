"use client";
import type { Product, ProductVariant } from "@/lib/products";

export type CartItem = { product: Product; quantity: number; variant?: ProductVariant | null };
const KEY = "nagmeena-cart-v15";
const LEGACY_KEYS = ["nagmeena-cart-v12"];

export function cartItemKey(item: Pick<CartItem, "product" | "variant">) {
  return item.variant?.id || item.variant?.productCode || item.product.productCode;
}
function maxStock(item: Pick<CartItem, "product" | "variant">) {
  return Math.max(0, Number(item.variant?.stockQuantity ?? item.product.stockQuantity ?? 0));
}
export function readCart(): CartItem[] {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) { const legacy = localStorage.getItem(k); if (legacy) { raw = legacy; break; } }
    }
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x:any)=>x?.product?.productCode && Number(x.quantity)>0).map((x:any)=>({ ...x, quantity: Math.max(1, Math.floor(Number(x.quantity)||1)) }));
  } catch { return []; }
}
export function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("nagmeena-cart-change"));
}
export function getCartQuantity(product: Product, variant?: ProductVariant | null) {
  const key = variant?.id || variant?.productCode || product.productCode;
  return readCart().find(i => cartItemKey(i) === key)?.quantity || 0;
}
export function addToCart(product: Product, variant?: ProductVariant | null) {
  const candidate = { product, variant: variant || null } as CartItem;
  const limit = maxStock(candidate);
  if (limit <= 0) return { ok:false, reason:"out_of_stock", quantity:0 } as const;
  const items = readCart();
  const key = cartItemKey(candidate);
  const existing = items.find(i => cartItemKey(i) === key);
  if (existing) {
    if (existing.quantity >= limit) return { ok:false, reason:"max_stock", quantity:existing.quantity } as const;
    existing.quantity += 1;
  } else items.push({ ...candidate, quantity: 1 });
  writeCart(items);
  return { ok:true, quantity:existing?.quantity || 1 } as const;
}
export function removeFromCart(key:string) { writeCart(readCart().filter(i => cartItemKey(i) !== key)); }
export function setQuantity(key:string, q:number, maxOverride?:number) {
  const items = readCart();
  const item = items.find(i => cartItemKey(i) === key);
  if (!item) return {ok:false,reason:"missing",quantity:0} as const;
  if (q <= 0) { removeFromCart(key); return {ok:true,quantity:0} as const; }
  const limit = Math.max(0, Number(maxOverride ?? maxStock(item)));
  if (limit <= 0) return {ok:false,reason:"out_of_stock",quantity:item.quantity} as const;
  const next = Math.min(Math.floor(q), limit);
  item.quantity = next; writeCart(items);
  return {ok:next===q,reason:next===q?undefined:"max_stock",quantity:next} as const;
}
export function clearCart(){ writeCart([]); }
