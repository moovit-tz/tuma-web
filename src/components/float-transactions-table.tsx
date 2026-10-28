"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, Phone, CreditCard, User, Building, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useTr } from "@/lib/i18n/portal"

// Updated FloatTransaction interface to match the provided backend data structure
interface FloatTransaction {
    id: number
    phoneNumber: string // Top-level
    floatAccountNumber: string // Top-level
    amount: string
    createdAt: string
    updatedAt: string
    status: string
    floatId: number | null // Can be null
    userId: number
    transactionReference: string
    providerId: number // Top-level
    providerResponse: string | null // Top-level
    uuid: string
    // The 'float' object itself is null in the provided sample data,
    // so its properties are expected at the top level of FloatTransaction.
    // If 'float' object is sometimes present with these properties,
    // a more complex type union or optional chaining would be needed.
    user: {
        id: number
        username: string
        fullName: string
        phoneNumber: string
    }
}

interface Pagination {
    currentPage: number
    totalPages: number
    totalItems: number
}

interface FloatTransactionsTableProps {
    data: FloatTransaction[]
    loading: boolean
    pagination?: Pagination
    currentPage: number
    onPageChange: (page: number) => void
    showPagination?: boolean // New prop to control pagination visibility
    paymentChannelsMap: { value: string; label: string }[] // New prop for channel mapping
}

