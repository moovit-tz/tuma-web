"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { X as XIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, RefreshIcon, Add01Icon, PackageIcon, CheckListIcon, Package01Icon, Archive01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { TableBanner } from "@/components/ui/table-banner"
import { NavyCard } from "@/components/ui/navy-card"
import { useToast } from "@/components/ui/use-toast"
import { useTitle } from "@/context/TitleContext"
import { useAccess } from "@/hooks/use-access"
import { cn } from "@/lib/utils"
import { getPortalParcelTypes, createParcelType, editParcelType, deleteParcelType, type PortalParcelType } from "@/lib/services/parcel-types"
import { useTr } from "@/lib/i18n/portal"
import { ListPager, usePaged } from "@/components/ui/list-pager"

// The backend stores names in capitals and rejects duplicates (case-insensitive)
const normalise = (name: string) => name.trim().replace(/\s+/g, " ").toUpperCase()

export default function ParcelTypesPage() {
    const tr = useTr()
    const { setTitle } = useTitle()
    useEffect(() => setTitle("Parcel Types"), [setTitle])
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { can } = useAccess()
    const [search, setSearch] = useState("")
    const [usage, setUsage] = useState<"all" | "used" | "unused">("all")
    const [editing, setEditing] = useState<PortalParcelType | "new" | null>(null)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [deleting, setDeleting] = useState<PortalParcelType | null>(null)

    const { data: types = [], isLoading, isError, isFetching, refetch } = useQuery({
        queryKey: ["parcel-types", "portal"],
        queryFn: getPortalParcelTypes,
        staleTime: 60_000,
    })

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return types.filter((t) => {
            if (usage === "used" && t.parcelCount === 0) return false
            if (usage === "unused" && t.parcelCount > 0) return false
            return !q || t.name.toLowerCase().includes(q) || String(t.description ?? "").toLowerCase().includes(q)
        })
    }, [types, search, usage])
    // 10 rows per page
    const typesPage = usePaged(rows, `${search}|${usage}`)

    const inUse = types.filter((t) => t.parcelCount > 0).length
    const parcels = types.reduce((s, t) => s + t.parcelCount, 0)
    const top = [...types].sort((a, b) => b.parcelCount - a.parcelCount)[0]

    const openEditor = (t: PortalParcelType | "new") => {
        setEditing(t)
        setName(t === "new" ? "" : t.name)
        setDescription(t === "new" ? "" : t.description ?? "")
    }
    const clash = useMemo(() => {
        const n = normalise(name)
        if (!n) return false
        return types.some((t) => normalise(t.name) === n && (editing === "new" || t.id !== (editing as PortalParcelType)?.id))
    }, [name, types, editing])

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["parcel-types"] })
    const saveMutation = useMutation({
        mutationFn: async () => {
            const body = { name: normalise(name), description: description.trim() || undefined }
            return editing === "new" ? createParcelType(body) : editParcelType((editing as PortalParcelType).id, body)
        },
        onSuccess: () => {
            toast({ title: editing === "new" ? "Parcel type added" : "Parcel type updated", description: normalise(name) })
            invalidate()
            setEditing(null)
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't save the parcel type"), description: e?.message }),
    })
    const deleteMutation = useMutation({
        mutationFn: (t: PortalParcelType) => deleteParcelType(t.id),
        onSuccess: (_, t) => {
            toast({ title: tr("Parcel type deleted"), description: t.name })
            invalidate()
            setDeleting(null)
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't delete the parcel type"), description: e?.message }),
    })

    const canCreate = can("parcel_types.create")
    const canManage = can("parcel_types.manage")

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1 max-w-4xl">
                    <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                        <Icon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" />
                        <Input
                            placeholder={tr("Search parcel types")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 pl-10 pr-9 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                        />
                        {search && (
                            <button type="button" aria-label={tr("Clear search")} onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#242a37] dark:hover:text-white">
                                <XIcon className="size-4" />
                            </button>
                        )}
                    </div>
                    <div role="group" aria-label={tr("Filter by use")} className="flex h-12 items-center gap-1 rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f2b] p-1">
                        {(["all", "used", "unused"] as const).map((u) => (
                            <button key={u} type="button" onClick={() => setUsage(u)} aria-pressed={usage === u}
                                className={cn("h-full rounded-[6px] px-4 text-xs font-semibold transition-colors",
                                    usage === u ? "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]" : "text-slate-500 hover:text-[#242a37] dark:hover:text-white")}>
                                {u === "all" ? "ALL" : u === "used" ? tr("IN USE") : "UNUSED"}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label={tr("Refresh parcel types")}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <Icon icon={RefreshIcon} size={20} className={cn(isFetching && "animate-spin")} />
                    </Button>
                    {canCreate && (
                        <Button onClick={() => openEditor("new")}
                            className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] flex items-center gap-3 cursor-pointer">
                            <Icon icon={Add01Icon} size={20} />{" "}{tr("Add Parcel Type")}</Button>
                    )}
                </div>
            </div>

            {/* ── Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <NavyCard label={tr("Parcel types")} value={isLoading ? undefined : types.length.toLocaleString()} sub={tr("Available when booking")} icon={PackageIcon} />
                <NavyCard label={tr("In use")} value={isLoading ? undefined : inUse.toLocaleString()} sub={tr("{v} not used yet", { v: (types.length - inUse).toLocaleString() })} icon={CheckListIcon} />
                <NavyCard label={tr("Parcels with a type")} value={isLoading ? undefined : parcels.toLocaleString()} sub={tr("All time")} icon={Package01Icon} />
                <NavyCard label={tr("Most used")} value={isLoading ? undefined : top && top.parcelCount > 0 ? top.name : "—"} sub={top && top.parcelCount > 0 ? tr("{parcelCount} parcels", { parcelCount: top.parcelCount.toLocaleString() }) : tr("No parcels yet")} icon={Archive01Icon} />
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                <TableBanner title={tr("Parcel Types")} description={tr("What agents can choose when booking a parcel")} icon="parcels" />
                {isLoading ? (
                    <ListSkeleton rows={6} />
                ) : isError ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load parcel types")}</p>
                        <p className="mt-1 text-sm text-slate-500">{tr("If this keeps happening, the server may not have the latest update yet.")}</p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>{tr("Try again")}</Button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{types.length ? tr("No parcel types match") : tr("No parcel types yet")}</p>
                        <p className="mt-1 text-sm text-slate-500">{types.length ? tr("Try a different search or filter.") : tr("Add the first one, for example DOCUMENTS or ELECTRONICS.")}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-slate-50/50 dark:bg-black/10">
                        <Table className="min-w-[720px]">
                            <TableHeader>
                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Parcel type")}</TableHead>
                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Description")}</TableHead>
                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Parcels")}</TableHead>
                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Last changed")}</TableHead>
                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {typesPage.pageRows.map((t) => (
                                    <TableRow key={t.id} className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5">
                                        <TableCell className="px-6 py-4">
                                            <p className="font-semibold text-sm text-slate-900 dark:text-white">{t.name}</p>
                                            <Badge variant="outline" className="mt-1 bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(t.id).padStart(3, "0") })}</Badge>
                                        </TableCell>
                                        <TableCell className="py-4 max-w-[320px]"><p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{t.description || "—"}</p></TableCell>
                                        <TableCell className="py-4 text-right">
                                            <span className={cn("text-sm font-semibold tabular-nums", t.parcelCount ? "text-[#242a37] dark:text-white" : "text-slate-400")}>{t.parcelCount.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell className="py-4 text-xs text-slate-500">{t.updatedAt ? format(new Date(t.updatedAt), "d MMM yyyy") : "—"}</TableCell>
                                        <TableCell className="px-6 py-4 text-right">
                                            {canManage ? (
                                                <DropdownMenu modal={false}>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" aria-label={tr("Actions for {name}", { name: t.name })}
                                                            className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors">
                                                            <MoreHorizontal className="size-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 rounded-[var(--ds-radius-large)] p-2">
                                                        <DropdownMenuItem onClick={() => openEditor(t)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37]"><Pencil className="size-5 mr-3" />{" "}{tr("Edit")}</DropdownMenuItem>
                                                        <DropdownMenuItem disabled={t.parcelCount > 0} onClick={() => setDeleting(t)}
                                                            className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold text-rose-500 focus:bg-rose-500 focus:text-white">
                                                            <Trash2 className="size-5 mr-3" /> {t.parcelCount > 0 ? tr("In use — can't delete") : tr("Delete")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ) : <span className="text-xs text-slate-400">—</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ListPager page={typesPage.page} totalPages={typesPage.totalPages} total={typesPage.total} onPage={typesPage.setPage} />
                    </div>
                )}
            </div>

            <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={(e) => { e.preventDefault(); if (normalise(name) && !clash) saveMutation.mutate() }}>
                        <DialogHeader>
                            <DialogTitle>{editing === "new" ? tr("Add parcel type") : tr("Edit parcel type")}</DialogTitle>
                            <DialogDescription>{tr("Agents choose this when they book a parcel.")}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="pt-name">{tr("Name")}</Label>
                                <Input id="pt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("e.g. ELECTRONICS")} autoFocus maxLength={60}
                                    aria-invalid={clash} aria-describedby="pt-name-help" className="uppercase" />
                                <p id="pt-name-help" className={cn("text-xs", clash ? "text-rose-600" : "text-slate-500")}>
                                    {clash ? tr("A parcel type with this name already exists.") : tr("Saved in capital letters.")}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pt-desc">{tr("Description")}{" "}<span className="font-normal text-slate-400">{tr("(optional)")}</span></Label>
                                <Textarea id="pt-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300}
                                    placeholder={tr("What goes in this type, any handling notes")} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditing(null)}>{tr("Cancel")}</Button>
                            <Button type="submit" disabled={!normalise(name) || clash || saveMutation.isPending}
                                className="bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37]">
                                {saveMutation.isPending ? tr("Saving…") : editing === "new" ? tr("Add parcel type") : tr("Save changes")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Delete {name}?", { name: deleting?.name })}</AlertDialogTitle>
                        <AlertDialogDescription>{tr("Agents won't be able to choose it any more. No parcels use it, so nothing else changes.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); deleting && deleteMutation.mutate(deleting) }} disabled={deleteMutation.isPending}
                            className="bg-rose-600 text-white hover:bg-rose-700">
                            {deleteMutation.isPending ? tr("Deleting…") : tr("Delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
