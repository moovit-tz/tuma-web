"use client"
import { Icon } from "@/components/ui/icon"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { 
    UserGroupIcon,
    Money01Icon,
    Activity01Icon,
    Cancel01Icon,
    InformationCircleIcon,
    Shield01Icon,
    CheckListIcon,
    Tick01Icon,
    Calendar02Icon,
    Clock01Icon,
} from "@hugeicons/core-free-icons"
import { getMyBeneficiaries } from "@/lib/services/beneficiary"
import type { Beneficiary } from "@/types/beneficiary"
import { motion, AnimatePresence } from "framer-motion"
import { ListSkeleton } from "@/components/ui/skeletons"
import { useTr } from "@/lib/i18n/portal"

interface BeneficiaryAssignmentTabProps {
    userId: number | null
    isEditMode: boolean
    onBeneficiariesChange?: (beneficiaryIds: number[]) => void
}

export function BeneficiaryAssignmentTab({ userId, isEditMode, onBeneficiariesChange }: BeneficiaryAssignmentTabProps) {
    const tr = useTr()
    const [assignedBeneficiaries, setAssignedBeneficiaries] = useState<number[]>([])

    const { data: availableBeneficiaries = [], isLoading: isLoadingAvailable } = useQuery({
        queryKey: ["available-beneficiaries"],
        queryFn: async () => {
            const response = await getMyBeneficiaries({ paginate: false })
            return response.data || []
        },
    })

    const { data: assignedBeneficiariesData = [] } = useQuery({
        queryKey: ["user-assigned-beneficiaries", userId],
        queryFn: async () => {
            if (!userId) return []
            const response = await getMyBeneficiaries({ userId, paginate: false })
            return response.data || []
        },
        enabled: isEditMode && !!userId,
    })

    useEffect(() => {
        if (isEditMode && assignedBeneficiariesData && userId) {
            setAssignedBeneficiaries(assignedBeneficiariesData.map((b: Beneficiary) => b.id))
        }
    }, [assignedBeneficiariesData, userId, isEditMode])

    useEffect(() => {
        onBeneficiariesChange?.(assignedBeneficiaries)
    }, [assignedBeneficiaries, onBeneficiariesChange])

    const handleBeneficiaryToggle = (id: number) => {
        setAssignedBeneficiaries(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", minimumFractionDigits: 0 }).format(val)
    const formatDate = (ds: string) => new Date(ds).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

    const assignedList = availableBeneficiaries.filter((b: Beneficiary) => assignedBeneficiaries.includes(b.id))
    const totalCommitment = assignedList.reduce((sum: number, b: Beneficiary) => sum + Number(b.deduction_amount), 0)

    return (
        <div className="space-y-10">
            {/* Tactical Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: tr("Synced_Nodes"), val: assignedBeneficiaries.length, icon: UserGroupIcon, color: "text-blue-500" },
                    { label: tr("Active_Diversion"), val: assignedList.filter(b => b.status === "ACTIVE").length, icon: Activity01Icon, color: "text-emerald-500" },
                    { label: tr("Monthly_Yield"), val: formatCurrency(totalCommitment), icon: Money01Icon, color: "text-[#ffd428]" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                        <div className="flex items-center gap-3 mb-2">
                            <Icon icon={stat.icon} size={14} className="text-slate-300" />
                            <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
                        </div>
                        <p className={cn("text-lg font-semibold", stat.color)}>{stat.val}</p>
                    </div>
                ))}
            </div>

            {/* Main Configuration Matrix */}
            <Card className="rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] p-0 overflow-hidden shadow-[var(--ds-shadow-raised)]">
                <div className="p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-[var(--ds-radius-small)] bg-indigo-500/10 flex items-center justify-center">
                            <Icon icon={CheckListIcon} size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold">{tr("Commission split")}</h4>
                            <p className="text-xs font-semibold text-slate-400">{tr("Choose who receives a share of this agent's commission")}</p>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    {isLoadingAvailable ? (
                        <ListSkeleton rows={4} />
                    ) : availableBeneficiaries.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <Icon icon={InformationCircleIcon} size={48} className="mx-auto text-slate-200 dark:text-white/5" />
                            <p className="text-xs font-semibold text-slate-400">{tr("No beneficiaries yet.")}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-white/[0.01]">
                                    <TableRow className="border-slate-50 dark:border-white/[0.05]">
                                        <TableHead className="w-20 text-center text-xs font-semibold">{tr("Map")}</TableHead>
                                        <TableHead className="text-xs font-semibold">{tr("Beneficiary")}</TableHead>
                                        <TableHead className="text-xs font-semibold">{tr("Diversion Value")}</TableHead>
                                        <TableHead className="text-xs font-semibold">{tr("Frequency")}</TableHead>
                                        <TableHead className="text-xs font-semibold">{tr("Status")}</TableHead>
                                        <TableHead className="text-xs font-semibold">{tr("Scope")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {availableBeneficiaries.map((b: Beneficiary) => {
                                        const isAssigned = assignedBeneficiaries.includes(b.id)
                                        return (
                                            <TableRow key={b.id} className={cn("group border-slate-50 dark:border-white/[0.05] transition-colors", isAssigned ? "bg-[#ffd428]/5 dark:bg-[#ffd428]/[0.02]" : "hover:bg-slate-50 dark:hover:bg-white/[0.01]")}>
                                                <TableCell className="text-center">
                                                    <div 
                                                        onClick={() => handleBeneficiaryToggle(b.id)}
                                                        className={cn(
                                                            "size-6 rounded-[6px] border-2 mx-auto flex items-center justify-center cursor-pointer transition-all",
                                                            isAssigned ? "bg-[#ffd428] border-[#ffd428]" : "border-slate-200 dark:border-white/10 group-hover:border-slate-400"
                                                        )}
                                                    >
                                                        {isAssigned && <Icon icon={Tick01Icon} size={14} className="text-slate-900" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-[var(--ds-radius-small)] bg-slate-100 dark:bg-white/5 flex items-center justify-center font-semibold text-slate-400 text-xs transition-transform">
                                                            {b.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{b.name}</p>
                                                            <p className="text-xs font-bold text-slate-400 truncate max-w-[150px]">{b.description || "NO_MISSION_INTEL"}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{formatCurrency(b.deduction_amount)}</TableCell>
                                                <TableCell>
                                                    <Badge className="text-xs font-semibold border-none bg-blue-500/10 text-blue-400 px-3">{b.deduction_frequency}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("text-xs font-semibold border-none px-3", b.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-400")}>
                                                        {b.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-4 text-xs font-semibold">
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <Icon icon={Calendar02Icon} size={12} />
                                                            <span>{formatDate(b.start_date).split(",")[0]}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-300">
                                                            <Icon icon={Clock01Icon} size={12} />
                                                            <span>{b.end_date ? formatDate(b.end_date).split(",")[0] : tr("Overall")}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </Card>

            <div className="bg-slate-900 rounded-[var(--ds-radius-large)] p-8 border border-white/5 border-dashed flex items-center gap-6">
                <div className="size-12 rounded-[var(--ds-radius-large)] bg-indigo-500/10 flex items-center justify-center">
                    <Icon icon={Shield01Icon} className="size-6 text-indigo-400" />
                </div>
                <p className="text-xs font-bold text-slate-400 leading-relaxed flex-1">{tr("The commission split applies automatically to every transaction while it's active. Check the beneficiaries before saving.")}</p>
            </div>
        </div>
    )
}