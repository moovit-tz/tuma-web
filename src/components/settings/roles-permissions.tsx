"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Lock, RotateCcw, Check, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner } from "@/components/ui/table-banner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
    getRolePermissions,
    updateRolePermissions,
    resetRolePermissions,
    createRole,
    deleteRole,
    type PermissionKey,
    type RolePermissions,
} from "@/lib/services/permissions"
import { useTr } from "@/lib/i18n/portal"

const ROLE_INFO: Record<string, { label: string; who: string }> = {
    ADMIN: { label: "Admin", who: "Full access to every portal and setting" },
    OPS: { label: "Operations", who: "Staff who run day-to-day operations in the Ops portal" },
    OWNER: { label: "Owner", who: "Bus company owners, in the Business portal, limited to their own company" },
    SUPER_AGENT: { label: "Super agent", who: "Lead agents in the mobile app" },
    AGENT: { label: "Agent", who: "Booking-office agents in the mobile app" },
    TRIP_AGENT: { label: "Trip agent", who: "Agents travelling with the vehicle" },
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((k) => b.includes(k))
const roleLabel = (r?: RolePermissions | null, key?: string) => (r?.custom ? r.label : ROLE_INFO[r?.role ?? key ?? ""]?.label) ?? r?.label ?? r?.role ?? key ?? ""

export function RolesPermissions() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["role-permissions"], queryFn: getRolePermissions, staleTime: 60_000 })
    const [selected, setSelected] = useState("OPS")
    const [draft, setDraft] = useState<PermissionKey[]>([])
    const [pendingRole, setPendingRole] = useState<string | null>(null)
    const [confirmReset, setConfirmReset] = useState(false)
    // Custom roles: new / edit details / delete
    const [details, setDetails] = useState<{ mode: "create" | "edit"; label: string; description: string; baseRole: string } | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const role: RolePermissions | undefined = data?.roles.find((r) => r.role === selected)
    useEffect(() => {
        if (role) setDraft(role.permissions)
    }, [role])
    const dirty = !!role && !sameSet(draft, role.permissions)

    const groups = useMemo(() => {
        if (!data || !role) return []
        const grantable = new Set(role.grantable)
        const shown = data.catalog.filter((p) => grantable.has(p.key) || (role.kind === "staff" && p.locked))
        const out: { group: string; items: typeof shown }[] = []
        for (const p of shown) {
            let g = out.find((x) => x.group === p.group)
            if (!g) out.push((g = { group: p.group, items: [] }))
            g.items.push(p)
        }
        return out
    }, [data, role])

    const onSaved = (next: RolePermissions, title: string) => {
        queryClient.setQueryData(["role-permissions"], (old: any) =>
            old ? { ...old, roles: old.roles.map((r: RolePermissions) => (r.role === next.role ? next : r)) } : old,
        )
        queryClient.invalidateQueries({ queryKey: ["permissions", "me"] })
        toast({ title, description: tr("{role}: {permissionsCount} permissions. Signed-in users get the change within a minute.", { role: roleLabel(next), permissionsCount: next.permissions.length }) })
    }
    const saveMutation = useMutation({
        mutationFn: () => updateRolePermissions(selected, draft),
        onSuccess: (next) => onSaved(next, "Permissions saved"),
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't save the permissions"), description: e?.message }),
    })
    const resetMutation = useMutation({
        mutationFn: () => resetRolePermissions(selected),
        onSuccess: (next) => {
            setConfirmReset(false)
            onSaved(next, "Back to the defaults")
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't reset the permissions"), description: e?.message }),
    })

    const detailsMutation = useMutation({
        mutationFn: async () => {
            if (!details) throw new Error("Nothing to save")
            if (details.mode === "create") return createRole({ label: details.label.trim(), description: details.description.trim(), baseRole: details.baseRole })
            return updateRolePermissions(selected, role?.permissions ?? [], { label: details.label.trim(), description: details.description.trim() })
        },
        onSuccess: (next) => {
            queryClient.invalidateQueries({ queryKey: ["role-permissions"] })
            toast({ title: details?.mode === "create" ? tr("Role created") : tr("Role updated"), description: roleLabel(next) })
            if (details?.mode === "create") setSelected(next.role)
            setDetails(null)
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't save the role"), description: e?.message }),
    })
    const deleteMutation = useMutation({
        mutationFn: () => deleteRole(selected),
        onSuccess: () => {
            toast({ title: tr("Role deleted"), description: roleLabel(role) })
            setConfirmDelete(false)
            setSelected("OPS")
            queryClient.invalidateQueries({ queryKey: ["role-permissions"] })
        },
        onError: (e: any) => {
            setConfirmDelete(false)
            toast({ variant: "destructive", title: tr("Couldn't delete the role"), description: e?.message })
        },
    })

    const pick = (r: string) => {
        if (r === selected) return
        if (dirty) setPendingRole(r)
        else setSelected(r)
    }
    const toggle = (key: PermissionKey, on: boolean) => setDraft((d) => (on ? [...new Set([...d, key])] : d.filter((k) => k !== key)))

    if (isLoading) return <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden"><ListSkeleton rows={8} /></div>
    if (isError || !data) {
        return (
            <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load roles and permissions")}</p>
                <p className="mt-1 text-sm text-slate-500">{tr("If this keeps happening, the server may not have the latest update yet.")}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>{tr("Try again")}</Button>
            </div>
        )
    }

    const RoleButton = ({ r }: { r: RolePermissions }) => {
    const tr = useTr()
    return ((
        <button
            type="button"
            onClick={() => pick(r.role)}
            aria-current={r.role === selected ? "true" : undefined}
            className={cn(
                "w-full rounded-[var(--ds-radius-small)] px-4 py-3 text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[var(--ds-border-focused)]",
                r.role === selected ? "bg-[#242a37] text-white" : "hover:bg-slate-100 dark:hover:bg-white/5",
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{roleLabel(r)}</span>
                {r.editable ? (
                    <span className={cn("text-xs tabular-nums", r.role === selected ? "text-[#ffd428]" : "text-slate-400")}>{r.permissions.length}/{r.grantable.length}</span>
                ) : (
                    <Lock className={cn("size-3.5", r.role === selected ? "text-[#ffd428]" : "text-slate-400")} aria-label={tr("Fixed")} />
                )}
            </div>
            {r.custom ? (
                <p className={cn("mt-0.5 text-xs", r.role === selected ? "text-white/50" : "text-slate-400")}>
                    {tr("Builds on {base} · {n} assigned", { base: roleLabel(data.roles.find((x) => x.role === r.baseRole) ?? null, r.baseRole ?? ""), n: r.assigned ?? 0 })}
                </p>
            ) : r.customised && <p className={cn("mt-0.5 text-xs", r.role === selected ? "text-white/50" : "text-slate-400")}>{tr("Customised")}</p>}
        </button>
    ))
}

    return (
        // Large screens: both panes fill the window and scroll on their own
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:h-[calc(100svh-16.5rem)] lg:min-h-[28rem]">
            {/* Roles */}
            <nav aria-label={tr("Roles")} className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-3 space-y-4 h-fit lg:h-full lg:overflow-y-auto overscroll-contain">
                <Button onClick={() => setDetails({ mode: "create", label: "", description: "", baseRole: data.baseRoles?.[0]?.role ?? "OPS" })}
                    className="h-10 w-full justify-center gap-2 rounded-[var(--ds-radius-small)] bg-[#ffd428] text-sm font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                    <Plus className="size-4" /> {tr("New role")}
                </Button>
                <div>
                    <p className="px-4 pb-2 pt-1 text-xs font-semibold text-slate-400">{tr("Portal staff")}</p>
                    <div className="space-y-1">{data.roles.filter((r) => r.kind === "staff" && !r.custom).map((r) => <RoleButton key={r.role} r={r} />)}</div>
                </div>
                <div>
                    <p className="px-4 pb-2 pt-1 text-xs font-semibold text-slate-400">{tr("Mobile app agents")}</p>
                    <div className="space-y-1">{data.roles.filter((r) => r.kind === "agent" && !r.custom).map((r) => <RoleButton key={r.role} r={r} />)}</div>
                </div>
                <div>
                    <p className="px-4 pb-2 pt-1 text-xs font-semibold text-slate-400">{tr("Custom roles")}</p>
                    {data.roles.some((r) => r.custom) ? (
                        <div className="space-y-1">{data.roles.filter((r) => r.custom).map((r) => <RoleButton key={r.role} r={r} />)}</div>
                    ) : (
                        <p className="px-4 pb-2 text-xs text-slate-400">{tr("None yet. A custom role builds on a built-in one with its own permissions, e.g. a finance officer.")}</p>
                    )}
                </div>
            </nav>

            {/* Permissions */}
            {role && (
                <div className="flex min-h-0 flex-col overflow-hidden rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 lg:h-full">
                    <TableBanner
                        className="shrink-0 rounded-t-[var(--ds-radius-large)]"
                        title={roleLabel(role)}
                        description={role.custom ? (role.description || tr("Builds on {base}", { base: roleLabel(data.roles.find((x) => x.role === role.baseRole) ?? null, role.baseRole ?? "") })) : ROLE_INFO[role.role]?.who}
                        icon="roles"
                        actions={role.editable ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {role.custom && (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => setDetails({ mode: "edit", label: role.label ?? "", description: role.description ?? "", baseRole: role.baseRole ?? "" })} className="text-white hover:bg-white/10 hover:text-white">
                                            <Pencil className="size-4 mr-1" /> {tr("Edit details")}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-rose-300 hover:bg-rose-500/20 hover:text-white">
                                            <Trash2 className="size-4 mr-1" /> {tr("Delete")}
                                        </Button>
                                    </>
                                )}
                                {role.customised && !role.custom && (
                                    <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)} disabled={resetMutation.isPending} className="text-white hover:bg-white/10 hover:text-white">
                                        <RotateCcw className="size-4 mr-1" />{" "}{tr("Reset to defaults")}</Button>
                                )}
                                {/* Save and Discard only once something changed (the bar at the bottom has them too) */}
                                {dirty && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => setDraft(role.permissions)} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">{tr("Discard")}</Button>
                                        <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}
                                            className="bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold">
                                            {saveMutation.isPending ? tr("Saving…") : tr("Save changes")}
                                        </Button>
                                    </>
                                )}
                            </div>
                        ) : undefined}
                    />
                    <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-white/5 text-xs text-slate-500">
                        {!role.editable
                            ? tr("Admins always have every permission. This can't be changed.")
                            : role.custom
                                ? tr("Accounts with this role use these permissions instead of the built-in role's. {n} assigned.", { n: role.assigned ?? 0 })
                            : role.customised
                                ? `Customised${role.updatedAt ? ` on ${format(new Date(role.updatedAt), "d MMM yyyy, HH:mm")}` : ""}. Changes apply to everyone with this role.`
                                : tr("Using the default permissions. Changes apply to everyone with this role.")}
                        {role.kind === "agent" && " The mobile apps use these when agents act on parcels, vehicles and other agents."}
                    </div>
                    {/* Only the permissions scroll; the banner above and the save bar below stay put */}
                    <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain dark:divide-white/5">
                        {groups.map((g) => (
                            <fieldset key={g.group} className="px-6 py-5">
                                <legend className="sr-only">{g.group}</legend>
                                <p aria-hidden className="mb-3 text-xs font-semibold text-slate-400">{g.group}</p>
                                <div className="space-y-1">
                                    {g.items.map((p) => {
                                        const locked = !!p.locked && role.role !== "ADMIN"
                                        const on = role.editable ? draft.includes(p.key) && !locked : true
                                        const isDefault = role.defaults.includes(p.key)
                                        const id = `perm-${role.role}-${p.key}`
                                        return (
                                            <div key={p.key} className="flex items-start justify-between gap-4 rounded-[var(--ds-radius-small)] py-2.5">
                                                <label htmlFor={id} className={cn("min-w-0", (locked || !role.editable) ? "cursor-default" : "cursor-pointer")}>
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-semibold text-[#242a37] dark:text-white">{p.label}</span>
                                                        {locked && <Badge variant="outline" className="h-5 gap-1 border-slate-200 text-[11px] text-slate-500 dark:border-white/10"><Lock className="size-3" />{" "}{tr("Admin only")}</Badge>}
                                                        {role.editable && !locked && isDefault && <span className="text-[11px] text-slate-400">{tr("Default")}</span>}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-slate-500">{p.description}</span>
                                                </label>
                                                {role.editable ? (
                                                    <Switch id={id} checked={on} disabled={locked} onCheckedChange={(v) => toggle(p.key, !!v)}
                                                        className="mt-0.5 data-[state=checked]:bg-[#242a37] dark:data-[state=checked]:bg-[#ffd428]" />
                                                ) : (
                                                    <Check className="mt-0.5 size-4 text-emerald-600" aria-label={tr("Allowed")} />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </fieldset>
                        ))}
                    </div>
                    {dirty && (
                        <div className="shrink-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 bg-white/95 dark:bg-[#1a1f2b]/95 px-6 py-3 backdrop-blur">
                            <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("You have unsaved changes")}</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setDraft(role.permissions)}>{tr("Discard")}</Button>
                                <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37]">
                                    {saveMutation.isPending ? tr("Saving…") : tr("Save changes")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AlertDialog open={!!pendingRole} onOpenChange={(open) => !open && setPendingRole(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Discard unsaved changes?")}</AlertDialogTitle>
                        <AlertDialogDescription>{tr("Your changes to")}{" "}{roleLabel(role, selected)}{" "}{tr("haven't been saved.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Keep editing")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (pendingRole) setSelected(pendingRole); setPendingRole(null) }}>{tr("Discard")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Reset")}{" "}{roleLabel(role, selected)}{" "}{tr("to the defaults?")}</AlertDialogTitle>
                        <AlertDialogDescription>{tr("Your customised permissions for this role will be replaced by the defaults.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); resetMutation.mutate() }} disabled={resetMutation.isPending}>
                            {resetMutation.isPending ? tr("Resetting…") : tr("Reset")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Delete {name}?", { name: roleLabel(role, selected) })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {role?.assigned ? tr("{n} accounts still have this role. Give them another role first.", { n: role.assigned }) : tr("The role is removed. This can't be undone.")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteMutation.mutate() }} disabled={deleteMutation.isPending || !!role?.assigned} className="bg-rose-600 text-white hover:bg-rose-700">
                            {deleteMutation.isPending ? tr("Deleting…") : tr("Delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!details} onOpenChange={(o) => !o && !detailsMutation.isPending && setDetails(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{details?.mode === "create" ? tr("New role") : tr("Edit role")}</DialogTitle>
                        <DialogDescription>
                            {details?.mode === "create"
                                ? tr("It starts with the permissions of the role it builds on; change them after creating it.")
                                : tr("Rename the role or change its description.")}
                        </DialogDescription>
                    </DialogHeader>
                    {details && (
                        <form id="role-details" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (details.label.trim().length >= 2) detailsMutation.mutate() }}>
                            <div className="space-y-1.5">
                                <Label htmlFor="role-label">{tr("Role name")}</Label>
                                <Input id="role-label" value={details.label} onChange={(e) => setDetails({ ...details, label: e.target.value })} placeholder={tr("e.g. Finance officer")} autoFocus maxLength={40} />
                            </div>
                            {details.mode === "create" && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="role-base">{tr("Builds on")}</Label>
                                    <Select value={details.baseRole} onValueChange={(v) => setDetails({ ...details, baseRole: v })}>
                                        <SelectTrigger id="role-base" className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(data.baseRoles ?? []).map((b) => (
                                                <SelectItem key={b.role} value={b.role} className="text-sm">{b.label} · {b.kind === "staff" ? tr("Portal staff") : tr("Mobile app agents")}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">{tr("Decides which portal or app it's for, and which permissions it can have.")}</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label htmlFor="role-description">{tr("Description")} <span className="font-normal text-slate-400">{tr("(optional)")}</span></Label>
                                <Textarea id="role-description" value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} rows={3} placeholder={tr("Who this role is for")} />
                            </div>
                        </form>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetails(null)} disabled={detailsMutation.isPending}>{tr("Cancel")}</Button>
                        <Button type="submit" form="role-details" disabled={!details || details.label.trim().length < 2 || detailsMutation.isPending} className="bg-[#ffd428] font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                            {detailsMutation.isPending ? tr("Saving…") : details?.mode === "create" ? tr("Create role") : tr("Save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
