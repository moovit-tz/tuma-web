"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner, type TableBannerIcon } from "@/components/ui/table-banner"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
    getPaymentProviders,
    savePaymentProvider,
    deletePaymentProvider,
    getAppVersions,
    saveAppVersion,
    deleteAppVersion,
    type PaymentProvider,
    type AppVersion,
} from "@/lib/services/settings"
import { useTr } from "@/lib/i18n/portal"
import { ListPager, usePaged } from "@/components/ui/list-pager"
import { providerDisplayName } from "@/lib/services/float-transactions"

/* ───────────── shared frame ───────────── */

function Frame({ title, description, icon, onAdd, addLabel, children }: {
    title: string; description: string; icon: TableBannerIcon; onAdd: () => void; addLabel: string; children: ReactNode
}) {
    return (
        <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
            <TableBanner title={title} description={description} icon={icon} actions={
                <Button size="sm" onClick={onAdd} className="bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold"><Plus className="size-4 mr-1" /> {addLabel}</Button>
            } />
            {children}
        </div>
    )
}

function State({ loading, error, empty, emptyText, onRetry, children }: {
    loading: boolean; error: boolean; empty: boolean; emptyText: string; onRetry: () => void; children: ReactNode
}) {
    const tr = useTr()
    if (loading) return <ListSkeleton rows={4} />
    if (error) {
        return (
            <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load this list")}</p>
                <Button variant="outline" className="mt-4" onClick={onRetry}>{tr("Try again")}</Button>
            </div>
        )
    }
    if (empty) return <p className="px-6 py-12 text-center text-sm text-slate-500">{emptyText}</p>
    return <div className="overflow-x-auto bg-slate-50/50 dark:bg-black/10">{children}</div>
}

function RowMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
    const tr = useTr()
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={tr("Actions for {label}", { label })}
                    className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400">
                    <MoreHorizontal className="size-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-[var(--ds-radius-large)] p-2">
                <DropdownMenuItem onClick={onEdit} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37]"><Pencil className="size-5 mr-3" />{" "}{tr("Edit")}</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold text-rose-500 focus:bg-rose-500 focus:text-white"><Trash2 className="size-5 mr-3" />{" "}{tr("Delete")}</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function ConfirmDelete({ name, what, open, onOpenChange, onConfirm, pending }: {
    name?: string; what: string; open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void; pending: boolean
}) {
    const tr = useTr()
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{tr("Delete {name}?", { name })}</AlertDialogTitle>
                    <AlertDialogDescription>{what}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm() }} disabled={pending} className="bg-rose-600 text-white hover:bg-rose-700">
                        {pending ? tr("Deleting…") : tr("Delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

const HEAD = "py-4 font-semibold text-[#ffd428] text-xs"

// "ANDROID_AGENT" → "Android · Agent app" (the raw name is what the apps send)
const PLATFORM: Record<string, string> = { ANDROID: "Android", IOS: "iOS", WEB: "Web", HUAWEI: "Huawei" }
function appLabel(appType: string) {
    const [first, ...rest] = String(appType).toUpperCase().split(/[_\s-]+/)
    const platform = PLATFORM[first]
    const words = (platform ? rest : [first, ...rest]).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
    const app = !words ? "App" : /\bApp$/.test(words) ? words.replace(/App$/, "app") : `${words} app`
    return platform ? `${platform} · ${app}` : app
}
const ROW = "hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5"

/* ───────────── payment providers ───────────── */

export function PaymentProvidersSettings() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["payment-providers"], queryFn: getPaymentProviders, staleTime: 60_000 })
    const [editing, setEditing] = useState<PaymentProvider | "new" | null>(null)
    const [form, setForm] = useState({ name: "", code: "", description: "", isActive: true })
    const [deleting, setDeleting] = useState<PaymentProvider | null>(null)

    const open = (p: PaymentProvider | "new") => {
        setEditing(p)
        setForm(p === "new" ? { name: "", code: "", description: "", isActive: true } : { name: p.name, code: p.code, description: p.description ?? "", isActive: p.isActive })
    }
    const editingId = editing && editing !== "new" ? editing.id : null
    const clash = useMemo(() => {
        const n = form.name.trim().toLowerCase(), c = form.code.trim().toLowerCase()
        return data.find((p) => p.id !== editingId && ((n && p.name.toLowerCase() === n) || (c && p.code.toLowerCase() === c)))
    }, [data, form.name, form.code, editingId])

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["payment-providers"] })
    const save = useMutation({
        mutationFn: () => savePaymentProvider(editingId, {
            name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description.trim() || undefined, isActive: form.isActive,
        }),
        onSuccess: () => { toast({ title: editingId ? "Provider updated" : "Provider added", description: form.name.trim() }); invalidate(); setEditing(null) },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't save the provider"), description: e?.message }),
    })
    const toggle = useMutation({
        mutationFn: (p: PaymentProvider) => savePaymentProvider(p.id, { name: p.name, code: p.code, description: p.description ?? undefined, isActive: !p.isActive }),
        onSuccess: (_, p) => { toast({ title: p.isActive ? "Provider turned off" : "Provider turned on", description: p.name }); invalidate() },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't change the provider"), description: e?.message }),
    })
    const remove = useMutation({
        mutationFn: (p: PaymentProvider) => deletePaymentProvider(p.id),
        onSuccess: (_, p) => { toast({ title: tr("Provider deleted"), description: p.name }); invalidate(); setDeleting(null) },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't delete the provider"), description: e?.message }),
    })
    const valid = form.name.trim() && form.code.trim() && !clash

    return (
        <Frame title={tr("Payment Providers")} description={tr("Ways agents can top up their float")} icon="transactions" onAdd={() => open("new")} addLabel="Add provider">
            <State loading={isLoading} error={isError} empty={data.length === 0} emptyText={tr("No payment providers yet.")} onRetry={() => refetch()}>
                <Table className="min-w-[640px]">
                    <TableHeader>
                        <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                            <TableHead className={cn(HEAD, "px-6")}>{tr("Provider")}</TableHead>
                            <TableHead className={HEAD}>{tr("Description")}</TableHead>
                            <TableHead className={HEAD}>{tr("Available")}</TableHead>
                            <TableHead className={cn(HEAD, "px-6 text-right")}>{tr("Actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((p) => (
                            <TableRow key={p.id} className={ROW}>
                                <TableCell className="px-6 py-4">
                                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{providerDisplayName(p.name)}</p>
                                    <Badge variant="outline" className="mt-1 bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md font-mono">{p.code}</Badge>
                                </TableCell>
                                <TableCell className="py-4 max-w-[300px]"><p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{p.description || "—"}</p></TableCell>
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                        <Switch checked={p.isActive} disabled={toggle.isPending} onCheckedChange={() => toggle.mutate(p)} aria-label={tr("{name} available for top-ups", { name: p.name })}
                                            className="data-[state=checked]:bg-[#242a37] dark:data-[state=checked]:bg-[#ffd428]" />
                                        <span className="text-xs text-slate-500">{p.isActive ? tr("On") : tr("Off")}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-right"><RowMenu label={p.name} onEdit={() => open(p)} onDelete={() => setDeleting(p)} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </State>

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }}>
                        <DialogHeader>
                            <DialogTitle>{editingId ? tr("Edit provider") : tr("Add provider")}</DialogTitle>
                            <DialogDescription>{tr("Agents see available providers when they top up their float.")}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="pp-name">{tr("Name")}</Label>
                                <Input id="pp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr("e.g. M-Pesa")} autoFocus />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pp-code">{tr("Code")}</Label>
                                <Input id="pp-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={tr("e.g. MPESA")} className="font-mono uppercase" aria-describedby="pp-code-help" />
                                <p id="pp-code-help" className={cn("text-xs", clash ? "text-rose-600" : "text-slate-500")}>
                                    {clash ? tr("{name} already uses this name or code.", { name: clash.name }) : tr("Short and unique. The payment system uses it to identify the provider.")}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pp-desc">{tr("Description")}{" "}<span className="font-normal text-slate-400">{tr("(optional)")}</span></Label>
                                <Textarea id="pp-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <Label htmlFor="pp-active">{tr("Available for top-ups")}</Label>
                                <Switch id="pp-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: !!v })} className="data-[state=checked]:bg-[#242a37] dark:data-[state=checked]:bg-[#ffd428]" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditing(null)}>{tr("Cancel")}</Button>
                            <Button type="submit" disabled={!valid || save.isPending} className="bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37]">{save.isPending ? tr("Saving…") : tr("Save")}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDelete name={deleting?.name} open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} pending={remove.isPending}
                onConfirm={() => deleting && remove.mutate(deleting)}
                what="This can't be undone. A provider that has been used for top-ups can't be deleted — turn it off instead." />
        </Frame>
    )
}

