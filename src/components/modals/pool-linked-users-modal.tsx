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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
    UserGroupIcon,
    Search01Icon,
    FilterIcon,
    UserAccountIcon,
    Building03Icon,
    CallIcon,
    Mail01Icon,
    Shield01Icon,
    Money01Icon,
    ViewIcon,
    Cancel01Icon,
    InformationCircleIcon
} from "@hugeicons/core-free-icons"
import { getPoolLinkedUsersByMainId } from "@/lib/services/user"
import type { User as UserType } from "@/types/user"
import { TableRowsSkeleton } from "@/components/ui/skeletons"
import { useTr } from "@/lib/i18n/portal"

interface PoolLinkedUsersModalProps {
    isOpen: boolean
    onClose: () => void
    poolMainUser: UserType | null
    onViewUser?: (user: UserType) => void
}

export function PoolLinkedUsersModal({ isOpen, onClose, poolMainUser, onViewUser }: PoolLinkedUsersModalProps) {
    const tr = useTr()
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

    // Fetch linked users
    const {
        data: linkedUsersData,
        isLoading: isLoadingLinkedUsers,
    } = useQuery({
        queryKey: ["pool-linked-users-modal", poolMainUser?.id],
        queryFn: () => getPoolLinkedUsersByMainId(poolMainUser!.id),
        enabled: isOpen && !!poolMainUser?.id,
    })

    const linkedUsers = linkedUsersData?.linkedUsers || []
    const totalLinkedUsers = linkedUsersData?.totalCount || 0

    // Filter users based on search and status
    const filteredUsers = linkedUsers.filter((user: UserType) => {
        const matchesSearch =
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phoneNumber.includes(searchTerm) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && user.isActive) ||
            (statusFilter === "inactive" && !user.isActive)

        return matchesSearch && matchesStatus
    })

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    if (!poolMainUser) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="[&>button]:hidden w-full sm:max-w-[1000px] p-0 border-none bg-slate-50 dark:bg-[#0f1218] overflow-hidden flex flex-col">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Linked agents")}</SheetTitle>
                    <SheetDescription>{tr("Agents linked to this pool.")}</SheetDescription>
                </SheetHeader>
                {/* Tactical Header: Brand Standard */}
                <div className="text-white relative p-8 bg-[#242a37] border-b border-white/10 overflow-hidden">
                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-6">
                            <div className="size-12 rounded-[var(--ds-radius-small)] bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Icon icon={UserGroupIcon} size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white leading-none mb-1">{tr("Linked agents")}</h2>
                                <p className="text-xs font-semibold text-slate-400">{tr("Office: {fullName} (@{username})", { fullName: poolMainUser.fullName, username: poolMainUser.username })}</p>
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

                    <div className="flex items-center gap-4 mt-8">
                        <div className="relative flex-1">
                            <Icon icon={Search01Icon} className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input 
                                placeholder={tr("Search agents by name, username, or phone...")} 
                                className="h-12 pl-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-bold text-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {["all", "active", "inactive"].map((f) => (
                                <Button 
                                    key={f}
                                    variant={statusFilter === f ? "default" : "outline"}
                                    onClick={() => setStatusFilter(f as any)}
                                    className={cn("h-10 px-6 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all", statusFilter === f ? "bg-slate-900 dark:bg-blue-600 text-white border-none" : "border-slate-200 dark:border-white/10")}
                                >
                                    {f}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-8 bg-slate-50 dark:bg-[#0f1218]">
                    <div className="space-y-8">
                        <Card className="rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] overflow-hidden shadow-[var(--ds-shadow-raised)]">
                            <div data-slot="table-container" className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse">
                                    <thead data-slot="table-header">
                                        <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400">{tr("Agent Name")}</th>
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400">{tr("Company")}</th>
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400">{tr("Float Status")}</th>
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400 text-right">{tr("Status")}</th>
                                            <th className="px-8 py-5 text-xs font-semibold text-slate-400 text-right">{tr("Actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody data-slot="table-body" className="divide-y divide-slate-50 dark:divide-white/5">
                                        {isLoadingLinkedUsers ? (
                                            <TableRowsSkeleton rows={6} cols={5} />
                                        ) : filteredUsers.length === 0 ? (
                                            <tr><td colSpan={5} className="py-24 text-center text-xs font-semibold text-slate-400">{tr("No Agents Match Filter")}</td></tr>
                                        ) : (
                                            filteredUsers.map((user: UserType) => (
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
                                                    <td className="px-8 py-5">
                                                        <Badge variant="outline" className={cn("text-xs font-semibold border-none px-3", user.isUsingFloat ? "bg-blue-500/10 text-blue-500" : "bg-slate-200 text-slate-500")}>
                                                            {user.isUsingFloat ? "ENABLED" : "LOCKED"}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <Badge className={cn("text-xs font-semibold border-none px-3", user.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                                            {user.isActive ? "ACTIVE" : "OFFLINE"}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => onViewUser?.(user)} className="h-10 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold hover:bg-blue-600 hover:text-white transition-colors">
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
