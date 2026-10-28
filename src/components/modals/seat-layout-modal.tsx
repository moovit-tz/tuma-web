"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    GridViewIcon,
    MapsIcon,
    GlobeIcon,
    Cancel01Icon,
    Tick01Icon,
    Layout01Icon,
    Activity01Icon,
    Property01Icon,
    InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface SeatLayoutModalProps {
    isOpen: boolean
    onClose: () => void
    seatLayout?: {
        id: number
        name: string
        code?: string
        description?: string
        isActive: boolean
    }
    onSave?: (formData: any) => Promise<void>
}

export function SeatLayoutModal({ isOpen, onClose, seatLayout, onSave }: SeatLayoutModalProps) {
    const tr = useTr()
    const isEditing = !!seatLayout
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        isActive: true,
    })

    useEffect(() => {
        if (seatLayout) {
            setFormData({
                name: seatLayout.name || "",
                code: seatLayout.code || "",
                description: seatLayout.description || "",
                isActive: seatLayout.isActive ?? true,
            })
        } else {
            setFormData({
                name: "",
                code: "",
                description: "",
                isActive: true,
            })
        }
    }, [seatLayout, isOpen])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement

        setFormData({
            ...formData,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (onSave) {
                await onSave(formData)
            } else {
                // For demo purposes
                console.log("Submitting seat layout data:", formData)

                toast({
                    title: tr("Seat layout saved"),
                    description: tr("{name} layout has been successfully {onboarded} in the fleet matrix.", { name: formData.name, onboarded: isEditing ? "modified" : "onboarded" }),
                })
            }

            onClose()
        } catch (error) {
            toast({
                title: tr("Something went wrong"),
                description: tr("Couldn't save the seat layout. Check the layout and try again."),
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
                    <SheetTitle>{isEditing ? tr("Edit seat layout") : tr("Add seat layout")}</SheetTitle>
                    <SheetDescription>{tr("Set the seating arrangement.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={Layout01Icon} size={28} className="text-[#ffd428]" />
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
                                {isEditing ? tr("Edit Layout") : tr("Add Layout")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {isEditing ? tr("Spatial Registry ID: #{padStart}", { padStart: String(seatLayout.id).padStart(4, '0') }) : tr("Configure New Interior Resource Arrangement")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8 text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {/* Layout Specification */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={Property01Icon} size={12} />
                                    </div>{tr("Arrangement Metrics")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Commercial Layout Designation")}</Label>
                                        <div className="relative group">
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder={tr("e.g. 2x2 LUXURY")}
                                                required
                                                className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:ring-1 focus:ring-blue-500/50 shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Code")}</Label>
                                        <Input
                                            name="code"
                                            value={formData.code}
                                            onChange={handleChange}
                                            placeholder="e.g. 2X2"
                                            maxLength={4}
                                            className="h-12 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[15px] font-semibold focus:ring-1 focus:ring-[#ffd428]/50 shadow-[var(--ds-shadow-raised)]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Configuration Description")}</Label>
                                        <Textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder={tr("DESCRIBE SEATING DENSITY AND CABIN SPECIFICATIONS...")}
                                            className="min-h-[120px] bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-bold focus:ring-1 focus:ring-blue-500/50 transition-all p-4 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Operational Status */}
                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Status")}</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Inactive layouts can't be assigned to vehicles")}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={cn(
                                        "h-8 px-5 rounded-full text-xs font-semibold transition-all border-none cursor-pointer shadow-[var(--ds-shadow-raised)]",
                                        formData.isActive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                                    )}
                                >
                                    {formData.isActive ? "ACTIVE" : "INACTIVE"}
                                </button>
                            </div>
                        </motion.div>
                        <div className="pb-8"></div>
                    </form>
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
                                {isEditing ? tr("Update Arrangement") : tr("Confirm Arrangement")}
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
