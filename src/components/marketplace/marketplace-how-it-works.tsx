"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Package, Truck, CreditCard, Bell, CheckCircle, ArrowRight } from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

export function MarketplaceHowItWorks() {
    const tr = useTr()
    const steps = [
        {
            icon: MapPin,
            title: tr("Enter Locations"),
            description: tr("Specify your pickup and delivery locations with cargo details"),
            details: "Our smart form guides you through selecting regions and providing accurate cargo information.",
        },
        {
            icon: Package,
            title: tr("Get Quotes"),
            description: tr("Receive instant quotes from verified transport companies"),
            details: "Compare prices, delivery times, and transport types to find the best option for your needs.",
        },
        {
            icon: CreditCard,
            title: tr("Book & Pay"),
            description: tr("Choose your preferred option and make secure payment"),
            details: "Multiple payment options available including mobile money, bank transfer, and credit cards.",
        },
        {
            icon: Truck,
            title: tr("Pickup Scheduled"),
            description: tr("Transporter contacts you to arrange pickup time"),
            details: "Receive confirmation with driver details and estimated pickup time within 2 hours.",
        },
        {
            icon: Bell,
            title: tr("Track Shipment"),
            description: tr("Monitor your cargo's journey with real-time updates"),
            details: "Get SMS and app notifications at every stage of your shipment's journey.",
        },
        {
            icon: CheckCircle,
            title: tr("Delivery Complete"),
            description: tr("Your cargo arrives safely at the destination"),
            details: "Confirm delivery and rate your experience to help other customers.",
        },
    ]

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <Badge className="bg-[#ffd428]/20 text-[#ffd428] border-[#ffd428]/30 px-4 py-2 text-sm font-medium mb-4">{tr("Simple Process")}</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{tr("How It Works")}</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">{tr("Shipping your cargo across Tanzania has never been easier. Follow these simple steps to get your items delivered safely and on time.")}</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {steps.map((step, index) => (
                        <Card
                            key={index}
                            className="group transition-colors duration-300 border-gray-200 hover:border-[#ffd428]/30 relative"
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="relative">
                                        <div className="bg-[#ffd428]/10 p-3 rounded-[var(--ds-radius-small)] group-hover:bg-[#ffd428]/20 transition-colors">
                                            <step.icon className="h-6 w-6 text-[#ffd428]" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 bg-[#ffd428] text-[#242a37] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{step.title}</h3>
                                        <p className="text-gray-600 mb-3">{step.description}</p>
                                        <p className="text-sm text-gray-500">{step.details}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="text-center bg-white rounded-[var(--ds-radius-large)] p-8 md:p-8 shadow-[var(--ds-shadow-raised)]">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{tr("Ready to Ship Your Cargo?")}</h3>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">{tr("Join thousands of satisfied customers who trust MySafari for their cargo shipping needs across Tanzania and beyond.")}</p>
                    <Button
                        onClick={() => {
                            const heroSection = document.querySelector("section")
                            heroSection?.scrollIntoView({ behavior: "smooth" })
                        }}
                        className="bg-[#ffd428] text-[#242a37] hover:bg-[#ffcc00] font-semibold px-8 py-3 text-lg"
                    >{tr("Get Started Now")}<ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>

                {/* Trust Section */}
                <div className="mt-16 text-center">
                    <p className="text-gray-500 mb-6">{tr("Trusted by leading companies across Tanzania")}</p>
                    <div className="flex justify-center items-center gap-8 opacity-60">
                        <img src="/logos/taboa.png" alt="TABOA" className="h-12 grayscale hover:grayscale-0 transition-colors" />
                        <img src="/logos/tcra.png" alt="TCRA" className="h-12 grayscale hover:grayscale-0 transition-colors" />
                        <img src="/logos/hai.png" alt="HAI" className="h-12 grayscale hover:grayscale-0 transition-colors" />
                        <img src="/logos/jubilee.png" alt={tr("Jubilee")} className="h-12 grayscale hover:grayscale-0 transition-colors" />
                        <img src="/logos/cityboy.png" alt={tr("CityBoy")} className="h-12 grayscale hover:grayscale-0 transition-colors" />
                    </div>
                </div>
            </div>
        </section>
    )
}
