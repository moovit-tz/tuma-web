"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Plus, Search, Eye, Edit, Trash2, MapPin, Calendar, Weight, DollarSign } from "lucide-react"
import { useTitle } from "@/context/TitleContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data
const cargoData = [
    {
        id: "CRG-001",
        title: "Electronics Shipment",
        description: "Laptops and mobile phones for retail store",
        weight: "150 kg",
        dimensions: "120x80x60 cm",
        origin: "Dar es Salaam",
        destination: "Mwanza",
        pickupDate: "2024-01-12",
        deliveryDate: "2024-01-15",
        status: "in_transit",
        value: 2500000,
        bidsCount: 3,
        bestBid: 85000,
        category: "electronics",
    },
    {
        id: "CRG-002",
        title: "Furniture Delivery",
        description: "Office furniture for new branch",
        weight: "300 kg",
        dimensions: "200x150x100 cm",
        origin: "Arusha",
        destination: "Dodoma",
        pickupDate: "2024-01-14",
        deliveryDate: "2024-01-18",
        status: "pending_bids",
        value: 1800000,
        bidsCount: 7,
        bestBid: 120000,
        category: "furniture",
    },
    {
        id: "CRG-003",
        title: "Medical Supplies",
        description: "Emergency medical equipment",
        weight: "75 kg",
        dimensions: "80x60x40 cm",
        origin: "Mwanza",
        destination: "Shinyanga",
        pickupDate: "2024-01-08",
        deliveryDate: "2024-01-10",
        status: "delivered",
        value: 950000,
        bidsCount: 5,
        bestBid: 65000,
        category: "medical",
    },
    {
        id: "CRG-004",
        title: "Agricultural Products",
        description: "Seeds and fertilizers for farming",
        weight: "500 kg",
        dimensions: "150x100x80 cm",
        origin: "Iringa",
        destination: "Mbeya",
        pickupDate: "2024-01-16",
        deliveryDate: "2024-01-20",
        status: "draft",
        value: 750000,
        bidsCount: 0,
        bestBid: 0,
        category: "agriculture",
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
        case "draft":
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
        case "cancelled":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

export default function CargoPage() {
    const { setTitle } = useTitle()
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [filteredCargo, setFilteredCargo] = useState(cargoData)

    useEffect(() => {
        setTitle("My Cargo")
    }, [setTitle])

    useEffect(() => {
        let filtered = cargoData

        if (searchTerm) {
            filtered = filtered.filter(
                (cargo) =>
                    cargo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cargo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cargo.destination.toLowerCase().includes(searchTerm.toLowerCase()),
            )
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter((cargo) => cargo.status === statusFilter)
        }

        if (categoryFilter !== "all") {
            filtered = filtered.filter((cargo) => cargo.category === categoryFilter)
        }

        setFilteredCargo(filtered)
    }, [searchTerm, statusFilter, categoryFilter])

    const getCargoByStatus = (status: string) => {
        return filteredCargo.filter((cargo) => cargo.status === status)
    }

    const CargoCard = ({ cargo }: { cargo: (typeof cargoData)[0] }) => (
        <Card className="transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{cargo.title}</CardTitle>
                        <CardDescription>{cargo.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(cargo.status)}>{cargo.status.replace("_", " ").toUpperCase()}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Route Info */}
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>
                {cargo.origin} → {cargo.destination}
              </span>
                        </div>
                    </div>

                    {/* Cargo Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center">
                            <Weight className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{cargo.weight}</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{cargo.deliveryDate}</span>
                        </div>
                        <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>TSh {cargo.value.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{cargo.bidsCount} bids</span>
                        </div>
                    </div>

                    {/* Best Bid */}
                    {cargo.bestBid > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Best Bid: TSh {cargo.bestBid.toLocaleString()}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                        </Button>
                        {cargo.status === "draft" && (
                            <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive bg-transparent">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">My Cargo</h2>
                    <p className="text-muted-foreground">Manage your cargo shipments and track their progress</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Cargo
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search cargo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending_bids">Pending Bids</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="electronics">Electronics</SelectItem>
                                <SelectItem value="furniture">Furniture</SelectItem>
                                <SelectItem value="medical">Medical</SelectItem>
                                <SelectItem value="agriculture">Agriculture</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Cargo Tabs */}
            <Tabs defaultValue="all" className="space-y-4">
                <TabsList className="portal-sticky-tabs">
                    <TabsTrigger value="all">All Cargo ({filteredCargo.length})</TabsTrigger>
                    <TabsTrigger value="draft">Draft ({getCargoByStatus("draft").length})</TabsTrigger>
                    <TabsTrigger value="pending_bids">Pending Bids ({getCargoByStatus("pending_bids").length})</TabsTrigger>
                    <TabsTrigger value="in_transit">In Transit ({getCargoByStatus("in_transit").length})</TabsTrigger>
                    <TabsTrigger value="delivered">Delivered ({getCargoByStatus("delivered").length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCargo.map((cargo) => (
                            <CargoCard key={cargo.id} cargo={cargo} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="draft" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {getCargoByStatus("draft").map((cargo) => (
                            <CargoCard key={cargo.id} cargo={cargo} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="pending_bids" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {getCargoByStatus("pending_bids").map((cargo) => (
                            <CargoCard key={cargo.id} cargo={cargo} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="in_transit" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {getCargoByStatus("in_transit").map((cargo) => (
                            <CargoCard key={cargo.id} cargo={cargo} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="delivered" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {getCargoByStatus("delivered").map((cargo) => (
                            <CargoCard key={cargo.id} cargo={cargo} />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {filteredCargo.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No cargo found</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                                ? "Try adjusting your filters to see more results."
                                : "You haven't created any cargo shipments yet."}
                        </p>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Cargo
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
