"use client"
import { Icon } from "@/components/ui/icon"

import React from "react"
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
    PinLocation01Icon,
    MapsIcon,
    GlobeIcon,
    Activity01Icon,
    Calendar03Icon,
    Building03Icon,
    InformationCircleIcon,
    Cancel01Icon,
    ArrowUpRight01Icon,
    MapsLocation01Icon,
    Location01Icon,
} from "@hugeicons/core-free-icons"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { getParcels } from "@/lib/services/parcel"
import { useQuery } from "@tanstack/react-query"
import { getRegions } from "@/lib/services/location"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ParcelReceipt } from "@/components/modals/parcel-receipt"
import { Search01Icon, Package01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { ListSkeleton } from "@/components/ui/skeletons"
import { useTr } from "@/lib/i18n/portal"

interface DistrictViewSheetProps {
    isOpen: boolean
    onClose: () => void
    district: any | null
    onEdit?: (district: any) => void
    onDelete?: (district: any) => void
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

export function DistrictViewSheet({ isOpen, onClose, district, onEdit, onDelete }: DistrictViewSheetProps) {
    const tr = useTr()
    // Districts come with their region but not the region's country;
    // resolve it from the cached regions list (which includes the country).
    const { data: allRegions = [] } = useQuery({
        queryKey: ["regions-all-for-mapping"],
        queryFn: async () => getRegions(),
        enabled: isOpen,
        staleTime: 10 * 60_000,
    })
    const districtRegionId = Number(district?.region_id ?? district?.regionId ?? district?.region?.id)
    const districtRegion = (allRegions as any[]).find((r) => Number(r.id) === districtRegionId) ?? district?.region
    const districtCountry = district?.region?.country ?? districtRegion?.country ?? (district?.countryName && district.countryName !== "—" ? { name: district.countryName, flagUrl: district.flagUrl } : null)
    const districtRegionName: string = district?.region?.name || districtRegion?.name || district?.regionName || "—"
    const [activeTab, setActiveTab] = React.useState("details")
    const [parcels, setParcels] = React.useState<any[]>([])
    const [isLoadingParcels, setIsLoadingParcels] = React.useState(false)
    const [parcelSearch, setParcelSearch] = React.useState("")
    const [parcelPage, setParcelPage] = React.useState(1)
    const [parcelTotalPages, setParcelTotalPages] = React.useState(1)
    const [totalParcelsCount, setTotalParcelsCount] = React.useState(0)
    const [showingReceipt, setShowingReceipt] = React.useState(false)
    const [selectedParcelForReceipt, setSelectedParcelForReceipt] = React.useState<any>(null)

    React.useEffect(() => {
        if (!isOpen) {
            setActiveTab("details")
            setParcels([])
            setParcelSearch("")
            setShowingReceipt(false)
        } else if (district) {
            fetchParcels()
        }
    }, [isOpen, district])

    React.useEffect(() => {
        if (isOpen && district && activeTab === "parcels") {
            const delayDebounceFn = setTimeout(() => {
                fetchParcels()
            }, parcelSearch ? 300 : 0)
            return () => clearTimeout(delayDebounceFn)
        }
    }, [activeTab, parcelPage, parcelSearch])

    const fetchParcels = async () => {
        if (!district) return
        try {
            setIsLoadingParcels(true)
            const result = await getParcels({
                page: parcelPage,
                perPage: 10,
                search: parcelSearch,
                originDistrictId: district.id
            })
            
            const apiData = (result as any).data?.parcels || result.data || []
            
            const districtParcels = apiData.filter((p: any) => {
                const isIdMatch = (p.originDistrictId == district.id) || (p.origin_district_id == district.id) || (p.districtId == district.id)
                if (isIdMatch) return true
                const dName = district.name.toLowerCase()
                const pOrigin = String(p.origin || p.originName || "").toLowerCase()
                return pOrigin.includes(dName)
            })

            setParcels(districtParcels)
            const totalCount = (result as any).summary?.totalParcels || (result as any).pagination?.totalItems || districtParcels.length
            setTotalParcelsCount(totalCount)
            setParcelTotalPages((result as any).pagination?.totalPages || 1)
        } catch (error) {
            console.error("Failed to fetch district parcels:", error)
        } finally {
            setIsLoadingParcels(false)
        }
    }

    const openReceipt = (parcel: any) => {
        setSelectedParcelForReceipt(parcel)
        setShowingReceipt(true)
    }
    if (!district) return null

    const officeCount = district.bookingOffices?.length || district.booking_offices?.length || 0

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-[#f1f3f6] dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("{name} Profile", { name: district.name })}</SheetTitle>
                    <SheetDescription>{tr("District details and its booking offices.")}</SheetDescription>
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
                                        {districtCountry?.flagUrl ? (
                                            <img src={districtCountry.flagUrl} alt={districtCountry.name} className="size-full object-cover" />
                                        ) : (
                                            <Icon icon={PinLocation01Icon} size={28} className="text-[#ffd428]" />
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        {onEdit && (
                                            <Button
                                                onClick={() => onEdit(district)}
                                                className="h-9 px-4 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                            >
                                                <Icon icon={MapsLocation01Icon} size={20} />{tr("Edit District")}</Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                onClick={() => onDelete(district)}
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
                                            {district.name}
                                            <Badge className="bg-[#ffd428]/10 text-[#ffd428] border-none font-mono text-[11px] uppercase font-semibold px-2 py-0.5 rounded-[6px]">
                                                DISTRICT
                                            </Badge>
                                        </h2>
                                        <p className="text-white/50 text-xs font-semibold mt-2 flex items-center gap-2">
                                            <Icon icon={MapsIcon} size={12} />
                                            {districtRegionName}{districtCountry?.name ? `, ${districtCountry.name}` : ""}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto custom-scrollbar">
                                {[
                                    { id: "details", label: tr("Details"), icon: InformationCircleIcon },
                                    { id: "offices", label: tr("Offices"), icon: Building03Icon, count: officeCount },
                                    { id: "parcels", label: tr("Parcels"), icon: Package01Icon, count: totalParcelsCount },
                                ].map((tab) => (
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
                                        {tab.count !== undefined && (
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
                                    <ScrollArea className="flex-1 bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                                        <div className="p-8 space-y-8 pb-32">
                                            {activeTab === "details" && (
                                                <>
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]"
                            >
                                <div className="flex items-center gap-2 text-slate-400 mb-3">
                                    <Icon icon={Building03Icon} size={16} className="text-[#ffd428]" />
                                    <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Booking Offices")}</span>
                                </div>
                                <div className="text-3xl font-bold text-[#242a37] dark:text-white">{officeCount}</div>
                                <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Booking offices")}</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]"
                            >
                                <div className="flex items-center gap-2 text-slate-400 mb-3">
                                    <Icon icon={Activity01Icon} size={16} className="text-emerald-400" />
                                    <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Office status")}</span>
                                </div>
                                <Badge className="mt-1 bg-emerald-500/10 text-emerald-500 border-none font-semibold text-[11px] uppercase px-3 py-1">OPERATIONAL</Badge>
                                <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Status")}</div>
                            </motion.div>
                        </div>

                        {/* Breadcrumbs / hierarchy */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                    <Icon icon={MapsIcon} size={12} />
                                </div>{tr("Hierarchy Profile")}</h3>
                            <div className="p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] bg-white dark:bg-[#1a1f2b] flex items-center justify-center shadow-[var(--ds-shadow-raised)] border border-white/5 overflow-hidden">
                                           {districtCountry?.flagUrl ? (
                                               <img src={districtCountry.flagUrl} alt={tr("Flag")} className="size-full object-cover" />
                                           ) : (
                                               <Icon icon={GlobeIcon} size={18} className="text-[#ffd428]" />
                                           )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 leading-none mb-1">{tr("Country")}</p>
                                            <p className="text-[13px] font-semibold text-[#242a37] dark:text-white">{districtCountry?.name || "—"}</p>
                                        </div>
                                    </div>
                                    <Icon icon={ArrowUpRight01Icon} size={18} className="text-slate-300 dark:text-slate-600" />
                                </div>
                                <Separator className="bg-slate-100 dark:bg-white/5" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] bg-slate-100 dark:bg-white/5 text-slate-500 flex items-center justify-center">
                                            <Icon icon={MapsIcon} size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 leading-none mb-1">{tr("Region")}</p>
                                            <p className="text-[13px] font-semibold text-[#242a37] dark:text-white">{districtRegionName}</p>
                                        </div>
                                    </div>
                                    <Icon icon={ArrowUpRight01Icon} size={18} className="text-slate-300 dark:text-slate-600" />
                                </div>
                            </div>
                        </div>
                                </>
                            )}

                            {activeTab === "offices" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between ml-1">
                                        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                            <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                <Icon icon={Building03Icon} size={12} />
                                            </div>{tr("Active offices")}</h3>
                                    </div>
                                    <div className="grid gap-3">
                                        {(district.bookingOffices || district.booking_offices)?.map((office: any) => (
                                            <div key={office.id} className="flex items-center justify-between p-4 rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] hover:border-[#ffd428]/30 transition-colors group cursor-default">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-[var(--ds-radius-small)] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[#242a37] dark:text-white group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">
                                                        <Icon icon={Location01Icon} size={18} />
                                                    </div>
                                                    <span className="text-[13px] font-semibold text-[#242a37] dark:text-white">{office.name}</span>
                                                </div>
                                                <Badge className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-none text-[11px] font-semibold px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity uppercase font-mono">
                                                    {office.code || "REGISTRY"}
                                                </Badge>
                                            </div>
                                        ))}
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
                                                    <p className="text-xs font-semibold text-slate-400 leading-relaxed">{tr("No parcels recorded in this district for this period.")}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </motion.div>
                </AnimatePresence>
                </div>
                </>
                )}
            </SheetContent>
        </Sheet>
    )
}
