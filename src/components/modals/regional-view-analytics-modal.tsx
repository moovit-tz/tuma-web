"use client"
import { Icon } from "@/components/ui/icon"
import React, { useState, useMemo } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
    Package01Icon, Search01Icon, ArrowUpRight01Icon, Delete02Icon,
    ChampionIcon, Activity01Icon, MapsIcon
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface RegionalViewAnalyticsModalProps {
    isOpen: boolean
    onClose: () => void
    type: "origin" | "destination" | "needs_visibility"
    data: any[]
    onViewRegion: (region: any) => void
    dateRange: string
}

export function RegionalViewAnalyticsModal({ isOpen, onClose, type, data, onViewRegion, dateRange }: RegionalViewAnalyticsModalProps) {
    const tr = useTr()
    const [search, setSearch] = useState("")

    const config = {
        origin: {
            title: "Regions by parcels sent",
            description: "Every region, ranked by parcels sent from it.",
            icon: ChampionIcon,
            color: "#ffd428",
            metricLabel: "Parcels sent",
            metricKey: "originCount"
        },
        destination: {
            title: "Regions by parcels received",
            description: "Every region, ranked by parcels sent to it.",
            icon: Package01Icon,
            color: "#14b8a6",
            metricLabel: "Parcels received",
            metricKey: "destinationCount"
        },
        needs_visibility: {
            title: "Regions by activity",
            description: "Active regions, quietest first (parcels sent plus received).",
            icon: Activity01Icon,
            color: "#ef4444",
            metricLabel: "Parcels",
            metricKey: "parcelCount"
        }
    }[type]

    // Share of the metric across all regions in the list (not a made-up score)
    const metricTotal = useMemo(
        () => (data ?? []).reduce((acc: number, r: any) => acc + (Number(r[config.metricKey]) || 0), 0),
        [data, config.metricKey],
    )
    const shareOf = (r: any) =>
        metricTotal > 0 ? `${((Number(r[config.metricKey]) || 0) / metricTotal * 100).toFixed(1)}%` : "—"

    const filteredData = useMemo(() => {
        return data.filter(r => 
            r.name.toLowerCase().includes(search.toLowerCase()) || 
            r.countryName?.toLowerCase().includes(search.toLowerCase())
        )
    }, [data, search])

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-[#f1f3f6] dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{config.title}</SheetTitle>
                    <SheetDescription>{config.description}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0 p-5 pt-6 sm:p-8 sm:pt-10">
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="size-12 rounded-[var(--ds-radius-large)] bg-white/5 flex items-center justify-center border border-white/10">
                                <Icon icon={config.icon} size={28} style={{ color: config.color }} />
                            </div>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                            >
                                <Icon icon={Delete02Icon} size={18} />
                            </Button>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">
                                {config.title}
                            </h2>
                            <p className="text-white/40 text-xs font-semibold mt-3 flex items-center gap-2">
                                <Icon icon={MapsIcon} size={12} />{tr("Comprehensive regional audit •")}{" "}{dateRange.replace('_', ' ')}{" "}{tr("logic")}</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-6 bg-white dark:bg-[#1a1f2b] border-b border-slate-100 dark:border-white/5">
                    <div className="relative group">
                        <Icon icon={Search01Icon} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" size={18} />
                        <Input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={tr("FILTER REGIONS BY NAME OR COUNTRY...")}
                            className="h-12 pl-12 bg-slate-50 dark:bg-black/20 border-none rounded-[var(--ds-radius-small)] text-xs font-semibold placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/30 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <ScrollArea className="h-full bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                        <div className="p-6">
                            <div className="rounded-[var(--ds-radius-large)] overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5">
                                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-400">{tr("Region")}</TableHead>
                                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-400 text-right">{config.metricLabel}</TableHead>
                                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-400 text-right">{tr("Share")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData.map((region, i) => (
                                            <TableRow 
                                                key={region.id}
                                                onClick={() => onViewRegion(region)}
                                                className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-white/5"
                                            >
                                                <TableCell className="py-5 px-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-semibold text-[#242a37] dark:text-white leading-none mb-1.5">{region.name}</p>
                                                            <p className="text-xs font-bold text-slate-400 leading-none">{region.countryName}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5 px-6 text-right">
                                                    <p className="text-[13px] font-semibold text-[#242a37] dark:text-white mb-1.5">{region[config.metricKey].toLocaleString()}</p>
                                                                                                    </TableCell>
                                                <TableCell className="py-5 px-6 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <Badge className={cn(
                                                            "border-none text-xs font-mono px-2 py-0.5 rounded-md",
                                                            type === "needs_visibility" ? "bg-rose-500/10 text-rose-500" : "bg-[#ffd428]/10 text-[#242a37] dark:text-[#ffd428]"
                                                        )}>
                                                            {shareOf(region)}
                                                        </Badge>
                                                        <div className="size-5 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mt-2 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">
                                                            <Icon icon={ArrowUpRight01Icon} size={12} />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {filteredData.length === 0 && (
                                    <div className="py-20 text-center">
                                        <div className="size-16 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-4 mx-auto">
                                            <Icon icon={Search01Icon} size={32} className="text-slate-200" />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-400">{tr("No regional matches found for \"{search}\"", { search })}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    )
}
