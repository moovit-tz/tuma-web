"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createBeneficiary, updateBeneficiary } from "@/lib/services/beneficiary"
import type { Beneficiary } from "@/types/beneficiary"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    UserGroupIcon,
    MoneyReceive01Icon,
    Chart01Icon,
    UserIcon,
    Calendar03Icon,
    InformationCircleIcon,
    Cancel01Icon,
    Tick01Icon,
    Dollar01Icon,
    Clock01Icon,
    Delete02Icon,
    Settings01Icon,
    Activity01Icon,
    PackageIcon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface BeneficiaryModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    beneficiary?: Beneficiary | null
}

const TABS = [
    { id: 'details', label: 'Details', icon: UserIcon },
    { id: 'collections', label: 'Collections', icon: MoneyReceive01Icon },
    { id: 'summary', label: 'Summary', icon: Chart01Icon },
    { id: 'assignees', label: 'Assignees', icon: UserGroupIcon },
]

export function BeneficiaryModal({ isOpen, onClose, onSuccess, beneficiary }: BeneficiaryModalProps) {
    const tr = useTr()
    const isEditing = !!beneficiary
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState('details')

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        deductionAmount: "",
        deductionFrequency: "MONTHLY" as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
        startDate: "",
        endDate: "",
    })

    useEffect(() => {
        if (beneficiary) {
            const formatDateForInput = (isoDate: string) => {
                if (!isoDate) return ""
                const date = new Date(isoDate)
                return date.toISOString().split("T")[0]
            }

            setFormData({
                name: beneficiary.name || "",
                description: beneficiary.description || "",
                deductionAmount: beneficiary.deduction_amount ? beneficiary.deduction_amount.toString() : "",
                deductionFrequency: beneficiary.deduction_frequency || "MONTHLY",
                startDate: beneficiary.start_date ? formatDateForInput(beneficiary.start_date) : "",
                endDate: beneficiary.end_date ? formatDateForInput(beneficiary.end_date) : "",
            })
        } else {
            setFormData({
                name: "",
                description: "",
                deductionAmount: "",
                deductionFrequency: "MONTHLY",
                startDate: "",
                endDate: "",
            })
        }
        setActiveTab('details')
    }, [beneficiary, isOpen])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value,
        })
    }

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast({
                title: tr("Validation Error"),
                description: tr("Beneficiary name is required."),
                variant: "destructive",
            })
            return
        }

        if (!formData.deductionAmount || Number(formData.deductionAmount) <= 0) {
            toast({
                title: tr("Validation Error"),
                description: tr("Deduction amount must be greater than 0."),
                variant: "destructive",
            })
            return
        }

        if (!formData.startDate) {
            toast({
                title: tr("Validation Error"),
                description: tr("Start date is required."),
                variant: "destructive",
            })
            return
        }

        if (formData.endDate) {
            const start = new Date(formData.startDate)
            const end = new Date(formData.endDate)

            start.setHours(0, 0, 0, 0)
            end.setHours(0, 0, 0, 0)

            if (end <= start) {
                toast({
                    title: tr("Validation Error"),
                    description: tr("End date must be after start date."),
                    variant: "destructive",
                })
                return
            }
        }

        setIsSubmitting(true)

        try {
            const payload = {
                name: formData.name,
                description: formData.description || undefined,
                deductionAmount: Number(formData.deductionAmount),
                deductionFrequency: formData.deductionFrequency,
                startDate: formData.startDate,
                endDate: formData.endDate || undefined,
            }

            if (isEditing && beneficiary) {
                await updateBeneficiary(beneficiary.id, payload)
                toast({
                    title: tr("Success"),
                    description: tr("{name} has been updated successfully", { name: formData.name }),
                })
            } else {
                await createBeneficiary(payload)
                toast({
                    title: tr("Success"),
                    description: tr("{name} has been created successfully", { name: formData.name }),
                })
            }

            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Error submitting beneficiary:", error)
            toast({
                title: tr("Error"),
                description: error.message || `Failed to ${isEditing ? "update" : "create"} beneficiary`,
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{isEditing ? tr("Edit Beneficiary") : tr("Add Beneficiary")}</SheetTitle>
                    <SheetDescription>{tr("Configure financial dependency and deduction parameters.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={MoneyReceive01Icon} size={28} className="text-[#ffd428]" />
                            </div>
                            
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                            >
                                <Icon icon={Cancel01Icon} size={18} />
                            </Button>
                        </div>

                        <div className="text-left">
                            <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">
                                {isEditing ? tr("Edit Beneficiary") : tr("Add Beneficiary")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {isEditing ? tr("Registry ID: #{padStart}", { padStart: String(beneficiary.id).padStart(4, '0') }) : tr("Add beneficiary")}
                            </p>
                        </div>
                    </div>

                    {isEditing && (
                        <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto custom-scrollbar">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    className={cn(
                                        "-mb-px px-2 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428]",
                                        activeTab === tab.id
                                            ? "text-white border-[#ffd428]"
                                            : "text-white/60 hover:text-white hover:border-white/30 border-transparent"
                                    )}
                                >
                                    <Icon icon={tab.icon} className="size-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="p-8 space-y-8"
                        >
                            {activeTab === 'details' && (
                                <div className="space-y-8">
                                    {/* Basic Info */}
                                    <div className="space-y-4 text-left">
                                        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                            <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                <Icon icon={UserIcon} size={12} />
                                            </div>{tr("Profile")}</h3>
                                        
                                        <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500">{tr("Legal name")}</Label>
                                                <div className="relative group">
                                                    <Input
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        placeholder={tr("e.g. Workers Union")}
                                                        className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold placeholder:text-slate-400 focus:border-[#ffd428]/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500">{tr("Description")}</Label>
                                                <div className="relative group">
                                                    <Textarea
                                                        name="description"
                                                        value={formData.description}
                                                        onChange={handleChange}
                                                        placeholder={tr("Briefly describe the purpose of this beneficiary...")}
                                                        rows={3}
                                                        className="relative bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[12px] font-bold placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)] resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Config */}
                                    <div className="space-y-4 text-left">
                                        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                            <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                <Icon icon={Dollar01Icon} size={12} />
                                            </div>{tr("Deduction Mechanisms")}</h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500">{tr("Unit Amount (TZS)")}</Label>
                                                <div className="relative group">
                                                    <div className="relative h-12 flex items-center">
                                                        <div className="absolute left-4 text-emerald-500"><Icon icon={Dollar01Icon} size={18} /></div>
                                                        <Input
                                                            name="deductionAmount"
                                                            type="number"
                                                            value={formData.deductionAmount}
                                                            onChange={handleChange}
                                                            placeholder="0.00"
                                                            className="h-full pl-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[15px] font-semibold tabular-nums focus:border-emerald-500/50 focus:ring-0 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500">{tr("Billing frequency")}</Label>
                                                <select
                                                    name="deductionFrequency"
                                                    value={formData.deductionFrequency}
                                                    onChange={handleChange}
                                                    className="w-full h-10 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] px-4 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                >
                                                    <option value="DAILY">{tr("DAILY CYCLE")}</option>
                                                    <option value="WEEKLY">{tr("WEEKLY CYCLE")}</option>
                                                    <option value="MONTHLY">{tr("MONTHLY CYCLE")}</option>
                                                    <option value="YEARLY">{tr("YEARLY CYCLE")}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="space-y-4 text-left">
                                        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                            <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                <Icon icon={Calendar03Icon} size={12} />
                                            </div>{tr("Deduction Lifecycle")}</h3>
                                        
                                        <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-500">{tr("Activation Date")}</Label>
                                                    <Input
                                                        name="startDate"
                                                        type="date"
                                                        value={formData.startDate}
                                                        onChange={handleChange}
                                                        className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:ring-1 focus:ring-blue-500/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-500">{tr("Termination Date")}</Label>
                                                    <Input
                                                        name="endDate"
                                                        type="date"
                                                        value={formData.endDate}
                                                        onChange={handleChange}
                                                        className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:ring-1 focus:ring-rose-500/50"
                                                    />
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-[var(--ds-radius-small)] bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                                                <Icon icon={Clock01Icon} size={16} className="text-blue-500" />
                                                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-none">{tr("Leave end date empty for perpetual deductions.")}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'collections' && (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
                                    <div className="size-20 rounded-[25px] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-center mb-8">
                                        <Icon icon={MoneyReceive01Icon} size={32} className="text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-2">{tr("Historical Collections")}</h3>
                                    <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[280px]">{tr("Statistical data and transaction logs will materialize once collection cycles initiate.")}</p>
                                </div>
                            )}

                            {activeTab === 'assignees' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center ml-1">
                                        <div className="text-left">
                                            <h4 className="text-[14px] font-semibold text-[#242a37] dark:text-white">{tr("Active Contributors")}</h4>
                                            <p className="text-xs font-bold text-slate-400 mt-1">{tr("Agents with automatic deductions")}</p>
                                        </div>
                                        <Button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[var(--ds-radius-large)] font-semibold text-xs transition-colors flex items-center gap-2 border-none shadow-[var(--ds-shadow-raised)]">
                                            <Icon icon={UserGroupIcon} size={18} />{tr("Enrol Workforce")}</Button>
                                    </div>

                                    <div className="py-24 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-large)] flex flex-col items-center justify-center text-center">
                                        <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                            <Icon icon={UserGroupIcon} size={28} className="text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-2">{tr("Nothing here yet")}</h4>
                                        <p className="text-xs font-bold text-slate-400 mb-8 max-w-[240px]">{tr("No employees are currently contributing to this beneficiary fund.")}</p>
                                        <Button variant="outline" className="h-10 px-6 border-slate-200 dark:border-white/10 rounded-full font-semibold text-xs hover:bg-[#ffd428] hover:text-[#242a37] hover:border-[#ffd428] transition-colors">{tr("Create account")}</Button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Summaries / etc can go here if needed, but keeping it concise for now */}
                            {activeTab === 'summary' && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="size-20 rounded-[25px] bg-[#ffd428]/10 flex items-center justify-center mb-8">
                                        <Icon icon={Chart01Icon} size={32} className="text-[#ffd428]" />
                                    </div>
                                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-2">{tr("Performance Metrics")}</h3>
                                    <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[280px]">{tr("Long-term trends will appear here.")}</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── Footer ── */}
                <div className="p-8 bg-white dark:bg-[#0f1117] border-t border-slate-100 dark:border-white/5 flex items-center gap-4 flex-shrink-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-[var(--ds-radius-small)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-xs transition-colors border-none"
                    >{tr("Cancel")}</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                        {isSubmitting ? (
                            <LoadingSpinner className="h-5 w-5 text-[#242a37]" />
                        ) : (
                            <>
                                <Icon icon={Tick01Icon} size={20} />
                                {isEditing ? tr("Save changes") : tr("Add beneficiary")}
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}