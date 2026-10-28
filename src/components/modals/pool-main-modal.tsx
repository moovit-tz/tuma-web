"use client"
import { Icon } from "@/components/ui/icon"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { 
    UserAccountIcon,
    Building03Icon,
    CallIcon,
    Mail01Icon,
    Shield01Icon,
    Money01Icon,
    UserGroupIcon,
    ViewIcon,
    Activity01Icon,
    Calendar03Icon,
    Cancel01Icon,
    InformationCircleIcon,
    Tick01Icon,
    ArrowRight01Icon
} from "@hugeicons/core-free-icons"
import { getPoolMainDetails, getPoolLinkedUsersByMainId, getAgentFloatBalance } from "@/lib/services/user"
import type { User as UserType } from "@/types/user"
import { motion, AnimatePresence } from "framer-motion"
import { TableRowsSkeleton } from "@/components/ui/skeletons"
import { useTr } from "@/lib/i18n/portal"

interface PoolMainModalProps {
    isOpen: boolean
    onClose: () => void
    poolMainUser: UserType | null
    onViewLinkedUser?: (user: UserType) => void
}

export function PoolMainModal({ isOpen, onClose, poolMainUser, onViewLinkedUser }: PoolMainModalProps) {
    const tr = useTr()
    // Fetch pool main details
    const {
        data: poolMainDetails,
        isLoading: isLoadingDetails,
    } = useQuery({
        queryKey: ["pool-main-details", poolMainUser?.id],
        queryFn: () => getPoolMainDetails(poolMainUser!.id),
        enabled: isOpen && !!poolMainUser?.id,
    })

    // Fetch linked users
    const {
        data: linkedUsersData,
        isLoading: isLoadingLinkedUsers,
    } = useQuery({
        queryKey: ["pool-linked-users", poolMainUser?.id],
        queryFn: () => getPoolLinkedUsersByMainId(poolMainUser!.id),
        enabled: isOpen && !!poolMainUser?.id,
    })

    // Fetch pool main float balance
    const { data: floatBalance, isLoading: isLoadingBalance } = useQuery({
        queryKey: ["pool-main-balance", poolMainUser?.id],
        queryFn: () => getAgentFloatBalance(poolMainUser!.id),
        enabled: isOpen && !!poolMainUser?.id,
    })

    const linkedUsers = linkedUsersData?.linkedUsers || []
    const totalLinkedUsers = linkedUsersData?.totalCount || 0

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat("en-TZ", {
            style: "currency",
            currency: "TZS",
            minimumFractionDigits: 0,
        }).format(Number(amount))
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const getStatusColor = (active: boolean) => active ? "bg-emerald-500" : "bg-slate-400"

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    if (!poolMainUser) return null

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="[&>button]:hidden w-full sm:max-w-[1000px] p-0 border-none bg-slate-50 dark:bg-[#0f1218] overflow-hidden flex flex-col">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Pool Main Details")}</SheetTitle>
                    <SheetDescription>{tr("Linked agents and pool balance.")}</SheetDescription>
                </SheetHeader>
                {/* Tactical Header: Brand Standard */}
                <div className="text-white relative p-8 bg-[#242a37] border-b border-white/10 overflow-hidden">
                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <Avatar className="size-20 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border-4 border-white dark:border-[#242a37]">
                                    <AvatarFallback className="bg-slate-900 text-white font-semibold text-xl">
                                        {getInitials(poolMainUser.fullName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn("absolute -right-1.5 -bottom-1.5 size-6 rounded-full border-4 border-white dark:border-[#1a1f2b] shadow-[var(--ds-shadow-raised)] flex items-center justify-center", getStatusColor(poolMainUser.isActive))}>
                                    {poolMainUser.isActive ? <Icon icon={Tick01Icon} size={10} className="text-white" /> : <Icon icon={Cancel01Icon} size={10} className="text-white" />}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                                        {poolMainUser.fullName}
                                    </h2>
                                    <Badge className="bg-blue-600 text-white font-semibold text-[11px] px-3 py-1 rounded-[6px] border-none">{tr("MAIN POOL AGENT")}</Badge>
                                </div>
                                <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                    <Icon icon={UserGroupIcon} className="size-3.5 text-blue-500" />{tr("AGENT POOL")}{" "}<span className="text-slate-200 dark:text-white/10">•</span>{" "}{tr("Managing")}{" "}{totalLinkedUsers}{" "}{tr("Agents")}</p>
                            </div>
                        </div>

                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="h-12 w-12 p-0 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-slate-400 hover:text-rose-500 transition-colors group"
                        >
                            <Icon icon={Cancel01Icon} className="size-5 transition-transform" />
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-8 bg-slate-50 dark:bg-[#0f1218]">
                    <div className="space-y-8">
                        {/* Liquidity Dashboard */}
                        {floatBalance && floatBalance.success && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <Card className="rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 bg-slate-900 p-8 shadow-[var(--ds-shadow-raised)] overflow-hidden relative group col-span-2">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="size-10 rounded-[var(--ds-radius-large)] bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-[var(--ds-shadow-raised)]">
                                            <Icon icon={Money01Icon} size={20} />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">{tr("Consolidated Pool Float")}</h3>
                                    </div>
                                    <div className="space-y-8">
                                        <div>
                                            <span className="text-xs font-semibold text-white/40 mb-2 block">{tr("TOTAL POOL BALANCE")}</span>
                                            <span className="text-4xl font-bold text-blue-500">{formatCurrency(floatBalance.totalBalance || 0)}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="px-4 py-2 bg-white/5 rounded-[var(--ds-radius-small)] border border-white/5 flex items-center gap-2">
                                                <Icon icon={Activity01Icon} size={12} className="text-blue-500" />
                                                <span className="text-xs font-semibold text-white/60">{tr("{totalActiveFloats} ACTIVE AGENTS", { totalActiveFloats: floatBalance.totalActiveFloats })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                                <div className="p-8 bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 flex flex-col justify-between shadow-[var(--ds-shadow-raised)]">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] bg-blue-500/10 flex items-center justify-center">
                                            <Icon icon={UserGroupIcon} className="size-5 text-blue-500" />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-400">{tr("Total Agents")}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-4xl font-bold text-slate-900 dark:text-white">{totalLinkedUsers}</h4>
                                        <p className="text-xs font-semibold text-blue-500 mt-2">{tr("CONNECTED AGENTS")}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Satellite Nodes Registry */}
                        <Card className="rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] overflow-hidden shadow-[var(--ds-shadow-raised)]">
                            <CardHeader className="p-8 border-b border-slate-50 dark:border-white/5 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-[6px] bg-blue-600/10 flex items-center justify-center">
                                        <Icon icon={UserGroupIcon} className="size-4 text-blue-600" />
                                    </div>
                                    <CardTitle className="text-xl font-semibold">{tr("Linked agents")}</CardTitle>
                                </div>
                            </CardHeader>
                            <div data-slot="table-container" className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead data-slot="table-header">
                                        <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400">{tr("Agent Name")}</th>
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400">{tr("Company")}</th>
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400 text-right">{tr("Status")}</th>
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400 text-right">{tr("Actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody data-slot="table-body" className="divide-y divide-slate-50 dark:divide-white/5">
                                        {isLoadingLinkedUsers ? (
                                            <TableRowsSkeleton rows={6} cols={4} />
                                        ) : linkedUsers.length === 0 ? (
                                            <tr><td colSpan={4} className="py-24 text-center text-xs font-semibold text-slate-400">{tr("No linked agents")}</td></tr>
                                        ) : (
                                            linkedUsers.map((user: UserType) => (
                                                <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-10 rounded-[var(--ds-radius-small)] bg-slate-100 dark:bg-white/5 flex items-center justify-center font-semibold text-slate-400 text-xs">
                                                                {getInitials(user.fullName)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-900 dark:text-white mb-1">{user.fullName}</p>
                                                                <p className="text-xs font-bold text-slate-400">@{user.username}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <Badge variant="outline" className="text-xs font-semibold border-slate-200 dark:border-white/10">{user.company?.name || "SYS_GATEWAY"}</Badge>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <Badge className={cn("text-xs font-semibold border-none px-3", user.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 text-slate-500")}>
                                                            {user.isActive ? "ACTIVE" : "INACTIVE"}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => onViewLinkedUser?.(user)} className="h-10 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold hover:bg-blue-600 hover:text-white transition-colors">
                                                            <Icon icon={ViewIcon} className="size-3.5 mr-2" />{tr("View Agent")}</Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
