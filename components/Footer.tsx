import Image from "next/image";
import { ArrowRight, Instagram } from "lucide-react";
import { config } from "@/lib/products";

export default function Footer() {
  return (
    <footer id="footer" className="border-t border-emerald/10 px-6 py-10 text-center">
      <div className="relative mx-auto mb-4 h-14 w-14">
        <Image src="/logo.jpg" alt="NAGMEENA" fill sizes="56px" className="rounded-full object-cover ring-1 ring-gold/25"/>
      </div>

      <div className="mx-auto mb-7 max-w-xl rounded-[26px] border border-gold/25 bg-white/55 p-3 shadow-[0_14px_40px_rgba(42,69,63,.08)] backdrop-blur-xl">
        <a href="#collections" className="group flex items-center justify-between rounded-[20px] border border-white/70 bg-gradient-to-br from-white/90 to-gold/10 px-5 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Discover NAGMEENA</span>
            <span className="mt-1 block font-heading text-xl text-emerald">Browse Collection</span>
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald text-white shadow-sm transition group-hover:translate-x-0.5"><ArrowRight size={17}/></span>
        </a>
      </div>

      <div className="mb-5 flex justify-center gap-4">
        <a href={config.instagramUrl} aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald/12 bg-white/70 text-emerald/70"><Instagram size={16}/></a>
        <a href={config.pinterestUrl} aria-label="Pinterest" className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald/12 bg-white/70 text-emerald/70">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 21c1-3 2-8 2-8"/><path d="M12 12a3 3 0 103-4"/></svg>
        </a>
      </div>

      <p className="text-xs text-emerald/40">© {new Date().getFullYear()} NAGMEENA. All rights reserved.</p>
    </footer>
  );
}
