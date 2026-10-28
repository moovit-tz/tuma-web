"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { X as XIcon, MoreHorizontal, Eye, Pencil, KeyRound, UserCheck, UserX, Copy, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, FilterIcon, UserGroupIcon, RefreshIcon, Add01Icon, Shield01Icon, OfficeIcon, CheckListIcon, Briefcase01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
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
import { Skeleton } from "@/components/ui/skeleton"
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner } from "@/components/ui/table-banner"
import { SheetSection, DetailList } from "@/components/sheets/sheet-blocks"
import { AccountActions } from "@/components/sheets/account-actions"
import { AccountPermissionsPanel } from "@/components/sheets/account-permissions"
import { useToast } from "@/components/ui/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { getAdminAccounts, createAdmin, updateStaffAccount, setStaffAccountStatus, resetOwnerPassword } from "@/lib/services/user"
import type { User } from "@/types/user"
import { AdminModal, type AdminFormValues } from "@/components/modals/admin-modal"
import { AdminEditModal, type AdminEditFormValues } from "@/components/modals/admin-edit-modal"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { useTr } from "@/lib/i18n/portal"

/*
 * Staff accounts live in the backend's admin table (admins, OPS, owners) —
 * NOT the users table. Every action here uses the /auth/admins/* endpoints;
 * the /auth/users/* ones would act on whichever agent shares the id.
 */

const PAGE_SIZE = 10
const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", OPS: "Operations", OWNER: "Owner" }
const ROLE_LOZENGE: Record<string, string> = {
    ADMIN: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    OPS: "bg-[#ffd428] text-[#242a37]",
    OWNER: "bg-[#242a37]/10 text-[#242a37] dark:bg-white/10 dark:text-white",
}

