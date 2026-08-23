"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { config } from "@/lib/products";

type HeroSlide = {
  id?: string;
  slide_number: number;
  title: string;
  desktop_image_url: string;
  mobile_image_url: string;
};

const fallbackSlides: HeroSlide[] = [
  { slide_number: 1, title: "Anarkali Suits — Festive Silhouettes", desktop_image_url: "/desk1.png", mobile_image_url: "/mobile1.png" },
  { slide_number: 2, title: "Straight Suits — Everyday Grace", desktop_image_url: "/desk 2.png", mobile_image_url: "/mobile2.png" },
  { slide_number: 3, title: "Designer Heavy Suits — Bridal Radiance", desktop_image_url: "/desk 3.png", mobile_image_url: "/mobile3.png" },
];

const SLIDE_DURATION = 5500;

export default function Hero() {
  const [active, setActive] = useState(0);
  const [slides, setSlides] = useState<HeroSlide[]>(fallbackSlides);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => setShowWhatsapp(latest > 60));

  useEffect(() => {
    let mounted = true;
    fetch("/api/hero", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !Array.isArray(data?.slides) || data.slides.length !== 3) return;
        setSlides(data.slides);
        setActive(0);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setActive((prev) => (prev + 1) % slides.length), SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [slides.length]);

  const currentSlide = slides[active] || fallbackSlides[0];

  return (
    <section className="relative flex min-h-[100vh] flex-col items-center justify-end overflow-hidden px-4 pt-28 pb-12 sm:px-6 md:min-h-[90vh] md:pt-36 md:pb-16">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentSlide.id || currentSlide.slide_number}-${active}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-[#f3ede1] via-[#eee6d6] to-[#e7dcc4]"
          >
            <picture>
              <source media="(max-width: 767px)" srcSet={currentSlide.mobile_image_url} />
              <Image
                src={currentSlide.desktop_image_url}
                alt={currentSlide.title}
                fill
                priority={active === 0}
                sizes="100vw"
                className="object-cover object-top brightness-[0.95] contrast-[1.02]"
              />
            </picture>
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-white/5 to-[#FAF8F5]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-full border border-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.6)] backdrop-blur-xl md:h-36 md:w-36">
          <Image src="/logo.jpg" alt="NAGMEENA" fill sizes="144px" className="object-cover ring-1 ring-gold/25" priority />
        </div>
        <p className="font-heading text-base italic text-emerald drop-shadow-sm md:text-lg">Elegance Woven in Every Thread</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.45 }}
        className="relative z-10 mt-8 text-center"
      >
        <h1 className="font-heading text-4xl font-medium tracking-[0.16em] text-emerald drop-shadow-sm sm:text-5xl md:text-6xl">NAGMEENA</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="relative z-10 mt-6 flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-3.5 py-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md"
        aria-label="Hero slide navigation"
      >
        {slides.map((slide, i) => (
          <button key={slide.id || slide.slide_number} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`} className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${i === active ? "scale-125 bg-gold" : "bg-emerald/20 hover:bg-emerald/35"}`} />
        ))}
      </motion.div>

      <AnimatePresence>
        {showWhatsapp && (
          <motion.a
            href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(config.whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Contact on WhatsApp"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full border border-white/40 bg-white/40 px-4 py-3 text-xs font-semibold text-emerald shadow-[0_12px_40px_0_rgba(0,0,0,0.12),inset_0_1px_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl backdrop-saturate-150 sm:bottom-6 sm:right-6 sm:px-5 sm:py-3.5 sm:text-sm"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm sm:h-8 sm:w-8"><MessageCircle size={16} strokeWidth={2.2} /></div>
            <span className="hidden font-medium tracking-wide sm:inline">Chat on WhatsApp</span>
          </motion.a>
        )}
      </AnimatePresence>
    </section>
  );
}