/* ───────────── app versions ───────────── */

export function AppVersionsSettings() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["app-versions"], queryFn: getAppVersions, staleTime: 60_000 })
    const [editing, setEditing] = useState<AppVersion | "new" | null>(null)
    const [form, setForm] = useState({ appType: "", appVersion: "", appVersionCode: "", mustUpdate: false })
    const [deleting, setDeleting] = useState<AppVersion | null>(null)

    const appTypes = useMemo(() => [...new Set(data.map((v) => v.appType))].sort(), [data])
    const latest = useMemo(() => {
        const m = new Map<string, number>()
        for (const v of data) m.set(v.appType, Math.max(m.get(v.appType) ?? 0, v.appVersionCode))
        return m
    }, [data])

    const open = (v: AppVersion | "new") => {
        setEditing(v)
        setForm(v === "new"
            ? { appType: appTypes[0] ?? "", appVersion: "", appVersionCode: "", mustUpdate: false }
            : { appType: v.appType, appVersion: v.appVersion, appVersionCode: String(v.appVersionCode), mustUpdate: v.mustUpdate })
    }
    const editingId = editing && editing !== "new" ? editing.id : null
    const code = Number.parseInt(form.appVersionCode)
    const clash = data.find((v) => v.id !== editingId && v.appType === form.appType.trim() && v.appVersionCode === code)
    const valid = form.appType.trim() && form.appVersion.trim() && Number.isInteger(code) && code > 0 && !clash

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["app-versions"] })
    const save = useMutation({
        mutationFn: () => saveAppVersion(editingId, { appType: form.appType.trim(), appVersion: form.appVersion.trim(), appVersionCode: code, mustUpdate: form.mustUpdate }),
        onSuccess: () => { toast({ title: editingId ? "Version updated" : "Version added", description: `${form.appType.trim()} ${form.appVersion.trim()}` }); invalidate(); setEditing(null) },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't save the version"), description: e?.message }),
    })
    const remove = useMutation({
        mutationFn: (v: AppVersion) => deleteAppVersion(v.id),
        onSuccess: (_, v) => { toast({ title: tr("Version deleted"), description: `${v.appType} ${v.appVersion}` }); invalidate(); setDeleting(null) },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't delete the version"), description: e?.message }),
    })

    // Newest release first, and the live release of each app
    const sorted = useMemo(() => [...data].sort((x, y) => x.appType.localeCompare(y.appType) || y.appVersionCode - x.appVersionCode), [data])
    const live = useMemo(() => appTypes.map((t) => ({
        appType: t,
        current: sorted.find((v) => v.appType === t)!,
        count: data.filter((v) => v.appType === t).length,
        oldestRequired: data.filter((v) => v.appType === t && v.mustUpdate).sort((x, y) => y.appVersionCode - x.appVersionCode)[0] ?? null,
    })), [appTypes, sorted, data])
    const [appFilter, setAppFilter] = useState("all")
    const shown = appFilter === "all" ? sorted : sorted.filter((v) => v.appType === appFilter)
    const versionsPage = usePaged(shown, appFilter)

    return (
        <div className="space-y-6">
            {/* ── Live now: one card per app ── */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[#242a37] dark:text-white">{tr("Live in the app stores")}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{tr("The newest release of each app. Apps on an older build are asked to update; a required update blocks them until they do.")}</p>
                </div>
                <Button onClick={() => open("new")} className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] gap-2">
                    <Plus className="size-4" /> {tr("Add version")}
                </Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-[var(--ds-radius-large)] bg-[#242a37]" />)}</div>
            ) : isError ? (
                <div className="rounded-[var(--ds-radius-large)] bg-white px-6 py-12 text-center shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b]">
                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load this list")}</p>
                    <Button variant="outline" className="mt-4" onClick={() => refetch()}>{tr("Try again")}</Button>
                </div>
            ) : live.length === 0 ? (
                <div className="rounded-[var(--ds-radius-large)] border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-white/15 dark:bg-[#1a1f2b]">
                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No app versions yet.")}</p>
                    <p className="mt-1 text-sm text-slate-500">{tr("Add a version after it's live in the app store. Apps on an older build code are told to update.")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {live.map(({ appType, current, count, oldestRequired }) => (
                        <div key={appType} className="relative overflow-hidden rounded-[var(--ds-radius-large)] bg-[#242a37] p-5 text-white shadow-[var(--ds-shadow-raised)]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-[#ffd428]/70" title={appType}>{appLabel(appType)}</p>
                                    <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{current.appVersion}</p>
                                    <p className="mt-1 text-xs text-white/50">{tr("Build {code}", { code: current.appVersionCode })} · {format(new Date(current.createdAt), "d MMM yyyy")}</p>
                                </div>
                                <Badge className={cn("h-6 shrink-0 rounded-[var(--ds-radius-small)] border-none px-2.5 text-xs font-semibold", current.mustUpdate ? "bg-rose-500 text-white" : "bg-white/10 text-white/80")}>
                                    {current.mustUpdate ? tr("Required") : tr("Optional")}
                                </Badge>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-white/50">
                                <span className="truncate">
                                    {oldestRequired
                                        ? tr("Older than build {code} can't be used", { code: oldestRequired.appVersionCode })
                                        : tr("No build is blocked")}
                                </span>
                                <button type="button" onClick={() => setAppFilter(appType)} className="shrink-0 font-semibold text-[#ffd428] hover:underline underline-offset-4 cursor-pointer">
                                    {tr("{n} releases", { n: count })}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Release history ── */}
            {!isLoading && !isError && data.length > 0 && (
                <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
                    <TableBanner title={tr("Release history")} description={tr("Every version added, newest first")} icon="layouts" />
                    {appTypes.length > 1 && (
                        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-3 dark:border-white/5" role="tablist" aria-label={tr("App")}>
                            {["all", ...appTypes].map((t) => (
                                <button key={t} type="button" role="tab" aria-selected={appFilter === t} onClick={() => setAppFilter(t)}
                                    className={cn("h-8 rounded-full px-3.5 text-xs font-semibold transition-colors cursor-pointer",
                                        appFilter === t ? "bg-[#242a37] text-white dark:bg-[#ffd428] dark:text-[#242a37]" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300")}>
                                    {t === "all" ? tr("All apps") : appLabel(t)}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="bg-slate-50/50 dark:bg-black/10">
                        <Table className="min-w-[680px]">
                            <TableHeader>
                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                    <TableHead className={cn(HEAD, "px-6")}>{tr("App")}</TableHead>
                                    <TableHead className={HEAD}>{tr("Version")}</TableHead>
                                    <TableHead className={cn(HEAD, "text-right")}>{tr("Build code")}</TableHead>
                                    <TableHead className={HEAD}>{tr("Update")}</TableHead>
                                    <TableHead className={HEAD}>{tr("Released")}</TableHead>
                                    <TableHead className={cn(HEAD, "px-6 text-right")}><span className="sr-only">{tr("Actions")}</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {versionsPage.pageRows.map((v) => {
                                    const isLive = latest.get(v.appType) === v.appVersionCode
                                    return (
                                        <TableRow key={v.id} className={ROW}>
                                            <TableCell className="px-6 py-4">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{appLabel(v.appType)}</p>
                                                <p className="font-mono text-[11px] text-slate-400">{v.appType}</p>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="font-mono text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{v.appVersion}</span>
                                                {isLive && <Badge className="ml-2 h-5 rounded-full border-none bg-emerald-100 px-2 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{tr("Live")}</Badge>}
                                            </TableCell>
                                            <TableCell className="py-4 text-right font-mono text-sm tabular-nums text-slate-600 dark:text-slate-300">{v.appVersionCode}</TableCell>
                                            <TableCell className="py-4">
                                                <Badge className={cn("h-6 rounded-[var(--ds-radius-small)] border-none px-2.5 text-xs font-semibold", v.mustUpdate ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300")}>
                                                    {v.mustUpdate ? tr("Required") : tr("Optional")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 text-xs text-slate-500">{format(new Date(v.createdAt), "d MMM yyyy")}</TableCell>
                                            <TableCell className="px-6 py-4 text-right"><RowMenu label={`${v.appType} ${v.appVersion}`} onEdit={() => open(v)} onDelete={() => setDeleting(v)} /></TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                        <ListPager page={versionsPage.page} totalPages={versionsPage.totalPages} total={versionsPage.total} onPage={versionsPage.setPage} />
                    </div>
                </div>
            )}

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }}>
                        <DialogHeader>
                            <DialogTitle>{editingId ? tr("Edit version") : tr("Add version")}</DialogTitle>
                            <DialogDescription>{tr("Add a version after it's live in the app store. Apps on an older build code are told to update.")}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="av-type">{tr("App")}</Label>
                                <Input id="av-type" list="av-types" value={form.appType} onChange={(e) => setForm({ ...form, appType: e.target.value })} placeholder={tr("e.g. ANDROID_AGENT")} autoFocus />
                                <datalist id="av-types">{appTypes.map((t) => <option key={t} value={t} />)}</datalist>
                                <p className="text-xs text-slate-500">{tr("Use the exact name the app sends")}{appTypes.length ? tr(" (existing: {join})", { join: appTypes.join(", ") }) : ""}.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="av-version">{tr("Version")}</Label>
                                    <Input id="av-version" value={form.appVersion} onChange={(e) => setForm({ ...form, appVersion: e.target.value })} placeholder="e.g. 2.4.0" className="font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="av-code">{tr("Build code")}</Label>
                                    <Input id="av-code" inputMode="numeric" value={form.appVersionCode} onChange={(e) => setForm({ ...form, appVersionCode: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 42" className="font-mono" />
                                </div>
                            </div>
                            {clash && <p className="text-xs text-rose-600">{tr("{appType} already has build code {code} ({appVersion}).", { appType: form.appType, code, appVersion: clash.appVersion })}</p>}
                            <div className="flex items-start justify-between gap-4">
                                <Label htmlFor="av-must" className="flex-col items-start gap-1">
                                    <span>{tr("Require this update")}</span>
                                    <span className="text-xs font-normal text-slate-500">{tr("Older apps can't be used until they update.")}</span>
                                </Label>
                                <Switch id="av-must" checked={form.mustUpdate} onCheckedChange={(v) => setForm({ ...form, mustUpdate: !!v })} className="data-[state=checked]:bg-rose-600" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditing(null)}>{tr("Cancel")}</Button>
                            <Button type="submit" disabled={!valid || save.isPending} className="bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37]">{save.isPending ? tr("Saving…") : tr("Save")}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDelete name={deleting ? `${deleting.appType} ${deleting.appVersion}` : ""} open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} pending={remove.isPending}
                onConfirm={() => deleting && remove.mutate(deleting)}
                what="Apps will stop being told about this version. If it's the latest one, the previous version becomes the latest." />
        </div>
    )
}
