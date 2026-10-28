"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, MapPin, DollarSign, Users, Clock, Globe } from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

export function MarketplaceFeatures() {
    const tr = useTr()
    const features = [
        {
            icon: Shield,
            title: tr("Secure & Insured"),
            description: tr("All cargo is insured and tracked throughout the journey"),
            stats: "100% Coverage",
        },
        {
            icon: MapPin,
            title: tr("Real-time Tracking"),
            description: tr("Track your shipment from pickup to delivery"),
            stats: "Live Updates",
        },
        {
            icon: DollarSign,
            title: tr("Best Rates"),
            description: tr("Compare prices from multiple verified transporters"),
            stats: "Save up to 40%",
        },
        {
            icon: Users,
            title: tr("Verified Transporters"),
            description: tr("All transport companies are vetted and rated"),
            stats: "500+ Partners",
        },
        {
            icon: Clock,
            title: tr("Fast Delivery"),
            description: tr("Same-day to scheduled delivery options available"),
            stats: "6hr - 7 days",
        },
        {
            icon: Globe,
            title: tr("Wide Coverage"),
            description: tr("Serving all major cities and regions across Tanzania"),
            stats: "26 Regions",
        },
    ]

    return (
        <section id="features-section" className="py-20 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <Badge className="bg-[#ffd428]/20 text-[#ffd428] border-[#ffd428]/30 px-4 py-2 text-sm font-medium mb-4">{tr("Why Choose MySafari")}</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{tr("Trusted Cargo Shipping Across Africa")}</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">{tr("We connect cargo owners with reliable transport companies, ensuring safe, fast, and affordable delivery solutions across Tanzania and beyond.")}</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {features.map((feature, index) => (
                        <Card
                            key={index}
                            className="group transition-colors duration-300 border-gray-200 hover:border-[#ffd428]/30"
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="bg-[#ffd428]/10 p-3 rounded-[var(--ds-radius-small)] group-hover:bg-[#ffd428]/20 transition-colors">
                                        <feature.icon className="h-6 w-6 text-[#ffd428]" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{feature.title}</h3>
                                        <p className="text-gray-600 mb-3">{feature.description}</p>
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                            {feature.stats}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Stats Section */}
                <div className="bg-[#242a37] rounded-[var(--ds-radius-large)] p-8 md:p-8">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">{tr("Trusted by Thousands")}</h3>
                        <p className="text-gray-300">{tr("Join the growing community of satisfied customers")}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-[#ffd428] mb-2">15,000+</div>
                            <div className="text-gray-300">{tr("Successful Deliveries")}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-[#ffd428] mb-2">500+</div>
                            <div className="text-gray-300">{tr("Verified Transporters")}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-[#ffd428] mb-2">26</div>
                            <div className="text-gray-300">{tr("Regions Covered")}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-[#ffd428] mb-2">4.9★</div>
                            <div className="text-gray-300">{tr("Customer Rating")}</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
