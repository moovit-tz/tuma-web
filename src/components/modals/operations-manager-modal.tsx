"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    UserGroupIcon,
    ContactIcon,
    Mail01Icon,
    SmartPhone01Icon,
    IdentityCardIcon,
    PinLocation01Icon,
    InformationCircleIcon,
    Cancel01Icon,
    Tick01Icon,
    Delete02Icon,
    Building04Icon,
    UserIcon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface OperationsManagerModalProps {
    isOpen: boolean
    onClose: () => void
    manager?: {
        id: number
        name: string
        email: string
        phone: string
        role: string
        regions: string[]
        isActive: boolean
        bio?: string
    }
    onSave?: (formData: any) => Promise<void>
}

export function OperationsManagerModal({ isOpen, onClose, manager, onSave }: OperationsManagerModalProps) {
    const tr = useTr()
    const isEditing = !!manager
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        role: "REGIONAL_MANAGER",
        regions: [] as string[],
        isActive: true,
        bio: "",
    })

    const [selectedRegion, setSelectedRegion] = useState("")

    useEffect(() => {
        if (manager) {
            setFormData({
                name: manager.name || "",
                email: manager.email || "",
                phone: manager.phone || "",
                role: manager.role || "REGIONAL_MANAGER",
                regions: manager.regions || [],
                isActive: manager.isActive ?? true,
                bio: manager.bio || "",
            })
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                role: "REGIONAL_MANAGER",
                regions: [],
                isActive: true,
                bio: "",
            })
        }
    }, [manager, isOpen])

    // Mock regions data
    const availableRegions = [
        { id: 1, name: "Dar es Salaam" },
        { id: 2, name: "Arusha" },
        { id: 3, name: "Mwanza" },
        { id: 4, name: "Dodoma" },
        { id: 5, name: "Mbeya" },
        { id: 6, name: "Tanga" },
        { id: 7, name: "Morogoro" },
        { id: 8, name: "Kilimanjaro" },
    ]

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        })
    }

    const handleAddRegion = () => {
        if (selectedRegion && !formData.regions.includes(selectedRegion)) {
            setFormData({
                ...formData,
                regions: [...formData.regions, selectedRegion],
            })
            setSelectedRegion("")
        }
    }

    const handleRemoveRegion = (region: string) => {
        setFormData({
            ...formData,
            regions: formData.regions.filter((r) => r !== region),
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
                console.log("Saving operations manager:", formData)
                await new Promise(resolve => setTimeout(resolve, 1000))
                toast({
                    title: tr("Operation Successful"),
                    description: tr("{name} has been {added} as {role}.", { name: formData.name, added: isEditing ? "updated" : "added", role: formData.role }),
                })
            }
            onClose()
        } catch (error) {
            toast({
                title: tr("Internal Error"),
                description: tr("Couldn't save the manager's profile."),
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
                    <SheetTitle>{isEditing ? tr("Edit operations user") : tr("Add operations user")}</SheetTitle>
                    <SheetDescription>{tr("Set this manager's role and regions.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={UserIcon} size={28} className="text-[#ffd428]" />
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
                                {isEditing ? tr("Edit Manager") : tr("Enrol Manager")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {isEditing ? tr("User ID: #{padStart}", { padStart: String(manager.id).padStart(4, '0') }) : tr("New operations user")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {/* Personal Details */}
                            <div className="space-y-4 text-left">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={ContactIcon} size={12} />
                                    </div>{tr("Details")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500">{tr("Legal Full Name")}</label>
                                            <div className="relative group">
                                                <Input
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    placeholder={tr("Enter name")}
                                                    required
                                                    className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold placeholder:text-slate-400 focus:border-[#ffd428]/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500">{tr("Role")}</label>
                                            <select
                                                name="role"
                                                value={formData.role}
                                                onChange={handleChange}
                                                className="w-full h-10 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] px-4 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-[#ffd428]/50 shadow-[var(--ds-shadow-raised)]"
                                                required
                                            >
                                                <option value="REGIONAL_MANAGER">{tr("REGIONAL MANAGER")}</option>
                                                <option value="OPERATIONS_DIRECTOR">{tr("OPERATIONS DIRECTOR")}</option>
                                                <option value="FLEET_MANAGER">{tr("FLEET MANAGER")}</option>
                                                <option value="LOGISTICS_COORDINATOR">{tr("LOGISTICS COORDINATOR")}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Configuration */}
                            <div className="space-y-4 text-left">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={SmartPhone01Icon} size={12} />
                                    </div>{tr("Contact")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500">{tr("Official Email")}</label>
                                            <div className="relative group">
                                                <div className="relative h-12 flex items-center">
                                                    <div className="absolute left-4 text-slate-400"><Icon icon={Mail01Icon} size={18} /></div>
                                                    <Input
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="email@company.com"
                                                        required
                                                        className="h-full pl-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold lowercase focus:border-blue-500/50 focus:ring-0 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500">{tr("Phone number")}</label>
                                            <div className="relative group">
                                                <div className="relative h-12 flex items-center">
                                                    <div className="absolute left-4 text-slate-400"><Icon icon={SmartPhone01Icon} size={18} /></div>
                                                    <Input
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        placeholder="+255..."
                                                        required
                                                        className="h-full pl-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:border-emerald-500/50 focus:ring-0 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500">{tr("Internal Bio / Notes")}</label>
                                        <Textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            placeholder={tr("Notes (optional)")}
                                            rows={2}
                                            className="bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[12px] font-bold focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-[var(--ds-shadow-raised)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Territorial Authority */}
                            <div className="space-y-4 text-left">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={PinLocation01Icon} size={12} />
                                    </div>{tr("Assigned regions")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="flex gap-4">
                                        <select
                                            value={selectedRegion}
                                            onChange={(e) => setSelectedRegion(e.target.value)}
                                            className="flex-1 h-10 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] px-4 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-[#ffd428]/50"
                                        >
                                            <option value="">{tr("SELECT REGION TO ASSIGN")}</option>
                                            {availableRegions
                                                .filter((region) => !formData.regions.includes(region.name))
                                                .map((region) => (
                                                    <option key={region.id} value={region.name}>
                                                        {region.name}
                                                    </option>
                                                ))}
                                        </select>
                                        <Button 
                                            type="button" 
                                            onClick={handleAddRegion} 
                                            disabled={!selectedRegion}
                                            className="h-10 px-6 bg-[#242a37] text-white hover:bg-black rounded-[var(--ds-radius-small)] font-semibold text-xs border-none transition-colors"
                                        >{tr("Assign")}</Button>
                                    </div>

                                    {formData.regions.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {formData.regions.map((region) => (
                                                <div key={region} className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--ds-radius-small)] bg-[#ffd428]/10 text-[#242a37] dark:text-[#ffd428] border border-[#ffd428]/20 group/tag">
                                                    <span className="text-xs font-semibold">{region}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRegion(region)}
                                                        className="text-slate-400 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Icon icon={Cancel01Icon} size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-4 border border-dashed border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-small)] flex items-center justify-center">
                                            <p className="text-xs font-bold text-slate-400">{tr("No regions assigned yet")}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Active Status */}
                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Permissions")}</p>
                                    <p className="text-xs text-slate-400 font-bold">{tr("Turn this record on or off")}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={cn(
                                        "h-7 px-4 rounded-full text-xs font-semibold transition-all border-none cursor-pointer",
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
                        disabled={isSubmitting}
                    >{tr("Cancel")}</Button>
                    <Button
                        onClick={handleSubmit}
                        className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                        {isSubmitting ? (
                            <LoadingSpinner className="h-5 w-5 text-[#242a37]" />
                        ) : (
                            <>
                                <Icon icon={Tick01Icon} size={20} />
                                {isEditing ? tr("Update Profile") : tr("Confirm Enrolment")}
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
