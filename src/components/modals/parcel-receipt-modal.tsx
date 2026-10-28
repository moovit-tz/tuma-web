"use client"
import { Icon } from "@/components/ui/icon"
import React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
    Package01Icon, Calendar03Icon, UserIcon, MapsLocation01Icon,
    Building03Icon, DeliveryTruck01Icon, Download01Icon, PrinterIcon,
    Cancel01Icon, Tick01Icon, Clock01Icon, InformationCircleIcon
} from "@hugeicons/core-free-icons"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface ParcelReceiptModalProps {
    isOpen: boolean
    onClose: () => void
    parcel: any | null
}

export function ParcelReceiptModal({ isOpen, onClose, parcel }: ParcelReceiptModalProps) {
    const tr = useTr()
    if (!parcel) return null

    const statusColors: Record<string, string> = {
        DELIVERED: "bg-emerald-500",
        DISPATCHED: "bg-blue-500",
        RECEIVED: "bg-[#ffd428]",
        PENDING: "bg-amber-500",
        CANCELED: "bg-rose-500"
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[480px] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>{tr("Parcel Receipt: {parcelNumber}", { parcelNumber: parcel.parcelNumber })}</DialogTitle>
                    <DialogDescription>{tr("Receipt and parcel details.")}</DialogDescription>
                </DialogHeader>

                <div className="relative group perspective-1000">
                    {/* Industrial Receipt Container */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20, rotateX: -10 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] overflow-hidden relative"
                    >
                        {/* Header Branding */}
                        <div className="p-8 pb-6 bg-[#242a37] text-white relative">
                            
                            <div className="flex items-center justify-between relative z-10 mb-8">
                                <div className="size-10 rounded-[var(--ds-radius-small)] bg-white/10 flex items-center justify-center border border-white/10">
                                    <Icon icon={Package01Icon} size={24} className="text-[#ffd428]" />
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>

                            <div className="relative z-10 flex items-end justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-[#ffd428]/60 mb-2">{tr("Reference")}</p>
                                    <h2 className="text-2xl font-bold leading-none mb-4">{parcel.parcelNumber}</h2>
                                    <Badge className={cn(
                                        "h-6 px-3 rounded-full text-xs font-semibold border-none",
                                        statusColors[parcel.status] || "bg-slate-500",
                                        "text-white"
                                    )}>
                                        <Icon icon={Clock01Icon} size={10} className="mr-1.5" />
                                        {parcel.status}
                                    </Badge>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-white/40 mb-1">{tr("Receipt Issued")}</p>
                                    <p className="text-[12px] font-bold text-white">{format(new Date(parcel.createdAt), "MMM dd, yyyy")}</p>
                                </div>
                            </div>
                        </div>

                        {/* Logistics Matrix Area */}
                        <div className="p-8 space-y-8">
                            {/* Route Breakdown */}
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                        <Icon icon={Building03Icon} size={10} />{tr("Origin")}</p>
                                    <p className="text-[14px] font-semibold text-[#242a37] dark:text-white truncate">{parcel.origin?.name || parcel.originName || tr("GLOBAL HUB")}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1">{parcel.originOffice?.name || "—"}</p>
                                </div>
                                <div className="flex flex-col items-center gap-1 opacity-20">
                                    <div className="w-10 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                    <Icon icon={DeliveryTruck01Icon} size={14} className="text-slate-400" />
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2 justify-end">{tr("Destination")}<Icon icon={MapsLocation01Icon} size={10} />
                                    </p>
                                    <p className="text-[14px] font-semibold text-[#242a37] dark:text-white truncate">{parcel.destination?.name || parcel.destinationName || tr("REMOTE DEST")}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1">{parcel.destinationOffice?.name || tr("Hub Center")}</p>
                                </div>
                            </div>

                            <Separator className="bg-slate-100 dark:bg-white/5" />

                            {/* Stakeholder Identity */}
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Icon icon={UserIcon} size={12} className="text-[#ffd428]" />{tr("Consignor")}</p>
                                    <div>
                                        <p className="text-[13px] font-semibold text-[#242a37] dark:text-white truncate">{parcel.senderName || parcel.sender?.fullName || tr("INTERNAL SENDER")}</p>
                                        <p className="text-xs font-mono text-slate-500 mt-1">{parcel.senderPhoneNumber || parcel.sender?.phoneNumber || tr("NO CONTACT")}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-2 justify-end">{tr("Consignee")}<Icon icon={UserIcon} size={12} className="text-[#ffd428]" />
                                    </p>
                                    <div>
                                        <p className="text-[13px] font-semibold text-[#242a37] dark:text-white truncate">{parcel.recipientName || parcel.receiver?.fullName || "UNKNOWN"}</p>
                                        <p className="text-xs font-mono text-slate-500 mt-1">{parcel.recipientPhoneNumber || parcel.receiver?.phoneNumber || tr("NO CONTACT")}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Item Breakdown */}
                            <div className="rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-black/20 p-6 space-y-4 border border-slate-100 dark:border-white/5">
                                <p className="text-xs font-semibold text-slate-400">{tr("Parcel details")}</p>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] bg-white dark:bg-[#1a1f2b] flex items-center justify-center shadow-[var(--ds-shadow-raised)]">
                                            <Icon icon={Package01Icon} size={18} className="text-[#ffd428]" />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold text-[#242a37] dark:text-white">{parcel.parcelType?.name || parcel.name || tr("GENERAL FREIGHT")}</p>
                                            <p className="text-xs font-bold text-slate-500 mt-0.5">{parcel.weight || 1}{" "}{tr("KG •")}{" "}{parcel.units || 1} PKG</p>
                                        </div>
                                    </div>
                                    <p className="text-[14px] font-semibold text-[#242a37] dark:text-white">{(parcel.price || parcel.amount || 0).toLocaleString()} TZS</p>
                                </div>

                                <Separator className="bg-slate-200 dark:bg-white/10" />

                                <div className="flex items-center justify-between pt-2">
                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Total Settlement")}</p>
                                    <p className="text-xl font-semibold text-[#ffd428]">{(parcel.price || parcel.amount || 0).toLocaleString()} TZS</p>
                                </div>
                            </div>

                            {/* Footer / QR Placeholder */}
                            <div className="flex items-center justify-between gap-6 pt-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="size-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <Icon icon={Tick01Icon} size={12} />
                                        </div>
                                        <p className="text-xs font-semibold text-emerald-500">{tr("Payment Verified")}</p>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{tr("This receipt confirms the parcel was received. Terms & Conditions apply.")}</p>
                                </div>
                                <div className="size-20 rounded-[var(--ds-radius-large)] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-2 flex items-center justify-center shrink-0">
                                    <div className="size-full bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="p-4 bg-slate-50 dark:bg-white/5 flex items-center justify-center gap-3 border-t border-slate-100 dark:border-white/5">
                            <Button 
                                variant="ghost" 
                                className="flex-1 h-12 bg-white dark:bg-[#1a1f2b] text-slate-500 hover:text-[#242a37] hover:bg-[#ffd428] rounded-[var(--ds-radius-small)] text-xs font-semibold transition-colors gap-2"
                            >
                                <Icon icon={Download01Icon} size={18} />{tr("Download PDF")}</Button>
                            <Button 
                                variant="ghost" 
                                className="flex-1 h-12 bg-white dark:bg-[#1a1f2b] text-slate-500 hover:text-[#242a37] hover:bg-[#ffd428] rounded-[var(--ds-radius-small)] text-xs font-semibold transition-colors gap-2"
                            >
                                <Icon icon={PrinterIcon} size={18} />{tr("Print Ticket")}</Button>
                        </div>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
