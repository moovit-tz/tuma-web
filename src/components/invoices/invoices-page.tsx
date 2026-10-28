"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Download, Printer, CheckCircle2, RotateCcw, FileText, Sparkles, ChevronLeft, ChevronRight, X as XIcon } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { RefreshIcon, Invoice01Icon, CheckListIcon, Clock01Icon, Coins01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ListSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { SheetSection, StatGrid, SheetEmpty, DetailList } from "@/components/sheets/sheet-blocks"
import { TableBanner } from "@/components/ui/table-banner"
import { NavyCard } from "@/components/ui/navy-card"
import { useToast } from "@/components/ui/use-toast"
import { useTitle } from "@/context/TitleContext"
import { useAccess } from "@/hooks/use-access"
import { cn } from "@/lib/utils"
import { getInvoices, previewInvoices, previewCompanyInvoice, generateInvoices, markInvoicePaid, markInvoiceUnpaid, getInvoiceRange, previewAllTimeByMonth, monthRange, type Invoice, type InvoicePreviewRow } from "@/lib/services/invoices"
import { InvoiceDocument, invoiceMonth, downloadInvoicePdf, printInvoice } from "@/components/invoices/invoice-document"
import { useTr } from "@/lib/i18n/portal"
import { ListPager, usePaged } from "@/components/ui/list-pager"

/*
 * Invoices — parcels that earned no commission are billed at a flat rate per
 * parcel each month. Admins prepare invoices and record payments; owners see
 * their own company's invoices.
 */

