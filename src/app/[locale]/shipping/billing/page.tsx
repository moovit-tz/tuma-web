"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    CreditCard,
    DollarSign,
    Download,
    Plus,
    Eye,
    AlertCircle,
    CheckCircle,
    Clock,
    Smartphone,
    Building,
    Trash2,
} from "lucide-react"
import { useTitle } from "@/context/TitleContext"
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data
const billingStats = {
    totalSpent: 245000,
    pendingAmount: 85000,
    overdueAmount: 12000,
    thisMonth: 45000,
}

const invoices = [
    {
        id: "INV-001",
        cargoId: "CRG-001",
        description: "Electronics shipment to Mwanza",
        amount: 85000,
        status: "paid",
        dueDate: "2024-01-15",
        paidDate: "2024-01-14",
        transporterName: "Swift Logistics",
    },
    {
        id: "INV-002",
        cargoId: "CRG-002",
        description: "Furniture delivery to Arusha",
        amount: 120000,
        status: "pending",
        dueDate: "2024-01-20",
        paidDate: null,
        transporterName: "Reliable Transport",
    },
    {
        id: "INV-003",
        cargoId: "CRG-003",
        description: "Medical supplies to Dodoma",
        amount: 65000,
        status: "overdue",
        dueDate: "2024-01-10",
        paidDate: null,
        transporterName: "MedTrans Ltd",
    },
]

const paymentMethods = [
    {
        id: "pm-1",
        type: "card",
        last4: "4242",
        brand: "Visa",
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
    },
    {
        id: "pm-2",
        type: "mobile_money",
        provider: "M-Pesa",
        phoneNumber: "+255 712 345 678",
        isDefault: false,
    },
    {
        id: "pm-3",
        type: "bank_account",
        bankName: "CRDB Bank",
        accountNumber: "****1234",
        isDefault: false,
    },
]

const transactions = [
    {
        id: "txn-001",
        invoiceId: "INV-001",
        amount: 85000,
        status: "completed",
        date: "2024-01-14",
        method: "Visa ****4242",
        description: "Payment for electronics shipment",
    },
    {
        id: "txn-002",
        invoiceId: "INV-004",
        amount: 45000,
        status: "completed",
        date: "2024-01-12",
        method: "M-Pesa",
        description: "Payment for agricultural products",
    },
    {
        id: "txn-003",
        invoiceId: "INV-002",
        amount: 120000,
        status: "failed",
        date: "2024-01-18",
        method: "CRDB Bank ****1234",
        description: "Payment for furniture delivery",
    },
]

const getStatusColor = (status: string) => {
    switch (status) {
        case "paid":
        case "completed":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        case "pending":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        case "overdue":
        case "failed":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case "paid":
        case "completed":
            return <CheckCircle className="h-4 w-4" />
        case "pending":
            return <Clock className="h-4 w-4" />
        case "overdue":
        case "failed":
            return <AlertCircle className="h-4 w-4" />
        default:
            return <Clock className="h-4 w-4" />
    }
}

const getPaymentMethodIcon = (type: string) => {
    switch (type) {
        case "card":
            return <CreditCard className="h-5 w-5" />
        case "mobile_money":
            return <Smartphone className="h-5 w-5" />
        case "bank_account":
            return <Building className="h-5 w-5" />
        default:
            return <CreditCard className="h-5 w-5" />
    }
}

