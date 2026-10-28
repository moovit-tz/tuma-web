"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { createDistrict, updateDistrict } from "@/lib/services/district"
import { getRegions } from "@/lib/services/region"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    PinLocation02Icon,
    MapsIcon,
    Location01Icon,
    Cancel01Icon,
    Tick01Icon,
    Building04Icon,
    Navigation03Icon,
    GlobeIcon,
    Activity01Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { District } from "@/types/district"
import { Skeleton } from "@/components/ui/skeleton"
import { useTr } from "@/lib/i18n/portal"

interface DistrictModalProps {
    isOpen: boolean
    onClose: () => void
    district?: District | null
    onSuccess: () => void
}

export function DistrictModal({ isOpen, onClose, district, onSuccess }: DistrictModalProps) {
    const tr = useTr()
    const isEditing = !!district
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [regions, setRegions] = useState<{ id: number; name: string; country?: { name: string } }[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        regionId: "",
        latitude: "",
        longitude: "",
        isActive: true,
    })

    // Fetch regions when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchRegions()
        }
    }, [isOpen])

    const fetchRegions = async () => {
        try {
            setLoadingRegions(true)
            const response = await getRegions({ paginate: false })

            let regionsData = []
            if (response?.data) {
                regionsData = Array.isArray(response.data) ? response.data : []
            } else if (Array.isArray(response)) {
                regionsData = response
            }

            setRegions(regionsData)
        } catch (error) {
            console.error("Error fetching regions:", error)
            toast({
                title: tr("Networking Error"),
                description: tr("Failed to establish link with regional database."),
                variant: "destructive",
            })
        } finally {
            setLoadingRegions(false)
        }
    }

    useEffect(() => {
        if (district) {
            setFormData({
                name: district.name,
                code: district.code || "",
                regionId: (district.regionId || district.region_id)?.toString() || "",
                latitude: district.latitude?.toString() || "",
                longitude: district.longitude?.toString() || "",
                isActive: district.isActive ?? district.is_active ?? true,
            })
        } else {
            setFormData({
                name: "",
                code: "",
                regionId: "",
                latitude: "",
                longitude: "",
                isActive: true,
            })
        }
    }, [district])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast({
                title: tr("Validation Error"),
                description: tr("District identifier (Name) is required."),
                variant: "destructive",
            })
            return
        }

        if (!formData.regionId) {
            toast({
                title: tr("Validation Error"),
                description: tr("Please select a regional anchor."),
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim() || undefined,
                regionId: Number(formData.regionId),
                latitude: formData.latitude ? Number(formData.latitude) : undefined,
                longitude: formData.longitude ? Number(formData.longitude) : undefined,
                isActive: formData.isActive,
            }

            if (isEditing && district) {
                await updateDistrict(district.id, payload)
                toast({
                    title: tr("Success"),
                    description: tr("{name} perimeter updated in registry.", { name: formData.name }),
                })
            } else {
                await createDistrict(payload)
                toast({
                    title: tr("Success"),
                    description: tr("{name} successfully cataloged as operational district.", { name: formData.name }),
                })
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Error submitting district:", error)
            toast({
                title: tr("Error"),
                description: error.message || "Failed to commit district parameters to database.",
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
                    <SheetTitle>{isEditing ? tr("Edit district") : tr("Add district")}</SheetTitle>
                    <SheetDescription>{tr("Set the district's details.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={PinLocation02Icon} size={28} className="text-[#ffd428]" />
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
                                {isEditing ? tr("Edit District") : tr("Add District")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {isEditing ? tr("District Inventory ID: #{padStart}", { padStart: String(district.id).padStart(4, '0') }) : tr("Add district")}
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
                            {/* Primary Details */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={Building04Icon} size={12} />
                                    </div>{tr("District")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Official District Name")}</Label>
                                        <div className="relative group">
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder={tr("e.g. Kinondoni")}
                                                required
                                                className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:ring-1 focus:ring-blue-500/50 shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Code")}</Label>
                                            <Input
                                                name="code"
                                                value={formData.code}
                                                onChange={handleChange}
                                                placeholder={tr("e.g. KIN")}
                                                maxLength={3}
                                                className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[15px] font-semibold focus:ring-1 focus:ring-[#ffd428]/50 shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Region")}</Label>
                                            <div className="relative">
                                                {loadingRegions ? (
                                                    <Skeleton className="h-12 w-full rounded-[var(--ds-radius-small)]" />
                                                ) : (
                                                    <select
                                                        name="regionId"
                                                        value={formData.regionId}
                                                        onChange={handleChange}
                                                        required
                                                        className="w-full h-10 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] px-4 text-[13px] font-semibold shadow-[var(--ds-shadow-raised)] focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                    >
                                                        <option value="">{tr("SELECT REGION")}</option>
                                                        {regions.map((region) => (
                                                            <option key={region.id} value={region.id}>
                                                                {region.name.toUpperCase()} {region.country?.name && `(${region.country.name.toUpperCase()})`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Geospatial Coordinates */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={Navigation03Icon} size={12} />
                                    </div>{tr("Location")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Latitude (DEC)")}</Label>
                                            <Input
                                                name="latitude"
                                                type="number"
                                                step="any"
                                                value={formData.latitude}
                                                onChange={handleChange}
                                                placeholder="e.g. -6.79"
                                                className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-bold tabular-nums"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Longitude (DEC)")}</Label>
                                            <Input
                                                name="longitude"
                                                type="number"
                                                step="any"
                                                value={formData.longitude}
                                                onChange={handleChange}
                                                placeholder="e.g. 39.20"
                                                className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-bold tabular-nums"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Operational Status */}
                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Active office")}</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Controls accessibility for last-mile delivery protocols")}</p>
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
                        disabled={isSubmitting || loadingRegions}
                        className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                        {isSubmitting ? (
                            <LoadingSpinner className="h-5 w-5 text-[#242a37]" />
                        ) : (
                            <>
                                <Icon icon={Tick01Icon} size={20} />
                                {isEditing ? tr("Save") : tr("Confirm District")}
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
