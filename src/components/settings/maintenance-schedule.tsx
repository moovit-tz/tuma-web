"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addHours, differenceInMinutes, format, formatDistanceToNow } from "date-fns"
import { CalendarClock, Plus, Smartphone, Server, Database, Wrench, Megaphone, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner } from "@/components/ui/table-banner"
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
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { getMaintenanceSchedule, scheduleMaintenance, cancelMaintenanceWindow, type MaintenanceType, type MaintenanceWindow } from "@/lib/services/platform"
import { useTr } from "@/lib/i18n/portal"

const TYPES: { value: MaintenanceType; label: string; icon: any; message: string }[] = [
    { value: "APP_UPDATE", label: "App update", icon: Smartphone, message: "We're updating the MySafari app. Please update when prompted; we'll be back shortly." },
    { value: "SERVER_UPDATE", label: "Server update", icon: Server, message: "MySafari is being updated to make it faster and more reliable. We'll be back shortly." },
    { value: "DATABASE", label: "Database work", icon: Database, message: "MySafari is undergoing database maintenance. Your parcels and float are safe; we'll be back shortly." },
    { value: "OTHER", label: "Other", icon: Wrench, message: "MySafari is undergoing scheduled maintenance. We'll be back shortly." },
]
const STATE_STYLE: Record<string, string> = {
    active: "bg-amber-400 text-[#242a37]",
    upcoming: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    done: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}
