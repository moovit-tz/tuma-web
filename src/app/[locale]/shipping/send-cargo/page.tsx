"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Package, MapPin, CalendarIcon, Save, Send } from "lucide-react"
import { useTitle } from "@/context/TitleContext"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data for locations
const locations = [
    "Dar es Salaam",
    "Mwanza",
    "Arusha",
    "Dodoma",
    "Mbeya",
    "Morogoro",
    "Tanga",
    "Iringa",
    "Shinyanga",
    "Tabora",
]

const cargoCategories = [
    "Electronics",
    "Furniture",
    "Medical Supplies",
    "Agricultural Products",
    "Textiles & Clothing",
    "Automotive Parts",
    "Food & Beverages",
    "Construction Materials",
    "Documents",
    "Other",
]

export default function SendCargoPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("basic")
    const [pickupDate, setPickupDate] = useState<Date>()
    const [deliveryDate, setDeliveryDate] = useState<Date>()

    const [cargoData, setCargoData] = useState({
        // Basic Information
        title: "",
        description: "",
        category: "",

        // Pickup Information
        pickupAddress: "",
        pickupCity: "",
        pickupContactName: "",
        pickupContactPhone: "",
        pickupInstructions: "",

        // Delivery Information
        deliveryAddress: "",
        deliveryCity: "",
        deliveryContactName: "",
        deliveryContactPhone: "",
        deliveryInstructions: "",

        // Cargo Details
        weight: "",
        length: "",
        width: "",
        height: "",
        value: "",
        fragile: false,
        hazardous: false,

        // Additional Services
        insurance: false,
        tracking: true,
        expressDelivery: false,

        // Special Instructions
        specialInstructions: "",
    })

    useEffect(() => {
        setTitle("Send Cargo")
    }, [setTitle])

    const handleInputChange = (field: string, value: string | boolean) => {
        setCargoData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSaveDraft = () => {
        toast({
            title: "Draft Saved",
            description: "Your cargo information has been saved as a draft.",
        })
    }

    const handleSubmitCargo = () => {
        // Basic validation
        if (!cargoData.title || !cargoData.pickupCity || !cargoData.deliveryCity) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields before submitting.",
                variant: "destructive",
            })
            return
        }

        toast({
            title: "Cargo Submitted",
            description: "Your cargo has been posted. Transporters will start bidding soon!",
        })

        // Reset form
        setCargoData({
            title: "",
            description: "",
            category: "",
            pickupAddress: "",
            pickupCity: "",
            pickupContactName: "",
            pickupContactPhone: "",
            pickupInstructions: "",
            deliveryAddress: "",
            deliveryCity: "",
            deliveryContactName: "",
            deliveryContactPhone: "",
            deliveryInstructions: "",
            weight: "",
            length: "",
            width: "",
            height: "",
            value: "",
            fragile: false,
            hazardous: false,
            insurance: false,
            tracking: true,
            expressDelivery: false,
            specialInstructions: "",
        })
        setPickupDate(undefined)
        setDeliveryDate(undefined)
        setActiveTab("basic")
    }

    const isTabComplete = (tab: string) => {
        switch (tab) {
            case "basic":
                return cargoData.title && cargoData.description && cargoData.category
            case "pickup":
                return (
                    cargoData.pickupAddress &&
                    cargoData.pickupCity &&
                    cargoData.pickupContactName &&
                    cargoData.pickupContactPhone &&
                    pickupDate
                )
            case "delivery":
                return (
                    cargoData.deliveryAddress &&
                    cargoData.deliveryCity &&
                    cargoData.deliveryContactName &&
                    cargoData.deliveryContactPhone &&
                    deliveryDate
                )
            case "details":
                return cargoData.weight && cargoData.length && cargoData.width && cargoData.height && cargoData.value
            default:
                return false
        }
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Send Cargo</h2>
                    <p className="text-muted-foreground">Create a new cargo shipment and receive bids from transporters</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSaveDraft}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Draft
                    </Button>
                    <Button onClick={handleSubmitCargo}>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Cargo
                    </Button>
                </div>
            </div>

            {/* Progress Indicator */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        {["basic", "pickup", "delivery", "details", "review"].map((tab, index) => (
                            <div key={tab} className="flex items-center">
                                <div
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                                        activeTab === tab
                                            ? "bg-primary text-primary-foreground"
                                            : isTabComplete(tab)
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {index + 1}
                                </div>
                                {index < 4 && (
                                    <div className={cn("w-12 h-0.5 mx-2", isTabComplete(tab) ? "bg-green-500" : "bg-muted")} />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Form Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="portal-sticky-tabs grid w-full grid-cols-5">
                    <TabsTrigger value="basic" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Basic Info
                    </TabsTrigger>
                    <TabsTrigger value="pickup" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Pickup
                    </TabsTrigger>
                    <TabsTrigger value="delivery" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Delivery
                    </TabsTrigger>
                    <TabsTrigger value="details" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Details
                    </TabsTrigger>
                    <TabsTrigger value="review" className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Review
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>Provide basic details about your cargo shipment</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Cargo Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Electronics shipment to Mwanza"
                                    value={cargoData.title}
                                    onChange={(e) => handleInputChange("title", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe your cargo in detail..."
                                    value={cargoData.description}
                                    onChange={(e) => handleInputChange("description", e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select value={cargoData.category} onValueChange={(value) => handleInputChange("category", value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select cargo category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cargoCategories.map((category) => (
                                            <SelectItem key={category} value={category.toLowerCase().replace(/\s+/g, "_")}>
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pickup" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pickup Information</CardTitle>
                            <CardDescription>Where should the transporter pick up your cargo?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="pickup-city">Pickup City *</Label>
                                    <Select
                                        value={cargoData.pickupCity}
                                        onValueChange={(value) => handleInputChange("pickupCity", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select pickup city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((location) => (
                                                <SelectItem key={location} value={location}>
                                                    {location}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pickup-date">Pickup Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !pickupDate && "text-muted-foreground",
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {pickupDate ? format(pickupDate, "PPP") : "Select pickup date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pickup-address">Pickup Address *</Label>
                                <Textarea
                                    id="pickup-address"
                                    placeholder="Enter complete pickup address..."
                                    value={cargoData.pickupAddress}
                                    onChange={(e) => handleInputChange("pickupAddress", e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="pickup-contact-name">Contact Name *</Label>
                                    <Input
                                        id="pickup-contact-name"
                                        placeholder="Contact person name"
                                        value={cargoData.pickupContactName}
                                        onChange={(e) => handleInputChange("pickupContactName", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pickup-contact-phone">Contact Phone *</Label>
                                    <Input
                                        id="pickup-contact-phone"
                                        placeholder="+255 712 345 678"
                                        value={cargoData.pickupContactPhone}
                                        onChange={(e) => handleInputChange("pickupContactPhone", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pickup-instructions">Special Instructions</Label>
                                <Textarea
                                    id="pickup-instructions"
                                    placeholder="Any special instructions for pickup..."
                                    value={cargoData.pickupInstructions}
                                    onChange={(e) => handleInputChange("pickupInstructions", e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Delivery Information</CardTitle>
                            <CardDescription>Where should your cargo be delivered?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="delivery-city">Delivery City *</Label>
                                    <Select
                                        value={cargoData.deliveryCity}
                                        onValueChange={(value) => handleInputChange("deliveryCity", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select delivery city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((location) => (
                                                <SelectItem key={location} value={location}>
                                                    {location}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="delivery-date">Preferred Delivery Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !deliveryDate && "text-muted-foreground",
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {deliveryDate ? format(deliveryDate, "PPP") : "Select delivery date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="delivery-address">Delivery Address *</Label>
                                <Textarea
                                    id="delivery-address"
                                    placeholder="Enter complete delivery address..."
                                    value={cargoData.deliveryAddress}
                                    onChange={(e) => handleInputChange("deliveryAddress", e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="delivery-contact-name">Contact Name *</Label>
                                    <Input
                                        id="delivery-contact-name"
                                        placeholder="Contact person name"
                                        value={cargoData.deliveryContactName}
                                        onChange={(e) => handleInputChange("deliveryContactName", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="delivery-contact-phone">Contact Phone *</Label>
                                    <Input
                                        id="delivery-contact-phone"
                                        placeholder="+255 712 345 678"
                                        value={cargoData.deliveryContactPhone}
                                        onChange={(e) => handleInputChange("deliveryContactPhone", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="delivery-instructions">Special Instructions</Label>
                                <Textarea
                                    id="delivery-instructions"
                                    placeholder="Any special instructions for delivery..."
                                    value={cargoData.deliveryInstructions}
                                    onChange={(e) => handleInputChange("deliveryInstructions", e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cargo Details</CardTitle>
                            <CardDescription>Provide detailed information about your cargo</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Weight (kg) *</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        placeholder="e.g., 150"
                                        value={cargoData.weight}
                                        onChange={(e) => handleInputChange("weight", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="value">Cargo Value (TSh) *</Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        placeholder="e.g., 2500000"
                                        value={cargoData.value}
                                        onChange={(e) => handleInputChange("value", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Dimensions (cm) *</Label>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="length">Length</Label>
                                        <Input
                                            id="length"
                                            type="number"
                                            placeholder="120"
                                            value={cargoData.length}
                                            onChange={(e) => handleInputChange("length", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="width">Width</Label>
                                        <Input
                                            id="width"
                                            type="number"
                                            placeholder="80"
                                            value={cargoData.width}
                                            onChange={(e) => handleInputChange("width", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="height">Height</Label>
                                        <Input
                                            id="height"
                                            type="number"
                                            placeholder="60"
                                            value={cargoData.height}
                                            onChange={(e) => handleInputChange("height", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Label>Cargo Properties</Label>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="fragile"
                                            checked={cargoData.fragile}
                                            onChange={(e) => handleInputChange("fragile", e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label htmlFor="fragile">Fragile - Handle with care</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="hazardous"
                                            checked={cargoData.hazardous}
                                            onChange={(e) => handleInputChange("hazardous", e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label htmlFor="hazardous">Hazardous materials</Label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Label>Additional Services</Label>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="insurance"
                                            checked={cargoData.insurance}
                                            onChange={(e) => handleInputChange("insurance", e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label htmlFor="insurance">Insurance coverage</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="tracking"
                                            checked={cargoData.tracking}
                                            onChange={(e) => handleInputChange("tracking", e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label htmlFor="tracking">Real-time tracking</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="express"
                                            checked={cargoData.expressDelivery}
                                            onChange={(e) => handleInputChange("expressDelivery", e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label htmlFor="express">Express delivery</Label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="special-instructions">Special Instructions</Label>
                                <Textarea
                                    id="special-instructions"
                                    placeholder="Any additional instructions or requirements..."
                                    value={cargoData.specialInstructions}
                                    onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="review" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Your Cargo</CardTitle>
                            <CardDescription>Please review all information before submitting your cargo for bidding</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Basic Information</h4>
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Title:</span>
                                        <span>{cargoData.title || "Not specified"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Category:</span>
                                        <span>{cargoData.category || "Not specified"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Description:</span>
                                        <span className="text-right max-w-xs">{cargoData.description || "Not specified"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Route Information */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Route</h4>
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">From:</span>
                                        <span>{cargoData.pickupCity || "Not specified"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">To:</span>
                                        <span>{cargoData.deliveryCity || "Not specified"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Pickup Date:</span>
                                        <span>{pickupDate ? format(pickupDate, "PPP") : "Not specified"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Delivery Date:</span>
                                        <span>{deliveryDate ? format(deliveryDate, "PPP") : "Not specified"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cargo Details */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Cargo Details</h4>
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Weight:</span>
                                        <span>{cargoData.weight ? `${cargoData.weight} kg` : "Not specified"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Dimensions:</span>
                                        <span>
                      {cargoData.length && cargoData.width && cargoData.height
                          ? `${cargoData.length} × ${cargoData.width} × ${cargoData.height} cm`
                          : "Not specified"}
                    </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Value:</span>
                                        <span>
                      {cargoData.value ? `TSh ${Number.parseInt(cargoData.value).toLocaleString()}` : "Not specified"}
                    </span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Services */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Services</h4>
                                <div className="flex flex-wrap gap-2">
                                    {cargoData.insurance && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Insurance</span>
                                    )}
                                    {cargoData.tracking && (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Tracking</span>
                                    )}
                                    {cargoData.expressDelivery && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Express</span>
                                    )}
                                    {cargoData.fragile && (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Fragile</span>
                                    )}
                                    {cargoData.hazardous && (
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Hazardous</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => {
                        const tabs = ["basic", "pickup", "delivery", "details", "review"]
                        const currentIndex = tabs.indexOf(activeTab)
                        if (currentIndex > 0) {
                            setActiveTab(tabs[currentIndex - 1])
                        }
                    }}
                    disabled={activeTab === "basic"}
                >
                    Previous
                </Button>
                <Button
                    onClick={() => {
                        const tabs = ["basic", "pickup", "delivery", "details", "review"]
                        const currentIndex = tabs.indexOf(activeTab)
                        if (currentIndex < tabs.length - 1) {
                            setActiveTab(tabs[currentIndex + 1])
                        } else {
                            handleSubmitCargo()
                        }
                    }}
                >
                    {activeTab === "review" ? "Submit Cargo" : "Next"}
                </Button>
            </div>
        </div>
    )
}
