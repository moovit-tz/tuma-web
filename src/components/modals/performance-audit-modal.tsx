"use client"

import React, { useMemo } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Icon } from "@/components/ui/icon"
import { 
    Activity01Icon, 
    Cancel01Icon,
    CheckListIcon,
    AlertCircleIcon,
    Shield01Icon,
    Search01Icon
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTr } from "@/lib/i18n/portal"

interface PerformanceAuditModalProps {
    isOpen: boolean
    onClose: () => void
    country?: any | null
    parcels: any[]
}

export function PerformanceAuditModal({ isOpen, onClose, country, parcels }: PerformanceAuditModalProps) {
    const tr = useTr()
    if (!country) return null

    // Real Audit Logic based on Parcel Data
    const auditMetrics = useMemo(() => {
        const countryId = country.id
        const incoming = parcels.filter(p => p.destinationId === countryId)
        const outgoing = parcels.filter(p => p.originId === countryId)
        
        // Find unlinked parcels (e.g., origin matches country name but originId is missing/wrong)
        const countryName = country.name.toLowerCase()
        const unlinked = parcels.filter(p => {
            const matchesName = (p.origin?.name?.toLowerCase() === countryName || p.destination?.name?.toLowerCase() === countryName)
            if (!matchesName) return false
            const matchesId = (p.originId === countryId || p.destinationId === countryId)
            return !matchesId
        })

        return {
            incomingCount: incoming.length,
            outgoingCount: outgoing.length,
            unlinkedCount: unlinked.length,
            totalVolume: incoming.length + outgoing.length,
            accuracyScore: Math.max(0, 100 - (unlinked.length * 10))
        }
    }, [country, parcels])

    const auditSteps = [
        { 
            id: 1, 
            label: tr("Data Accuracy Check"), 
            status: "completed", 
            result: auditMetrics.accuracyScore > 90 ? "Excellent" : "Review" 
        },
        { 
            id: 2, 
            label: tr("Tracking updates"), 
            status: "completed", 
            result: auditMetrics.unlinkedCount === 0 ? "Synced" : `${auditMetrics.unlinkedCount} Issues`
        },
        { 
            id: 3, 
            label: tr("Parcel Volume Review"), 
            status: "processing", 
            result: `${auditMetrics.totalVolume} Total` 
        },
        { 
            id: 4, 
            label: tr("Route Validation"), 
            status: "pending", 
            result: "Queued" 
        }
    ]

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Check: {name}", { name: country.name })}</SheetTitle>
                    <SheetDescription>{tr("Reviewing data accuracy and parcel tracking status.")}</SheetDescription>
                </SheetHeader>

                <div className="bg-rose-600 p-5 pt-6 sm:p-8 sm:pt-10 text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center">
                                <Icon icon={CheckListIcon} size={28} className="text-white" />
                            </div>
                            <button onClick={onClose} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0">
                                <Icon icon={Cancel01Icon} size={18} />
                            </button>
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-bold m-0 leading-none">{tr("Health Check")}</h2>
                            <p className="text-white/60 font-bold text-xs mt-4">{tr("Review: {name}", { name: country.name })}</p>
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-10 pb-32">
                        {/* Audit Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center gap-6 shadow-[var(--ds-shadow-raised)]">
                                <div className="size-16 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] flex items-center justify-center shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/10 text-rose-500">
                                    <Icon icon={Search01Icon} size={32} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-slate-400 mb-1.5 leading-none">{tr("Data Accuracy")}</p>
                                    <h4 className="text-3xl font-bold text-[#242a37] dark:text-white leading-none">{auditMetrics.accuracyScore}%</h4>
                                </div>
                            </div>
                            
                            <div className="p-8 rounded-[var(--ds-radius-large)] bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 leading-none">{tr("Refreshing…")}</p>
                                    <h4 className="text-xl font-semibold text-[#242a37] dark:text-white leading-none truncate">{tr("Live Status")}</h4>
                                </div>
                                <div className="size-10 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
                            </div>
                        </div>

                        {/* Territorial Volume Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-6 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 space-y-2 text-center">
                                <p className="text-xs font-semibold text-blue-500">{tr("Incoming")}</p>
                                <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none">{auditMetrics.incomingCount}</p>
                            </div>
                            <div className="p-6 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 space-y-2 text-center">
                                <p className="text-xs font-semibold text-emerald-500">{tr("Outgoing")}</p>
                                <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none">{auditMetrics.outgoingCount}</p>
                            </div>
                            <div className="p-6 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 space-y-2 text-center">
                                <p className="text-xs font-semibold text-rose-500">{tr("Unlinked")}</p>
                                <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none">{auditMetrics.unlinkedCount}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-slate-400 ml-1">{tr("Checks")}</p>
                            <div className="space-y-3">
                                {auditSteps.map((step) => (
                                    <div key={step.id} className="flex items-center justify-between p-6 rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group bg-white dark:bg-transparent shadow-[var(--ds-shadow-raised)]">
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center transition-transform",
                                                step.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : 
                                                step.status === "processing" ? "bg-amber-500/10 text-amber-500 animate-pulse" : 
                                                "bg-slate-100 dark:bg-white/5 text-slate-400"
                                            )}>
                                                <Icon icon={step.status === "completed" ? CheckListIcon : Activity01Icon} size={20} />
                                            </div>
                                            <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">{step.label}</span>
                                        </div>
                                        <div className={cn(
                                            "text-xs font-semibold px-4 py-1.5 rounded-full border",
                                            step.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                            step.status === "processing" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                            "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent"
                                        )}>
                                            {step.result}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {auditMetrics.unlinkedCount > 0 && (
                            <div className="p-8 rounded-[var(--ds-radius-large)] bg-amber-500/5 border border-amber-500/10 flex items-start gap-6 shadow-[var(--ds-shadow-raised)]">
                                <div className="size-12 rounded-[var(--ds-radius-large)] bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0">
                                    <Icon icon={AlertCircleIcon} size={24} />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[14px] font-semibold text-amber-600 dark:text-amber-500">{tr("Mapping Errors Found")}</p>
                                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
                                        {tr("We found **{unlinkedCount} parcels** that are written for {name} but aren't properly linked to this specific country record. We recommend updating these parcel records to ensure accurate reporting.", { unlinkedCount: auditMetrics.unlinkedCount, name: country.name })}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
