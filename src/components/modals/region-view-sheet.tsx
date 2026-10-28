"use client"
import { Icon } from "@/components/ui/icon"

import React, { useState, useEffect, useMemo } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    MapsIcon,
    GlobeIcon,
    Activity01Icon,
    Calendar03Icon,
    Building03Icon,
    PinLocation01Icon,
    InformationCircleIcon,
    Cancel01Icon,
    ArrowUpRight01Icon,
    MapsLocation01Icon,
    Package01Icon,
    Search01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Clock01Icon,
    UserCircleIcon,
    DeliveryTruck01Icon,
} from "@hugeicons/core-free-icons"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { getParcels } from "@/lib/services/parcel"
import { getDistricts, getBookingOffices } from "@/lib/services/location"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ParcelReceipt } from "@/components/modals/parcel-receipt"
import { ListSkeleton } from "@/components/ui/skeletons"
import { useTr } from "@/lib/i18n/portal"

interface RegionViewSheetProps {
    isOpen: boolean
    onClose: () => void
    region: any | null
    onEdit?: (region: any) => void
    onDelete?: (region: any) => void
}

const SimplePagination = ({ page, totalPages, setPage }: { page: number, totalPages: number, setPage: (p: number) => void }) => {
    const tr = useTr()
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-100 dark:border-white/5">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="h-9 w-9 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 rounded-[var(--ds-radius-small)] transition-colors cursor-pointer"
            >
                <Icon icon={ArrowLeft01Icon} size={18} />
            </Button>
            
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">{tr("Page")}</span>
                <div className="h-7 px-3 bg-[#ffd428]/10 text-[#ffd428] rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums">
                    {page}
                </div>
                <span className="text-xs font-semibold text-slate-400">{tr("of {totalPages}", { totalPages })}</span>
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="h-9 w-9 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 rounded-[var(--ds-radius-small)] transition-colors cursor-pointer"
            >
                <Icon icon={ArrowRight01Icon} size={18} />
            </Button>
        </div>
    )
}

