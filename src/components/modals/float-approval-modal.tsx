"use client"

import type React from "react"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    CurrencyExchangeIcon,
    OfficeIcon,
    UserIcon,
    CheckListIcon,
    Cancel01Icon,
    Tick01Icon,
    AlertCircleIcon,
    Property01Icon,
    Activity01Icon,
    InformationCircleIcon,
    Building03Icon,
    Wallet02Icon,
    CreditCardIcon,
    Message01Icon,
    SquareUnlock02Icon,
    Delete02Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface FloatApprovalModalProps {
    isOpen: boolean
    onClose: () => void
    float: any
}

export function FloatApprovalModal({ isOpen, onClose, float }: FloatApprovalModalProps) {
    const tr = useTr()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [action, setAction] = useState<"approve" | "reject" | null>(null)
    const [notes, setNotes] = useState("")

    if (!float) return null

    const handleSubmitLocal = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!action) {
            toast({
                title: tr("Not allowed"),
                description: tr("Choose Approve or Reject."),
                variant: "destructive",
            })
            return
        }

        try {
            setIsSubmitting(true)

            // Simulate API logic
            await new Promise((resolve) => setTimeout(resolve, 1000))

            toast({
                title: tr("Authorization {Revoked}", { Revoked: action === "approve" ? "Confirmed" : "Revoked" }),
                description: `Float request for ${float.recipient} has been ${action === "approve" ? "integrated into ledger" : "permanently cached as rejected"}.`,
            })

            handleClose()
        } catch (error) {
            toast({
                title: tr("Couldn't load transactions"),
                description: tr("Couldn't approve the allocation. Check the available float balance."),
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        onClose()
        setTimeout(() => {
            setAction(null)
            setNotes("")
        }, 300)
    }

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Review float allocation")}</SheetTitle>
                    <SheetDescription>{tr("Review and approve float allocations.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className={cn(
                    "relative overflow-hidden flex-shrink-0 transition-colors duration-300",
                    action === "approve" ? "bg-emerald-950" : action === "reject" ? "bg-rose-950" : "bg-[#242a37]"
                )}>
                    
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={action || 'default'}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10"
                        >
                            <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                    <Icon 
                                        icon={action === "approve" ? Tick01Icon : action === "reject" ? Delete02Icon : CurrencyExchangeIcon} 
                                        size={28} 
                                        className={cn(action === "approve" ? "text-emerald-400" : action === "reject" ? "text-rose-400" : "text-[#ffd428]")} 
                                    />
                                </div>
                                
                                <Button
                                    variant="ghost"
                                    onClick={handleClose}
                                    className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                                >
                                    <Icon icon={Cancel01Icon} size={18} />
                                </Button>
                            </div>

                            <div className="text-left text-white">
                                <h2 className="text-2xl font-bold leading-none m-0 p-0">
                                    {action === "approve" ? tr("Verify Allocation") : action === "reject" ? tr("Deny Request") : tr("Review Float")}
                                </h2>
                                <p className="text-white/50 text-xs font-semibold mt-2">
                                    {action ? tr("Approve allocation") : tr("Pending float request")}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <form onSubmit={handleSubmitLocal} className="p-8 space-y-8 text-left pb-32">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {/* Request Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                        <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                            <Icon icon={Activity01Icon} size={12} />
                                        </div>{tr("Request history")}</h3>
                                    <div className="bg-white dark:bg-[#1a1f2b] p-5 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-4">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">{tr("Reference")}</p>
                                            <p className="text-[14px] font-semibold font-mono text-[#242a37] dark:text-white">#{String(float.id).padStart(6, '0')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">{tr("Temporal Stamp")}</p>
                                            <p className="text-[12px] font-bold text-[#242a37] dark:text-white">{float.createdDate}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                        <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                            <Icon icon={UserIcon} size={12} />
                                        </div>{tr("Recipient")}</h3>
                                    <div className="bg-white dark:bg-[#1a1f2b] p-5 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex items-center gap-4">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] bg-[#ffd428]/10 flex items-center justify-center text-[#ffd428]">
                                            <Icon icon={float.recipientType === "company" ? Building03Icon : UserIcon} size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold text-[#242a37] dark:text-white leading-tight">{float.recipient}</p>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{float.recipientType}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Details */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                        <Icon icon={Wallet02Icon} size={12} />
                                    </div>{tr("Float settings")}</h3>
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="flex items-center justify-between py-4 border-b border-slate-50 dark:border-white/5">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 leading-none">{tr("Approved amount")}</p>
                                            <p className="text-[28px] font-semibold text-[#242a37] dark:text-white mt-1 tabular-nums">
                                                <span className="text-[14px] opacity-30 mr-1">TZS</span>
                                                {(float.floatAmount || float.amount).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-[var(--ds-radius-small)] text-right">
                                            <p className="text-xs font-semibold text-emerald-500">{tr("Calculated Basis")}</p>
                                            <p className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                {float.floatType === "commission" 
                                                    ? `TZS ${(float.commissionValue || float.amount).toLocaleString()}` 
                                                    : tr("{amount}% OF TOTAL", { amount: float.percentageValue || float.amount })
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5">
                                            <p className="text-xs font-semibold text-slate-400 mb-1">{tr("Request Principle")}</p>
                                            <p className="text-[13px] font-semibold text-[#242a37] dark:text-white tabular-nums">TZS {float.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5">
                                            <p className="text-xs font-semibold text-slate-400 mb-1">{tr("Status Bit")}</p>
                                            <Badge variant="outline" className={cn(
                                                "text-xs font-semibold rounded-[6px] border-none px-2",
                                                float.status === "pending" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                                            )}>
                                                {float.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {float.notes && (
                                        <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-[var(--ds-radius-large)] flex items-start gap-4">
                                            <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500">
                                                <Icon icon={Message01Icon} size={16} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400">{tr("Recipient Notes")}</h4>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed mt-1">"{float.notes}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Logic */}
                            <AnimatePresence>
                                {action && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                            <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                                <Icon icon={SquareUnlock02Icon} size={12} />
                                            </div>{tr("Compliance Annotation")}</h3>
                                        <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-4">
                                            <Label className="text-xs font-semibold text-slate-500 ml-1">
                                                {action === "approve" ? tr("Approval note") : tr("Rejection Logical Justification")}
                                                {action === "reject" && <span className="text-rose-500 ml-1 font-bold">*</span>}
                                            </Label>
                                            <Textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder={action === "approve" ? tr("ADD A NOTE (OPTIONAL)…") : tr("DESCRIBE COMPLIANCE VIOLATION OR REJECTION REASON...")}
                                                className="min-h-[120px] bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-large)] text-[13px] font-bold focus:ring-1 focus:ring-[#ffd428]/50 transition-all p-4 resize-none"
                                                required={action === "reject"}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!action && (
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setAction("reject")}
                                        className="h-20 rounded-[var(--ds-radius-large)] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-rose-500/30 transition-colors group flex flex-col items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <Icon icon={Delete02Icon} className="text-slate-400 group-hover:text-rose-500 transition-colors" size={24} />
                                        <span className="text-xs font-semibold text-slate-500 group-hover:text-rose-500 transition-colors">{tr("Deny Request")}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAction("approve")}
                                        className="h-20 rounded-[var(--ds-radius-large)] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500/30 transition-colors group flex flex-col items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <Icon icon={Tick01Icon} className="text-slate-400 group-hover:text-emerald-500 transition-colors" size={24} />
                                        <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-500 transition-colors">{tr("Authorize Float")}</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="p-8 bg-white dark:bg-[#0f1117] border-t border-slate-100 dark:border-white/5 flex items-center gap-4 flex-shrink-0 relative z-50">
                    {action ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => setAction(null)}
                                className="flex-1 h-14 rounded-[var(--ds-radius-large)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-[12px] transition-colors border-none"
                            >{tr("Back")}</Button>
                            <Button
                                onClick={handleSubmitLocal}
                                disabled={isSubmitting || (action === "reject" && !notes)}
                                className={cn(
                                    "flex-[2] h-14 rounded-[var(--ds-radius-large)] font-semibold text-[12px] shadow-[var(--ds-shadow-raised)] transition-all flex items-center justify-center gap-3 cursor-pointer border-none",
                                    action === "approve" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"
                                )}
                            >
                                {isSubmitting ? (
                                    <LoadingSpinner className="h-6 w-6 text-white" />
                                ) : (
                                    <>
                                        <Icon icon={action === "approve" ? Tick01Icon : Delete02Icon} size={24} />
                                        {action === "approve" ? tr("Disburse") : tr("Confirm Revocation")}
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={handleClose}
                            className="w-full h-14 rounded-[var(--ds-radius-large)] bg-slate-100 dark:bg-white/5 text-[#242a37] dark:text-white font-semibold text-[12px] border-none cursor-pointer"
                        >{tr("Exit Review")}</Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
