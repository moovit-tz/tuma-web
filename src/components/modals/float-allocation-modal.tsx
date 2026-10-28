"use client"

import type React from "react"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    CurrencyExchangeIcon,
    OfficeIcon,
    UserIcon,
    Search01Icon,
    Cancel01Icon,
    Tick01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Building03Icon,
    Property01Icon,
    Settings03Icon,
    Wallet02Icon,
    CommissionIcon,
    PercentageSettingIcon,
    InformationCircleIcon,
    CheckListIcon,
    Add01Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface FloatAllocationModalProps {
    isOpen: boolean
    onClose: () => void
}

export function FloatAllocationModal({ isOpen, onClose }: FloatAllocationModalProps) {
    const tr = useTr()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState({
        recipientType: "company",
        recipient: "",
        selectedRecipients: [] as { id: number; name: string }[],
        floatType: "commission",
        commissionValue: "",
        percentageValue: "",
        floatAmount: "",
        notes: "",
    })
    const [searchQuery, setSearchQuery] = useState("")

    // Mock data
    const companies = [
        { id: 1, name: "HashTech Tanzania" },
        { id: 2, name: "Savanna Express" },
        { id: 3, name: "Kilimanjaro Travels" },
        { id: 4, name: "Serengeti Logistics" },
        { id: 5, name: "Victoria Shipping" },
    ]

    const agents = [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Smith" },
        { id: 3, name: "Robert Johnson" },
        { id: 4, name: "Alice Brown" },
    ]

    const handleRecipientTypeChange = (type: "company" | "agent") => {
        setFormData({
            ...formData,
            recipientType: type,
            selectedRecipients: [],
            recipient: "",
        })
        setSearchQuery("")
    }

    const addRecipient = (recipient: { id: number; name: string }) => {
        if (formData.selectedRecipients.some((r) => r.id === recipient.id)) return
        setFormData({
            ...formData,
            selectedRecipients: [...formData.selectedRecipients, recipient],
        })
    }

    const removeRecipient = (id: number) => {
        setFormData({
            ...formData,
            selectedRecipients: formData.selectedRecipients.filter((r) => r.id !== id),
        })
    }

    const filteredRecipients =
        formData.recipientType === "company"
            ? companies.filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : agents.filter((a) => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const validateStep = (step: number) => {
        switch (step) {
            case 1:
                if (formData.selectedRecipients.length === 0) {
                    toast({
                        title: tr("Selection Required"),
                        description: tr("Select at least one agent to allocate float to."),
                        variant: "destructive",
                    })
                    return false
                }
                return true
            case 2:
                if (formData.floatType === "commission" && !formData.commissionValue) {
                    toast({
                        title: tr("Incomplete Parameters"),
                        description: tr("Commission value is required for this logic type."),
                        variant: "destructive",
                    })
                    return false
                }
                if (formData.floatType === "percentage" && (!formData.percentageValue || Number(formData.percentageValue) > 100)) {
                    toast({
                        title: tr("Parameter Error"),
                        description: tr("Percentage must be defined between 0 and 100."),
                        variant: "destructive",
                    })
                    return false
                }
                return true
            default: return true
        }
    }

    const handleSubmitLocal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.floatAmount) {
            toast({
                title: tr("No capital set"),
                description: tr("Enter an amount."),
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            toast({
                title: tr("Float allocation started"),
                description: tr("Disbursement of TZS {Number} queued for approval.", { Number: Number(formData.floatAmount).toLocaleString() }),
            })
            handleClose()
        } catch (error) {
            toast({
                title: tr("Gateway Fault"),
                description: tr("Couldn't submit the allocation. Please try again."),
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        onClose()
        setTimeout(() => {
            setCurrentStep(1)
            setFormData({
                recipientType: "company",
                recipient: "",
                selectedRecipients: [],
                floatType: "commission",
                commissionValue: "",
                percentageValue: "",
                floatAmount: "",
                notes: "",
            })
        }, 300)
    }

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Float allocation")}</SheetTitle>
                    <SheetDescription>{tr("Allocate float to agents in a few steps.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden font-semibold text-[#ffd428] text-xl">
                                S{currentStep}
                            </div>
                            
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                            >
                                <Icon icon={Cancel01Icon} size={18} />
                            </Button>
                        </div>

                        <div className="text-left">
                            <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">
                                {currentStep === 1 ? tr("Target Selection") : currentStep === 2 ? tr("Logic Config") : tr("Finalize Allocation")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {tr("Stage {currentStep} of 3", { currentStep })}</p>
                        </div>
                    </div>
                </div>

                {/* ── Progress Bar ── */}
                <div className="h-1 w-full bg-slate-100 dark:bg-white/5 relative overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / 3) * 100}%` }}
                        className="absolute inset-y-0 left-0 bg-[#ffd428]"
                    />
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <form onSubmit={handleSubmitLocal} className="p-8 space-y-8 text-left pb-32">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                {currentStep === 1 && (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                                    <Icon icon={Property01Icon} size={12} />
                                                </div>{tr("Type")}</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRecipientTypeChange("company")}
                                                    className={cn(
                                                        "h-20 rounded-[var(--ds-radius-large)] border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                                                        formData.recipientType === "company" 
                                                            ? "bg-[#ffd428]/10 border-[#ffd428] text-[#242a37] dark:text-[#ffd428]" 
                                                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 opacity-60"
                                                    )}
                                                >
                                                    <Icon icon={Building03Icon} size={24} />
                                                    <span className="text-xs font-semibold">{tr("Company")}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRecipientTypeChange("agent")}
                                                    className={cn(
                                                        "h-20 rounded-[var(--ds-radius-large)] border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                                                        formData.recipientType === "agent" 
                                                            ? "bg-[#ffd428]/10 border-[#ffd428] text-[#242a37] dark:text-[#ffd428]" 
                                                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 opacity-60"
                                                    )}
                                                >
                                                    <Icon icon={UserIcon} size={24} />
                                                    <span className="text-xs font-semibold">{tr("Operator Profile")}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                                    <Icon icon={CheckListIcon} size={12} />
                                                </div>{tr("Identification")}</h3>
                                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                                                        <Icon icon={Search01Icon} size={18} />
                                                    </div>
                                                    <Input
                                                        placeholder={tr("SEARCH {recipientType} REGISTRY...", { recipientType: formData.recipientType.toUpperCase() })}
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="h-12 pl-12 bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold"
                                                    />
                                                </div>

                                                <div className="max-h-[280px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                                    {filteredRecipients.map((r) => {
                                                        const isSelected = formData.selectedRecipients.some(sr => sr.id === r.id);
                                                        return (
                                                            <button
                                                                key={r.id}
                                                                type="button"
                                                                onClick={() => isSelected ? removeRecipient(r.id) : addRecipient(r)}
                                                                className={cn(
                                                                    "w-full p-4 rounded-[var(--ds-radius-large)] flex items-center justify-between transition-all border border-transparent cursor-pointer",
                                                                    isSelected 
                                                                        ? "bg-[#ffd428] text-[#242a37]" 
                                                                        : "bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[#242a37] dark:text-white"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <Icon icon={formData.recipientType === "company" ? Building03Icon : UserIcon} size={18} />
                                                                    <span className="text-[12px] font-semibold">{r.name}</span>
                                                                </div>
                                                                {isSelected && <Icon icon={Tick01Icon} size={18} />}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {formData.selectedRecipients.length > 0 && (
                                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[var(--ds-radius-large)] flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                        <Icon icon={Tick01Icon} size={16} />
                                                    </div>
                                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formData.selectedRecipients.length}  SELECTED
                                                    </p>
                                                </div>
                                                <div className="flex -space-x-2">
                                                    {formData.selectedRecipients.slice(0, 3).map((r, i) => (
                                                        <div key={i} className="size-8 rounded-full border-2 border-white dark:border-[#0a0c10] bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-semibold">
                                                            {r.name[0]}
                                                        </div>
                                                    ))}
                                                    {formData.selectedRecipients.length > 3 && (
                                                        <div className="size-8 rounded-full border-2 border-white dark:border-[#0a0c10] bg-slate-400 text-white flex items-center justify-center text-xs font-semibold">
                                                            +{formData.selectedRecipients.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                                    <Icon icon={Settings03Icon} size={12} />
                                                </div>{tr("Allocation Logic")}</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, floatType: "commission" })}
                                                    className={cn(
                                                        "h-24 rounded-[var(--ds-radius-large)] border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                                                        formData.floatType === "commission" 
                                                            ? "bg-[#ffd428]/10 border-[#ffd428] text-[#242a37] dark:text-[#ffd428]" 
                                                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400"
                                                    )}
                                                >
                                                    <Icon icon={CommissionIcon} size={28} />
                                                    <div className="text-center">
                                                        <p className="text-xs font-semibold leading-none">{tr("Fixed Basis")}</p>
                                                        <p className="text-xs font-bold opacity-50 mt-1">{tr("Flat Amount Commission")}</p>
                                                    </div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, floatType: "percentage" })}
                                                    className={cn(
                                                        "h-24 rounded-[var(--ds-radius-large)] border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                                                        formData.floatType === "percentage" 
                                                            ? "bg-[#ffd428]/10 border-[#ffd428] text-[#242a37] dark:text-[#ffd428]" 
                                                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400"
                                                    )}
                                                >
                                                    <Icon icon={PercentageSettingIcon} size={28} />
                                                    <div className="text-center">
                                                        <p className="text-xs font-semibold leading-none">{tr("Ratio Basis")}</p>
                                                        <p className="text-xs font-bold opacity-50 mt-1">{tr("Transaction Percentage")}</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-[#1a1f2b] p-8 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                            {formData.floatType === "commission" ? (
                                                <div className="space-y-3">
                                                    <Label className="text-xs font-semibold text-slate-500 ml-1">{tr("Commission Constant (TZS)")}</Label>
                                                    <div className="relative group">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20 font-semibold text-xl">TZS</div>
                                                        <Input
                                                            type="number"
                                                            value={formData.commissionValue}
                                                            onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
                                                            placeholder={tr("ENTER FIXED VALUE")}
                                                            className="h-16 pl-16 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-large)] text-[20px] font-semibold"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <Label className="text-xs font-semibold text-slate-500 ml-1">{tr("Allocation Percentage (%)")}</Label>
                                                    <div className="relative group">
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 font-bold text-2xl">%</div>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={formData.percentageValue}
                                                            onChange={(e) => setFormData({ ...formData, percentageValue: e.target.value })}
                                                            placeholder="0.00"
                                                            className="h-16 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-large)] text-[24px] font-semibold pr-12"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[var(--ds-radius-large)] flex items-start gap-4">
                                                <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500">
                                                    <Icon icon={InformationCircleIcon} size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400">{tr("Balance change")}</h4>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                                                        {formData.floatType === "commission" 
                                                            ? tr("The recipient gets a fixed amount from each transaction.") 
                                                            : tr("The recipient keeps the set percentage of each transaction.")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                                    <Icon icon={Wallet02Icon} size={12} />
                                                </div>{tr("Top up")}</h3>
                                            <div className="bg-white dark:bg-[#1a1f2b] p-8 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-8">
                                                <div className="space-y-4">
                                                    <Label className="text-xs font-semibold text-slate-500 ml-1">{tr("Disbursement Principal (TZS)")}</Label>
                                                    <Input
                                                        type="number"
                                                        value={formData.floatAmount}
                                                        onChange={(e) => setFormData({ ...formData, floatAmount: e.target.value })}
                                                        placeholder="0.00"
                                                        className="h-20 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-large)] text-[32px] font-semibold text-center"
                                                    />
                                                    <div className="flex items-center justify-center gap-2">
                                                        {[50000, 100000, 500000, 1000000].map(val => (
                                                            <button
                                                                key={val}
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, floatAmount: val.toString() })}
                                                                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] transition-colors text-xs font-semibold cursor-pointer border-none"
                                                            >
                                                                {val.toLocaleString()}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-500 ml-1">{tr("Notes")}</Label>
                                                    <Textarea
                                                        value={formData.notes}
                                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                        placeholder={tr("NOTES (OPTIONAL)…")}
                                                        className="min-h-[100px] bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-large)] text-[13px] font-bold p-5 resize-none shadow-[var(--ds-shadow-raised)]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-4">
                                            <h4 className="text-xs font-semibold text-slate-400">{tr("Allocation summary")}</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[12px] font-semibold">
                                                    <span className="text-slate-400">{tr("Target Range")}</span>
                                                    <span className="text-[#242a37] dark:text-white">{tr("{selectedRecipientsCount} Records", { selectedRecipientsCount: formData.selectedRecipients.length })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[12px] font-semibold">
                                                    <span className="text-slate-400">{tr("Method")}</span>
                                                    <span className="text-[#242a37] dark:text-white">{formData.floatType}</span>
                                                </div>
                                                <div className="h-px bg-slate-100 dark:bg-white/5 w-full my-2" />
                                                <div className="flex justify-between items-center text-[16px] font-semibold">
                                                    <span className="text-slate-400 font-semibold text-xs">{tr("Gross Value")}</span>
                                                    <span className="text-[#ffd428]">TZS {Number(formData.floatAmount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="p-8 bg-white dark:bg-[#0f1117] border-t border-slate-100 dark:border-white/5 flex items-center gap-4 flex-shrink-0 relative z-50">
                    {currentStep > 1 ? (
                        <Button
                            variant="ghost"
                            onClick={() => setCurrentStep(currentStep - 1)}
                            className="flex-1 h-14 rounded-[var(--ds-radius-large)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-[12px] transition-colors border-none"
                        >
                            <Icon icon={ArrowLeft01Icon} size={18} className="mr-2" />{tr("Prev")}</Button>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={handleClose}
                            className="flex-1 h-14 rounded-[var(--ds-radius-large)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-[12px] transition-colors border-none"
                        >{tr("Abort")}</Button>
                    )}
                    
                    {currentStep < 3 ? (
                        <Button
                            onClick={() => validateStep(currentStep) && setCurrentStep(currentStep + 1)}
                            className="flex-[2] h-14 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-[12px] shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-3 cursor-pointer border-none"
                        >{tr("Next")}<Icon icon={ArrowRight01Icon} size={20} className="ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmitLocal}
                            disabled={isSubmitting}
                            className="flex-[2] h-14 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-[12px] shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-3 cursor-pointer border-none"
                        >
                            {isSubmitting ? (
                                <LoadingSpinner className="h-6 w-6 text-[#242a37]" />
                            ) : (
                                <>
                                    <Icon icon={Tick01Icon} size={24} />{tr("Confirm Allocation")}</>
                            )}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
