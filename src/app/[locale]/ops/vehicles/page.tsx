"use client"

import React from "react"
import { useAccess } from "@/hooks/use-access"
import type { Vehicle } from "@/types/vehicle"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    getVehicles,
    getBrands,
    getModels,
    getFleetTypes,
    getSeatLayouts,
    getCompanies,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    normalizeVehicleData,
    calculateVehicleStats,
} from "@/lib/services/vehicle"
import { LoadingSpinner } from "@/components/loading-spinner"
import { VehicleLoader } from "@/components/loaders/vehicle-loader"
import { format, addDays, subDays, eachDayOfInterval } from "date-fns"
import { useDebounce } from "@/hooks/use-debounce"
import {
    Search,
    Eye,
    RefreshCw,
    AlertCircle,
    Car,
    CheckCircle,
    Bus,
    MapPin,
    User,
    Activity,
    X,
    MoreHorizontal,
    Download,
    TrendingUp,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    XCircle,
    Filter,
    CalendarIcon,
    ChevronDown,
    Target,
    Globe,
    Zap,
    TrendingDown,
    Plus,
    Edit,
    Trash2,
    Building,
    Loader2,
    FileText,
    Phone,
    Settings,
    LayoutList,
    Grid3X3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, FilterIcon, Building03Icon, TruckIcon, Add01Icon } from "@hugeicons/core-free-icons"
import {
    BarChart as RechartsBarChart,
    Bar,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
    PieChart,
    Pie,
    AreaChart,
    Area,
} from "recharts"
import type { DateRange } from "react-day-picker"
import { VehicleModal } from "@/components/modals/vehicle-modal"
import { ListSkeleton } from "@/components/ui/skeletons"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { getVehicle } from "@/lib/services/vehicle"
import { useTr } from "@/lib/i18n/portal"
// Brand color palette
const BRAND_COLORS = {
    primary: "#ffd428",
    secondary: "#ffed4e",
    accent: "#f59e0b",
    success: "#10b981",
    warning: "#f97316",
    danger: "#ef4444",
    info: "#3b82f6",
    purple: "#8b5cf6",
    teal: "#14b8a6",
    pink: "#ec4899",
    indigo: "#6366f1",
    gray: "#6b7280",
}

const CHART_COLORS = [
    BRAND_COLORS.primary,
    BRAND_COLORS.accent,
    BRAND_COLORS.success,
    BRAND_COLORS.info,
    BRAND_COLORS.purple,
    BRAND_COLORS.teal,
    BRAND_COLORS.warning,
    BRAND_COLORS.danger,
    BRAND_COLORS.pink,
    BRAND_COLORS.indigo,
]

const getStatusColor = (isActive: boolean): string => {
    return isActive
        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
        : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200"
}

