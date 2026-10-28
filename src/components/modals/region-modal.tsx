"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { createRegion, updateRegion } from "@/lib/services/region"
import { getCountries } from "@/lib/services/country"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    PinLocation01Icon,
    MapsIcon,
    GlobeIcon,
    Cancel01Icon,
    Tick01Icon,
    Location02Icon,
    Navigation03Icon,
    Building04Icon,
    Activity01Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useTr } from "@/lib/i18n/portal"

interface Region {
    id: number
    name: string
    code?: string
    countryId: number
    latitude?: number
    longitude?: number
    isActive: boolean
}

interface RegionModalProps {
    isOpen: boolean
    onClose: () => void
    region?: Region | null
    onSuccess: () => void
}

export function RegionModal({ isOpen, onClose, region, onSuccess }: RegionModalProps) {
    const tr = useTr()
    const isEditing = !!region
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [countries, setCountries] = useState<{ id: number; name: string }[]>([])
    const [loadingCountries, setLoadingCountries] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        countryId: "",
        latitude: "",
        longitude: "",
        isActive: true,
    })

    // Fetch countries when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchCountries()
        }
    }, [isOpen])

    const fetchCountries = async () => {
        try {
            setLoadingCountries(true)
            const response = await getCountries({ paginate: false })

            let countriesData = []
            if (response?.data) {
                countriesData = Array.isArray(response.data) ? response.data : []
            } else if (Array.isArray(response)) {
                countriesData = response
            }

            setCountries(countriesData)
        } catch (error) {
            console.error("Error fetching countries:", error)
            toast({
                title: tr("Networking Error"),
                description: tr("Couldn't load locations. Please try again."),
                variant: "destructive",
            })
        } finally {
            setLoadingCountries(false)
        }
    }

    useEffect(() => {
        if (region) {
            setFormData({
                name: region.name,
                code: region.code || "",
                countryId: region.countryId?.toString() || "",
                latitude: region.latitude?.toString() || "",
                longitude: region.longitude?.toString() || "",
                isActive: region.isActive,
            })
        } else {
            setFormData({
                name: "",
                code: "",
                countryId: "",
                latitude: "",
                longitude: "",
                isActive: true,
            })
        }
    }, [region])

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
                description: tr("Name is required."),
                variant: "destructive",
            })
            return
        }

        if (!formData.code.trim()) {
            // The backend creates-or-updates regions by code — it can't save one without
            toast({ title: tr("Code required"), description: tr("Enter a short, unique code for the region, e.g. DSM."), variant: "destructive" })
            return
        }

        if (!formData.countryId) {
            toast({
                title: tr("Country required"),
                description: tr("Select the country this region belongs to."),
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                countryId: Number(formData.countryId),
                latitude: formData.latitude ? Number(formData.latitude) : undefined,
                longitude: formData.longitude ? Number(formData.longitude) : undefined,
                isActive: formData.isActive,
            }

            if (isEditing && region) {
                await updateRegion(region.id, payload)
                toast({
                    title: tr("Success"),
                    description: tr("{name} perimeter updated in registry.", { name: formData.name }),
                })
            } else {
                await createRegion(payload)
                toast({
                    title: tr("Success"),
                    description: tr("{name} successfully cataloged as operational region.", { name: formData.name }),
                })
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Error submitting region:", error)
            toast({
                title: tr("Error"),
                description: error.message || "Failed to commit regional parameters to database.",
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
                    <SheetTitle>{isEditing ? tr("Edit region") : tr("Add region")}</SheetTitle>
                    <SheetDescription>{tr("Set the region's details.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={PinLocation01Icon} size={28} className="text-[#ffd428]" />
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
                                {isEditing ? tr("Edit Region") : tr("Add Region")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {isEditing ? tr("Geospatial Registry ID: #{padStart}", { padStart: String(region.id).padStart(4, '0') }) : tr("Add region")}
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
                                        <Icon icon={GlobeIcon} size={12} />
                                    </div>{tr("Region details")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Legal Region Name")}</Label>
                                        <div className="relative group">
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder={tr("e.g. DAR ES SALAAM")}
                                                required
                                                className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:ring-1 focus:ring-blue-500/50 shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Regional Alpha Code")}</Label>
                                            <Input
                                                name="code"
                                                value={formData.code}
                                                onChange={handleChange}
                                                placeholder={tr("e.g. DSM")}
                                                maxLength={3}
                                                className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[15px] font-semibold focus:ring-1 focus:ring-[#ffd428]/50 shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Country Anchor")}</Label>
                                            <div className="relative">
                                                {loadingCountries ? (
                                                    <Skeleton className="h-12 w-full rounded-[var(--ds-radius-small)]" />
                                                ) : (
                                                    <select
                                                        name="countryId"
                                                        value={formData.countryId}
                                                        onChange={handleChange}
                                                        required
                                                        className="w-full h-10 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] px-4 text-[13px] font-semibold shadow-[var(--ds-shadow-raised)] focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                    >
                                                        <option value="">{tr("SELECT COUNTRY")}</option>
                                                        {countries.map((country) => (
                                                            <option key={country.id} value={country.id}>{country.name.toUpperCase()}</option>
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
                                            <div className="relative flex items-center">
                                                <div className="absolute left-4 opacity-30"><Icon icon={Location02Icon} size={16} /></div>
                                                <Input
                                                    name="latitude"
                                                    type="number"
                                                    step="any"
                                                    value={formData.latitude}
                                                    onChange={handleChange}
                                                    placeholder="e.g. -6.79"
                                                    className="h-12 pl-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-bold tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Longitude (DEC)")}</Label>
                                            <div className="relative flex items-center">
                                                <div className="absolute left-4 opacity-30"><Icon icon={Location02Icon} size={16} /></div>
                                                <Input
                                                    name="longitude"
                                                    type="number"
                                                    step="any"
                                                    value={formData.longitude}
                                                    onChange={handleChange}
                                                    placeholder="e.g. 39.20"
                                                    className="h-12 pl-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-bold tabular-nums"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Operational Status */}
                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Status")}</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Status determines regional accessibility for logistics dispatch")}</p>
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
                        disabled={isSubmitting || loadingCountries}
                        className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                        {isSubmitting ? (
                            <LoadingSpinner className="h-5 w-5 text-[#242a37]" />
                        ) : (
                            <>
                                <Icon icon={Tick01Icon} size={20} />
                                {isEditing ? tr("Update Basin") : tr("Confirm Region")}
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
