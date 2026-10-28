"use client"

import React from "react"
import type { Company } from "@/types/company"
import { useState, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCompanies, createCompany, updateCompany, deleteCompany, getCompanyStats } from "@/lib/services/company"
import { LoadingSpinner } from "@/components/loading-spinner"
import { CompanyModal } from "@/components/modals/company-modal"
import { useDebounce } from "@/hooks/use-debounce"
import {
    Plus,
    Search,
    Download,
    Edit,
    Trash2,
    Eye,
    RefreshCw,
    AlertCircle,
    Building2,
    Phone,
    Mail,
    Globe,
    MoreHorizontal,
    MapPin,
    Shield,
    BarChart3,
    PieChart,
    Users,
    Car,
    TrendingUp,
    Activity,
    CheckCircle,
    XCircle,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart as RechartsLineChart,
    Pie,
    PieChart as RechartsPieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { CompanyViewModal } from "@/components/modals/company-view-modal"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { PageHeader } from "@/components/page-header"

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

// Pagination component
const PaginationControls = ({
                                currentPage,
                                totalPages,
                                totalItems,
                                itemsPerPage,
                                onPageChange,
                                isLoading = false,
                            }: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    isLoading?: boolean
}) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    // Generate page numbers to show
    const getPageNumbers = () => {
        const delta = 2 // Number of pages to show on each side of current page
        const range = []
        const rangeWithDots = []

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i)
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, "...")
        } else {
            rangeWithDots.push(1)
        }

        rangeWithDots.push(...range)

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push("...", totalPages)
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages)
        }

        return rangeWithDots
    }

    if (totalPages <= 1) return null

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{" "}
                    <span className="font-medium">{totalItems}</span> companies
                </div>

                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => onPageChange(1)} // Reset to page 1 when changing page size
                        disabled={isLoading}
                    >
                        <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* First page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage <= 1 || isLoading}
                    className="h-8 w-8 p-0"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>

                {/* Previous page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                    className="h-8 w-8 p-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, index) => (
                        <React.Fragment key={index}>
                            {pageNum === "..." ? (
                                <span className="px-2 py-1 text-sm text-gray-500">...</span>
                            ) : (
                                <Button
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => onPageChange(pageNum as number)}
                                    disabled={isLoading}
                                    className="h-8 w-8 p-0"
                                    style={currentPage === pageNum ? { backgroundColor: BRAND_COLORS.primary, color: "#000" } : {}}
                                >
                                    {pageNum}
                                </Button>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Next page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Last page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage >= totalPages || isLoading}
                    className="h-8 w-8 p-0"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

export default function CompaniesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const router = useRouter()

    // State management
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [activeTab, setActiveTab] = useState("overview")

    // Modal states
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)

    // Debounce search query for better UX
    const debouncedSearchQuery = useDebounce(searchQuery, 300)

    // Query keys for better cache management
    const companiesQueryKey = ["companies", currentPage, pageSize, debouncedSearchQuery, statusFilter]
    const statsQueryKey = ["company-stats"]
    const allCompaniesQueryKey = ["all-companies-for-charts"]

    // Fetch companies with optimized caching
    const {
        data: companiesResponse,
        isLoading: isLoadingCompanies,
        isError: isErrorCompanies,
        refetch: refetchCompanies,
        error: companiesError,
        isFetching: isFetchingCompanies,
    } = useQuery({
        queryKey: companiesQueryKey,
        queryFn: async () => {
            console.log("Fetching companies with params:", {
                page: currentPage,
                limit: pageSize,
                search: debouncedSearchQuery || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
            })

            const response = await getCompanies({
                page: currentPage,
                limit: pageSize,
                search: debouncedSearchQuery || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                paginate: true,
            })

            console.log("Companies API response:", response)
            return response
        },
        enabled: activeTab === "all-companies",
        staleTime: 30000, // 30 seconds
        gcTime: 300000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })

    // Fetch company stats
    const {
        data: statsData,
        isLoading: isLoadingStats,
        isError: isErrorStats,
        refetch: refetchStats,
    } = useQuery({
        queryKey: statsQueryKey,
        queryFn: () => getCompanyStats(),
        enabled: activeTab === "overview",
        staleTime: 60000, // 1 minute
        gcTime: 300000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })

    // Fetch all companies for charts
    const { data: allCompaniesData, isLoading: isLoadingAllCompanies } = useQuery({
        queryKey: allCompaniesQueryKey,
        queryFn: async () => {
            return getCompanies({
                paginate: false,
                limit: 1000,
            })
        },
        enabled: activeTab === "overview",
        staleTime: 60000, // 1 minute
        gcTime: 300000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })

    // Optimistic updates helper
    const updateCompaniesCache = useCallback(
        (updatedCompany: Company, action: "create" | "update" | "delete") => {
            // Update paginated companies cache
            queryClient.setQueryData(companiesQueryKey, (oldData: any) => {
                if (!oldData) return oldData

                let updatedCompanies = [...(oldData.data || [])]

                switch (action) {
                    case "create":
                        // Add to beginning of current page if there's space
                        if (updatedCompanies.length < pageSize) {
                            updatedCompanies.unshift(updatedCompany)
                        }
                        break
                    case "update":
                        updatedCompanies = updatedCompanies.map((company) =>
                            company.id === updatedCompany.id ? updatedCompany : company,
                        )
                        break
                    case "delete":
                        updatedCompanies = updatedCompanies.filter((company) => company.id !== updatedCompany.id)
                        break
                }

                return {
                    ...oldData,
                    data: updatedCompanies,
                    pagination: {
                        ...oldData.pagination,
                        totalItems:
                            action === "create"
                                ? oldData.pagination.totalItems + 1
                                : action === "delete"
                                    ? oldData.pagination.totalItems - 1
                                    : oldData.pagination.totalItems,
                    },
                }
            })

            // Update all companies cache for charts
            queryClient.setQueryData(allCompaniesQueryKey, (oldData: any) => {
                if (!oldData) return oldData

                let updatedCompanies = [...(oldData.data || [])]

                switch (action) {
                    case "create":
                        updatedCompanies.unshift(updatedCompany)
                        break
                    case "update":
                        updatedCompanies = updatedCompanies.map((company) =>
                            company.id === updatedCompany.id ? updatedCompany : company,
                        )
                        break
                    case "delete":
                        updatedCompanies = updatedCompanies.filter((company) => company.id !== updatedCompany.id)
                        break
                }

                return {
                    ...oldData,
                    data: updatedCompanies,
                }
            })
        },
        [queryClient, allCompaniesQueryKey, pageSize],
    )

    // Mutations with optimistic updates
    const createCompanyMutation = useMutation({
        mutationFn: createCompany,
        onMutate: async (newCompany) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: companiesQueryKey })
            await queryClient.cancelQueries({ queryKey: allCompaniesQueryKey })
            await queryClient.cancelQueries({ queryKey: statsQueryKey })

            // Create optimistic company object
            const optimisticCompany: Company = {
                id: Date.now(), // Temporary ID
                uuid: `temp-${Date.now()}`,
                name: newCompany.name || "",
                tin: newCompany.tin || "",
                address: newCompany.address || "",
                phoneNumber: newCompany.phoneNumber || "",
                email: newCompany.email || "",
                website: newCompany.website || "",
                logoUrl: newCompany.logoUrl || "",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalVehicles: 0,
                totalAgents: 0,
                totalUsers: 0,
                totalParcels: 0,
                ...newCompany,
            }

            // Optimistically update cache
            updateCompaniesCache(optimisticCompany, "create")

            return { optimisticCompany }
        },
        onSuccess: async (data, variables, context) => {
            // Replace optimistic update with real data
            if (context?.optimisticCompany && data.data) {
                const realCompany = data.data
                updateCompaniesCache(realCompany, "update")
            }

            // Refetch to ensure consistency
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["companies"] }),
                queryClient.invalidateQueries({ queryKey: statsQueryKey }),
                queryClient.invalidateQueries({ queryKey: allCompaniesQueryKey }),
            ])

            toast({
                title: "Success",
                description: "Company has been created successfully!",
                duration: 3000,
            })
            setIsAddEditDialogOpen(false)
            setSelectedCompany(null)
        },
        onError: (error: any, variables, context) => {
            // Revert optimistic update
            if (context?.optimisticCompany) {
                updateCompaniesCache(context.optimisticCompany, "delete")
            }

            toast({
                title: "Error",
                description: error.message || "Failed to create company.",
                variant: "destructive",
            })
        },
    })

    const updateCompanyMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateCompany(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: companiesQueryKey })
            await queryClient.cancelQueries({ queryKey: allCompaniesQueryKey })

            // Get previous data for rollback
            const previousCompaniesData = queryClient.getQueryData(companiesQueryKey)
            const previousAllCompaniesData = queryClient.getQueryData(allCompaniesQueryKey)

            // Create updated company object
            const updatedCompany = { ...selectedCompany, ...data, id } as Company

            // Optimistically update cache
            updateCompaniesCache(updatedCompany, "update")

            return { previousCompaniesData, previousAllCompaniesData, updatedCompany }
        },
        onSuccess: async (data, variables, context) => {
            // Update with real data from server
            if (data.data) {
                updateCompaniesCache(data.data, "update")
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["companies"] }),
                queryClient.invalidateQueries({ queryKey: statsQueryKey }),
                queryClient.invalidateQueries({ queryKey: allCompaniesQueryKey }),
            ])

            toast({
                title: "Success",
                description: "Company has been updated successfully!",
                duration: 3000,
            })
            setIsAddEditDialogOpen(false)
            setSelectedCompany(null)
        },
        onError: (error: any, variables, context) => {
            // Revert optimistic updates
            if (context?.previousCompaniesData) {
                queryClient.setQueryData(companiesQueryKey, context.previousCompaniesData)
            }
            if (context?.previousAllCompaniesData) {
                queryClient.setQueryData(allCompaniesQueryKey, context.previousAllCompaniesData)
            }

            toast({
                title: "Error",
                description: error.message || "Failed to update company.",
                variant: "destructive",
            })
        },
    })

    const deleteCompanyMutation = useMutation({
        mutationFn: (id: number) => deleteCompany(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: companiesQueryKey })
            await queryClient.cancelQueries({ queryKey: allCompaniesQueryKey })

            const previousCompaniesData = queryClient.getQueryData(companiesQueryKey)
            const previousAllCompaniesData = queryClient.getQueryData(allCompaniesQueryKey)

            // Optimistically remove company
            if (selectedCompany) {
                updateCompaniesCache(selectedCompany, "delete")
            }

            return { previousCompaniesData, previousAllCompaniesData }
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["companies"] }),
                queryClient.invalidateQueries({ queryKey: statsQueryKey }),
                queryClient.invalidateQueries({ queryKey: allCompaniesQueryKey }),
            ])

            toast({
                title: "Success",
                description: `Company "${selectedCompany?.name}" has been deleted successfully!`,
                duration: 3000,
            })
            setIsDeleteDialogOpen(false)
            setSelectedCompany(null)
        },
        onError: (error: any, variables, context) => {
            // Revert optimistic updates
            if (context?.previousCompaniesData) {
                queryClient.setQueryData(companiesQueryKey, context.previousCompaniesData)
            }
            if (context?.previousAllCompaniesData) {
                queryClient.setQueryData(allCompaniesQueryKey, context.previousAllCompaniesData)
            }

            toast({
                title: "Error",
                description: `Failed to delete company: ${error.message}`,
                variant: "destructive",
            })
        },
    })

    // Data processing
    const companies = React.useMemo((): Company[] => {
        if (!companiesResponse?.data) return []
        return Array.isArray(companiesResponse.data) ? companiesResponse.data : []
    }, [companiesResponse])

    const allCompanies = React.useMemo((): Company[] => {
        if (!allCompaniesData?.data) return []
        return Array.isArray(allCompaniesData.data) ? allCompaniesData.data : []
    }, [allCompaniesData])

    const pagination = React.useMemo(() => {
        if (!companiesResponse?.pagination) {
            return {
                currentPage: 1,
                totalPages: Math.ceil(companies.length / pageSize) || 1,
                totalItems: companies.length,
                perPage: pageSize,
            }
        }

        const pag = companiesResponse.pagination
        return {
            currentPage: pag.current_page || pag.currentPage || currentPage,
            totalPages: pag.total_pages || pag.totalPages || 1,
            totalItems: pag.total || pag.totalItems || companies.length,
            perPage: pageSize,
        }
    }, [companiesResponse, companies.length, pageSize, currentPage])

    const stats = React.useMemo(() => {
        const dataSource = allCompanies.length > 0 ? allCompanies : companies
        const totalCompanies = dataSource.length
        const activeCompanies = dataSource.filter((company) => company.isActive).length
        const inactiveCompanies = totalCompanies - activeCompanies

        return {
            total: totalCompanies,
            active: activeCompanies,
            inactive: inactiveCompanies,
            totalParcels: statsData?.totalParcels || 0,
            totalParcelPrice: statsData?.totalRevenue || statsData?.totalParcelPrice || 0,
            totalVehicles: dataSource.reduce((sum, company) => sum + (company.totalVehicles || 0), 0),
            totalAgents: dataSource.reduce((sum, company) => sum + (company.totalAgents || 0), 0),
        }
    }, [allCompanies, companies, statsData])

    // Chart data
    const statusDistributionData = React.useMemo(() => {
        if (!companies.length && !allCompanies.length) return []

        const dataSource = allCompanies.length > 0 ? allCompanies : companies
        const active = dataSource.filter((company) => company.isActive).length
        const inactive = dataSource.filter((company) => !company.isActive).length

        return [
            { name: "Active", value: active, fill: BRAND_COLORS.success },
            { name: "Inactive", value: inactive, fill: BRAND_COLORS.danger },
        ]
    }, [allCompanies, companies])

    const registrationTrendsData = React.useMemo(() => {
        if (!allCompanies.length) return []

        const endDate = new Date()
        const startDate = subDays(endDate, 30)
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate })

        return dateRange.map((date) => {
            const dayCompanies = allCompanies.filter((company) => {
                const companyDate = new Date(company.createdAt || company.updatedAt || new Date())
                return format(companyDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
            })

            return {
                date: format(date, "MMM dd"),
                fullDate: format(date, "yyyy-MM-dd"),
                companies: dayCompanies.length,
                active: dayCompanies.filter((c) => c.isActive).length,
                inactive: dayCompanies.filter((c) => !c.isActive).length,
            }
        })
    }, [allCompanies])

    // Helper functions
    const getCompanyLogo = useCallback((company: Company) => {
        return company.logoUrl || "/placeholder.svg?height=40&width=40"
    }, [])

    // Event handlers
    const handleCreate = () => {
        setSelectedCompany(null)
        setIsAddEditDialogOpen(true)
    }

    const handleEdit = (company: Company) => {
        setSelectedCompany(company)
        setIsAddEditDialogOpen(true)
    }

    const handleView = (company: Company) => {
        setSelectedCompany(company)
        setIsViewModalOpen(true)
    }

    const handleDelete = (company: Company) => {
        setSelectedCompany(company)
        setIsDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (selectedCompany?.id) {
            deleteCompanyMutation.mutate(selectedCompany.id)
        }
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
    }

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value)
        setCurrentPage(1)
    }

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize)
        setCurrentPage(1)
    }

    const handleExport = () => {
        toast({
            title: "Export Started",
            description: "Your companies export will be ready shortly.",
        })
    }

    const handleRefresh = async () => {
        await Promise.all([
            refetchCompanies(),
            refetchStats(),
            queryClient.invalidateQueries({ queryKey: allCompaniesQueryKey }),
        ])

        toast({
            title: "Data Refreshed",
            description: "Companies data has been updated.",
            duration: 2000,
        })
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    // Custom tooltips for charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-[var(--ds-shadow-raised)]">
                    <p className="font-medium text-sm mb-2 text-gray-900">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-sm text-gray-700">
                <span className="font-medium">{entry.name}: </span>
                                {Number(entry.value).toLocaleString()}
              </span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    const PieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            const total = statusDistributionData.reduce((sum, item) => sum + item.value, 0)
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-[var(--ds-shadow-raised)]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
                        <span className="font-medium text-sm text-gray-900">{data.name}</span>
                    </div>
                    <div className="text-sm space-y-1 text-gray-700">
                        <div>
                            Count: <span className="font-medium">{data.value}</span>
                        </div>
                        <div>
                            Percentage:{" "}
                            <span className="font-medium">{total > 0 ? ((data.value / total) * 100).toFixed(1) : 0}%</span>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    // Reset page when search or filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [debouncedSearchQuery, statusFilter])

    // Auto-refresh data when tab changes
    useEffect(() => {
        if (activeTab === "all-companies") {
            refetchCompanies()
        } else if (activeTab === "overview") {
            refetchStats()
        }
    }, [activeTab, refetchCompanies, refetchStats])

    // Loading state for initial load
    if (isLoadingCompanies && currentPage === 1 && !debouncedSearchQuery && activeTab === "all-companies") {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex-1 flex justify-center items-center min-h-[400px]">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        )
    }

    // Error state
    if (isErrorCompanies && activeTab === "all-companies") {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Error loading companies: {companiesError?.message || "Please try again."}</span>
                </div>
                <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Company Management"
                description={`Comprehensive company management system with ${stats.total.toLocaleString()} total companies`}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoadingCompanies || isFetchingCompanies}
                            className="hidden sm:flex"
                        >
                            <RefreshCw
                                className={`h-4 w-4 mr-2 ${isLoadingCompanies || isFetchingCompanies ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            style={{ backgroundColor: BRAND_COLORS.primary, color: "#000" }}
                            className="hover:opacity-90 font-medium"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Add Company</span>
                            <span className="sm:hidden">Add</span>
                        </Button>
                    </div>
                }
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="all-companies" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        All Companies
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                                <Building2 className="h-4 w-4" style={{ color: BRAND_COLORS.primary }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: BRAND_COLORS.primary }}>
                                    {stats.total.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center mt-1">
                                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                                    All registered companies
                                </p>
                            </CardContent>
                            <div
                                className="absolute bottom-0 left-0 h-1 w-full opacity-20"
                                style={{ backgroundColor: BRAND_COLORS.primary }}
                            />
                        </Card>

                        <Card className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
                                <CheckCircle className="h-4 w-4" style={{ color: BRAND_COLORS.success }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: BRAND_COLORS.success }}>
                                    {stats.active.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center mt-1">
                                    <Activity className="h-3 w-3 mr-1 text-green-500" />
                                    Currently operational
                                </p>
                            </CardContent>
                            <div
                                className="absolute bottom-0 left-0 h-1 w-full opacity-20"
                                style={{ backgroundColor: BRAND_COLORS.success }}
                            />
                        </Card>

                        <Card className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Inactive Companies</CardTitle>
                                <XCircle className="h-4 w-4" style={{ color: BRAND_COLORS.danger }} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: BRAND_COLORS.danger }}>
                                    {stats.inactive.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center mt-1">
                                    <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
                                    Not operational
                                </p>
                            </CardContent>
                            <div
                                className="absolute bottom-0 left-0 h-1 w-full opacity-20"
                                style={{ backgroundColor: BRAND_COLORS.danger }}
                            />
                        </Card>
                    </div>

                    {/* Charts Section */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Company Status Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <PieChart className="h-5 w-5 mr-2" style={{ color: BRAND_COLORS.primary }} />
                                    Company Status Distribution
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Active vs. Inactive companies</p>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie
                                                data={statusDistributionData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={120}
                                                innerRadius={60}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {statusDistributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PieTooltip />} />
                                            <Legend />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Company Registration Trends */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <BarChart3 className="h-5 w-5 mr-2" style={{ color: BRAND_COLORS.primary }} />
                                    Company Registration Trends
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Daily company registrations over the last 30 days</p>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLineChart data={registrationTrendsData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={{ stroke: "#E5E7EB" }}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} width={40} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: BRAND_COLORS.primary, strokeWidth: 1 }} />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="companies"
                                                name="Total Registrations"
                                                stroke={BRAND_COLORS.primary}
                                                strokeWidth={3}
                                                dot={{
                                                    fill: BRAND_COLORS.primary,
                                                    strokeWidth: 2,
                                                    r: 4,
                                                }}
                                                activeDot={{
                                                    r: 6,
                                                    fill: BRAND_COLORS.primary,
                                                    stroke: "#fff",
                                                    strokeWidth: 2,
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="active"
                                                name="Active"
                                                stroke={BRAND_COLORS.success}
                                                strokeWidth={2}
                                                dot={{
                                                    fill: BRAND_COLORS.success,
                                                    strokeWidth: 2,
                                                    r: 3,
                                                }}
                                            />
                                        </RechartsLineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="all-companies" className="space-y-6">
                    {/* Search and Filter Bar */}
                    <div className="bg-white rounded-lg border shadow-[var(--ds-shadow-raised)] p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 items-center gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search companies by name, email, phone..."
                                        value={searchQuery}
                                        onChange={handleSearch}
                                        className="pl-10 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-gray-500" />
                                    <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                        <SelectTrigger className="w-32 border-gray-200">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    disabled={isLoadingCompanies || isFetchingCompanies}
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 mr-2 ${isLoadingCompanies || isFetchingCompanies ? "animate-spin" : ""}`}
                                    />
                                    Refresh
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreate}
                                    style={{ backgroundColor: BRAND_COLORS.primary, color: "#000" }}
                                    className="hover:opacity-90 font-medium"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Company
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Companies Table */}
                    <Card className="border-0 shadow-[var(--ds-shadow-raised)] bg-white">
                        <CardHeader className="pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-gray-900 flex items-center">
                                    <Building2 className="h-5 w-5 mr-2" style={{ color: BRAND_COLORS.primary }} />
                                    Companies ({pagination.totalItems})
                                </CardTitle>
                                {(isLoadingCompanies || isFetchingCompanies) && <LoadingSpinner size="sm" />}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="rounded-lg border-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow
                                            className="border-b border-gray-200"
                                            style={{ backgroundColor: `${BRAND_COLORS.primary}20` }}
                                        >
                                            <TableHead className="pl-6 py-4 font-semibold text-gray-700">Company</TableHead>
                                            <TableHead className="py-4 font-semibold text-gray-700">Contact Information</TableHead>
                                            <TableHead className="py-4 font-semibold text-gray-700">Business Details</TableHead>
                                            <TableHead className="py-4 font-semibold text-gray-700">Assets</TableHead>
                                            <TableHead className="text-center py-4 font-semibold text-gray-700">Status</TableHead>
                                            <TableHead className="text-right pr-6 py-4 font-semibold text-gray-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {companies.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center">
                                                    {isLoadingCompanies ? (
                                                        <div className="flex items-center justify-center">
                                                            <LoadingSpinner size="sm" className="mr-2" />
                                                            Loading companies...
                                                        </div>
                                                    ) : debouncedSearchQuery ? (
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Search className="h-8 w-8 text-gray-400" />
                                                            <p className="text-gray-600">No companies found matching "{debouncedSearchQuery}"</p>
                                                            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                                                                Clear search
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Building2 className="h-8 w-8 text-gray-400" />
                                                            <p className="text-gray-600">No companies found</p>
                                                            <Button
                                                                size="sm"
                                                                onClick={handleCreate}
                                                                style={{ backgroundColor: BRAND_COLORS.primary, color: "#000" }}
                                                                className="hover:opacity-90 font-medium"
                                                            >
                                                                <Plus className="h-4 w-4 mr-2" />
                                                                Add your first company
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            companies.map((company) => (
                                                <TableRow key={company.id} className="hover:bg-yellow-50/30 border-b border-gray-100">
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex items-center space-x-4">
                                                            <Avatar
                                                                className="h-12 w-12 border-2"
                                                                style={{ borderColor: `${BRAND_COLORS.primary}40` }}
                                                            >
                                                                <AvatarImage
                                                                    src={getCompanyLogo(company) || "/placeholder.svg"}
                                                                    alt={company.name}
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement
                                                                        target.src = "/placeholder.svg?height=48&width=48"
                                                                    }}
                                                                />
                                                                <AvatarFallback
                                                                    style={{
                                                                        backgroundColor: `${BRAND_COLORS.primary}20`,
                                                                        color: BRAND_COLORS.secondary,
                                                                    }}
                                                                >
                                                                    <Building2 className="h-5 w-5" />
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-semibold text-gray-900 truncate">{company.name}</div>
                                                                {company.address && (
                                                                    <div className="text-sm text-gray-500 truncate flex items-center mt-1">
                                                                        <MapPin className="h-3 w-3 mr-1" />
                                                                        {company.address}
                                                                    </div>
                                                                )}
                                                                {company.tin && (
                                                                    <div className="text-xs text-gray-400 truncate mt-1 flex items-center">
                                                                        <Shield className="h-3 w-3 mr-1" />
                                                                        TIN: {company.tin}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="space-y-2">
                                                            {company.email && (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <Mail className="h-3 w-3 mr-2 text-gray-400" />
                                                                    <span className="truncate">{company.email}</span>
                                                                </div>
                                                            )}
                                                            {company.phoneNumber && (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <Phone className="h-3 w-3 mr-2 text-gray-400" />
                                                                    <span>{company.phoneNumber}</span>
                                                                </div>
                                                            )}
                                                            {company.website && (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <Globe className="h-3 w-3 mr-2 text-gray-400" />
                                                                    <a
                                                                        href={
                                                                            company.website.startsWith("http")
                                                                                ? company.website
                                                                                : `https://${company.website}`
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: BRAND_COLORS.accent }}
                                                                        className="hover:underline truncate"
                                                                    >
                                                                        {company.website}
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="space-y-2">
                                                            {company.smsSender && (
                                                                <div className="text-sm text-gray-600">SMS: {company.smsSender}</div>
                                                            )}
                                                            {company.helpDeskPhoneNumber && (
                                                                <div className="text-sm text-gray-500 flex items-center">
                                                                    <Phone className="h-3 w-3 mr-1" />
                                                                    Help: {company.helpDeskPhoneNumber}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="space-y-2">
                                                            {company.totalVehicles > 0 && (
                                                                <div className="text-sm flex items-center text-gray-600">
                                                                    <Car className="h-3 w-3 mr-2 text-blue-500" />
                                                                    {company.totalVehicles} vehicles
                                                                </div>
                                                            )}
                                                            {company.totalAgents > 0 && (
                                                                <div className="text-sm flex items-center text-gray-600">
                                                                    <Users className="h-3 w-3 mr-2 text-green-500" />
                                                                    {company.totalAgents} agents
                                                                </div>
                                                            )}
                                                            {company.totalUsers > 0 && (
                                                                <div className="text-sm text-gray-500">{company.totalUsers} users</div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center py-4">
                                                        <Badge
                                                            variant={company.isActive ? "default" : "secondary"}
                                                            style={
                                                                company.isActive
                                                                    ? { backgroundColor: BRAND_COLORS.primary, color: "#000" }
                                                                    : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                                                            }
                                                        >
                                                            {company.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-4">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0" style={{ color: BRAND_COLORS.primary }}>
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => handleView(company)}>
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleEdit(company)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit Company
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleDelete(company)} className="text-red-600">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete Company
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Enhanced Pagination */}
                            <PaginationControls
                                currentPage={pagination.currentPage}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.totalItems}
                                itemsPerPage={pagination.perPage}
                                onPageChange={handlePageChange}
                                isLoading={isLoadingCompanies || isFetchingCompanies}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Company Modal */}
            <CompanyModal
                isOpen={isAddEditDialogOpen}
                onClose={() => {
                    setIsAddEditDialogOpen(false)
                    setSelectedCompany(null)
                }}
                company={selectedCompany}
                onSuccess={async () => {
                    // Force immediate refetch of all company-related queries
                    await queryClient.refetchQueries({ queryKey: ["companies"] })
                    await queryClient.refetchQueries({ queryKey: ["company-stats"] })
                    await queryClient.refetchQueries({ queryKey: ["all-companies-for-charts"] })

                    // Close modal and reset state
                    setIsAddEditDialogOpen(false)
                    setSelectedCompany(null)
                }}
            />

            {/* Company View Modal */}
            <CompanyViewModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false)
                    setSelectedCompany(null)
                }}
                company={selectedCompany}
                onEdit={(company) => {
                    setIsViewModalOpen(false)
                    setSelectedCompany(company)
                    setIsAddEditDialogOpen(true)
                }}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Company</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedCompany?.name}"? This action cannot be undone and will
                            permanently remove the company and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteCompanyMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteCompanyMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteCompanyMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete Company"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
