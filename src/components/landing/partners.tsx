"use client"

import { motion } from "framer-motion"
import { useRef } from "react"
import { useInView } from "framer-motion"

const partners: { name: string; logo: string; darkLogo?: string; lightLogo?: string; alt: string; wide?: boolean }[] = [
    {
        name: "TABOA",
        logo: "/logos/taboa.png",
        // White artwork: navy copy for light backgrounds
        lightLogo: "/logos/taboa-light.png",
        alt: "Tanzania Bus Owners Association",
    },
    {
        name: "Jubilee",
        logo: "/logos/jubilee.png",
        alt: "Jubilee Insurance Tanzania",
    },
    {
        name: "TCRA",
        logo: "/logos/tcra.png",
        alt: "Tanzania Communication Regulatory Authority",
    },
    {
        name: "CityBoy",
        logo: "/logos/cityboy.png",
        lightLogo: "/logos/cityboy-light.png",
        alt: "City Boy Express",
    },
    {
        name: "Hai",
        logo: "/logos/hai.png",
        alt: "Hai Travellers",
    },
    {
        name: "Sama",
        logo: "/logos/sama.png",
        alt: "Sama Luxury Coach",
    },
    {
        name: "Al-Saedy",
        logo: "/logos/alsaedy.png",
        alt: "Al-Saedy High Class",
        // Long wordmark: allow more width so it isn't tiny
        wide: true,
    },    {
        name: "CMMD",
        logo: "/logos/cmmd.png",
        alt: "Chama cha Mawakala na Makarani wa Mabasi, Dar es Salaam",
    },
]

// Animation variants for Framer Motion
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
}

const fadeUpDelayed = (delay: number) => ({
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "easeOut" as const, delay },
    },
})

interface PartnersProps {
    variant?: "light" | "dark"
}

// How many times the logo list repeats in each half of the strip, so a half
// is always wider than the widest screen and the loop never shows a gap
const REPEAT = 3

export function Partners({ variant = "light" }: PartnersProps) {
    const partnersRef = useRef(null)
    const isPartnersInView = useInView(partnersRef, { once: true, amount: 0.2 })
    const isDark = variant === "dark"
    const fadeColor = isDark ? "#1a1f2a" : "#ffffff"
    const half = Array.from({ length: REPEAT }, () => partners).flat()

    return (
        <div className="relative z-10 w-full px-4" ref={partnersRef}>
            <motion.p
                className={`mb-5 text-center text-xs font-semibold ${isDark ? "text-white/40" : "text-slate-500"}`}
                variants={fadeUp}
                initial="hidden"
                animate={isPartnersInView ? "visible" : "hidden"}
            >
                Trusted by our partners
            </motion.p>

            <div className="relative mx-auto max-w-screen-2xl overflow-hidden">
                <style jsx global>{`
          /* The track holds two identical halves; sliding by exactly one half
             lands on a frame identical to the start, so the loop is seamless. */
          @keyframes partners-marquee {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(-50%, 0, 0); }
          }
          .partners-marquee {
            position: relative;
            width: 100%;
            overflow: hidden;
          }
          .partners-track {
            display: flex;
            width: max-content;
            animation: partners-marquee 45s linear infinite;
          }
          .partners-marquee:hover .partners-track {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .partners-track { animation-duration: 120s; }
          }
          .partner-logo-container {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            /* Spacing lives on every item (not the track) so both halves are equal */
            padding: 0 2.5rem;
            height: 56px;
          }
          .partner-logo-img {
            max-height: 40px;
            max-width: 120px;
            object-fit: contain;
          }
          .partner-logo-img.partner-logo-wide {
            max-width: 180px;
          }
          .partners-marquee::before,
          .partners-marquee::after {
            content: "";
            position: absolute;
            top: 0;
            height: 100%;
            width: 10%;
            z-index: 2;
            pointer-events: none;
          }
          .partners-marquee::before { left: 0; background: linear-gradient(to right, ${fadeColor}, transparent); }
          .partners-marquee::after { right: 0; background: linear-gradient(to left, ${fadeColor}, transparent); }
        `}</style>

                <motion.div
                    className="partners-marquee"
                    variants={fadeUpDelayed(0.3)}
                    initial="hidden"
                    animate={isPartnersInView ? "visible" : "hidden"}
                >
                    <div className="partners-track">
                        {[0, 1].map((copy) =>
                            half.map((partner, index) => (
                                <div key={`${copy}-${index}`} className="partner-logo-container" aria-hidden={copy === 1 || index >= partners.length ? true : undefined}>
                                    <img
                                        src={(isDark ? partner.darkLogo : partner.lightLogo) || partner.logo}
                                        alt={copy === 0 && index < partners.length ? partner.alt : ""}
                                        className={`partner-logo-img${partner.wide ? " partner-logo-wide" : ""}`}
                                    />
                                </div>
                            )),
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
