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
    Building03Icon,
    PinLocation01Icon,
    Tick01Icon,
    Cancel01Icon,
    InformationCircleIcon,
    MapsIcon,
    Location01Icon,
    ContactIcon,
    Mail01Icon,
    SmartPhone01Icon,
} from "@hugeicons/core-free-icons"
import { getDistricts } from "@/lib/services/location"
import { createBookingOffice, updateBookingOffice } from "@/lib/services/booking-office"
import { LoadingSpinner } from "@/components/loading-spinner"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useTr } from "@/lib/i18n/portal"

const officeSchema = z.object({
    name: z.string().min(2, "Office name must be at least 2 characters."),
    code: z.string().optional(),
    district_id: z.string().min(1, "Please select a district."),
    address: z.string().optional(),
})

type OfficeFormValues = z.infer<typeof officeSchema>

interface BookingOfficeSheetProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    office?: any | null
}

export function BookingOfficeSheet({ isOpen, onClose, onSuccess, office }: BookingOfficeSheetProps) {
    const tr = useTr()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const { data: districts } = useQuery({
        queryKey: ["districts-simple"],
        queryFn: async () => {
            const response = await getDistricts({ paginate: false })
            return Array.isArray(response.data) ? response.data : 
                   Array.isArray(response) ? response : []
        },
        enabled: isOpen,
    })

    const form = useForm<OfficeFormValues>({
        resolver: zodResolver(officeSchema),
        defaultValues: {
            name: "",
            code: "",
            district_id: "",
            address: "",
        },
    })

    useEffect(() => {
        if (office) {
            form.reset({
                name: office.name,
                code: office.code || "",
                district_id: office.district_id?.toString() || office.districtId?.toString() || "",
                address: office.address || "",
            })
        } else {
            form.reset({
                name: "",
                code: "",
                district_id: "",
                address: "",
            })
        }
    }, [office, form, isOpen])

    const onSubmit = async (values: OfficeFormValues) => {
        setIsSubmitting(true)
        try {
            const payload = {
                ...values,
                district_id: parseInt(values.district_id),
            }

            if (office) {
                await updateBookingOffice(office.id, payload)
                toast({
                    title: tr("Office Updated"),
                    description: tr("{name} has been updated successfully.", { name: values.name }),
                })
            } else {
                await createBookingOffice(payload)
                toast({
                    title: tr("Office Created"),
                    description: tr("{name} has been created successfully.", { name: values.name }),
                })
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error("Error saving office:", error)
            toast({
                title: tr("Error"),
                description: error.message || "Failed to save office. Please try again.",
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
                    <SheetTitle>{office ? tr("Edit Office") : tr("Add New Office")}</SheetTitle>
                    <SheetDescription>{tr("Configure booking office details and location settings.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="flex items-start justify-between mb-2">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={Building03Icon} size={28} className="text-[#ffd428]" />
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
                                {office ? tr("Edit Office") : tr("Add Office")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {office ? tr("Save office") : tr("Add booking office")}
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
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-relaxed">{tr("Booking offices are the physical interaction points where cargo is received and dispatched.")}</p>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="district_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                <Icon icon={PinLocation01Icon} size={14} />{tr("District")}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)] outline-none focus:ring-1 focus:ring-[#ffd428]/50 transition-all">
                                                        <SelectValue placeholder={tr("Select a District")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                                    {districts?.map((district: any) => (
                                                        <SelectItem key={district.id} value={district.id.toString()} className="text-xs font-semibold py-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-6 rounded bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold shrink-0 text-slate-500">
                                                                    {district.name.slice(0, 2)}
                                                                </div>
                                                                <div className="flex flex-col text-left">
                                                                    <span className="truncate leading-none">{district.name}</span>
                                                                    <span className="text-xs text-slate-400 mt-0.5 leading-none">{district.region?.name || tr("N/A Region")}</span>
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                    <Icon icon={Location01Icon} size={14} />{tr("Office Name")}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <Input 
                                                            placeholder={tr("e.g. Main office")} 
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
                                                    <Icon icon={Building03Icon} size={14} />{tr("Office code")}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <Input 
                                                            placeholder={tr("e.g. HB-01")} 
                                                            {...field} 
                                                            className="relative h-12 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold placeholder:text-slate-400 focus:border-[#ffd428]/50 focus:ring-0 transition-all shadow-[var(--ds-shadow-raised)]"
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-xs font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                <Icon icon={MapsIcon} size={14} />{tr("Address")}</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Input 
                                                        placeholder={tr("e.g. Ubungo bus stand, Gate 4")} 
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
                                            {office ? tr("Update") : tr("Confirm")}
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
