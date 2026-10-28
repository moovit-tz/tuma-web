"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
    MapPin,
    ArrowRight,
    Package,
    Truck,
    Clock,
    Shield,
    Star,
    Users,
    Globe,
    ChevronDown,
    Info,
    CheckCircle,
    User,
    Building,
} from "lucide-react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useTr } from "@/lib/i18n/portal"

interface Region {
    id: string
    name: string
    country: string
}

interface TransportQuote {
    type: string
    name: string
    icon: string
    capacity: string
    price: number
    duration: string
    description: string
    suitable: string[]
}

export function MarketplaceHero() {
    const tr = useTr()
    const [showQuotes, setShowQuotes] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [selectedQuote, setSelectedQuote] = useState<TransportQuote | null>(null)
    const [fromSuggestions, setFromSuggestions] = useState<Region[]>([])
    const [toSuggestions, setToSuggestions] = useState<Region[]>([])
    const [showFromSuggestions, setShowFromSuggestions] = useState(false)
    const [showToSuggestions, setShowToSuggestions] = useState(false)

    const [formData, setFormData] = useState({
        fromRegion: "",
        toRegion: "",
        cargoType: "",
        weight: "",
        dimensions: "",
        urgency: "",
    })

    // Fetch regions from API
    const { data: regions = [], isLoading: regionsLoading } = useQuery({
        queryKey: ["regions"],
        queryFn: async () => {
            const response = await fetch("/api/proxy/regions")
            if (!response.ok) throw new Error("Failed to fetch regions")
            const data = await response.json()
            return data.data || []
        },
    })

    // Filter suggestions based on input
    const filterSuggestions = (input: string, type: "from" | "to") => {
        if (!input || input.length < 2) {
            if (type === "from") {
                setFromSuggestions([])
                setShowFromSuggestions(false)
            } else {
                setToSuggestions([])
                setShowToSuggestions(false)
            }
            return
        }

        const filtered = regions
            .filter((region: Region) => region.name.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 5)

        if (type === "from") {
            setFromSuggestions(filtered)
            setShowFromSuggestions(true)
        } else {
            setToSuggestions(filtered)
            setShowToSuggestions(true)
        }
    }

    // Calculate distance-based quotes
    const calculateQuotes = (): TransportQuote[] => {
        const baseDistance = 500 // km (example)
        const basePrices = {
            minivan: 0.8,
            van: 1.2,
            canter: 2.0,
            truck: 3.5,
            trailer: 5.0,
        }

        const weightMultiplier =
            formData.weight === "500kg+"
                ? 1.5
                : formData.weight === "100-500kg"
                    ? 1.3
                    : formData.weight === "50-100kg"
                        ? 1.1
                        : 1.0

        const urgencyMultiplier = formData.urgency === "same-day" ? 2.0 : formData.urgency === "express" ? 1.5 : 1.0

        return [
            {
                type: "minivan",
                name: "Mini Van",
                icon: "🚐",
                capacity: "Up to 500kg",
                price: Math.round(baseDistance * basePrices.minivan * weightMultiplier * urgencyMultiplier),
                duration: formData.urgency === "same-day" ? "6-8 hours" : "1-2 days",
                description: tr("Perfect for small packages and documents"),
                suitable: ["Documents", "Electronics", "Small items"],
            },
            {
                type: "van",
                name: "Delivery Van",
                icon: "🚚",
                capacity: "Up to 1,500kg",
                price: Math.round(baseDistance * basePrices.van * weightMultiplier * urgencyMultiplier),
                duration: formData.urgency === "same-day" ? "8-10 hours" : "1-3 days",
                description: tr("Ideal for medium-sized cargo and furniture"),
                suitable: ["Furniture", "Appliances", "Medium cargo"],
            },
            {
                type: "canter",
                name: "Canter Truck",
                icon: "🚛",
                capacity: "Up to 3,000kg",
                price: Math.round(baseDistance * basePrices.canter * weightMultiplier * urgencyMultiplier),
                duration: formData.urgency === "express" ? "1-2 days" : "2-4 days",
                description: tr("Great for bulk items and commercial goods"),
                suitable: ["Bulk items", "Commercial goods", "Construction materials"],
            },
            {
                type: "truck",
                name: "Large Truck",
                icon: "🚚",
                capacity: "Up to 8,000kg",
                price: Math.round(baseDistance * basePrices.truck * weightMultiplier * urgencyMultiplier),
                duration: formData.urgency === "express" ? "2-3 days" : "3-5 days",
                description: tr("Heavy cargo and industrial equipment"),
                suitable: ["Heavy machinery", "Industrial goods", "Large furniture"],
            },
            {
                type: "trailer",
                name: "Trailer Truck",
                icon: "🚛",
                capacity: "Up to 20,000kg",
                price: Math.round(baseDistance * basePrices.trailer * weightMultiplier * urgencyMultiplier),
                duration: formData.urgency === "express" ? "3-4 days" : "5-7 days",
                description: tr("Maximum capacity for large shipments"),
                suitable: ["Container loads", "Bulk shipments", "Cross-border cargo"],
            },
        ]
    }

    const handleGetQuotes = () => {
        if (
            formData.fromRegion &&
            formData.toRegion &&
            formData.cargoType &&
            formData.weight &&
            formData.dimensions &&
            formData.urgency
        ) {
            setShowQuotes(true)
        }
    }

    const handleBack = () => {
        setShowQuotes(false)
    }

    const handleSelectQuote = (quote: TransportQuote) => {
        setSelectedQuote(quote)
        setShowAuthModal(true)
    }

    const isFormComplete = () => {
        return (
            formData.fromRegion &&
            formData.toRegion &&
            formData.cargoType &&
            formData.weight &&
            formData.dimensions &&
            formData.urgency
        )
    }

    const scrollToNext = () => {
        const nextSection = document.getElementById("features-section")
        nextSection?.scrollIntoView({ behavior: "smooth" })
    }

    const cargoTypeGuides = {
        general: "Everyday items like clothes, books, household goods",
        electronics: "Phones, laptops, TVs - requires careful handling",
        furniture: "Tables, chairs, beds - may need disassembly",
        documents: "Papers, contracts, certificates - secure delivery",
        food: "Perishable items - temperature controlled transport",
        textiles: "Fabrics, clothing, shoes - moisture protection",
        automotive: "Car parts, tires, batteries - specialized handling",
        other: "Custom items - please specify in booking form",
    }

    const weightGuides = {
        "0-10kg": "Light items like documents, small electronics",
        "10-50kg": "Medium items like small appliances, books",
        "50-100kg": "Heavy items like furniture pieces, large electronics",
        "100-500kg": "Bulk items like multiple furniture pieces",
        "500kg+": "Industrial goods, large shipments",
    }

    return (
        <section className="relative h-screen bg-[#242a37] text-white overflow-hidden flex items-center">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[url('/images/pattern.svg')] bg-repeat opacity-20"></div>
            </div>

            {/* Floating Elements */}
            <div className="hidden"></div>
            <div className="hidden"></div>
            <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/5 rounded-full animate-bounce"></div>
            <div className="hidden"></div>

            <div className="container mx-auto px-4 py-8 relative z-10 h-full flex items-center">
                <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
                    {/* Left Content */}
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <Badge className="bg-[#ffd428]/20 text-[#ffd428] border-[#ffd428]/30 px-4 py-2 text-sm font-medium">{tr("🌍 Connecting Africa Through Cargo")}</Badge>

                            <h1 className="text-4xl md:text-6xl font-bold leading-tight">{tr("Ship Your")}{" "}
                                <span className="text-[#ffd428] relative">{tr("Cargo")}<div className="absolute -bottom-2 left-0 w-full h-1 bg-[#ffd428]/30 rounded-full"></div>
                </span>{" "}{tr("Across")}{" "}
                                <span className="text-[#ffd428] relative">{tr("Africa")}<div className="absolute -bottom-2 left-0 w-full h-1 bg-[#ffd428]/30 rounded-full"></div>
                </span>
                            </h1>

                            <p className="text-xl text-gray-300 leading-relaxed max-w-lg">{tr("Starting in Tanzania, expanding across Africa. Connect with verified transport companies and get the best rates for your cargo delivery. Safe, fast, and reliable shipping solutions.")}</p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#ffd428]">500+</div>
                                <div className="text-sm text-gray-400">{tr("Verified Transporters")}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#ffd428]">15K+</div>
                                <div className="text-sm text-gray-400">{tr("Successful Deliveries")}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#ffd428]">4.9★</div>
                                <div className="text-sm text-gray-400">{tr("Customer Rating")}</div>
                            </div>
                        </div>

                        {/* CTA for Transporters */}
                        <div className="bg-white/5 rounded-[var(--ds-radius-large)] p-6 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#ffd428]/20 p-3 rounded-[var(--ds-radius-small)]">
                                    <Truck className="h-6 w-6 text-[#ffd428]" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{tr("Are you a Transporter?")}</h3>
                                    <p className="text-gray-400 text-sm">{tr("Join our network and start earning across Africa")}</p>
                                </div>
                                <Link href="/login?type=transporter">
                                    <Button className="bg-[#ffd428] text-[#242a37] hover:bg-[#ffcc00] font-semibold">{tr("Join Network")}<ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Africa Focus */}
                        <div className="flex items-center gap-3 text-gray-300">
                            <Globe className="h-5 w-5 text-[#ffd428]" />
                            <span className="text-sm">{tr("Starting in Tanzania • Expanding across East Africa • Connecting the continent")}</span>
                        </div>
                    </div>

                    {/* Right Content - Quote Form */}
                    <div className="lg:pl-8">
                        <Card className="bg-white/10 border-white/20 shadow-[var(--ds-shadow-raised)]">
                            <CardContent className="p-8">
                                <div className="space-y-6">
                                    {/* Header */}
                                    <div className="text-center space-y-2">
                                        <Package className="h-8 w-8 text-[#ffd428] mx-auto" />
                                        <h2 className="text-2xl font-bold">{showQuotes ? tr("Choose Your Transport") : tr("Get Instant Quote")}</h2>
                                        <p className="text-gray-300">
                                            {showQuotes
                                                ? tr("From {fromRegion} to {toRegion}", { fromRegion: formData.fromRegion, toRegion: formData.toRegion })
                                                : tr("Fill in your shipping details")}
                                        </p>
                                    </div>

                                    {/* Form Content */}
                                    <div className="space-y-4 min-h-[500px]">
                                        {/* Quotes Display */}
                                        {showQuotes && (
                                            <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                                <div className="space-y-3 max-h-[450px] overflow-y-auto">
                                                    {calculateQuotes().map((quote, index) => (
                                                        <div
                                                            key={quote.type}
                                                            className="bg-white/5 rounded-[var(--ds-radius-small)] p-4 border border-white/10 hover:border-[#ffd428]/50 transition-colors duration-300 cursor-pointer group"
                                                            onClick={() => handleSelectQuote(quote)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-2xl">{quote.icon}</div>
                                                                    <div>
                                                                        <h4 className="font-semibold text-white group-hover:text-[#ffd428] transition-colors">
                                                                            {quote.name}
                                                                        </h4>
                                                                        <p className="text-sm text-gray-400">{quote.capacity}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-xl font-bold text-[#ffd428]">
                                                                        {tr("TSh {price}", { price: quote.price.toLocaleString() })}</div>
                                                                    <p className="text-sm text-gray-400">{quote.duration}</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                                <p className="text-sm text-gray-300 mb-2">{quote.description}</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {quote.suitable.map((item) => (
                                                                        <Badge
                                                                            key={item}
                                                                            variant="secondary"
                                                                            className="text-xs bg-[#ffd428]/20 text-[#ffd428]"
                                                                        >
                                                                            {item}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Single Form View */}
                                        {!showQuotes && (
                                            <div className="space-y-4 animate-in slide-in-from-left duration-300">
                                                {/* Locations Section */}
                                                <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                        <MapPin className="h-5 w-5 text-[#ffd428]" />{tr("Shipping Locations")}</h3>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-2 relative">
                                                            <Label htmlFor="from" className="text-white font-medium">{tr("Pickup Region")}</Label>
                                                            <Input
                                                                id="from"
                                                                placeholder={tr("Type pickup region (e.g., Arusha)")}
                                                                value={formData.fromRegion}
                                                                onChange={(e) => {
                                                                    setFormData({ ...formData, fromRegion: e.target.value })
                                                                    filterSuggestions(e.target.value, "from")
                                                                }}
                                                                onFocus={() => filterSuggestions(formData.fromRegion, "from")}
                                                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-[#ffd428] focus:ring-[#ffd428]/20"
                                                            />
                                                            {showFromSuggestions && fromSuggestions.length > 0 && (
                                                                <div className="absolute top-full left-0 right-0 bg-[#242a37] border border-white/20 rounded-lg mt-1 z-50 max-h-40 overflow-y-auto">
                                                                    {fromSuggestions.map((region) => (
                                                                        <div
                                                                            key={region.id}
                                                                            className="p-3 hover:bg-white/10 cursor-pointer text-white border-b border-white/10 last:border-b-0"
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, fromRegion: region.name })
                                                                                setShowFromSuggestions(false)
                                                                            }}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <MapPin className="h-4 w-4 text-[#ffd428]" />
                                                                                {region.name}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2 relative">
                                                            <Label htmlFor="to" className="text-white font-medium">{tr("Delivery Region")}</Label>
                                                            <Input
                                                                id="to"
                                                                placeholder={tr("Type delivery region (e.g., Dar es Salaam)")}
                                                                value={formData.toRegion}
                                                                onChange={(e) => {
                                                                    setFormData({ ...formData, toRegion: e.target.value })
                                                                    filterSuggestions(e.target.value, "to")
                                                                }}
                                                                onFocus={() => filterSuggestions(formData.toRegion, "to")}
                                                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-[#ffd428] focus:ring-[#ffd428]/20"
                                                            />
                                                            {showToSuggestions && toSuggestions.length > 0 && (
                                                                <div className="absolute top-full left-0 right-0 bg-[#242a37] border border-white/20 rounded-lg mt-1 z-50 max-h-40 overflow-y-auto">
                                                                    {toSuggestions.map((region) => (
                                                                        <div
                                                                            key={region.id}
                                                                            className="p-3 hover:bg-white/10 cursor-pointer text-white border-b border-white/10 last:border-b-0"
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, toRegion: region.name })
                                                                                setShowToSuggestions(false)
                                                                            }}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <MapPin className="h-4 w-4 text-[#ffd428]" />
                                                                                {region.name}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Cargo Details Section */}
                                                <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                        <Package className="h-5 w-5 text-[#ffd428]" />{tr("Cargo Details")}</h3>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-white font-medium">{tr("Cargo Type")}</Label>
                                                            <Select
                                                                value={formData.cargoType}
                                                                onValueChange={(value) => setFormData({ ...formData, cargoType: value })}
                                                            >
                                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                                    <SelectValue placeholder={tr("Select cargo type")} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="general">{tr("General Cargo")}</SelectItem>
                                                                    <SelectItem value="electronics">{tr("Electronics")}</SelectItem>
                                                                    <SelectItem value="furniture">{tr("Furniture")}</SelectItem>
                                                                    <SelectItem value="documents">{tr("Documents")}</SelectItem>
                                                                    <SelectItem value="food">{tr("Food & Beverages")}</SelectItem>
                                                                    <SelectItem value="textiles">{tr("Textiles")}</SelectItem>
                                                                    <SelectItem value="automotive">{tr("Automotive Parts")}</SelectItem>
                                                                    <SelectItem value="other">{tr("Other")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            {formData.cargoType && (
                                                                <div className="bg-[#ffd428]/10 p-3 rounded-lg border border-[#ffd428]/20">
                                                                    <div className="flex items-start gap-2">
                                                                        <Info className="h-4 w-4 text-[#ffd428] mt-0.5 flex-shrink-0" />
                                                                        <p className="text-sm text-gray-300">
                                                                            {cargoTypeGuides[formData.cargoType as keyof typeof cargoTypeGuides]}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-white font-medium">{tr("Approximate Weight")}</Label>
                                                            <Select
                                                                value={formData.weight}
                                                                onValueChange={(value) => setFormData({ ...formData, weight: value })}
                                                            >
                                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                                    <SelectValue placeholder={tr("Select weight range")} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0-10kg">{tr("0 - 10 kg")}</SelectItem>
                                                                    <SelectItem value="10-50kg">{tr("10 - 50 kg")}</SelectItem>
                                                                    <SelectItem value="50-100kg">{tr("50 - 100 kg")}</SelectItem>
                                                                    <SelectItem value="100-500kg">{tr("100 - 500 kg")}</SelectItem>
                                                                    <SelectItem value="500kg+">{tr("500+ kg")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            {formData.weight && (
                                                                <div className="bg-[#ffd428]/10 p-3 rounded-lg border border-[#ffd428]/20">
                                                                    <div className="flex items-start gap-2">
                                                                        <Info className="h-4 w-4 text-[#ffd428] mt-0.5 flex-shrink-0" />
                                                                        <p className="text-sm text-gray-300">
                                                                            {weightGuides[formData.weight as keyof typeof weightGuides]}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delivery Preferences Section */}
                                                <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                        <Clock className="h-5 w-5 text-[#ffd428]" />{tr("Delivery Preferences")}</h3>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-white font-medium">{tr("Package Size")}</Label>
                                                            <Select
                                                                value={formData.dimensions}
                                                                onValueChange={(value) => setFormData({ ...formData, dimensions: value })}
                                                            >
                                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                                    <SelectValue placeholder={tr("Select package size")} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="small">{tr("Small (fits in car)")}</SelectItem>
                                                                    <SelectItem value="medium">{tr("Medium (pickup truck)")}</SelectItem>
                                                                    <SelectItem value="large">{tr("Large (small truck)")}</SelectItem>
                                                                    <SelectItem value="xlarge">{tr("Extra Large (large truck)")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-white font-medium">{tr("Delivery Urgency")}</Label>
                                                            <Select
                                                                value={formData.urgency}
                                                                onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                                                            >
                                                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                                    <SelectValue placeholder={tr("How urgent is this?")} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="standard">{tr("Standard (3-5 days)")}</SelectItem>
                                                                    <SelectItem value="express">{tr("Express (1-2 days)")}</SelectItem>
                                                                    <SelectItem value="same-day">{tr("Same Day")}</SelectItem>
                                                                    <SelectItem value="scheduled">{tr("Scheduled Delivery")}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    {isFormComplete() && (
                                                        <div className="bg-[#ffd428]/10 p-4 rounded-lg border border-[#ffd428]/20">
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle className="h-5 w-5 text-[#ffd428] mt-0.5 flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-medium text-white mb-1">{tr("Ready for Quote!")}</p>
                                                                    <p className="text-xs text-gray-300">{tr("All details completed. Click below to see available transport options.")}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation Buttons */}
                                    <div className="flex gap-3">
                                        {showQuotes && (
                                            <Button
                                                onClick={handleBack}
                                                variant="outline"
                                                className="flex-1 border-white/20 text-white hover:bg-white/10 bg-transparent"
                                            >{tr("Back to Form")}</Button>
                                        )}
                                        {!showQuotes && (
                                            <Button
                                                onClick={handleGetQuotes}
                                                disabled={!isFormComplete()}
                                                className="w-full bg-[#ffd428] text-[#242a37] hover:bg-[#ffcc00] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                                            >{tr("Get Transport Quotes")}<ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <Clock className="h-4 w-4 text-[#ffd428]" />{tr("Fast Delivery")}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <Shield className="h-4 w-4 text-[#ffd428]" />{tr("Insured Cargo")}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <Star className="h-4 w-4 text-[#ffd428]" />{tr("Rated Drivers")}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <Users className="h-4 w-4 text-[#ffd428]" />{tr("24/7 Support")}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trust Indicators */}
                        <div className="mt-6 text-center space-y-3">
                            <p className="text-sm text-gray-400">{tr("Trusted by 15,000+ customers across Tanzania")}</p>
                            <div className="flex justify-center items-center gap-4 opacity-60">
                                <img src="/logos/taboa.png" alt="TABOA" className="h-8 grayscale" />
                                <img src="/logos/tcra.png" alt="TCRA" className="h-8 grayscale" />
                                <img src="/logos/hai.png" alt="HAI" className="h-8 grayscale" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Auth Modal */}
            <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
                <DialogContent className="bg-[#242a37] border-white/20 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold">{tr("Start Your Shipment")}</DialogTitle>
                        <DialogDescription className="text-center text-gray-400">
                            {selectedQuote && (
                                <div className="bg-[#ffd428]/10 p-3 rounded-lg mt-4 border border-[#ffd428]/20">
                                    <div className="flex items-center justify-between">
                                        <span>{selectedQuote.name}</span>
                                        <span className="font-bold text-[#ffd428]">{tr("TSh {price}", { price: selectedQuote.price.toLocaleString() })}</span>
                                    </div>
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-6">
                        <div className="text-center mb-6">
                            <p className="text-sm text-gray-400">{tr("Choose how you'd like to continue")}</p>
                        </div>

                        <div className="space-y-3">
                            <Link href="/login" className="block">
                                <Button className="w-full bg-[#ffd428] text-[#242a37] hover:bg-[#ffcc00] font-semibold py-3">
                                    <User className="mr-2 h-4 w-4" />{tr("Sign In to Existing Account")}</Button>
                            </Link>

                            <div className="text-center text-sm text-gray-400">{tr("or create a new account")}</div>

                            <Link href="/register?type=individual" className="block">
                                <Button
                                    variant="outline"
                                    className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent py-3"
                                >
                                    <User className="mr-2 h-4 w-4" />{tr("Individual Account")}</Button>
                            </Link>

                            <Link href="/register?type=corporate" className="block">
                                <Button
                                    variant="outline"
                                    className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent py-3"
                                >
                                    <Building className="mr-2 h-4 w-4" />{tr("Company account")}</Button>
                            </Link>
                        </div>

                        <div className="text-center pt-4 border-t border-white/10">
                            <p className="text-xs text-gray-500">{tr("By continuing, you agree to our Terms of Service and Privacy Policy")}</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                <button
                    onClick={scrollToNext}
                    className="bg-white/10 p-3 rounded-full border border-white/20 hover:bg-white/20 transition-colors"
                >
                    <ChevronDown className="h-6 w-6 text-white" />
                </button>
            </div>
        </section>
    )
}
