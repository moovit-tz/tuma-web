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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
    MapsIcon,
    GlobeIcon,
    Tick01Icon,
    Cancel01Icon,
    InformationCircleIcon,
    MapsLocation01Icon,
} from "@hugeicons/core-free-icons"
import { getCountries, getRegions } from "@/lib/services/location"
import { createRegion, updateRegion } from "@/lib/services/region"
import { LoadingSpinner } from "@/components/loading-spinner"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useTr } from "@/lib/i18n/portal"

const regionSchema = z.object({
    name: z.string().min(2, "Region name must be at least 2 characters."),
    country_id: z.string().min(1, "Please select a country."),
    // The backend creates-or-updates regions by code, so every region needs a unique one
    code: z.string().trim().min(2, "Enter a short code, e.g. DSM.").max(12, "Keep the code to 12 characters or fewer.")
        .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only."),
})

type RegionFormValues = z.infer<typeof regionSchema>

interface RegionSheetProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    region?: any | null
}

export function RegionSheet({ isOpen, onClose, onSuccess, region }: RegionSheetProps) {
    const tr = useTr()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const { data: countries } = useQuery({
        queryKey: ["countries-simple"],
        queryFn: async () => {
            const response = await getCountries({ paginate: false })
            return Array.isArray(response.data) ? response.data : 
                   Array.isArray(response) ? response : []
        },
        enabled: isOpen,
    })

    const form = useForm<RegionFormValues>({
        resolver: zodResolver(regionSchema),
        defaultValues: {
            name: "",
            country_id: "",
            code: "",
        },
    })

    useEffect(() => {
        if (region) {
            form.reset({
                name: region.name,
                country_id: region.country_id?.toString() || region.countryId?.toString() || region.country?.id?.toString() || "",
                code: region.code || "",
            })
        } else {
            form.reset({
                name: "",
                country_id: "",
                code: "",
            })
        }
    }, [region, form, isOpen])

    const onSubmit = async (values: RegionFormValues) => {
        setIsSubmitting(true)
        try {
            const name = values.name.trim()
            const code = values.code.trim().toUpperCase()
            const countryId = parseInt(values.country_id)

            // The backend upserts by code: an existing code would silently
            // overwrite that region, so refuse duplicates here.
            const existing: any[] = await getRegions({ paginate: false }).catch(() => [])
            const others = existing.filter((r) => Number(r.id) !== Number(region?.id))
            const sameCode = others.find((r) => String(r.code ?? "").toUpperCase() === code)
            if (sameCode) throw new Error(`The code ${code} is already used by ${sameCode.name}. Choose another code.`)
            const sameName = others.find((r) => String(r.name).trim().toLowerCase() === name.toLowerCase() && Number(r.countryId ?? r.country_id ?? r.country?.id) === countryId)
            if (sameName) throw new Error(`${sameName.name} already exists in this country.`)

            if (region) {
                // The update endpoint saves name and code (a region's country can't be changed)
                await updateRegion(region.id, { name, code })
                toast({
                    title: tr("Region Updated"),
                    description: tr("{name} has been updated successfully.", { name: values.name }),
                })
            } else {
                await createRegion({ name, code, countryId })
                toast({
                    title: tr("Region Created"),
                    description: tr("{name} has been created successfully.", { name: values.name }),
                })
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Error saving region:", error)
            toast({
                title: tr("Couldn't save the region"),
                description: error.message || "Please try again.",
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
                    <SheetTitle>{region ? tr("Edit Region") : tr("Add New Region")}</SheetTitle>
                    <SheetDescription>{tr("Manage regions within each country.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="flex items-start justify-between mb-2">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={MapsIcon} size={28} className="text-[#ffd428]" />
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
                                {region ? tr("Edit Region") : tr("Add Region")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {region ? tr("Update Boundaries") : tr("Add regions")}
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
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-relaxed">{tr("Regions are mapped to countries and serve as the parent container for districts and booking offices.")}</p>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="country_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                <Icon icon={GlobeIcon} size={14} />{tr("Country")}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={!!region}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)] outline-none focus:ring-1 focus:ring-[#ffd428]/50 transition-all">
                                                        <SelectValue placeholder={tr("Select a Country")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                                    {countries?.map((country: any) => (
                                                        <SelectItem key={country.id} value={country.id.toString()} className="text-xs font-semibold">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-6 rounded bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold shrink-0 text-slate-500">
                                                                    {country.code || country.name.slice(0, 2)}
                                                                </div>
                                                                <span className="truncate">{country.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {region && <p className="text-xs text-slate-400">{tr("A region's country can't be changed.")}</p>}
                                            <FormMessage className="text-xs font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                <Icon icon={MapsLocation01Icon} size={14} />{tr("Regional Name")}</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Input 
                                                        placeholder={tr("e.g. Dar es Salaam")} 
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
                                                <Icon icon={MapsLocation01Icon} size={14} />{tr("Region code")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={tr("e.g. DSM")}
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    className="h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold font-mono uppercase placeholder:text-slate-400 placeholder:normal-case focus:border-[#ffd428]/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)]"
                                                />
                                            </FormControl>
                                            <p className="text-xs text-slate-400">{tr("A short, unique code for this region.")}</p>
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
                                            {region ? tr("Update") : tr("Confirm")}
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
