"use client"
import { Icon } from "@/components/ui/icon"
import { useAccess } from "@/hooks/use-access"

import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { differenceInCalendarDays } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
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
import { cn } from "@/lib/utils"
import {
    UserAccountIcon,
    Shield01Icon,
    ViewIcon,
    ViewOffIcon,
    Copy01Icon,
    Cancel01Icon,
    Call02Icon,
    Mail01Icon,
    Calendar03Icon,
    Building03Icon,
    Package01Icon,
    Clock01Icon,
} from "@hugeicons/core-free-icons"
import { resetOwnerPassword } from "@/lib/services/user"
import { AccountActions } from "@/components/sheets/account-actions"
import { AccountPermissionsPanel } from "@/components/sheets/account-permissions"
import type { User } from "@/types/user"
import type { CompanyActivity } from "@/lib/services/parcel"
import { useTr } from "@/lib/i18n/portal"

interface OwnerViewModalProps {
    isOpen: boolean
    onClose: () => void
    owner: User | null
    /** Resolved by the Owners page (company lookup already loaded there) */
    companyName: string
    /** All-time activity of the owner's company; undefined while loading */
    activity?: CompanyActivity
    isActivityLoading?: boolean
    /** Company parcels in the page's selected period */
    periodParcels?: number
    periodLabel: string
}

const formatDate = (value?: string | null) =>
    value
        ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—"

/**
 * Bus owner profile. Owners are admin-table accounts, so this sheet must not
 * reuse the agent profile queries (they look up users-table ids).
 */
