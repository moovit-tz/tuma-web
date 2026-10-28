"use client"

import React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { 
    Alert01Icon, 
    Cancel01Icon, 
    Tick01Icon,
    Delete02Icon,
    AlertCircleIcon
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void | Promise<void>
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "danger" | "warning" | "success" | "info"
    isLoading?: boolean
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    isLoading = false
}: ConfirmationModalProps) {
    const tr = useTr()
    
    const variants = {
        danger: {
            icon: Delete02Icon,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            btn: "bg-rose-600 hover:bg-rose-700 text-white",
            border: "border-rose-500/20"
        },
        warning: {
            icon: AlertCircleIcon,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            btn: "bg-amber-500 hover:bg-amber-600 text-[#242a37]",
            border: "border-amber-500/20"
        },
        success: {
            icon: Tick01Icon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            btn: "bg-emerald-500 hover:bg-emerald-600 text-white",
            border: "border-emerald-500/20"
        },
        info: {
            icon: Alert01Icon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            btn: "bg-blue-500 hover:bg-blue-600 text-white",
            border: "border-blue-500/20"
        }
    }

    const current = variants[variant]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[400px] p-0 overflow-hidden border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] rounded-[var(--ds-radius-large)]">
                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className={cn("size-20 rounded-[var(--ds-radius-large)] flex items-center justify-center mb-6", current.bg)}>
                            <Icon icon={current.icon} size={36} className={current.color} />
                        </div>
                        
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-semibold text-[#242a37] dark:text-white">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-500 font-medium leading-relaxed mt-2">
                                {description}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                        <Button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={cn(
                                "h-14 rounded-[var(--ds-radius-large)] font-semibold text-[12px] transition-all shadow-[var(--ds-shadow-raised)]",
                                current.btn
                            )}
                        >
                            {isLoading ? tr("Processing...") : confirmText}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-14 rounded-[var(--ds-radius-large)] font-semibold text-[12px] text-slate-400 hover:text-[#242a37] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                            {cancelText}
                        </Button>
                    </div>
                </div>
                
                {variant === "danger" && (
                    <div className="bg-rose-500/5 border-t border-rose-500/10 p-4 px-8">
                        <p className="text-xs font-bold text-rose-500/60 text-center">{tr("This action cannot be undone. Please proceed with caution.")}</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
