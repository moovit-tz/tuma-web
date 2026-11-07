"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building, Building2, ChevronDown, ChevronsLeft, HandCoins, LayoutDashboard, LogOut, Menu, Package, PackagePlus, RadioTower, Receipt, Search, ShieldCheck, TriangleAlert, Truck, Users, Wallet, X, type LucideIcon, Send, Bike, Settings2, ClipboardList, ChartColumn, Bell } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { TumaMark, TumaWordmark } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HeaderActions, type QuickAction } from "./header-actions";
import { UserMenu, type ShellUser } from "./user-menu";
import { LocaleSwitch } from "./locale-switch";

export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  tower: RadioTower,
  shipments: Package,
  new: PackagePlus,
  cod: Wallet,
  exceptions: TriangleAlert,
  roles: ShieldCheck,
  users: Users,
  track: Search,
  cargo: Boxes,
  branches: Building,
  vehicles: Truck,
  clients: Building2,
  invoices: Receipt,
  payments: HandCoins,
  dispatch: Send,
  manifests: ClipboardList,
  reports: ChartColumn,
  notifications: Bell,
  drivers: Bike,
  settings: Settings2,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof NAV_ICONS; exact?: boolean; group?: string };

type Props = {
  nav: NavItem[];
  /** Group label whose items go in the lower "System" section (settings). */
  systemGroup: string;
  user: ShellUser;
  quickActions: QuickAction[];
  search: React.ReactNode;
  children: React.ReactNode;
};

const WIDE = 272;
const NARROW = 76;
const STORE_KEY = "tuma.sidebar.collapsed";

// Collapsed sidebar is a per-viewer convenience kept in localStorage (memory when storage is blocked).
const collapseListeners = new Set<() => void>();
let collapsedMemory = false;
const collapseStore = {
  subscribe(cb: () => void) {
    collapseListeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      collapseListeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  },
  get() {
    try {
      const v = localStorage.getItem(STORE_KEY);
      return v === null ? collapsedMemory : v === "1";
    } catch {
      return collapsedMemory;
    }
  },
  set(v: boolean) {
    collapsedMemory = v;
    try {
      localStorage.setItem(STORE_KEY, v ? "1" : "0");
    } catch {}
    collapseListeners.forEach((l) => l());
  },
};

/**
 * The portal frame, after the MySafari parcel portal: a fixed dark sidebar that collapses to icons,
 * a fixed top bar with the page title, search and actions, and a main area that scrolls on its own.
 */
