"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, ShieldCheck, Calendar, Building2, User as UserIcon } from "lucide-react"
import type { User } from "@/types/user"
import { useTr } from "@/lib/i18n/portal"

interface AdminViewModalProps {
    isOpen: boolean
    onClose: () => void
    admin: User | null
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
    ADMIN: { label: "Admin", className: "bg-blue-100 text-blue-800 border-blue-200" },
    OPS: { label: "Operations", className: "bg-amber-100 text-amber-800 border-amber-200" },
    OWNER: { label: "Owner", className: "bg-purple-100 text-purple-800 border-purple-200" },
}

const getInitials = (name: string) => {
    if (!name) return "??"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const formatDate = (value?: string) => {
    if (!value) return "—"
    try {
        return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    } catch {
        return value
    }
}

export function AdminViewModal({ isOpen, onClose, admin }: AdminViewModalProps) {
    const tr = useTr()
    if (!admin) return null

    const roleBadge = ROLE_BADGE[admin.role] || ROLE_BADGE.ADMIN

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{tr("System User Details")}</SheetTitle>
                    <SheetDescription>{tr("Read-only overview of this account.")}</SheetDescription>
                </SheetHeader>

                <div className="px-4 pb-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="size-14">
                            <AvatarFallback className="text-lg">{getInitials(admin.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-lg font-semibold">{admin.fullName}</p>
                            <p className="text-sm text-muted-foreground">@{admin.username}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={roleBadge.className}>
                            <ShieldCheck className="mr-1 size-3" />
                            {roleBadge.label}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={admin.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}
                        >
                            {admin.isActive ? tr("Active") : tr("Inactive")}
                        </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Phone className="size-4 text-muted-foreground shrink-0" />
                            <span>{admin.phoneNumber || "—"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="size-4 text-muted-foreground shrink-0" />
                            <span>{admin.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <UserIcon className="size-4 text-muted-foreground shrink-0" />
                            <span>{admin.gender || "—"}</span>
                        </div>
                        {admin.role === "OWNER" && (
                            <div className="flex items-center gap-3">
                                <Building2 className="size-4 text-muted-foreground shrink-0" />
                                <span>{admin.company?.name || admin.companyName || tr("No company assigned")}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <Calendar className="size-4 text-muted-foreground shrink-0" />
                            <span>{tr("Joined {formatDate}", { formatDate: formatDate(admin.createdAt) })}</span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
