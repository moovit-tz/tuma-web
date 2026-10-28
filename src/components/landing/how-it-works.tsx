"use client"

import Link from "next/link"
import {
  ArrowRight,
  Package,
  MapPin,
  Shield,
  CheckCircle,
  Star,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react"
import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"

// Animation variants for Framer Motion
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

// How It Works steps
const howItWorksSteps = [
  {
    step: "01",
    title: "Book Your Parcel",
    description:
        "Visit any MySafari agent or use our mobile app to book your parcel delivery. Provide pickup and delivery details with instant pricing.",
    icon: Package,
    features: ["Instant booking", "Real-time pricing", "Multiple locations"],
  },
  {
    step: "02",
    title: "Real-time Tracking",
    description:
        "Get instant tracking updates via SMS and app notifications. Monitor your parcel's journey with live GPS tracking.",
    icon: MapPin,
    features: ["Live GPS tracking", "SMS notifications", "Mobile app updates"],
  },
  {
    step: "03",
    title: "Secure Transit",
    description:
        "Your parcel travels through our secure network with insurance coverage and tamper-proof packaging for maximum safety.",
    icon: Shield,
    features: ["Insurance coverage", "Tamper-proof sealing", "Secure network"],
  },
  {
    step: "04",
    title: "Safe Delivery",
    description:
        "Receive notifications when your parcel arrives. Collect from our agent or get it delivered directly to your doorstep.",
    icon: CheckCircle,
    features: ["Doorstep delivery", "Agent pickup", "Delivery confirmation"],
  },
]

// Statistics data
const stats = [
  {
    number: "2M+",
    label: "Parcels Delivered",
    description: "Successfully across East Africa",
    icon: Package,
  },
  {
    number: "99.5%",
    label: "Success Rate",
    description: "Industry-leading delivery success",
    icon: Star,
  },
  {
    number: "30+",
    label: "Cities Connected",
    description: "Expanding network coverage",
    icon: MapPin,
  },
  {
    number: "10K+",
    label: "Active Agents",
    description: "Nationwide delivery network",
    icon: Users,
  },
]

export function HowItWorks() {
  const heroRef = useRef(null)
  const stepsRef = useRef(null)
  const statsRef = useRef(null)
  const ctaRef = useRef(null)

  const isHeroInView = useInView(heroRef, { once: true, amount: 0.2 })
  const isStepsInView = useInView(stepsRef, { once: true, amount: 0.1 })
  const isStatsInView = useInView(statsRef, { once: true, amount: 0.2 })
  const isCtaInView = useInView(ctaRef, { once: true, amount: 0.5 })

  return (
      <section className="relative overflow-hidden bg-[#fafafa] py-20 md:py-28 lg:py-32">
        <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <motion.div
              className="mb-16 text-center md:mb-20"
              ref={heroRef}
              variants={fadeUp}
              initial="hidden"
              animate={isHeroInView ? "visible" : "hidden"}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#242a37]/10 bg-white px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFD428]" />
              <span className="text-sm font-medium text-[#242a37]">How It Works</span>
            </div>

            <h2 className="mb-6 text-4xl font-bold leading-tight text-[#242a37] md:text-5xl lg:text-6xl">
              Simple. Fast. <span className="text-[#e6bc00]">Reliable.</span>
            </h2>

            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-gray-600 md:text-xl">
              Experience seamless parcel delivery with our streamlined process designed for your convenience and peace of
              mind
            </p>
          </motion.div>

          {/* Steps Section */}
          <div ref={stepsRef} className="mb-20 md:mb-28">
            {/* Desktop Layout */}
            <div className="hidden lg:block">
              <motion.div
                  className="relative"
                  variants={staggerFade}
                  initial="hidden"
                  animate={isStepsInView ? "visible" : "hidden"}
              >
                <div className="grid grid-cols-4 gap-6">
                  {howItWorksSteps.map((step) => (
                      <motion.div
                          key={step.step}
                          className="group relative"
                          variants={fadeUp}
                          whileHover={{ y: -6 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <div className="relative z-10 h-full rounded-[var(--ds-radius-large)] border border-gray-200 bg-white p-6 shadow-[var(--ds-shadow-raised)] transition-colors duration-300 hover:border-[#FFD428]/50">
                          {/* Step Number */}
                          <div className="mb-6 flex items-center justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#FFD428]/15">
                              <step.icon className="h-6 w-6 text-[#242a37]" />
                            </div>
                            <span className="text-2xl font-bold text-gray-200">{step.step}</span>
                          </div>

                          <h3 className="mb-3 text-xl font-bold text-[#242a37]">{step.title}</h3>

                          <p className="mb-4 leading-relaxed text-gray-600">{step.description}</p>

                          <ul className="space-y-2">
                            {step.features.map((feature, featureIndex) => (
                                <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="h-1.5 w-1.5 rounded-full bg-[#FFD428]" />
                                  <span>{feature}</span>
                                </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden">
              <motion.div
                  className="space-y-8"
                  variants={staggerFade}
                  initial="hidden"
                  animate={isStepsInView ? "visible" : "hidden"}
              >
                {howItWorksSteps.map((step, index) => (
                    <motion.div
                        key={step.step}
                        className="relative"
                        variants={index % 2 === 0 ? slideInLeft : slideInRight}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#FFD428]/15">
                            <step.icon className="h-7 w-7 text-[#242a37]" />
                          </div>
                        </div>

                        <div className="flex-1 rounded-[var(--ds-radius-large)] border border-gray-200 bg-white p-6 shadow-[var(--ds-shadow-raised)]">
                          <div className="mb-1 text-xs font-semibold text-gray-400">STEP {step.step}</div>
                          <h3 className="mb-3 text-xl font-bold text-[#242a37]">{step.title}</h3>
                          <p className="mb-4 leading-relaxed text-gray-600">{step.description}</p>

                          <ul className="space-y-2">
                            {step.features.map((feature, featureIndex) => (
                                <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="h-1.5 w-1.5 rounded-full bg-[#FFD428]" />
                                  {feature}
                                </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {index < howItWorksSteps.length - 1 && (
                          <div className="my-6 flex justify-center">
                            <div className="h-8 w-0.5 rounded-full bg-gray-200" />
                          </div>
                      )}
                    </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Statistics Section */}
          <motion.div
              ref={statsRef}
              className="mb-20 md:mb-28"
              variants={fadeUp}
              initial="hidden"
              animate={isStatsInView ? "visible" : "hidden"}
          >
            <div className="mb-12 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#242a37]/10 bg-white px-4 py-1.5">
                <TrendingUp className="h-4 w-4 text-[#242a37]" />
                <span className="text-sm font-medium text-[#242a37]">Our Impact</span>
              </div>
              <h3 className="mb-4 text-3xl font-bold text-[#242a37] md:text-4xl">Trusted by Thousands</h3>
              <p className="mx-auto max-w-2xl text-lg text-gray-600">
                Our numbers speak for themselves - delivering excellence across East Africa
              </p>
            </div>

            <motion.div
                className="grid grid-cols-2 gap-6 md:gap-8 lg:grid-cols-4"
                variants={staggerFade}
                initial="hidden"
                animate={isStatsInView ? "visible" : "hidden"}
            >
              {stats.map((stat) => (
                  <motion.div
                      key={stat.label}
                      className="group text-center"
                      variants={staggerFade}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="rounded-[var(--ds-radius-large)] border border-gray-200 bg-white p-6 shadow-[var(--ds-shadow-raised)] transition-colors duration-300 group-hover:border-[#FFD428]/50">
                      <div className="mb-4 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#FFD428]/15">
                          <stat.icon className="h-6 w-6 text-[#242a37]" />
                        </div>
                      </div>

                      <div className="mb-2 text-3xl font-bold text-[#242a37] md:text-4xl">{stat.number}</div>
                      <div className="mb-1 text-lg font-semibold text-[#242a37]">{stat.label}</div>
                      <div className="text-sm text-gray-500">{stat.description}</div>
                    </div>
                  </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
              ref={ctaRef}
              className="relative overflow-hidden rounded-[var(--ds-radius-large)] border border-gray-200 bg-white p-8 text-center shadow-[var(--ds-shadow-raised)] md:p-8"
              variants={fadeUp}
              initial="hidden"
              animate={isCtaInView ? "visible" : "hidden"}
          >

            <motion.div
                className="relative z-10"
                variants={fadeUpDelayed(0.2)}
                initial="hidden"
                animate={isCtaInView ? "visible" : "hidden"}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FFD428]/15 px-4 py-1.5">
                <Clock className="h-4 w-4 text-[#242a37]" />
                <span className="text-sm font-medium text-[#242a37]">Ready to Get Started?</span>
              </div>

              <h3 className="mb-4 text-3xl font-bold text-[#242a37] md:text-4xl">
                Experience the <span className="text-[#e6bc00]">MySafari</span> Difference
              </h3>

              <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-gray-600">
                Join thousands of satisfied customers who trust MySafari for their parcel delivery needs across East
                Africa
              </p>

              <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                    size="lg"
                    className="group h-14 rounded-full bg-[#FFD428] px-8 text-lg font-semibold text-[#242a37] shadow-[var(--ds-shadow-raised)] transition-colors duration-200 hover:bg-[#e6bc00]"
                    asChild
                >
                  <Link href="/tracking" className="flex items-center gap-3">
                    Start Tracking Your Parcel
                    <ArrowRight className="h-5 w-5 transition-transform" />
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 border-t border-gray-100 pt-8">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-[#e6bc00]" />
                  <span>Free tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-[#e6bc00]" />
                  <span>Insurance included</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-[#e6bc00]" />
                  <span>24/7 support</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
  )
}