export function PortalFrame({ nav, systemGroup, user, quickActions, search, children }: Props) {
  const { dict: t } = useI18n();
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(collapseStore.subscribe, collapseStore.get, () => false);
  const toggle = () => collapseStore.set(!collapsed);

  // The phone menu closes when the page changes.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setMobileOpen(false);
  }

  // The most specific nav link that matches the current path is the active one, and names the page.
  const active = useMemo(() => {
    let best: NavItem | undefined;
    for (const item of nav) {
      const hit = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
      if (hit && (!best || item.href.length > best.href.length)) best = item;
    }
    return best;
  }, [nav, pathname]);

  const width = collapsed ? NARROW : WIDE;

  return (
    <div className="bg-background h-dvh w-full overflow-hidden" style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}>
      {/* Phones: slide-over */}
      <div
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
        className={cn("fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <div className={cn("fixed inset-y-0 left-0 z-50 w-[272px] transition-transform duration-300 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <Sidebar nav={nav} systemGroup={systemGroup} activeHref={active?.href} user={user} collapsed={false} mobile onClose={() => setMobileOpen(false)} />
      </div>

      {/* Desktop: fixed, collapsible */}
      <div className="fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 ease-in-out lg:block" style={{ width }}>
        <Sidebar nav={nav} systemGroup={systemGroup} activeHref={active?.href} user={user} collapsed={collapsed} onToggle={toggle} />
      </div>

      <header className="bg-background fixed top-0 right-0 left-0 z-20 flex h-16 items-center gap-3 border-b px-4 transition-[left] duration-300 ease-in-out sm:px-6 lg:left-[var(--sidebar-w)]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t.shell.openMenu}
          className="hover:bg-muted -ml-1.5 grid size-10 place-items-center rounded-md lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="min-w-0 shrink truncate text-[15px] font-semibold">{active?.label ?? t.nav.dashboard}</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="min-w-0 md:w-64 xl:w-80">{search}</div>
          <HeaderActions actions={quickActions} />
          <div className="bg-border hidden h-8 w-px sm:block" aria-hidden />
          <UserMenu user={user} />
        </div>
      </header>

      <main className="h-full overflow-y-auto pt-16 transition-[padding] duration-300 ease-in-out lg:pl-[var(--sidebar-w)]" id="portal-main">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}

function Sidebar({
  nav,
  systemGroup,
  activeHref,
  user,
  collapsed,
  mobile,
  onToggle,
  onClose,
}: {
  nav: NavItem[];
  systemGroup: string;
  activeHref?: string;
  user: ShellUser;
  collapsed: boolean;
  mobile?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const { dict: t, locale } = useI18n();

  // Ungrouped items stand alone; grouped items sit under their collapsible group.
  type Entry = { kind: "item"; item: NavItem } | { kind: "group"; label: string; items: NavItem[] };
  const sections = useMemo(() => {
    const build = (items: NavItem[]): Entry[] => {
      const out: Entry[] = [];
      for (const item of items) {
        const last = out[out.length - 1];
        if (item.group && last?.kind === "group" && last.label === item.group) last.items.push(item);
        else if (item.group) out.push({ kind: "group", label: item.group, items: [item] });
        else out.push({ kind: "item", item });
      }
      return out;
    };
    return {
      main: build(nav.filter((i) => i.group !== systemGroup)),
      system: nav.filter((i) => i.group === systemGroup),
    };
  }, [nav, systemGroup]);

  const activeGroup = sections.main.find((e) => e.kind === "group" && e.items.some((i) => i.href === activeHref));
  const activeLabel = activeGroup?.kind === "group" ? activeGroup.label : null;
  const [open, setOpen] = useState<string | null>(activeLabel);
  // Opening a page inside a group expands that group.
  const [seenActive, setSeenActive] = useState(activeLabel);
  if (seenActive !== activeLabel) {
    setSeenActive(activeLabel);
    if (activeLabel) setOpen(activeLabel);
  }

  const link = (item: NavItem, sub = false) => {
    const Icon = NAV_ICONS[item.icon];
    const isActive = item.href === activeHref;
    const el = (
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3.5 border-l-4 outline-none transition-colors focus-visible:bg-white/[0.08]",
          collapsed ? "justify-center px-0 py-3.5" : sub ? "py-2.5 pr-5 pl-[3.25rem] text-[13.5px]" : "px-5 py-3 text-[14px]",
          isActive
            ? cn("border-brand-red text-sidebar-foreground font-semibold", sub ? "bg-brand-red/[0.08]" : "bg-brand-red/[0.16]")
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground border-transparent hover:bg-white/[0.05]",
        )}
      >
        {(!sub || collapsed) && <Icon className="size-[19px] shrink-0" aria-hidden />}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
    return (
      <li key={item.href}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{el}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ) : (
          el
        )}
      </li>
    );
  };

  const entry = (e: Entry) => {
    if (e.kind === "item") return link(e.item);
    // Collapsed: no room for groups, so their items show as icons.
    if (collapsed) return e.items.map((i) => link(i));
    const isOpen = open === e.label;
    const holdsActive = e.items.some((i) => i.href === activeHref);
    const Icon = NAV_ICONS[e.items[0].icon];
    return (
      <li key={e.label}>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setOpen(isOpen ? null : e.label)}
          className={cn(
            "flex w-full items-center gap-3.5 border-l-4 px-5 py-3 text-left text-[14px] outline-none transition-colors focus-visible:bg-white/[0.08]",
            holdsActive ? "border-brand-red text-sidebar-foreground bg-white/[0.04] font-semibold" : "text-sidebar-foreground/60 hover:text-sidebar-foreground border-transparent hover:bg-white/[0.05]",
          )}
        >
          <Icon className="size-[19px] shrink-0" aria-hidden />
          <span className="flex-1 truncate">{e.label}</span>
          <ChevronDown className={cn("size-4 opacity-60 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
        </button>
        <div className={cn("grid transition-[grid-template-rows] duration-200", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <ul className="overflow-hidden bg-black/30">{e.items.map((i) => link(i, true))}</ul>
        </div>
      </li>
    );
  };

  const label = (text: string) => !collapsed && <p className="text-sidebar-muted mb-2 px-6 font-mono text-[10.5px] tracking-[0.14em] uppercase">{text}</p>;

  return (
    <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r">
      <div className={cn("border-sidebar-border flex h-16 shrink-0 items-center border-b", collapsed ? "justify-center" : "justify-between pr-3 pl-5")}>
        {collapsed ? (
          <button type="button" onClick={onToggle} aria-label={t.shell.expand} className="rounded-md p-1.5 outline-none hover:bg-white/[0.08] focus-visible:bg-white/[0.08]">
            <TumaMark className="size-8" />
          </button>
        ) : (
          <>
            <Link href={`/${locale}/portal`} className="outline-none">
              <TumaWordmark by={t.brand.by} />
            </Link>
            <button
              type="button"
              onClick={mobile ? onClose : onToggle}
              aria-label={mobile ? t.shell.closeMenu : t.shell.collapse}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded-md p-2 outline-none hover:bg-white/[0.08] focus-visible:bg-white/[0.08]"
            >
              {mobile ? <X className="size-5" /> : <ChevronsLeft className="size-5" />}
            </button>
          </>
        )}
      </div>

      <nav className="no-scrollbar flex-1 overflow-x-hidden overflow-y-auto py-5" aria-label={t.shell.menu}>
        <TooltipProvider delayDuration={0}>
        {label(t.shell.menu)}
        <ul className="flex flex-col">{sections.main.map(entry)}</ul>
        {sections.system.length > 0 && (
          <div className={cn("border-sidebar-border mt-6 border-t pt-6", collapsed && "mt-4 pt-4")}>
            {label(t.shell.system)}
            <ul className="flex flex-col">{sections.system.map((i) => link(i))}</ul>
          </div>
        )}
        </TooltipProvider>
      </nav>

      <div className="border-sidebar-border shrink-0 border-t bg-white/[0.03] p-3">
        <div className={cn("flex items-center gap-3", collapsed && "flex-col")}>
          <div aria-hidden className="bg-brand-red grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold text-white">
            {user.initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-sidebar-muted truncate text-xs">{user.company ?? user.roleLabel}</p>
            </div>
          )}
          {/* Phones keep the language switch here so the top bar stays uncluttered. */}
          {mobile && <LocaleSwitch dark />}
          <form action={`/api/auth/logout?locale=${locale}`} method="post">
            <button
              title={t.common.signOut}
              aria-label={t.common.signOut}
              className="text-sidebar-foreground/60 rounded-md p-2 outline-none transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:bg-red-500/15"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
