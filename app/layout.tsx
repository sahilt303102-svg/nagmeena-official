import type { Metadata } from "next";
import { Cinzel, Marcellus, Jost } from "next/font/google";
// CSS is processed by Next.js at build time; TypeScript may not have a declaration for it.
// @ts-expect-error -- side-effect CSS import handled by Next.js
import "./globals.css";
import { defaultSeoDescription, defaultSeoTitle, getSiteUrl } from "@/lib/site";
import { SpeedInsights } from "@vercel/speed-insights/next";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cinzel",
});
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marcellus",
});
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultSeoTitle, template: "%s | NAGMEENA" },
  description: defaultSeoDescription,
  applicationName: "NAGMEENA",
  alternates: { canonical: "/" },
  keywords: [
    "NAGMEENA",
    "women ethnic suits",
    "Indian suits",
    "festive suits",
    "ethnic wear",
    "suit sets",
    "women fashion India",
  ],
  authors: [{ name: "NAGMEENA" }],
  creator: "NAGMEENA",
  publisher: "NAGMEENA",
  category: "fashion",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "NAGMEENA",
    title: defaultSeoTitle,
    description: defaultSeoDescription,
    images: [
      {
        url: "/logo.jpg",
        width: 1000,
        height: 1000,
        alt: "NAGMEENA ethnic wear",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultSeoTitle,
    description: defaultSeoDescription,
    images: ["/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <body
        className={`${cinzel.variable} ${marcellus.variable} ${jost.variable} font-body antialiased`}
      >
        <SpeedInsights />
        {children}
      </body>
    </html>
  );
}
