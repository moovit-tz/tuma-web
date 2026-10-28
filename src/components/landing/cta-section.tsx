"use client"

import Link from "next/link"
import { ArrowRight, Shield, Clock, Users, TrendingUp, CheckCircle, Star, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
    return (
        <section className="bg-white py-12 md:py-16">
            <div className="container mx-auto px-4">
                {/* Main CTA Container */}
                <div className="relative mx-auto max-w-full overflow-hidden rounded-[var(--ds-radius-large)] bg-[#FFD428]">
                    {/* Subtle decorative shapes */}
                    <div className="pointer-events-none absolute inset-0">
                    </div>

                    <div className="relative px-4 py-10 md:px-8 md:py-16">
                        {/* Header Section */}
                        <div className="mb-8 text-center md:mb-16">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#242a37]/15 bg-white/40 px-4 py-1.5 md:mb-8 md:px-6 md:py-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#242a37]" />
                                <span className="text-xs font-semibold text-[#242a37] md:text-sm">Join Our Wakala Network</span>
                            </div>

                            <h2 className="mb-4 px-2 text-3xl leading-tight font-bold text-[#242a37] md:mb-8 md:text-5xl lg:text-6xl">
                                Ready to Transform Your
                                <br />
                                Delivery Business?
                            </h2>

                            <p className="mx-auto mb-8 max-w-3xl px-4 text-base leading-relaxed text-[#242a37]/75 md:mb-12 md:text-xl">
                                Join our network of successful delivery partners and unlock new opportunities for growth
                            </p>

                            {/* Video/Image Section */}
                            <div className="mb-8 md:mb-12">
                                <div className="relative mx-auto max-w-2xl">
                                    <div className="relative overflow-hidden rounded-[var(--ds-radius-large)] border border-white/40 shadow-[var(--ds-shadow-raised)]">
                                        <div className="relative aspect-video bg-[#242a37]/10">
                                            <img
                                                src="/images/wakala-hero.png"
                                                alt="Wakala delivery network in action"
                                                className="h-full w-full object-cover"
                                            />
                                            <div className="group absolute inset-0 flex cursor-pointer items-center justify-center bg-black/15 transition-colors duration-300 hover:bg-black/25">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[var(--ds-shadow-raised)] transition-transform duration-300 md:h-20 md:w-20">
                                                    <Play className="ml-1 h-6 w-6 text-[#242a37] md:h-8 md:w-8" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-4 px-4 text-sm text-[#242a37]/70 md:text-base">
                                        Watch how our Wakala partners are transforming their communities
                                    </p>
                                </div>
                            </div>

                            <div className="mb-8 flex flex-col items-center justify-center gap-4 px-4 md:mb-12 md:flex-row md:gap-6">
                                <Button
                                    size="lg"
                                    className="group h-10 w-full rounded-full bg-[#242a37] px-6 text-base font-semibold text-white shadow-[var(--ds-shadow-raised)] transition-colors duration-200 hover:bg-[#1a1f2a] sm:w-auto md:h-16 md:px-6 md:text-lg"
                                    asChild
                                >
                                    <Link href="/register" className="flex items-center justify-center gap-2 md:gap-3">
                                        Become a Wakala
                                        <ArrowRight className="h-5 w-5 transition-transform md:h-6 md:w-6" />
                                    </Link>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-10 w-full rounded-full border-2 border-[#242a37] bg-transparent px-6 text-base font-semibold text-[#242a37] transition-colors duration-200 hover:bg-[#242a37] hover:text-white sm:w-auto md:h-16 md:px-6 md:text-lg"
                                    asChild
                                >
                                    <Link href="/learn-more">Learn More</Link>
                                </Button>
                            </div>

                            {/* Trust indicators */}
                            <div className="flex flex-col flex-wrap items-center justify-center gap-4 px-4 text-xs text-[#242a37]/70 sm:flex-row md:gap-8 md:text-sm">
                                {[
                                    { icon: CheckCircle, text: "No Setup Fees" },
                                    { icon: CheckCircle, text: "24/7 Support" },
                                    { icon: CheckCircle, text: "Instant Payouts" },
                                ].map((item) => (
                                    <div key={item.text} className="flex items-center gap-2">
                                        <item.icon className="h-3 w-3 text-[#242a37] md:h-4 md:w-4" />
                                        <span>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Statistics Grid */}
                        <div className="mb-8 grid grid-cols-2 gap-4 md:mb-16 md:gap-8 lg:grid-cols-4">
                            {[
                                {
                                    icon: Users,
                                    number: "3,900+",
                                    label: "Active Partners",
                                    description: "Growing nationwide",
                                },
                                {
                                    icon: TrendingUp,
                                    number: "98%",
                                    label: "Success Rate",
                                    description: "Reliable service",
                                },
                                {
                                    icon: Clock,
                                    number: "24/7",
                                    label: "Support",
                                    description: "Always available",
                                },
                                {
                                    icon: Shield,
                                    number: "100%",
                                    label: "Secure",
                                    description: "Money is safe",
                                },
                            ].map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <div className="rounded-[var(--ds-radius-large)] border border-white/40 bg-white/25 p-3 transition-colors duration-300 hover:bg-white/40 md:rounded-[var(--ds-radius-large)] md:p-6">
                                        <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#242a37] md:mb-4 md:h-12 md:w-12 md:rounded-[var(--ds-radius-small)]">
                                            <stat.icon className="h-4 w-4 text-white md:h-6 md:w-6" />
                                        </div>
                                        <div className="mb-1 text-xl font-bold text-[#242a37] md:mb-2 md:text-3xl lg:text-4xl">
                                            {stat.number}
                                        </div>
                                        <div className="mb-1 text-xs font-semibold text-[#242a37] md:text-base">{stat.label}</div>
                                        <div className="hidden text-xs text-[#242a37]/70 md:block md:text-sm">{stat.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Benefits Section */}
                        <div className="mx-auto max-w-5xl">
                            <div className="mb-8 text-center md:mb-12">
                                <h3 className="mb-2 px-4 text-xl font-bold text-[#242a37] md:mb-4 md:text-2xl lg:text-3xl">
                                    Why Choose Our Platform?
                                </h3>
                                <p className="px-4 text-base text-[#242a37]/80 md:text-lg">
                                    Everything you need to succeed as a delivery partner
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                                {[
                                    {
                                        title: "Easy Registration",
                                        description: "Get started in minutes with our simple onboarding process",
                                        features: ["Quick verification", "Digital documentation", "Instant approval"],
                                    },
                                    {
                                        title: "Flexible Earnings",
                                        description: "Work on your schedule and maximize your income potential",
                                        features: ["Choose your hours", "Multiple income streams", "Performance bonuses"],
                                    },
                                    {
                                        title: "Full Support",
                                        description: "Comprehensive training and ongoing support for your success",
                                        features: ["Training materials", "Dedicated support", "Community network"],
                                    },
                                ].map((benefit) => (
                                    <div
                                        key={benefit.title}
                                        className="rounded-[var(--ds-radius-large)] border border-white/40 bg-white/25 p-4 transition-colors duration-300 hover:bg-white/40 md:rounded-[var(--ds-radius-large)] md:p-6"
                                    >
                                        <div className="mb-3 flex items-center gap-3 md:mb-4">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#242a37] md:h-8 md:w-8">
                                                <Star className="h-3 w-3 text-white md:h-4 md:w-4" />
                                            </div>
                                            <h4 className="text-lg font-bold text-[#242a37] md:text-xl">{benefit.title}</h4>
                                        </div>
                                        <p className="mb-3 text-sm text-[#242a37]/80 md:mb-4 md:text-base">{benefit.description}</p>
                                        <ul className="space-y-1 md:space-y-2">
                                            {benefit.features.map((feature) => (
                                                <li
                                                    key={feature}
                                                    className="flex items-center gap-2 text-xs text-[#242a37]/70 md:text-sm"
                                                >
                                                    <CheckCircle className="h-3 w-3 flex-shrink-0 text-[#242a37] md:h-4 md:w-4" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Final CTA */}
                        <div className="mt-8 border-t border-[#242a37]/15 pt-8 text-center md:mt-16 md:pt-12">
                            <p className="mb-4 px-4 text-base text-[#242a37]/80 md:mb-6 md:text-lg">
                                Ready to start your journey with us?
                            </p>
                            <Button
                                size="lg"
                                className="group mx-auto h-10 w-full max-w-xs rounded-full bg-[#242a37] px-6 text-base font-semibold text-white shadow-[var(--ds-shadow-raised)] transition-colors duration-200 hover:bg-[#1a1f2a] sm:w-auto md:h-14 md:px-8 md:text-lg"
                                asChild
                            >
                                <Link href="/register" className="flex items-center justify-center gap-2">
                                    Get Started Today
                                    <ArrowRight className="h-4 w-4 transition-transform md:h-5 md:w-5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
