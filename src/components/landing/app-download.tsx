"use client"

import Link from "next/link"
import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Home, Package, Bus, Shield, BarChart3, ExternalLink } from "lucide-react"
import { GooglePlayIcon, AppleIcon } from "@/components/landing/icons"

const interfaces = [
    {
        id: "agent",
        step: "01",
        title: "Agent Interface",
        subtitle: "For Delivery Partners",
        description:
            "Manage your daily deliveries, track earnings, and optimize routes with our intuitive mobile app designed for individual delivery agents.",
        icon: Package,
        color: "#e6bc00",
        features: ["Real-time Earnings", "Smart Route Planning", "Instant Notifications"],
        mockup: {
            header: "MySafari Agent",
            stats: [
                { label: "Deliveries", value: "24" },
                { label: "Earnings", value: "60,500 Tsh" },
            ],
            activeOrder: "Package #MS32945",
            route: "Dar es Salaam → Arusha",
            progress: 66,
        },
        ctaType: "download",
    },
    {
        id: "trip-agent",
        step: "02",
        title: "Trip Agent Interface",
        subtitle: "For Route Managers",
        description:
            "Coordinate multiple deliveries and manage trip schedules efficiently with advanced planning tools designed for route supervisors.",
        icon: Bus,
        color: "#0d9488",
        features: ["Trip Coordination", "Multi-Stop Planning", "Driver Management"],
        mockup: {
            header: "MySafari Trips",
            stats: [
                { label: "Active Trips", value: "8" },
                { label: "Drivers", value: "12" },
            ],
            activeOrder: "Trip #TR4521",
            route: "Dar → Mwanza → Arusha",
            progress: 45,
        },
        ctaType: "download",
    },
    {
        id: "super-agent",
        step: "03",
        title: "Super Agent Interface",
        subtitle: "For Regional Supervisors",
        description:
            "Oversee operations across multiple locations and manage agent networks with comprehensive oversight tools for regional management.",
        icon: Shield,
        color: "#7c3aed",
        features: ["Network Oversight", "Performance Analytics", "Agent Support"],
        mockup: {
            header: "MySafari Super",
            stats: [
                { label: "Regions", value: "5" },
                { label: "Agents", value: "156" },
            ],
            activeOrder: "Region: Northern",
            route: "98% Success Rate",
            progress: 98,
        },
        ctaType: "download",
    },
    {
        id: "dashboard",
        step: "04",
        title: "Management Dashboard",
        subtitle: "For Business Intelligence",
        description:
            "Comprehensive analytics and business insights for strategic decisions with advanced reporting capabilities for executive management.",
        icon: BarChart3,
        color: "#0369a1",
        features: ["Advanced Analytics", "Revenue Tracking", "Operational Insights"],
        mockup: {
            header: "MySafari Analytics",
            stats: [
                { label: "Revenue", value: "2.4M Tsh" },
                { label: "Orders", value: "1,247" },
            ],
            activeOrder: "Monthly Report",
            route: "Growth: +23%",
            progress: 85,
        },
        ctaType: "request",
    },
]

const featureDescriptions: Record<string, string> = {
    "Real-time Earnings": "Track your revenue instantly as you complete deliveries",
    "Smart Route Planning": "Optimize your delivery routes to save time and fuel",
    "Instant Notifications": "Stay informed about new pickup requests and delivery updates",
    "Trip Coordination": "Manage multiple delivery routes and schedules efficiently",
    "Multi-Stop Planning": "Plan complex routes with multiple pickup and delivery points",
    "Driver Management": "Coordinate and communicate with your driver network",
    "Network Oversight": "Monitor and manage agent performance across regions",
    "Performance Analytics": "Access detailed insights on network performance",
    "Agent Support": "Provide guidance and support to your agent network",
    "Advanced Analytics": "Deep dive into business metrics and trends",
    "Revenue Tracking": "Monitor financial performance and growth",
    "Operational Insights": "Make data-driven decisions for business optimization",
}

type InterfaceItem = (typeof interfaces)[number]

