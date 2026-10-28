"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import type { Cargo, CargoFilter, CargoType } from "@/types/cargo"
import { cargoService } from "@/lib/services/cargo"
import { MarketplaceHero } from "@/components/marketplace/marketplace-hero"
import { MarketplaceFeatures } from "@/components/marketplace/marketplace-features"
import { MarketplaceHowItWorks } from "@/components/marketplace/marketplace-how-it-works"
import { SiteNavbar } from "@/components/site/navbar"
import { SiteFooter } from "@/components/site/footer"
import { FloatingSupport } from "@/components/floating-support"

const CARGO_TYPES: { value: CargoType; label: string }[] = [
    { value: "GENERAL", label: "General" },
    { value: "FRAGILE", label: "Fragile" },
    { value: "PERISHABLE", label: "Perishable" },
    { value: "HAZARDOUS", label: "Hazardous" },
    { value: "ELECTRONICS", label: "Electronics" },
    { value: "DOCUMENTS", label: "Documents" },
    { value: "FURNITURE", label: "Furniture" },
    { value: "AUTOMOTIVE", label: "Automotive" },
    { value: "TEXTILES", label: "Textiles" },
    { value: "FOOD", label: "Food" },
    { value: "MEDICAL", label: "Medical" },
    { value: "OTHER", label: "Other" },
]

export default function MarketplacePage() {
    const { toast } = useToast()

    // State
    const [activeTab, setActiveTab] = useState("browse")
    const [showCargoForm, setShowCargoForm] = useState(false)
    const [showBidModal, setShowBidModal] = useState(false)
    const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [showFilters, setShowFilters] = useState(false)

    // Filters
    const [filters, setFilters] = useState<CargoFilter>({
        sortBy: "date",
        sortOrder: "desc",
        cargoType: "ALL",
    })

    // Fetch cargos
    const {
        data: cargos = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["cargos", filters, searchQuery],
        queryFn: () =>
            cargoService.getCargos({
                ...filters,
                ...(searchQuery && { location: searchQuery }),
            }),
    })

    // Fetch user's cargos
    const { data: userCargos = [] } = useQuery({
        queryKey: ["user-cargos"],
        queryFn: cargoService.getUserCargos,
        enabled: activeTab === "my-cargos",
    })

    // Fetch company's bids
    const { data: companyBids = [] } = useQuery({
        queryKey: ["company-bids"],
        queryFn: cargoService.getCompanyBids,
        enabled: activeTab === "my-bids",
    })

    const handleViewDetails = (cargo: Cargo) => {
        setSelectedCargo(cargo)
        toast({
            title: "Cargo Details",
            description: `Viewing details for: ${cargo.title}`,
        })
    }

    const handlePlaceBid = (cargo: Cargo) => {
        setSelectedCargo(cargo)
        setShowBidModal(true)
    }

    const handleFilterChange = (key: keyof CargoFilter, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
    }

    const clearFilters = () => {
        setFilters({
            sortBy: "date",
            sortOrder: "desc",
            cargoType: "ALL",
        })
        setSearchQuery("")
    }

    const filteredCargos = cargos.filter((cargo) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                cargo.title.toLowerCase().includes(query) ||
                cargo.pickupLocation.toLowerCase().includes(query) ||
                cargo.deliveryLocation.toLowerCase().includes(query) ||
                cargo.description.toLowerCase().includes(query)
            )
        }
        return true
    })

    return (
        <div className="min-h-screen bg-[#242a37]">
            <SiteNavbar />
            <main>
                <MarketplaceHero />
                <MarketplaceFeatures />
                <MarketplaceHowItWorks />
            </main>
            <SiteFooter />
            <FloatingSupport />
        </div>
    )
}
