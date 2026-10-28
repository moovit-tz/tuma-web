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
    PinLocation01Icon,
    MapsIcon,
    Tick01Icon,
    Cancel01Icon,
    InformationCircleIcon,
    MapsLocation01Icon,
    Building03Icon,
} from "@hugeicons/core-free-icons"
import { getRegions, getDistricts } from "@/lib/services/location"
import { createDistrict, updateDistrict } from "@/lib/services/district"
import { LoadingSpinner } from "@/components/loading-spinner"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useTr } from "@/lib/i18n/portal"

const districtSchema = z.object({
    name: z.string().min(2, "District name must be at least 2 characters."),
    region_id: z.string().min(1, "Please select a region."),
})

type DistrictFormValues = z.infer<typeof districtSchema>

interface DistrictSheetProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    district?: any | null
}

export function DistrictSheet({ isOpen, onClose, onSuccess, district }: DistrictSheetProps) {
    const tr = useTr()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const { data: regions } = useQuery({
        queryKey: ["regions-simple"],
        queryFn: async () => {
            const response = await getRegions({ paginate: false })
            return Array.isArray(response.data) ? response.data : 
                   Array.isArray(response) ? response : []
        },
        enabled: isOpen,
    })

    const form = useForm<DistrictFormValues>({
        resolver: zodResolver(districtSchema),
        defaultValues: {
            name: "",
            region_id: "",
        },
    })

    useEffect(() => {
        if (district) {
            form.reset({
                name: district.name,
                region_id: district.region_id?.toString() || district.regionId?.toString() || "",
            })
        } else {
            form.reset({
                name: "",
                region_id: "",
            })
        }
    }, [district, form, isOpen])

    const onSubmit = async (values: DistrictFormValues) => {
        setIsSubmitting(true)
        try {
            const name = values.name.trim()
            const payload = { name, regionId: parseInt(values.region_id) }

            // District names are unique and the backend creates-or-updates by
            // name: a duplicate would silently move that district, so refuse it.
            const existing: any[] = await getDistricts().catch(() => [])
            const clash = existing.find((d) => Number(d.id) !== Number(district?.id) && String(d.name).trim().toLowerCase() === name.toLowerCase())
            if (clash) throw new Error(`A district called ${clash.name} already exists${clash.region?.name ? ` in ${clash.region.name}` : ""}.`)

            if (district) {
                await updateDistrict(district.id, payload)
                toast({
                    title: tr("District Updated"),
                    description: tr("{name} has been updated successfully.", { name: values.name }),
                })
            } else {
                await createDistrict(payload)
                toast({
                    title: tr("District Created"),
                    description: tr("{name} has been created successfully.", { name: values.name }),
                })
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Error saving district:", error)
            toast({
                title: tr("Couldn't save the district"),
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
                    <SheetTitle>{district ? tr("Edit District") : tr("Add New District")}</SheetTitle>
                    <SheetDescription>{tr("Manage hierarchical district subdivisions within regions.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="flex items-start justify-between mb-2">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={PinLocation01Icon} size={28} className="text-[#ffd428]" />
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
                                {district ? tr("Edit District") : tr("Add District")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {district ? tr("Save") : tr("Define Catchment Area")}
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
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-relaxed">{tr("Districts are sub-divisions of regions and contain one or more booking offices.")}</p>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="region_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                <Icon icon={MapsIcon} size={14} />{tr("Parent Region")}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)] outline-none focus:ring-1 focus:ring-[#ffd428]/50 transition-all">
                                                        <SelectValue placeholder={tr("Select a Region")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                                    {regions?.map((region: any) => (
                                                        <SelectItem key={region.id} value={region.id.toString()} className="text-xs font-semibold">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-6 rounded bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold shrink-0 text-slate-500">
                                                                    {region.name.slice(0, 2)}
                                                                </div>
                                                                <span className="truncate">{region.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                                                <Icon icon={MapsLocation01Icon} size={14} />{tr("District Name")}</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Input 
                                                        placeholder={tr("e.g. Kinondoni")} 
                                                        {...field} 
                                                        className="relative h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold placeholder:text-slate-400 focus:border-[#ffd428]/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)]"
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
                                            {district ? tr("Update") : tr("Confirm")}
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
