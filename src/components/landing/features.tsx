"use client"

import Link from "next/link"
import { ArrowRight, Package, Bus, Clock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Features() {
    return (
        <section className="relative overflow-hidden bg-white py-24 md:py-32">
            <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="mb-16 text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#242a37]/10 bg-[#fafafa] px-4 py-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FFD428]" />
                        <span className="text-sm font-medium text-[#242a37]">Cutting-Edge Solutions</span>
                    </div>
                    <h2 className="mb-6 text-4xl font-bold text-[#242a37] md:text-5xl">
                        Why Choose MySafari Parcel?
                    </h2>
                    <p className="mx-auto max-w-2xl text-lg text-gray-600">
                        Experience seamless delivery services with innovative technology
                    </p>
                </div>

                {/* Feature cards in a staggered layout */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
                    {/* Smart Tracking - Larger card */}
                    <div className="group lg:col-span-6">
                        <div className="relative h-full overflow-hidden rounded-[var(--ds-radius-large)] border border-gray-200 bg-[#fafafa] p-8 transition-colors duration-300 hover:border-[#FFD428]/50">
                            <div className="relative z-10">
                                <div className="mb-8 flex items-start justify-between">
                                    <div className="rounded-[var(--ds-radius-large)] bg-[#FFD428]/15 p-3">
                                        <Package className="h-8 w-8 text-[#242a37]" />
                                    </div>
                                </div>
                                <h3 className="mb-4 text-2xl font-bold text-[#242a37]">Smart Tracking</h3>
                                <p className="text-gray-600">
                                    Real-time package tracking with live updates and location sharing. Get instant notifications at
                                    every milestone of your delivery journey.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Fast Delivery */}
                    <div className="group lg:col-span-6">
                        <div className="relative h-full overflow-hidden rounded-[var(--ds-radius-large)] border border-gray-200 bg-[#fafafa] p-8 transition-colors duration-300 hover:border-[#FFD428]/50">
                            <div className="relative z-10">
                                <div className="mb-8 flex items-start justify-between">
                                    <div className="rounded-[var(--ds-radius-large)] bg-[#FFD428]/15 p-3">
                                        <Bus className="h-8 w-8 text-[#242a37]" />
                                    </div>
                                </div>
                                <h3 className="mb-4 text-2xl font-bold text-[#242a37]">Fast Delivery</h3>
                                <p className="text-gray-600">
                                    Express delivery across Tanzania with optimized routes. Our efficient network ensures your
                                    packages arrive on time, every time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 24/7 Service */}
                    <div className="group lg:col-span-4">
                        <div className="relative h-full overflow-hidden rounded-[var(--ds-radius-large)] border border-gray-200 bg-[#fafafa] p-6 transition-colors duration-300 hover:border-[#FFD428]/50">
                            <div className="relative z-10">
                                <div className="mb-6 flex items-start justify-between">
                                    <div className="rounded-[var(--ds-radius-large)] bg-[#FFD428]/15 p-3">
                                        <Clock className="h-6 w-6 text-[#242a37]" />
                                    </div>
                                </div>
                                <h3 className="mb-3 text-xl font-bold text-[#242a37]">24/7 Service</h3>
                                <p className="text-gray-600">
                                    Round-the-clock customer support available to assist you with any concerns or inquiries.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Secure Shipping */}
                    <div className="group lg:col-span-4">
                        <div className="relative h-full overflow-hidden rounded-[var(--ds-radius-large)] border border-gray-200 bg-[#fafafa] p-6 transition-colors duration-300 hover:border-[#FFD428]/50">
                            <div className="relative z-10">
                                <div className="mb-6 flex items-start justify-between">
                                    <div className="rounded-[var(--ds-radius-large)] bg-[#FFD428]/15 p-3">
                                        <Shield className="h-6 w-6 text-[#242a37]" />
                                    </div>
                                </div>
                                <h3 className="mb-3 text-xl font-bold text-[#242a37]">Secure Shipping</h3>
                                <p className="text-gray-600">
                                    End-to-end package protection with insurance options and tamper-proof packaging.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mobile App */}
                    <div className="group lg:col-span-4">
                        <div className="relative h-full overflow-hidden rounded-[var(--ds-radius-large)] border border-gray-200 bg-[#fafafa] p-6 transition-colors duration-300 hover:border-[#FFD428]/50">
                            <div className="relative z-10">
                                <div className="mb-6 flex items-start justify-between">
                                    <div className="rounded-[var(--ds-radius-large)] bg-[#FFD428]/15 p-3">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-6 w-6 text-[#242a37]"
                                        >
                                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                            <path d="M12 18h.01" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="mb-3 text-xl font-bold text-[#242a37]">Mobile App</h3>
                                <p className="text-gray-600">
                                    Manage deliveries on the go with our intuitive mobile application available on iOS and Android.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-16 text-center">
                    <Button
                        size="lg"
                        className="group h-10 rounded-full bg-[#FFD428] px-8 text-lg text-[#242a37] hover:bg-[#e6bc00]"
                        asChild
                    >
                        <Link href="/features" className="flex items-center gap-2">
                            Explore All Features
                            <ArrowRight className="h-5 w-5 transition-transform" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
