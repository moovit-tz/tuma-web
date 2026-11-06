import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser, type CurrentUser } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { accounts, roles } from "@/server/db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { NoAccess } from "./no-access";
import { canSetUp, canUseConsole, canUsePartner, canUsePortal } from "@/domain/roles";
import { PortalFrame, type NavItem } from "./portal-frame";
import type { QuickAction } from "./header-actions";
import type { Permission } from "@/domain/roles";

/** `permission`: the item shows when the user holds this permission, or any of a list. */
export type ShellNavItem = NavItem & { permission?: Permission | Permission[] };
type ShellQuickAction = QuickAction & { permission: Permission | Permission[] };

type Props = {
  locale: string;
  nav: ShellNavItem[];
  /** Nav group shown in the lower "System" section of the sidebar. */
  systemGroup: string;
  quickActions: ShellQuickAction[];
  /** The user needs at least one of these permissions to use the portal at all. */
  gate: Permission[];
  /** Search box in the top bar. */
  search?: React.ReactNode;
  children: React.ReactNode;
};

const holds = (user: CurrentUser, p?: Permission | Permission[]) => !p || (Array.isArray(p) ? p : [p]).some((x) => user.permissions.has(x));

/**
 * The portal chrome, laid out like the MySafari parcel portal. Everything reads the session, so it
 * streams in behind Suspense (Cache Components); the fallback has the same frame so nothing jumps.
 */
export function AppShell(props: Props) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Shell {...props} />
    </Suspense>
  );
}

async function Shell({ locale, nav, systemGroup, quickActions, gate, search, children }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/signin`);
  // Signed in but nothing to open here yet (no business, or one under review whose people can't set up): the
  // onboarding page. People in a business under review who can set up (team, offices) get the set-up pages.
  if (!canUseConsole(user.permissions) && !canUsePartner(user.permissions) && !canUsePortal(user.permissions) && !canSetUp(user.permissions)) redirect(`/${locale}/onboarding`);

  const [roleRows, account] = await Promise.all([
    user.roles.length ? db.select({ key: roles.key, name: roles.name }).from(roles).where(inArray(roles.key, user.roles)) : Promise.resolve([]),
    user.accountId ? db.select({ name: accounts.name, type: accounts.type }).from(accounts).where(eq(accounts.id, user.accountId)).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  const roleLabel = roleRows.map((r) => r.name).join(", ") || user.roles.join(", ");
  const shellUser = {
    name: user.name,
    initials: user.name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    roleLabel,
    // Tuma Staff belong to the internal account; showing "Moovit" under every name says nothing.
    company: account && account.type !== "internal" ? account.name : null,
  };

  const allowed = gate.some((g) => user.permissions.has(g));
  return (
    <PortalFrame
      nav={nav.filter((i) => holds(user, i.permission)).map(({ permission: _p, ...i }) => i)}
      systemGroup={systemGroup}
      user={shellUser}
      quickActions={quickActions.filter((a) => holds(user, a.permission)).map(({ key, href }) => ({ key, href }))}
      search={search}
    >
      <Suspense fallback={<PageSkeleton />}>{allowed ? children : <NoAccess locale={locale} />}</Suspense>
    </PortalFrame>
  );
}

function FrameSkeleton() {
  return (
    <div className="bg-background h-dvh w-full overflow-hidden">
      <div className="bg-sidebar fixed inset-y-0 left-0 hidden w-[272px] lg:block" />
      <div className="bg-background fixed top-0 right-0 left-0 h-16 border-b lg:left-[272px]" />
      <div className="px-4 pt-24 sm:px-6 lg:pl-[296px]">
        <PageSkeleton />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

