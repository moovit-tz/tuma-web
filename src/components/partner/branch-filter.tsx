"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";

/**
 * Branch switch for company-wide staff (all branches, or one). People tied to a branch see their branch name only.
 * Keeps the page's other filters (period, tab, search) in the URL.
 */
export function BranchFilter({ options, value, locked }: { options: { id: string; name: string; code: string }[]; value: string | null; locked?: boolean }) {
  const { dict } = useI18n();
  const b = dict.branches;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = options.find((o) => o.id === value);

  if (locked || options.length <= 1) {
    if (!current && !options[0]) return null;
    return (
      <span className="bg-muted text-foreground inline-flex h-10 items-center gap-2 rounded-md px-3 text-[13px] font-semibold">
        <Building className="text-muted-foreground size-4" aria-hidden />
        {(current ?? options[0]).name}
      </span>
    );
  }

  const go = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("branch", id);
    else next.delete("branch");
    next.delete("cursor");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="bg-card hover:bg-muted data-[state=open]:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold outline-none focus-visible:ring-2">
        <Building className="text-muted-foreground size-4" aria-hidden />
        <span className="max-w-[160px] truncate">{current?.name ?? b.all}</span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuItem onSelect={() => go(null)} aria-current={!value ? "true" : undefined} className="aria-[current]:font-semibold">
          {b.all}
        </DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o.id} onSelect={() => go(o.id)} aria-current={o.id === value ? "true" : undefined} className="gap-3 aria-[current]:font-semibold">
            <span className="text-muted-foreground w-9 font-mono text-[11px]">{o.code}</span>
            <span className="flex-1 truncate">{o.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
