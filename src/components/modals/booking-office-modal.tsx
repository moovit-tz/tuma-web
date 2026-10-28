"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createBookingOffice, updateBookingOffice } from "@/lib/services/booking-office"
import { getRegions } from "@/lib/services/region"
import { getDistricts } from "@/lib/services/district"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    OfficeIcon,
    MapsIcon,
    GlobeIcon,
    Cancel01Icon,
    Tick01Icon,
    Activity01Icon,
    Property01Icon,
    InformationCircleIcon,
    Building03Icon,
    SquareUnlock02Icon,
    CallIcon,
    Mail01Icon,
    Navigation03Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { BookingOffice } from "@/types/booking-office"
import { useTr } from "@/lib/i18n/portal"

interface BookingOfficeModalProps {
    isOpen: boolean
    onClose: () => void
    office?: BookingOffice | null
    onSuccess: () => void
}

export function BookingOfficeModal({ isOpen, onClose, office, onSuccess }: BookingOfficeModalProps) {
    const tr = useTr()
    const isEditing = !!office
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [regions, setRegions] = useState<{ id: number; name: string; country?: { name: string } }[]>([])
    const [districts, setDistricts] = useState<{ id: number; name: string; region?: { name: string } }[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingDistricts, setLoadingDistricts] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        phoneNumber: "",
        email: "",
        regionId: "",
        districtId: "",
        isActive: true,
    })

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
                title: tr("Couldn't connect. Please try again."),
                description: tr("Couldn't load regions. Please try again."),
                variant: "destructive",
            })
        } finally {
            setLoadingRegions(false)
        }
    }

    const fetchDistricts = async (regionId?: string) => {
        try {
            setLoadingDistricts(true)
            const params: any = { paginate: false }
            if (regionId) params.region_id = Number(regionId)
            const response = await getDistricts(params)
            let districtsData = []
            if (response?.data) {
                districtsData = Array.isArray(response.data) ? response.data : []
            } else if (Array.isArray(response)) {
                districtsData = response
            }
            setDistricts(districtsData)
        } catch (error) {
            console.error("Error fetching districts:", error)
        } finally {
            setLoadingDistricts(false)
        }
    }

    useEffect(() => {
        if (formData.regionId) {
            fetchDistricts(formData.regionId)
        } else {
            setDistricts([])
        }
    }, [formData.regionId])

    useEffect(() => {
        if (office) {
            const regionId = office.district?.region?.id?.toString() || ""
            setFormData({
                name: office.name,
                code: office.code || "",
                address: office.address || "",
                phoneNumber: office.phoneNumber || "",
                email: office.email || "",
                regionId: regionId,
                districtId: office.districtId?.toString() || "",
                isActive: office.isActive,
            })
            if (regionId) fetchDistricts(regionId)
        } else {
            setFormData({
                name: "",
                code: "",
                address: "",
                phoneNumber: "",
                email: "",
                regionId: "",
                districtId: "",
                isActive: true,
            })
        }
    }, [office, isOpen])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        })
    }

    const handleSubmitLocal = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim() || !formData.districtId) {
            toast({
                title: tr("Validation Violation"),
                description: tr("Critical identification parameters and district assignment are missing."),
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim() || undefined,
                address: formData.address.trim() || undefined,
                phoneNumber: formData.phoneNumber.trim() || undefined,
                email: formData.email.trim() || undefined,
                districtId: Number(formData.districtId),
                isActive: formData.isActive,
            }

            if (isEditing && office) {
                await updateBookingOffice(office.id, payload)
                toast({
                    title: tr("Saved"),
                    description: tr("{name} terminal profile has been successfully modified in the ledger.", { name: formData.name }),
                })
            } else {
                await createBookingOffice(payload)
                toast({
                    title: tr("Office added"),
                    description: tr("{name} has been successfully registered as an active booking terminal.", { name: formData.name }),
                })
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            toast({
                title: tr("Gateway Authentication Error"),
                description: error.message || "The system was unable to commit terminal parameters to the database.",
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
                    <SheetTitle>{isEditing ? tr("Edit office") : tr("Add office")}</SheetTitle>
                    <SheetDescription>{tr("Set the office's name, location and contact details.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={Building03Icon} size={28} className="text-[#ffd428]" />
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
                                {isEditing ? tr("Edit office") : tr("Add office")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {isEditing ? tr("Node ID: #{padStart}", { padStart: String(office.id).padStart(4, '0') }) : tr("Configure New Logistic Point of Sale")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <form onSubmit={handleSubmitLocal} className="p-8 space-y-8 text-left pb-10">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {/* Primary Identity */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={Property01Icon} size={12} />
                                    </div>{tr("Office details")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Office name")}</Label>
                                        <div className="relative group">
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder={tr("e.g. Dar es Salaam main office")}
                                                required
                                                className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Office code")}</Label>
                                        <Input
                                            name="code"
                                            value={formData.code}
                                            onChange={handleChange}
                                            placeholder={tr("e.g. DSM001")}
                                            maxLength={10}
                                            className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[15px] font-semibold shadow-[var(--ds-shadow-raised)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Spacial Location */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={Navigation03Icon} size={12} />
                                    </div>{tr("GIS Specification")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Region")}</Label>
                                            <div className="relative">
                                                <select
                                                    name="regionId"
                                                    value={formData.regionId}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full h-10 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] px-4 text-[13px] font-semibold appearance-none cursor-pointer"
                                                >
                                                    <option value="">{tr("SELECT REGION")}</option>
                                                    {regions.map((r) => (
                                                        <option key={r.id} value={r.id.toString()}>{r.name.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                                                    {loadingRegions ? <LoadingSpinner className="h-4 w-4" /> : <Icon icon={MapsIcon} size={16} />}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("District")}</Label>
                                            <div className="relative">
                                                <select
                                                    name="districtId"
                                                    value={formData.districtId}
                                                    onChange={handleChange}
                                                    required
                                                    disabled={!formData.regionId}
                                                    className="w-full h-10 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] px-4 text-[13px] font-semibold appearance-none cursor-pointer disabled:opacity-50"
                                                >
                                                    <option value="">{formData.regionId ? tr("SELECT DISTRICT") : tr("AWAITING REGION")}</option>
                                                    {districts.map((d) => (
                                                        <option key={d.id} value={d.id.toString()}>{d.name.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                                                    {loadingDistricts ? <LoadingSpinner className="h-4 w-4" /> : <Icon icon={GlobeIcon} size={16} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Street Address / Landmark")}</Label>
                                        <Textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder={tr("DESCRIBE THE LOCATION…")}
                                            className="min-h-[100px] bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-large)] text-[13px] font-bold focus:ring-1 focus:ring-[#ffd428]/50 transition-all p-4 resize-none shadow-[var(--ds-shadow-raised)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Matrix */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={CallIcon} size={12} />
                                    </div>{tr("Connectivity Channels")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Phone number")}</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                                                    <Icon icon={CallIcon} size={16} />
                                                </div>
                                                <Input
                                                    name="phoneNumber"
                                                    value={formData.phoneNumber}
                                                    onChange={handleChange}
                                                    placeholder="+255..."
                                                    className="h-12 pl-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500">{tr("Cloud Messaging Host")}</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                                                    <Icon icon={Mail01Icon} size={16} />
                                                </div>
                                                <Input
                                                    name="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="office@mizigo.com"
                                                    className="h-12 pl-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Vector */}
                            <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Office status")}</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Inactive offices can't receive or send parcels")}</p>
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
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="p-8 bg-white dark:bg-[#0f1117] border-t border-slate-100 dark:border-white/5 flex items-center gap-4 flex-shrink-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-[var(--ds-radius-small)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-xs transition-colors border-none"
                    >{tr("Abort")}</Button>
                    <Button
                        onClick={handleSubmitLocal}
                        disabled={isSubmitting || loadingRegions || loadingDistricts}
                        className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                        {isSubmitting ? (
                            <LoadingSpinner className="h-5 w-5 text-[#242a37]" />
                        ) : (
                            <>
                                <Icon icon={Tick01Icon} size={20} />
                                {isEditing ? tr("Edit") : tr("Confirm Entry")}
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
