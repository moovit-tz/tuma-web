"use client"

import Link from "next/link"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { ArrowRight, Sparkles, Building, TrendingUp, Handshake, Globe, Award } from "lucide-react"
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

// Partners data
const partners = [
    {
        name: "TABOA",
        logo: "/logos/taboa.png",
        alt: "Tanzania Bus Owners Association",
        description:
            "Strategic partnership with Tanzania's leading bus owners association to enhance nationwide delivery coverage.",
        category: "Transport",
    },
    {
        name: "Jubilee",
        logo: "/logos/jubilee.png",
        alt: "Jubilee Insurance Tanzania",
        description: "Collaboration with Jubilee Insurance to provide comprehensive coverage for all parcels in transit.",
        category: "Insurance",
    },
    {
        name: "TCRA",
        logo: "/logos/tcra.png",
        alt: "Tanzania Communication Regulatory Authority",
        description: "Working with TCRA to ensure compliance with all communication and technology regulations.",
        category: "Regulatory",
    },
    {
        name: "CityBoy",
        logo: "/logos/cityboy.png",
        alt: "City Boy Express",
        description: "Partnership with City Boy Express to expand our delivery network across urban centers in Tanzania.",
        category: "Transport",
    },
    {
        name: "Hai",
        logo: "/logos/hai.png",
        alt: "Hai Travellers",
        description: "Collaboration with Hai Travellers to enhance our northern Tanzania delivery routes and services.",
        category: "Transport",
    },
    {
        name: "Tanzania Post",
        logo: "/placeholder.svg?height=80&width=160",
        alt: "Tanzania Post",
        description:
            "Strategic alliance with Tanzania Post to leverage their extensive network for last-mile delivery solutions.",
        category: "Logistics",
    },
    {
        name: "Vodacom Tanzania",
        logo: "/placeholder.svg?height=80&width=160",
        alt: "Vodacom Tanzania",
        description:
            "Technology partnership with Vodacom Tanzania to enhance our mobile payment and tracking capabilities.",
        category: "Technology",
    },
    {
        name: "NMB Bank",
        logo: "/placeholder.svg?height=80&width=160",
        alt: "NMB Bank",
        description:
            "Financial partnership with NMB Bank to provide secure payment solutions for our customers and agents.",
        category: "Financial",
    },
]

// Benefits data
const partnershipBenefits = [
    {
        icon: <TrendingUp />,
        title: "Increased Revenue",
        description: "Generate additional income streams through our commission-based partnership model.",
    },
    {
        icon: <Globe />,
        title: "Expanded Reach",
        description: "Access new markets and customer segments through our nationwide delivery network.",
    },
    {
        icon: <Building />,
        title: "Brand Visibility",
        description: "Enhance your brand presence through co-marketing opportunities and shared promotions.",
    },
    {
        icon: <Handshake />,
        title: "Strategic Alliance",
        description: "Benefit from strategic collaboration that drives mutual growth and innovation.",
    },
]

