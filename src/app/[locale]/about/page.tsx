"use client"

import Link from "next/link"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import {
  ArrowRight,
  Package,
  MapPin,
  Users,
  Target,
  TrendingUp,
  Shield,
  Heart,
  Zap,
  CheckCircle,
  Globe,
} from "lucide-react"
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
      staggerChildren: 0.15,
    },
  },
}

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
}

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
}

const scaleUp = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" } },
}

// Stats data
const stats = [
  {
    icon: <Package className="h-8 w-8" />,
    number: "2M+",
    label: "Parcels Delivered",
    description: "Across East Africa",
  },
  {
    icon: <MapPin className="h-8 w-8" />,
    number: "50+",
    label: "Cities Connected",
    description: "And growing rapidly",
  },
  {
    icon: <Users className="h-8 w-8" />,
    number: "10K+",
    label: "Active Agents",
    description: "Nationwide network",
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    number: "99.5%",
    label: "Success Rate",
    description: "Reliable delivery",
  },
]

// Values data
const companyValues = [
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Reliability",
    description: "Every package delivered safely, on time, every time across East Africa.",
  },
  {
    icon: <Heart className="h-8 w-8" />,
    title: "Community Impact",
    description: "Empowering local businesses and connecting communities through seamless logistics.",
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Innovation",
    description: "Leveraging cutting-edge technology to revolutionize parcel delivery in Africa.",
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Excellence",
    description: "Setting the highest standards in logistics and customer service across the continent.",
  },
]

// Features data
const features = [
  {
    title: "Real-time Tracking",
    description: "Monitor your packages every step of the way with our advanced tracking system.",
  },
  {
    title: "Nationwide Network",
    description: "Extensive agent network covering urban and rural areas across East Africa.",
  },
  {
    title: "Secure Delivery",
    description: "End-to-end security ensuring your packages arrive safely and intact.",
  },
  {
    title: "Fast Processing",
    description: "Quick pickup and delivery times with optimized routing technology.",
  },
]

