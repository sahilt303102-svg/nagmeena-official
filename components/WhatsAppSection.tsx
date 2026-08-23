// "use client";

// import { motion } from "framer-motion";
// import { MessageCircle } from "lucide-react";
// import { config } from "@/lib/products";

// export default function WhatsAppSection() {
//   const href = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
//     config.whatsappMessage
//   )}`;

//   return (
//     <section id="whatsapp" className="px-5 py-14 md:px-10 md:py-20 lg:px-16">
//       <div className="mx-auto max-w-xl rounded-[28px] border border-emerald/10 bg-white/70 p-9 text-center shadow-glass backdrop-blur-md">
//         <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald to-olive shadow-gold">
//           <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald/30" />
//           <MessageCircle size={26} className="relative text-white" strokeWidth={2} />
//         </div>

//         <h3 className="font-heading text-2xl text-emerald">
//           Inquire About Stock &amp; Sizing
//         </h3>
//         <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-emerald/70">
//           Take a screenshot of any suit and chat with us directly on WhatsApp
//           to check stock availability and place direct orders.
//         </p>

//         <motion.a
//           href={href}
//           target="_blank"
//           rel="noopener noreferrer"
//           whileTap={{ scale: 0.96 }}
//           whileHover={{ scale: 1.02 }}
//           className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-[#25D366] to-[#1CAA53] py-4 text-sm font-semibold text-white shadow-lg"
//         >
//           <MessageCircle size={20} />
//           Chat on WhatsApp Now
//         </motion.a>
//       </div>
//     </section>
//   );
// }

//New Code

"use client";

import { motion } from "framer-motion";
import { MessageCircle, Instagram } from "lucide-react";
import { config } from "@/lib/products";

export default function WhatsAppSection() {
  const whatsappHref = `https://wa.me/${
    config.whatsappNumber
  }?text=${encodeURIComponent(config.whatsappMessage)}`;

  const instagramHref = config.instagramUrl || "https://instagram.com";

  return (
    <section
      id="whatsapp"
      className="px-4 py-12 sm:px-6 md:px-10 md:py-20 lg:px-16"
    >
      <div className="mx-auto max-w-xl rounded-3xl border border-white/30 bg-white/40 p-7 text-center shadow-[0_12px_40px_0_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl backdrop-saturate-150 sm:p-10">
        {/* Floating Glass Icon Badge */}
        <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-white/50 text-emerald shadow-[0_8px_24px_0_rgba(0,0,0,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald/10" />
          <MessageCircle size={24} strokeWidth={2} />
        </div>

        <h3 className="font-heading text-xl text-emerald sm:text-2xl">
          Inquire About Stock &amp; Sizing
        </h3>

        <p className="mx-auto mt-2.5 max-w-sm text-xs leading-relaxed text-emerald/70 sm:text-sm">
          Take a screenshot of any suit and chat with us directly on WhatsApp to
          check stock availability, or follow our latest releases on Instagram.
        </p>

        {/* Action Buttons Grid */}
        <div className="mt-6 flex flex-col gap-3.5 sm:mt-8 sm:flex-row sm:gap-3">
          {/* WhatsApp Primary Glass CTA */}
          <motion.a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            className="flex flex-1 items-center justify-center gap-2.5 rounded-full border border-white/30 bg-gradient-to-r from-[#25D366] to-[#1CAA53] py-3.5 text-xs font-semibold text-white shadow-[0_8px_24px_0_rgba(37,211,102,0.35)] transition-shadow duration-300 hover:shadow-[0_12px_32px_0_rgba(37,211,102,0.5)] sm:text-sm"
          >
            <MessageCircle
              size={19}
              strokeWidth={2.2}
              className="text-white fill-white/10"
            />
            <span>Chat on WhatsApp</span>
          </motion.a>

          {/* Instagram Vibrant Glass CTA */}
          <motion.a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            className="relative flex flex-1 items-center justify-center gap-2.5 rounded-full border border-white/40 bg-white/50 py-3.5 text-xs font-semibold text-emerald shadow-[0_4px_20px_0_rgba(0,0,0,0.05),inset_0_1px_1.5px_0_rgba(255,255,255,0.8)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 hover:border-white/60 hover:bg-white/70 hover:shadow-[0_8px_28px_0_rgba(0,0,0,0.08),inset_0_1px_2px_0_rgba(255,255,255,0.9)] sm:text-sm"
          >
            <Instagram size={19} strokeWidth={2} className="text-[#E4405F]" />
            <span>Follow Instagram</span>
          </motion.a>
        </div>
      </div>
    </section>
  );
}
