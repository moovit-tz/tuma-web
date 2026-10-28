"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, Truck, CheckCircle, Clock, Search, Eye, Phone, MessageCircle } from "lucide-react"
import { useTitle } from "@/context/TitleContext"
import { useToast } from "@/components/ui/use-toast"

// Mock tracking data
const trackingData = {
    "CRG-001": {
        id: "CRG-001",
        title: "Electronics shipment to Mwanza",
        status: "in_transit",
        currentLocation: "Morogoro",
        estimatedDelivery: "2024-01-15 14:00",
        transporter: {
            name: "Swift Logistics",
            phone: "+255 712 345 678",
            driver: "John Mwalimu",
            vehicle: "Truck - T123ABC",
        },
        timeline: [
            {
                status: "picked_up",
                location: "Dar es Salaam",
                timestamp: "2024-01-12 09:00",
                description: "Cargo picked up from sender",
                completed: true,
            },
            {
                status: "in_transit",
                location: "Morogoro",
                timestamp: "2024-01-12 15:30",
                description: "In transit - Passed through Morogoro",
                completed: true,
            },
            {
                status: "in_transit",
                location: "Dodoma",
                timestamp: "2024-01-13 10:00",
                description: "Expected to pass through Dodoma",
                completed: false,
            },
            {
                status: "out_for_delivery",
                location: "Mwanza",
                timestamp: "2024-01-15 08:00",
                description: "Out for delivery in Mwanza",
                completed: false,
            },
            {
                status: "delivered",
                location: "Mwanza - Final Destination",
                timestamp: "2024-01-15 14:00",
                description: "Delivered to recipient",
                completed: false,
            },
        ],
    },
    "CRG-002": {
        id: "CRG-002",
        title: "Furniture delivery to Arusha",
        status: "delivered",
        currentLocation: "Arusha - Delivered",
        estimatedDelivery: "2024-01-10 16:00",
        transporter: {
            name: "MegaTrans Ltd",
            phone: "+255 754 987 654",
            driver: "Mary Kimaro",
            vehicle: "Large Truck - T456DEF",
        },
        timeline: [
            {
                status: "picked_up",
                location: "Arusha",
                timestamp: "2024-01-08 08:00",
                description: "Cargo picked up from sender",
                completed: true,
            },
            {
                status: "in_transit",
                location: "Moshi",
                timestamp: "2024-01-08 12:00",
                description: "In transit - Passed through Moshi",
                completed: true,
            },
            {
                status: "in_transit",
                location: "Same",
                timestamp: "2024-01-09 09:00",
                description: "In transit - Passed through Same",
                completed: true,
            },
            {
                status: "out_for_delivery",
                location: "Dodoma",
                timestamp: "2024-01-10 10:00",
                description: "Out for delivery in Dodoma",
                completed: true,
            },
            {
                status: "delivered",
                location: "Dodoma - Final Destination",
                timestamp: "2024-01-10 16:00",
                description: "Successfully delivered to recipient",
                completed: true,
            },
        ],
    },
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "delivered":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        case "out_for_delivery":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
        case "in_transit":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        case "picked_up":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

const getStatusIcon = (status: string, completed: boolean) => {
    if (completed) {
        return <CheckCircle className="h-5 w-5 text-green-600" />
    }

    switch (status) {
        case "delivered":
            return <CheckCircle className="h-5 w-5 text-green-600" />
        case "out_for_delivery":
            return <Truck className="h-5 w-5 text-blue-600" />
        case "in_transit":
            return <MapPin className="h-5 w-5 text-yellow-600" />
        case "picked_up":
            return <Package className="h-5 w-5 text-purple-600" />
        default:
            return <Clock className="h-5 w-5 text-gray-400" />
    }
}

export default function TrackPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const [trackingNumber, setTrackingNumber] = useState("")
    const [trackingResult, setTrackingResult] = useState<(typeof trackingData)[keyof typeof trackingData] | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        setTitle("Track Cargo")
    }, [setTitle])

    const handleTrack = async () => {
        if (!trackingNumber.trim()) {
            toast({
                title: "Tracking Number Required",
                description: "Please enter a tracking number to track your cargo.",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        // Simulate API call
        setTimeout(() => {
            const result = trackingData[trackingNumber as keyof typeof trackingData]
            if (result) {
                setTrackingResult(result)
                toast({
                    title: "Cargo Found",
                    description: `Tracking information for ${trackingNumber} has been loaded.`,
                })
            } else {
                setTrackingResult(null)
                toast({
                    title: "Cargo Not Found",
                    description: "No cargo found with this tracking number. Please check and try again.",
                    variant: "destructive",
                })
            }
            setIsLoading(false)
        }, 1000)
    }

    const handleContactTransporter = () => {
        toast({
            title: "Contact Information",
            description: "Transporter contact details are displayed below the tracking information.",
        })
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Track Cargo</h2>
                    <p className="text-muted-foreground">Enter your tracking number to see real-time updates on your cargo</p>
                </div>
            </div>

            {/* Tracking Input */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Track Your Cargo
                    </CardTitle>
                    <CardDescription>Enter your cargo tracking number (e.g., CRG-001, CRG-002)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Enter tracking number..."
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleTrack()}
                            />
                        </div>
                        <Button onClick={handleTrack} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                                    Tracking...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Track
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tracking Results */}
            {trackingResult && (
                <div className="space-y-6">
                    {/* Cargo Overview */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        {trackingResult.title}
                                    </CardTitle>
                                    <CardDescription>Tracking ID: {trackingResult.id}</CardDescription>
                                </div>
                                <Badge className={getStatusColor(trackingResult.status)}>
                                    {trackingResult.status.replace("_", " ").toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Current Location</p>
                                    <p className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {trackingResult.currentLocation}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Estimated Delivery</p>
                                    <p className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        {trackingResult.estimatedDelivery}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tracking Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tracking Timeline</CardTitle>
                            <CardDescription>Follow your cargo's journey from pickup to delivery</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {trackingResult.timeline.map((event, index) => (
                                    <div key={index} className="flex items-start space-x-4">
                                        <div className="flex-shrink-0 mt-1">{getStatusIcon(event.status, event.completed)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p
                                                    className={`text-sm font-medium ${event.completed ? "text-foreground" : "text-muted-foreground"}`}
                                                >
                                                    {event.description}
                                                </p>
                                                <p className={`text-xs ${event.completed ? "text-foreground" : "text-muted-foreground"}`}>
                                                    {event.timestamp}
                                                </p>
                                            </div>
                                            <p
                                                className={`text-sm ${event.completed ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                                            >
                                                {event.location}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transporter Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Transporter Information
                            </CardTitle>
                            <CardDescription>Contact details for your cargo transporter</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Company</p>
                                        <p className="font-medium">{trackingResult.transporter.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Driver</p>
                                        <p>{trackingResult.transporter.driver}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
                                        <p>{trackingResult.transporter.vehicle}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Contact</p>
                                        <div className="flex items-center gap-2">
                                            <p>{trackingResult.transporter.phone}</p>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="outline" onClick={handleContactTransporter}>
                                                    <Phone className="h-3 w-3 mr-1" />
                                                    Call
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={handleContactTransporter}>
                                                    <MessageCircle className="h-3 w-3 mr-1" />
                                                    Message
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sample Tracking Numbers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Try Sample Tracking
                    </CardTitle>
                    <CardDescription>Use these sample tracking numbers to see how tracking works</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <p className="font-medium">CRG-001</p>
                                <p className="text-sm text-muted-foreground">Electronics shipment (In Transit)</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setTrackingNumber("CRG-001")
                                    handleTrack()
                                }}
                            >
                                Track
                            </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <p className="font-medium">CRG-002</p>
                                <p className="text-sm text-muted-foreground">Furniture delivery (Delivered)</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setTrackingNumber("CRG-002")
                                    handleTrack()
                                }}
                            >
                                Track
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