export default function AboutPage() {
  // Refs for triggering animations when in view
  const heroRef = useRef(null)
  const imagesRef = useRef(null)
  const missionRef = useRef(null)
  const statsRef = useRef(null)
  const valuesRef = useRef(null)
  const featuresRef = useRef(null)
  const ctaRef = useRef(null)

  const isHeroInView = useInView(heroRef, { once: true, amount: 0.2 })
  const isImagesInView = useInView(imagesRef, { once: true, amount: 0.2 })
  const isMissionInView = useInView(missionRef, { once: true, amount: 0.2 })
  const isStatsInView = useInView(statsRef, { once: true, amount: 0.2 })
  const isValuesInView = useInView(valuesRef, { once: true, amount: 0.2 })
  const isFeaturesInView = useInView(featuresRef, { once: true, amount: 0.2 })
  const isCtaInView = useInView(ctaRef, { once: true, amount: 0.5 })

  return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteNavbar />
        <main className="flex-1">
          {/* Hero Section - Clean and Minimal */}
          <section className="py-20 md:py-32 lg:py-40 bg-white" ref={heroRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto text-center">
                <motion.h1
                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-8 leading-tight"
                    variants={scaleUp}
                    initial="hidden"
                    animate={isHeroInView ? "visible" : "hidden"}
                >
                  Seamless Connections, <span className="text-[#FFD428]">Smarter </span> Deliveries.
                </motion.h1>

                <motion.p
                    className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed"
                    variants={fadeUpDelayed(0.2)}
                    initial="hidden"
                    animate={isHeroInView ? "visible" : "hidden"}
                >
                  At MySafari Parcel, we're reimagining how parcels move across East Africa.
                  Logistics doesn’t have to be complicated, slow, or costly.
                  That’s why we’ve built a smart, connected platform that brings together cargo owners, delivery agents, and logistics companies — all in one transparent, efficient ecosystem.
                  Whether you're a business or an individual, sending parcels has never been this seamless.
                </motion.p>
              </div>
            </div>
          </section>

          {/* Two Images Section */}
          <section className="py-16 md:py-20 bg-white" ref={imagesRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                  className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto"
                  variants={staggerFade}
                  initial="hidden"
                  animate={isImagesInView ? "visible" : "hidden"}
              >
                {/* Left Image - Delivery Agents */}
                <motion.div
                    className="relative group"
                    variants={slideInLeft}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                >
                  <div className="relative h-[400px] md:h-[500px] rounded-[var(--ds-radius-large)] overflow-hidden shadow-[var(--ds-shadow-raised)]">
                    <img
                        src="/placeholder.svg?height=500&width=600"
                        alt="MySafari delivery agents coordinating deliveries"
                        className="w-full h-full object-cover transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="bg-white rounded-[var(--ds-radius-small)] p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Our Agent Network</h3>
                        <p className="text-gray-600 text-sm">
                          Professional delivery agents equipped with modern tools and training across East Africa.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Image - Platform Dashboard */}
                <motion.div
                    className="relative group"
                    variants={slideInRight}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                >
                  <div className="relative h-[400px] md:h-[500px] rounded-[var(--ds-radius-large)] overflow-hidden shadow-[var(--ds-shadow-raised)]">
                    <img
                        src="/placeholder.svg?height=500&width=600"
                        alt="MySafari platform dashboard interface"
                        className="w-full h-full object-cover transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="bg-white rounded-[var(--ds-radius-small)] p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Platform</h3>
                        <p className="text-gray-600 text-sm">
                          Intuitive dashboard providing real-time tracking, analytics, and seamless logistics management.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="py-20 md:py-28 bg-gray-50" ref={missionRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center">
                <motion.div variants={fadeUp} initial="hidden" animate={isMissionInView ? "visible" : "hidden"}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD428]/10 mb-8 border border-[#FFD428]/20">
                    <Target className="h-5 w-5 text-[#FFD428]" />
                    <span className="text-sm font-medium text-[#FFD428]">Our Mission</span>
                  </div>
                </motion.div>

                <motion.h2
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8"
                    variants={fadeUpDelayed(0.1)}
                    initial="hidden"
                    animate={isMissionInView ? "visible" : "hidden"}
                >
                  Connecting East Africa Through Innovation
                </motion.h2>

                <motion.p
                    className="text-lg md:text-xl text-gray-600 mb-12 leading-relaxed"
                    variants={fadeUpDelayed(0.2)}
                    initial="hidden"
                    animate={isMissionInView ? "visible" : "hidden"}
                >
                  We’re redefining parcel delivery across East Africa with a unified, tech-driven platform built for speed, transparency, and scale.
                  By seamlessly connecting businesses, individuals, and logistics providers, we simplify the entire delivery journey—making it more reliable,
                  more affordable, and ready to grow with you.
                </motion.p>

                <motion.div
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                    variants={fadeUpDelayed(0.3)}
                    initial="hidden"
                    animate={isMissionInView ? "visible" : "hidden"}
                >
                  <Button
                      className="bg-[#FFD428] text-[#242a37] hover:bg-[#e0b800] h-10 px-8 text-lg font-semibold group transform transition-colors duration-300 shadow-[var(--ds-shadow-raised)]"
                      asChild
                  >
                    <Link href="/services" className="flex items-center gap-2">
                      Explore Services
                      <ArrowRight className="h-5 w-5 transition-transform" />
                    </Link>
                  </Button>
                  <Button
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-8 text-lg transform transition-colors duration-300"
                      asChild
                  >
                    <Link href="/track">Track Package</Link>
                  </Button>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-20 md:py-28 bg-white" ref={statsRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                  className="text-center mb-16"
                  variants={fadeUp}
                  initial="hidden"
                  animate={isStatsInView ? "visible" : "hidden"}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Impact in Numbers</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Delivering results that matter to businesses and communities across East Africa
                </p>
              </motion.div>

              <motion.div
                  className="grid grid-cols-2 lg:grid-cols-4 gap-8"
                  variants={staggerFade}
                  initial="hidden"
                  animate={isStatsInView ? "visible" : "hidden"}
              >
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        className="text-center group"
                        variants={staggerFade}
                        whileHover={{ scale: 1.05, y: -5 }}
                        transition={{ duration: 0.3 }}
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--ds-radius-large)] bg-[#FFD428]/10 mb-4 group-hover:bg-[#FFD428]/20 transition-colors duration-300">
                        <div className="text-[#FFD428]">{stat.icon}</div>
                      </div>
                      <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.number}</div>
                      <div className="text-lg font-semibold text-gray-700 mb-1">{stat.label}</div>
                      <div className="text-sm text-gray-500">{stat.description}</div>
                    </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Values Section */}
          <section className="py-20 md:py-28 bg-gray-50" ref={valuesRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                  className="text-center mb-16"
                  variants={fadeUp}
                  initial="hidden"
                  animate={isValuesInView ? "visible" : "hidden"}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD428]/10 mb-8 border border-[#FFD428]/20">
                  <Heart className="h-5 w-5 text-[#FFD428]" />
                  <span className="text-sm font-medium text-[#FFD428]">Our Values</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Drives Us Forward</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  The principles that guide our mission to transform logistics across Africa
                </p>
              </motion.div>

              <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
                  variants={staggerFade}
                  initial="hidden"
                  animate={isValuesInView ? "visible" : "hidden"}
              >
                {companyValues.map((value, index) => (
                    <motion.div
                        key={index}
                        className="group"
                        variants={staggerFade}
                        whileHover={{ scale: 1.02, y: -5 }}
                        transition={{ duration: 0.3 }}
                    >
                      <div className="h-full rounded-[var(--ds-radius-large)] p-8 bg-white border border-gray-200 hover:border-[#FFD428]/30 transition-colors duration-300">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="p-3 rounded-[var(--ds-radius-small)] bg-[#FFD428]/10 text-[#FFD428] group-hover:bg-[#FFD428]/20 transition-colors duration-300">
                            {value.icon}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#FFD428] transition-colors duration-300">
                            {value.title}
                          </h3>
                        </div>
                        <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed">
                          {value.description}
                        </p>
                      </div>
                    </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 md:py-28 bg-white" ref={featuresRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                  className="text-center mb-16"
                  variants={fadeUp}
                  initial="hidden"
                  animate={isFeaturesInView ? "visible" : "hidden"}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose MySafari</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Advanced features designed to make your logistics experience seamless and reliable
                </p>
              </motion.div>

              <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                  variants={staggerFade}
                  initial="hidden"
                  animate={isFeaturesInView ? "visible" : "hidden"}
              >
                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        className="text-center group"
                        variants={staggerFade}
                        whileHover={{ scale: 1.05, y: -5 }}
                        transition={{ duration: 0.3 }}
                    >
                      <div className="p-6 rounded-[var(--ds-radius-large)] bg-gray-50 group-hover:bg-[#FFD428]/5 transition-colors duration-300">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--ds-radius-small)] bg-[#FFD428]/10 mb-4 group-hover:bg-[#FFD428]/20 transition-colors duration-300">
                          <CheckCircle className="h-6 w-6 text-[#FFD428]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 md:py-28 bg-[#FFD428]" ref={ctaRef}>
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
                  Ready to Transform Your Logistics?
                </motion.h2>

                <motion.p
                    className="text-lg md:text-xl text-[#242a37]/80 mb-12 max-w-3xl mx-auto leading-relaxed"
                    variants={fadeUpDelayed(0.2)}
                    initial="hidden"
                    animate={isCtaInView ? "visible" : "hidden"}
                >
                  Join thousands of businesses and individuals who trust MySafari for reliable parcel delivery across East
                  Africa. Experience the future of logistics today.
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
                      Get Started Today
                      <ArrowRight className="h-5 w-5 transition-transform" />
                    </Link>
                  </Button>
                  <Button
                      size="lg"
                      variant="outline"
                      className="bg-transparent border-[#242a37] text-[#242a37] hover:bg-[#242a37]/10 h-14 px-8 text-lg transform transition-colors duration-300"
                      asChild
                  >
                    <Link href="/contact">Contact Us</Link>
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
