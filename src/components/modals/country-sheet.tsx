"use client"
import { Icon } from "@/components/ui/icon"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
    MapsLocation01Icon,
    GlobeIcon,
    Tick01Icon,
    Cancel01Icon,
    InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { createCountry, updateCountry } from "@/lib/services/country"
import { LoadingSpinner } from "@/components/loading-spinner"
import { motion, AnimatePresence } from "framer-motion"
import { getRestCountryData } from "@/lib/services/rest-countries"
import { useTr } from "@/lib/i18n/portal"

const countrySchema = z.object({
    name: z.string().min(2, "Country name must be at least 2 characters."),
    code: z.string().min(2, "Country code must be at least 2 characters.").max(5, "Country code must be max 5 characters."),
})

type CountryFormValues = z.infer<typeof countrySchema>

interface Country {
    id: number
    uuid: string
    name: string
    code: string
}

interface CountrySheetProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    country?: Country | null
}

export function CountrySheet({ isOpen, onClose, onSuccess, country }: CountrySheetProps) {
    const tr = useTr()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isFetchingCode, setIsFetchingCode] = useState(false)
    const { toast } = useToast()

    const form = useForm<CountryFormValues>({
        resolver: zodResolver(countrySchema),
        defaultValues: {
            name: "",
            code: "",
        },
    })

    useEffect(() => {
        if (country) {
            form.reset({
                name: country.name,
                code: country.code,
            })
        } else {
            form.reset({
                name: "",
                code: "",
            })
        }
    }, [country, form, isOpen])

    // Auto-fetch country code
    const countryNameValue = form.watch("name")
    
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!country && countryNameValue && countryNameValue.length > 2) {
                try {
                    setIsFetchingCode(true)
                    const data = await getRestCountryData(countryNameValue)
                    if (data?.cca2) {
                        form.setValue("code", data.cca2)
                    }
                } catch (error) {
                    console.error("Failed to auto-fetch country code:", error)
                } finally {
                    setIsFetchingCode(false)
                }
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [countryNameValue, country, form])

    const onSubmit = async (values: CountryFormValues) => {
        setIsSubmitting(true)
        try {
            if (country) {
                await updateCountry(country.id, values)
                toast({
                    title: tr("Country Updated"),
                    description: tr("{name} has been updated successfully.", { name: values.name }),
                })
            } else {
                await createCountry(values)
                toast({
                    title: tr("Country Created"),
                    description: tr("{name} has been created successfully.", { name: values.name }),
                })
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Error saving country:", error)
            toast({
                title: tr("Error"),
                description: error.message || "Failed to save country. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{country ? tr("Edit Country") : tr("Add New Country")}</SheetTitle>
                    <SheetDescription>{tr("Set up country name and regional code.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="flex items-start justify-between mb-2">
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

                        <div className="text-left mt-6">
                            <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">
                                {country ? tr("Edit Country") : tr("Add Country")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {country ? tr("Update System Records") : tr("Expand Operations")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="p-5 rounded-[var(--ds-radius-large)] bg-blue-500/10 border border-blue-500/20 flex gap-4 items-start shadow-[var(--ds-shadow-raised)]">
                                    <div className="p-2 rounded-full bg-blue-500/20 text-blue-500 shrink-0 mt-0.5">
                                        <Icon icon={InformationCircleIcon} size={16} />
                                    </div>
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-relaxed">{tr("Countries serve as the top-level geographical unit.")}</p>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                <Icon icon={GlobeIcon} size={14} />{tr("Country Name")}</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Input 
                                                        placeholder={tr("e.g. Tanzania")} 
                                                        {...field} 
                                                        className="relative h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold placeholder:text-slate-400 focus:border-[#ffd428]/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)]"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                <Icon icon={MapsLocation01Icon} size={14} />{tr("ISO Code")}</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Input 
                                                        placeholder={tr("e.g. TZ")} 
                                                        {...field} 
                                                        className="relative h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold placeholder:text-slate-400 focus:border-[#ffd428]/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)]"
                                                        maxLength={5}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs font-bold" />
                                        </FormItem>
                                    )}
                                />
                            </motion.div>

                            <div className="pt-8 flex items-center gap-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="flex-1 h-12 rounded-[var(--ds-radius-small)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-xs transition-colors"
                                    disabled={isSubmitting}
                                >{tr("Cancel")}</Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <LoadingSpinner className="h-4 w-4 text-[#242a37]" />
                                    ) : (
                                        <>
                                            <Icon icon={Tick01Icon} size={16} />
                                            {country ? tr("Update") : tr("Confirm")}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