export default function BillingPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false)
    const [newPaymentMethod, setNewPaymentMethod] = useState({
        type: "card",
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: "",
        phoneNumber: "",
        bankName: "",
        accountNumber: "",
    })

    useEffect(() => {
        setTitle("Billing & Payments")
    }, [setTitle])

    const handlePayInvoice = (invoiceId: string) => {
        toast({
            title: "Payment Initiated",
            description: `Payment for invoice ${invoiceId} has been initiated.`,
        })
    }

    const handleDownloadInvoice = (invoiceId: string) => {
        toast({
            title: "Download Started",
            description: `Invoice ${invoiceId} is being downloaded.`,
        })
    }

    const handleAddPaymentMethod = () => {
        toast({
            title: "Payment Method Added",
            description: "Your new payment method has been added successfully.",
        })
        setIsAddingPaymentMethod(false)
        setNewPaymentMethod({
            type: "card",
            cardNumber: "",
            expiryMonth: "",
            expiryYear: "",
            cvv: "",
            phoneNumber: "",
            bankName: "",
            accountNumber: "",
        })
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Billing & Payments</h2>
                    <p className="text-muted-foreground">Manage your invoices, payment methods, and transaction history</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">TSh {billingStats.totalSpent.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All time spending</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">TSh {billingStats.pendingAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Awaiting payment</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">TSh {billingStats.overdueAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Past due date</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">TSh {billingStats.thisMonth.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">January 2024</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="invoices" className="space-y-4">
                <TabsList className="portal-sticky-tabs">
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
                    <TabsTrigger value="transactions">Transaction History</TabsTrigger>
                </TabsList>

                <TabsContent value="invoices" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoices</CardTitle>
                            <CardDescription>View and manage your shipping invoices</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {invoices.map((invoice) => (
                                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <DollarSign className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {invoice.description}
                                                </p>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <span>Invoice: {invoice.id}</span>
                                                    <span>•</span>
                                                    <span>Due: {invoice.dueDate}</span>
                                                    <span>•</span>
                                                    <span>{invoice.transporterName}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-lg font-semibold">TSh {invoice.amount.toLocaleString()}</p>
                                                <Badge className={getStatusColor(invoice.status)}>
                                                    {getStatusIcon(invoice.status)}
                                                    <span className="ml-1 capitalize">{invoice.status}</span>
                                                </Badge>
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice.id)}>
                                                    <Download className="h-4 w-4 mr-1" />
                                                    Download
                                                </Button>
                                                {invoice.status === "pending" || invoice.status === "overdue" ? (
                                                    <Button size="sm" onClick={() => handlePayInvoice(invoice.id)}>
                                                        Pay Now
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payment-methods" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Payment Methods</CardTitle>
                                    <CardDescription>Manage your payment methods for shipping invoices</CardDescription>
                                </div>
                                <Dialog open={isAddingPaymentMethod} onOpenChange={setIsAddingPaymentMethod}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Payment Method
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Add Payment Method</DialogTitle>
                                            <DialogDescription>Add a new payment method to your account.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="payment-type">Payment Type</Label>
                                                <Select
                                                    value={newPaymentMethod.type}
                                                    onValueChange={(value) => setNewPaymentMethod({ ...newPaymentMethod, type: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select payment type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                                                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                                        <SelectItem value="bank_account">Bank Account</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {newPaymentMethod.type === "card" && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="card-number">Card Number</Label>
                                                        <Input
                                                            id="card-number"
                                                            placeholder="1234 5678 9012 3456"
                                                            value={newPaymentMethod.cardNumber}
                                                            onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardNumber: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="expiry-month">Month</Label>
                                                            <Input
                                                                id="expiry-month"
                                                                placeholder="MM"
                                                                value={newPaymentMethod.expiryMonth}
                                                                onChange={(e) =>
                                                                    setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })
                                                                }
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="expiry-year">Year</Label>
                                                            <Input
                                                                id="expiry-year"
                                                                placeholder="YYYY"
                                                                value={newPaymentMethod.expiryYear}
                                                                onChange={(e) =>
                                                                    setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })
                                                                }
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="cvv">CVV</Label>
                                                            <Input
                                                                id="cvv"
                                                                placeholder="123"
                                                                value={newPaymentMethod.cvv}
                                                                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {newPaymentMethod.type === "mobile_money" && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone-number">Phone Number</Label>
                                                    <Input
                                                        id="phone-number"
                                                        placeholder="+255 712 345 678"
                                                        value={newPaymentMethod.phoneNumber}
                                                        onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, phoneNumber: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {newPaymentMethod.type === "bank_account" && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="bank-name">Bank Name</Label>
                                                        <Input
                                                            id="bank-name"
                                                            placeholder="CRDB Bank"
                                                            value={newPaymentMethod.bankName}
                                                            onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, bankName: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="account-number">Account Number</Label>
                                                        <Input
                                                            id="account-number"
                                                            placeholder="1234567890"
                                                            value={newPaymentMethod.accountNumber}
                                                            onChange={(e) =>
                                                                setNewPaymentMethod({ ...newPaymentMethod, accountNumber: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" onClick={handleAddPaymentMethod}>
                                                Add Payment Method
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {paymentMethods.map((method) => (
                                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">{getPaymentMethodIcon(method.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                {method.type === "card" && (
                                                    <>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {method.brand} ending in {method.last4}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Expires {method.expiryMonth}/{method.expiryYear}
                                                        </p>
                                                    </>
                                                )}
                                                {method.type === "mobile_money" && (
                                                    <>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{method.provider}</p>
                                                        <p className="text-sm text-muted-foreground">{method.phoneNumber}</p>
                                                    </>
                                                )}
                                                {method.type === "bank_account" && (
                                                    <>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{method.bankName}</p>
                                                        <p className="text-sm text-muted-foreground">Account {method.accountNumber}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            {method.isDefault && <Badge variant="secondary">Default</Badge>}
                                            <div className="flex space-x-2">
                                                {!method.isDefault && (
                                                    <Button variant="outline" size="sm">
                                                        Set Default
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive bg-transparent"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>View your complete payment transaction history</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <DollarSign className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {transaction.description}
                                                </p>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <span>{transaction.date}</span>
                                                    <span>•</span>
                                                    <span>{transaction.method}</span>
                                                    <span>•</span>
                                                    <span>Invoice: {transaction.invoiceId}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-lg font-semibold">TSh {transaction.amount.toLocaleString()}</p>
                                                <Badge className={getStatusColor(transaction.status)}>
                                                    {getStatusIcon(transaction.status)}
                                                    <span className="ml-1 capitalize">{transaction.status}</span>
                                                </Badge>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
