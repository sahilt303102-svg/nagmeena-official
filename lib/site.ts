const FALLBACK_SITE_URL = "https://nagmeena.vercel.app";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return FALLBACK_SITE_URL;
}

export const brandName = "NAGMEENA";
export const defaultSeoTitle = "NAGMEENA | Women's Ethnic Suits & Festive Wear";
export const defaultSeoDescription =
  "Discover NAGMEENA women's ethnic suits, festive wear and elegant suit sets. Browse fabrics, work, colours and availability, then order securely through our guided checkout.";
