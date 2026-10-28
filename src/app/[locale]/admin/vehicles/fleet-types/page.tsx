"use client"

import React from "react"
import type { FleetType } from "@/types/fleet-type"
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
import { getFleetTypes, createFleetType, updateFleetType, deleteFleetType } from "@/lib/services/fleet-type"
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
    Truck,
    ChevronsLeft,
    ChevronsRight,
    X,
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { TableBanner } from "@/components/ui/table-banner"
import { ListSkeleton } from "@/components/ui/skeletons"
import { ExportMenu } from "@/components/export/export-menu"
import { useTr } from "@/lib/i18n/portal"

export default function FleetTypesPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedFleetType, setSelectedFleetType] = useState<FleetType | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
    })

    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Debounce search query
    const debouncedSearchQuery = useDebounce(searchQuery, 500)

    const {
        data: fleetTypesData,
        isLoading: isLoadingFleetTypes,
        isError: isErrorFleetTypes,
        error: fleetTypesError,
        refetch: refetchFleetTypes,
    } = useQuery({
        queryKey: ["fleetTypes", currentPage, pageSize, debouncedSearchQuery],
        queryFn: async () => {
            try {
                console.log("Fetching fleet types with params:", {
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                })

                const response = await getFleetTypes({
                    paginate: true,
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                })

                console.log("Fleet types API response:", response)
                return response
            } catch (error: any) {
                console.error("Error fetching fleet types:", error)

                // Handle authentication errors
                if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
                    toast({
                        title: tr("Authentication Error"),
                        description: tr("Please log in again to access this data."),
                        variant: "destructive",
                    })
                } else {
                    toast({
                        title: tr("Error Loading Fleet Types"),
                        description: error.message || "Failed to load fleet types. Please try again.",
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

    const createFleetTypeMutation = useMutation({
        mutationFn: createFleetType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fleetTypes"] })
            toast({
                title: tr("Fleet Type created"),
                description: tr("The fleet type has been created successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            console.error("Error creating fleet type:", error)
            toast({
                title: tr("Error Creating Fleet Type"),
                description: error.message || "There was a problem creating the fleet type.",
                variant: "destructive",
            })
        },
    })

    const updateFleetTypeMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateFleetType(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fleetTypes"] })
            toast({
                title: tr("Fleet Type updated"),
                description: tr("The fleet type has been updated successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            console.error("Error updating fleet type:", error)
            toast({
                title: tr("Error Updating Fleet Type"),
                description: error.message || "There was a problem updating the fleet type.",
                variant: "destructive",
            })
        },
    })

    const deleteFleetTypeMutation = useMutation({
        mutationFn: (id: number) => deleteFleetType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fleetTypes"] })
            toast({
                title: tr("Fleet Type deleted"),
                description: tr("The fleet type has been deleted successfully."),
            })
            setIsDeleteDialogOpen(false)
        },
        onError: (error) => {
            console.error("Error deleting fleet type:", error)
            toast({
                title: tr("Error"),
                description: tr("Failed to delete fleet type: {message}", { message: error.message }),
                variant: "destructive",
            })
        },
    })

    // Extract fleet types array from API response
    const fleetTypes = React.useMemo(() => {
        console.log("Processing fleet types data:", fleetTypesData)

        if (!fleetTypesData) return []

        // Handle the specific API structure: { fleetTypes: [...], pagination: {...} }
        if (fleetTypesData.fleetTypes && Array.isArray(fleetTypesData.fleetTypes)) {
            console.log("Extracted fleet types:", fleetTypesData.fleetTypes)
            return fleetTypesData.fleetTypes
        }

        // Fallback for other possible structures
        if (Array.isArray(fleetTypesData)) {
            return fleetTypesData
        }

        if (fleetTypesData.data && Array.isArray(fleetTypesData.data)) {
            return fleetTypesData.data
        }

        console.log("No fleet types found in response")
        return []
    }, [fleetTypesData])

    // Extract pagination from API response
    const pagination = React.useMemo(() => {
        console.log("Processing pagination data:", fleetTypesData)

        if (!fleetTypesData) {
            return { currentPage: 1, totalPages: 1, totalItems: 0, limit: pageSize }
        }

        // Handle the specific API structure: { fleetTypes: [...], pagination: {...} }
        if (fleetTypesData.pagination) {
            const paginationData = {
                currentPage: fleetTypesData.pagination.currentPage || currentPage,
                totalPages: fleetTypesData.pagination.totalPages || 1,
                totalItems: fleetTypesData.pagination.totalItems || fleetTypes.length,
                limit: fleetTypesData.pagination.limit || pageSize,
            }
            console.log("Extracted pagination:", paginationData)
            return paginationData
        }

        // Fallback for other possible structures
        if (fleetTypesData.meta) {
            return {
                currentPage: fleetTypesData.meta.current_page || currentPage,
                totalPages: fleetTypesData.meta.last_page || 1,
                totalItems: fleetTypesData.meta.total || fleetTypes.length,
                limit: fleetTypesData.meta.per_page || pageSize,
            }
        }

        // Default pagination
        return { currentPage: 1, totalPages: 1, totalItems: fleetTypes.length, limit: pageSize }
    }, [fleetTypesData, fleetTypes.length, pageSize, currentPage])

    const validateForm = () => {
        const errors: Record<string, string> = {}
        if (!formData.name.trim()) {
            errors.name = "Fleet type name is required"
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const resetForm = () => {
        setFormData({ name: "", description: "" })
        setFormErrors({})
        setSelectedFleetType(null)
    }

    const handleAddEdit = (fleetType?: FleetType) => {
        setFormErrors({})
        if (fleetType) {
            setSelectedFleetType(fleetType)
            setFormData({
                name: fleetType.name || "",
                description: fleetType.description || "",
            })
        } else {
            resetForm()
        }
        setIsAddEditDialogOpen(true)
    }

    const handleDeleteDialog = (fleetType: FleetType) => {
        setSelectedFleetType(fleetType)
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
            description: formData.description.trim() || undefined,
        }

        console.log("Submitting fleet type data:", apiData)

        if (selectedFleetType && selectedFleetType.id) {
            updateFleetTypeMutation.mutate({ id: selectedFleetType.id, data: apiData })
        } else {
            createFleetTypeMutation.mutate(apiData)
        }
    }

    const handleDeleteConfirm = () => {
        if (selectedFleetType && selectedFleetType.id) {
            deleteFleetTypeMutation.mutate(selectedFleetType.id)
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

    if (isLoadingFleetTypes && currentPage === 1 && !debouncedSearchQuery) {
        return (
            <div className="container mx-auto p-6 space-y-4">
                <div className="rounded-md border p-4 space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-6 gap-4 items-center">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12 justify-self-end" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (isErrorFleetTypes) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div>
                        <span className="font-medium">{tr("Error loading fleet types")}</span>
                        {fleetTypesError?.message && <p className="text-sm mt-1">{fleetTypesError.message}</p>}
                    </div>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetchFleetTypes()}>
                    <RefreshCw className="h-4 w-4 mr-2" />{tr("Retry")}</Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title={tr("Fleet Types")}
                description={tr("Manage vehicle fleet types in the system{v}", { v: pagination.totalItems > 0 ? ` (${pagination.totalItems} total)` : "" })}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchFleetTypes()}>
                            <RefreshCw className="h-4 w-4 mr-2" />{tr("Refresh")}</Button>
                        <ExportMenu filename="fleet-types" title={tr("Fleet types")} subtitle={tr("Rows on this page")} rows={fleetTypes} columns={[["ID", (r: any) => r.id], ["Fleet type", (r: any) => r.name], ["Description", (r: any) => r.description ?? ""], ["Created", (r: any) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : ""]]} className="h-9" />
                        <Button size="sm" onClick={() => handleAddEdit()}>
                            <Plus className="h-4 w-4 mr-2" />{tr("Add Fleet Type")}</Button>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Total Fleet Types")}</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pagination.totalItems}</div>
                        <p className="text-xs text-muted-foreground">{tr("All fleet types")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Current Page")}</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fleetTypes.length}</div>
                        <p className="text-xs text-muted-foreground">{tr("Showing on this page")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-background p-4 rounded-lg border">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={tr("Search fleet types by name...")}
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
                <TableBanner title={tr("Fleet Types")} description={tr("Vehicle categories such as bus, coaster or truck")} icon="fleet" />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>UUID</TableHead>
                            <TableHead>{tr("Fleet Type")}</TableHead>
                            <TableHead>{tr("Description")}</TableHead>
                            <TableHead>{tr("Created")}</TableHead>
                            <TableHead className="text-right">{tr("Actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fleetTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {isLoadingFleetTypes ? (
                                        <ListSkeleton rows={5} className="text-left" />
                                    ) : debouncedSearchQuery ? (
                                        <div className="text-muted-foreground">{tr("No fleet types found matching \"")}{debouncedSearchQuery}".
                                            <Button variant="link" className="ml-2" onClick={clearSearch}>{tr("Clear search")}</Button>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">{tr("No fleet types found.")}<Button variant="link" className="ml-2" onClick={() => handleAddEdit()}>{tr("Add your first fleet type")}</Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            fleetTypes.map((fleetType: FleetType) => (
                                <TableRow key={fleetType.id || fleetType.uuid}>
                                    <TableCell className="font-mono text-sm">{fleetType.id}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{fleetType.uuid}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <Truck className="h-4 w-4 mr-2 text-blue-600" />
                                            {fleetType.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {fleetType.description ? <span className="text-sm">{fleetType.description}</span> : "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {fleetType.createdAt || fleetType.created_at
                                            ? new Date(fleetType.createdAt || fleetType.created_at).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleAddEdit(fleetType)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteDialog(fleetType)}
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
                            {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}{" "}{tr("of")}{" "}{pagination.totalItems}{" "}{tr("fleet types")}</p>
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
                            disabled={pagination.currentPage <= 1 || isLoadingFleetTypes}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToPreviousPage}
                            disabled={pagination.currentPage <= 1 || isLoadingFleetTypes}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
              {tr("Page {currentPage} of {totalPages}", { currentPage: pagination.currentPage, totalPages: pagination.totalPages })}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToNextPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingFleetTypes}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToLastPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingFleetTypes}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add/Edit Fleet Type Dialog */}
            <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedFleetType ? tr("Edit Fleet Type") : tr("Add New Fleet Type")}</DialogTitle>
                        <DialogDescription>
                            {selectedFleetType ? tr("Update the fleet type details.") : tr("Create a new vehicle fleet type.")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{tr("Fleet Type Name")}{" "}<span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    placeholder={tr("Enter fleet type name")}
                                    required
                                    className={formErrors.name ? "border-red-500" : ""}
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{tr("Description")}</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange("description", e.target.value)}
                                    placeholder={tr("Enter description (optional)")}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddEditDialogOpen(false)}
                                disabled={createFleetTypeMutation.isPending || updateFleetTypeMutation.isPending}
                            >{tr("Cancel")}</Button>
                            <Button type="submit" disabled={createFleetTypeMutation.isPending || updateFleetTypeMutation.isPending}>
                                {createFleetTypeMutation.isPending || updateFleetTypeMutation.isPending ? (
                                    <>
                                        <LoadingSpinner className="mr-2" size="sm" />
                                        {selectedFleetType ? tr("Updating...") : tr("Creating...")}
                                    </>
                                ) : selectedFleetType ? (
                                    tr("Update Fleet Type")
                                ) : (
                                    tr("Create Fleet Type")
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
                            {tr("This will permanently delete the fleet type \"{name}\". This action cannot be undone.", { name: selectedFleetType?.name })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteFleetTypeMutation.isPending}>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteFleetTypeMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteFleetTypeMutation.isPending ? (
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
