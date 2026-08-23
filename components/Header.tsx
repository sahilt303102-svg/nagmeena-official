"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, ShoppingBag, X } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

interface HeaderProps {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onOpenCart: () => void;
  cartCount: number;
}

export default function Header({ drawerOpen, onToggleDrawer, onOpenCart, cartCount }: HeaderProps) {
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 50);
  });

  return (
    <motion.header
      variants={{ visible: { y: 0, opacity: 1 }, hidden: { y: "-120%", opacity: 0 } }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-3 z-50 mx-auto flex h-16 w-[calc(100%-1.5rem)] max-w-6xl items-center justify-between rounded-full border border-white/30 bg-white/50 px-4 shadow-[0_8px_32px_rgba(0,0,0,.08)] backdrop-blur-xl md:top-5 md:h-20 md:px-8"
    >
      <a href="/" className="flex items-center gap-2.5" aria-label="NAGMEENA home">
        <div className="relative h-9 w-9 overflow-hidden rounded-full ring-1 ring-gold/30 md:h-11 md:w-11">
          <Image src="/logo.jpg" alt="NAGMEENA logo" fill sizes="44px" className="object-cover" priority />
        </div>
        <span className="font-display text-base tracking-[0.14em] text-emerald md:text-lg">NAGMEENA</span>
      </a>

      <div className="flex items-center gap-2.5">
        <motion.button
          onClick={onOpenCart}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.03 }}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-emerald/15 bg-white/80 text-emerald shadow-sm md:h-10 md:w-10"
          aria-label={`Open cart${cartCount ? `, ${cartCount} item${cartCount === 1 ? "" : "s"}` : ""}`}
        >
          <ShoppingBag size={16} strokeWidth={2.2} />
          {cartCount > 0 && (
            <motion.span
              key={cartCount}
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
              className="absolute -right-1.5 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold leading-4 text-white shadow-sm ring-2 ring-white/90"
            >
              {cartCount > 99 ? "99+" : cartCount}
            </motion.span>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald/15 bg-white/75 text-emerald md:h-10 md:w-10"
        >
          {drawerOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </motion.button>
      </div>
    </motion.header>
  );
}
