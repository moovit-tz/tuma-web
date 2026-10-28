"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Search, Eye, Check, X, Star, MapPin, Clock, Truck, User } from "lucide-react"
import { useTitle } from "@/context/TitleContext"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

// Mock data
const bidsData = [
    {
        id: "BID-001",
        cargoId: "CRG-001",
        cargoTitle: "Electronics shipment to Mwanza",
        transporterName: "Swift Logistics",
        transporterRating: 4.8,
        transporterReviews: 156,
        amount: 85000,
        estimatedDays: 3,
        status: "pending",
        submittedDate: "2024-01-15",
        expiresDate: "2024-01-20",
        route: "Dar es Salaam → Mwanza",
        vehicleType: "Truck",
        insurance: true,
        tracking: true,
        message: "We guarantee safe delivery with real-time tracking and insurance coverage.",
    },
    {
        id: "BID-002",
        cargoId: "CRG-001",
        cargoTitle: "Electronics shipment to Mwanza",
        transporterName: "Reliable Transport",
        transporterRating: 4.6,
        transporterReviews: 89,
        amount: 92000,
        estimatedDays: 2,
        status: "pending",
        submittedDate: "2024-01-15",
        expiresDate: "2024-01-20",
        route: "Dar es Salaam → Mwanza",
        vehicleType: "Van",
        insurance: true,
        tracking: false,
        message: "Express delivery with premium handling for electronics.",
    },
    {
        id: "BID-003",
        cargoId: "CRG-002",
        cargoTitle: "Furniture delivery to Arusha",
        transporterName: "MegaTrans Ltd",
        transporterRating: 4.9,
        transporterReviews: 203,
        amount: 120000,
        estimatedDays: 4,
        status: "accepted",
        submittedDate: "2024-01-14",
        expiresDate: "2024-01-19",
        route: "Arusha → Dodoma",
        vehicleType: "Large Truck",
        insurance: true,
        tracking: true,
        message: "Specialized furniture transport with protective packaging.",
    },
    {
        id: "BID-004",
        cargoId: "CRG-003",
        cargoTitle: "Medical supplies to Dodoma",
        transporterName: "QuickMove Express",
        transporterRating: 4.3,
        transporterReviews: 67,
        amount: 65000,
        estimatedDays: 2,
        status: "declined",
        submittedDate: "2024-01-13",
        expiresDate: "2024-01-18",
        route: "Mwanza → Shinyanga",
        vehicleType: "Van",
        insurance: false,
        tracking: true,
        message: "Fast delivery for urgent medical supplies.",
    },
]