export function RegionViewSheet({ isOpen, onClose, region, onEdit, onDelete }: RegionViewSheetProps) {
    const tr = useTr()
    const [activeTab, setActiveTab] = useState("details")
    const [parcels, setParcels] = useState<any[]>([])
    const [isLoadingParcels, setIsLoadingParcels] = useState(false)
    const [districts, setDistricts] = useState<any[]>([])
    const [offices, setOffices] = useState<any[]>([])
    const [isLoadingLocation, setIsLoadingLocation] = useState(false)
    const [parcelSearch, setParcelSearch] = useState("")
    const [parcelPage, setParcelPage] = useState(1)
    const [parcelTotalPages, setParcelTotalPages] = useState(1)
    const [totalParcelsCount, setTotalParcelsCount] = useState(0)
    const [showingReceipt, setShowingReceipt] = useState(false)
    const [selectedParcelForReceipt, setSelectedParcelForReceipt] = useState<any>(null)

    useEffect(() => {
        if (!isOpen) {
            setActiveTab("details")
            setParcels([])
            setParcelSearch("")
            setParcelPage(1)
            setDistricts([])
            setOffices([])
        } else if (region) {
            fetchLocationHierarchy()
            fetchParcels()
        }
    }, [isOpen, region])

    const fetchLocationHierarchy = async () => {
        if (!region) return
        try {
            setIsLoadingLocation(true)
            const [districtsRes, officesRes] = await Promise.all([
                getDistricts({ region_id: region.id }),
                getBookingOffices({ region_id: region.id })
            ])

            // Perform safety filtering to ensure strict region isolation
            const filteredDistricts = districtsRes.filter((d: any) => 
                (d.region_id == region.id) || (d.regionId == region.id)
            )

            const filteredOffices = officesRes.filter((o: any) => 
                (o.region_id == region.id) || (o.regionId == region.id) ||
                filteredDistricts.some(fd => fd.id == o.district_id || fd.id == o.districtId)
            )

            setDistricts(filteredDistricts)
            setOffices(filteredOffices)
        } catch (error) {
            console.error("Failed to fetch region hierarchy:", error)
        } finally {
            setIsLoadingLocation(false)
        }
    }

    useEffect(() => {
        if (isOpen && region && activeTab === "parcels") {
            const delayDebounceFn = setTimeout(() => {
                fetchParcels()
            }, parcelSearch ? 300 : 0)
            return () => clearTimeout(delayDebounceFn)
        }
    }, [activeTab, parcelPage, parcelSearch])

    const fetchParcels = async () => {
        if (!region) return
        try {
            setIsLoadingParcels(true)
            const fetchParams = { 
                page: parcelPage, 
                perPage: 10, 
                search: parcelSearch,
                originRegionId: region.id,
            }
            
            const result = await getParcels(fetchParams)
            const apiData = (result as any).data?.parcels || result.data || []
            
            // Client-side best-effort identification if backend filtering is loose
            const regionParcels = apiData.filter((p: any) => {
                const isIdMatch = (p.originRegionId == region.id) || (p.origin_region_id == region.id) || (p.originId == region.id)
                
                if (isIdMatch) return true
                
                // Text fallback if ID is missing but name matches
                const rName = region.name.toLowerCase()
                const pOrigin = String(p.origin || p.originName || "").toLowerCase()
                return pOrigin.includes(rName)
            })

            setParcels(regionParcels)
            
            const totalCount = (result as any).summary?.totalParcels || (result as any).pagination?.totalItems || regionParcels.length
            setTotalParcelsCount(totalCount)
            setParcelTotalPages((result as any).pagination?.totalPages || 1)
        } catch (error) {
            console.error("Failed to fetch scoped parcels:", error)
        } finally {
            setIsLoadingParcels(false)
        }
    }

    const openReceipt = (parcel: any) => {
        setSelectedParcelForReceipt(parcel)
        setShowingReceipt(true)
    }

    if (!region) return null

    const districtCount = districts.length || region.districts?.length || 0
    const officeCount = offices.length || region.districts?.reduce((acc: number, d: any) => acc + (d.bookingOffices?.length || d.booking_offices?.length || 0), 0) || 0

    const tabs = [
        { id: "details", label: tr("Details"), icon: InformationCircleIcon },
        { id: "districts", label: tr("Districts"), icon: Building03Icon, count: districtCount },
        { id: "offices", label: tr("Offices"), icon: MapsLocation01Icon, count: officeCount },
        { id: "parcels", label: tr("Parcels"), icon: Package01Icon, count: totalParcelsCount },
    ]

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-[#f1f3f6] dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("{name} Profile", { name: region.name })}</SheetTitle>
                    <SheetDescription>{tr("View region details and linked districts.")}</SheetDescription>
                </SheetHeader>
                
                {showingReceipt ? (
                    <ParcelReceipt 
                        parcel={selectedParcelForReceipt} 
                        onBack={() => setShowingReceipt(false)} 
                    />
                ) : (
                    <>
                        {/* ── Header ── */}
                        <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-16 rounded-[var(--ds-radius-large)] bg-[#242a37] text-white flex items-center justify-center font-semibold text-[22px] shadow-[var(--ds-shadow-raised)] overflow-hidden shrink-0 border border-white/5">
                                {region.country?.flagUrl ? (
                                    <img src={region.country.flagUrl} alt={region.country.name} className="size-full object-cover object-center scale-[1.05]" />
                                ) : (
                                    <Icon icon={MapsIcon} size={28} className="text-[#ffd428]" />
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                {onEdit && (
                                    <Button
                                        onClick={() => onEdit(region)}
                                        className="h-9 px-4 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                    >
                                        <Icon icon={MapsLocation01Icon} size={20} />{tr("Edit Record")}</Button>
                                )}
                                {onDelete && (
                                    <Button
                                        onClick={() => onDelete(region)}
                                        className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                    >
                                        <Icon icon={Cancel01Icon} size={20} />{tr("Deactivate")}</Button>
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
                                <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white flex items-center gap-3">
                                    {region.name}
                                    <Badge className="bg-[#ffd428]/10 text-[#ffd428] border-none font-mono text-[11px] uppercase font-semibold px-2 py-0.5 rounded-[6px]">
                                        {region.code || "REGION"}
                                    </Badge>
                                </h2>
                                <p className="text-white/50 text-xs font-semibold mt-2 flex items-center gap-2">
                                    <Icon icon={GlobeIcon} size={12} />
                                    {region.country?.name || tr("Global Registry")}{" "}{tr("Region")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto custom-scrollbar">
                        {tabs.map((tab) => (
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
                                {tab.count !== undefined && tab.count !== null && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[18px] text-center",
                                        activeTab === tab.id ? "bg-[#ffd428] text-[#242a37]" : "bg-white/10 text-white/40"
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                                <div className="p-8 space-y-8 pb-32 min-h-max">
                                    {activeTab === "details" && (
                                        <div className="space-y-8">
                                            {/* Highlights Grid */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                                                        <Icon icon={MapsIcon} size={16} className="text-[#ffd428]" />
                                                        <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Region")}</span>
                                                    </div>
                                                    <div className="text-3xl font-bold text-[#242a37] dark:text-white">{region.code || "RG"}</div>
                                                    <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Reference")}</div>
                                                </div>

                                                <div className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                                                        <Icon icon={Building03Icon} size={16} className="text-indigo-400" />
                                                        <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Districts")}</span>
                                                    </div>
                                                    <div className="text-3xl font-bold text-[#242a37] dark:text-white">{districtCount}</div>
                                                    <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Mapped")}</div>
                                                </div>

                                                <div className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                                                        <Icon icon={MapsLocation01Icon} size={16} className="text-teal-400" />
                                                        <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Offices")}</span>
                                                    </div>
                                                    <div className="text-3xl font-bold text-[#242a37] dark:text-white">{officeCount}</div>
                                                    <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Offices")}</div>
                                                </div>

                                                <div className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                                                        <Icon icon={Package01Icon} size={16} className="text-amber-400" />
                                                        <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Parcels")}</span>
                                                    </div>
                                                    <div className="text-3xl font-bold text-[#242a37] dark:text-white">{totalParcelsCount}</div>
                                                    <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Volume")}</div>
                                                </div>
                                            </div>

                                            <Accordion type="single" collapsible defaultValue="identity" className="w-full space-y-4">
                                                {/* Identity Info */}
                                                <AccordionItem value="identity" className="border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] overflow-hidden shadow-[var(--ds-shadow-raised)] data-[state=open]:border-[#ffd428]/30 transition-all">
                                                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors gap-3">
                                                        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-400 flex items-center gap-2 flex-1 text-left">
                                                            <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                                <Icon icon={InformationCircleIcon} size={12} />
                                                            </div>{tr("Region Identity")}</h3>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-6 pb-6 pt-2">
                                                        <div className="grid gap-3">
                                                            <div className="flex items-center justify-between p-4 rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] shadow-[var(--ds-shadow-raised)]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-8 rounded-lg bg-white dark:bg-[#1a1f2b] flex items-center justify-center text-slate-500">
                                                                        <Icon icon={MapsIcon} size={14} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-500">{tr("Standard Name")}</span>
                                                                </div>
                                                                <span className="text-[13px] font-semibold text-[#242a37] dark:text-white">{region.name}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between p-4 rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] shadow-[var(--ds-shadow-raised)]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-8 rounded-lg bg-white dark:bg-[#1a1f2b] flex items-center justify-center text-slate-500">
                                                                        <Icon icon={GlobeIcon} size={14} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-500">{tr("Parent Country")}</span>
                                                                </div>
                                                                <span className="text-[13px] font-semibold text-[#242a37] dark:text-white">{region.country?.name || "N/A"}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between p-4 rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] shadow-[var(--ds-shadow-raised)]">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-8 rounded-lg bg-white dark:bg-[#1a1f2b] flex items-center justify-center text-slate-500">
                                                                        <Icon icon={PinLocation01Icon} size={14} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-500">{tr("Internal Reference")}</span>
                                                                </div>
                                                                <Badge className="bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 border-none font-mono text-xs py-1">
                                                                    {region.uuid || region.id}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                {/* Audit Timeline */}
                                                <AccordionItem value="history" className="border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] overflow-hidden shadow-[var(--ds-shadow-raised)] data-[state=open]:border-[#ffd428]/30 transition-all">
                                                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors gap-3">
                                                        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-400 flex items-center gap-2 flex-1 text-left">
                                                            <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                                <Icon icon={Calendar03Icon} size={12} />
                                                            </div>{tr("System Audit")}</h3>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-6 pb-6 pt-2">
                                                        <div className="p-6 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                                            <div className="flex items-start gap-5">
                                                                <div className="relative flex flex-col items-center">
                                                                    <div className="h-3 w-3 rounded-full bg-[#ffd428]" />
                                                                    <div className="h-10 w-0.5 bg-slate-200 dark:bg-white/10 my-1" />
                                                                    <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-white/20" />
                                                                </div>
                                                                <div className="space-y-6 -mt-1">
                                                                    <div className="text-left">
                                                                        <p className="text-xs font-semibold text-slate-500 mb-1">{tr("Division Registered")}</p>
                                                                        <p className="text-[12px] font-bold text-[#242a37] dark:text-white">{region.createdAt || region.created_at ? format(new Date(region.createdAt || region.created_at), "MMMM dd, yyyy") : "N/A"}</p>
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="text-xs font-semibold text-slate-500 mb-1">{tr("Last updated")}</p>
                                                                        <p className="text-[12px] font-bold text-[#242a37] dark:text-white">{region.updatedAt || region.updated_at ? format(new Date(region.updatedAt || region.updated_at), "MMMM dd, yyyy") : "N/A"}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    )}

                                    {activeTab === "districts" && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between ml-1 text-left">
                                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-indigo-400 dark:text-indigo-400">
                                                        <Icon icon={Building03Icon} size={12} />
                                                    </div>{tr("Districts")}</h3>
                                            </div>
                                            <div className="grid gap-3">
                                                {isLoadingLocation ? (
                                                    <ListSkeleton rows={4} />
                                                ) : districts.length > 0 ? (
                                                    districts.map((district) => (
                                                        <div key={district.id} className="flex items-center justify-between p-4 rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] hover:border-indigo-400/30 transition-colors group cursor-default">
                                                            <div className="flex items-center gap-4 text-left">
                                                                <div className="size-10 rounded-[var(--ds-radius-small)] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-indigo-400 dark:text-indigo-400 group-hover:bg-indigo-400 group-hover:text-white transition-colors">
                                                                    <span className="text-xs font-semibold">{district.name.slice(0, 2)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[13px] font-semibold text-[#242a37] dark:text-white block">{district.name}</span>
                                                                    <span className="text-xs font-bold text-slate-400">{(district.bookingOffices?.length || district.booking_offices?.length || 0)}{" "}{tr("Active offices")}</span>
                                                                </div>
                                                            </div>
                                                            <Icon icon={ArrowUpRight01Icon} size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                                        <div className="size-16 rounded-[var(--ds-radius-large)] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
                                                            <Icon icon={Building03Icon} size={32} className="text-slate-300" />
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-400 leading-relaxed">{tr("No districts have been mapped for this regional division yet.")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "offices" && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between ml-1 text-left">
                                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-teal-400">
                                                        <Icon icon={MapsLocation01Icon} size={12} />
                                                    </div>{tr("Offices")}</h3>
                                            </div>
                                            <div className="grid gap-3">
                                                {isLoadingLocation ? (
                                                    <ListSkeleton rows={4} />
                                                ) : offices.length > 0 ? (
                                                    offices.map((office) => (
                                                        <div key={office.id} className="flex items-center justify-between p-4 rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] hover:border-teal-400/30 transition-colors group cursor-default">
                                                            <div className="flex items-center gap-4 text-left">
                                                                <div className="size-10 rounded-[var(--ds-radius-small)] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-teal-400 group-hover:bg-teal-400 group-hover:text-white transition-colors">
                                                                    <Icon icon={Building03Icon} size={16} />
                                                                </div>
                                                                <div>
                                                                    <span className="text-[13px] font-semibold text-[#242a37] dark:text-white block">{office.name}</span>
                                                                    <span className="text-xs font-bold text-slate-400">{office.district?.name || tr("Unknown District")}{" "}{tr("Hierarchy")}</span>
                                                                </div>
                                                            </div>
                                                            <Badge className="bg-teal-500/10 text-teal-500 border-none text-[11px] font-semibold px-2 py-1 uppercase">{tr("Active office")}</Badge>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                                        <div className="size-16 rounded-[var(--ds-radius-large)] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
                                                            <Icon icon={MapsLocation01Icon} size={32} className="text-slate-300" />
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-400 leading-relaxed">{tr("No offices have been added in this region.")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "parcels" && (
                                        <div className="space-y-6">
                                            <div className="relative">
                                                <Icon icon={Search01Icon} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input 
                                                    type="text" 
                                                    placeholder={tr("Search by parcel number…")} 
                                                    value={parcelSearch} 
                                                    onChange={(e) => { setParcelSearch(e.target.value); setParcelPage(1); }} 
                                                    className="w-full h-12 pl-12 bg-white dark:bg-[#1a1f2b] border-none rounded-[var(--ds-radius-small)] text-xs font-semibold shadow-[var(--ds-shadow-raised)] outline-none focus:ring-1 focus:ring-[#ffd428]/30" 
                                                />
                                            </div>

                                            {isLoadingParcels ? (
                                                <ListSkeleton rows={4} />
                                            ) : (
                                                <div className="space-y-2">
                                                    {parcels.length > 0 ? (
                                                        <>
                                                            {parcels.map((parcel) => (
                                                                <div 
                                                                    key={parcel.id} 
                                                                    onClick={() => openReceipt(parcel)}
                                                                    className="p-4 bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] group hover:border-[#ffd428]/30 transition-colors cursor-pointer text-left"
                                                                >
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="size-9 rounded-[var(--ds-radius-small)] bg-[#ffd428]/10 flex items-center justify-center text-[#ffd428]">
                                                                                <Icon icon={Package01Icon} size={18} />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[12px] font-semibold text-[#242a37] dark:text-white">{parcel.parcelNumber}</p>
                                                                                <p className="text-xs font-bold text-slate-400">{format(new Date(parcel.createdAt), "MMM dd, yyyy")}</p>
                                                                            </div>
                                                                        </div>
                                                                        <Badge className={cn(
                                                                            "h-6 px-3 rounded-full text-xs font-semibold border-none",
                                                                            parcel.status === "DELIVERED" ? "bg-emerald-500/10 text-emerald-500" :
                                                                            parcel.status === "DISPATCHED" ? "bg-blue-500/10 text-blue-500" :
                                                                            "bg-amber-500/10 text-amber-500"
                                                                        )}>
                                                                            {parcel.status}
                                                                        </Badge>
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-white/5">
                                                                        <div className="space-y-1">
                                                                            <p className="text-xs font-semibold text-slate-400">{tr("Sender")}</p>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{parcel.senderName || parcel.sender?.fullName || "INTERNAL"}</p>
                                                                        </div>
                                                                        <div className="space-y-1 text-right">
                                                                            <p className="text-xs font-semibold text-slate-400">{tr("Revenue")}</p>
                                                                            <p className="text-xs font-semibold text-emerald-500">{Number(parcel.amount || parcel.price || 0).toLocaleString()} TZS</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <SimplePagination page={parcelPage} totalPages={parcelTotalPages} setPage={setParcelPage} />
                                                        </>
                                                    ) : (
                                                        <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                                            <div className="size-16 rounded-[var(--ds-radius-large)] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
                                                                <Icon icon={Package01Icon} size={32} className="text-slate-300" />
                                                            </div>
                                                            <h3 className="text-[14px] font-semibold text-[#242a37] dark:text-white mb-2">{tr("No Parcel Data")}</h3>
                                                            <p className="text-xs font-semibold text-slate-400 leading-relaxed">{tr("No parcels recorded in this region for this period.")}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
                </>
                )}
            </SheetContent>
        </Sheet>
    )
}
