"use client"

import React from "react"
import { motion } from "framer-motion"
import { Truck, Car, Bus } from "lucide-react"

interface VehicleLoaderProps {
    type?: "truck" | "car" | "bus"
    label?: string
    className?: string
}

export function VehicleLoader({ type = "truck", label = "Loading fleet data...", className = "" }: VehicleLoaderProps) {
    const Icon = type === "truck" ? Truck : type === "car" ? Car : Bus

    return (
        <div className={`flex flex-col items-center justify-center p-8 w-full ${className}`}>
            <div className="relative w-64 h-12 mb-4 overflow-hidden border-b-2 border-slate-200 dark:border-slate-800">
                {/* Road markings */}
                <div className="absolute bottom-0 w-full h-1 flex justify-around opacity-30">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-2 h-full bg-slate-400 dark:bg-slate-600 rounded-full" />
                    ))}
                </div>

                {/* Moving Vehicle */}
                <motion.div
                    initial={{ left: "-15%" }}
                    animate={{ left: "105%" }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute bottom-1 bg-white dark:bg-slate-900 rounded-full p-2 shadow-[var(--ds-shadow-raised)] z-10"
                >
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </motion.div>

                {/* Subtle trail */}
                <motion.div
                    initial={{ left: "-15%", width: 0 }}
                    animate={{ left: "105%", width: "20%" }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute bottom-2 h-0.5 bg-transparent"
                />
            </div>
            
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
            >
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
                    {label}
                </p>
            </motion.div>
        </div>
    )
}
