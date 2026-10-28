"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Package,
    TrendingUp,
    Clock,
    DollarSign,
    Plus,
    Eye,
    MapPin,
    Truck,
    AlertCircle,
    CheckCircle,
    XCircle,
} from "lucide-react"
import { useTitle } from "@/context/TitleContext"

// Mock data
const dashboardStats = {
    totalCargo: 24,
    activeBids: 8,
    inTransit: 5,
    totalSpent: 12450.0,
}

const recentCargo = [
    {
        id: "CRG-001",
        description: "Electronics shipment to Mwanza",
        weight: "150 kg",
        status: "in_transit",
        destination: "Mwanza",
        estimatedDelivery: "2024-01-15",
        currentBids: 3,
        bestBid: 85000,
    },
    {
        id: "CRG-002",
        description: "Furniture delivery to Arusha",
        weight: "300 kg",
        status: "pending_bids",
        destination: "Arusha",
        estimatedDelivery: "2024-01-18",
        currentBids: 7,
        bestBid: 120000,
    },
    {
        id: "CRG-003",
        description: "Medical supplies to Dodoma",
        weight: "75 kg",
        status: "delivered",
        destination: "Dodoma",
        estimatedDelivery: "2024-01-10",
        currentBids: 5,
        bestBid: 65000,
    },
]

const activeBids = [
    {
        id: "BID-001",
        cargoId: "CRG-001",
        transporterName: "Swift Logistics",
        amount: 85000,
        rating: 4.8,
        estimatedDays: 3,
        status: "pending",
    },
    {
        id: "BID-002",
        cargoId: "CRG-002",
        transporterName: "Reliable Transport",
        amount: 120000,
        rating: 4.6,
        estimatedDays: 4,
        status: "accepted",
    },
]

const getStatusColor = (status: string) => {
    switch (status) {
        case "delivered":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        case "in_transit":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
        case "pending_bids":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        case "cancelled":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case "delivered":
            return <CheckCircle className="h-4 w-4" />
        case "in_transit":
            return <Truck className="h-4 w-4" />
        case "pending_bids":
            return <Clock className="h-4 w-4" />
        case "cancelled":
            return <XCircle className="h-4 w-4" />
        default:
            return <AlertCircle className="h-4 w-4" />
    }
}

export default function ShippingDashboard() {
    const { setTitle } = useTitle()

    useEffect(() => {
        setTitle("Shipping Dashboard")
    }, [setTitle])

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Welcome back!</h2>
                    <p className="text-muted-foreground">Here's what's happening with your cargo shipments today.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Send New Cargo
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cargo</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.totalCargo}</div>
                        <p className="text-xs text-muted-foreground">+2 from last month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.activeBids}</div>
                        <p className="text-xs text-muted-foreground">+4 from yesterday</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.inTransit}</div>
                        <p className="text-xs text-muted-foreground">2 arriving today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">TSh {dashboardStats.totalSpent.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+12% from last month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="cargo" className="space-y-4">
                <TabsList className="portal-sticky-tabs">
                    <TabsTrigger value="cargo">Recent Cargo</TabsTrigger>
                    <TabsTrigger value="bids">Active Bids</TabsTrigger>
                </TabsList>

                <TabsContent value="cargo" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Cargo Shipments</CardTitle>
                            <CardDescription>Your latest cargo shipments and their current status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentCargo.map((cargo) => (
                                    <div key={cargo.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <Package className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {cargo.description}
                                                </p>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <span>{cargo.weight}</span>
                                                    <span>•</span>
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{cargo.destination}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <Badge className={getStatusColor(cargo.status)}>
                                                    {getStatusIcon(cargo.status)}
                                                    <span className="ml-1 capitalize">{cargo.status.replace("_", " ")}</span>
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {cargo.currentBids} bids • TSh {cargo.bestBid.toLocaleString()}
                                                </p>
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

                <TabsContent value="bids" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Bids</CardTitle>
                            <CardDescription>Bids you've received from transporters</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {activeBids.map((bid) => (
                                    <div key={bid.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{bid.transporterName}</p>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <span>Cargo: {bid.cargoId}</span>
                                                    <span>•</span>
                                                    <span>Rating: {bid.rating}/5</span>
                                                    <span>•</span>
                                                    <span>{bid.estimatedDays} days</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-lg font-semibold">TSh {bid.amount.toLocaleString()}</p>
                                                <Badge variant={bid.status === "accepted" ? "default" : "secondary"}>{bid.status}</Badge>
                                            </div>
                                            <div className="flex space-x-2">
                                                {bid.status === "pending" && (
                                                    <>
                                                        <Button variant="outline" size="sm">
                                                            Decline
                                                        </Button>
                                                        <Button size="sm">Accept</Button>
                                                    </>
                                                )}
                                                {bid.status === "accepted" && (
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Track
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
            </Tabs>
        </div>
    )
}