const getStatusColor = (status: string) => {
    switch (status) {
        case "accepted":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        case "pending":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        case "declined":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        case "expired":
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

export default function BidsPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [filteredBids, setFilteredBids] = useState(bidsData)
    const [selectedBid, setSelectedBid] = useState<(typeof bidsData)[0] | null>(null)

    useEffect(() => {
        setTitle("Bids")
    }, [setTitle])

    useEffect(() => {
        let filtered = bidsData

        if (searchTerm) {
            filtered = filtered.filter(
                (bid) =>
                    bid.cargoTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    bid.transporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    bid.route.toLowerCase().includes(searchTerm.toLowerCase()),
            )
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter((bid) => bid.status === statusFilter)
        }

        setFilteredBids(filtered)
    }, [searchTerm, statusFilter])

    const getBidsByStatus = (status: string) => {
        return filteredBids.filter((bid) => bid.status === status)
    }

    const handleAcceptBid = (bidId: string) => {
        toast({
            title: "Bid Accepted",
            description: `You have accepted bid ${bidId}. The transporter will be notified.`,
        })
    }

    const handleDeclineBid = (bidId: string) => {
        toast({
            title: "Bid Declined",
            description: `You have declined bid ${bidId}.`,
        })
    }

    const BidCard = ({ bid }: { bid: (typeof bidsData)[0] }) => (
        <Card className="transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{bid.cargoTitle}</CardTitle>
                        <CardDescription>Bid ID: {bid.id}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(bid.status)}>{bid.status.toUpperCase()}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Transporter Info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">{bid.transporterName}</p>
                                <div className="flex items-center space-x-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm text-muted-foreground">
                    {bid.transporterRating} ({bid.transporterReviews} reviews)
                  </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-primary">TSh {bid.amount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{bid.estimatedDays} days delivery</p>
                        </div>
                    </div>

                    {/* Route and Vehicle */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{bid.route}</span>
                        </div>
                        <div className="flex items-center">
                            <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{bid.vehicleType}</span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>Expires: {bid.expiresDate}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            {bid.insurance && <Badge variant="secondary">Insurance</Badge>}
                            {bid.tracking && <Badge variant="secondary">Tracking</Badge>}
                        </div>
                    </div>

                    {/* Message */}
                    {bid.message && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{bid.message}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedBid(bid)}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle>Bid Details - {selectedBid?.id}</DialogTitle>
                                    <DialogDescription>Complete information about this bid</DialogDescription>
                                </DialogHeader>
                                {selectedBid && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium">Transporter</Label>
                                                <p>{selectedBid.transporterName}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Amount</Label>
                                                <p className="text-lg font-bold">TSh {selectedBid.amount.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Delivery Time</Label>
                                                <p>{selectedBid.estimatedDays} days</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Vehicle Type</Label>
                                                <p>{selectedBid.vehicleType}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Route</Label>
                                                <p>{selectedBid.route}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Rating</Label>
                                                <div className="flex items-center space-x-1">
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                    <span>
                            {selectedBid.transporterRating} ({selectedBid.transporterReviews} reviews)
                          </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Services Included</Label>
                                            <div className="flex space-x-2 mt-1">
                                                {selectedBid.insurance && <Badge variant="secondary">Insurance Coverage</Badge>}
                                                {selectedBid.tracking && <Badge variant="secondary">Real-time Tracking</Badge>}
                                            </div>
                                        </div>
                                        {selectedBid.message && (
                                            <div>
                                                <Label className="text-sm font-medium">Transporter Message</Label>
                                                <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedBid.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <DialogFooter>
                                    {selectedBid?.status === "pending" && (
                                        <div className="flex space-x-2">
                                            <Button variant="outline" onClick={() => handleDeclineBid(selectedBid.id)}>
                                                <X className="h-4 w-4 mr-1" />
                                                Decline
                                            </Button>
                                            <Button onClick={() => handleAcceptBid(selectedBid.id)}>
                                                <Check className="h-4 w-4 mr-1" />
                                                Accept Bid
                                            </Button>
                                        </div>
                                    )}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {bid.status === "pending" && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => handleDeclineBid(bid.id)}>
                                    <X className="h-4 w-4 mr-1" />
                                    Decline
                                </Button>
                                <Button size="sm" onClick={() => handleAcceptBid(bid.id)}>
                                    <Check className="h-4 w-4 mr-1" />
                                    Accept
                                </Button>
                            </>
                        )}
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
                    <h2 className="text-3xl font-bold">Bids</h2>
                    <p className="text-muted-foreground">Review and manage bids from transporters for your cargo</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search bids..."
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
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="declined">Declined</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Bids Tabs */}
            <Tabs defaultValue="all" className="space-y-4">
                <TabsList className="portal-sticky-tabs">
                    <TabsTrigger value="all">All Bids ({filteredBids.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({getBidsByStatus("pending").length})</TabsTrigger>
                    <TabsTrigger value="accepted">Accepted ({getBidsByStatus("accepted").length})</TabsTrigger>
                    <TabsTrigger value="declined">Declined ({getBidsByStatus("declined").length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {filteredBids.map((bid) => (
                            <BidCard key={bid.id} bid={bid} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {getBidsByStatus("pending").map((bid) => (
                            <BidCard key={bid.id} bid={bid} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="accepted" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {getBidsByStatus("accepted").map((bid) => (
                            <BidCard key={bid.id} bid={bid} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="declined" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {getBidsByStatus("declined").map((bid) => (
                            <BidCard key={bid.id} bid={bid} />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {filteredBids.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No bids found</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            {searchTerm || statusFilter !== "all"
                                ? "Try adjusting your filters to see more results."
                                : "You haven't received any bids yet. Create a cargo shipment to start receiving bids."}
                        </p>
                        <Button>Create New Cargo</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