function PhoneMockup({ item }: { item: InterfaceItem }) {
    return (
        <div className="rounded-[var(--ds-radius-large)] border border-gray-200 bg-[#fafafa] p-6">
            <div className="relative mx-auto h-[420px] w-full max-w-[260px]">
                {/* Phone frame */}
                <div className="absolute inset-0 rounded-[var(--ds-radius-large)] bg-[#242a37] p-3 shadow-[var(--ds-shadow-raised)]">
                    <div className="absolute top-0 left-1/2 h-5 w-32 -translate-x-1/2 rounded-b-[var(--ds-radius-small)] bg-[#242a37]" />
                    <div className="h-full w-full overflow-hidden rounded-[var(--ds-radius-large)] bg-white p-2">
                        {/* App UI mockup */}
                        <div className="flex h-full w-full flex-col overflow-hidden rounded-[var(--ds-radius-large)] bg-white">
                            {/* App header */}
                            <div className="border-b border-gray-100 bg-white px-4 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="flex h-6 w-6 items-center justify-center rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        >
                                            <item.icon className="h-3 w-3 text-white" />
                                        </div>
                                        <span className="text-sm font-bold text-[#242a37]">{item.mockup.header}</span>
                                    </div>
                                    <div className="h-5 w-5 rounded-full bg-gray-100" />
                                </div>
                            </div>

                            {/* App content */}
                            <div className="flex flex-1 flex-col space-y-3 p-3">
                                {/* Dashboard summary */}
                                <div className="rounded-[var(--ds-radius-small)] bg-[#fafafa] p-3">
                                    <div className="mb-2 text-xs text-gray-400">Today&apos;s Overview</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {item.mockup.stats.map((stat) => (
                                            <div key={stat.label} className="rounded-lg border border-gray-100 bg-white p-2">
                                                <div className="text-xs" style={{ color: item.color }}>
                                                    {stat.label}
                                                </div>
                                                <div className="text-sm font-bold text-[#242a37]">{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Active item */}
                                <div
                                    className="relative rounded-[var(--ds-radius-small)] border border-gray-100 bg-white p-3"
                                    style={{ borderLeft: `4px solid ${item.color}` }}
                                >
                                    <div
                                        className="absolute top-3 right-3 h-2 w-2 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <div className="mb-1 text-xs" style={{ color: item.color }}>
                                        Active {item.id === "dashboard" ? "Report" : "Order"}
                                    </div>
                                    <div className="text-xs font-medium text-[#242a37]">{item.mockup.activeOrder}</div>
                                    <div className="mt-2 text-xs text-gray-500">{item.mockup.route}</div>
                                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{ backgroundColor: item.color, width: `${item.mockup.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom navigation */}
                            <div className="flex justify-around border-t border-gray-100 bg-white px-4 py-3">
                                <div className="flex flex-col items-center">
                                    <div
                                        className="flex h-5 w-5 items-center justify-center rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    >
                                        <Home className="h-2.5 w-2.5 text-white" />
                                    </div>
                                    <div className="mt-1 text-xs" style={{ color: item.color }}>
                                        Home
                                    </div>
                                </div>
                                {[1, 2, 3].map((menuItem) => (
                                    <div key={menuItem} className="flex flex-col items-center">
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100">
                                            <div className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
                                        </div>
                                        <div className="mt-1 text-xs text-gray-400">Menu</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Orchestration: the text column's children cascade in one after another,
// and the visual column slides in from the side it's revealed on.
const stepContainer = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.12, delayChildren: 0.05 },
    },
}

const itemFadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const featureListContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
}

const imageSlideIn = (fromLeft: boolean) => ({
    hidden: { opacity: 0, x: fromLeft ? -60 : 60, scale: 0.96 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.8, ease: "easeOut" } },
})

function InterfaceStep({ item, index }: { item: InterfaceItem; index: number }) {
    const stepRef = useRef(null)
    const isStepInView = useInView(stepRef, { once: true, amount: 0.25 })
    const reversed = index % 2 === 1
    const animate = isStepInView ? "visible" : "hidden"

    return (
        <div
            ref={stepRef}
            className="grid items-center gap-10 py-14 first:pt-0 last:pb-0 md:py-20 lg:grid-cols-2 lg:gap-16"
        >
            {/* Text column */}
            <motion.div
                variants={stepContainer}
                initial="hidden"
                animate={animate}
                className={reversed ? "lg:order-2" : "lg:order-1"}
            >
                <motion.div variants={itemFadeUp} className="mb-5 flex items-center gap-3">
                    <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                        Step {item.step}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}15` }}>
                        <item.icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                </motion.div>

                <motion.h3 variants={itemFadeUp} className="mb-2 text-2xl font-bold text-[#242a37] md:text-3xl">
                    {item.title}
                </motion.h3>
                <motion.p variants={itemFadeUp} className="mb-4 text-sm font-medium text-gray-400">
                    {item.subtitle}
                </motion.p>

                <motion.p variants={itemFadeUp} className="mb-6 max-w-xl text-base leading-relaxed text-gray-600">
                    {item.description}
                </motion.p>

                {/* Process breakdown */}
                <motion.ul variants={featureListContainer} className="mb-8 space-y-4">
                    {item.features.map((feature) => (
                        <motion.li key={feature} variants={itemFadeUp} className="flex items-start gap-3">
                            <div
                                className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                                style={{ backgroundColor: `${item.color}15` }}
                            >
                                <Check className="h-3.5 w-3.5" style={{ color: item.color }} />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-[#242a37]">{feature}</div>
                                <div className="text-sm text-gray-500">{featureDescriptions[feature]}</div>
                            </div>
                        </motion.li>
                    ))}
                </motion.ul>

                {/* CTA */}
                <motion.div variants={itemFadeUp}>
                    {item.ctaType === "download" ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                className="flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-[var(--ds-shadow-raised)] transition-colors duration-200"
                                style={{ backgroundColor: item.color }}
                                asChild
                            >
                                <Link href="https://play.google.com/store/apps/details?id=com.mysafari.parcel&pcampaignid=web_share">
                                    <GooglePlayIcon className="h-4 w-4" />
                                    Google Play
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                className="flex h-10 items-center gap-2 rounded-full border-gray-300 bg-white px-5 text-sm text-[#242a37] shadow-[var(--ds-shadow-raised)] transition-colors duration-200 hover:bg-gray-50"
                                asChild
                            >
                                <Link href="/download/ios">
                                    <AppleIcon className="h-4 w-4" />
                                    App Store
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <Button
                            className="flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-[var(--ds-shadow-raised)] transition-colors duration-200"
                            style={{ backgroundColor: item.color }}
                            asChild
                        >
                            <Link href="/request-dashboard-access">
                                <ExternalLink className="h-4 w-4" />
                                Request Dashboard Access
                            </Link>
                        </Button>
                    )}
                </motion.div>
            </motion.div>

            {/* Visual column */}
            <motion.div
                variants={imageSlideIn(reversed)}
                initial="hidden"
                animate={animate}
                className={reversed ? "lg:order-1" : "lg:order-2"}
            >
                <PhoneMockup item={item} />
            </motion.div>
        </div>
    )
}

export function AppDownload() {
    const headerRef = useRef(null)
    const isHeaderInView = useInView(headerRef, { once: true, amount: 0.3 })

    return (
        <section className="relative overflow-hidden bg-white py-16 md:py-24 lg:py-28">

            <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <motion.div
                    ref={headerRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="mb-4 text-center"
                >
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#242a37]/10 bg-[#fafafa] px-4 py-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FFD428]" />
                        <span className="text-sm font-medium text-[#242a37]">Interface Showcase</span>
                    </div>

                    <h2 className="mb-4 text-3xl font-bold text-[#242a37] md:text-4xl lg:text-5xl">
                        Powerful apps for every role
                    </h2>

                    <p className="mx-auto max-w-2xl text-base text-gray-600 md:text-lg">
                        From individual agents to management teams, we have specialized interfaces designed for every
                        level of your delivery operation
                    </p>
                </motion.div>

                {/* Step journey */}
                <div className="divide-y divide-gray-100">
                    {interfaces.map((item, index) => (
                        <InterfaceStep key={item.id} item={item} index={index} />
                    ))}
                </div>
            </div>
        </section>
    )
}
