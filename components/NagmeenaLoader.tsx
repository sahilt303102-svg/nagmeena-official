"use client";

import Image from "next/image";

type NagmeenaLoaderProps = {
  visible?: boolean;
  text?: string;
};

export default function NagmeenaLoader({
  visible = true,
  text = "Preparing your experience...",
}: NagmeenaLoaderProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[radial-gradient(circle_at_center,#fffdf8_0%,#faf7ef_48%,#f5efe4_100%)] px-5"
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="nagmeena-reduce-motion -translate-y-2 flex flex-col items-center text-center">
        <div className="relative flex h-[150px] w-[150px] items-center justify-center sm:h-[180px] sm:w-[180px] lg:h-[200px] lg:w-[200px]">
          <div className="absolute inset-2 rounded-full border-[6px] border-[#ca9e37]/10 shadow-[0_0_35px_rgba(196,151,39,0.10),inset_0_0_25px_rgba(255,255,255,0.9)] animate-[nagmeenaHalo_2.6s_ease-in-out_infinite] sm:border-[7px]" />

          <div className="absolute inset-[12px] rounded-full border border-[#be9123]/40 bg-white/10 shadow-[0_15px_40px_rgba(91,70,24,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:inset-[14px]" />

          <div className="absolute inset-[19px] rounded-full border border-[#d6b258]/25 sm:inset-[22px]" />

          <div className="relative z-10 h-[116px] w-[116px] overflow-hidden rounded-full shadow-[0_12px_35px_rgba(82,62,20,0.10)] animate-[nagmeenaLogoBreath_3.2s_ease-in-out_infinite] sm:h-[140px] sm:w-[140px] lg:h-[156px] lg:w-[156px]">
            <Image
              src="/logo.jpg"
              alt="NAGMEENA"
              fill
              priority
              sizes="(max-width: 639px) 116px, (max-width: 1023px) 140px, 156px"
              className="object-cover"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 z-20 rounded-full animate-[nagmeenaOrbit_3s_linear_infinite]">
            <div className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-[#cca033] shadow-[0_0_7px_rgba(211,169,66,0.9),0_0_15px_rgba(211,169,66,0.5),0_0_28px_rgba(211,169,66,0.25)]">
              <div className="absolute -inset-1.5 rounded-full bg-[#e1c068]/15 blur-sm" />
            </div>
          </div>
        </div>

        <div className="mt-4 font-serif text-lg font-normal tracking-[0.30em] text-[#31534f] sm:mt-5 sm:text-xl lg:text-2xl">
          NAGMEENA
        </div>

        <div className="mt-3 h-px w-[92px] bg-gradient-to-r from-transparent via-[#bf9326]/70 to-transparent sm:w-[100px]" />

        <div className="mt-[10px] max-w-[280px] font-serif text-[10px] italic tracking-[0.08em] text-[#9b762d]/80 animate-[nagmeenaText_2s_ease-in-out_infinite] sm:text-xs">
          {text}
        </div>
      </div>
    </div>
  );
}
