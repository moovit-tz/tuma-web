"use client"
import { Icon } from "@/components/ui/icon"

import { useState, useEffect, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/components/ui/use-toast"
import { getCompany, getCompanyVehicles, getCompanyAllAgents } from "@/lib/services/company"
import { getAllAgentsWithCounts } from "@/lib/services/user"
import { useQuery } from "@tanstack/react-query"
import {
    SHEET_CARD,
    SheetSection,
    DetailList,
    StatGrid,
    SheetEmpty,
    SheetPager,
    SheetLozenge,
} from "@/components/sheets/sheet-blocks"
import { getParcels } from "@/lib/services/parcel"
import { useTrackParcel } from "@/hooks/use-track-parcel"
import {
    Building03Icon,
    ContactIcon,
    Mail01Icon,
    GridViewIcon,
    UserGroupIcon,
    TruckIcon,
    PencilEdit01Icon,
    Cancel01Icon,
    Activity01Icon,
    ViewIcon,
    CheckListIcon,
    UserAdd01Icon,
    Add01Icon,
    Package01Icon,
    Search01Icon,
    RefreshIcon,
    Chart01Icon,
    ChampionIcon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    ArrowUpRight01Icon,
    Delete02Icon,
    Location01Icon,
    Settings01Icon,
    Message01Icon,
    Contact01Icon,
    Clock01Icon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    GlobalIcon,
    MoneyReceive01Icon,
} from "@hugeicons/core-free-icons"
import type { Company } from "@/types/company"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { CompanyForm } from "./company-modal"
import { ListSkeleton } from "@/components/ui/skeletons"
import { useTr } from "@/lib/i18n/portal"
import { ExportMenu } from "@/components/export/export-menu"



export interface CompanyViewModalProps {
    open: boolean
    onClose: () => void
    company: Company | null
    onEdit?: (company: Company) => void
    onUpdate?: (id: number, data: any) => Promise<void>
    onDelete?: (company: Company) => void
    onDeactivate?: (company: Company) => void
    onAddVehicle?: (company: Company) => void
    onAddAgent?: (company: Company) => void
    mode?: "view" | "delete" | "edit"
}

export function CompanyViewModal({ 
    open, 
    onClose, 
    company, 
    onEdit, 
    onUpdate,
    onDelete,
    onDeactivate,
    onAddVehicle,
    onAddAgent,
    mode = "view"
}: CompanyViewModalProps) {
    const tr = useTr()
    const [companyDetails, setCompanyDetails] = useState<Company | null>(null)
    const [vehicles, setVehicles] = useState<any[]>([])
    const [agents, setAgents] = useState<any[]>([])
    const [parcels, setParcels] = useState<any[]>([])
    
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
    const [isLoadingAgents, setIsLoadingAgents] = useState(false)
    const [isLoadingParcels, setIsLoadingParcels] = useState(false)
    
    const [activeTab, setActiveTab] = useState("details")
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    
    const [vehicleSearch, setVehicleSearch] = useState("")
    const [agentSearch, setAgentSearch] = useState("")
    const [parcelSearch, setParcelSearch] = useState("")

    const [vehiclePage, setVehiclePage] = useState(1)
    const [agentPage, setAgentPage] = useState(1)
    const [parcelPage, setParcelPage] = useState(1)
    const [parcelTotalPages, setParcelTotalPages] = useState(1)
    const [totalParcelsCount, setTotalParcelsCount] = useState(0)

    const [selectedVehicleId, setSelectedVehicleId] = useState<string | number | null>(null)
    const [selectedAgentId, setSelectedAgentId] = useState<string | number | null>(null)
    const [selectedParcelNumber, setSelectedParcelNumber] = useState<string | null>(null)
    const { trackParcel, parcelData: trackedParcel, isLoading: isTrackingParcel, error: trackingError, resetTracking } = useTrackParcel()

    useEffect(() => {
        if (selectedParcelNumber) {
            trackParcel(selectedParcelNumber)
        }
    }, [selectedParcelNumber])

    const targetId = (company as any)?.companyId || company?.id

    useEffect(() => {
        if (open && targetId) {
            setVehicles([])
            setAgents([])
            setParcels([])
            setVehiclePage(1)
            setAgentPage(1)
            setParcelPage(1)
            setParcelSearch("")
            setSelectedVehicleId(null)
            setSelectedAgentId(null)
            setSelectedParcelNumber(null)
            resetTracking()
            
            fetchCompanyDetails()
            fetchVehicles()
            fetchAgents()
            fetchParcels(1, "")

            if (mode === "edit") setIsEditing(true)
            if (mode === "delete") setIsDeleting(true)
        } else {
            setIsEditing(false)
            setIsDeleting(false)
            setActiveTab("details")
        }
    }, [open, targetId, mode])

    useEffect(() => {
        if (open && targetId) {
            const delayDebounceFn = setTimeout(() => {
                fetchParcels(parcelPage, parcelSearch)
            }, parcelSearch ? 300 : 0)
            return () => clearTimeout(delayDebounceFn)
        }
    }, [parcelPage, parcelSearch])

    const fetchCompanyDetails = async () => {
        if (!targetId) return
        try {
            setIsLoading(true)
            const companyData = await getCompany(targetId)
            setCompanyDetails(companyData)
        } catch (error: any) {
            setCompanyDetails(company)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchVehicles = async () => {
        if (!targetId) return
        try {
            setIsLoadingVehicles(true)
            const response = await getCompanyVehicles(targetId)
            setVehicles(response || [])
        } catch (error: any) {
            setVehicles([])
        } finally {
            setIsLoadingVehicles(false)
        }
    }

    const fetchAgents = async () => {
        if (!targetId) return
        try {
            setIsLoadingAgents(true)
            const response = await getCompanyAllAgents(targetId)
            setAgents(response || [])
        } catch (error: any) {
            setAgents([])
        } finally {
            setIsLoadingAgents(false)
        }
    }

    const fetchParcels = async (page = parcelPage, search = parcelSearch) => {
        if (!targetId) return
        try {
            setIsLoadingParcels(true)
            const response = await getParcels({ companyId: Number(targetId), search, page, perPage: 10 })
            setParcels(response.data?.parcels || [])
            setParcelTotalPages(response.data?.pagination?.totalPages || 1)
            setTotalParcelsCount(response.data?.pagination?.totalItems || 0)
        } catch (error: any) {
            setParcels([])
        } finally {
            setIsLoadingParcels(false)
        }
    }

    const displayCompany = companyDetails || company
    
    const filteredVehicles = vehicles.filter(v => 
        (v.plateNumber || v.registrationNumber || "").toLowerCase().includes(vehicleSearch.toLowerCase()) || 
        (v.model?.name || "").toLowerCase().includes(vehicleSearch.toLowerCase())
    )

    const filteredAgents = agents.filter(a => 
        (a.fullName || "").toLowerCase().includes(agentSearch.toLowerCase()) || 
        (a.username || "").toLowerCase().includes(agentSearch.toLowerCase()) ||
        (a.phoneNumber || "").toLowerCase().includes(agentSearch.toLowerCase())
    )

    // All-time parcels booked per agent, from the same cached list the
    // Agents page uses (one request) — not a sample of the company's parcels.
    const { data: agentsWithCounts, isPending: isLoadingAgentCounts } = useQuery({
        queryKey: ["agents-with-counts"],
        queryFn: getAllAgentsWithCounts,
        enabled: open,
        staleTime: 1000 * 60 * 10,
    })
    const parcelCountById = useMemo(() => {
        const m = new Map<number, number>()
        for (const a of agentsWithCounts ?? []) m.set(Number(a.id), Number((a as any).parcelCounts?.receivedParcels) || 0)
        return m
    }, [agentsWithCounts])
    const agentParcelCount = (agent: any): number | null => {
        if (!agentsWithCounts) return null
        return parcelCountById.get(Number(agent?.userId ?? agent?.id)) ?? 0
    }

    const agentRankings = useMemo(() => {
        if (!agentsWithCounts) return []
        return agents
            .map((a: any) => ({ id: a.id, fullName: a.fullName, isActive: a.isActive, parcelCount: parcelCountById.get(Number(a.userId ?? a.id)) ?? 0 }))
            .sort((a, b) => b.parcelCount - a.parcelCount)
    }, [agents, agentsWithCounts, parcelCountById])
    const topAgents = agentRankings.filter((a) => a.parcelCount > 0).slice(0, 5)
    const lowAgents = agentRankings.filter((a) => a.isActive).slice(-5).reverse()
    const activeAgentCount = agents.filter((a: any) => a.isActive).length

    const formatDay = (d?: string | null) => {
        if (!d) return "—"
        const date = new Date(d)
        return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    }
    const formatRole = (role?: string | null) =>
        role ? String(role).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Agent"

    const tabData = [
        { id: "details", label: tr("details"), count: null },
        { id: "vehicles", label: tr("vehicles"), count: vehicles.length },
        { id: "agents", label: tr("agents"), count: agents.length },
        { id: "parcels", label: tr("parcels"), count: totalParcelsCount || parcels.length },
    ]

    const PAGE_SIZE = 10
    const displayedVehicles = filteredVehicles.slice((vehiclePage - 1) * PAGE_SIZE, vehiclePage * PAGE_SIZE)
    const vehicleTotalPages = Math.ceil(filteredVehicles.length / PAGE_SIZE)

    const displayedAgents = filteredAgents.slice((agentPage - 1) * PAGE_SIZE, agentPage * PAGE_SIZE)
    const agentTotalPages = Math.ceil(filteredAgents.length / PAGE_SIZE)

    if (!displayCompany) return null

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Company Details")}</SheetTitle>
                    <SheetDescription>{tr("View detailed information and performance metrics for this company.")}</SheetDescription>
                </SheetHeader>
                
                {isEditing || isDeleting ? (
                    <CompanyForm 
                        company={displayCompany}
                        mode={isDeleting ? "delete" : "edit"}
                        onClose={() => {
                            setIsEditing(false)
                            setIsDeleting(false)
                        }}
                        onSubmit={async (values) => {
                            if (onUpdate && targetId) {
                                await onUpdate(Number(targetId), values)
                                await fetchCompanyDetails()
                            } else if (onEdit) {
                                await (onEdit as any)(values)
                            }
                            setIsEditing(false)
                        }}
                        onDelete={async (company, data) => {
                            if (data?.permanent) {
                                if (onDelete) await onDelete(company)
                            } else {
                                if (onDeactivate) await onDeactivate(company)
                                else if (onUpdate && targetId) await onUpdate(Number(targetId), { isActive: false })
                                await fetchCompanyDetails()
                            }
                            setIsEditing(false)
                            setIsDeleting(false)
                        }}
                    />
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* ── Header ── */}
                        <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                            
                            <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                                <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                    <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                        {displayCompany.logoUrl ? (
                                            <img src={displayCompany.logoUrl} alt={displayCompany.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Icon icon={Building03Icon} size={28} className="text-[#ffd428]" />
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        <ExportMenu
                                            label={tr("Report")}
                                            filename={`company-${String(displayCompany.name || displayCompany.id).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                                            title={tr("Company report · {name}", { name: displayCompany.name })}
                                            subtitle={[displayCompany.phoneNumber, displayCompany.email, displayCompany.tin && `TIN ${displayCompany.tin}`, tr("Agents and their all-time parcels")].filter(Boolean).join(" · ")}
                                            rows={agents.map((a: any) => ({ ...a, parcels: agentParcelCount(a) ?? 0 })).sort((a: any, b: any) => b.parcels - a.parcels)}
                                            columns={[
                                                [tr("Agent"), (a: any) => a.fullName || a.username],
                                                [tr("Username"), (a: any) => a.username ?? ""],
                                                [tr("Phone"), (a: any) => a.phoneNumber ?? ""],
                                                [tr("Role"), (a: any) => formatRole(a.role ?? a.roles?.[0]?.name)],
                                                [tr("Status"), (a: any) => (a.isActive ? tr("Active") : tr("Inactive"))],
                                                [tr("All-time parcels"), (a: any) => a.parcels],
                                            ]}
                                            summary={(rows: any[]) => [
                                                [tr("Status"), displayCompany.isActive === false ? tr("Inactive") : tr("Active")],
                                                [tr("Agents"), tr("{active} of {total} active", { active: rows.filter((a) => a.isActive).length, total: rows.length })],
                                                [tr("Vehicles"), vehicles.length.toLocaleString()],
                                                [tr("Parcels"), (totalParcelsCount || parcels.length).toLocaleString()],
                                            ]}
                                            disabled={!agents.length}
                                            className="h-9 border-none bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                        />
                                        {onEdit && (
                                            <Button
                                                onClick={() => setIsEditing(true)}
                                                className="h-9 px-4 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                            >
                                                <Icon icon={PencilEdit01Icon} size={20} />{tr("Edit")}</Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                onClick={() => setIsDeleting(true)}
                                                className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                            >
                                                <Icon icon={Delete02Icon} size={20} />{tr("Delete Company")}</Button>
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
                                        <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">{displayCompany.name}</h2>
                                        <p className="text-white/50 text-xs font-semibold mt-2">
                                            {tr("Company ID: #{padStart}", { padStart: String(targetId).padStart(4, '0') })}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn(
                                            "h-7 px-3 rounded-[var(--ds-radius-large)] text-xs font-semibold border-none shadow-[var(--ds-shadow-raised)] flex items-center justify-center translate-y-[2px]",
                                            displayCompany.isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                        )}>
                                            {displayCompany.isActive ? "ACTIVE" : "INACTIVE"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto custom-scrollbar">
                                {[
                                    { id: "details", label: tr("Info"), icon: Building03Icon },
                                    { id: "vehicles", label: tr("Fleet"), icon: TruckIcon, count: vehicles.length },
                                    { id: "agents", label: tr("Agents"), icon: UserGroupIcon, count: agents.length },
                                    { id: "parcels", label: tr("Parcels"), icon: Package01Icon, count: totalParcelsCount || parcels.length },
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

                        {/* ── Content ── */}
                        <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                            <div className="space-y-6 pb-10">
                                {/* ════════ INFO ════════ */}
                                {activeTab === "details" && (
                                    <>
                                        <StatGrid
                                            columns={3}
                                            tiles={[
                                                { label: tr("Parcels"), value: totalParcelsCount.toLocaleString(), hint: tr("All time"), emphasis: true },
                                                { label: tr("Agents"), value: agents.length.toLocaleString(), hint: tr("{activeAgentCount} active", { activeAgentCount: activeAgentCount.toLocaleString() }) },
                                                { label: tr("Vehicles"), value: vehicles.length.toLocaleString(), hint: tr("{v} active", { v: vehicles.filter((v: any) => v.isActive).length.toLocaleString() }) },
                                            ]}
                                        />

                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            <SheetSection title={tr("Company")} icon={Building03Icon}>
                                                <DetailList
                                                    rows={[
                                                        { label: tr("Name"), value: displayCompany.name },
                                                        { label: tr("Code"), value: (displayCompany as any).code || "—", mono: true },
                                                        { label: "TIN", value: displayCompany.tin || "—", mono: true },
                                                        { label: tr("Address"), value: displayCompany.address || "—" },
                                                        { label: tr("Joined"), value: formatDay((displayCompany as any).createdAt) },
                                                    ]}
                                                />
                                            </SheetSection>
                                            <SheetSection title={tr("Contact")} icon={ContactIcon}>
                                                <DetailList
                                                    rows={[
                                                        { label: tr("Phone"), value: displayCompany.phoneNumber || "—", mono: true },
                                                        { label: tr("Email"), value: displayCompany.email ? displayCompany.email.toLowerCase() : "—" },
                                                        { label: tr("Help desk"), value: displayCompany.helpDeskPhoneNumber || "—", mono: true },
                                                    ]}
                                                />
                                            </SheetSection>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            <SheetSection title={tr("Most parcels booked")} icon={ArrowUp01Icon}>
                                                {isLoadingAgentCounts ? (
                                                    <ListSkeleton rows={3} />
                                                ) : topAgents.length === 0 ? (
                                                    <SheetEmpty title={tr("No bookings yet")} description={tr("None of this company's agents has booked a parcel.")} />
                                                ) : (
                                                    <AgentRankList agents={topAgents} onOpen={(id) => { setActiveTab("agents"); setSelectedAgentId(id) }} />
                                                )}
                                            </SheetSection>
                                            <SheetSection title={tr("Fewest parcels booked")} icon={ArrowDown01Icon}>
                                                {isLoadingAgentCounts ? (
                                                    <ListSkeleton rows={3} />
                                                ) : lowAgents.length === 0 ? (
                                                    <SheetEmpty title={tr("No active agents")} />
                                                ) : (
                                                    <AgentRankList agents={lowAgents} onOpen={(id) => { setActiveTab("agents"); setSelectedAgentId(id) }} />
                                                )}
                                            </SheetSection>
                                        </div>

                                        <SheetSection title={tr("SMS and booking")} icon={Message01Icon}>
                                            <DetailList
                                                rows={[
                                                    { label: tr("SMS sender ID"), value: displayCompany.smsSender || "MySAFARI (default)", mono: true },
                                                    {
                                                        label: tr("Pick a vehicle when receiving parcels"),
                                                        value: (displayCompany as any).showVehicleOnReceive ? "On" : "Off",
                                                    },
                                                ]}
                                            />
                                        </SheetSection>
                                    </>
                                )}

                                {/* ════════ FLEET ════════ */}
                                {activeTab === "vehicles" && (
                                    selectedVehicleId ? (
                                        (() => {
                                            const v = vehicles.find((v: any) => v.id === selectedVehicleId)
                                            return (
                                                <>
                                                    <BackLink label={tr("All vehicles")} onClick={() => setSelectedVehicleId(null)} />
                                                    {v && (
                                                        <SheetSection title={tr("Vehicle")} icon={TruckIcon}>
                                                            <DetailList
                                                                rows={[
                                                                    { label: tr("Plate"), value: v.plateNumber || v.registrationNumber || "—", mono: true },
                                                                    { label: tr("Name"), value: v.name || "—" },
                                                                    { label: tr("Make"), value: [v.brand?.name, v.model?.name].filter(Boolean).join(" · ") || "—" },
                                                                    { label: tr("Fleet type"), value: v.fleetType?.name || "—" },
                                                                    { label: tr("Seats"), value: v.capacity ? String(v.capacity) : "—" },
                                                                    { label: tr("Status"), value: <SheetLozenge status={v.isActive ? "ACTIVE" : "INACTIVE"} /> },
                                                                ]}
                                                            />
                                                        </SheetSection>
                                                    )}
                                                </>
                                            )
                                        })()
                                    ) : (
                                        <SheetSection
                                            title={tr("Vehicles · {filteredVehicles}", { filteredVehicles: filteredVehicles.length.toLocaleString() })}
                                            icon={TruckIcon}
                                            action={<SheetSearch value={vehicleSearch} placeholder={tr("Plate or model")} onChange={(v) => { setVehicleSearch(v); setVehiclePage(1) }} />}
                                        >
                                            {isLoadingVehicles ? (
                                                <ListSkeleton rows={4} />
                                            ) : displayedVehicles.length === 0 ? (
                                                <>
                                                    <SheetEmpty
                                                        icon={TruckIcon}
                                                        title={vehicleSearch ? tr("No matching vehicles") : tr("No vehicles yet")}
                                                        description={vehicleSearch ? tr("Try another plate or model.") : tr("This company hasn't registered any vehicles.")}
                                                    />
                                                    {!vehicleSearch && company && onAddVehicle && (
                                                        <div className="-mt-6 pb-8 text-center">
                                                            <Button size="sm" onClick={() => onAddVehicle(company)}>
                                                                <Icon icon={Add01Icon} size={16} />{" "}{tr("Add vehicle")}</Button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                                    {displayedVehicles.map((v: any, i: number) => (
                                                        <li key={v.id ?? i}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedVehicleId(v.id)}
                                                                className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)] dark:hover:bg-white/[0.03]"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="truncate font-mono text-sm font-semibold text-[#242a37] dark:text-white">{v.plateNumber || v.registrationNumber || `#${v.id}`}</p>
                                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                        {[v.brand?.name, v.model?.name].filter(Boolean).join(" · ") || "—"}
                                                                        {v.capacity ? tr(" · {capacity} seats", { capacity: v.capacity }) : ""}
                                                                    </p>
                                                                </div>
                                                                <SheetLozenge status={v.isActive ? "ACTIVE" : "INACTIVE"} />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <SheetPager page={vehiclePage} totalPages={vehicleTotalPages || 1} onPage={setVehiclePage} />
                                        </SheetSection>
                                    )
                                )}

                                {/* ════════ AGENTS ════════ */}
                                {activeTab === "agents" && (
                                    selectedAgentId ? (
                                        (() => {
                                            const a = agents.find((a: any) => a.id === selectedAgentId)
                                            return (
                                                <>
                                                    <BackLink label={tr("All agents")} onClick={() => setSelectedAgentId(null)} />
                                                    {a && (
                                                        <>
                                                            <StatGrid
                                                                columns={2}
                                                                tiles={[
                                                                    { label: tr("Parcels booked"), value: agentParcelCount(a) === null ? "…" : agentParcelCount(a)!.toLocaleString(), hint: tr("All time"), emphasis: true },
                                                                    { label: tr("Account"), value: a.isActive ? "Active" : "Inactive" },
                                                                ]}
                                                            />
                                                            <SheetSection title={tr("Agent")} icon={UserGroupIcon}>
                                                                <DetailList
                                                                    rows={[
                                                                        { label: tr("Full name"), value: a.fullName || "—" },
                                                                        { label: tr("Username"), value: a.username ? `@${a.username}` : "—", mono: true },
                                                                        { label: tr("Role"), value: formatRole(a.role || a.roles?.[0]?.name) },
                                                                        { label: tr("Phone"), value: a.phoneNumber || "—", mono: true },
                                                                        { label: tr("Email"), value: a.email ? a.email.toLowerCase() : "—" },
                                                                        { label: tr("Joined"), value: formatDay(a.createdAt) },
                                                                    ]}
                                                                />
                                                            </SheetSection>
                                                        </>
                                                    )}
                                                </>
                                            )
                                        })()
                                    ) : (
                                        <SheetSection
                                            title={tr("Agents · {filteredAgents}", { filteredAgents: filteredAgents.length.toLocaleString() })}
                                            icon={UserGroupIcon}
                                            action={<SheetSearch value={agentSearch} placeholder={tr("Name, username or phone")} onChange={(v) => { setAgentSearch(v); setAgentPage(1) }} />}
                                        >
                                            {isLoadingAgents ? (
                                                <ListSkeleton rows={4} />
                                            ) : displayedAgents.length === 0 ? (
                                                <>
                                                    <SheetEmpty
                                                        icon={ContactIcon}
                                                        title={agentSearch ? tr("No matching agents") : tr("No agents yet")}
                                                        description={agentSearch ? tr("Try another name, username or phone.") : tr("No agents have been added to this company.")}
                                                    />
                                                    {!agentSearch && company && onAddAgent && (
                                                        <div className="-mt-6 pb-8 text-center">
                                                            <Button size="sm" onClick={() => onAddAgent(company)}>
                                                                <Icon icon={UserAdd01Icon} size={16} />{" "}{tr("Add agent")}</Button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                                    {displayedAgents.map((a: any, i: number) => {
                                                        const count = agentParcelCount(a)
                                                        return (
                                                            <li key={a.id ?? i}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedAgentId(a.id)}
                                                                    className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)] dark:hover:bg-white/[0.03]"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{a.fullName}</p>
                                                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                            {formatRole(a.role || a.roles?.[0]?.name)}
                                                                            {a.phoneNumber ? ` · ${a.phoneNumber}` : ""}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-3">
                                                                        <p className="text-right text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">
                                                                            {count === null ? "…" : count.toLocaleString()}
                                                                            <span className="ml-1 text-xs font-normal text-slate-500">{tr("parcels")}</span>
                                                                        </p>
                                                                        <SheetLozenge status={a.isActive ? "ACTIVE" : "INACTIVE"} />
                                                                    </div>
                                                                </button>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            )}
                                            <SheetPager page={agentPage} totalPages={agentTotalPages || 1} onPage={setAgentPage} />
                                        </SheetSection>
                                    )
                                )}

                                {/* ════════ PARCELS ════════ */}
                                {activeTab === "parcels" && (
                                    selectedParcelNumber ? (
                                        <>
                                            <BackLink label={tr("All parcels")} onClick={() => { setSelectedParcelNumber(null); resetTracking() }} />
                                            {isTrackingParcel ? (
                                                <ListSkeleton rows={4} />
                                            ) : trackedParcel?.parcel ? (
                                                <SheetSection title={tr("Parcel")} icon={Package01Icon}>
                                                    <DetailList
                                                        rows={[
                                                            { label: tr("Parcel no."), value: trackedParcel.parcel.parcelNumber, mono: true },
                                                            { label: tr("Status"), value: <SheetLozenge status={trackedParcel.parcel.status} /> },
                                                            { label: tr("From"), value: trackedParcel.parcel.origin?.name || "—" },
                                                            { label: tr("To"), value: trackedParcel.parcel.destination?.name || "—" },
                                                            { label: tr("Sender"), value: (trackedParcel.parcel as any).senderName || "—" },
                                                            { label: tr("Recipient"), value: (trackedParcel.parcel as any).recipientName || "—" },
                                                            { label: tr("Price"), value: trackedParcel.parcel.price ? `TZS ${Number(trackedParcel.parcel.price).toLocaleString()}` : "—" },
                                                            { label: tr("Booked"), value: formatDay(trackedParcel.parcel.createdAt) },
                                                        ]}
                                                    />
                                                </SheetSection>
                                            ) : (
                                                <div className={SHEET_CARD}>
                                                    <SheetEmpty icon={Package01Icon} title={tr("Couldn't load this parcel")} description={trackingError ? String(trackingError) : tr("Please try again.")} />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <SheetSection
                                            title={tr("Parcels · {totalParcelsCount}", { totalParcelsCount: totalParcelsCount.toLocaleString() })}
                                            icon={Package01Icon}
                                            action={<SheetSearch value={parcelSearch} placeholder={tr("Parcel no. or name")} onChange={(v) => { setParcelSearch(v); setParcelPage(1) }} />}
                                        >
                                            {isLoadingParcels ? (
                                                <ListSkeleton rows={4} />
                                            ) : parcels.length === 0 ? (
                                                <SheetEmpty
                                                    icon={Package01Icon}
                                                    title={parcelSearch ? tr("No matching parcels") : tr("No parcels yet")}
                                                    description={parcelSearch ? tr("Try another parcel number or name.") : tr("This company hasn't booked any parcels.")}
                                                />
                                            ) : (
                                                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                                    {parcels.map((p: any, i: number) => (
                                                        <li key={p.id ?? i}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedParcelNumber(p.parcelNumber || p.trackingNumber)}
                                                                className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)] dark:hover:bg-white/[0.03]"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="truncate font-mono text-sm font-semibold text-[#242a37] dark:text-white">{p.parcelNumber || p.trackingNumber || `#${p.id}`}</p>
                                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                        {p.senderName || "—"} → {p.recipientName || "—"}
                                                                        {p.createdAt ? ` · ${formatDay(p.createdAt)}` : ""}
                                                                    </p>
                                                                </div>
                                                                <div className="flex shrink-0 items-center gap-3">
                                                                    <p className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">TZS {(p.price || 0).toLocaleString()}</p>
                                                                    <SheetLozenge status={p.status} />
                                                                </div>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <SheetPager page={parcelPage} totalPages={parcelTotalPages} onPage={setParcelPage} />
                                        </SheetSection>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-2 rounded-[var(--ds-radius-small)] text-sm font-semibold text-slate-600 transition-colors hover:text-[#242a37] focus-visible:outline-2 focus-visible:outline-[var(--ds-border-focused)] dark:text-slate-300 dark:hover:text-white"
        >
            <Icon icon={ArrowLeft01Icon} size={16} />
            {label}
        </button>
    )
}

function SheetSearch({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
    return (
        <div className="relative w-56">
            <Icon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
                type="search"
                value={value}
                placeholder={placeholder}
                aria-label={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-full rounded-[var(--ds-radius-small)] border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-[#242a37] dark:border-white/10 dark:bg-[#1a1f2b] dark:focus:border-[#ffd428]"
            />
        </div>
    )
}

function AgentRankList({ agents, onOpen }: { agents: { id: number; fullName: string; parcelCount: number }[]; onOpen: (id: number) => void }) {
    const max = Math.max(1, ...agents.map((a) => a.parcelCount))
    return (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {agents.map((a, i) => (
                <li key={a.id}>
                    <button
                        type="button"
                        onClick={() => onOpen(a.id)}
                        className="w-full space-y-2 px-5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)] dark:hover:bg-white/[0.03]"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#242a37] dark:text-white">
                                <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400">{i + 1}</span>
                                <span className="truncate">{a.fullName}</span>
                            </p>
                            <p className="shrink-0 text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{a.parcelCount.toLocaleString()}</p>
                        </div>
                        <div className="ml-6 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                            <div className="h-full rounded-full bg-[#ffd428]" style={{ width: `${(a.parcelCount / max) * 100}%` }} />
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    )
}