function NavyCard({ label, value, sub, icon }: { label: string; value?: string; sub: string; icon: any }) {
    return (
        <Card className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative overflow-hidden shadow-[var(--ds-shadow-raised)]">
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12"><Icon icon={icon} size={100} /></div>
            <CardContent className="p-6 relative z-10">
                <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4"><Icon icon={icon} className="size-5 text-[#ffd428]" /></div>
                <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{label}</p>
                {value === undefined ? <Skeleton className="h-7 w-16 bg-white/10" /> : <h3 className="text-xl font-semibold text-white tabular-nums">{value}</h3>}
                <p className="text-xs font-bold text-white/40 mt-2">{sub}</p>
            </CardContent>
        </Card>
    )
}

export default function AdminsPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const debouncedSearch = useDebounce(searchQuery, 300)
    const [roleFilter, setRoleFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [page, setPage] = useState(1)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editing, setEditing] = useState<User | null>(null)
    const [viewing, setViewing] = useState<User | null>(null)
    const [resetting, setResetting] = useState<User | null>(null)
    const [statusTarget, setStatusTarget] = useState<User | null>(null)
    const [tempPassword, setTempPassword] = useState<{ id: number; pin: string; expiresAt?: string } | null>(null)
    const [me, setMe] = useState<any>(null)
    useEffect(() => setMe(getCurrentUser()), [])
    const isAdmin = String(me?.role ?? "").toUpperCase() === "ADMIN"

    // Without page/limit the backend returns every account, so counts and
    // search cover all staff (not just the page on screen)
    const { data, isLoading, isError, isFetching, refetch } = useQuery({
        queryKey: ["admins", "all"],
        queryFn: () => getAdminAccounts({}),
        staleTime: 60_000,
    })
    const all: User[] = (data as any)?.data || []

    const filtered = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase()
        return all.filter((a) => {
            if (roleFilter !== "all" && a.role !== roleFilter) return false
            if (statusFilter !== "all" && !!a.isActive !== (statusFilter === "active")) return false
            if (!q) return true
            return [a.fullName, a.username, a.email, a.phoneNumber, (a as any).company?.name].some((v) => String(v ?? "").toLowerCase().includes(q))
        })
    }, [all, debouncedSearch, roleFilter, statusFilter])
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    useEffect(() => setPage(1), [debouncedSearch, roleFilter, statusFilter])
    const hasFilters = !!searchQuery || roleFilter !== "all" || statusFilter !== "all"

    const counts = {
        total: all.length,
        active: all.filter((a) => a.isActive).length,
        ops: all.filter((a) => a.role === "OPS").length,
        owners: all.filter((a) => a.role === "OWNER").length,
        admins: all.filter((a) => a.role === "ADMIN").length,
    }

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admins"] })
    const fail = (title: string) => (error: any) => toast({ variant: "destructive", title, description: error?.message || "Please try again." })

    const createMutation = useMutation({
        mutationFn: (values: AdminFormValues) =>
            createAdmin({
                fullName: values.fullName,
                username: values.username,
                phoneNumber: values.phoneNumber,
                email: values.email,
                password: values.password,
                role: values.role,
                companyId: values.companyId,
            }),
        onSuccess: () => {
            toast({ title: tr("Account created"), description: tr("They can sign in with the password you set.") })
            invalidate()
            setIsCreateOpen(false)
        },
        onError: fail("Couldn't create the account"),
    })

    const updateMutation = useMutation({
        mutationFn: async ({ admin, values }: { admin: User; values: AdminEditFormValues }) => {
            await updateStaffAccount(admin.id, {
                fullName: values.fullName,
                username: values.username,
                phoneNumber: values.phoneNumber,
                email: values.email || undefined,
            })
            // Status has its own endpoint (and can't be changed on your own account)
            if (values.isActive !== !!admin.isActive) await setStaffAccountStatus(admin.id, values.isActive)
        },
        onSuccess: () => {
            toast({ title: tr("Account updated") })
            invalidate()
            setEditing(null)
            setViewing(null)
        },
        onError: fail("Couldn't update the account"),
    })

    const statusMutation = useMutation({
        mutationFn: (admin: User) => setStaffAccountStatus(admin.id, !admin.isActive),
        onSuccess: (_, admin) => {
            toast({ title: admin.isActive ? "Account deactivated" : "Account activated", description: admin.fullName })
            invalidate()
            setStatusTarget(null)
            setViewing(null)
        },
        onError: fail("Couldn't change the status"),
    })

    const resetMutation = useMutation({
        mutationFn: (admin: User) => resetOwnerPassword(admin.id),
        onSuccess: (result: any, admin) => {
            const pin = result?.temporaryPassword
            if (pin) setTempPassword({ id: admin.id, pin, expiresAt: result?.otpExpiresAt })
            toast({ title: tr("Password reset"), description: pin ? "A temporary password was sent by SMS — it's shown in their profile." : "A temporary password was sent by SMS." })
            setResetting(null)
            setViewing(admin)
        },
        onError: fail("Couldn't reset the password"),
    })

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast({ title: tr("Copied") })
        } catch {
            toast({ variant: "destructive", title: tr("Copy failed"), description: tr("Select the text and copy it manually.") })
        }
    }

    // ADMIN can reset owners and OPS; OPS can reset owners (enforced by the backend)
    const canReset = (a: User) => (isAdmin ? a.role === "OWNER" || a.role === "OPS" : a.role === "OWNER") && a.id !== me?.id
    const canChangeStatus = (a: User) => isAdmin && a.id !== me?.id

    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, items: filtered, ready: !isLoading, onOpen: setViewing })

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar — same layout as Companies ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0">
                    <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                        <Icon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" />
                        <Input
                            placeholder={tr("Search staff")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 pl-10 pr-9 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                        />
                        {searchQuery && (
                            <button type="button" aria-label={tr("Clear search")} onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#242a37] dark:hover:text-white">
                                <XIcon className="size-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2"><Icon icon={Shield01Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" /><SelectValue placeholder="ROLE" /></div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("All roles")}</SelectItem>
                                <SelectItem value="ADMIN" className="text-sm">{tr("Admin")}</SelectItem>
                                <SelectItem value="OPS" className="text-sm">{tr("Operations")}</SelectItem>
                                <SelectItem value="OWNER" className="text-sm">{tr("Owner")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-36 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2"><Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" /><SelectValue placeholder="STATUS" /></div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("All statuses")}</SelectItem>
                                <SelectItem value="active" className="text-sm">{tr("Active")}</SelectItem>
                                <SelectItem value="inactive" className="text-sm">{tr("Inactive")}</SelectItem>
                            </SelectContent>
                        </Select>
                        {hasFilters && (
                            <Button variant="ghost" onClick={() => { setSearchQuery(""); setRoleFilter("all"); setStatusFilter("all") }} className="h-12 text-xs font-semibold">
                                <XIcon className="size-4 mr-1" />{" "}{tr("Clear")}</Button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label={tr("Refresh staff")}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <Icon icon={RefreshIcon} size={20} className={cn(isFetching && "animate-spin")} />
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] flex items-center gap-3 cursor-pointer">
                        <Icon icon={Add01Icon} size={20} />{tr("Add Staff")}</Button>
                </div>
            </div>

            {/* ── Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <NavyCard label={tr("Staff accounts")} value={isLoading ? undefined : counts.total.toLocaleString()} sub={tr("{admins} admins", { admins: counts.admins.toLocaleString() })} icon={UserGroupIcon} />
                <NavyCard label={tr("Active")} value={isLoading ? undefined : counts.active.toLocaleString()} sub={tr("{v} inactive", { v: (counts.total - counts.active).toLocaleString() })} icon={CheckListIcon} />
                <NavyCard label={tr("Operations")} value={isLoading ? undefined : counts.ops.toLocaleString()} sub={tr("Run day-to-day operations")} icon={Briefcase01Icon} />
                <NavyCard label={tr("Owners")} value={isLoading ? undefined : counts.owners.toLocaleString()} sub={tr("Bus company owners")} icon={OfficeIcon} />
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                <TableBanner title={tr("Staff Accounts")} description={tr("Admins, operations staff and bus owners who sign in to the portal")} icon="roles" />
                {isLoading ? (
                    <ListSkeleton rows={8} />
                ) : isError ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load staff accounts")}</p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>{tr("Try again")}</Button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No staff accounts found")}</p>
                        <p className="mt-1 text-sm text-slate-500">{hasFilters ? tr("Try a different search or filter.") : tr("Add the first staff account.")}</p>
                    </div>
                ) : (
                    <div className="bg-slate-50/50 dark:bg-black/10">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[880px]">
                                <TableHeader>
                                    <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                        <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Staff")}</TableHead>
                                        <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Contact")}</TableHead>
                                        <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Role")}</TableHead>
                                        <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Company")}</TableHead>
                                        <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                        <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((a) => (
                                        <TableRow
                                            key={a.id}
                                            tabIndex={0}
                                            aria-label={tr("Open {fullName}", { fullName: a.fullName })}
                                            onClick={() => setViewing(a)}
                                            onKeyDown={(e) => {
                                                if (e.target !== e.currentTarget) return
                                                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewing(a) }
                                            }}
                                            className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                        >
                                            <TableCell className="px-6 py-4">
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors truncate">
                                                    {a.fullName}{a.id === me?.id && <span className="ml-2 text-xs font-normal text-slate-400">{tr("(you)")}</span>}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(a.id).padStart(3, "0") })}</Badge>
                                                    <p className="text-xs text-slate-400 font-bold truncate">@{a.username}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{a.email || "—"}</p>
                                                    </div>
                                                    <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold text-slate-400 w-fit flex items-center tabular-nums">
                                                        {a.phoneNumber || "—"}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", ROLE_LOZENGE[a.role] ?? "bg-slate-100 text-slate-700")}>
                                                    {ROLE_LABEL[a.role] ?? a.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4"><p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{(a as any).company?.name || "—"}</p></TableCell>
                                            <TableCell className="py-4 text-center">
                                                <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", a.isActive ? "bg-[#ffd428] text-[#242a37]" : "bg-[#242a37] text-white")}>
                                                    {a.isActive ? "ACTIVE" : "INACTIVE"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <DropdownMenu modal={false}>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" aria-label={tr("Actions for {fullName}", { fullName: a.fullName })} onClick={(e) => e.stopPropagation()}
                                                            className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer">
                                                            <MoreHorizontal className="size-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] p-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuItem onClick={() => setViewing(a)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer"><Eye className="size-5 mr-3" />{" "}{tr("View")}</DropdownMenuItem>
                                                        {isAdmin && <DropdownMenuItem onClick={() => setEditing(a)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer"><Pencil className="size-5 mr-3" />{" "}{tr("Edit")}</DropdownMenuItem>}
                                                        {canReset(a) && <DropdownMenuItem onClick={() => setResetting(a)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer"><KeyRound className="size-5 mr-3" />{" "}{tr("Reset password")}</DropdownMenuItem>}
                                                        {canChangeStatus(a) && (
                                                            <>
                                                                <DropdownMenuSeparator className="my-2" />
                                                                <DropdownMenuItem onClick={() => setStatusTarget(a)}
                                                                    className={cn("rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold cursor-pointer", a.isActive ? "text-rose-500 focus:bg-rose-500 focus:text-white" : "focus:bg-[#ffd428] focus:text-[#242a37]")}>
                                                                    {a.isActive ? <><UserX className="size-5 mr-3" />{" "}{tr("Deactivate")}</> : <><UserCheck className="size-5 mr-3" />{" "}{tr("Activate")}</>}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setViewing(a)}
                                                                    className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold text-rose-500 focus:bg-rose-500 focus:text-white cursor-pointer">
                                                                    <Trash2 className="size-5 mr-3" />{" "}{tr("Delete…")}</DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">{tr("Page {page} of {totalPages} · {filtered} accounts", { page, totalPages, filtered: filtered.length.toLocaleString() })}</p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4 mr-1" />{" "}{tr("Previous")}</Button>
                                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{tr("Next")}{" "}<ChevronRight className="size-4 ml-1" /></Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Staff sheet (agent-sheet design) ── */}
            <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
                <SheetContent side="right" className="[&>button]:hidden flex h-full w-full flex-col overflow-hidden border-l p-0 outline-none sm:max-w-[600px] bg-white dark:bg-[#0f1117]">
                    {viewing && (
                        <>
                            <SheetTitle className="sr-only">{viewing.fullName}</SheetTitle>
                            <SheetDescription className="sr-only">{tr("Staff account details.")}</SheetDescription>
                            <div className="shrink-0 bg-[#242a37] p-5 pt-6 sm:p-8 sm:pt-10 text-white">
                                <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                    <div className="flex size-14 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428]">
                                        <span className="text-2xl font-bold text-[#242a37]">{viewing.fullName?.charAt(0) || "?"}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        {canReset(viewing) && (
                                            <Button variant="outline" onClick={() => setResetting(viewing)} disabled={resetMutation.isPending}
                                                className="h-9 rounded-[var(--ds-radius-small)] border-none bg-white/10 px-4 text-xs font-semibold text-[#ffd428] hover:bg-white/20 hover:text-[#ffd428]">
                                                <KeyRound className="size-4 mr-2" />{" "}{tr("Reset password")}</Button>
                                        )}
                                        {isAdmin && (
                                            <Button onClick={() => setEditing(viewing)} className="h-9 gap-2 rounded-[var(--ds-radius-small)] border-none bg-[#ffd428] px-4 text-xs font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                                                <Pencil className="size-4" />{" "}{tr("Edit")}</Button>
                                        )}
                                        <Button variant="ghost" onClick={() => setViewing(null)} aria-label={tr("Close")}
                                            className="flex size-9 items-center justify-center rounded-full bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white">
                                            <XIcon className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-2xl font-bold leading-none">{viewing.fullName}</h2>
                                        <p className="mt-2 truncate text-xs font-semibold text-white/50">
                                            {ROLE_LABEL[viewing.role] ?? viewing.role} <span className="text-white/20">•</span> @{viewing.username}
                                        </p>
                                    </div>
                                    <Badge className={cn("h-7 shrink-0 rounded-[var(--ds-radius-large)] border-none px-3 text-xs font-semibold", viewing.isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                                        {viewing.isActive ? "ACTIVE" : "INACTIVE"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                                <SheetSection title={tr("Account")}>
                                    <DetailList rows={[
                                        { label: tr("Full name"), value: viewing.fullName },
                                        { label: tr("Username"), value: `@${viewing.username}`, mono: true },
                                        { label: tr("Role"), value: ROLE_LABEL[viewing.role] ?? viewing.role },
                                        { label: tr("Company"), value: (viewing as any).company?.name || "—" },
                                        { label: tr("Joined"), value: viewing.createdAt ? format(new Date(viewing.createdAt), "d MMM yyyy") : "—" },
                                    ]} />
                                </SheetSection>
                                <SheetSection title={tr("Contact")}>
                                    <DetailList rows={[
                                        { label: tr("Phone"), value: viewing.phoneNumber || "—", mono: true },
                                        { label: tr("Email"), value: viewing.email || "—" },
                                    ]} />
                                </SheetSection>
                                {tempPassword?.id === viewing.id && (
                                    <SheetSection title={tr("Temporary password")}>
                                        <div className="flex items-center justify-between gap-3 px-5 py-4">
                                            <div>
                                                <p className="font-mono text-lg font-semibold tabular-nums text-[#242a37] dark:text-white select-all">{tempPassword.pin}</p>
                                                <p className="mt-1 text-xs text-slate-500">{tr("Sent to")}{" "}{viewing.phoneNumber || tr("their phone")}{" "}{tr("by SMS")}{tempPassword.expiresAt ? tr(" · valid until {mm}", { mm: format(new Date(tempPassword.expiresAt), "d MMM, HH:mm") }) : ""}.
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => copy(tempPassword.pin)}><Copy className="size-4 mr-1" />{" "}{tr("Copy")}</Button>
                                        </div>
                                    </SheetSection>
                                )}
                                <AccountPermissionsPanel kind="staff" accountId={viewing.id} />
                                <AccountActions
                                    kind="staff"
                                    account={viewing}
                                    onChanged={(isActive) => setViewing({ ...viewing, isActive })}
                                    onDeleted={() => setViewing(null)}
                                />
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <AdminModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSave={async (values: AdminFormValues) => createMutation.mutateAsync(values)}
                isLoading={createMutation.isPending}
            />
            <AdminEditModal
                isOpen={!!editing}
                onClose={() => setEditing(null)}
                admin={editing}
                onSave={async (_id: number, values: AdminEditFormValues) => editing && updateMutation.mutateAsync({ admin: editing, values })}
                isLoading={updateMutation.isPending}
            />

            <AlertDialog open={!!resetting} onOpenChange={(open) => !open && setResetting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Reset password?")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-semibold text-[#242a37] dark:text-white">{resetting?.fullName}</span>{" "}{tr("will be signed out and sent a temporary 6-digit password by SMS.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); resetting && resetMutation.mutate(resetting) }} disabled={resetMutation.isPending}>
                            {resetMutation.isPending ? tr("Resetting…") : tr("Reset password")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{statusTarget?.isActive ? tr("Deactivate this account?") : tr("Activate this account?")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {statusTarget?.isActive
                                ? <><span className="font-semibold text-[#242a37] dark:text-white">{statusTarget?.fullName}</span>{" "}{tr("will be signed out and won't be able to sign in until the account is activated again.")}</>
                                : <><span className="font-semibold text-[#242a37] dark:text-white">{statusTarget?.fullName}</span>{" "}{tr("will be able to sign in again.")}</>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); statusTarget && statusMutation.mutate(statusTarget) }} disabled={statusMutation.isPending}
                            className={statusTarget?.isActive ? "bg-rose-600 text-white hover:bg-rose-700" : ""}>
                            {statusMutation.isPending ? tr("Saving…") : statusTarget?.isActive ? tr("Deactivate") : tr("Activate")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
