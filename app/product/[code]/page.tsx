import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

async function getProduct(code: string) {
  const decoded = decodeURIComponent(code).toUpperCase();
  const { products } = await getCatalog();
  return products.find((p) => p.productCode.toUpperCase() === decoded) || null;
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const product = await getProduct(params.code);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  const title = `${product.productCode}${product.fabric ? ` — ${product.fabric}` : ""}`;
  const description = [
    `Explore ${product.productCode} from NAGMEENA`,
    product.fabric ? `${product.fabric} fabric` : "",
    product.work ? `${product.work}` : "",
    product.color ? `available in ${product.color}` : "",
  ].filter(Boolean).join(". ") + ". Check current colour options, stock and order details.";
  const image = product.images?.[0]?.url || "/logo.jpg";
  return {
    title,
    description,
    alternates: { canonical: `/product/${encodeURIComponent(product.productCode)}` },
    openGraph: { type: "website", title, description, url: `/product/${encodeURIComponent(product.productCode)}`, images: [{ url: image, alt: `${product.productCode} NAGMEENA suit` }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProductPage({ params }: { params: { code: string } }) {
  const product = await getProduct(params.code);
  if (!product) notFound();
  const primaryImage = product.images?.[0]?.url;
  const available = (product.variants || []).filter((v) => v.isActive && v.stockQuantity > 0);
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.productCode} NAGMEENA Suit`,
    sku: product.productCode,
    brand: { "@type": "Brand", name: "NAGMEENA" },
    image: product.images.map((i) => i.url),
    description: [product.fabric, product.work, product.color].filter(Boolean).join(" · ") || "NAGMEENA ethnic suit",
    url: `${siteUrl}/product/${encodeURIComponent(product.productCode)}`,
    offers: product.price != null ? {
      "@type": "Offer",
      priceCurrency: "INR",
      price: String(product.price),
      availability: available.length || product.stockStatus !== "out_of_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl}/?product=${encodeURIComponent(product.productCode)}`,
    } : undefined,
  };

  return (
    <main className="min-h-screen bg-base px-4 py-8 text-emerald sm:px-6 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-5xl">
        <Link href={`/?product=${encodeURIComponent(product.productCode)}`} className="mb-6 inline-flex rounded-full border border-emerald/15 bg-white/80 px-4 py-2 text-sm font-medium shadow-sm">← Back to collection</Link>
        <article className="grid gap-7 rounded-[2rem] border border-emerald/10 bg-white/85 p-4 shadow-xl sm:p-6 md:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-[#eee7da]">
            {primaryImage ? (primaryImage.startsWith("http") ? <img src={primaryImage} alt={`${product.productCode} NAGMEENA suit`} className="h-full w-full object-cover" /> : <Image src={primaryImage} alt={`${product.productCode} NAGMEENA suit`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />) : null}
          </div>
          <div className="flex flex-col justify-center py-2 md:py-6">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald/45">NAGMEENA Collection</p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl">{product.productCode}</h1>
            {product.price != null && <p className="mt-4 text-2xl font-semibold">₹{Number(product.price).toLocaleString("en-IN")}</p>}
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {product.fabric && <div className="rounded-2xl bg-[#f7f1e6] p-3"><dt className="text-xs text-emerald/50">Fabric</dt><dd className="mt-1 font-medium">{product.fabric}</dd></div>}
              {product.work && <div className="rounded-2xl bg-[#f7f1e6] p-3"><dt className="text-xs text-emerald/50">Work</dt><dd className="mt-1 font-medium">{product.work}</dd></div>}
              {product.color && <div className="rounded-2xl bg-[#f7f1e6] p-3"><dt className="text-xs text-emerald/50">Primary colour</dt><dd className="mt-1 font-medium">{product.color}</dd></div>}
              <div className="rounded-2xl bg-[#f7f1e6] p-3"><dt className="text-xs text-emerald/50">Availability</dt><dd className="mt-1 font-medium">{product.stockStatus === "out_of_stock" ? "Out of stock" : "Available"}</dd></div>
            </dl>
            {!!product.variants?.length && <div className="mt-5"><p className="text-xs uppercase tracking-wide text-emerald/50">Colours</p><div className="mt-2 flex flex-wrap gap-2">{product.variants.filter(v=>v.isActive).map(v=><span key={v.id} className={`rounded-full border px-3 py-1.5 text-xs ${v.stockQuantity>0?"border-emerald/15 bg-white":"border-black/5 bg-black/5 text-black/35"}`}>{v.color}{v.stockQuantity<=0?" · Out of stock":""}</span>)}</div></div>}
            <Link href={`/?product=${encodeURIComponent(product.productCode)}`} className="mt-7 inline-flex justify-center rounded-full bg-emerald px-5 py-3.5 text-sm font-semibold text-white shadow-lg">View full details & order</Link>
          </div>
        </article>
      </div>
    </main>
  );
}
