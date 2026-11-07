"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, Building2, FileText, HandCoins, PackagePlus, PackageSearch, Package, ShieldCheck, TriangleAlert, Truck, Users, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { isValidWaybill, normaliseWaybill } from "@/domain/waybill-number";
import { LocaleSwitch } from "./locale-switch";
import { ThemeSwitch } from "./theme-switch";

const QA_ICONS = {
  newShipment: PackagePlus,
  shipments: Package,
  cargo: Boxes,
  vehicles: Truck,
  newInvoice: FileText,
  payments: HandCoins,
  exceptions: TriangleAlert,
  roles: ShieldCheck,
  team: Users,
  clients: Building2,
};
export type QuickAction = { key: keyof typeof QA_ICONS; href: string };

/** Top-bar actions, as in the parcel portal: language, Track parcel, and Quick actions for the user's role. */
export function HeaderActions({ actions }: { actions: QuickAction[] }) {
  const { dict: t } = useI18n();
  const [trackOpen, setTrackOpen] = useState(false);
  return (
    <>
      <LocaleSwitch className="hidden sm:inline-flex" />
      <ThemeSwitch className="hidden sm:grid" />
      <button
        type="button"
        onClick={() => setTrackOpen(true)}
        aria-label={t.shell.trackParcel}
        className="bg-brand-red hover:bg-brand-red/90 inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-[13px] font-semibold text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:px-4"
      >
        <PackageSearch className="size-[18px]" aria-hidden />
        <span className="hidden md:inline">{t.shell.trackParcel}</span>
      </button>
      {actions.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            aria-label={t.shell.quickActions}
            className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/85 data-[state=open]:bg-sidebar/85 inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-[13px] font-semibold shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:ring-1 dark:ring-white/10 lg:px-4"
          >
            <Zap className="text-brand-red size-[18px] fill-current" aria-hidden />
            <span className="hidden lg:inline">{t.shell.quickActions}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0">
            <div className="bg-sidebar text-sidebar-foreground px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="bg-brand-red grid size-6 place-items-center rounded">
                  <Zap className="size-3.5 fill-current text-white" aria-hidden />
                </span>
                <span className="text-base font-semibold">{t.shell.quickActions}</span>
              </div>
              <p className="text-sidebar-muted mt-1.5 text-xs">{t.shell.commonTasks}</p>
            </div>
            <div className="p-1.5">
              {actions.map((a) => {
                const Icon = QA_ICONS[a.key];
                const [title, desc] = t.shell.qa[a.key] ?? [a.key, ""];
                return (
                  <DropdownMenuItem key={a.key} asChild className="group gap-3 px-3 py-2.5">
                    <Link href={a.href}>
                      <span className="bg-muted group-focus:bg-background grid size-9 shrink-0 place-items-center rounded-md">
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-sm font-semibold">{title}</span>
                        <span className="text-muted-foreground block truncate text-xs">{desc}</span>
                      </span>
                      <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-focus:opacity-100" aria-hidden />
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <TrackDialog open={trackOpen} onOpenChange={setTrackOpen} />
    </>
  );
}

function TrackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dict: t, locale } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let wb = "";
    try {
      wb = normaliseWaybill(value).waybill;
    } catch {}
    if (!wb || !isValidWaybill(wb)) {
      setError(t.shell.trackInvalid);
      return;
    }
    onOpenChange(false);
    setValue("");
    setError(null);
    router.push(`/${locale}/portal/shipments/${wb}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.shell.trackTitle}</DialogTitle>
          <DialogDescription>{t.shell.trackHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? "track-err" : undefined}
            aria-label={t.shell.trackTitle}
            placeholder="AAB204"
            className="bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-12 w-full rounded-md border px-3 font-mono text-[16px] tracking-wider uppercase outline-none"
          />
          {error && (
            <p id="track-err" className="text-destructive text-[13px]">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full">
            {t.shell.trackGo} <ArrowRight />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
