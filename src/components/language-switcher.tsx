"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="size-11 p-0 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[var(--ds-radius-small)] text-slate-400 transition-colors opacity-50 outline-none shadow-none"
      >
        <Globe size={18} />
      </Button>
    );
  }

  const isEn = pathname.startsWith('/en');
  const switchHref = isEn ? '/sw' + pathname.slice(3) : '/en' + pathname.slice(3);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-11 p-0 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[var(--ds-radius-small)] text-slate-600 dark:text-white transition-colors cursor-pointer group outline-none shadow-none"
      asChild
    >
      <Link href={switchHref} className="relative flex items-center justify-center">
        <div className="relative">
          <Globe size={18} className="text-slate-400 dark:text-slate-400 group-hover:text-[#ffd428] transition-colors" />
          <div className="absolute -right-2.5 -bottom-2 bg-[#ffd428] text-[#242a37] text-xs font-semibold px-1 rounded-[3px] border-2 border-white dark:border-[#242a37] shadow-[var(--ds-shadow-raised)] transform transition-transform leading-tight">
            {isEn ? 'EN' : 'SW'}
          </div>
        </div>
      </Link>
    </Button>
  );
}