const STATE_LABEL: Record<string, string> = { active: "RUNNING", upcoming: "SCHEDULED", done: "COMPLETED", cancelled: "CANCELLED" }
const local = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")
const duration = (a: string, b: string) => {
    const m = differenceInMinutes(new Date(b), new Date(a))
    return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`
}

export function MaintenanceSchedule() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { data = [], isPending, isError, refetch } = useQuery({ queryKey: ["maintenance-schedule"], queryFn: getMaintenanceSchedule, refetchInterval: 60_000 })
    const [creating, setCreating] = useState(false)
    const [cancelling, setCancelling] = useState<MaintenanceWindow | null>(null)
    const [showPast, setShowPast] = useState(false)

    const start = addHours(new Date(), 24)
    start.setMinutes(0, 0, 0)
    const [form, setForm] = useState({ title: "", type: "SERVER_UPDATE" as MaintenanceType, startsAt: local(start), endsAt: local(addHours(start, 1)), message: TYPES[1].message, announce: true })

    const current = data.filter((w) => w.state === "active" || w.state === "upcoming").sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    const past = data.filter((w) => w.state === "done" || w.state === "cancelled")
    const shown = showPast ? [...current, ...past] : current

    const errors = useMemo(() => {
        const s = new Date(form.startsAt)
        const e = new Date(form.endsAt)
        if (!form.title.trim()) return "Give it a title."
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "Check the start and end times."
        if (s <= new Date()) return "The start time must be in the future."
        if (e <= s) return "The end time must be after the start."
        if (+e - +s > 72 * 3600_000) return "A window can last at most 72 hours."
        return null
    }, [form])

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["maintenance-schedule"] })
        queryClient.invalidateQueries({ queryKey: ["maintenance"] })
    }
    const create = useMutation({
        mutationFn: () => scheduleMaintenance({ ...form, title: form.title.trim(), startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), message: form.message.trim() || null }),
        onSuccess: (w) => {
            toast({ title: tr("Maintenance scheduled"), description: `${w.title}, ${format(new Date(w.startsAt), "d MMM, HH:mm")}` })
            setCreating(false)
            invalidate()
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't schedule it"), description: e?.message }),
    })
    const cancel = useMutation({
        mutationFn: (w: MaintenanceWindow) => cancelMaintenanceWindow(w.id),
        onSuccess: (_, w) => {
            toast({ title: w.state === "active" ? "Maintenance ended" : "Maintenance cancelled", description: w.title })
            setCancelling(null)
            invalidate()
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't cancel it"), description: e?.message }),
    })

    const pickType = (t: MaintenanceType) => {
        const prevDefault = TYPES.find((x) => x.value === form.type)?.message
        setForm({ ...form, type: t, message: !form.message.trim() || form.message === prevDefault ? TYPES.find((x) => x.value === t)!.message : form.message })
    }

    return (
        <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
            <TableBanner title={tr("Scheduled Maintenance")} description={tr("Plan updates ahead: maintenance turns on and off by itself")} icon="reports" actions={
                <Button size="sm" onClick={() => setCreating(true)} className="bg-[#ffd428] font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                    <Plus className="mr-1 size-4" />{" "}{tr("Schedule maintenance")}</Button>
            } />
            {isPending ? <ListSkeleton rows={3} /> : isError ? (
                <div className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load the schedule")}</p>
                    <Button variant="outline" className="mt-4" onClick={() => refetch()}>{tr("Try again")}</Button>
                </div>
            ) : shown.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                    <CalendarClock className="size-10 text-slate-300" aria-hidden />
                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Nothing scheduled")}</p>
                    <p className="max-w-sm text-sm text-slate-500">{tr("Schedule app or server updates so the apps pause at the right time and come back by themselves.")}</p>
                </div>
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                    {shown.map((w) => {
                        const T = TYPES.find((t) => t.value === w.type) ?? TYPES[3]
                        return (
                            <li key={w.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)]", w.state === "active" ? "bg-amber-400 text-[#242a37]" : "bg-[#242a37] text-[#FFD428]")}>
                                    <T.icon className="size-5" aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-[#242a37] dark:text-white">{w.title}</p>
                                        <Badge className={cn("h-6 rounded-[var(--ds-radius-small)] border-none px-2 text-[11px] font-semibold", STATE_STYLE[w.state ?? "upcoming"])}>{STATE_LABEL[w.state ?? "upcoming"]}</Badge>
                                        {w.announce && w.state === "upcoming" && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Megaphone className="size-3" aria-hidden />{" "}{tr("Announced in the apps")}</span>}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                        {format(new Date(w.startsAt), "EEE d MMM, HH:mm")} → {format(new Date(w.endsAt), new Date(w.startsAt).toDateString() === new Date(w.endsAt).toDateString() ? "HH:mm" : "EEE d MMM, HH:mm")}
                                        <span className="text-slate-400"> · {duration(w.startsAt, w.endsAt)} · {T.label}</span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {w.state === "upcoming" ? tr("Starts {v}", { v: formatDistanceToNow(new Date(w.startsAt), { addSuffix: true }) }) : w.state === "active" ? tr("Ends {true}", { true: formatDistanceToNow(new Date(w.endsAt), { addSuffix: true }) }) : w.state === "cancelled" ? tr("Cancelled") : tr("Finished")}
                                        {w.message ? ` · "${w.message}"` : ""}
                                    </p>
                                </div>
                                {(w.state === "upcoming" || w.state === "active") && (
                                    <Button variant="outline" size="sm" onClick={() => setCancelling(w)} className={w.state === "active" ? "border-amber-400 text-amber-700 hover:bg-amber-50" : "text-rose-600 hover:text-rose-700"}>
                                        <XIcon className="mr-1 size-4" /> {w.state === "active" ? tr("End now") : tr("Cancel")}
                                    </Button>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
            {past.length > 0 && (
                <div className="border-t border-slate-100 px-6 py-3 dark:border-white/5">
                    <button type="button" onClick={() => setShowPast((v) => !v)} className="text-xs font-semibold text-slate-500 hover:text-[#242a37] dark:hover:text-white">
                        {showPast ? tr("Hide past maintenance") : tr("Show past maintenance ({pastCount})", { pastCount: past.length })}
                    </button>
                </div>
            )}

            {/* ── Schedule dialog ── */}
            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={(e) => { e.preventDefault(); if (!errors) create.mutate() }}>
                        <DialogHeader>
                            <DialogTitle>{tr("Schedule maintenance")}</DialogTitle>
                            <DialogDescription>{tr("Maintenance mode turns on at the start time and off at the end time by itself.")}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <fieldset>
                                <legend className="mb-2 text-sm font-medium">{tr("Type")}</legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {TYPES.map((t) => (
                                        <button key={t.value} type="button" onClick={() => pickType(t.value)} aria-pressed={form.type === t.value}
                                            className={cn("flex items-center gap-2.5 rounded-[var(--ds-radius-small)] border px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#242a37]",
                                                form.type === t.value ? "border-[#242a37] bg-[#242a37] text-white" : "border-slate-200 hover:border-[#242a37]/40 dark:border-white/10")}>
                                            <t.icon className={cn("size-4", form.type === t.value ? "text-[#FFD428]" : "text-slate-400")} aria-hidden /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            <div className="space-y-2">
                                <Label htmlFor="mw-title">{tr("Title")}</Label>
                                <Input id="mw-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={tr("e.g. Agent app 2.5 release")} maxLength={80} autoFocus />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="mw-start">{tr("Starts")}</Label>
                                    <Input id="mw-start" type="datetime-local" value={form.startsAt} min={local(new Date())}
                                        onChange={(e) => {
                                            const s = new Date(e.target.value)
                                            const keep = +new Date(form.endsAt) - +new Date(form.startsAt)
                                            setForm({ ...form, startsAt: e.target.value, endsAt: Number.isNaN(s.getTime()) ? form.endsAt : local(new Date(+s + (keep > 0 ? keep : 3600_000))) })
                                        }} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mw-end">{tr("Ends")}</Label>
                                    <Input id="mw-end" type="datetime-local" value={form.endsAt} min={form.startsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                                </div>
                            </div>
                            {!errors && <p className="-mt-2 text-xs text-slate-500">{tr("Lasts")}{" "}{duration(new Date(form.startsAt).toISOString(), new Date(form.endsAt).toISOString())}.</p>}
                            <div className="space-y-2">
                                <Label htmlFor="mw-message">{tr("Message people see")}</Label>
                                <Textarea id="mw-message" rows={3} maxLength={280} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <Label htmlFor="mw-announce" className="flex-col items-start gap-1">
                                    <span>{tr("Announce in the apps beforehand")}</span>
                                    <span className="text-xs font-normal text-slate-500">{tr("Apps can warn agents during the 7 days before it starts.")}</span>
                                </Label>
                                <Switch id="mw-announce" checked={form.announce} onCheckedChange={(v) => setForm({ ...form, announce: !!v })} className="data-[state=checked]:bg-[#242a37] dark:data-[state=checked]:bg-[#ffd428]" />
                            </div>
                            {errors && form.title && <p className="text-xs text-rose-600" role="alert">{errors}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreating(false)}>{tr("Cancel")}</Button>
                            <Button type="submit" disabled={!!errors || create.isPending} className="bg-[#242a37] text-white hover:bg-[#1a1f2a]">
                                {create.isPending ? tr("Scheduling…") : tr("Schedule")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{cancelling?.state === "active" ? tr("End this maintenance now?") : tr("Cancel this maintenance?")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {cancelling?.state === "active" ? tr("\"{title}\" stops now and the apps work again straight away.", { title: cancelling?.title }) : tr("\"{title}\" won't run.", { title: cancelling?.title })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Keep it")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); cancelling && cancel.mutate(cancelling) }} disabled={cancel.isPending}>
                            {cancel.isPending ? tr("Saving…") : cancelling?.state === "active" ? tr("End now") : tr("Cancel maintenance")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
