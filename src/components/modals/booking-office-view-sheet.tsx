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
    Building03Icon,
    PinLocation01Icon,
    MapsIcon,
    GlobeIcon,
    Activity01Icon,
    Calendar03Icon,
    InformationCircleIcon,
    Cancel01Icon,
    ArrowUpRight01Icon,
    Mail01Icon,
    SmartPhone01Icon,
    UserGroupIcon,
    PackageIcon,
    Location01Icon,
    PencilEdit01Icon
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

interface BookingOfficeViewSheetProps {
    isOpen: boolean
    onClose: () => void
    office: any | null
    onEdit?: (office: any) => void
    onDelete?: (office: any) => void
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

export function BookingOfficeViewSheet({ isOpen, onClose, office, onEdit, onDelete }: BookingOfficeViewSheetProps) {
    const tr = useTr()
    // The office list returns `district` and `region` side by side (no
    // district.region, no country); resolve the country from the cached
    // regions list, which includes each region's country.
    const { data: allRegions = [] } = useQuery({
        queryKey: ["regions-all-for-mapping"],
        queryFn: async () => getRegions(),
        enabled: isOpen,
        staleTime: 10 * 60_000,
    })
    const officeRegionId = Number(office?.regionId ?? office?.region?.id ?? office?.district?.region_id ?? office?.district?.regionId)
    const officeRegion = office?.district?.region ?? (allRegions as any[]).find((r) => Number(r.id) === officeRegionId) ?? office?.region
    const regionName: string = officeRegion?.name || office?.region?.name || office?.regionName || "—"
    const officeCountry = officeRegion?.country ?? office?.region?.country ?? (office?.countryName && office.countryName !== "—" ? { name: office.countryName, flagUrl: office.flagUrl } : null)
    const districtName: string = office?.district?.name || office?.districtName || "—"
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
        } else if (office) {
            fetchParcels()
        }
    }, [isOpen, office])

    React.useEffect(() => {
        if (isOpen && office && activeTab === "parcels") {
            const delayDebounceFn = setTimeout(() => {
                fetchParcels()
            }, parcelSearch ? 300 : 0)
            return () => clearTimeout(delayDebounceFn)
        }
    }, [activeTab, parcelPage, parcelSearch])

    const fetchParcels = async () => {
        if (!office) return
        try {
            setIsLoadingParcels(true)
            const result = await getParcels({
                page: parcelPage,
                perPage: 10,
                search: parcelSearch,
                originOfficeId: office.id,
                originId: office.id
            })
            
            const apiData = (result as any).data?.parcels || result.data || []
            
            const officeParcels = apiData.filter((p: any) => {
                const isIdMatch = (p.originOfficeId == office.id) || (p.originId == office.id) || (p.origin_office_id == office.id)
                if (isIdMatch) return true
                const oName = office.name.toLowerCase()
                const pOrigin = String(p.origin || p.originName || "").toLowerCase()
                return pOrigin.includes(oName)
            })

            setParcels(officeParcels)
            const totalCount = (result as any).summary?.totalParcels || (result as any).pagination?.totalItems || officeParcels.length
            setTotalParcelsCount(totalCount)
            setParcelTotalPages((result as any).pagination?.totalPages || 1)
        } catch (error) {
            console.error("Failed to fetch office parcels:", error)
        } finally {
            setIsLoadingParcels(false)
        }
    }

    const openReceipt = (parcel: any) => {
        setSelectedParcelForReceipt(parcel)
        setShowingReceipt(true)
    }
    if (!office) return null

    const agentCount = office.agents?.length || 0
    const parcelCount = office.parcels?.length || 0

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-[#f1f3f6] dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("{name} Profile", { name: office.name })}</SheetTitle>
                    <SheetDescription>{tr("Office details and activity.")}</SheetDescription>
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
                                {officeCountry?.flagUrl ? (
                                    <img src={officeCountry.flagUrl} alt={officeCountry.name} className="size-full object-cover" />
                                ) : (
                                    <Icon icon={Building03Icon} size={28} className="text-[#ffd428]" />
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                {onEdit && (
                                    <Button
                                        onClick={() => onEdit(office)}
                                        className="h-9 px-4 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                    >
                                        <Icon icon={PencilEdit01Icon} size={20} />{tr("Edit office")}</Button>
                                )}
                                {onDelete && (
                                    <Button
                                        onClick={() => onDelete(office)}
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
                                    {office.name}
                                    <Badge className="bg-[#ffd428]/10 text-[#ffd428] border-none font-mono text-[11px] uppercase font-semibold px-2 py-0.5 rounded-[6px]">
                                        {office.code || "HUB"}
                                    </Badge>
                                </h2>
                                <p className="text-white/50 text-xs font-semibold mt-2 flex items-center gap-2">
                                    <Icon icon={PinLocation01Icon} size={12} />
                                    {districtName}, {regionName}{officeCountry?.name ? `, ${officeCountry.name}` : ""}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto custom-scrollbar">
                        {[
                            { id: "details", label: tr("Details"), icon: InformationCircleIcon },
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
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]"
                            >
                                <div className="flex items-center gap-2 text-slate-400 mb-3">
                                    <Icon icon={UserGroupIcon} size={16} className="text-[#ffd428]" />
                                    <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Active Agents")}</span>
                                </div>
                                <div className="text-3xl font-bold text-[#242a37] dark:text-white">{agentCount}</div>
                                <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Verified Workforce")}</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="p-6 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]"
                            >
                                <div className="flex items-center gap-2 text-slate-400 mb-3">
                                    <Icon icon={PackageIcon} size={16} className="text-blue-400" />
                                    <span className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Volume")}</span>
                                </div>
                                <div className="text-3xl font-bold text-[#242a37] dark:text-white">{parcelCount}</div>
                                <div className="text-xs text-slate-400 mt-2 font-bold">{tr("Parcels")}</div>
                            </motion.div>
                        </div>

                        {/* Territorial Context */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                    <Icon icon={MapsIcon} size={12} />
                                </div>{tr("Station Profile")}</h3>
                            <div className="p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 leading-none mb-2">{tr("Country")}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded bg-white dark:bg-[#1a1f2b] flex items-center justify-center shadow-[var(--ds-shadow-raised)] border border-white/5 overflow-hidden">
                                                {officeCountry?.flagUrl ? (
                                                   <img src={officeCountry.flagUrl} alt={tr("Flag")} className="size-full object-cover" />
                                                ) : (
                                                   <Icon icon={GlobeIcon} size={12} className="text-[#ffd428]" />
                                                )}
                                            </div>
                                            <span className="text-[12px] font-semibold">{officeCountry?.name || "—"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 leading-none mb-2">{tr("Region")}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded bg-slate-100 dark:bg-white/5 flex items-center justify-center text-amber-500">
                                                <Icon icon={MapsIcon} size={12} />
                                            </div>
                                            <span className="text-[12px] font-semibold">{regionName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 border-l border-slate-100 dark:border-white/5 pl-6">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 leading-none mb-2">{tr("District")}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded bg-slate-100 dark:bg-white/5 flex items-center justify-center text-indigo-500">
                                                <Icon icon={PinLocation01Icon} size={12} />
                                            </div>
                                            <span className="text-[12px] font-semibold">{office.district?.name || "N/A"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 leading-none mb-2">{tr("Status")}</p>
                                        <Badge className={cn("mt-1 border-none font-semibold text-xs px-3 py-1", office.isActive !== false ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                            {office.isActive !== false ? "OPERATIONAL" : "INACTIVE"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                                                        </div>
                                                    </>
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
                                                    <p className="text-xs font-semibold text-slate-400 leading-relaxed">{tr("No parcels recorded at this office for this period.")}</p>
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