export function OwnerViewModal({
    isOpen,
    onClose,
    owner,
    companyName,
    activity,
    isActivityLoading,
    periodParcels,
    periodLabel,
}: OwnerViewModalProps) {
    const tr = useTr()
    const { toast } = useToast()
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [tempPassword, setTempPassword] = useState<string | null>(null)
    const [tempPasswordExpiresAt, setTempPasswordExpiresAt] = useState<string | null>(null)
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    // Reset needs the owners.reset_password permission (Admin, and Operations by default)
    const { can } = useAccess()
    const canReset = can("owners.reset_password")

    // Never carry a revealed password over to another owner or a reopened sheet
    useEffect(() => {
        setTempPassword(null)
        setTempPasswordExpiresAt(null)
        setIsPasswordVisible(false)
    }, [owner?.id, isOpen])

    const resetMutation = useMutation({
        mutationFn: (adminId: number) => resetOwnerPassword(adminId),
        onSuccess: (result: any) => {
            const pin = result?.temporaryPassword ?? null
            setTempPassword(pin)
            setTempPasswordExpiresAt(result?.otpExpiresAt ?? null)
            setIsPasswordVisible(false)
            toast({
                title: tr("Password reset"),
                description: pin
                    ? "A temporary password was sent by SMS — it's also shown below."
                    : "The password was reset and a temporary one sent by SMS.",
            })
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: tr("Couldn't reset password"),
                description: error.message || "Please try again.",
            })
        },
    })

    const copyPassword = async () => {
        if (!tempPassword) return
        try {
            await navigator.clipboard.writeText(tempPassword)
            toast({ title: tr("Copied"), description: tr("Temporary password copied.") })
        } catch {
            toast({ variant: "destructive", title: tr("Copy failed"), description: tr("Select the password and copy it manually.") })
        }
    }

    if (!owner) return null

    const lastParcel = activity?.lastActivityDate ?? null
    const quietDays = lastParcel ? Math.max(0, differenceInCalendarDays(new Date(), new Date(lastParcel))) : null

    const contactRows = [
        { label: tr("Phone"), value: owner.phoneNumber || "—", icon: Call02Icon },
        { label: tr("Email"), value: owner.email || "—", icon: Mail01Icon },
        { label: tr("Joined"), value: formatDate(owner.createdAt), icon: Calendar03Icon },
    ]

    const companyStats = [
        { label: tr("Parcels (all time)"), value: activity ? activity.totalParcels.toLocaleString() : null, icon: Package01Icon },
        { label: tr("Parcels · {periodLabel}", { periodLabel }), value: periodParcels === undefined ? null : periodParcels.toLocaleString(), icon: Package01Icon },
        {
            label: tr("Last parcel"),
            value: activity ? (lastParcel ? `${formatDate(lastParcel)}${quietDays ? ` · ${quietDays}d ago` : " · today"}` : "None yet") : null,
            icon: Clock01Icon,
        },
    ]

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent side="right" className="w-[95vw] sm:max-w-[560px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetHeader className="sr-only">
                        <SheetTitle>{tr("Owner profile")}</SheetTitle>
                        <SheetDescription>{tr("Contact details, company activity and password reset for this owner.")}</SheetDescription>
                    </SheetHeader>

                    {/* ── Header ── */}
                    <div className="bg-[#242a37] text-white flex-shrink-0 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-[#ffd428] flex items-center justify-center">
                                <Icon icon={UserAccountIcon} size={28} className="text-[#242a37]" />
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                {canReset && (
                                    <Button
                                        variant="outline"
                                        className="h-9 px-4 rounded-[var(--ds-radius-small)] bg-white/10 text-xs font-semibold text-[#ffd428] hover:text-[#ffd428] hover:bg-white/20 border-none"
                                        onClick={() => setShowResetConfirm(true)}
                                        disabled={resetMutation.isPending}
                                    >
                                        <Icon icon={Shield01Icon} className="mr-2 size-4" />{tr("Reset password")}</Button>
                                )}
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    aria-label={tr("Close")}
                                    className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center border-none text-white p-0"
                                >
                                    <Icon icon={Cancel01Icon} size={18} />
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                            <div className="min-w-0">
                                <h2 className="text-2xl font-bold leading-none text-white truncate">{owner.fullName}</h2>
                                <p className="text-white/50 text-xs font-semibold mt-2 truncate">{tr("Owner · @")}{owner.username || "—"}
                                </p>
                            </div>
                            <Badge className={cn(
                                "h-7 px-3 rounded-[var(--ds-radius-large)] text-xs font-semibold border-none shrink-0",
                                owner.isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
                            )}>
                                {owner.isActive ? "ACTIVE" : "INACTIVE"}
                            </Badge>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
                        {/* Contact */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold text-slate-400">{tr("Contact")}</h3>
                            <div className="rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                                {contactRows.map(row => (
                                    <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-4">
                                        <span className="flex items-center gap-3 text-sm text-slate-500">
                                            <Icon icon={row.icon} size={16} className="text-slate-400" />
                                            {row.label}
                                        </span>
                                        <span className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Company */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold text-slate-400">{tr("Company")}</h3>
                            <div className="rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-4 bg-slate-50/60 dark:bg-white/[0.02]">
                                    <Icon icon={Building03Icon} size={18} className="text-indigo-500" />
                                    <span className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{companyName}</span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {companyStats.map(stat => (
                                        <div key={stat.label} className="flex items-center justify-between gap-4 px-5 py-4">
                                            <span className="flex items-center gap-3 text-sm text-slate-500">
                                                <Icon icon={stat.icon} size={16} className="text-slate-400" />
                                                {stat.label}
                                            </span>
                                            {stat.value === null ? (
                                                isActivityLoading ? <Skeleton className="h-4 w-16" /> : <span className="text-sm text-slate-400">—</span>
                                            ) : (
                                                <span className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{stat.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Temporary password — staff who can reset (ADMIN/OPS) only */}
                        {canReset && (
                            <section className="space-y-3">
                                <h3 className="text-xs font-semibold text-slate-400">{tr("Temporary password")}</h3>
                                <div className="p-5 rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                                    {tempPassword ? (
                                        <>
                                            <div className="flex items-center justify-between gap-3">
                                                <p
                                                    className="font-mono text-lg font-semibold tabular-nums text-[#242a37] dark:text-white select-all"
                                                    aria-label={isPasswordVisible ? tr("Temporary password {tempPassword}", { tempPassword }) : tr("Temporary password hidden")}
                                                >
                                                    {isPasswordVisible ? tempPassword : "•".repeat(Math.max(tempPassword.length, 6))}
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => setIsPasswordVisible(v => !v)} aria-pressed={isPasswordVisible}>
                                                        <Icon icon={isPasswordVisible ? ViewOffIcon : ViewIcon} size={16} />
                                                        {isPasswordVisible ? tr("Hide") : tr("Show")}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={copyPassword}>
                                                        <Icon icon={Copy01Icon} size={16} />{tr("Copy")}</Button>
                                                </div>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-400">{tr("Sent to")}{" "}{owner.phoneNumber || tr("the owner")}{" "}{tr("by SMS")}{tempPasswordExpiresAt ? ` · valid until ${new Date(tempPasswordExpiresAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-semibold text-sm text-slate-500">{tr("No temporary password")}</p>
                                            <p className="mt-1 text-xs text-slate-400">{tr("Reset password signs the owner out and texts them a temporary 6-digit password.")}</p>
                                        </>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Activate / deactivate / delete (Admin only) */}
                        <AccountPermissionsPanel kind="staff" accountId={owner.id} />
                        <AccountActions kind="staff" account={owner} onDeleted={onClose} />
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <AlertDialogContent className="bg-white dark:bg-[#1a1f2b] border-none rounded-[var(--ds-radius-large)] p-8 shadow-[var(--ds-shadow-raised)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-rose-500">{tr("Reset password?")}</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-4">
                            <span className="text-[#242a37] dark:text-white font-semibold">{owner.fullName}</span>{" "}{tr("will be signed out and sent a temporary 6-digit password by SMS. Their current password stops working.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-10">
                        <AlertDialogCancel className="h-10 px-8 rounded-[var(--ds-radius-small)] text-xs font-semibold">{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                setShowResetConfirm(false)
                                resetMutation.mutate(owner.id)
                            }}
                            disabled={resetMutation.isPending}
                            className="h-10 px-8 rounded-[var(--ds-radius-large)] bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold"
                        >
                            {resetMutation.isPending ? tr("Resetting…") : tr("Reset password")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
