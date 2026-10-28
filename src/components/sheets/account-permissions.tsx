"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RotateCcw, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useAccess } from "@/hooks/use-access"
import { getCurrentUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { SheetSection } from "@/components/sheets/sheet-blocks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAccountPermissions, getRolePermissions, updateAccountPermissions,
    assignAccountRole, type PermissionKey } from "@/lib/services/permissions"
import { useTr } from "@/lib/i18n/portal"

/*
 * Permissions for one person, on top of their role. Each switch shows what
 * they can do; flipping one away from the role's setting makes it an
 * override (granted or removed just for them). Admin only.
 */
export function AccountPermissionsPanel({ kind, accountId }: { kind: "staff" | "agent"; accountId: number }) {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { can } = useAccess()
    const allowed = can("settings.manage")
    const isSelf = kind === "staff" && Number((getCurrentUser() as any)?.id) === accountId

    const accountQuery = useQuery({ queryKey: ["account-permissions", kind, accountId], queryFn: () => getAccountPermissions(kind, accountId), enabled: allowed })
    const catalogQuery = useQuery({ queryKey: ["role-permissions"], queryFn: getRolePermissions, enabled: allowed, staleTime: 5 * 60_000 })
    const data = accountQuery.data

    // Draft: the effective set the admin is building
    const [draft, setDraft] = useState<Set<PermissionKey>>(new Set())
    useEffect(() => {
        if (data) setDraft(new Set(data.permissions))
    }, [data])

    const fromRole = useMemo(() => new Set(data?.rolePermissions ?? []), [data])
    const grants = [...draft].filter((k) => !fromRole.has(k))
    const revokes = [...fromRole].filter((k) => !draft.has(k) && (data?.grantable ?? []).includes(k))
    const saved = new Set(data?.permissions ?? [])
    const dirty = !!data && (draft.size !== saved.size || [...draft].some((k) => !saved.has(k)))

    const groups = useMemo(() => {
        if (!data || !catalogQuery.data) return []
        const grantable = new Set(data.grantable)
        const out: { group: string; items: typeof catalogQuery.data.catalog }[] = []
        for (const p of catalogQuery.data.catalog) {
            if (!grantable.has(p.key)) continue
            let g = out.find((x) => x.group === p.group)
            if (!g) out.push((g = { group: p.group, items: [] }))
            g.items.push(p)
        }
        return out
    }, [data, catalogQuery.data])

    const assign = useMutation({
        mutationFn: (role: string | null) => assignAccountRole(kind, accountId, role),
        onSuccess: (next) => {
            queryClient.setQueryData(["account-permissions", kind, accountId], next)
            queryClient.invalidateQueries({ queryKey: ["role-permissions"] })
            toast({ title: tr("Role saved"), description: tr("{fullName} gets the change within a minute.", { fullName: next.fullName }) })
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't save the role"), description: e?.message }),
    })

    const save = useMutation({
        mutationFn: () => updateAccountPermissions(kind, accountId, { grants, revokes }),
        onSuccess: (next) => {
            queryClient.setQueryData(["account-permissions", kind, accountId], next)
            toast({ title: tr("Permissions saved"), description: tr("{fullName} gets the change within a minute.", { fullName: next.fullName }) })
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't save the permissions"), description: e?.message }),
    })

    if (!allowed || isSelf) return null
    if (accountQuery.isPending || catalogQuery.isPending) {
        return <SheetSection title={tr("Permissions")}><div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div></SheetSection>
    }
    if (accountQuery.isError || !data) {
        return (
            <SheetSection title={tr("Permissions")}>
                <p className="px-5 py-4 text-sm text-slate-500">{tr("Couldn't load this person's permissions. The server may not have the latest update yet.")}</p>
            </SheetSection>
        )
    }
    if (!data.editable) {
        return (
            <SheetSection title={tr("Permissions")}>
                <p className="flex items-center gap-2 px-5 py-4 text-sm text-slate-500"><Lock className="size-4" aria-hidden />{" "}{tr("Admins always have every permission.")}</p>
            </SheetSection>
        )
    }

    const overrides = (data.grants?.length ?? 0) + (data.revokes?.length ?? 0)
    const toggle = (key: PermissionKey, on: boolean) => setDraft((d) => {
        const next = new Set(d)
        if (on) next.add(key); else next.delete(key)
        return next
    })

    return (
        <SheetSection
            title={tr("Permissions · {v}", { v: overrides ? `${overrides} changed from role` : "same as role" })}
            action={
                <div className="flex gap-1.5">
                    {(grants.length > 0 || revokes.length > 0) && (
                        <Button variant="ghost" size="sm" onClick={() => setDraft(new Set(fromRole))} title={tr("Use exactly the role's permissions")}>
                            <RotateCcw className="mr-1 size-3.5" />{" "}{tr("Match role")}</Button>
                    )}
                </div>
            }
        >
            {(data.customRoleOptions?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/5">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Custom role")}</p>
                        <p className="text-xs text-slate-500">{tr("Uses that role's permissions instead of the built-in one.")}</p>
                    </div>
                    <Select value={data.customRole ?? "none"} onValueChange={(v) => assign.mutate(v === "none" ? null : v)} disabled={assign.isPending}>
                        <SelectTrigger className="h-9 w-52 text-sm" aria-label={tr("Custom role")}><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-sm">{tr("None (built-in role)")}</SelectItem>
                            {data.customRoleOptions!.map((o) => <SelectItem key={o.role} value={o.role} className="text-sm">{o.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <p className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/5">{tr("Starts from the")}{" "}{data.roles.map((r) => r.replace("_", " ").toLowerCase()).join(" / ")}{" "}{tr("role. Changes here apply to")}{" "}{data.fullName}{" "}{tr("only.")}</p>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
                {groups.map((g) => (
                    <fieldset key={g.group} className="px-5 py-4">
                        <legend className="sr-only">{g.group}</legend>
                        <p aria-hidden className="mb-2 text-xs font-semibold text-slate-400">{g.group}</p>
                        <div className="space-y-1">
                            {g.items.map((p) => {
                                const on = draft.has(p.key)
                                const changed = on !== fromRole.has(p.key)
                                const id = `acct-perm-${kind}-${accountId}-${p.key}`
                                return (
                                    <div key={p.key} className="flex items-start justify-between gap-4 py-2">
                                        <label htmlFor={id} className="min-w-0 cursor-pointer">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-[#242a37] dark:text-white">{p.label}</span>
                                                {changed && (
                                                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", on ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300")}>
                                                        {on ? "GRANTED" : "REMOVED"}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-slate-500">{p.description}</span>
                                        </label>
                                        <Switch id={id} checked={on} onCheckedChange={(v) => toggle(p.key, !!v)}
                                            className="mt-0.5 data-[state=checked]:bg-[#242a37] dark:data-[state=checked]:bg-[#ffd428]" />
                                    </div>
                                )
                            })}
                        </div>
                    </fieldset>
                ))}
            </div>
            {dirty && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-white/5 dark:bg-white/[0.02]">
                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Unsaved changes")}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDraft(new Set(data.permissions))}>{tr("Discard")}</Button>
                        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#242a37] text-white hover:bg-[#1a1f2a]">
                            {save.isPending ? tr("Saving…") : tr("Save permissions")}
                        </Button>
                    </div>
                </div>
            )}
        </SheetSection>
    )
}
