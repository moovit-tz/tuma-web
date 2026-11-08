"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { setUserRolesAction } from "@/app/actions/roles";

export function UserRoles({ userId, current, roles }: { userId: string; current: string[]; roles: { key: string; name: string; active: boolean }[] }) {
  const { dict: t } = useI18n();
  const [sel, setSel] = useState<string[]>(current);
  const [pending, start] = useTransition();
  const changed = [...sel].sort().join() !== [...current].sort().join();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <details className="relative">
        <summary className="bg-background hover:border-foreground/30 flex h-9 cursor-pointer list-none items-center gap-1 rounded-md border px-3 text-sm">
          {sel.length ? sel.map((k) => roles.find((r) => r.key === k)?.name ?? k).join(", ") : t.common.none}
        </summary>
        <div className="bg-popover absolute z-10 mt-1 max-h-80 w-72 overflow-auto rounded-md border p-1 shadow-lg">
          {roles.map((r) => (
            <label key={r.key} className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
              <input type="checkbox" className="size-4" checked={sel.includes(r.key)} onChange={(e) => setSel(e.target.checked ? [...sel, r.key] : sel.filter((k) => k !== r.key))} />
              <span className={r.active ? "" : "text-muted-foreground line-through"}>{r.name}</span>
              <span className="text-muted-foreground ml-auto font-mono text-[10.5px]">{r.key}</span>
            </label>
          ))}
        </div>
      </details>
      {changed && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setUserRolesAction(userId, sel);
              if (r.ok) toast.success(r.data?.pending ? t.admin.approvals.sentForApproval : t.roles.updated);
              else {
                toast.error(r.error);
                setSel(current);
              }
            })
          }
        >
          {t.common.save}
        </Button>
      )}
    </div>
  );
}