export default function PartnersPage() {
    // Refs for triggering animations when in view
    const headerRef = useRef(null)
    const partnersRef = useRef(null)
    const benefitsRef = useRef(null)
    const testimonialsRef = useRef(null)
    const ctaRef = useRef(null)

    const isHeaderInView = useInView(headerRef, { once: true, amount: 0.2 })
    const isPartnersInView = useInView(partnersRef, { once: true, amount: 0.1 })
    const isBenefitsInView = useInView(benefitsRef, { once: true, amount: 0.2 })
    const isTestimonialsInView = useInView(testimonialsRef, { once: true, amount: 0.2 })
    const isCtaInView = useInView(ctaRef, { once: true, amount: 0.5 })

    return (
        <div className="flex min-h-screen flex-col bg-[#242a37]">
            <SiteNavbar />
            <main className="flex-1">
                {/* Header Section */}
                <section className="relative py-24 md:py-32 overflow-hidden">
                    {/* Background gradient effects */}

                    <div className="container relative z-10" ref={headerRef}>
                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div variants={fadeUp} initial="hidden" animate={isHeaderInView ? "visible" : "hidden"}>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD428]/10 mb-6">
                                    <Sparkles className="h-5 w-5 text-[#FFD428]" />
                                    <span className="text-sm font-medium text-[#FFD428]">Strategic Alliances</span>
                                </div>
                            </motion.div>

                            <motion.h1
                                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
                                variants={fadeUp}
                                initial="hidden"
                                animate={isHeaderInView ? "visible" : "hidden"}
                            >
                                Our Partners & Collaborators
                            </motion.h1>

                            <motion.p
                                className="text-gray-300 text-lg md:text-xl mb-12"
                                variants={fadeUpDelayed(0.2)}
                                initial="hidden"
                                animate={isHeaderInView ? "visible" : "hidden"}
                            >
                                Discover the strategic partnerships that help us deliver exceptional service across Tanzania and beyond.
                            </motion.p>
                        </div>
                    </div>
                </section>

                {/* Partners Grid Section */}
                <section className="py-16 md:py-24 relative overflow-hidden bg-[#242a37]" ref={partnersRef}>
                    <div className="container relative z-10">
                        <motion.div
                            className="text-center mb-16"
                            variants={fadeUp}
                            initial="hidden"
                            animate={isPartnersInView ? "visible" : "hidden"}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Trusted By Industry Leaders</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                We collaborate with leading organizations to enhance our delivery ecosystem and provide better service
                            </p>
                        </motion.div>

                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                            variants={staggerFade}
                            initial="hidden"
                            animate={isPartnersInView ? "visible" : "hidden"}
                        >
                            {partners.map((partner, index) => (
                                <motion.div key={index} className="group" variants={staggerFade}>
                                    <div className="h-full rounded-[var(--ds-radius-large)] overflow-hidden relative border border-white/10 bg-[#333333] p-1">
                                        <div className="h-full rounded-[var(--ds-radius-large)] overflow-hidden bg-[#2a303d] p-6 relative flex flex-col">
                                            <div className="mb-4 flex items-center justify-between">
                                                <div className="h-16 flex items-center">
                                                    <img
                                                        src={partner.logo || "/placeholder.svg"}
                                                        alt={partner.alt}
                                                        className="max-h-12 max-w-[120px] object-contain"
                                                    />
                                                </div>
                                                <div className="px-3 py-1 rounded-full bg-[#FFD428]/10 text-[#FFD428] text-xs font-medium">
                                                    {partner.category}
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">{partner.name}</h3>
                                            <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 flex-grow">
                                                {partner.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Partnership Benefits Section */}
                <section className="py-16 md:py-24 relative overflow-hidden bg-[#1d222b]" ref={benefitsRef}>
                    {/* Background elements */}
                    <div className="absolute top-0 left-0 w-full h-24 bg-[#242a37]" />
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-[#242a37]" />

                    <div className="container relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <motion.div variants={fadeUp} initial="hidden" animate={isBenefitsInView ? "visible" : "hidden"}>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD428]/10 mb-6">
                                    <Sparkles className="h-5 w-5 text-[#FFD428]" />
                                    <span className="text-sm font-medium text-[#FFD428]">Partnership Program</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Why Partner With MySafari Parcel?</h2>
                                <p className="text-gray-300 text-lg mb-8">
                                    Join our network of strategic partners and unlock new opportunities for growth and collaboration. Our
                                    partnership program offers numerous benefits designed to create mutual value and success.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button className="bg-[#FFD428] text-[#242a37] hover:bg-[#e0b800] h-10 px-6" asChild>
                                        <Link href="/contact" className="flex items-center gap-2">
                                            Become a Partner
                                            <ArrowRight className="h-5 w-5" />
                                        </Link>
                                    </Button>
                                </div>
                            </motion.div>

                            <motion.div
                                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                                variants={staggerFade}
                                initial="hidden"
                                animate={isBenefitsInView ? "visible" : "hidden"}
                            >
                                {partnershipBenefits.map((benefit, index) => (
                                    <motion.div key={index} className="group" variants={staggerFade}>
                                        <div className="h-full rounded-[var(--ds-radius-large)] overflow-hidden relative border border-white/10 bg-[#333333] p-1">
                                            <div className="h-full rounded-[var(--ds-radius-large)] overflow-hidden bg-[#2a303d] p-6 relative">
                                                <div className="p-3 rounded-[var(--ds-radius-large)] bg-[#FFD428]/10 inline-block mb-4">
                                                    <div className="h-6 w-6 text-[#FFD428]">{benefit.icon}</div>
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                                                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                                                    {benefit.description}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Testimonials Section */}
                <section className="py-16 md:py-24 relative overflow-hidden bg-[#242a37]" ref={testimonialsRef}>
                    <div className="container relative z-10">
                        <motion.div
                            className="text-center mb-16"
                            variants={fadeUp}
                            initial="hidden"
                            animate={isTestimonialsInView ? "visible" : "hidden"}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD428]/10 mb-6">
                                <Award className="h-5 w-5 text-[#FFD428]" />
                                <span className="text-sm font-medium text-[#FFD428]">Partner Success Stories</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What Our Partners Say</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                Hear from organizations that have experienced the benefits of partnering with MySafari Parcel
                            </p>
                        </motion.div>

                        <motion.div
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                            variants={staggerFade}
                            initial="hidden"
                            animate={isTestimonialsInView ? "visible" : "hidden"}
                        >
                            {[
                                {
                                    quote:
                                        "Our partnership with MySafari Parcel has significantly improved our logistics capabilities and customer satisfaction. Their technology and network are unmatched in Tanzania.",
                                    author: "John Makundi",
                                    role: "Operations Director, CityBoy Express",
                                    image: "/placeholder.svg?height=80&width=80",
                                },
                                {
                                    quote:
                                        "The integration with MySafari Parcel's system was seamless, and the results have been outstanding. We've seen a 30% increase in delivery efficiency since partnering with them.",
                                    author: "Amina Salim",
                                    role: "CEO, Hai Travellers",
                                    image: "/placeholder.svg?height=80&width=80",
                                },
                                {
                                    quote:
                                        "MySafari Parcel's commitment to excellence and innovation makes them an ideal partner. Their team is responsive, professional, and always focused on mutual success.",
                                    author: "Michael Kimaro",
                                    role: "Partnership Manager, Jubilee Insurance",
                                    image: "/placeholder.svg?height=80&width=80",
                                },
                            ].map((testimonial, index) => (
                                <motion.div key={index} className="group" variants={staggerFade}>
                                    <div className="h-full rounded-[var(--ds-radius-large)] overflow-hidden relative border border-white/10 bg-[#333333] p-1">
                                        <div className="h-full rounded-[var(--ds-radius-large)] overflow-hidden bg-[#2a303d] p-8 relative flex flex-col">
                                            <div className="mb-6">
                                                <svg className="h-8 w-8 text-[#FFD428]" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                                </svg>
                                            </div>
                                            <p className="text-gray-300 mb-8 flex-grow">"{testimonial.quote}"</p>
                                            <div className="flex items-center">
                                                <div className="mr-4">
                                                    <img
                                                        src={testimonial.image || "/placeholder.svg"}
                                                        alt={testimonial.author}
                                                        className="h-12 w-12 rounded-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold">{testimonial.author}</h4>
                                                    <p className="text-[#FFD428] text-sm">{testimonial.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 md:py-32 relative overflow-hidden" ref={ctaRef}>
                    <div className="absolute inset-0 bg-[#FFD428]">
                    </div>

                    <div className="container relative">
                        <motion.div
                            className="max-w-3xl mx-auto text-center"
                            variants={fadeUp}
                            initial="hidden"
                            animate={isCtaInView ? "visible" : "hidden"}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#242a37]/10 mb-6">
                                <Handshake className="h-5 w-5 text-[#242a37]" />
                                <span className="text-sm font-medium text-[#242a37]">Let's Collaborate</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-[#242a37] mb-6">
                                Ready to Explore Partnership Opportunities?
                            </h2>
                            <p className="text-xl text-[#242a37]/80 mb-12 max-w-2xl mx-auto">
                                Contact our partnership team today to discuss how we can create value together
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    className="bg-[#242a37] text-white hover:bg-[#333333] h-14 px-8 text-lg group"
                                    asChild
                                >
                                    <Link href="/contact" className="flex items-center gap-2">
                                        Become a Partner
                                        <ArrowRight className="h-5 w-5 transition-transform" />
                                    </Link>
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="bg-transparent border-[#242a37] text-[#242a37] hover:bg-[#242a37]/10 h-14 px-8 text-lg"
                                    asChild
                                >
                                    <Link href="/partners/brochure">Download Partnership Brochure</Link>
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>
            <SiteFooter />
            <FloatingSupport />
        </div>
    )
}
