"use client";
import { Building2, LogOut, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";

export type ShellUser = { name: string; initials: string; roleLabel: string; company: string | null };

/** Name and role in the top bar; opens a card with the user's role, company and sign out. */
export function UserMenu({ user }: { user: ShellUser }) {
  const { dict: t, locale } = useI18n();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t.shell.account}
        className="hover:bg-muted data-[state=open]:bg-muted flex h-11 items-center gap-3 rounded-md pr-1 pl-2 outline-none focus-visible:ring-2"
      >
        <span className="hidden text-right leading-tight sm:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold">{user.name}</span>
          <span className="text-muted-foreground block max-w-[160px] truncate text-xs">{user.company ?? user.roleLabel}</span>
        </span>
        <span aria-hidden className="bg-brand-red grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold text-white">
          {user.initials}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(18rem,calc(100vw-2rem))] p-1.5">
        <DropdownMenuLabel className="p-3 font-normal">
          <div className="flex items-center gap-3">
            <span aria-hidden className="bg-brand-red grid size-10 shrink-0 place-items-center rounded-md font-semibold text-white">
              {user.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
              <ShieldCheck className="text-parcel size-3.5" aria-hidden />
              {user.roleLabel}
            </span>
            {user.company && (
              <span className="bg-muted inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                <Building2 className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{user.company}</span>
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={`/api/auth/logout?locale=${locale}`} method="post">
          <button className="text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 flex h-10 w-full items-center gap-3 rounded-sm px-3 text-sm font-medium outline-none">
            <LogOut className="size-[18px]" aria-hidden />
            {t.common.signOut}
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
