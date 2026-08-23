import { getCatalog } from "@/lib/catalog";
import BuyNowCheckout from "@/components/BuyNowCheckout";
export const dynamic="force-dynamic";
export default async function BuyNowPage({searchParams}:{searchParams:{product?:string;cart?:string;variant?:string}}){
 const {products}=await getCatalog(); if(searchParams.cart==="1")return <BuyNowCheckout/>;
 const product=products.find(p=>p.productCode===searchParams.product); if(!product)return <main className="flex min-h-screen items-center justify-center bg-base px-5 text-center text-emerald"><div><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-gold">NAGMEENA</p><h1 className="mt-2 font-heading text-3xl">Product unavailable</h1><a href="/#collections" className="mt-5 inline-flex rounded-full bg-emerald px-5 py-3 text-sm font-semibold text-white">Back to Collection</a></div></main>;
 return <BuyNowCheckout product={product} variantId={searchParams.variant}/>;
}
