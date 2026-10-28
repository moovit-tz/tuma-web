"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    MapsIcon,
    Location01Icon,
    Cancel01Icon,
    Tick01Icon,
    GlobeIcon,
    PassportIcon,
    InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { motion } from "framer-motion"
import { useTr } from "@/lib/i18n/portal"

interface Country {
    id: number
    uuid: string
    name: string
    code: string
    createdAt: string
    updatedAt: string
}

interface CountryModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    country?: Country
}

export function CountryModal({ isOpen, onClose, onSuccess, country }: CountryModalProps) {
    const tr = useTr()
    const isEditing = !!country
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        code: "",
    })
    const { toast } = useToast()

    useEffect(() => {
        if (country) {
            setFormData({
                name: country.name || "",
                code: country.code || "",
            })
        } else {
            setFormData({
                name: "",
                code: "",
            })
        }
    }, [country, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const url = country
                ? `/api/location/country/${country.uuid}`
                : '/api/location/country'

            const response = await fetch(url, {
                method: country ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error('Failed to save country')
            }

            toast({
                title: tr("Region saved"),
                description: tr("{name} has been successfully {cataloged}.", { name: formData.name, cataloged: isEditing ? 'updated' : 'cataloged' }),
            })
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error saving country:', error)
            toast({
                title: tr("Something went wrong"),
                description: tr("Failed to synchronized {country} with regional database.", { country: formData.name || 'country' }),
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{isEditing ? tr("Edit") : tr("Add region")}</SheetTitle>
                    <SheetDescription>{tr("Set the region's details.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={GlobeIcon} size={28} className="text-[#ffd428]" />
                            </div>
                            
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                            >
                                <Icon icon={Cancel01Icon} size={18} />
                            </Button>
                        </div>

                        <div className="text-left">
                            <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">
                                {isEditing ? tr("Edit Country") : tr("Add Country")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {isEditing ? tr("Territorial UUID: {slice}...", { slice: country.uuid.slice(0, 8) }) : tr("Add country")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div className="space-y-4 text-left">
                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                        <Icon icon={PassportIcon} size={12} />
                                    </div>{tr("National Identity")}</h3>
                                
                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("Legal Country Name")}</Label>
                                        <div className="relative group">
                                            <Input
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={tr("e.g. TANZANIA")}
                                                required
                                                className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:ring-1 focus:ring-blue-500/50 shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500">{tr("ISO Alpha Code")}</Label>
                                        <div className="relative group">
                                            <Input
                                                value={formData.code}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                placeholder={tr("e.g. TZ")}
                                                maxLength={5}
                                                required
                                                className="relative h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[15px] font-semibold focus:ring-1 focus:ring-blue-500/50 shadow-[var(--ds-shadow-raised)]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[var(--ds-radius-large)] flex items-start gap-4">
                                <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <Icon icon={InformationCircleIcon} size={16} className="text-blue-500" />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400">{tr("Data refresh")}</h4>
                                    <p className="text-xs font-bold text-blue-600/70 dark:text-blue-400/50 leading-relaxed mt-1">{tr("Countries are the top level of locations. Each ISO code must be unique.")}</p>
                                </div>
                            </div>
                        </motion.div>
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="p-8 bg-white dark:bg-[#0f1117] border-t border-slate-100 dark:border-white/5 flex items-center gap-4 flex-shrink-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-[var(--ds-radius-small)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-xs transition-colors border-none"
                    >{tr("Cancel")}</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                        {isSubmitting ? (
                            <LoadingSpinner className="h-5 w-5 text-[#242a37]" />
                        ) : (
                            <>
                                <Icon icon={Tick01Icon} size={20} />
                                {isEditing ? tr("Save changes") : tr("Add country")}
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}