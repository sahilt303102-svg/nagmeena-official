"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Boxes, LockKeyhole, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const links = [
  { label: "Collections", href: "/#collections", icon: Sparkles },
  { label: "Orders", href: "/orders", icon: Boxes, accent: true },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "WhatsApp & Support", href: "/#whatsapp", icon: MessageCircle },
  { label: "Admin", href: "/admin", icon: LockKeyhole, admin: true },
];

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[#102a24]/20 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: -14, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -14, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 top-20 z-50 max-h-[80vh] overflow-y-auto rounded-3xl border border-white/45 bg-white/75 p-3 shadow-[0_18px_58px_rgba(20,50,43,.16)] backdrop-blur-2xl md:inset-x-auto md:right-6 md:w-80"
          >
            <div className="px-3 pb-2 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-gold">NAGMEENA</p>
              <p className="mt-1 text-xs text-emerald/45">Browse, track and manage</p>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map((link, index) => {
                const Icon = link.icon;
                return (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    onClick={onClose}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * index, duration: 0.22 }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 hover:bg-white ${
                      link.admin
                        ? "mt-2 border-emerald/8 bg-emerald/[.035] text-emerald/65"
                        : link.accent
                          ? "border-gold/20 bg-gold/[.06] text-emerald"
                          : "border-transparent text-emerald"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm"><Icon size={16} /></span>
                    <span className="font-heading text-[15px] tracking-wide">{link.label}</span>
                  </motion.a>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
