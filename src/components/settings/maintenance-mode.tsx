"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { Construction, ShieldCheck, Smartphone, Globe, CreditCard, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
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
import { getMaintenance, setMaintenance } from "@/lib/services/platform"
import { useTr } from "@/lib/i18n/portal"

const DEFAULT_MESSAGE = "MySafari is undergoing scheduled maintenance. We'll be back shortly."

export function MaintenanceMode() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { data, isPending, isError, refetch } = useQuery({ queryKey: ["maintenance"], queryFn: getMaintenance, refetchInterval: 60_000 })
    const [message, setMessage] = useState(DEFAULT_MESSAGE)
    const [until, setUntil] = useState("")
    const [confirm, setConfirm] = useState<"on" | "off" | null>(null)

    useEffect(() => {
        if (!data) return
        setMessage(data.message || DEFAULT_MESSAGE)
        setUntil(data.until ? format(new Date(data.until), "yyyy-MM-dd'T'HH:mm") : "")
    }, [data])

    const mutation = useMutation({
        mutationFn: (enabled: boolean) => setMaintenance({ enabled, message: message.trim() || DEFAULT_MESSAGE, until: until ? new Date(until).toISOString() : null }),
        onSuccess: (m) => {
            queryClient.setQueryData(["maintenance"], m)
            setConfirm(null)
            toast({ title: m.enabled ? "Maintenance mode is on" : "Maintenance mode is off", description: m.enabled ? "The apps now show your message." : "The apps are back to normal." })
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't change maintenance mode"), description: e?.message }),
    })

    if (isPending) return <Skeleton className="h-96 rounded-[var(--ds-radius-large)]" />
    if (isError || !data) {
        return (
            <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load maintenance mode")}</p>
                <p className="mt-1 text-sm text-slate-500">{tr("If this keeps happening, the server may not have the latest update yet.")}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>{tr("Try again")}</Button>
            </div>
        )
    }

    const on = data.enabled
    const untilInvalid = !!until && new Date(until) <= new Date()

    return (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
                <div className={cn("flex items-center justify-between gap-4 px-6 py-6", on ? "bg-amber-500 text-[#242a37]" : "bg-[#242a37] text-white")}>
                    <div className="flex items-center gap-3">
                        <span className={cn("flex size-11 items-center justify-center rounded-[var(--ds-radius-small)]", on ? "bg-[#242a37] text-amber-400" : "bg-[#FFD428] text-[#242a37]")}>
                            <Construction className="size-5" aria-hidden />
                        </span>
                        <div>
                            <h3 className="text-lg font-bold">
                                {on ? (data.source === "schedule" ? tr("Scheduled maintenance running: {title}", { title: data.activeWindow?.title }) : tr("Maintenance mode is on")) : tr("Maintenance mode is off")}
                            </h3>
                            <p className={cn("text-xs", on ? "text-[#242a37]/70" : "text-white/50")}>
                                {on
                                    ? data.until ? tr("Ends {v}", { v: formatDistanceToNow(new Date(data.until), { addSuffix: true }) }) : tr("Stays on until you switch it off")
                                    : data.nextWindow ? tr("Next scheduled: {title}, {v}", { title: data.nextWindow.title, v: formatDistanceToNow(new Date(data.nextWindow.startsAt), { addSuffix: true }) })
                                    : data.updatedAt ? tr("Last changed {v}", { v: formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true }) }) : tr("Everything is running normally")}
                            </p>
                        </div>
                    </div>
                    {data.source === "schedule" ? (
                        <p className="max-w-[12rem] text-right text-xs font-semibold">{tr("Ends by itself. Use End now in the schedule below to stop it early.")}</p>
                    ) : (
                    <Button onClick={() => setConfirm(on ? "off" : "on")} disabled={mutation.isPending || (!on && untilInvalid)}
                        className={cn("h-10 gap-2 px-5 font-semibold", on ? "bg-[#242a37] text-white hover:bg-[#1a1f2a]" : "bg-[#FFD428] text-[#242a37] hover:bg-[#ffdb4d]")}>
                        <Power className="size-4" aria-hidden /> {on ? tr("Switch off") : tr("Switch on")}
                    </Button>
                    )}
                </div>

                <div className="space-y-5 p-6">
                    <div className="space-y-2">
                        <Label htmlFor="m-message">{tr("Message people see")}</Label>
                        <Textarea id="m-message" rows={3} maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)} />
                        <p className="text-xs text-slate-500">{message.length}/280 · shown in the apps and on the website while it&apos;s on</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="m-until">{tr("Switch off automatically")}{" "}<span className="font-normal text-slate-400">{tr("(optional)")}</span></Label>
                        <Input id="m-until" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="sm:w-64" aria-invalid={untilInvalid} />
                        {untilInvalid && <p className="text-xs text-rose-600">{tr("Pick a time in the future.")}</p>}
                    </div>
                    {on && data.source === "manual" && (
                        <Button variant="outline" onClick={() => mutation.mutate(true)} disabled={mutation.isPending || untilInvalid}>
                            {mutation.isPending ? tr("Saving…") : tr("Update message and end time")}
                        </Button>
                    )}
                </div>
            </section>

            <section className="rounded-[var(--ds-radius-large)] border border-slate-100 bg-white p-6 shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
                <h3 className="text-sm font-bold text-[#242a37] dark:text-white">{tr("While it's on")}</h3>
                <ul className="mt-4 space-y-4 text-sm">
                    {[
                        { icon: Smartphone, title: tr("Agent apps pause"), text: "Agents see your message instead of booking, dispatching or delivering.", tone: "warn" },
                        { icon: Globe, title: tr("Website tracking pauses"), text: "Public parcel tracking shows the message.", tone: "warn" },
                        { icon: ShieldCheck, title: tr("The portal keeps working"), text: "Admin, operations and owner accounts can still sign in and use it.", tone: "ok" },
                        { icon: CreditCard, title: tr("Payments still arrive"), text: "Mobile money confirmations keep coming in, so no top-up is lost.", tone: "ok" },
                    ].map((r) => (
                        <li key={r.title} className="flex gap-3">
                            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)]", r.tone === "ok" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300")}>
                                <r.icon className="size-4" aria-hidden />
                            </span>
                            <div>
                                <p className="font-semibold text-[#242a37] dark:text-white">{r.title}</p>
                                <p className="text-xs text-slate-500">{r.text}</p>
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="mt-6 rounded-[var(--ds-radius-small)] border border-dashed border-slate-200 p-4 dark:border-white/10">
                    <p className="text-[11px] font-semibold text-slate-400">PREVIEW</p>
                    <p className="mt-1 text-sm text-[#242a37] dark:text-white">{message.trim() || DEFAULT_MESSAGE}</p>
                </div>
            </section>

            <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm === "on" ? tr("Switch maintenance mode on?") : tr("Switch maintenance mode off?")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm === "on"
                                ? tr("Every agent using the app is paused straight away and sees your message. The portal and payment confirmations keep working.")
                                : tr("Agents can use the app again straight away.")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); mutation.mutate(confirm === "on") }} disabled={mutation.isPending}
                            className={confirm === "on" ? "bg-amber-500 text-[#242a37] hover:bg-amber-400" : ""}>
                            {mutation.isPending ? tr("Saving…") : confirm === "on" ? tr("Switch on") : tr("Switch off")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
