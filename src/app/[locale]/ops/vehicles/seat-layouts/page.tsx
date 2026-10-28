"use client"

import React from "react"
import type { SeatLayout } from "@/types/seat-layout"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getSeatLayouts, createSeatLayout, updateSeatLayout, deleteSeatLayout } from "@/lib/services/seat-layout"
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
    Grid,
    ChevronsLeft,
    ChevronsRight,
    X,
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { TableBanner } from "@/components/ui/table-banner"
import { ListSkeleton } from "@/components/ui/skeletons"
import { ExportMenu } from "@/components/export/export-menu"
import { useTr } from "@/lib/i18n/portal"

export default function SeatLayoutsPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedSeatLayout, setSelectedSeatLayout] = useState<SeatLayout | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        totalSeats: "",
        configuration: "",
    })

    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Debounce search query
    const debouncedSearchQuery = useDebounce(searchQuery, 500)

    const {
        data: seatLayoutsData,
        isLoading: isLoadingSeatLayouts,
        isError: isErrorSeatLayouts,
        error: seatLayoutsError,
        refetch: refetchSeatLayouts,
    } = useQuery({
        queryKey: ["seatLayouts", currentPage, pageSize, debouncedSearchQuery],
        queryFn: async () => {
            try {
                console.log("Fetching seat layouts with params:", {
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                })

                const response = await getSeatLayouts({
                    paginate: true,
                    page: currentPage,
                    limit: pageSize,
                    name: debouncedSearchQuery || undefined,
                })

                console.log("Seat layouts API response:", response)
                return response
            } catch (error: any) {
                console.error("Error fetching seat layouts:", error)

                // Handle authentication errors
                if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
                    toast({
                        title: tr("Authentication Error"),
                        description: tr("Please log in again to access this data."),
                        variant: "destructive",
                    })
                } else {
                    toast({
                        title: tr("Error Loading Seat Layouts"),
                        description: error.message || "Failed to load seat layouts. Please try again.",
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

    const createSeatLayoutMutation = useMutation({
        mutationFn: createSeatLayout,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seatLayouts"] })
            toast({
                title: tr("Seat Layout created"),
                description: tr("The seat layout has been created successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            console.error("Error creating seat layout:", error)
            toast({
                title: tr("Error Creating Seat Layout"),
                description: error.message || "There was a problem creating the seat layout.",
                variant: "destructive",
            })
        },
    })

    const updateSeatLayoutMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateSeatLayout(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seatLayouts"] })
            toast({
                title: tr("Seat Layout updated"),
                description: tr("The seat layout has been updated successfully."),
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            console.error("Error updating seat layout:", error)
            toast({
                title: tr("Error Updating Seat Layout"),
                description: error.message || "There was a problem updating the seat layout.",
                variant: "destructive",
            })
        },
    })

    const deleteSeatLayoutMutation = useMutation({
        mutationFn: (id: number) => deleteSeatLayout(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seatLayouts"] })
            toast({
                title: tr("Seat Layout deleted"),
                description: tr("The seat layout has been deleted successfully."),
            })
            setIsDeleteDialogOpen(false)
        },
        onError: (error) => {
            console.error("Error deleting seat layout:", error)
            toast({
                title: tr("Error"),
                description: tr("Failed to delete seat layout: {message}", { message: error.message }),
                variant: "destructive",
            })
        },
    })

    // Extract seat layouts array from API response
    const seatLayouts = React.useMemo(() => {
        console.log("Processing seat layouts data:", seatLayoutsData)

        if (!seatLayoutsData) return []

        // Handle the specific API structure: { seatLayouts: [...], pagination: {...} }
        if (seatLayoutsData.seatLayouts && Array.isArray(seatLayoutsData.seatLayouts)) {
            console.log("Extracted seat layouts:", seatLayoutsData.seatLayouts)
            return seatLayoutsData.seatLayouts
        }

        // Fallback for other possible structures
        if (Array.isArray(seatLayoutsData)) {
            return seatLayoutsData
        }

        if (seatLayoutsData.data && Array.isArray(seatLayoutsData.data)) {
            return seatLayoutsData.data
        }

        console.log("No seat layouts found in response")
        return []
    }, [seatLayoutsData])

    // Extract pagination from API response
    const pagination = React.useMemo(() => {
        console.log("Processing pagination data:", seatLayoutsData)

        if (!seatLayoutsData) {
            return { currentPage: 1, totalPages: 1, totalItems: 0, limit: pageSize }
        }

        // Handle the specific API structure: { seatLayouts: [...], pagination: {...} }
        if (seatLayoutsData.pagination) {
            const paginationData = {
                currentPage: seatLayoutsData.pagination.currentPage || currentPage,
                totalPages: seatLayoutsData.pagination.totalPages || 1,
                totalItems: seatLayoutsData.pagination.totalItems || seatLayouts.length,
                limit: seatLayoutsData.pagination.limit || pageSize,
            }
            console.log("Extracted pagination:", paginationData)
            return paginationData
        }

        // Fallback for other possible structures
        if (seatLayoutsData.meta) {
            return {
                currentPage: seatLayoutsData.meta.current_page || currentPage,
                totalPages: seatLayoutsData.meta.last_page || 1,
                totalItems: seatLayoutsData.meta.total || seatLayouts.length,
                limit: seatLayoutsData.meta.per_page || pageSize,
            }
        }

        // Default pagination
        return { currentPage: 1, totalPages: 1, totalItems: seatLayouts.length, limit: pageSize }
    }, [seatLayoutsData, seatLayouts.length, pageSize, currentPage])

    const validateForm = () => {
        const errors: Record<string, string> = {}
        if (!formData.name.trim()) {
            errors.name = "Seat layout name is required"
        }
        if (formData.totalSeats && isNaN(Number(formData.totalSeats))) {
            errors.totalSeats = "Total seats must be a valid number"
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            totalSeats: "",
            configuration: "",
        })
        setFormErrors({})
        setSelectedSeatLayout(null)
    }

    const handleAddEdit = (seatLayout?: SeatLayout) => {
        setFormErrors({})
        if (seatLayout) {
            setSelectedSeatLayout(seatLayout)
            setFormData({
                name: seatLayout.name || "",
                description: seatLayout.description || "",
                totalSeats: seatLayout.totalSeats?.toString() || "",
                configuration: seatLayout.configuration || "",
            })
        } else {
            resetForm()
        }
        setIsAddEditDialogOpen(true)
    }

    const handleDeleteDialog = (seatLayout: SeatLayout) => {
        setSelectedSeatLayout(seatLayout)
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
            totalSeats: formData.totalSeats ? Number(formData.totalSeats) : undefined,
            configuration: formData.configuration.trim() || undefined,
        }

        console.log("Submitting seat layout data:", apiData)

        if (selectedSeatLayout && selectedSeatLayout.id) {
            updateSeatLayoutMutation.mutate({ id: selectedSeatLayout.id, data: apiData })
        } else {
            createSeatLayoutMutation.mutate(apiData)
        }
    }

    const handleDeleteConfirm = () => {
        if (selectedSeatLayout && selectedSeatLayout.id) {
            deleteSeatLayoutMutation.mutate(selectedSeatLayout.id)
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

    if (isLoadingSeatLayouts && currentPage === 1 && !debouncedSearchQuery) {
        return (
            <div className="container mx-auto p-6 space-y-4">
                <div className="rounded-md border p-4 space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-7 gap-4 items-center">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12 justify-self-end" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (isErrorSeatLayouts) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div>
                        <span className="font-medium">{tr("Error loading seat layouts")}</span>
                        {seatLayoutsError?.message && <p className="text-sm mt-1">{seatLayoutsError.message}</p>}
                    </div>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetchSeatLayouts()}>
                    <RefreshCw className="h-4 w-4 mr-2" />{tr("Retry")}</Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title={tr("Seat Layouts")}
                description={tr("Manage vehicle seat layouts in the system{v}", { v: pagination.totalItems > 0 ? ` (${pagination.totalItems} total)` : "" })}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchSeatLayouts()}>
                            <RefreshCw className="h-4 w-4 mr-2" />{tr("Refresh")}</Button>
                        <ExportMenu filename="seat-layouts" title={tr("Seat layouts")} subtitle={tr("Rows on this page")} rows={seatLayouts} columns={[["ID", (r: any) => r.id], ["Seat layout", (r: any) => r.name], ["Total seats", (r: any) => r.totalSeats], ["Description", (r: any) => r.description ?? ""], ["Created", (r: any) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : ""]]} className="h-9" />
                        <Button size="sm" onClick={() => handleAddEdit()}>
                            <Plus className="h-4 w-4 mr-2" />{tr("Add Seat Layout")}</Button>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Total Seat Layouts")}</CardTitle>
                        <Grid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pagination.totalItems}</div>
                        <p className="text-xs text-muted-foreground">{tr("All seat layouts")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Current Page")}</CardTitle>
                        <Grid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{seatLayouts.length}</div>
                        <p className="text-xs text-muted-foreground">{tr("Showing on this page")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-background p-4 rounded-lg border">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={tr("Search seat layouts by name...")}
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
                <TableBanner title={tr("Seat Layouts")} description={tr("Seating plans that can be assigned to vehicles")} icon="layouts" />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>UUID</TableHead>
                            <TableHead>{tr("Seat Layout")}</TableHead>
                            <TableHead>{tr("Total Seats")}</TableHead>
                            <TableHead>{tr("Description")}</TableHead>
                            <TableHead>{tr("Created")}</TableHead>
                            <TableHead className="text-right">{tr("Actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {seatLayouts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {isLoadingSeatLayouts ? (
                                        <ListSkeleton rows={5} className="text-left" />
                                    ) : debouncedSearchQuery ? (
                                        <div className="text-muted-foreground">{tr("No seat layouts found matching \"")}{debouncedSearchQuery}".
                                            <Button variant="link" className="ml-2" onClick={clearSearch}>{tr("Clear search")}</Button>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">{tr("No seat layouts found.")}<Button variant="link" className="ml-2" onClick={() => handleAddEdit()}>{tr("Add your first seat layout")}</Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            seatLayouts.map((seatLayout: SeatLayout) => (
                                <TableRow key={seatLayout.id || seatLayout.uuid}>
                                    <TableCell className="font-mono text-sm">{seatLayout.id}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{seatLayout.uuid}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <Grid className="h-4 w-4 mr-2 text-blue-600" />
                                            {seatLayout.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {seatLayout.totalSeats ? <span className="font-medium">{seatLayout.totalSeats}</span> : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {seatLayout.description ? <span className="text-sm">{seatLayout.description}</span> : "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {seatLayout.createdAt || seatLayout.created_at
                                            ? new Date(seatLayout.createdAt || seatLayout.created_at).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleAddEdit(seatLayout)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteDialog(seatLayout)}
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
                            {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}{" "}{tr("of")}{" "}{pagination.totalItems}{" "}{tr("seat layouts")}</p>
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
                            disabled={pagination.currentPage <= 1 || isLoadingSeatLayouts}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToPreviousPage}
                            disabled={pagination.currentPage <= 1 || isLoadingSeatLayouts}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
              {tr("Page {currentPage} of {totalPages}", { currentPage: pagination.currentPage, totalPages: pagination.totalPages })}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToNextPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingSeatLayouts}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToLastPage}
                            disabled={pagination.currentPage >= pagination.totalPages || isLoadingSeatLayouts}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add/Edit Seat Layout Dialog */}
            <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{selectedSeatLayout ? tr("Edit Seat Layout") : tr("Add New Seat Layout")}</DialogTitle>
                        <DialogDescription>
                            {selectedSeatLayout ? tr("Update the seat layout details.") : tr("Create a new vehicle seat layout.")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{tr("Layout Name")}{" "}<span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange("name", e.target.value)}
                                        placeholder={tr("Enter seat layout name")}
                                        required
                                        className={formErrors.name ? "border-red-500" : ""}
                                    />
                                    {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="totalSeats">{tr("Total Seats")}</Label>
                                    <Input
                                        id="totalSeats"
                                        type="number"
                                        value={formData.totalSeats}
                                        onChange={(e) => handleInputChange("totalSeats", e.target.value)}
                                        placeholder={tr("Number of seats")}
                                        className={formErrors.totalSeats ? "border-red-500" : ""}
                                    />
                                    {formErrors.totalSeats && <p className="text-sm text-red-500">{formErrors.totalSeats}</p>}
                                </div>
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
                            <div className="space-y-2">
                                <Label htmlFor="configuration">{tr("Layout Configuration")}</Label>
                                <Textarea
                                    id="configuration"
                                    value={formData.configuration}
                                    onChange={(e) => handleInputChange("configuration", e.target.value)}
                                    placeholder={tr("Enter layout configuration (JSON or other format)")}
                                    rows={6}
                                />
                                <p className="text-xs text-muted-foreground">{tr("Enter the seat layout configuration in JSON format or as specified by your system.")}</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddEditDialogOpen(false)}
                                disabled={createSeatLayoutMutation.isPending || updateSeatLayoutMutation.isPending}
                            >{tr("Cancel")}</Button>
                            <Button type="submit" disabled={createSeatLayoutMutation.isPending || updateSeatLayoutMutation.isPending}>
                                {createSeatLayoutMutation.isPending || updateSeatLayoutMutation.isPending ? (
                                    <>
                                        <LoadingSpinner className="mr-2" size="sm" />
                                        {selectedSeatLayout ? tr("Updating...") : tr("Creating...")}
                                    </>
                                ) : selectedSeatLayout ? (
                                    tr("Update Seat Layout")
                                ) : (
                                    tr("Create Seat Layout")
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
                            {tr("This will permanently delete the seat layout \"{name}\". This action cannot be undone.", { name: selectedSeatLayout?.name })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteSeatLayoutMutation.isPending}>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteSeatLayoutMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteSeatLayoutMutation.isPending ? (
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
