"use client"

import React from "react"
import type { Brand } from "@/types/brand"
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
import { getBrands, createBrand, updateBrand, deleteBrand } from "@/lib/services/brand"
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

export default function BrandsPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)

    const [formData, setFormData] = useState({
        name: "",
    })

    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Debounce search query
    const debouncedSearchQuery = useDebounce(searchQuery, 500)

    const {
        data: brandsData,
        isLoading: isLoadingBrands,
        isError: isErrorBrands,
        error: brandsError,
        refetch: refetchBrands,
    } = useQuery({
        queryKey: ["brands", currentPage, pageSize, debouncedSearchQuery],
        queryFn: async () => {
            try {
                console.log("Fetching brands with params:", {
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                })

                const response = await getBrands({
                    paginate: true,
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                })

                console.log("Brands API response:", response)
                return response
            } catch (error: any) {
                console.error("Error fetching brands:", error)

                // Handle authentication errors
                if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
                    toast({
                        title: tr("Authentication Error"),
                        description: tr("Please log in again to access this data."),
                        variant: "destructive",
                    })
                } else {
                    toast({
                        title: tr("Error Loading Brands"),
                        description: error.message || "Failed to load brands. Please try again.",
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

    const createBrandMutation = useMutation({
        mutationFn: createBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands"] })
            toast({
                title: tr("Brand created"),
                description: tr("The brand has been created successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            toast({
                title: tr("Error Creating Brand"),
                description: error.message || "There was a problem creating the brand.",
                variant: "destructive",
            })
        },
    })

    const updateBrandMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateBrand(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands"] })
            toast({
                title: tr("Brand updated"),
                description: tr("The brand has been updated successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            toast({
                title: tr("Error Updating Brand"),
                description: error.message || "There was a problem updating the brand.",
                variant: "destructive",
            })
        },
    })

    const deleteBrandMutation = useMutation({
        mutationFn: (id: number) => deleteBrand(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands"] })
            toast({
                title: tr("Brand deleted"),
                description: tr("The brand has been deleted successfully."),
            })
            setIsDeleteDialogOpen(false)
        },
        onError: (error) => {
            toast({
                title: tr("Error"),
                description: tr("Failed to delete brand: {message}", { message: error.message }),
                variant: "destructive",
            })
        },
    })

    // Extract brands array from API response
    const brands = React.useMemo(() => {
        console.log("Processing brands data:", brandsData)

        if (!brandsData) return []

        // Handle the specific API structure: { brands: [...], pagination: {...} }
        if (brandsData.brands && Array.isArray(brandsData.brands)) {
            console.log("Extracted brands:", brandsData.brands)
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
        console.log("Processing pagination data:", brandsData)

        if (!brandsData) {
            return { currentPage: 1, totalPages: 1, totalItems: 0, limit: pageSize }
        }

        // Handle the specific API structure: { brands: [...], pagination: {...} }
        if (brandsData.pagination) {
            const paginationData = {
                currentPage: brandsData.pagination.currentPage || currentPage,
                totalPages: brandsData.pagination.totalPages || 1,
                totalItems: brandsData.pagination.totalItems || brands.length,
                limit: brandsData.pagination.limit || pageSize,
            }
            console.log("Extracted pagination:", paginationData)
            return paginationData
        }

        // Fallback for other possible structures
        if (brandsData.meta) {
            return {
                currentPage: brandsData.meta.current_page || currentPage,
                totalPages: brandsData.meta.last_page || 1,
                totalItems: brandsData.meta.total || brands.length,
                limit: brandsData.meta.per_page || pageSize,
            }
        }

        // Default pagination
        return { currentPage: 1, totalPages: 1, totalItems: brands.length, limit: pageSize }
    }, [brandsData, brands.length, pageSize, currentPage])

    const validateForm = () => {
        const errors: Record<string, string> = {}
        if (!formData.name.trim()) {
            errors.name = "Brand name is required"
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const resetForm = () => {
        setFormData({ name: "" })
        setFormErrors({})
        setSelectedBrand(null)
    }

    const handleAddEdit = (brand?: Brand) => {
        setFormErrors({})
        if (brand) {
            setSelectedBrand(brand)
            setFormData({ name: brand.name || "" })
        } else {
            resetForm()
        }
        setIsAddEditDialogOpen(true)
    }

    const handleDeleteDialog = (brand: Brand) => {
        setSelectedBrand(brand)
        setIsDeleteDialogOpen(true)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        if (formErrors[name]) {
            setFormErrors({ ...formErrors, [name]: "" })
        }
        setFormData({ ...formData, [name]: value })
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
        }

        if (selectedBrand && selectedBrand.id) {
            updateBrandMutation.mutate({ id: selectedBrand.id, data: apiData })
        } else {
            createBrandMutation.mutate(apiData)
        }
    }

    const handleDeleteConfirm = () => {
        if (selectedBrand && selectedBrand.id) {
            deleteBrandMutation.mutate(selectedBrand.id)
        }
    }

    const clearSearch = () => {
        setSearchQuery("")
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

    // Reset page when search changes
    React.useEffect(() => {
        setCurrentPage(1)
    }, [debouncedSearchQuery])

    if (isLoadingBrands && currentPage === 1 && !debouncedSearchQuery) {
        return (
            <div className="container mx-auto p-6 space-y-4">
                <div className="rounded-md border p-4 space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-5 gap-4 items-center">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12 justify-self-end" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (isErrorBrands) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div>
                        <span className="font-medium">{tr("Error loading brands")}</span>
                        {brandsError?.message && <p className="text-sm mt-1">{brandsError.message}</p>}
                    </div>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetchBrands()}>
                    <RefreshCw className="h-4 w-4 mr-2" />{tr("Retry")}</Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title={tr("Vehicle Brands")}
                description={tr("Manage vehicle brands in the system{v}", { v: pagination.totalItems > 0 ? ` (${pagination.totalItems} total)` : "" })}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchBrands()}>
                            <RefreshCw className="h-4 w-4 mr-2" />{tr("Refresh")}</Button>
                        <ExportMenu filename="brands" title={tr("Vehicle brands")} subtitle={tr("Rows on this page")} rows={brands} columns={[["ID", (r: any) => r.id], ["Brand", (r: any) => r.name], ["Created", (r: any) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : ""]]} className="h-9" />
                        <Button size="sm" onClick={() => handleAddEdit()}>
                            <Plus className="h-4 w-4 mr-2" />{tr("Add Brand")}</Button>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Total Brands")}</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pagination.totalItems}</div>
                        <p className="text-xs text-muted-foreground">{tr("All vehicle brands")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Current Page")}</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{brands.length}</div>
                        <p className="text-xs text-muted-foreground">{tr("Showing on this page")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-background p-4 rounded-lg border">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={tr("Search brands by name...")}
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
            </div>

            <div className="rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden">
                <TableBanner title={tr("Vehicle Brands")} description={tr("Manufacturers available when registering a vehicle")} icon="brands" />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>UUID</TableHead>
                            <TableHead>{tr("Brand Name")}</TableHead>
                            <TableHead>{tr("Created")}</TableHead>
                            <TableHead className="text-right">{tr("Actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {brands.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {isLoadingBrands ? (
                                        <ListSkeleton rows={5} className="text-left" />
                                    ) : debouncedSearchQuery ? (
                                        <div className="text-muted-foreground">{tr("No brands found matching \"")}{debouncedSearchQuery}".
                                            <Button variant="link" className="ml-2" onClick={clearSearch}>{tr("Clear search")}</Button>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">{tr("No brands found.")}<Button variant="link" className="ml-2" onClick={() => handleAddEdit()}>{tr("Add your first brand")}</Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            brands.map((brand: Brand) => (
                                <TableRow key={brand.id || brand.uuid}>
                                    <TableCell className="font-mono text-sm">{brand.id}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{brand.uuid}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <Tag className="h-4 w-4 mr-2 text-blue-600" />
                                            {brand.name || "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {brand.createdAt || brand.created_at
                                            ? new Date(brand.createdAt || brand.created_at).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleAddEdit(brand)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteDialog(brand)}
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
                            {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}{" "}{tr("of")}{" "}{pagination.totalItems}{" "}{tr("brands")}</p>
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
                            disabled={pagination.currentPage <= 1 || isLoadingBrands}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToPreviousPage}
                            disabled={pagination.currentPage <= 1 || isLoadingBrands}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
              {tr("Page {currentPage} of {totalPages}", { currentPage: pagination.currentPage, totalPages: pagination.totalPages })}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToNextPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingBrands}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToLastPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingBrands}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add/Edit Brand Dialog */}
            <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedBrand ? tr("Edit Brand") : tr("Add New Brand")}</DialogTitle>
                        <DialogDescription>
                            {selectedBrand ? tr("Update the brand details.") : tr("Create a new vehicle brand.")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{tr("Brand Name")}{" "}<span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder={tr("Enter brand name")}
                                    required
                                    className={formErrors.name ? "border-red-500" : ""}
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddEditDialogOpen(false)}
                                disabled={createBrandMutation.isPending || updateBrandMutation.isPending}
                            >{tr("Cancel")}</Button>
                            <Button type="submit" disabled={createBrandMutation.isPending || updateBrandMutation.isPending}>
                                {createBrandMutation.isPending || updateBrandMutation.isPending ? (
                                    <>
                                        <LoadingSpinner className="mr-2" size="sm" />
                                        {selectedBrand ? tr("Updating...") : tr("Creating...")}
                                    </>
                                ) : selectedBrand ? (
                                    tr("Update Brand")
                                ) : (
                                    tr("Create Brand")
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
                            {tr("This will permanently delete the brand \"{name}\". This action cannot be undone.", { name: selectedBrand?.name })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteBrandMutation.isPending}>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteBrandMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteBrandMutation.isPending ? (
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
