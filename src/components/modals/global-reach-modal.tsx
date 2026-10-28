"use client"

import React, { useMemo } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Icon } from "@/components/ui/icon"
import { 
    GlobeIcon, 
    ChampionIcon,
    Cancel01Icon,
    ZapIcon,
    Package01Icon
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTr } from "@/lib/i18n/portal"

interface GlobalReachModalProps {
    isOpen: boolean
    onClose: () => void
    countries: any[]
    parcels: any[]
}

export function GlobalReachModal({ isOpen, onClose, countries, parcels }: GlobalReachModalProps) {
    const tr = useTr()
    const totalCountries = 249 // Standard global count approx
    const activeCountries = countries.length
    const coveragePercent = Math.round((activeCountries / totalCountries) * 100)

    // Data Processing
    const reachData = useMemo(() => {
        const countryParcels: Record<number, number> = {}
        parcels.forEach(p => {
            if (p.originId) countryParcels[p.originId] = (countryParcels[p.originId] || 0) + 1
            if (p.destinationId) countryParcels[p.destinationId] = (countryParcels[p.destinationId] || 0) + 1
        })

        const regions: Record<string, { count: number, parcels: number }> = {}
        countries.forEach(c => {
            const reg = c.region || "Global"
            if (!regions[reg]) regions[reg] = { count: 0, parcels: 0 }
            regions[reg].count++
            regions[reg].parcels += (countryParcels[c.id] || 0)
        })

        return Object.entries(regions).map(([name, data]) => ({ 
            name, 
            value: data.count,
            parcels: data.parcels
        }))
    }, [countries, parcels])

    const COLORS = ["#ffd428", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"]

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Market Overview")}</SheetTitle>
                    <SheetDescription>{tr("Network Reach and Global Statistics")}</SheetDescription>
                </SheetHeader>

                <div className="bg-[#242a37] p-5 pt-6 sm:p-8 sm:pt-10 text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center">
                                <Icon icon={GlobeIcon} size={28} className="text-[#ffd428]" />
                            </div>
                            <button onClick={onClose} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0">
                                <Icon icon={Cancel01Icon} size={18} />
                            </button>
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-bold m-0 leading-none">{tr("Market Overview")}</h2>
                            <p className="text-[#ffd428] font-bold text-xs mt-4 opacity-80">{tr("Global Reach & Network Statistics")}</p>
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-12 pb-32">
                        {/* Coverage Stat */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 flex items-center justify-between p-8 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-slate-400">{tr("Market coverage")}</p>
                                    <h3 className="text-5xl font-bold text-[#242a37] dark:text-white leading-none">{coveragePercent}%</h3>
                                    <p className="text-xs text-slate-500 font-bold">{tr("Operating in {activeCountries} countries", { activeCountries })}</p>
                                </div>
                                <div className="size-24 rounded-full border-[8px] border-slate-100 dark:border-white/5 flex items-center justify-center relative shadow-[var(--ds-shadow-raised)]">
                                    <Icon icon={ChampionIcon} size={36} className="text-[#ffd428]" />
                                    <svg className="absolute inset-0 size-full -rotate-90">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="44"
                                            fill="none"
                                            stroke="#ffd428"
                                            strokeWidth="8"
                                            strokeDasharray={276}
                                            strokeDashoffset={276 - (276 * coveragePercent) / 100}
                                            className="transition-all duration-300 ease-out"
                                        />
                                    </svg>
                                </div>
                            </div>
                            
                            <div className="p-8 rounded-[var(--ds-radius-large)] bg-[#ffd428]/5 border border-[#ffd428]/20 flex flex-col justify-center gap-2">
                                <div className="size-10 rounded-[var(--ds-radius-small)] bg-[#ffd428]/10 flex items-center justify-center text-[#ffd428]">
                                    <Icon icon={Package01Icon} size={22} />
                                </div>
                                <h4 className="text-2xl font-bold text-[#242a37] dark:text-white mt-2">{parcels.length}</h4>
                                <p className="text-xs font-semibold text-slate-400 leading-none">{tr("Total Parcels")}</p>
                            </div>
                        </div>

                        {/* Regional Throughput */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-semibold text-slate-400 ml-1">{tr("Volume by Region")}</h4>
                            <div className="bg-white dark:bg-white/[0.01] rounded-[var(--ds-radius-large)] p-8 border border-slate-100 dark:border-white/5 space-y-8">
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={reachData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#ffd428" />
                                                    <stop offset="100%" stopColor="#f59e0b" />
                                                </linearGradient>
                                            </defs>
                                            <XAxis 
                                                dataKey="name" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: '' }}
                                                dy={10}
                                            />
                                            <YAxis hide />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(255, 212, 40, 0.05)' }}
                                                contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#242a37', color: '#fff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '900', textTransform: '', fontSize: '9px', padding: '12px' }}
                                            />
                                            <Bar dataKey="parcels" radius={[6, 6, 0, 0]} barSize={40}>
                                                {reachData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {reachData.map((reg, i) => (
                                        <div key={reg.name} className="p-5 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="text-xs font-semibold text-slate-400 truncate">{reg.name}</span>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <span className="text-lg font-semibold text-[#242a37] dark:text-white leading-none">{reg.parcels}</span>
                                                <Badge className="bg-white dark:bg-white/5 text-[11px] font-semibold px-1.5 py-0">PCS</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-[var(--ds-radius-large)] bg-blue-500/5 border border-blue-500/10 flex items-start gap-6 shadow-[var(--ds-shadow-raised)]">
                            <div className="size-12 rounded-[var(--ds-radius-large)] bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                <Icon icon={ZapIcon} size={24} />
                            </div>
                            <div className="space-y-3">
                                <p className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">{tr("Business Insight")}</p>
                                <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
                                    {[...reachData].sort((a, b) => b.parcels - a.parcels)[0]
                                        ? <>{tr("Most parcels move through")}{" "}<strong>{[...reachData].sort((a, b) => b.parcels - a.parcels)[0].name}</strong>.</>
                                        : tr("No parcel activity recorded yet.")}
                                </p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
