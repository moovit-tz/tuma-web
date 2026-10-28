import Link from "next/link"
import { MapPin, Mail, Phone, Facebook, XIcon, Instagram, Linkedin } from "lucide-react"

import { Logo } from "@/components/logo"
import { CopyrightFooter } from "@/components/copyright-footer"
import { GooglePlayIcon, AppleIcon } from "@/components/landing/icons"

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.mysafari.parcel&hl=en"

export function SiteFooter() {
    return (
        <div className="bg-white py-12">
            <div className="container mx-auto px-4">
                {/* App download CTA */}
                <div className="mx-auto max-w-full rounded-t-[var(--ds-radius-small)] bg-[#2f3747] py-8">
                    <div className="px-8">
                        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                            <div className="max-w-xl text-center md:text-left">
                                <h3 className="mb-2 text-xl font-bold text-white">Get the MySafari App</h3>
                                <p className="text-sm text-gray-300">
                                    Book, track, and manage your parcels on the go. Download the app for Android or iOS.
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                                <Link
                                    href={PLAY_STORE_URL}
                                    className="flex items-center justify-center gap-2 rounded-full bg-[#FFD428] px-5 py-2.5 text-sm font-semibold text-[#242a37] transition-colors duration-200 hover:bg-[#e6bc00]"
                                >
                                    <GooglePlayIcon className="h-4 w-4" />
                                    Google Play
                                </Link>
                                <Link
                                    href="/download/ios"
                                    className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                                >
                                    <AppleIcon className="h-4 w-4" />
                                    App Store
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main footer content */}
                <footer className="mx-auto max-w-full rounded-b-[var(--ds-radius-small)] bg-[#242a37] text-white">
                    <div className="px-8 py-12">
                        <div className="grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-8">
                            {/* Company info with logo */}
                            <div>
                                <div className="mb-4 w-fit">
                                    <Logo />
                                </div>
                                <p className="mb-6 text-sm leading-relaxed text-gray-300">
                                    Streamline your parcel delivery with our comprehensive management system. Our platform offers reliable
                                    tracking and efficient delivery solutions for businesses and individuals across Tanzania and beyond.
                                </p>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h4 className="mb-4 text-sm font-semibold text-gray-400">Quick Links</h4>
                                <ul className="space-y-2">
                                    {["Track Parcel", "Features", "How It Works", "Partners"].map((item) => (
                                        <li key={item}>
                                            <Link
                                                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                                                className="text-sm text-gray-300 transition-colors duration-200 hover:text-[#FFD428]"
                                            >
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Help & Support */}
                            <div>
                                <h4 className="mb-4 text-sm font-semibold text-gray-400">Help & Support</h4>
                                <ul className="space-y-2">
                                    {[
                                        { label: "Contact Us", href: "/contact-us" },
                                        { label: "Support Center", href: "/support-center" },
                                        { label: "Privacy Policy", href: "/privacy-policy" },
                                        { label: "Terms & Agreement", href: "/terms" },
                                    ].map((item) => (
                                        <li key={item.label}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-gray-300 transition-colors duration-200 hover:text-[#FFD428]"
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Management */}
                            <div>
                                <h4 className="mb-4 text-sm font-semibold text-gray-400">Login</h4>
                                <ul className="space-y-2">
                                    {[
                                        { label: "Login", href: "/login" },
                                        { label: "Agent Network", href: "/agent-network" },
                                    ].map((item) => (
                                        <li key={item.label}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-gray-300 transition-colors duration-200 hover:text-[#FFD428]"
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <h4 className="mb-4 text-sm font-semibold text-gray-400">Contact Us</h4>
                                <div className="space-y-3">
                                    <div className="group flex items-start">
                                        <MapPin className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 transition-colors duration-200 group-hover:text-[#FFD428]" />
                                        <p className="text-sm leading-relaxed text-gray-300 transition-colors duration-200 group-hover:text-white">
                                            5 Hubert Kariuki Street, Dar es Salaam
                                        </p>
                                    </div>

                                    <div className="group flex items-center">
                                        <Phone className="mr-2 h-4 w-4 flex-shrink-0 text-gray-400 transition-colors duration-200 group-hover:text-[#FFD428]" />
                                        <p className="text-sm text-gray-300 transition-colors duration-200 group-hover:text-white">
                                            +255 736 969 594
                                        </p>
                                    </div>

                                    <div className="group flex items-center">
                                        <Mail className="mr-2 h-4 w-4 flex-shrink-0 text-gray-400 transition-colors duration-200 group-hover:text-[#FFD428]" />
                                        <p className="text-sm text-gray-300 transition-colors duration-200 group-hover:text-white">
                                            support@mysafari.co.tz
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Copyright section */}
                    <div className="border-t border-white/10 px-8 py-4">
                        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                            <CopyrightFooter />
                            <div className="flex space-x-4">
                                {[
                                    { icon: Linkedin, href: "#", label: "LinkedIn" },
                                    { icon: Facebook, href: "#", label: "Facebook" },
                                    { icon: XIcon, href: "#", label: "Twitter" },
                                    { icon: Instagram, href: "#", label: "Instagram" },
                                ].map(({ icon: Icon, href, label }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        className="text-gray-400 transition-colors duration-200 hover:text-[#FFD428]"
                                        aria-label={label}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}
