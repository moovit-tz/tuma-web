"use client"
import { useState } from "react"
import type React from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { 
    CreditCardIcon, 
    Building03Icon, 
    UserIcon, 
    Calendar03Icon, 
    NoteIcon,
    PencilEdit01Icon,
    Tick01Icon,
    Cancel01Icon,
    Save01Icon,
    Wallet01Icon,
    PercentCircleIcon,
    Money01Icon
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface FloatViewModalProps {
    isOpen: boolean
    onClose: () => void
    float: any
}

export function FloatViewModal({ isOpen, onClose, float }: FloatViewModalProps) {
    const tr = useTr()
    const [isEditing, setIsEditing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    // Update the editData state to use clearer field names
    const [editData, setEditData] = useState({
        floatType: "",
        commissionValue: "",
        percentageValue: "",
        floatAmount: "",
        notes: "",
    })

    // Update the initialization of edit data
    useState(() => {
        if (float) {
            setEditData({
                floatType: float.floatType || "commission",
                commissionValue: float.floatType === "commission" ? String(float.commissionValue || float.amount) : "",
                percentageValue: float.floatType === "percentage" ? String(float.percentageValue || float.amount) : "",
                floatAmount: String(float.floatAmount || float.amount),
                notes: float.notes || "",
            })
        }
    })

    if (!float) return null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setEditData({
            ...editData,
            [name]: value,
        })
    }

    const handleFloatTypeChange = (type: string) => {
        setEditData({
            ...editData,
            floatType: type,
        })
    }

    const handleSave = async () => {
        try {
            setIsSubmitting(true)

            if (editData.floatType === "commission" && !editData.commissionValue) {
                toast({
                    title: tr("Missing information"),
                    description: tr("Please enter a commission value for the float configuration."),
                    variant: "destructive",
                })
                setIsSubmitting(false)
                return
            }

            if (editData.floatType === "percentage" && !editData.percentageValue) {
                toast({
                    title: tr("Missing information"),
                    description: tr("Please enter a percentage value for the float configuration."),
                    variant: "destructive",
                })
                setIsSubmitting(false)
                return
            }

            if (!editData.floatAmount) {
                toast({
                    title: tr("Missing information"),
                    description: tr("Please enter a float amount to allocate."),
                    variant: "destructive",
                })
                setIsSubmitting(false)
                return
            }

            if (
                editData.floatType === "percentage" &&
                (Number.parseFloat(editData.percentageValue) < 0 || Number.parseFloat(editData.percentageValue) > 100)
            ) {
                toast({
                    title: tr("Invalid percentage"),
                    description: tr("Percentage must be between 0 and 100."),
                    variant: "destructive",
                })
                setIsSubmitting(false)
                return
            }

            await new Promise((resolve) => setTimeout(resolve, 1000))

            toast({
                title: tr("Float updated successfully"),
                description: tr("The float details have been updated."),
            })

            setIsEditing(false)
        } catch (error) {
            toast({
                title: tr("Error updating float"),
                description: tr("An error occurred while updating the float. Please try again."),
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleStartEditing = () => {
        setEditData({
            floatType: float.floatType || "commission",
            commissionValue: float.floatType === "commission" ? String(float.commissionValue || float.amount) : "",
            percentageValue: float.floatType === "percentage" ? String(float.percentageValue || float.amount) : "",
            floatAmount: String(float.floatAmount || float.amount),
            notes: float.notes || "",
        })
        setIsEditing(true)
    }

    const handleCancelEditing = () => {
        setIsEditing(false)
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Float Details")}</SheetTitle>
                    <SheetDescription>{tr("View and manage float configuration for {recipient}.", { recipient: float.recipient })}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-[#ffd428] border border-white/20 flex items-center justify-center overflow-hidden">
                                 <Icon icon={Wallet01Icon} size={28} className="text-[#242a37]" />
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                {float.status === "pending" && !isEditing && (
                                    <Button
                                        onClick={handleStartEditing}
                                        className="h-9 px-4 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                    >
                                        <Icon icon={PencilEdit01Icon} size={20} />{tr("Edit Float")}</Button>
                                )}
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                                >
                                    <Icon icon={Cancel01Icon} size={18} />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="text-left">
                                <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">{float.recipient}</h2>
                                <p className="text-white/50 text-xs font-semibold mt-2 flex items-center gap-2">{tr("Float ID: #")}{float.id} <span className="text-white/20">•</span> {float.recipientType.toUpperCase()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className={cn(
                                    "h-7 px-3 rounded-[var(--ds-radius-large)] text-xs font-semibold border-none shadow-[var(--ds-shadow-raised)] flex items-center justify-center translate-y-[2px]",
                                    float.status === "approved" ? "bg-emerald-500 text-white" : 
                                    float.status === "pending" ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                                )}>
                                    {float.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar bg-[#f1f3f6] dark:bg-[#0a0c10]">
                    {isEditing ? (
                        <div className="space-y-8 max-w-2xl mx-auto">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/5 pb-4">
                                    <div className="size-8 rounded-[var(--ds-radius-small)] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Icon icon={Money01Icon} size={18} />
                                    </div>
                                    <h3 className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Float Configuration")}</h3>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-xs font-semibold text-slate-400">{tr("Management Type")}</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => handleFloatTypeChange("commission")}
                                            className={cn(
                                                "h-16 rounded-[var(--ds-radius-small)] border-2 transition-all flex flex-col items-center justify-center gap-1 group",
                                                editData.floatType === "commission" 
                                                    ? "bg-[#242a37] text-[#ffd428] border-[#242a37]" 
                                                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                                            )}
                                        >
                                            <Icon icon={Money01Icon} size={18} />
                                            <span className="text-xs font-semibold">{tr("Fixed Commission")}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFloatTypeChange("percentage")}
                                            className={cn(
                                                "h-16 rounded-[var(--ds-radius-small)] border-2 transition-all flex flex-col items-center justify-center gap-1 group",
                                                editData.floatType === "percentage" 
                                                    ? "bg-[#242a37] text-[#ffd428] border-[#242a37]" 
                                                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                                            )}
                                        >
                                            <Icon icon={PercentCircleIcon} size={18} />
                                            <span className="text-xs font-semibold">{tr("Percentage Share")}</span>
                                        </button>
                                    </div>
                                </div>

                                {editData.floatType === "commission" ? (
                                    <div className="space-y-4">
                                        <Label htmlFor="commissionValue" className="text-xs font-semibold text-slate-400">{tr("Commission Value (TZS)")}</Label>
                                        <Input
                                            id="commissionValue"
                                            name="commissionValue"
                                            type="number"
                                            placeholder={tr("Enter commission value (e.g., 200)")}
                                            className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                                            value={editData.commissionValue}
                                            onChange={handleChange}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Label htmlFor="percentageValue" className="text-xs font-semibold text-slate-400">{tr("Percentage Value (%)")}</Label>
                                        <Input
                                            id="percentageValue"
                                            name="percentageValue"
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder={tr("Enter percentage (0-100)")}
                                            className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                                            value={editData.percentageValue}
                                            onChange={handleChange}
                                        />
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <Label htmlFor="floatAmount" className="text-xs font-semibold text-slate-400">{tr("Allocation Amount (TZS)")}</Label>
                                    <Input
                                        id="floatAmount"
                                        name="floatAmount"
                                        type="number"
                                        placeholder={tr("Enter float amount")}
                                        className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                                        value={editData.floatAmount}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label htmlFor="notes" className="text-xs font-semibold text-slate-400">{tr("Audit Notes")}</Label>
                                    <Textarea
                                        id="notes"
                                        name="notes"
                                        placeholder={tr("Enter reason for adjustment or internal notes...")}
                                        className="min-h-[120px] rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold resize-none"
                                        value={editData.notes}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEditing}
                                    className="flex-1 h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 font-semibold text-xs"
                                    disabled={isSubmitting}
                                >{tr("Cancel Adjustments")}</Button>
                                <Button 
                                    type="button" 
                                    onClick={handleSave} 
                                    disabled={isSubmitting}
                                    className="flex-1 h-12 rounded-[var(--ds-radius-small)] bg-[#242a37] hover:bg-[#2a3241] text-[#ffd428] font-semibold text-xs"
                                >
                                    {isSubmitting ? tr("Processing...") : tr("Save changes")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-4">
                                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Icon icon={Wallet01Icon} size={12} />{" "}{tr("Financial Status")}</p>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1 font-bold">{tr("Configuration Type")}</p>
                                        <Badge variant="outline" className="text-xs font-semibold border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-md">
                                            {float.floatType === "commission" ? tr("Fixed Commission") : tr("Percentage Share")}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1 font-bold">{tr("System Value")}</p>
                                        <p className="font-semibold text-lg text-[#ffd428]">
                                            {float.floatType === "commission"
                                                ? `TZS ${(float.commissionValue || float.amount).toLocaleString()}`
                                                : `${float.percentageValue || float.amount}%`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1 font-bold">{tr("Total Float Allocated")}</p>
                                        <p className="font-semibold text-lg">TZS {(float.floatAmount || float.amount).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-4">
                                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Icon icon={Calendar03Icon} size={12} />{" "}{tr("Audit Timeline")}</p>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1 font-bold">{tr("Request Initiated")}</p>
                                        <p className="font-semibold text-sm">{float.createdDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1 font-bold">{tr("Last Action Date")}</p>
                                        <p className="font-semibold text-sm">{float.approvedDate || float.createdDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1 font-bold">{tr("Process Managed By")}</p>
                                        <p className="font-semibold text-sm flex items-center gap-2">
                                            <Icon icon={UserIcon} size={14} className="text-blue-500" />
                                            {float.approvedBy || "SYSTEM_PROCESS"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-4">
                                <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                    <Icon icon={NoteIcon} size={12} />{" "}{tr("Notes")}</p>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed border-l-2 border-[#ffd428] pl-4">
                                    {float.notes || tr("No operational notes recorded for this float allocation.")}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