export function FloatTransactionsTable({
                                           data,
                                           loading,
                                           pagination,
                                           currentPage,
                                           onPageChange,
                                           showPagination = true, // Default to true
                                           paymentChannelsMap,
                                       }: FloatTransactionsTableProps) {
    const tr = useTr()
    const [selectedTransaction, setSelectedTransaction] = useState<FloatTransaction | null>(null)

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            PENDING: {
                className:
                    "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
            },
            PAID: {
                className:
                    "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
            },
            FAILED: {
                className:
                    "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
            },
            CANCELLED: {
                className:
                    "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
            },
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING

        return (
            <Badge variant="outline" className={config.className}>
                {status}
            </Badge>
        )
    }

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat("en-TZ", {
            style: "currency",
            currency: "TZS",
            minimumFractionDigits: 0,
        }).format(Number.parseFloat(amount))
    }

    const getPaymentChannelLabel = (providerId: number | undefined) => {
        // This mapping is based on common provider IDs, adjust if your backend uses different IDs
        // or if there's a direct 'paymentChannel' field in the transaction.
        // For now, using a simple mapping or fallback.
        const channel = paymentChannelsMap.find(
            (c) => c.value !== "all" && c.label.toLowerCase().includes(providerId === 2 ? "azam" : "unknown"), // Example mapping
        )
        return channel ? channel.label : `Provider ID: ${providerId || "N/A"}`
    }

    const generatePageNumbers = () => {
        if (!pagination) return []

        const { currentPage, totalPages } = pagination
        const pages = []
        const maxVisiblePages = 5

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i)
                }
                pages.push("...")
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1)
                pages.push("...")
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i)
                }
            } else {
                pages.push(1)
                pages.push("...")
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i)
                }
                pages.push("...")
                pages.push(totalPages)
            }
        }

        return pages
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{tr("Loading Transactions...")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{tr("No Transactions Found")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{tr("No float transactions match your current filters.")}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{tr("Float Transactions")}{showPagination && pagination && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                {tr("(Page {currentPage} of {totalPages})", { currentPage: pagination.currentPage, totalPages: pagination.totalPages })}</span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tr("Transaction")}</TableHead>
                                    <TableHead>{tr("User")}</TableHead>
                                    <TableHead>{tr("Phone")}</TableHead>
                                    <TableHead>{tr("Amount")}</TableHead>
                                    <TableHead>{tr("Channel")}</TableHead>
                                    <TableHead>{tr("Status")}</TableHead>
                                    <TableHead>{tr("Date")}</TableHead>
                                    <TableHead>{tr("Actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="font-medium text-sm">{transaction.transactionReference}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{transaction.floatAccountNumber}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="font-medium text-sm">{transaction.user.fullName}</div>
                                                <div className="text-xs text-muted-foreground">@{transaction.user.username}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-1">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm font-mono">{transaction.phoneNumber}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {getPaymentChannelLabel(transaction.providerId)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="text-sm">{format(new Date(transaction.createdAt), "MMM dd, yyyy")}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {format(new Date(transaction.createdAt), "HH:mm:ss")}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(transaction)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>{tr("Transaction Details")}</DialogTitle>
                                                    </DialogHeader>
                                                    {selectedTransaction && (
                                                        <div className="space-y-6">
                                                            {/* Transaction Info */}
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium flex items-center">
                                                                        <CreditCard className="h-4 w-4 mr-2" />{tr("Transaction")}</h4>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div>
                                                                            <strong>{tr("Reference:")}</strong>
                                                                            <span className="font-mono ml-1">{selectedTransaction.transactionReference}</span>
                                                                        </div>
                                                                        <div>
                                                                            <strong>{tr("Amount:")}</strong> {formatCurrency(selectedTransaction.amount)}
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <strong>{tr("Status:")}</strong> {getStatusBadge(selectedTransaction.status)}
                                                                        </div>
                                                                        <div>
                                                                            <strong>{tr("Phone:")}</strong>
                                                                            <span className="font-mono ml-1">{selectedTransaction.phoneNumber}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium flex items-center">
                                                                        <User className="h-4 w-4 mr-2" />{tr("User Details")}</h4>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div>
                                                                            <strong>{tr("Name:")}</strong> {selectedTransaction.user.fullName}
                                                                        </div>
                                                                        <div>
                                                                            <strong>{tr("Username:")}</strong> @{selectedTransaction.user.username}
                                                                        </div>
                                                                        <div>
                                                                            <strong>{tr("Phone:")}</strong>
                                                                            <span className="font-mono ml-1">{selectedTransaction.user.phoneNumber}</span>
                                                                        </div>
                                                                        <div>
                                                                            <strong>{tr("User ID:")}</strong> {selectedTransaction.user.id}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Float Info (Adjusted for top-level properties) */}
                                                            <div className="space-y-2">
                                                                <h4 className="font-medium flex items-center">
                                                                    <Building className="h-4 w-4 mr-2" />{tr("Float Details")}</h4>
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div className="space-y-1">
                                                                        <div>
                                                                            <strong>{tr("Account:")}</strong>
                                                                            <span className="font-mono ml-1">{selectedTransaction.floatAccountNumber}</span>
                                                                        </div>
                                                                        <div>
                                                                            <strong>{tr("Channel:")}</strong>
                                                                            <Badge variant="outline" className="ml-1 text-xs">
                                                                                {getPaymentChannelLabel(selectedTransaction.providerId)}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {selectedTransaction.providerResponse && (
                                                                    <div className="mt-2 p-3 bg-muted rounded-md">
                                                                        <strong>{tr("Provider Response:")}</strong>
                                                                        <p className="text-sm text-muted-foreground mt-1">
                                                                            {selectedTransaction.providerResponse}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Timestamps */}
                                                            <div className="space-y-2">
                                                                <h4 className="font-medium">{tr("Timeline")}</h4>
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                        <strong>{tr("Created:")}</strong>
                                                                        <div className="text-muted-foreground">
                                                                            {format(new Date(selectedTransaction.createdAt), "PPpp")}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <strong>{tr("Updated:")}</strong>
                                                                        <div className="text-muted-foreground">
                                                                            {format(new Date(selectedTransaction.updatedAt), "PPpp")}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {showPagination && pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between space-x-2 py-4">
                            <div className="text-sm text-muted-foreground">{tr("Showing")}{" "}{(currentPage - 1) * 50 + 1}-{Math.min(currentPage * 50, pagination.totalItems)}{" "}{tr("of")}{" "}
                                {pagination.totalItems.toLocaleString()}{" "}{tr("transactions")}</div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />{tr("Previous")}</Button>

                                <div className="flex items-center space-x-1">
                                    {generatePageNumbers().map((page, index) => (
                                        <Button
                                            key={index}
                                            variant={page === currentPage ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => typeof page === "number" && onPageChange(page)}
                                            disabled={page === "..."}
                                            className="min-w-[40px]"
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange(currentPage + 1)}
                                    disabled={currentPage >= pagination.totalPages}
                                >{tr("Next")}<ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
