"use client"

import React from "react"
import type { Model } from "@/types/model"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { getModels, createModel, updateModel, deleteModel } from "@/lib/services/model"
import { getBrands } from "@/lib/services/brand"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    Plus,
    Search,
    Edit,
    Trash2,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Tag,
    ChevronsLeft,
    ChevronsRight,
    X,
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { TableBanner } from "@/components/ui/table-banner"
import { ListSkeleton } from "@/components/ui/skeletons"
import { ExportMenu } from "@/components/export/export-menu"
import { useTr } from "@/lib/i18n/portal"

export default function ModelsPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [brandFilter, setBrandFilter] = useState<string>("all")

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedModel, setSelectedModel] = useState<Model | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        brandId: "",
    })

    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Debounce search query
    const debouncedSearchQuery = useDebounce(searchQuery, 500)

    const {
        data: modelsData,
        isLoading: isLoadingModels,
        isError: isErrorModels,
        error: modelsError,
        refetch: refetchModels,
    } = useQuery({
        queryKey: ["models", currentPage, pageSize, debouncedSearchQuery, brandFilter],
        queryFn: async () => {
            try {
                console.log("Fetching models with params:", {
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                    brandFilter,
                })

                const response = await getModels({
                    paginate: true,
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                })

                console.log("Models API response:", response)
                return response
            } catch (error: any) {
                console.error("Error fetching models:", error)

                // Handle authentication errors
                if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
                    toast({
                        title: tr("Authentication Error"),
                        description: tr("Please log in again to access this data."),
                        variant: "destructive",
                    })
                } else {
                    toast({
                        title: tr("Error Loading Models"),
                        description: error.message || "Failed to load models. Please try again.",
                        variant: "destructive",
                    })
                }
                throw error
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
            // Don't retry on authentication errors
            if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
                return false
            }
            return failureCount < 3
        },
    })

    const { data: brandsData, isLoading: isLoadingBrands } = useQuery({
        queryKey: ["brands-dropdown"],
        queryFn: async () => {
            try {
                console.log("Fetching brands for dropdown")
                const response = await getBrands({ paginate: false })
                console.log("Brands dropdown response:", response)
                return response
            } catch (error) {
                console.error("Error fetching brands for dropdown:", error)
                return { brands: [] }
            }
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
        cacheTime: 15 * 60 * 1000, // 15 minutes
    })

    const createModelMutation = useMutation({
        mutationFn: createModel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["models"] })
            toast({
                title: tr("Model created"),
                description: tr("The model has been created successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            toast({
                title: tr("Error Creating Model"),
                description: error.message || "There was a problem creating the model.",
                variant: "destructive",
            })
        },
    })

    const updateModelMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateModel(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["models"] })
            toast({
                title: tr("Model updated"),
                description: tr("The model has been updated successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            toast({
                title: tr("Error Updating Model"),
                description: error.message || "There was a problem updating the model.",
                variant: "destructive",
            })
        },
    })

    const deleteModelMutation = useMutation({
        mutationFn: (id: number) => deleteModel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["models"] })
            toast({
                title: tr("Model deleted"),
                description: tr("The model has been deleted successfully."),
            })
            setIsDeleteDialogOpen(false)
        },
        onError: (error) => {
            toast({
                title: tr("Error"),
                description: tr("Failed to delete model: {message}", { message: error.message }),
                variant: "destructive",
            })
        },
    })

    // Extract models array from API response
    const models = React.useMemo(() => {
        console.log("Processing models data:", modelsData)

        if (!modelsData) return []

        // Handle the specific API structure: { models: [...], pagination: {...} }
        if (modelsData.models && Array.isArray(modelsData.models)) {
            console.log("Extracted models:", modelsData.models)
            return modelsData.models
        }

        // Fallback for other possible structures
        if (Array.isArray(modelsData)) {
            return modelsData
        }

        if (modelsData.data && Array.isArray(modelsData.data)) {
            return modelsData.data
        }

        console.log("No models found in response")
        return []
    }, [modelsData])

    // Extract brands array from API response
    const brands = React.useMemo(() => {
        console.log("Processing brands data for dropdown:", brandsData)

        if (!brandsData) return []

        // Handle the specific API structure: { brands: [...] }
        if (brandsData.brands && Array.isArray(brandsData.brands)) {
            console.log("Extracted brands for dropdown:", brandsData.brands)
            return brandsData.brands
        }

        // Fallback for other possible structures
        if (Array.isArray(brandsData)) {
            return brandsData
        }

        if (brandsData.data && Array.isArray(brandsData.data)) {
            return brandsData.data
        }

        console.log("No brands found in response")
        return []
    }, [brandsData])

    // Extract pagination from API response
    const pagination = React.useMemo(() => {
        console.log("Processing pagination data:", modelsData)

        if (!modelsData) {
            return { currentPage: 1, totalPages: 1, totalItems: 0, limit: pageSize }
        }

        // Handle the specific API structure: { models: [...], pagination: {...} }
        if (modelsData.pagination) {
            const paginationData = {
                currentPage: modelsData.pagination.currentPage || currentPage,
                totalPages: modelsData.pagination.totalPages || 1,
                totalItems: modelsData.pagination.totalItems || models.length,
                limit: modelsData.pagination.limit || pageSize,
            }
            console.log("Extracted pagination:", paginationData)
            return paginationData
        }

        // Fallback for other possible structures
        if (modelsData.meta) {
            return {
                currentPage: modelsData.meta.current_page || currentPage,
                totalPages: modelsData.meta.last_page || 1,
                totalItems: modelsData.meta.total || models.length,
                limit: modelsData.meta.per_page || pageSize,
            }
        }

        // Default pagination
        return { currentPage: 1, totalPages: 1, totalItems: models.length, limit: pageSize }
    }, [modelsData, models.length, pageSize, currentPage])

    const filteredModels = React.useMemo(() => {
        console.log("Filtering models by brand:", brandFilter)

        if (brandFilter === "all") return models

        const filtered = models.filter((model) => {
            const modelBrandId = model.brandId || model.brand_id || model.brand?.id
            return modelBrandId === Number.parseInt(brandFilter)
        })

        console.log("Filtered models:", filtered)
        return filtered
    }, [models, brandFilter])

    const validateForm = () => {
        const errors: Record<string, string> = {}
        if (!formData.name.trim()) {
            errors.name = "Model name is required"
        }
        if (!formData.brandId) {
            errors.brandId = "Brand is required"
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const resetForm = () => {
        setFormData({ name: "", brandId: "" })
        setFormErrors({})
        setSelectedModel(null)
    }

    const handleAddEdit = (model?: Model) => {
        setFormErrors({})
        if (model) {
            setSelectedModel(model)
            setFormData({
                name: model.name || "",
                brandId: (model.brandId || model.brand_id)?.toString() || "",
            })
        } else {
            resetForm()
        }
        setIsAddEditDialogOpen(true)
    }

    const handleDeleteDialog = (model: Model) => {
        setSelectedModel(model)
        setIsDeleteDialogOpen(true)
    }

    const handleInputChange = (field: string, value: any) => {
        if (formErrors[field]) {
            setFormErrors({ ...formErrors, [field]: "" })
        }
        setFormData({ ...formData, [field]: value })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) {
            toast({
                title: tr("Validation Error"),
                description: tr("Please correct the errors in the form."),
                variant: "destructive",
            })
            return
        }

        const apiData = {
            name: formData.name.trim(),
            brandId: Number(formData.brandId),
        }

        if (selectedModel && selectedModel.id) {
            updateModelMutation.mutate({ id: selectedModel.id, data: apiData })
        } else {
            createModelMutation.mutate(apiData)
        }
    }

    const handleDeleteConfirm = () => {
        if (selectedModel && selectedModel.id) {
            deleteModelMutation.mutate(selectedModel.id)
        }
    }

    const clearSearch = () => {
        setSearchQuery("")
        setCurrentPage(1)
    }

    const clearFilters = () => {
        setSearchQuery("")
        setBrandFilter("all")
        setCurrentPage(1)
    }

    const handlePageSizeChange = (value: string) => {
        const newPageSize = Number(value)
        console.log("Changing page size to:", newPageSize)
        setPageSize(newPageSize)
        setCurrentPage(1) // Reset to first page when changing page size
    }

    const goToFirstPage = () => {
        console.log("Going to first page")
        setCurrentPage(1)
    }

    const goToLastPage = () => {
        console.log("Going to last page:", pagination.totalPages)
        setCurrentPage(pagination.totalPages)
    }

    const goToPreviousPage = () => {
        const newPage = Math.max(currentPage - 1, 1)
        console.log("Going to previous page:", newPage)
        setCurrentPage(newPage)
    }

    const goToNextPage = () => {
        const newPage = Math.min(currentPage + 1, pagination.totalPages)
        console.log("Going to next page:", newPage)
        setCurrentPage(newPage)
    }

    // Reset page when search or filter changes
    React.useEffect(() => {
        setCurrentPage(1)
    }, [debouncedSearchQuery, brandFilter])

    if (isLoadingModels && currentPage === 1 && !debouncedSearchQuery) {
        return (
            <div className="container mx-auto p-6 space-y-4">
                <div className="rounded-md border p-4 space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-6 gap-4 items-center">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12 justify-self-end" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (isErrorModels) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div>
                        <span className="font-medium">{tr("Error loading models")}</span>
                        {modelsError?.message && <p className="text-sm mt-1">{modelsError.message}</p>}
                    </div>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetchModels()}>
                    <RefreshCw className="h-4 w-4 mr-2" />{tr("Retry")}</Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title={tr("Vehicle Models")}
                description={tr("Manage vehicle models in the system{v}", { v: pagination.totalItems > 0 ? ` (${pagination.totalItems} total)` : "" })}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchModels()}>
                            <RefreshCw className="h-4 w-4 mr-2" />{tr("Refresh")}</Button>
                        <ExportMenu filename="vehicle-models" title={tr("Vehicle models")} subtitle={tr("Rows on this page")} rows={filteredModels} columns={[["ID", (r: any) => r.id], ["Model", (r: any) => r.name], ["Brand", (r: any) => r.brand?.name || brands.find((b) => b.id === (r.brandId || r.brand_id || r.brand?.id))?.name || ""], ["Created", (r: any) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : ""]]} className="h-9" />
                        <Button size="sm" onClick={() => handleAddEdit()}>
                            <Plus className="h-4 w-4 mr-2" />{tr("Add Model")}</Button>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Total Models")}</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pagination.totalItems}</div>
                        <p className="text-xs text-muted-foreground">{tr("All vehicle models")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Current Page")}</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{models.length}</div>
                        <p className="text-xs text-muted-foreground">{tr("Showing on this page")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-background p-4 rounded-lg border">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={tr("Search models by name...")}
                        className="pl-10 pr-10 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                            onClick={clearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={tr("Filter by Brand")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{tr("All Brands")}</SelectItem>
                            {isLoadingBrands ? (
                                <SelectItem value="loading" disabled>
                                    <LoadingSpinner size="sm" className="mr-2" />{tr("Loading...")}</SelectItem>
                            ) : (
                                brands.map((brand) => (
                                    <SelectItem key={brand.id} value={brand.id.toString()}>
                                        {brand.name}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    {(searchQuery || brandFilter !== "all") && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>{tr("Clear Filters")}</Button>
                    )}
                </div>
            </div>

            <div className="rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden">
                <TableBanner title={tr("Vehicle Models")} description={tr("Models grouped under each brand")} icon="vehicles" />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>UUID</TableHead>
                            <TableHead>{tr("Model Name")}</TableHead>
                            <TableHead>{tr("Brand")}</TableHead>
                            <TableHead>{tr("Created")}</TableHead>
                            <TableHead className="text-right">{tr("Actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredModels.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {isLoadingModels ? (
                                        <ListSkeleton rows={5} className="text-left" />
                                    ) : debouncedSearchQuery ? (
                                        <div className="text-muted-foreground">{tr("No models found matching \"")}{debouncedSearchQuery}".
                                            <Button variant="link" className="ml-2" onClick={clearSearch}>{tr("Clear search")}</Button>
                                        </div>
                                    ) : brandFilter !== "all" ? (
                                        <div className="text-muted-foreground">{tr("No models found for the selected brand.")}<Button variant="link" className="ml-2" onClick={clearFilters}>{tr("Clear filters")}</Button>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">{tr("No models found.")}<Button variant="link" className="ml-2" onClick={() => handleAddEdit()}>{tr("Add your first model")}</Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredModels.map((model: Model) => (
                                <TableRow key={model.id || model.uuid}>
                                    <TableCell className="font-mono text-sm">{model.id}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{model.uuid}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <Tag className="h-4 w-4 mr-2 text-blue-600" />
                                            {model.name || "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            {(() => {
                                                const brandId = model.brandId || model.brand_id || model.brand?.id
                                                const brandName = model.brand?.name || brands.find((b) => b.id === brandId)?.name

                                                if (brandName) {
                                                    return (
                                                        <>
                                                            <Tag className="h-3 w-3 mr-2 text-muted-foreground" />
                                                            {brandName}
                                                        </>
                                                    )
                                                }
                                                return "—"
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {model.createdAt || model.created_at
                                            ? new Date(model.createdAt || model.created_at).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleAddEdit(model)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteDialog(model)}
                                                className="text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Enhanced Pagination */}
            {pagination.totalPages > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground whitespace-nowrap">{tr("Showing")}{" "}{Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.totalItems)}{" "}{tr("to")}{" "}
                            {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}{" "}{tr("of")}{" "}{pagination.totalItems}{" "}{tr("models")}</p>
                        <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">{tr("per page")}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToFirstPage}
                            disabled={pagination.currentPage <= 1 || isLoadingModels}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToPreviousPage}
                            disabled={pagination.currentPage <= 1 || isLoadingModels}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
              {tr("Page {currentPage} of {totalPages}", { currentPage: pagination.currentPage, totalPages: pagination.totalPages })}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToNextPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingModels}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToLastPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingModels}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add/Edit Model Dialog */}
            <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedModel ? tr("Edit Model") : tr("Add New Model")}</DialogTitle>
                        <DialogDescription>
                            {selectedModel ? tr("Update the model details.") : tr("Create a new vehicle model.")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{tr("Model Name")}{" "}<span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    placeholder={tr("Enter model name")}
                                    required
                                    className={formErrors.name ? "border-red-500" : ""}
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="brandId">{tr("Brand")}{" "}<span className="text-red-500">*</span>
                                </Label>
                                <Select value={formData.brandId} onValueChange={(value) => handleInputChange("brandId", value)}>
                                    <SelectTrigger className={formErrors.brandId ? "border-red-500" : ""}>
                                        <SelectValue placeholder={tr("Select brand")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id.toString()}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.brandId && <p className="text-sm text-red-500">{formErrors.brandId}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddEditDialogOpen(false)}
                                disabled={createModelMutation.isPending || updateModelMutation.isPending}
                            >{tr("Cancel")}</Button>
                            <Button type="submit" disabled={createModelMutation.isPending || updateModelMutation.isPending}>
                                {createModelMutation.isPending || updateModelMutation.isPending ? (
                                    <>
                                        <LoadingSpinner className="mr-2" size="sm" />
                                        {selectedModel ? tr("Updating...") : tr("Creating...")}
                                    </>
                                ) : selectedModel ? (
                                    tr("Update Model")
                                ) : (
                                    tr("Create Model")
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Are you sure?")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tr("This will permanently delete the model \"{name}\". This action cannot be undone.", { name: selectedModel?.name })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteModelMutation.isPending}>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteModelMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteModelMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />{tr("Deleting...")}</>
                            ) : (
                                tr("Delete")
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
