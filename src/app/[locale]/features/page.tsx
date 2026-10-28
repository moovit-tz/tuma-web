"use client"

import Link from "next/link"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { ArrowRight, Package, Smartphone, MapPin, Shield, Clock, BarChart3, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteNavbar } from "@/components/site/navbar"
import { SiteFooter } from "@/components/site/footer"
import { FloatingSupport } from "@/components/floating-support"

// Animation variants
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
}

const fadeUpDelayed = (delay: number) => ({
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "easeOut", delay },
    },
})

const staggerFade = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: "easeOut",
            staggerChildren: 0.1,
        },
    },
}

const scaleUp = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" } },
}

const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
}

const slideInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
}

// Feature highlights data
const featureHighlights = [
    {
        icon: <Package className="h-6 w-6" />,
        title: "Real-time Tracking",
        description: "Monitor every package from pickup to delivery with live GPS tracking and instant notifications.",
    },
    {
        icon: <Smartphone className="h-6 w-6" />,
        title: "Mobile Apps",
        description:
            "Dedicated apps for agents, customers, and businesses with intuitive interfaces and offline capabilities.",
    },
    {
        icon: <MapPin className="h-6 w-6" />,
        title: "Smart Routing",
        description: "AI-powered route optimization that reduces delivery times and operational costs.",
    },
    {
        icon: <Shield className="h-6 w-6" />,
        title: "Secure Delivery",
        description: "End-to-end security with package insurance, tamper-proof sealing, and verified handoffs.",
    },
    {
        icon: <Clock className="h-6 w-6" />,
        title: "24/7 Support",
        description: "Round-the-clock customer service and technical support across all our service areas.",
    },
    {
        icon: <BarChart3 className="h-6 w-6" />,
        title: "Analytics Dashboard",
        description: "Comprehensive insights and reporting tools for businesses to optimize their logistics operations.",
    },
]

// Key benefits data
const keyBenefits = [
    {
        title: "Nationwide Coverage",
        description: "Serving 30+ cities across East Africa with plans for continental expansion.",
        stat: "30+",
        label: "Cities",
    },
    {
        title: "Reliable Network",
        description: "10,000+ active agents ensuring consistent and dependable delivery services.",
        stat: "10K+",
        label: "Agents",
    },
    {
        title: "Success Rate",
        description: "99.5% successful delivery rate with industry-leading customer satisfaction.",
        stat: "99.5%",
        label: "Success",
    },
    {
        title: "Fast Delivery",
        description: "Average delivery time of 24-48 hours for domestic shipments.",
        stat: "24-48h",
        label: "Delivery",
    },
]

