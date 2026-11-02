"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { PARTNER_GRANTABLE, PERMISSIONS } from "@/domain/roles";
import { deleteRoleAction, saveRoleAction, setRoleActiveAction } from "@/app/actions/roles";
import { cn } from "@/lib/utils";

type RoleForm = { key: string; name: string; description: string; surface: string; permissions: string[] };
const inputCls = "bg-background h-10 w-full rounded-md border px-3 text-[15px] outline-none focus-visible:border-ring aria-[invalid=true]:border-destructive";

export function RoleEditor({
  locale,
  mode,
  initial,
  system,
  active = true,
  userCount = 0,
  scope = "platform",
  readOnly = false,
}: {
  locale: string;
  mode: "create" | "update";
  initial: RoleForm;
  system?: boolean;
  active?: boolean;
  userCount?: number;
  /** account = a partner admin editing roles for its own company (limited permission catalog). */
  scope?: "platform" | "account";
  /** Built-in roles a partner can see but not change. */
  readOnly?: boolean;
}) {
  const { dict: t } = useI18n();
  const router = useRouter();
  const [v, setV] = useState<RoleForm>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const base = `/${locale}/portal/settings/roles`;

  const groups = useMemo(() => {
    const m = new Map<string, (typeof PERMISSIONS)[number][]>();
    const catalog = scope === "account" ? PERMISSIONS.filter((p) => PARTNER_GRANTABLE.includes(p.key)) : PERMISSIONS;
    for (const p of catalog) m.set(p.group, [...(m.get(p.group) ?? []), p]);
    return [...m.entries()];
  }, [scope]);
  const has = (k: string) => v.permissions.includes(k);
  const toggle = (k: string, on: boolean) => setV({ ...v, permissions: on ? [...v.permissions, k] : v.permissions.filter((x) => x !== k) });
  const toggleGroup = (keys: string[], on: boolean) =>
    setV({ ...v, permissions: on ? [...new Set([...v.permissions, ...keys])] : v.permissions.filter((x) => !keys.includes(x)) });

  const changed = JSON.stringify({ ...v, permissions: [...v.permissions].sort() }) !== JSON.stringify({ ...initial, permissions: [...initial.permissions].sort() });

  function save() {
    start(async () => {
      const r = await saveRoleAction(mode, v);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      toast.success(mode === "create" ? t.roles.created : t.roles.saved);
      if (mode === "create") router.push(`${base}/${typeof r.data === "string" ? r.data : v.key}`);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="bg-card space-y-4 self-start rounded-lg border p-4 sm:p-5 xl:sticky xl:top-20">
        <div className="grid gap-1.5">
          <label htmlFor="key" className="text-sm font-medium">
            {t.roles.key}
          </label>
          <input
            id="key"
            className={cn(inputCls, "font-mono")}
            value={v.key}
            disabled={mode === "update" || readOnly}
            onChange={(e) => setV({ ...v, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
            aria-invalid={!!errors.key}
            placeholder="e.g. hub_supervisor"
          />
          <p className={cn("text-[12.5px]", errors.key ? "text-destructive" : "text-muted-foreground")}>{errors.key ?? (scope === "account" && mode === "create" ? t.roles.keyHintAccount : t.roles.keyHint)}</p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            {t.roles.name}
          </label>
          <input id="name" disabled={readOnly} className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-invalid={!!errors.name} />
          {errors.name && <p className="text-destructive text-[12.5px]">{errors.name}</p>}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            {t.roles.description}
          </label>
          <textarea id="description" rows={3} className={cn(inputCls, "h-auto py-2")} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </div>
        <div className={cn("grid gap-1.5", scope === "account" && "hidden")}>
          <label htmlFor="surface" className="text-sm font-medium">
            {t.roles.surface}
          </label>
          <select id="surface" className={inputCls} value={v.surface} onChange={(e) => setV({ ...v, surface: e.target.value })}>
            {Object.entries(t.roles.surfaces).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-muted-foreground text-sm">{fmt(t.roles.grantedCount, { n: v.permissions.length, total: scope === "account" ? PARTNER_GRANTABLE.length : PERMISSIONS.length })}</div>
        {readOnly && <p className="border-border bg-muted text-muted-foreground rounded-md border px-3 py-2 text-[13px]">{t.roles.readOnly}</p>}
        <div className={cn("flex flex-wrap gap-2 border-t pt-4", readOnly && "hidden")}>
          <Button onClick={save} disabled={pending || (mode === "update" && !changed)}>
            {pending ? t.common.saving : mode === "create" ? t.common.create : t.common.save}
          </Button>
          <Button variant="ghost" asChild>
            <Link href={base}>{t.common.back}</Link>
          </Button>
        </div>
        {mode === "update" && !readOnly && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await setRoleActiveAction(v.key, !active);
                  if (r.ok) toast.success(t.roles.saved);
                  else toast.error(r.error);
                })
              }
            >
              {active ? t.roles.deactivate : t.roles.activate}
            </Button>
            {!system && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                disabled={pending || userCount > 0}
                title={userCount > 0 ? `${userCount} ${t.roles.users.toLowerCase()}` : undefined}
                onClick={() =>
                  start(async () => {
                    const r = await deleteRoleAction(v.key);
                    if (r.ok) router.push(base);
                    else toast.error(r.error);
                  })
                }
              >
                {t.roles.deleteRole}
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        {groups.map(([group, perms]) => {
          const keys = perms.map((p) => p.key);
          const all = keys.every(has);
          const some = keys.some(has);
          return (
            <fieldset key={group} className="bg-card rounded-lg border">
              <legend className="sr-only">{group}</legend>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-semibold">{group}</h2>
                <label className="text-muted-foreground flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={all}
                    ref={(el) => {
                      if (el) el.indeterminate = some && !all;
                    }}
                    onChange={(e) => toggleGroup(keys, e.target.checked)}
                  />
                  {t.common.all}
                </label>
              </div>
              <ul className="divide-y">
                {perms.map((p) => (
                  <li key={p.key}>
                    <label className="hover:bg-muted/40 flex cursor-pointer items-start gap-3 px-4 py-2.5">
                      <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={has(p.key)} disabled={readOnly} onChange={(e) => toggle(p.key, e.target.checked)} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{p.label}</span>
                        <span className="text-muted-foreground block text-[13px]">{p.description}</span>
                      </span>
                      <span className="text-muted-foreground ml-auto hidden font-mono text-[11px] sm:block">{p.key}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
      </section>
    </div>
  );
}
