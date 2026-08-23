import HeaderClient from "@/components/HeaderClient";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import WhatsAppSection from "@/components/WhatsAppSection";
import Footer from "@/components/Footer";
import PromotionPopup from "@/components/PromotionPopup";
import { getCatalog } from "@/lib/catalog";
import { config } from "@/lib/products";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { products } = await getCatalog();
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${siteUrl}/#store`,
    name: "NAGMEENA",
    url: siteUrl,
    logo: `${siteUrl}/logo.jpg`,
    image: `${siteUrl}/logo.jpg`,
    description: "NAGMEENA women's ethnic suits, festive wear and elegant suit sets.",
    sameAs: [config.instagramUrl, config.pinterestUrl].filter(Boolean),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${config.whatsappNumber}`,
      contactType: "customer service",
      availableLanguage: ["English", "Hindi"],
    },
  };
  return (
    <main className="min-h-screen bg-base">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PromotionPopup />
      <HeaderClient />
      <Hero />
      <ProductGrid products={products} />
      <WhatsAppSection />
      <Footer />
    </main>
  );
}