export default function FeaturesPage() {
    // Refs for triggering animations when in view
    const heroRef = useRef(null)
    const dashboardRef = useRef(null)
    const mobileAppRef = useRef(null)
    const featuresRef = useRef(null)
    const benefitsRef = useRef(null)
    const ctaRef = useRef(null)

    const isHeroInView = useInView(heroRef, { once: true, amount: 0.2 })
    const isDashboardInView = useInView(dashboardRef, { once: true, amount: 0.2 })
    const isMobileAppInView = useInView(mobileAppRef, { once: true, amount: 0.2 })
    const isFeaturesInView = useInView(featuresRef, { once: true, amount: 0.1 })
    const isBenefitsInView = useInView(benefitsRef, { once: true, amount: 0.1 })
    const isCtaInView = useInView(ctaRef, { once: true, amount: 0.5 })

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <SiteNavbar />
            <main className="flex-1">
                {/* Hero Section with Dashboard */}
                <section className="py-20 md:py-32 lg:py-40 bg-white" ref={heroRef}>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            {/* Hero Content */}
                            <div className="text-center mb-16">
                                <motion.h1
                                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-8 leading-tight"
                                    variants={scaleUp}
                                    initial="hidden"
                                    animate={isHeroInView ? "visible" : "hidden"}
                                >
                                    Smart Tools for <span className="text-[#FFD428]">Smarter Logistics</span>
                                </motion.h1>

                                <motion.p
                                    className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed"
                                    variants={fadeUpDelayed(0.2)}
                                    initial="hidden"
                                    animate={isHeroInView ? "visible" : "hidden"}
                                >
                                    Explore the powerful features that make MySafari the ultimate solution for efficient, transparent, and
                                    hassle-free parcel delivery across East Africa.
                                </motion.p>
                            </div>

                            {/* Dashboard Mockup in Hero */}
                            <motion.div
                                className="relative max-w-6xl mx-auto"
                                variants={fadeUp}
                                initial="hidden"
                                animate={isHeroInView ? "visible" : "hidden"}
                            >
                                {/* Main Dashboard Container */}
                                <div className="relative">
                                    {/* Laptop Frame */}
                                    <div className="bg-gray-800 rounded-t-[var(--ds-radius-large)] p-4 shadow-[var(--ds-shadow-raised)]">
                                        {/* Laptop Screen */}
                                        <div className="bg-white rounded-lg overflow-hidden">
                                            {/* Browser Bar */}
                                            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b">
                                                <div className="flex gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                                </div>
                                                <div className="flex-1 bg-white rounded-md px-3 py-1 mx-4">
                                                    <span className="text-gray-500 text-sm">mysafari.co.tz/dashboard</span>
                                                </div>
                                            </div>

                                            {/* Dashboard Content */}
                                            <div className="h-[400px] md:h-[500px] lg:h-[600px] relative overflow-hidden bg-gray-50">
                                                {/* Dashboard Header */}
                                                <div className="bg-white p-6 border-b border-gray-200 shadow-[var(--ds-shadow-raised)]">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-[#FFD428] rounded-[var(--ds-radius-small)] flex items-center justify-center shadow-[var(--ds-shadow-raised)]">
                                                                <Package className="h-6 w-6 text-[#242a37]" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-bold text-gray-900">MySafari Dashboard</h3>
                                                                <p className="text-sm text-gray-600">Logistics Management System</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                                <span className="text-sm text-gray-600 font-medium">Live</span>
                                                            </div>
                                                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Main Dashboard Content */}
                                                <div className="p-6 space-y-6">
                                                    {/* Stats Overview */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {[
                                                            { label: "Active Orders", value: "247", change: "+12%", color: "blue" },
                                                            { label: "Delivered Today", value: "89", change: "+8%", color: "green" },
                                                            { label: "In Transit", value: "158", change: "+5%", color: "yellow" },
                                                            { label: "Revenue", value: "₦2.4M", change: "+15%", color: "purple" },
                                                        ].map((stat, index) => (
                                                            <div key={index} className="bg-white rounded-[var(--ds-radius-small)] p-4 shadow-[var(--ds-shadow-raised)] border border-gray-100">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div
                                                                        className={`w-3 h-3 rounded-full ${
                                                                            stat.color === "blue"
                                                                                ? "bg-blue-500"
                                                                                : stat.color === "green"
                                                                                    ? "bg-green-500"
                                                                                    : stat.color === "yellow"
                                                                                        ? "bg-yellow-500"
                                                                                        : "bg-purple-500"
                                                                        }`}
                                                                    ></div>
                                                                    <span className="text-xs text-green-600 font-medium">{stat.change}</span>
                                                                </div>
                                                                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                                                <div className="text-sm text-gray-600">{stat.label}</div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Main Content Grid */}
                                                    <div className="grid lg:grid-cols-3 gap-6">
                                                        {/* Map Section */}
                                                        <div className="lg:col-span-2 bg-white rounded-[var(--ds-radius-large)] p-6 shadow-[var(--ds-shadow-raised)] border border-gray-100">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="font-semibold text-gray-900">Live Tracking</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                                    <span className="text-xs text-gray-600">247 active shipments</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-64 bg-blue-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                                                                {/* Map Placeholder with Routes */}
                                                                <div className="absolute inset-0 opacity-20">
                                                                    <svg className="w-full h-full" viewBox="0 0 400 250">
                                                                        <path
                                                                            d="M50,50 Q150,20 250,80 T350,120"
                                                                            stroke="#FFD428"
                                                                            strokeWidth="3"
                                                                            fill="none"
                                                                            strokeDasharray="5,5"
                                                                        >
                                                                            <animate
                                                                                attributeName="stroke-dashoffset"
                                                                                values="0;-10"
                                                                                dur="1s"
                                                                                repeatCount="indefinite"
                                                                            />
                                                                        </path>
                                                                        <path
                                                                            d="M80,180 Q180,150 280,190"
                                                                            stroke="#10b981"
                                                                            strokeWidth="3"
                                                                            fill="none"
                                                                            strokeDasharray="5,5"
                                                                        >
                                                                            <animate
                                                                                attributeName="stroke-dashoffset"
                                                                                values="0;-10"
                                                                                dur="1.5s"
                                                                                repeatCount="indefinite"
                                                                            />
                                                                        </path>
                                                                    </svg>
                                                                </div>
                                                                <div className="text-center z-10">
                                                                    <MapPin className="h-12 w-12 text-[#FFD428] mx-auto mb-3" />
                                                                    <span className="text-lg font-semibold text-gray-700">Interactive Map View</span>
                                                                    <p className="text-sm text-gray-500 mt-1">Real-time package tracking</p>
                                                                </div>
                                                                {/* Floating Location Pins */}
                                                                <div className="absolute top-4 left-8 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                                                                <div
                                                                    className="absolute bottom-8 right-12 w-3 h-3 bg-green-500 rounded-full animate-ping"
                                                                    style={{ animationDelay: "0.5s" }}
                                                                ></div>
                                                                <div
                                                                    className="absolute top-16 right-8 w-3 h-3 bg-blue-500 rounded-full animate-ping"
                                                                    style={{ animationDelay: "1s" }}
                                                                ></div>
                                                            </div>
                                                        </div>

                                                        {/* Recent Activity */}
                                                        <div className="bg-white rounded-[var(--ds-radius-large)] p-6 shadow-[var(--ds-shadow-raised)] border border-gray-100">
                                                            <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
                                                            <div className="space-y-4">
                                                                {[
                                                                    { action: "Package delivered", time: "2 min ago", status: "success", id: "#MS12345" },
                                                                    { action: "New order created", time: "5 min ago", status: "info", id: "#MS12346" },
                                                                    { action: "Agent checked in", time: "8 min ago", status: "success", id: "John Doe" },
                                                                    { action: "Route optimized", time: "12 min ago", status: "warning", id: "Route A-5" },
                                                                ].map((activity, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        <div
                                                                            className={`w-2 h-2 rounded-full mt-2 ${
                                                                                activity.status === "success"
                                                                                    ? "bg-green-400"
                                                                                    : activity.status === "info"
                                                                                        ? "bg-blue-400"
                                                                                        : "bg-yellow-400"
                                                                            }`}
                                                                        ></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                                                                            <div className="text-xs text-gray-500 mt-1">{activity.id}</div>
                                                                            <div className="text-xs text-gray-400">{activity.time}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions Bar */}
                                                    <div className="bg-white rounded-[var(--ds-radius-small)] p-4 shadow-[var(--ds-shadow-raised)] border border-gray-100">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-semibold text-gray-900">Quick Actions</h4>
                                                            <div className="flex gap-2">
                                                                {["Create Shipment", "Track Package", "Generate Report", "Manage Agents"].map(
                                                                    (action, index) => (
                                                                        <button
                                                                            key={index}
                                                                            className="px-4 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                                                        >
                                                                            {action}
                                                                        </button>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Laptop Base */}
                                    <div className="bg-gray-300 h-6 rounded-b-[var(--ds-radius-small)] relative">
                                        <div className="absolute inset-x-0 top-2 h-1 bg-gray-500 rounded-full mx-auto w-16"></div>
                                    </div>
                                </div>

                                {/* Floating Elements */}
                                <motion.div
                                    className="absolute -top-4 -right-4 bg-white rounded-[var(--ds-radius-large)] p-4 shadow-[var(--ds-shadow-raised)] border border-gray-200 hidden lg:block"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">Package Delivered</div>
                                            <div className="text-xs text-gray-600">Order #MS12345 • Just now</div>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    className="absolute -bottom-4 -left-4 bg-white rounded-[var(--ds-radius-large)] p-4 shadow-[var(--ds-shadow-raised)] border border-gray-200 hidden lg:block"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                    transition={{ delay: 0.7, duration: 0.8 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <MapPin className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">Live Tracking</div>
                                            <div className="text-xs text-gray-600">247 active shipments</div>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    className="absolute top-1/2 -left-8 bg-white rounded-[var(--ds-radius-large)] p-3 shadow-[var(--ds-shadow-raised)] border border-gray-200 hidden xl:block"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isHeroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                                    transition={{ delay: 0.9, duration: 0.8 }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                            <Package className="h-5 w-5 text-yellow-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">New Order</div>
                                            <div className="text-xs text-gray-600">#MS12347</div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Mobile App Download Section - Footer Style */}
                <section className="bg-[#242a37] py-16 md:py-20" ref={mobileAppRef}>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-6xl mx-auto">
                            {/* Header */}
                            <motion.div
                                className="text-center mb-12 md:mb-16"
                                variants={fadeUp}
                                initial="hidden"
                                animate={isMobileAppInView ? "visible" : "hidden"}
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD428]/10 mb-6 border border-[#FFD428]/20">
                                    <Smartphone className="h-5 w-5 text-[#FFD428]" />
                                    <span className="text-sm font-medium text-[#FFD428]">Mobile Apps</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                                    Download Our <span className="text-[#FFD428]">Mobile Apps</span>
                                </h2>
                                <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                                    Get the MySafari mobile apps for seamless package management, real-time tracking, and efficient
                                    delivery coordination on the go.
                                </p>
                            </motion.div>

                            {/* Main Content Grid */}
                            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">
                                {/* Left Content - App Info */}
                                <motion.div
                                    variants={slideInLeft}
                                    initial="hidden"
                                    animate={isMobileAppInView ? "visible" : "hidden"}
                                    className="text-white"
                                >
                                    <h3 className="text-2xl md:text-3xl font-bold mb-6 text-white">Everything You Need in Your Pocket</h3>

                                    <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                                        Our mobile apps are designed for delivery agents, businesses, and customers. Track packages, manage
                                        routes, coordinate deliveries, and access real-time analytics from anywhere across East Africa.
                                    </p>

                                    {/* App Features */}
                                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                                        {[
                                            { icon: <MapPin className="h-5 w-5" />, text: "Real-time GPS tracking" },
                                            { icon: <Package className="h-5 w-5" />, text: "Package management" },
                                            { icon: <BarChart3 className="h-5 w-5" />, text: "Performance analytics" },
                                            { icon: <Shield className="h-5 w-5" />, text: "Secure transactions" },
                                        ].map((feature, index) => (
                                            <motion.div
                                                key={index}
                                                className="flex items-center gap-3"
                                                variants={fadeUpDelayed(0.1 * index)}
                                                initial="hidden"
                                                animate={isMobileAppInView ? "visible" : "hidden"}
                                            >
                                                <div className="p-2 rounded-lg bg-[#FFD428]/10 text-[#FFD428] flex-shrink-0">
                                                    {feature.icon}
                                                </div>
                                                <span className="text-gray-300">{feature.text}</span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* App Stats */}
                                    <motion.div
                                        className="flex flex-wrap gap-8 pt-6 border-t border-white/10"
                                        variants={fadeUpDelayed(0.5)}
                                        initial="hidden"
                                        animate={isMobileAppInView ? "visible" : "hidden"}
                                    >
                                        {[
                                            { stat: "50K+", label: "Downloads" },
                                            { stat: "4.8★", label: "App Rating" },
                                            { stat: "10K+", label: "Active Users" },
                                        ].map((item, index) => (
                                            <div key={index} className="text-center">
                                                <div className="text-2xl font-bold text-[#FFD428]">{item.stat}</div>
                                                <div className="text-sm text-gray-400">{item.label}</div>
                                            </div>
                                        ))}
                                    </motion.div>
                                </motion.div>

                                {/* Right Content - Phone Mockup */}
                                <motion.div
                                    className="relative"
                                    variants={slideInRight}
                                    initial="hidden"
                                    animate={isMobileAppInView ? "visible" : "hidden"}
                                >
                                    <div className="relative max-w-sm mx-auto">
                                        {/* iPhone Frame */}
                                        <div className="relative">
                                            {/* Phone Shadow */}
                                            <div className="hidden"></div>

                                            {/* Phone Body */}
                                            <div className="relative bg-black rounded-[var(--ds-radius-large)] p-2 shadow-[var(--ds-shadow-raised)]">
                                                {/* Screen */}
                                                <div className="bg-white rounded-[var(--ds-radius-large)] overflow-hidden relative">
                                                    {/* Dynamic Island */}
                                                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-full z-20"></div>

                                                    {/* Screen Content */}
                                                    <div className="h-[640px] bg-gray-50 relative overflow-hidden">
                                                        {/* Status Bar */}
                                                        <div className="flex justify-between items-center px-8 pt-12 pb-4 text-black text-sm font-medium">
                                                            <span>9:41</span>
                                                            <div className="flex items-center gap-1">
                                                                <div className="flex gap-1">
                                                                    <div className="w-1 h-3 bg-black rounded-full"></div>
                                                                    <div className="w-1 h-3 bg-black rounded-full"></div>
                                                                    <div className="w-1 h-3 bg-black/30 rounded-full"></div>
                                                                    <div className="w-1 h-3 bg-black/30 rounded-full"></div>
                                                                </div>
                                                                <svg className="w-6 h-4 ml-1" viewBox="0 0 24 16" fill="none">
                                                                    <rect
                                                                        x="1"
                                                                        y="4"
                                                                        width="21"
                                                                        height="8"
                                                                        rx="2"
                                                                        stroke="black"
                                                                        strokeWidth="1"
                                                                        fill="none"
                                                                    />
                                                                    <rect x="2" y="5" width="16" height="6" rx="1" fill="black" />
                                                                    <rect x="22" y="6" width="1" height="4" rx="0.5" fill="black" />
                                                                </svg>
                                                            </div>
                                                        </div>

                                                        {/* App Header */}
                                                        <div className="px-6 pb-6">
                                                            <div className="flex items-center justify-between mb-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-[#FFD428] rounded-[var(--ds-radius-small)] flex items-center justify-center shadow-[var(--ds-shadow-raised)]">
                                                                        <Package className="h-6 w-6 text-[#242a37]" />
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="text-gray-900 font-bold text-lg">MySafari Agent</h3>
                                                                        <p className="text-gray-500 text-sm">Good morning, John!</p>
                                                                    </div>
                                                                </div>
                                                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[var(--ds-shadow-raised)]"></div>
                                                            </div>

                                                            {/* Today's Summary Card */}
                                                            <div className="bg-white rounded-[var(--ds-radius-large)] p-5 shadow-[var(--ds-shadow-raised)] border border-gray-100 mb-6">
                                                                <h4 className="text-gray-900 font-semibold mb-4 text-base">Today's Summary</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                    <div className="text-center">
                                                                        <div className="text-2xl font-bold text-[#FFD428] mb-1">12</div>
                                                                        <div className="text-xs text-gray-500 font-medium">Deliveries</div>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-2xl font-bold text-green-500 mb-1">8</div>
                                                                        <div className="text-xs text-gray-500 font-medium">Completed</div>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-2xl font-bold text-blue-500 mb-1">4</div>
                                                                        <div className="text-xs text-gray-500 font-medium">Pending</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Active Delivery Card */}
                                                            <div className="bg-[#FFD428]/10 border border-[#FFD428]/20 rounded-[var(--ds-radius-large)] p-5 mb-6">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="text-gray-900 font-semibold text-base">Active Delivery</h4>
                                                                    <span className="text-xs text-[#FFD428] bg-[#FFD428]/20 px-3 py-1 rounded-full font-medium">
                                    In Transit
                                  </span>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900 mb-1">Package #MS12345</div>
                                                                        <div className="text-xs text-gray-600 flex items-center gap-2">
                                                                            <MapPin className="h-3 w-3" />
                                                                            Dar es Salaam → Arusha
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                                        <div className="bg-[#FFD428] h-2 rounded-full w-3/4 relative">
                                                                            <div className="absolute right-0 top-0 w-2 h-2 bg-[#FFD428] rounded-full transform translate-x-1"></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">ETA: 2 hours 15 minutes</div>
                                                                </div>
                                                            </div>

                                                            {/* Quick Actions Grid */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {[
                                                                    { icon: <Package className="h-5 w-5" />, label: "New Pickup", color: "blue" },
                                                                    { icon: <MapPin className="h-5 w-5" />, label: "Navigate", color: "green" },
                                                                    { icon: <BarChart3 className="h-5 w-5" />, label: "Earnings", color: "purple" },
                                                                    { icon: <Clock className="h-5 w-5" />, label: "History", color: "gray" },
                                                                ].map((action, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="bg-white rounded-[var(--ds-radius-small)] p-4 shadow-[var(--ds-shadow-raised)] border border-gray-100 flex flex-col items-center gap-2 transition-shadow"
                                                                    >
                                                                        <div
                                                                            className={`p-2 rounded-lg ${
                                                                                action.color === "blue"
                                                                                    ? "bg-blue-100 text-blue-600"
                                                                                    : action.color === "green"
                                                                                        ? "bg-green-100 text-green-600"
                                                                                        : action.color === "purple"
                                                                                            ? "bg-purple-100 text-purple-600"
                                                                                            : "bg-gray-100 text-gray-600"
                                                                            }`}
                                                                        >
                                                                            {action.icon}
                                                                        </div>
                                                                        <span className="text-xs text-gray-700 font-medium text-center">
                                      {action.label}
                                    </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Bottom Navigation */}
                                                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4">
                                                            <div className="flex justify-around">
                                                                {[
                                                                    { icon: <Package className="h-5 w-5" />, active: true },
                                                                    { icon: <MapPin className="h-5 w-5" />, active: false },
                                                                    { icon: <BarChart3 className="h-5 w-5" />, active: false },
                                                                    { icon: <Clock className="h-5 w-5" />, active: false },
                                                                ].map((nav, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className={`p-3 rounded-[var(--ds-radius-small)] transition-colors ${
                                                                            nav.active ? "bg-[#FFD428] text-[#242a37] shadow-[var(--ds-shadow-raised)]" : "text-gray-400"
                                                                        }`}
                                                                    >
                                                                        {nav.icon}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Home Indicator */}
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Floating Notification Cards */}
                                        <motion.div
                                            className="absolute -top-4 -left-4 bg-white rounded-[var(--ds-radius-large)] p-3 shadow-[var(--ds-shadow-raised)] border border-gray-200 max-w-48"
                                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                            animate={isMobileAppInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
                                            transition={{ delay: 0.8, duration: 0.5 }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">Package Delivered</div>
                                                    <div className="text-xs text-gray-600">#MS12344 • 2 min ago</div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            className="absolute -bottom-4 -right-4 bg-white rounded-[var(--ds-radius-large)] p-3 shadow-[var(--ds-shadow-raised)] border border-gray-200 max-w-48"
                                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                            animate={isMobileAppInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
                                            transition={{ delay: 1, duration: 0.5 }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <MapPin className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">New Pickup</div>
                                                    <div className="text-xs text-gray-600">0.5 km away • Now</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Download Buttons Section - Footer Style */}
                            <motion.div
                                className="border-t border-white/10 pt-12"
                                variants={fadeUpDelayed(0.6)}
                                initial="hidden"
                                animate={isMobileAppInView ? "visible" : "hidden"}
                            >
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Download the MySafari Agent App</h3>
                                    <p className="text-gray-300 max-w-2xl mx-auto">
                                        Available for both iOS and Android. Start managing your deliveries more efficiently today.
                                    </p>
                                </div>

                                {/* Download Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
                                    <Button
                                        size="lg"
                                        className="bg-[#FFD428] text-[#242a37] hover:bg-[#e0b800] h-16 px-6 text-base flex gap-3 items-center transition-colors duration-300 shadow-[var(--ds-shadow-raised)] w-full sm:w-auto"
                                        asChild
                                    >
                                        <Link href="https://play.google.com/store/apps/details?id=com.mysafari.parcel&pcampaignid=web_share">
                                            <div className="flex items-center gap-3">
                                                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                                                </svg>
                                                <div className="text-left">
                                                    <div className="text-xs opacity-80">Download on</div>
                                                    <div className="font-bold text-lg">Google Play</div>
                                                </div>
                                            </div>
                                        </Link>
                                    </Button>

                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="bg-transparent text-white hover:bg-white/10 h-16 px-6 text-base flex gap-3 items-center transition-colors duration-300 border-white/30 shadow-[var(--ds-shadow-raised)] w-full sm:w-auto"
                                        asChild
                                    >
                                        <Link href="/download/ios">
                                            <div className="flex items-center gap-3">
                                                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                                                </svg>
                                                <div className="text-left">
                                                    <div className="text-xs opacity-80">Download on</div>
                                                    <div className="font-bold text-lg">App Store</div>
                                                </div>
                                            </div>
                                        </Link>
                                    </Button>
                                </div>

                                {/* Additional Info */}
                                <div className="text-center mt-8 pt-8 border-t border-white/10">
                                    <p className="text-gray-400 text-sm">
                                        Join over 50,000+ users who trust MySafari for their delivery needs
                                    </p>
                                    <div className="flex justify-center items-center gap-6 mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <svg key={star} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                                    </svg>
                                                ))}
                                            </div>
                                            <span className="text-gray-400 text-sm">4.8/5 rating</span>
                                        </div>
                                        <div className="text-gray-400 text-sm">•</div>
                                        <div className="text-gray-400 text-sm">Free to download</div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Features Grid Section */}
                <section className="py-20 md:py-28 bg-gray-50" ref={featuresRef}>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            className="text-center mb-16"
                            variants={fadeUp}
                            initial="hidden"
                            animate={isFeaturesInView ? "visible" : "hidden"}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
                            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                Everything you need to manage, track, and optimize your parcel delivery operations
                            </p>
                        </motion.div>

                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
                            variants={staggerFade}
                            initial="hidden"
                            animate={isFeaturesInView ? "visible" : "hidden"}
                        >
                            {featureHighlights.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    className="group"
                                    variants={staggerFade}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="h-full bg-white rounded-[var(--ds-radius-large)] p-8 shadow-[var(--ds-shadow-raised)] border border-gray-200 hover:border-[#FFD428]/30 transition-colors duration-300">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 rounded-[var(--ds-radius-small)] bg-[#FFD428]/10 text-[#FFD428] group-hover:bg-[#FFD428]/20 transition-colors duration-300">
                                                {feature.icon}
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#FFD428] transition-colors duration-300">
                                                {feature.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-20 md:py-28 bg-white" ref={benefitsRef}>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            className="text-center mb-16"
                            variants={fadeUp}
                            initial="hidden"
                            animate={isBenefitsInView ? "visible" : "hidden"}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose MySafari</h2>
                            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                Industry-leading performance and reliability that businesses across East Africa trust
                            </p>
                        </motion.div>

                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                            variants={staggerFade}
                            initial="hidden"
                            animate={isBenefitsInView ? "visible" : "hidden"}
                        >
                            {keyBenefits.map((benefit, index) => (
                                <motion.div
                                    key={index}
                                    className="text-center group"
                                    variants={staggerFade}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="p-6 rounded-[var(--ds-radius-large)] bg-gray-50 group-hover:bg-[#FFD428]/5 transition-colors duration-300">
                                        <div className="text-3xl md:text-4xl font-bold text-[#FFD428] mb-2">{benefit.stat}</div>
                                        <div className="text-lg font-semibold text-gray-900 mb-1">{benefit.label}</div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">{benefit.title}</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 md:py-28 border-rounded-20px bg-[#FFD428]"  ref={ctaRef}>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            className="max-w-4xl mx-auto text-center"
                            variants={fadeUp}
                            initial="hidden"
                            animate={isCtaInView ? "visible" : "hidden"}
                        >
                            <motion.h2
                                className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#242a37] mb-8"
                                variants={scaleUp}
                                initial="hidden"
                                animate={isCtaInView ? "visible" : "hidden"}
                            >
                                Ready to Experience Smart Logistics?
                            </motion.h2>

                            <motion.p
                                className="text-lg md:text-xl text-[#242a37]/80 mb-12 max-w-3xl mx-auto leading-relaxed"
                                variants={fadeUpDelayed(0.2)}
                                initial="hidden"
                                animate={isCtaInView ? "visible" : "hidden"}
                            >
                                Join thousands of businesses and individuals who trust MySafari for reliable, efficient, and transparent
                                parcel delivery across East Africa.
                            </motion.p>

                            <motion.div
                                className="flex flex-col sm:flex-row gap-4 justify-center"
                                variants={fadeUpDelayed(0.4)}
                                initial="hidden"
                                animate={isCtaInView ? "visible" : "hidden"}
                            >
                                <Button
                                    size="lg"
                                    className="bg-[#242a37] text-white hover:bg-[#333333] h-14 px-8 text-lg group transform transition-colors duration-300 shadow-[var(--ds-shadow-raised)]"
                                    asChild
                                >
                                    <Link href="/register" className="flex items-center gap-2">
                                        Start Shipping Today
                                        <ArrowRight className="h-5 w-5 transition-transform" />
                                    </Link>
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="bg-transparent border-[#242a37] text-[#242a37] hover:bg-[#242a37]/10 h-14 px-8 text-lg transform transition-colors duration-300"
                                    asChild
                                >
                                    <Link href="/demo">Request Demo</Link>
                                </Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
            </main>
            <SiteFooter />
            <FloatingSupport />
        </div>
    )
}