const TZS = (n?: number | null) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(Number(n) || 0))}`
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
const MONTHS = Array.from({ length: 24 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    return { value: monthKey(d), label: format(d, "MMMM yyyy") }
})
// "2026-01..2026-03" → "Jan 2026 – Mar 2026"; "all" → "All months"
function periodLabelOf(month: string) {
    if (month === "all") return "All months"
    const r = monthRange(month)
    const label = (m: string) => format(new Date(`${m}-01T12:00:00`), "MMM yyyy")
    if (r) return r[0] === r[1] ? format(new Date(`${r[0]}-01T12:00:00`), "MMMM yyyy") : `${label(r[0])} – ${label(r[1])}`
    return MONTHS.find((m) => m.value === month)?.label ?? month
}

const STATUS_LOZENGE = {
    PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    PROFORMA: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
}

export function InvoicesPage({ mode }: { mode: "admin" | "owner" }) {
    const tr = useTr()
    const { setTitle } = useTitle()
    useEffect(() => setTitle("Invoices"), [setTitle])
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { can } = useAccess()
    const isAdmin = mode === "admin"
    const canManage = isAdmin && can("invoices.manage")

    // Admins look at one month (last month by default); owners see everything
    const [month, setMonth] = useState(isAdmin ? MONTHS[1].value : "all")
    const [status, setStatus] = useState("all")
    const [search, setSearch] = useState("")
    const [viewing, setViewing] = useState<Invoice | null>(null)
    const [paying, setPaying] = useState<Invoice | null>(null)
    const [reference, setReference] = useState("")
    const [paidOn, setPaidOn] = useState(format(new Date(), "yyyy-MM-dd"))
    const [preparing, setPreparing] = useState(false)
    const [busy, setBusy] = useState<"pdf" | "print" | null>(null)
    const docRef = useRef<HTMLDivElement>(null)
    const monthLabel = periodLabelOf(month)
    // "Choose a range…" picker
    const [rangeOpen, setRangeOpen] = useState(false)
    const [rangeFrom, setRangeFrom] = useState(MONTHS[3].value)
    const [rangeTo, setRangeTo] = useState(MONTHS[1].value)

    const invoicesQuery = useQuery({
        // All statuses at once; the tabs filter here so each can show its count
        queryKey: ["invoices", month],
        queryFn: () => getInvoices({ month: month === "all" ? undefined : month }),
        staleTime: 60_000,
    })
    const invoices = invoicesQuery.data?.data ?? []
    const summary = invoicesQuery.data?.summary

    const statusCounts = useMemo(() => ({
        all: invoices.length,
        PROFORMA: invoices.filter((i) => i.status === "PROFORMA").length,
        PAID: invoices.filter((i) => i.status === "PAID").length,
    }), [invoices])
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return invoices
            .filter((i) => status === "all" || i.status === status)
            .filter((i) => !q || [i.number, i.company?.name].some((v) => String(v ?? "").toLowerCase().includes(q)))
    }, [invoices, search, status])
    // 10 rows per page
    const invPage = usePaged(rows, `${search}|${status}|${month}`)

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices"] })
    const replaceViewing = (inv: Invoice) => setViewing((v) => (v && v.id === inv.id ? inv : v))

    const payMutation = useMutation({
        mutationFn: (inv: Invoice) => markInvoicePaid(inv.id, { reference: reference.trim() || undefined, paidAt: new Date(`${paidOn}T12:00:00`).toISOString() }),
        onSuccess: (inv) => {
            toast({ title: tr("Payment recorded"), description: tr("{number} is now paid.", { number: inv.number }) })
            replaceViewing(inv)
            setPaying(null)
            invalidate()
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't record the payment"), description: e?.message }),
    })
    const unpayMutation = useMutation({
        mutationFn: (inv: Invoice) => markInvoiceUnpaid(inv.id),
        onSuccess: (inv) => {
            toast({ title: tr("Back to proforma"), description: inv.number })
            replaceViewing(inv)
            invalidate()
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't change the invoice"), description: e?.message }),
    })

    const exportDoc = async (kind: "pdf" | "print") => {
        if (!docRef.current || !viewing) return
        setBusy(kind)
        try {
            if (kind === "pdf") await downloadInvoicePdf(docRef.current, viewing.number)
            else await printInvoice(docRef.current)
        } catch {
            toast({ variant: "destructive", title: kind === "pdf" ? "Couldn't create the PDF" : "Couldn't print" })
        } finally {
            setBusy(null)
        }
    }

    const loading = invoicesQuery.isPending

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Invoices")}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {isAdmin ? tr("Monthly platform fee for companies whose agents have no commission set") : tr("Your monthly MySafari platform fee")}
                        {summary ? tr(" · {TZS} per parcel", { TZS: TZS(summary.ratePerParcel) }) : ""}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Select value={month} onValueChange={(v) => {
                        if (v === "range") {
                            const cur = monthRange(month)
                            if (cur) { setRangeFrom(cur[0]); setRangeTo(cur[1]) }
                            setRangeOpen(true)
                        } else setMonth(v)
                    }}>
                        <SelectTrigger aria-label={tr("Month")} className="h-11 w-full sm:w-56 bg-white dark:bg-[#1a1f2b] text-xs font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all" className="text-xs">{tr("All months")}</SelectItem>
                            {monthRange(month) && <SelectItem value={month} className="text-xs">{monthLabel}</SelectItem>}
                            <SelectItem value="range" className="text-xs font-semibold">{tr("Choose a range…")}</SelectItem>
                            {MONTHS.map((m) => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" aria-label={tr("Refresh invoices")} onClick={() => invoicesQuery.refetch()}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <Icon icon={RefreshIcon} size={20} className={cn(invoicesQuery.isFetching && "animate-spin")} />
                    </Button>
                    {canManage && (
                        <Button onClick={() => setPreparing(true)} title={month === "all" ? tr("Bill everything that hasn't been invoiced yet") : undefined}
                            className="h-10 px-6 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-large)] font-semibold text-xs shadow-[var(--ds-shadow-raised)] gap-2">
                            <Sparkles className="size-4" />{" "}{tr("Prepare invoices")}</Button>
                    )}
                </div>
            </div>

            {invoicesQuery.isError && (
                <p className="text-sm font-semibold text-rose-500">{tr("Couldn't load invoices. If this keeps happening, the server may not have the latest update yet.")}{" "}
                    <button onClick={() => invoicesQuery.refetch()} className="underline">{tr("Retry")}</button>
                </p>
            )}

            {/* ── Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <NavyCard label={tr("Invoiced")} value={loading ? undefined : TZS(summary?.total)} sub={tr("{v} invoices · {monthLabel}", { v: (summary?.count ?? 0).toLocaleString(), monthLabel })} icon={Invoice01Icon} />
                <NavyCard label={tr("Paid")} value={loading ? undefined : TZS(summary?.paid)} sub={tr("{v} invoices paid", { v: ((summary?.count ?? 0) - (summary?.proformaCount ?? 0)).toLocaleString() })} icon={CheckListIcon} />
                <NavyCard label={tr("Outstanding")} value={loading ? undefined : TZS(summary?.outstanding)} sub={tr("{v} proforma awaiting payment", { v: (summary?.proformaCount ?? 0).toLocaleString() })} icon={Clock01Icon} />
                <NavyCard label={tr("Rate")} value={loading ? undefined : TZS(summary?.ratePerParcel ?? 150)} sub={tr("Per parcel booked")} icon={Coins01Icon} />
            </div>

            {/* ── Status tabs — same style as the ops pages ── */}
            <Tabs value={status} onValueChange={setStatus}>
                <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                    {([
                        ["all", "All invoices", Invoice01Icon],
                        ["PROFORMA", "Proforma", Clock01Icon],
                        ["PAID", "Paid", CheckListIcon],
                    ] as const).map(([value, label, icon]) => (
                        <TabsTrigger key={value} value={value} className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer gap-3">
                            <span className="flex items-center gap-2"><Icon icon={icon} size={18} /> {label}</span>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {statusCounts[value].toLocaleString()}
                            </Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                <TableBanner title={isAdmin ? tr("Company Invoices") : tr("Your Invoices")} description={monthLabel} icon="commissions" actions={isAdmin ? (
                    <div className="relative w-full sm:w-64">
                        <Icon icon={Search01Icon} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Search company or number")} aria-label={tr("Search invoices")}
                            className="h-10 pl-10 pr-9 bg-white/10 border-white/10 text-white placeholder:text-white/40 text-xs" />
                        {search && (
                            <button type="button" aria-label={tr("Clear search")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 hover:text-white">
                                <XIcon className="size-4" />
                            </button>
                        )}
                    </div>
                ) : undefined} />
                {loading ? <ListSkeleton rows={6} /> : rows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No invoices")}{" "}{month === "all" ? tr("yet") : tr("for {monthLabel}", { monthLabel })}</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {canManage && month !== "all" ? tr("Use Prepare invoices to bill companies for this month.") : isAdmin ? tr("Pick another month.") : tr("Invoices appear here once MySafari issues them.")}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-slate-50/50 dark:bg-black/10">
                        <Table className="min-w-[820px]">
                            <TableHeader>
                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Invoice")}</TableHead>
                                    {isAdmin && <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Company")}</TableHead>}
                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Period")}</TableHead>
                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Parcels")}</TableHead>
                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Amount")}</TableHead>
                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invPage.pageRows.map((inv) => (
                                    <TableRow key={inv.id} className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5">
                                        <TableCell className="px-6 py-4">
                                            <button type="button" onClick={() => setViewing(inv)} className="font-mono text-sm font-semibold text-[#242a37] dark:text-white hover:underline underline-offset-4">{inv.number}</button>
                                            <p className="text-xs text-slate-400">{tr("Issued {yyyy}", { yyyy: format(new Date(inv.createdAt), "d MMM yyyy") })}</p>
                                        </TableCell>
                                        {isAdmin && <TableCell className="py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{inv.company?.name}</TableCell>}
                                        <TableCell className="py-4 text-xs text-slate-600 dark:text-slate-300">{invoiceMonth(inv)}</TableCell>
                                        <TableCell className="py-4 text-right text-sm tabular-nums">{inv.parcelCount.toLocaleString()}</TableCell>
                                        <TableCell className="py-4 text-right text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(inv.amount)}</TableCell>
                                        <TableCell className="py-4 text-center">
                                            <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", STATUS_LOZENGE[inv.status])}>
                                                {inv.status === "PAID" ? "PAID" : "PROFORMA"}
                                            </Badge>
                                            {inv.status === "PAID" && inv.paidAt && <p className="mt-1 text-[11px] text-slate-400">{format(new Date(inv.paidAt), "d MMM yyyy")}</p>}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-right">
                                            <div className="inline-flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setViewing(inv)}><FileText className="size-4 mr-1" />{" "}{tr("View")}</Button>
                                                {canManage && inv.status === "PROFORMA" && (
                                                    <Button size="sm" onClick={() => { setReference(""); setPaidOn(format(new Date(), "yyyy-MM-dd")); setPaying(inv) }}
                                                        className="bg-[#242a37] text-white hover:bg-[#1a1f2a]">
                                                        <CheckCircle2 className="size-4 mr-1" />{" "}{tr("Record payment")}</Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ListPager page={invPage.page} totalPages={invPage.totalPages} total={invPage.total} onPage={invPage.setPage} />
                    </div>
                )}
            </div>

            {/* ── Invoice sheet ── */}
            <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
                <SheetContent side="right" className="[&>button]:hidden flex h-full w-full flex-col overflow-hidden border-l p-0 sm:max-w-[760px] bg-white dark:bg-[#0f1117]">
                    {viewing && (
                        <>
                            <SheetTitle className="sr-only">{viewing.number}</SheetTitle>
                            <SheetDescription className="sr-only">{tr("Invoice for {name}, {invoiceMonth}.", { name: viewing.company?.name, invoiceMonth: invoiceMonth(viewing) })}</SheetDescription>
                            <div className="shrink-0 bg-[#242a37] p-5 sm:p-8 text-white">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-white/50">{viewing.status === "PAID" ? tr("Invoice") : tr("Proforma invoice")}</p>
                                        <h2 className="mt-1 truncate font-mono text-2xl font-bold">{viewing.number}</h2>
                                        <p className="mt-2 text-xs font-semibold text-white/50">{viewing.company?.name} · {invoiceMonth(viewing)}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => setViewing(null)} aria-label={tr("Close")}
                                        className="flex size-9 items-center justify-center rounded-full bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white">
                                        <XIcon className="size-4" />
                                    </Button>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-2">
                                    <Button onClick={() => exportDoc("pdf")} disabled={!!busy} className="h-9 gap-2 rounded-[var(--ds-radius-small)] bg-[#ffd428] px-4 text-xs font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                                        <Download className="size-4" /> {busy === "pdf" ? tr("Preparing…") : tr("Download PDF")}
                                    </Button>
                                    <Button variant="outline" onClick={() => exportDoc("print")} disabled={!!busy} className="h-9 gap-2 rounded-[var(--ds-radius-small)] border-none bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20 hover:text-white">
                                        <Printer className="size-4" /> {busy === "print" ? tr("Preparing…") : tr("Print")}
                                    </Button>
                                    {canManage && viewing.status === "PROFORMA" && (
                                        <Button variant="outline" onClick={() => { setReference(""); setPaidOn(format(new Date(), "yyyy-MM-dd")); setPaying(viewing) }}
                                            className="h-9 gap-2 rounded-[var(--ds-radius-small)] border-none bg-white/10 px-4 text-xs font-semibold text-[#ffd428] hover:bg-white/20 hover:text-[#ffd428]">
                                            <CheckCircle2 className="size-4" />{" "}{tr("Record payment")}</Button>
                                    )}
                                    {canManage && viewing.status === "PAID" && (
                                        <Button variant="outline" onClick={() => unpayMutation.mutate(viewing)} disabled={unpayMutation.isPending}
                                            className="h-9 gap-2 rounded-[var(--ds-radius-small)] border-none bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20 hover:text-white">
                                            <RotateCcw className="size-4" /> {unpayMutation.isPending ? tr("Saving…") : tr("Mark as unpaid")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                                <div className="mx-auto w-fit overflow-hidden rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)]">
                                    <InvoiceDocument ref={docRef} invoice={viewing} />
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Record payment ── */}
            <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={(e) => { e.preventDefault(); paying && payMutation.mutate(paying) }}>
                        <DialogHeader>
                            <DialogTitle>{tr("Record payment")}</DialogTitle>
                            <DialogDescription>{paying?.number} · {paying?.company?.name} · {TZS(paying?.amount)}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="pay-date">{tr("Paid on")}</Label>
                                <Input id="pay-date" type="date" value={paidOn} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setPaidOn(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pay-ref">{tr("Payment reference")}{" "}<span className="font-normal text-slate-400">{tr("(optional)")}</span></Label>
                                <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={tr("e.g. bank or M-Pesa reference")} maxLength={120} />
                            </div>
                            <p className="text-xs text-slate-500">{tr("The invoice changes from proforma to paid, and the company sees it as paid.")}</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPaying(null)}>{tr("Cancel")}</Button>
                            <Button type="submit" disabled={!paidOn || payMutation.isPending} className="bg-[#242a37] text-white hover:bg-[#1a1f2a]">
                                {payMutation.isPending ? tr("Saving…") : tr("Mark as paid")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{tr("Choose months")}</DialogTitle>
                        <DialogDescription>{tr("See and prepare invoices for several months at once. Parcels already on another invoice are never billed again.")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        {([[tr("From"), rangeFrom, setRangeFrom], [tr("To"), rangeTo, setRangeTo]] as const).map(([label, value, set]) => (
                            <div key={label} className="space-y-1.5">
                                <Label>{label}</Label>
                                <Select value={value} onValueChange={set}>
                                    <SelectTrigger className="h-10 w-full text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {MONTHS.map((m) => <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                    {rangeFrom > rangeTo && <p className="text-xs text-rose-600">{tr("The first month must come before the last one.")}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRangeOpen(false)}>{tr("Cancel")}</Button>
                        <Button disabled={rangeFrom > rangeTo} onClick={() => { setMonth(rangeFrom === rangeTo ? rangeFrom : `${rangeFrom}..${rangeTo}`); setRangeOpen(false) }}
                            className="bg-[#ffd428] font-semibold text-[#242a37] hover:bg-[#ffdb4d]">{tr("Show these months")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {canManage && <PrepareDialog month={month} monthLabel={month === "all" ? "All time" : monthLabel} open={preparing} onOpenChange={setPreparing} onDone={invalidate} />}
        </div>
    )
}

const STATUS_NAME: Record<string, string> = { RECEIVED: "Received", DISPATCHED: "Dispatched", OFFLOADED: "Offloaded", PICKED_UP: "Picked up", DELIVERED: "Delivered" }

function CompanyDetail({ month, monthLabel, companyId, selected, onToggle, onBack }: {
    month: string; monthLabel: string; companyId: number; selected: boolean; onToggle: () => void; onBack: () => void
}) {
    const tr = useTr()
    const q = useQuery({ queryKey: ["invoice-preview-company", month, companyId], queryFn: () => previewCompanyInvoice(month, companyId) })
    const d = q.data
    const maxDay = Math.max(1, ...(d?.byDay ?? []).map((x) => x.parcels))
    const perMonth = d?.grouping === "month"
    const bucketLabel = (key: string, long = false) => format(new Date(perMonth ? `${key}-15T12:00:00` : `${key}T12:00:00`), perMonth ? (long ? "MMMM yyyy" : "MMM yyyy") : long ? "EEE d MMM" : "d MMM")
    const statusTotal = (d?.byStatus ?? []).reduce((s, x) => s + x.parcels, 0)

    return (
        <div className="space-y-6">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#242a37] hover:underline underline-offset-4 dark:text-white">
                <ChevronLeft className="size-4" aria-hidden />{" "}{tr("All companies")}</button>
            {q.isPending ? (
                <>
                    <Skeleton className="h-32 rounded-[var(--ds-radius-large)]" />
                    <ListSkeleton rows={5} />
                </>
            ) : q.isError || !d ? (
                <SheetSection title={tr("Company")}>
                    <SheetEmpty title={tr("Couldn't load this company's details")} description={tr("If this keeps happening, the server may not have the latest update yet.")} />
                </SheetSection>
            ) : (
                <>
                    {/* Headline */}
                    <div className="rounded-[var(--ds-radius-large)] bg-[#242a37] p-6 text-white shadow-[var(--ds-shadow-raised)]">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-white/50">{d.company.name} · {monthLabel}</p>
                                <p className="mt-2 text-3xl font-bold leading-tight tabular-nums text-[#ffd428]">{TZS(d.amount)}</p>
                                <p className="mt-2 text-xs text-white/50">{tr("{parcels} parcels × {TZS}", { parcels: d.parcels.toLocaleString(), TZS: TZS(d.ratePerParcel) })}</p>
                            </div>
                            {d.billable && (!d.existing || d.existing.status !== "PAID") && (
                                <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                                    <input type="checkbox" checked={selected} onChange={onToggle} className="size-4 accent-[#ffd428]" />{tr("Include")}</label>
                            )}
                        </div>
                        {d.existing && (
                            <p className="mt-4 rounded-[var(--ds-radius-small)] bg-white/10 px-3 py-2 text-xs">
                                {d.existing.status === "PAID"
                                    ? tr("Invoice {number} is already paid, so it won't change.", { number: d.existing.number })
                                    : tr("Proforma {number} exists for {TZS}; preparing again updates it to {TZS2}.", { number: d.existing.number, TZS: TZS(d.existing.amount), TZS2: TZS(d.amount) })}
                            </p>
                        )}
                        {!d.billable && (
                            <p className="mt-4 rounded-[var(--ds-radius-small)] bg-white/10 px-3 py-2 text-xs">
                                {d.reason === "commission" ? tr("Not billed: this company has commission set for its agents, so it pays through commission.") : tr("No parcels booked in {monthLabel}.", { monthLabel })}
                            </p>
                        )}
                    </div>

                    <StatGrid columns={3} tiles={[
                        { label: tr("Parcels billed"), value: d.parcels.toLocaleString(), hint: d.cancelled ? `${d.cancelled.toLocaleString()} cancelled not billed` : "None cancelled" },
                        { label: tr("Agents booking"), value: d.agents.length.toLocaleString(), hint: tr("of {agentCount} registered", { agentCount: d.agentCount.toLocaleString() }) },
                        { label: perMonth ? "Busiest month" : "Busiest day", value: d.byDay.length ? Math.max(...d.byDay.map((x) => x.parcels)).toLocaleString() : "—", hint: d.byDay.length ? bucketLabel([...d.byDay].sort((a, b) => b.parcels - a.parcels)[0].date, true) : "No bookings" },
                    ]} />

                    <SheetSection title={tr("Bill to")}>
                        <DetailList rows={[
                            { label: tr("Company"), value: d.company.name },
                            { label: "TIN", value: d.company.tin || "—", mono: true },
                            { label: tr("Address"), value: d.company.address || "—" },
                            { label: tr("Phone"), value: d.company.phoneNumber || "—", mono: true },
                            { label: tr("Email"), value: d.company.email || "—" },
                            { label: tr("Owner"), value: d.company.owner ? `${d.company.owner.fullName} · ${d.company.owner.phoneNumber}` : "No owner account" },
                        ]} />
                    </SheetSection>

                    {d.byDay.length > 0 && (
                        <SheetSection title={tr("Parcels per {day} · {monthLabel}", { day: perMonth ? "month" : "day", monthLabel })}>
                            <div className="flex h-28 items-end gap-[3px] px-5 pb-3 pt-5" role="img" aria-label={tr("Parcels per {day} in {monthLabel}, busiest day {parcels}", { day: perMonth ? "month" : "day", monthLabel, parcels: Math.max(...d.byDay.map((x) => x.parcels)) })}>
                                {d.byDay.map((x) => (
                                    <div key={x.date} title={`${bucketLabel(x.date)}: ${x.parcels}`} className="flex-1 rounded-t bg-[#ffd428]" style={{ height: `${Math.max(4, (x.parcels / maxDay) * 100)}%` }} />
                                ))}
                            </div>
                        </SheetSection>
                    )}

                    {d.byStatus.length > 0 && (
                        <SheetSection title={tr("Where the parcels are now")}>
                            <ul className="space-y-3 px-5 py-4">
                                {d.byStatus.sort((a, b) => b.parcels - a.parcels).map((x) => (
                                    <li key={x.status}>
                                        <div className="flex justify-between text-xs"><span className="font-semibold">{STATUS_NAME[x.status] ?? x.status}</span><span className="tabular-nums text-slate-500">{x.parcels.toLocaleString()}</span></div>
                                        <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-[#242a37] dark:bg-[#ffd428]" style={{ width: `${(x.parcels / Math.max(1, statusTotal)) * 100}%` }} /></div>
                                    </li>
                                ))}
                            </ul>
                        </SheetSection>
                    )}

                    <SheetSection title={tr("Agents · {agents}", { agents: d.agents.length.toLocaleString() })}>
                        {d.agents.length === 0 ? <SheetEmpty title={tr("No agent booked parcels this month")} /> : (
                            <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                {d.agents.map((a, i) => (
                                    <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 text-slate-500 dark:bg-white/5")}>{i + 1}</span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{a.fullName}</p>
                                                <p className="text-xs text-slate-500">{tr("{phoneNumber} · last booked {MMM}", { phoneNumber: a.phoneNumber, MMM: format(new Date(a.last), "d MMM") })}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-bold tabular-nums">{a.parcels.toLocaleString()}</p>
                                            <p className="text-[11px] text-slate-400">{TZS(a.parcels * d.ratePerParcel)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SheetSection>
                </>
            )}
        </div>
    )
}

interface AllTimeProgress {
    status: "idle" | "loading" | "done" | "error"
    /** Using the single all-time query (no per-month progress) */
    single: boolean
    months: string[]
    done: string[]
    rows: InvoicePreviewRow[]
    rate: number
}
const EMPTY_ALL_TIME: AllTimeProgress = { status: "idle", single: false, months: [], done: [], rows: [], rate: 150 }

// One chip per month: ticked once that month has been checked
function MonthProgress({ months, done, finished }: { months: string[]; done: string[]; finished: boolean }) {
    const tr = useTr()
    const doneSet = new Set(done)
    const pct = months.length ? Math.round((done.length / months.length) * 100) : 0
    return (
        <div className="rounded-[var(--ds-radius-large)] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">
                    {finished ? tr("Checked all {monthsCount} months", { monthsCount: months.length }) : tr("Checking month {min} of {monthsCount}…", { min: Math.min(done.length + 1, months.length), monthsCount: months.length })}
                </p>
                <span className="text-xs font-semibold tabular-nums text-slate-500">{pct}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={tr("Months checked")}>
                <div className="h-full rounded-full bg-[#ffd428] transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            {!finished && (
                <div className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                    {[...months].reverse().map((m) => {
                        const ok = doneSet.has(m)
                        return (
                            <span key={m} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                                ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-400 dark:bg-white/5")}>
                                {ok ? <CheckCircle2 className="size-3" aria-hidden /> : <span className="size-1.5 animate-pulse rounded-full bg-slate-300" aria-hidden />}
                                {format(new Date(`${m}-01T12:00:00`), "MMM yyyy")}
                            </span>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function PrepareDialog({ month, monthLabel, open, onOpenChange, onDone }: { month: string; monthLabel: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
    const tr = useTr()
    const { toast } = useToast()
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [detailId, setDetailId] = useState<number | null>(null)
    // All time and month ranges are worked out month by month (one invoice per company)
    const range = monthRange(month)
    const allTime = month === "all" || !!range
    const monthQuery = useQuery({ queryKey: ["invoice-preview", month], queryFn: () => previewInvoices(month), enabled: open && !allTime })

    // All time is worked out month by month so progress can be shown; falls back
    // to the single (slow) all-time query when the API has no range endpoint yet
    const [all, setAll] = useState<AllTimeProgress>(EMPTY_ALL_TIME)
    const [allRun, setAllRun] = useState(0)
    useEffect(() => {
        if (!open || !allTime) return
        const signal = { cancelled: false }
        setAll({ ...EMPTY_ALL_TIME, status: "loading" })
        ;(async () => {
            try {
                // A range needs no lookup: it starts at its first month
                const { firstMonth } = range ? { firstMonth: range[0] } : await getInvoiceRange().catch(() => ({ firstMonth: null }))
                if (signal.cancelled) return
                if (!firstMonth) {
                    setAll((p) => ({ ...p, status: "loading", single: true }))
                    const res = await previewInvoices("all")
                    if (!signal.cancelled) setAll({ ...EMPTY_ALL_TIME, status: "done", rows: res.data, rate: res.ratePerParcel })
                    return
                }
                const res = await previewAllTimeByMonth(firstMonth, (p) => setAll((prev) => ({ ...prev, months: p.months, done: p.done, rows: p.rows, rate: p.ratePerParcel })), signal, range?.[1])
                if (!signal.cancelled) setAll((prev) => ({ ...prev, status: "done", rows: res.data, rate: res.ratePerParcel }))
            } catch {
                if (!signal.cancelled) setAll((prev) => ({ ...prev, status: "error" }))
            }
        })()
        return () => { signal.cancelled = true }
    }, [open, allTime, allRun, month])

    const loadingAll = allTime && all.status === "loading"
    const rows = allTime ? all.rows : monthQuery.data?.data ?? []
    const rate = (allTime ? all.rate : monthQuery.data?.ratePerParcel) ?? 150
    const isPending = allTime ? all.status === "idle" || (loadingAll && (all.single || all.months.length === 0)) : monthQuery.isPending
    const isError = allTime ? all.status === "error" : monthQuery.isError
    const selectable = rows.filter((r) => r.existingStatus !== "PAID")

    // Every unpaid company starts selected; companies that turn up while months
    // are still loading are added without undoing what the user unticked
    const seen = useRef<Set<number>>(new Set())
    useEffect(() => {
        if (!open) { setDetailId(null); setSearch(""); seen.current = new Set(); setSelected(new Set()); return }
        const fresh = selectable.filter((r) => !seen.current.has(r.companyId))
        if (!fresh.length) return
        for (const r of fresh) seen.current.add(r.companyId)
        setSelected((prev) => new Set([...prev, ...fresh.map((r) => r.companyId)]))
    }, [open, rows]) // eslint-disable-line react-hooks/exhaustive-deps

    const chosen = selectable.filter((r) => selected.has(r.companyId))
    const total = chosen.reduce((s, r) => s + r.amount, 0)
    const parcels = chosen.reduce((s, r) => s + r.parcels, 0)
    const counts = {
        create: chosen.filter((r) => !r.existingStatus).length,
        update: chosen.filter((r) => r.existingStatus === "PROFORMA").length,
        paid: rows.filter((r) => r.existingStatus === "PAID").length,
    }
    const shown = search.trim() ? rows.filter((r) => r.companyName.toLowerCase().includes(search.trim().toLowerCase())) : rows
    const allSelected = selectable.length > 0 && chosen.length === selectable.length
    const toggle = (id: number) => setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
    })
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.companyId)))

    // All-time invoices are created a few companies at a time, with progress
    const [creating, setCreating] = useState<{ done: number; total: number } | null>(null)
    const generate = useMutation({
        mutationFn: async () => {
            const ids = chosen.map((r) => r.companyId)
            if (!allTime) return generateInvoices(month, ids)
            const totals = { created: 0, updated: 0, skippedPaid: 0 }
            setCreating({ done: 0, total: ids.length })
            try {
                for (let i = 0; i < ids.length; i += 5) {
                    const r = await generateInvoices(month, ids.slice(i, i + 5))
                    totals.created += r?.created ?? 0
                    totals.updated += r?.updated ?? 0
                    totals.skippedPaid += r?.skippedPaid ?? 0
                    setCreating({ done: Math.min(i + 5, ids.length), total: ids.length })
                }
            } finally {
                setCreating(null)
            }
            return totals
        },
        onSuccess: (r) => {
            toast({
                title: tr("Invoices ready"),
                description: tr("{created} new, {updated} updated{v}.", { created: r.created, updated: r.updated, v: r.skippedPaid ? `, ${r.skippedPaid} already paid left as they were` : "" }),
            })
            onDone()
            onOpenChange(false)
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't prepare the invoices"), description: e?.message }),
    })
    const current = month === MONTHS[0].value
    const ACTION: Record<string, { label: string; style: string }> = {
        create: { label: "NEW", style: "bg-[#ffd428] text-[#242a37]" },
        update: { label: "UPDATE", style: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]" },
        paid: { label: "PAID", style: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
    }
    const detailRow = rows.find((r) => r.companyId === detailId)

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="[&>button]:hidden flex h-full w-full flex-col overflow-hidden border-l p-0 outline-none sm:max-w-[640px] bg-white dark:bg-[#0f1117]">
                <SheetTitle className="sr-only">{tr("Prepare invoices for {monthLabel}", { monthLabel })}</SheetTitle>
                <SheetDescription className="sr-only">{tr("Pick the companies to bill, check their details, then create proforma invoices.")}</SheetDescription>

                {/* Header — agent-sheet design */}
                <div className="shrink-0 bg-[#242a37] p-5 pt-6 text-white sm:p-8 sm:pt-10">
                    <div className="mb-6 flex items-start justify-between gap-3 sm:mb-8">
                        <div className="flex size-14 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428]">
                            <Icon icon={Invoice01Icon} size={28} className="text-[#242a37]" />
                        </div>
                        <Button variant="ghost" onClick={() => onOpenChange(false)} aria-label={tr("Close")}
                            className="flex size-9 items-center justify-center rounded-full bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white">
                            <XIcon className="size-4" />
                        </Button>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                        <div className="min-w-0">
                            <h2 className="truncate text-2xl font-bold leading-none">{detailRow ? detailRow.companyName : tr("Prepare invoices")}</h2>
                            <p className="mt-2 text-xs font-semibold text-white/50">
                                {monthLabel} <span className="text-white/20">•</span> {TZS(rate)}{" "}{tr("per parcel · companies without commission")}</p>
                        </div>
                        <Badge className="h-7 shrink-0 rounded-[var(--ds-radius-large)] border-none bg-white/10 px-3 text-xs font-semibold text-[#ffd428]">PROFORMA</Badge>
                    </div>
                </div>

                {/* Body */}
                <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                    {detailId !== null ? (
                        <CompanyDetail month={month} monthLabel={monthLabel} companyId={detailId} selected={selected.has(detailId)} onToggle={() => toggle(detailId)} onBack={() => setDetailId(null)} />
                    ) : (
                        <>
                            {allTime && (
                                <p className="rounded-[var(--ds-radius-large)] border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                                    {range
                                        ? tr("Bills every parcel in {monthLabel} that no invoice covers yet, one invoice per company. Parcels already on a monthly or earlier invoice are never billed again.", { monthLabel })
                                        : tr("Bills every parcel up to now that no invoice covers yet, one invoice per company. Parcels already on a monthly or earlier all-time invoice are never billed again.")}
                                </p>
                            )}
                            {current && (
                                <p className="rounded-[var(--ds-radius-large)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                    {tr("{monthLabel} isn't over yet. You can prepare invoices now and again later to update the counts; paid invoices never change.", { monthLabel })}</p>
                            )}

                            {allTime && all.months.length > 0 && !all.single && (
                                <MonthProgress months={all.months} done={all.done} finished={all.status === "done"} />
                            )}
                            {allTime && all.single && loadingAll && (
                                <p className="rounded-[var(--ds-radius-large)] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{tr("Working out everything not invoiced yet. This takes a while for all time; you can keep this open.")}</p>
                            )}

                            {isPending ? (
                                <>
                                    <Skeleton className="h-32 rounded-[var(--ds-radius-large)]" />
                                    <ListSkeleton rows={5} />
                                </>
                            ) : isError ? (
                                <SheetSection title={tr("Companies to bill")}>
                                    <SheetEmpty title={tr("Couldn't work out the invoices")} description={tr("If this keeps happening, the server may not have the latest update yet.")} />
                                    {allTime && <div className="px-5 pb-5"><Button variant="outline" onClick={() => setAllRun((n) => n + 1)}>{tr("Try again")}</Button></div>}
                                </SheetSection>
                            ) : (
                                <>
                                    {/* Headline amount on its own row so it's never cut short */}
                                    <div className="rounded-[var(--ds-radius-large)] bg-[#242a37] p-6 text-white shadow-[var(--ds-shadow-raised)]">
                                        <p className="text-xs font-semibold text-white/50">{tr("Selected to bill · {monthLabel}", { monthLabel })}</p>
                                        <p className="mt-2 text-3xl font-bold leading-tight tabular-nums text-[#ffd428] sm:text-4xl">{TZS(total)}</p>
                                        <p className="mt-2 text-xs text-white/50">{tr("{chosen} of {selectable} companies · {parcels} parcels × {TZS}", { chosen: chosen.length.toLocaleString(), selectable: selectable.length.toLocaleString(), parcels: parcels.toLocaleString(), TZS: TZS(rate) })}</p>
                                    </div>
                                    <StatGrid columns={2} tiles={[
                                        { label: tr("Parcels"), value: parcels.toLocaleString(), hint: tr("From the selected companies") },
                                        { label: tr("Invoices"), value: `${counts.create} new`, hint: tr("{update} to update · {paid} already paid", { update: counts.update, paid: counts.paid }) },
                                    ]} />

                                    <SheetSection
                                        title={tr("Companies to bill · {rows}", { rows: rows.length.toLocaleString() })}
                                        action={rows.length > 6 ? (
                                            <div className="relative w-44">
                                                <Icon icon={Search01Icon} size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Find a company")} aria-label={tr("Find a company")} className="h-8 pl-8 text-xs" />
                                            </div>
                                        ) : undefined}
                                    >
                                        {rows.length === 0 && loadingAll ? (
                                            <SheetEmpty title={tr("Looking for companies to bill…")} description={tr("Companies appear here as each month is checked.")} />
                                        ) : rows.length === 0 ? (
                                            <SheetEmpty title={tr("Nothing to bill")} description={allTime ? tr("Every parcel is on an invoice already, or its company has commission set for its agents.") : tr("Every company with bookings in {monthLabel} has commission set for its agents.", { monthLabel })} />
                                        ) : (
                                            <>
                                                {selectable.length > 0 && (
                                                    <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-600 dark:border-white/5 dark:text-slate-300">
                                                        <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = chosen.length > 0 && !allSelected }} onChange={toggleAll} className="size-4 accent-[#242a37]" />
                                                        {allSelected ? tr("Deselect all") : tr("Select all")} · {chosen.length}{" "}{tr("selected")}</label>
                                                )}
                                                {shown.length === 0 ? <SheetEmpty title={tr("No company matches")} /> : (
                                                    <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                                        {shown.map((r) => {
                                                            const paid = r.existingStatus === "PAID"
                                                            const action = ACTION[paid ? "paid" : r.existingStatus === "PROFORMA" ? "update" : "create"]
                                                            const on = selected.has(r.companyId)
                                                            return (
                                                                <li key={r.companyId} className={cn("flex items-center gap-3 px-5 py-3.5", !on && !paid && "bg-slate-50/60 dark:bg-white/[0.02]")}>
                                                                    <input type="checkbox" checked={on && !paid} disabled={paid} onChange={() => toggle(r.companyId)}
                                                                        aria-label={tr("Include {companyName}", { companyName: r.companyName })} className="size-4 shrink-0 accent-[#242a37] disabled:opacity-30" />
                                                                    <button type="button" onClick={() => setDetailId(r.companyId)}
                                                                        className="group flex min-w-0 flex-1 items-center justify-between gap-4 rounded-[var(--ds-radius-small)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#242a37]">
                                                                        <div className={cn("min-w-0", paid && "opacity-60")}>
                                                                            <p className="truncate text-sm font-semibold text-[#242a37] group-hover:underline underline-offset-4 dark:text-white">{r.companyName}</p>
                                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                                {r.parcels.toLocaleString()}{" "}{tr("parcels ×")}{" "}{TZS(rate)}
                                                                                {allTime && r.since ? tr(" · since {yyyy}", { yyyy: format(new Date(r.since), "d MMM yyyy") }) : ""}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex shrink-0 items-center gap-3">
                                                                            <span className={cn("text-sm font-bold tabular-nums", on || paid ? "text-[#242a37] dark:text-white" : "text-slate-400 line-through")}>{TZS(r.amount)}</span>
                                                                            <Badge className={cn("h-6 w-16 justify-center rounded-[var(--ds-radius-small)] border-none text-[10px] font-bold", action.style)}>{action.label}</Badge>
                                                                            <ChevronRight className="size-4 text-slate-300 group-hover:text-[#242a37]" aria-hidden />
                                                                        </div>
                                                                    </button>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                )}
                                            </>
                                        )}
                                    </SheetSection>

                                    <SheetSection title={tr("What happens")}>
                                        <ul className="space-y-3 px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            <li><span className="font-semibold text-[#242a37] dark:text-white">{tr("New")}</span>{" "}{tr("companies get a proforma invoice for")}{" "}{month === "all" ? tr("everything not invoiced yet") : range ? tr("everything not invoiced yet in {monthLabel}", { monthLabel }) : monthLabel}.</li>
                                            <li><span className="font-semibold text-[#242a37] dark:text-white">{tr("Update")}</span>{" "}{tr("refreshes an unpaid proforma with the latest parcel count.")}</li>
                                            <li><span className="font-semibold text-[#242a37] dark:text-white">{tr("Paid")}</span>{" "}{tr("invoices are left exactly as they are. Unticked companies are skipped.")}</li>
                                        </ul>
                                    </SheetSection>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-8 dark:border-white/5 dark:bg-[#0f1117]">
                    <p className="text-xs text-slate-500">{chosen.length ? <>{tr("Prepares")}{" "}<span className="font-semibold text-[#242a37] dark:text-white">{chosen.length}</span> {chosen.length === 1 ? tr("invoice") : tr("invoices")} · {TZS(total)}</> : tr("No companies selected")}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>{tr("Cancel")}</Button>
                        <Button onClick={() => generate.mutate()} disabled={!chosen.length || generate.isPending || loadingAll} className="bg-[#ffd428] font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                            {creating ? tr("Creating {done} of {total}…", { done: creating.done, total: creating.total }) : generate.isPending ? tr("Preparing…") : loadingAll ? tr("Checking months…") : chosen.length === 1 ? tr("Create proforma invoice") : tr("Create proforma invoices")}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