export default function VehiclesPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    // Owners can view vehicles but not add, edit or delete them
    const { can } = useAccess()
    const canManageVehicles = can("vehicles.manage")
    const canDeleteVehicles = can("vehicles.delete")

    // State management
    const [activeTab, setActiveTab] = useState("overview")
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(10)
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [brandFilter, setBrandFilter] = useState<string>("all")
    const [companyFilter, setCompanyFilter] = useState<string>("all")
    const [fleetTypeFilter, setFleetTypeFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [selectedVehicles, setSelectedVehicles] = useState<number[]>([])
    const viewMode = "list" as const

    // Debounced search query
    const debouncedSearchQuery = useDebounce(searchQuery, 500)

    // Dialog states
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [deleteReason, setDeleteReason] = useState("")

    // Data states
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
    const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null)

    // Fetch vehicles with proper pagination and filters
    const { 
        data: vehiclesResponse, 
        isLoading: isLoadingVehicles, 
        isError: isErrorVehicles,
        refetch: refetchVehicles
    } = useQuery({
        queryKey: ["all-vehicles", dateRange],
        queryFn: async () => {
            const params: any = {
                limit: 10000,
                page: 1,
                per_page: 10000,
                all: 1,
                paginate: 0,
                no_pagination: 1,
            }

            if (dateRange?.from) {
                params.date_from = format(dateRange.from, "yyyy-MM-dd")
            }
            if (dateRange?.to) {
                params.date_to = format(dateRange.to, "yyyy-MM-dd")
            }

            return await getVehicles(params)
        },
        enabled: true,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000, // match staleTime — a vehicle registry list doesn't need 30s freshness
    })

    // All processed vehicles (Global list)
    const overallVehicles = React.useMemo(() => {
        let vehiclesList: any[] = []

        if (vehiclesResponse && "vehicles" in vehiclesResponse && vehiclesResponse.vehicles) {
            vehiclesList = (vehiclesResponse as any).vehicles
        } else if (vehiclesResponse && "data" in vehiclesResponse && (vehiclesResponse.data as any)?.vehicles) {
            vehiclesList = (vehiclesResponse.data as any).vehicles
        } else if (vehiclesResponse && "data" in vehiclesResponse && Array.isArray(vehiclesResponse.data)) {
            vehiclesList = vehiclesResponse.data
        } else if (Array.isArray(vehiclesResponse)) {
            vehiclesList = vehiclesResponse
        }

        if (!Array.isArray(vehiclesList)) {
            return [] as Vehicle[]
        }

        return (vehiclesList as any[]).map(normalizeVehicleData).filter((v): v is Vehicle => v !== null) as Vehicle[]
    }, [vehiclesResponse])

    // Filtered vehicles for display (Handles Search and Dropdowns across all data)
    const filteredVehicles = React.useMemo(() => {
        let result = [...overallVehicles]

        // Status Filter
        if (statusFilter !== "all") {
            const isActive = statusFilter === "active"
            result = result.filter(v => v.isActive === isActive)
        }

        // Search filter (Plate, Registration, Name)
        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase().trim()
            result = result.filter(v => 
                v.name?.toLowerCase().includes(query) || 
                v.plateNumber?.toLowerCase().includes(query) ||
                v.registrationNumber?.toLowerCase().includes(query)
            )
        }

        // Additional robust client-side filtering for dropdowns
        if (brandFilter !== "all") {
            result = result.filter(v => v.brandId?.toString() === brandFilter || v.brand?.id?.toString() === brandFilter)
        }
        if (companyFilter !== "all") {
            result = result.filter(v => v.companyId?.toString() === companyFilter || v.company?.id?.toString() === companyFilter)
        }
        if (fleetTypeFilter !== "all") {
            result = result.filter(v => v.fleetTypeId?.toString() === fleetTypeFilter || v.fleetType?.id?.toString() === fleetTypeFilter)
        }

        return result
    }, [overallVehicles, statusFilter, debouncedSearchQuery, brandFilter, companyFilter, fleetTypeFilter])

    // Paginated subset for the current view
    const vehicles = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize
        const end = start + pageSize
        return filteredVehicles.slice(start, end)
    }, [filteredVehicles, currentPage, pageSize])

    const stats = React.useMemo(() => {
        return calculateVehicleStats(overallVehicles)
    }, [overallVehicles])

    // Companies ranked by fleet size
    const fleetsByCompany = React.useMemo(() => {
        const map = new Map<number, { id: number; name: string; total: number; active: number }>()
        for (const v of overallVehicles) {
            const id = Number(v.companyId ?? v.company?.id)
            if (!id) continue
            const row = map.get(id) ?? { id, name: v.company?.name || `Company #${id}`, total: 0, active: 0 }
            row.total += 1
            if (v.isActive) row.active += 1
            map.set(id, row)
        }
        return [...map.values()].sort((a, b) => b.total - a.total)
    }, [overallVehicles])

    const recentVehicles = React.useMemo(
        () => [...overallVehicles]
            .filter((v) => v.createdAt)
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
            .slice(0, 5),
        [overallVehicles],
    )

    // 2. Side Effects
    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [debouncedSearchQuery, statusFilter, brandFilter, companyFilter, fleetTypeFilter, dateRange])

    // Fetch related data
    const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
        queryKey: ["companies"],
        queryFn: getCompanies,
    })

    const { data: brandsData } = useQuery({
        queryKey: ["brands"],
        queryFn: getBrands,
    })

    const { data: modelsData } = useQuery({
        queryKey: ["models"],
        queryFn: getModels,
    })

    const { data: fleetTypesData } = useQuery({
        queryKey: ["fleet-types"],
        queryFn: getFleetTypes,
    })

    const { data: seatLayoutsData } = useQuery({
        queryKey: ["seat-layouts"],
        queryFn: getSeatLayouts,
    })

    // Mutations
    const createVehicleMutation = useMutation({
        mutationFn: createVehicle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["all-vehicles"] })
            toast({
                title: tr("Success"),
                description: tr("Vehicle created successfully."),
            })
            setIsAddModalOpen(false)
        },
        onError: (error: any) => {
            toast({
                title: tr("Error"),
                description: error.message || "Failed to create vehicle.",
                variant: "destructive",
            })
        },
    })

    const updateVehicleMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateVehicle(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["all-vehicles"] })
            toast({
                title: tr("Success"),
                description: tr("Vehicle updated successfully."),
            })
            setIsEditModalOpen(false)
            setSelectedVehicle(null)
        },
        onError: (error: any) => {
            toast({
                title: tr("Error"),
                description: error.message || "Failed to update vehicle.",
                variant: "destructive",
            })
        },
    })

    const deleteVehicleMutation = useMutation({
        mutationFn: deleteVehicle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["all-vehicles"] })
            toast({
                title: tr("Success"),
                description: tr("Vehicle deleted successfully."),
            })
            setIsDeleteDialogOpen(false)
            setSelectedVehicle(null)
            setDeleteReason("")
        },
        onError: (error: any) => {
            toast({
                title: tr("Error"),
                description: error.message || "Failed to delete vehicle.",
                variant: "destructive",
            })
        },
    })

    const pagination = React.useMemo(() => {
        const totalItems = filteredVehicles.length
        const totalPages = Math.ceil(totalItems / pageSize) || 1

        return {
            currentPage: currentPage,
            totalPages: totalPages,
            totalItems: totalItems,
            limit: pageSize,
            from: totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, totalItems),
        }
    }, [filteredVehicles.length, currentPage, pageSize])


    const brands = React.useMemo(() => {
        if (!brandsData) return []
        const data: any = brandsData
        if (data.brands) return data.brands
        if (data.data && data.data.brands) return data.data.brands
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data
        return []
    }, [brandsData])

    const models = React.useMemo(() => {
        if (!modelsData) return []
        const data: any = modelsData
        if (data.models) return data.models
        if (data.data && data.data.models) return data.data.models
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data
        return []
    }, [modelsData])

    const fleetTypes = React.useMemo(() => {
        if (!fleetTypesData) return []
        const data: any = fleetTypesData
        if (data.fleetTypes) return data.fleetTypes
        if (data.data && data.data.fleetTypes) return data.data.fleetTypes
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data
        return []
    }, [fleetTypesData])

    const seatLayouts = React.useMemo(() => {
        if (!seatLayoutsData) return []
        const data: any = seatLayoutsData
        if (data.seatLayouts) return data.seatLayouts
        if (data.data && data.data.seatLayouts) return data.data.seatLayouts
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data
        return []
    }, [seatLayoutsData])

    const companies = React.useMemo(() => {
        if (!companiesData) return []
        const data: any = companiesData
        if (data.companies) return data.companies
        if (data.data && data.data.companies) return data.data.companies
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data
        return []
    }, [companiesData])

    // Chart data
    const brandChartData = React.useMemo(() => {
        if (!overallVehicles.length) return []

        const brandCount = (overallVehicles as Vehicle[]).reduce(
            (acc, vehicle: Vehicle) => {
                const brandName = vehicle.brand?.name || "Unknown Brand"
                acc[brandName] = (acc[brandName] || 0) + 1
                return acc
            },
            {} as Record<string, number>,
        )

        return Object.entries(brandCount)
            .map(([name, count], index) => ({
                name,
                count,
                percentage: ((count / overallVehicles.length) * 100).toFixed(1),
                fill: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
    }, [overallVehicles])

    const fleetTypeChartData = React.useMemo(() => {
        if (!overallVehicles.length) return []

        const fleetTypeCount = (overallVehicles as Vehicle[]).reduce(
            (acc, vehicle: Vehicle) => {
                const typeName = vehicle.fleetType?.name || "Unknown Type"
                acc[typeName] = (acc[typeName] || 0) + 1
                return acc
            },
            {} as Record<string, number>,
        )

        return Object.entries(fleetTypeCount)
            .map(([name, count], index) => ({
                name,
                count,
                percentage: ((count / overallVehicles.length) * 100).toFixed(1),
                fill: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .sort((a, b) => b.count - a.count)
    }, [overallVehicles])

    // Key insights
    const activeRate = stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : "0"
    const avgCapacity =
        overallVehicles.length > 0
            ? (overallVehicles.reduce((sum, v) => sum + (v.capacity || 0), 0) / overallVehicles.length).toFixed(0)
            : "0"

    const insights = [
        {
            title: tr("Vehicle availability"),
            value: `${activeRate}%`,
            description: tr("Share of vehicles in service"),
            icon: Target,
            color: "#10b981",
            gradient: "bg-emerald-500",
        },
        {
            title: tr("Avg Unit Capacity"),
            value: `${avgCapacity} Seats`,
            description: tr("Average passenger volume"),
            icon: User,
            color: "#3b82f6",
            gradient: "bg-blue-500",
        },
        {
            title: tr("Regional Coverage"),
            value: `${[...new Set(overallVehicles.map(v => v.location))].length} Hubs`,
            description: tr("Active locations"),
            icon: Globe,
            color: "#8b5cf6",
            gradient: "bg-purple-500",
        },
    ]

    // Helper functions
    const handleViewVehicle = (vehicle: Vehicle) => {
        setViewingVehicle(vehicle)
        setIsViewDialogOpen(true)
    }

    const handleEditVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle)
        setIsEditModalOpen(true)
    }

    const handleDeleteVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle)
        setDeleteReason("")
        setIsDeleteDialogOpen(true)
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedVehicles(vehicles.map((vehicle: Vehicle) => vehicle.id))
        } else {
            setSelectedVehicles([])
        }
    }

    const handleSelectVehicle = (vehicleId: number, checked: boolean) => {
        if (checked) {
            setSelectedVehicles([...selectedVehicles, vehicleId])
        } else {
            setSelectedVehicles(selectedVehicles.filter((id) => id !== vehicleId))
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage)
        }
    }

    const clearFilters = () => {
        setStatusFilter("all")
        setBrandFilter("all")
        setCompanyFilter("all")
        setFleetTypeFilter("all")
        setDateRange(undefined)
        setSearchQuery("")
        setCurrentPage(1)
    }

    const handleCreateVehicle = async (data: any) => {
        createVehicleMutation.mutate(data)
    }

    const handleUpdateVehicle = async (data: any) => {
        const targetVehicle = selectedVehicle || viewingVehicle
        if (targetVehicle) {
            updateVehicleMutation.mutate({ id: targetVehicle.id, data })
        }
    }

    const handleDeleteConfirm = () => {
        if (selectedVehicle) {
            deleteVehicleMutation.mutate(selectedVehicle.id)
        }
    }

    const handleRefresh = () => {
        refetchVehicles()
    }

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-[var(--ds-shadow-raised)]">
                    <p className="font-medium text-sm mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm">
                                <span className="font-medium">{entry.name}: </span>
                                {entry.value}
                                {entry.payload.percentage && (
                                    <span className="text-muted-foreground ml-1">({entry.payload.percentage}%)</span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, showList: () => setActiveTab("vehicles"), items: vehicles, ready: !isLoadingVehicles, onOpen: handleViewVehicle, fetchOne: (id) => getVehicle(Number(id)) as any })

    return (
        <div>
            <div className="space-y-10 animate-in fade-in duration-300">
                {/* ── Top bar — same layout as Companies ── */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0">
                        <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                            <Icon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" />
                            <Input
                                placeholder={tr("Search vehicles")}
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setActiveTab("vehicles") }}
                                className="h-10 pl-10 pr-9 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    aria-label={tr("Clear search")}
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#242a37] dark:hover:text-white"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setActiveTab("vehicles") }}>
                                <SelectTrigger className="w-full sm:w-52 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Icon icon={Building03Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                        <SelectValue placeholder="COMPANY" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="max-h-[400px]">
                                    <SelectItem value="all" className="text-sm">{tr("All companies")}</SelectItem>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id.toString()} className="text-xs font-semibold uppercase">{company.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setActiveTab("vehicles") }}>
                                <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Icon icon={TruckIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                        <SelectValue placeholder="BRAND" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="max-h-[400px]">
                                    <SelectItem value="all" className="text-sm">{tr("All brands")}</SelectItem>
                                    {brands.map((brand) => (
                                        <SelectItem key={brand.id} value={brand.id.toString()} className="text-xs font-semibold uppercase">{brand.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setActiveTab("vehicles") }}>
                                <SelectTrigger className="w-full sm:w-36 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                    <div className="flex items-center gap-2">
                                        <Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                        <SelectValue placeholder="STATUS" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-sm">{tr("All statuses")}</SelectItem>
                                    <SelectItem value="active" className="text-sm">{tr("Active")}</SelectItem>
                                    <SelectItem value="inactive" className="text-sm">{tr("Inactive")}</SelectItem>
                                </SelectContent>
                            </Select>
                            {(searchQuery || statusFilter !== "all" || brandFilter !== "all" || companyFilter !== "all") && (
                                <Button variant="ghost" onClick={clearFilters} className="h-10 text-sm font-medium">
                                    <X className="size-4 mr-1" />{" "}{tr("Clear")}</Button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isLoadingVehicles}
                            aria-label={tr("Refresh vehicles")}
                            className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]"
                        >
                            <RefreshCw className={cn("size-5", isLoadingVehicles && "animate-spin")} />
                        </Button>
                        {canManageVehicles && <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-3 cursor-pointer"
                        >
                            <Icon icon={Add01Icon} size={20} />{tr("Add Vehicle")}</Button>}
                    </div>
                </div>

                {isErrorVehicles && (
                    <div className="flex items-center gap-3 rounded-[var(--ds-radius-small)] bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                        <AlertCircle className="size-4 shrink-0" />
                        <p className="flex-1">{tr("Couldn't load vehicles.")}</p>
                        <Button variant="outline" size="sm" onClick={handleRefresh}>{tr("Try again")}</Button>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                        <TabsTrigger value="overview" className="flex-1 h-11 text-xs font-semibold cursor-pointer">
                            <BarChart3 className="size-4 mr-2" />{tr("Overview")}</TabsTrigger>
                        <TabsTrigger value="vehicles" className="flex-1 h-11 text-xs font-semibold gap-3 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Car className="size-4" />{tr("All Vehicles")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {overallVehicles.length.toLocaleString()}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    {/* ════════ OVERVIEW ════════ */}
                    <TabsContent value="overview" className="space-y-10 focus:outline-none">
                        {/* Command cards — same as Companies */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: tr("Vehicles"), value: stats.total, sub: tr("{brands} brands", { brands: brands.length.toLocaleString() }), icon: Car },
                                { label: tr("Active"), value: stats.active, sub: stats.total ? `${Math.round((stats.active / stats.total) * 100)}% of the fleet` : "—", icon: CheckCircle },
                                { label: tr("Inactive"), value: stats.inactive, sub: tr("Not taking parcels"), icon: XCircle },
                                { label: tr("Companies with vehicles"), value: fleetsByCompany.length, sub: tr("{companies} companies in total", { companies: companies.length.toLocaleString() }), icon: Building },
                            ].map((card) => (
                                <Card key={card.label} className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative overflow-hidden shadow-[var(--ds-shadow-raised)]">
                                    <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12">
                                        <card.icon size={100} />
                                    </div>
                                    <CardContent className="p-6 relative z-10">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4">
                                            <card.icon className="size-5 text-[#ffd428]" />
                                        </div>
                                        <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{card.label}</p>
                                        <h3 className="text-xl font-semibold text-white tabular-nums">{isLoadingVehicles ? "…" : card.value.toLocaleString()}</h3>
                                        <p className="text-xs font-bold text-white/40 mt-2">{card.sub}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Rankings */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                                <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Building className="size-6 text-[#ffd428]" />{tr("Largest fleets")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Companies with the most registered vehicles")}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                                        {isLoadingVehicles ? (
                                            <ListSkeleton rows={5} avatar />
                                        ) : fleetsByCompany.length === 0 ? (
                                            <p className="p-6 text-sm text-slate-400">{tr("No vehicles registered yet.")}</p>
                                        ) : fleetsByCompany.slice(0, 5).map((row, i) => (
                                            <button
                                                key={row.id}
                                                type="button"
                                                onClick={() => { setCompanyFilter(String(row.id)); setActiveTab("vehicles") }}
                                                className="w-full text-left p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold",
                                                        i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37]")}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{row.name}</p>
                                                        <p className="text-xs font-bold text-slate-400 mt-1">{tr("{active} active", { active: row.active.toLocaleString() })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-4">
                                                    <p className="text-[13px] font-semibold tabular-nums text-[#242a37] dark:text-white">{row.total.toLocaleString()}</p>
                                                    <p className="text-xs font-semibold text-slate-400">{tr("vehicles")}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                                <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Plus className="size-6 text-[#ffd428]" />{tr("Recently added")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("The newest registered vehicles")}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                                        {isLoadingVehicles ? (
                                            <ListSkeleton rows={5} avatar />
                                        ) : recentVehicles.length === 0 ? (
                                            <p className="p-6 text-sm text-slate-400">{tr("No vehicles registered yet.")}</p>
                                        ) : recentVehicles.map((vehicle) => (
                                            <button
                                                key={vehicle.id}
                                                type="button"
                                                onClick={() => handleViewVehicle(vehicle)}
                                                className="w-full text-left p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4 cursor-pointer"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-mono text-sm font-semibold text-[#242a37] dark:text-white truncate">{vehicle.registrationNumber || vehicle.plateNumber || vehicle.name}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                                                        {vehicle.company?.name || tr("No company")} · {[vehicle.brand?.name, vehicle.model?.name].filter(Boolean).join(" ") || "—"}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-semibold text-slate-500">{vehicle.createdAt ? format(new Date(vehicle.createdAt), "d MMM yyyy") : "—"}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden flex flex-col">
                                <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Car className="size-6 text-teal-400" />{tr("Brands")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Share of the fleet by brand")}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 flex-1">
                                    {brandChartData.length === 0 ? (
                                        <p className="text-sm text-slate-400">{tr("No brand data yet.")}</p>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="relative h-[200px] w-[200px]">
                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                                                    <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none tabular-nums">{stats.total.toLocaleString()}</p>
                                                    <p className="text-xs font-semibold text-slate-400 mt-1">{tr("Vehicles")}</p>
                                                </div>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={brandChartData} innerRadius="65%" outerRadius="90%" paddingAngle={3} dataKey="count" stroke="none" startAngle={90} endAngle={-270}>
                                                            {brandChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="w-full space-y-3">
                                                {brandChartData.slice(0, 5).map((entry) => (
                                                    <div key={entry.name} className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{entry.name}</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-[#242a37] dark:text-white tabular-nums">{entry.count.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-2 rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                                <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Bus className="size-6 text-blue-400" />{tr("Fleet types")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Vehicles per fleet type")}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-[300px] w-full">
                                        {fleetTypeChartData.length === 0 ? (
                                            <p className="text-sm text-slate-400">{tr("No fleet type data yet.")}</p>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsBarChart data={fleetTypeChartData} barCategoryGap="25%">
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={10} />
                                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                                                    <Bar dataKey="count" name="Vehicles" fill="#ffd428" radius={[8, 8, 0, 0]} />
                                                </RechartsBarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ════════ ALL VEHICLES ════════ */}
                    <TabsContent value="vehicles" className="space-y-8">
                        {/* Vehicles Table — same design as All Companies */}
                        <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                            <div className="bg-[#242a37] text-white p-8 relative overflow-hidden">
                                <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none transform scale-125">
                                    <Car size={140} />
                                </div>
                                <div className="relative z-10 space-y-1">
                                    <CardTitle className="text-2xl font-bold">{tr("All Vehicles")}</CardTitle>
                                    <CardDescription className="text-white/50 font-medium text-sm">{tr("Every registered bus and truck across partner fleets")}</CardDescription>
                                </div>
                            </div>
                            {isLoadingVehicles ? (
                                <ListSkeleton rows={8} />
                            ) : vehicles.length > 0 ? (
                                <div className="bg-slate-50/50 dark:bg-black/10">
                                    <div className="overflow-x-auto">
                                        <Table className="min-w-[900px]">
                                            <TableHeader>
                                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Vehicle")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Company & Make")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Fleet Type")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vehicles.map((vehicle) => (
                                                    <TableRow
                                                        key={vehicle.id}
                                                        tabIndex={0}
                                                        aria-label={tr("Open vehicle {name}", { name: vehicle.registrationNumber || vehicle.name })}
                                                        onClick={() => handleViewVehicle(vehicle)}
                                                        onKeyDown={(e) => {
                                                            if (e.target !== e.currentTarget) return
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault()
                                                                handleViewVehicle(vehicle)
                                                            }
                                                        }}
                                                        className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                                    >
                                                        <TableCell className="px-6 py-4">
                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors">{vehicle.registrationNumber || vehicle.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(vehicle.id).padStart(3, '0') })}</Badge>
                                                                {vehicle.registrationNumber && vehicle.name && (
                                                                    <p className="text-xs text-slate-400 font-bold truncate">{vehicle.name}</p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{vehicle.company?.name || tr("No company")}</p>
                                                                </div>
                                                                <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold text-slate-400 w-fit flex items-center justify-center">
                                                                    {[vehicle.brand?.name, vehicle.model?.name].filter(Boolean).join(" · ") || "—"}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2.5">
                                                                    <Car className="size-4 text-[#ffd428]" />
                                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.fleetType?.name || tr("Standard")}</span>
                                                                </div>
                                                                <p className="text-xs font-semibold text-slate-400 leading-none ml-6 tabular-nums">{vehicle.capacity || 0}{" "}{tr("seats")}{vehicle.color ? ` · ${vehicle.color}` : ""}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-center">
                                                            <Badge className={cn(
                                                                "h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none",
                                                                vehicle.isActive ? "bg-[#ffd428] text-[#242a37]" : "bg-[#242a37] text-white"
                                                            )}>
                                                                {vehicle.isActive ? "ACTIVE" : "INACTIVE"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right">
                                                            <DropdownMenu modal={false}>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" aria-label={tr("Actions for {name}", { name: vehicle.registrationNumber || vehicle.name })} className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                        <MoreHorizontal className="size-5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-100 dark:border-white/5 p-2 shadow-[var(--ds-shadow-raised)] mt-2" onClick={(e) => e.stopPropagation()}>
                                                                    <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-slate-400 mb-1">{tr("Vehicle Operations")}</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => handleViewVehicle(vehicle)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                        <Eye className="size-5 mr-3" />{tr("View Vehicle")}</DropdownMenuItem>
                                                                    {canManageVehicles && <DropdownMenuItem onClick={() => handleEditVehicle(vehicle)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                        <Edit className="size-5 mr-3" />{tr("Edit Vehicle")}</DropdownMenuItem>}
                                                                    {canDeleteVehicles && <DropdownMenuSeparator className="my-2 bg-slate-50 dark:bg-white/5" />}
                                                                    {canDeleteVehicles && <DropdownMenuItem onClick={() => handleDeleteVehicle(vehicle)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold text-rose-500 focus:bg-rose-500 focus:text-white cursor-pointer">
                                                                        <Trash2 className="size-5 mr-3" />{tr("Delete Vehicle")}</DropdownMenuItem>}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination */}
                                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between">
                                        <p className="text-sm text-muted-foreground mb-2 sm:mb-0">
                                            {tr("Showing {vehiclesCount} vehicles (Page {currentPage} of {totalPages})", { vehiclesCount: vehicles.length, currentPage, totalPages: pagination.totalPages })}</p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage <= 1 || isLoadingVehicles}
                                                variant="outline"
                                                className="rounded-full"
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" />{tr("Previous")}</Button>
                                            <Button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage >= pagination.totalPages || isLoadingVehicles}
                                                variant="outline"
                                                className="rounded-full"
                                            >{tr("Next")}<ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Car className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{tr("No vehicles found")}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                                        {searchQuery || statusFilter !== "all" || brandFilter !== "all" || companyFilter !== "all"
                                            ? tr("Try adjusting your filters to see more results.")
                                            : tr("There are no vehicles to display at the moment.")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Unified Vehicle Modal (Create, Edit, View) */}
            {(isAddModalOpen || isEditModalOpen || isViewDialogOpen) && (
                <VehicleModal
                    open={isAddModalOpen || isEditModalOpen || isViewDialogOpen}
                    setOpen={(val) => {
                        setIsAddModalOpen(val)
                        setIsEditModalOpen(val)
                        setIsViewDialogOpen(val)
                        if (!val) {
                            setTimeout(() => {
                                setSelectedVehicle(null)
                                setViewingVehicle(null)
                            }, 300)
                        }
                    }}
                    mode={isAddModalOpen ? "create" : isEditModalOpen ? "edit" : "view"}
                    vehicle={viewingVehicle || selectedVehicle || undefined}
                    brandsData={brands}
                    modelsData={models}
                    companiesData={companies}
                    fleetTypesData={fleetTypes}
                    seatLayoutsData={seatLayouts}
                    onSubmit={isAddModalOpen ? handleCreateVehicle : handleUpdateVehicle}
                    canEdit={canManageVehicles}
                    isLoading={isAddModalOpen ? createVehicleMutation.isPending : updateVehicleMutation.isPending}
                />
            )}

            {/* Delete Confirmation Sheet */}
            <Sheet open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 overflow-hidden border-none rounded-l-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] bg-white dark:bg-slate-950 flex flex-col h-full">
                    {/* Header */}
                    <div className="px-8 py-4 bg-slate-900 border-b border-slate-800">
                        <SheetHeader>
                            <SheetTitle className="text-xl font-bold text-slate-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[var(--ds-radius-small)] bg-red-600/20 text-red-400 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5" />
                                </div>{tr("Delete Vehicle")}</SheetTitle>
                            <p className="text-sm text-slate-400 mt-1">{tr("This action will permanently remove the vehicle from the system.")}</p>
                        </SheetHeader>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-8 py-4 space-y-5 bg-white dark:bg-[#0f1419]">
                        {/* Vehicle Info Card */}
                        <div className="rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-[#1a1f2e] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[var(--ds-radius-small)] bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                                <Car className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{selectedVehicle?.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{selectedVehicle?.registrationNumber}</p>
                            </div>
                            <Badge className={getStatusColor(selectedVehicle?.isActive || false)}>
                                {selectedVehicle?.isActive ? tr("Active") : tr("Inactive")}
                            </Badge>
                        </div>

                        {/* Reason Input */}
                        <div className="space-y-2">
                            <Label htmlFor="deleteReason" className="text-sm font-bold text-slate-900 dark:text-slate-100">{tr("Reason for Deletion")}{" "}<span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="deleteReason"
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder={tr("Please provide a detailed reason for deleting this vehicle...")}
                                rows={4}
                                className="resize-none rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1f2e] focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            />
                            <p className="text-xs text-slate-500">{tr("This reason will be recorded in the system logs.")}</p>
                        </div>

                        {/* Warning */}
                        <div className="rounded-[var(--ds-radius-small)] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold mb-1 text-red-900 dark:text-red-100">{tr("Warning")}</p>
                                <p className="text-red-700 dark:text-red-300">{tr("Deleting this vehicle will remove all associated data. This action cannot be undone.")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1f2e] flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="flex-1 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-slate-700"
                        >{tr("Cancel")}</Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            disabled={deleteVehicleMutation.isPending || !deleteReason.trim()}
                            className="flex-1 rounded-[var(--ds-radius-large)] bg-red-600 hover:bg-red-700 text-white shadow-[var(--ds-shadow-raised)]"
                        >
                            {deleteVehicleMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{tr("Deleting...")}</>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />{tr("Confirm Deletion")}</>
                            )}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}