"use client"

import { FormDescription } from "@/components/ui/form"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Brand, FleetType, Model, SeatLayout, Vehicle } from "@/types/vehicle"
import type { Company } from "@/types/company"
import { useEffect, useState } from "react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Icon } from "@/components/ui/icon"
import {
    BusIcon,
    Settings01Icon,
    ToggleOnIcon,
    Cancel01Icon,
    Tick01Icon,
    Activity01Icon,
    SteeringIcon,
    IdentityCardIcon,
    Settings02Icon,
    Key01Icon,
    PinLocation01Icon,
    Package02Icon,
    UserGroupIcon,
    Briefcase01Icon,
    Search01Icon,
    EyeIcon,
    PencilEdit01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useTr } from "@/lib/i18n/portal"

interface VehicleModalProps {
    open: boolean
    setOpen: (open: boolean) => void
    vehicle?: Vehicle
    brandsData: Brand[]
    modelsData: Model[]
    companiesData: Company[]
    fleetTypesData: FleetType[]
    seatLayoutsData: SeatLayout[]
    onSubmit: (values: any) => void
    companyLocked?: boolean
    isLoading?: boolean
    mode?: "view" | "edit" | "create"
    // false hides "Modify Profile" in view mode (no vehicles.manage permission)
    canEdit?: boolean
}

// Define the form schema
const formSchema = z.object({
    name: z.string().min(1, { message: "Vehicle name is required." }),
    companyId: z.string().min(1, { message: "Company is required." }),
    brandId: z.string().min(1, { message: "Brand is required." }),
    modelId: z.string().min(1, { message: "Model is required." }),
    registrationNumber: z.string().min(1, { message: "Registration number is required." }),
    fleetTypeId: z.string().min(1, { message: "Fleet Type is required." }),
    seatLayoutId: z.string().min(1, { message: "Seat Layout is required." }),
    capacity: z.string().optional(),
    engineNumber: z.string().min(1, { message: "Engine number is required." }),
    chassisNumber: z.string().min(1, { message: "Chassis number is required." }),
    plateNumber: z.string().optional(),
    location: z.string().optional(),
    isActive: z.boolean(),
    frontSeatAvailable: z.boolean(),
    isLastFullSeat: z.boolean(),
    isNew: z.boolean(),
    isSpecialHire: z.boolean(),
})

export function VehicleModal({
                                 open,
                                 setOpen,
                                 vehicle,
                                 brandsData = [],
                                 modelsData = [],
                                 companiesData = [],
                                 fleetTypesData = [],
                                 seatLayoutsData = [],
                                 onSubmit,
                                 companyLocked = false,
                                 isLoading = false,
                                 mode,
                                 canEdit = true,
                             }: VehicleModalProps) {
    const tr = useTr()
    const [activeTab, setActiveTab] = useState("details")
    const [internalMode, setInternalMode] = useState<"view" | "edit" | "create">(mode || (vehicle ? "edit" : "create"))

    const isView = internalMode === "view"

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: vehicle?.name || "",
            brandId: vehicle?.brandId?.toString() || (brandsData?.length > 0 ? brandsData[0]?.id?.toString() : "") || "",
            modelId: vehicle?.modelId?.toString() || (modelsData?.length > 0 ? modelsData[0]?.id?.toString() : "") || "",
            companyId: vehicle?.companyId?.toString() || (companiesData?.length > 0 ? companiesData[0]?.id?.toString() : "") || "",
            fleetTypeId:
                vehicle?.fleetTypeId?.toString() || (fleetTypesData?.length > 0 ? fleetTypesData[0]?.id?.toString() : "") || "",
            seatLayoutId:
                vehicle?.seatLayoutId?.toString() || (seatLayoutsData?.length > 0 ? seatLayoutsData[0]?.id?.toString() : "") || "",
            capacity: vehicle?.capacity?.toString() || "",
            registrationNumber: vehicle?.registrationNumber || "",
            engineNumber: vehicle?.engineNumber || "",
            chassisNumber: vehicle?.chassisNumber || "",
            plateNumber: vehicle?.plateNumber ? vehicle.plateNumber.toUpperCase() : "",
            location: vehicle?.location || "",
            isActive: vehicle?.isActive ?? true,
            frontSeatAvailable: vehicle?.frontSeatAvailable || false,
            isLastFullSeat: vehicle?.isLastFullSeat || false,
            isNew: vehicle?.isNew || false,
            isSpecialHire: vehicle?.isSpecialHire || false,
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                name: vehicle?.name || "",
                brandId: vehicle?.brandId?.toString() || (brandsData?.length > 0 ? brandsData[0]?.id?.toString() : "") || "",
                modelId: vehicle?.modelId?.toString() || (modelsData?.length > 0 ? modelsData[0]?.id?.toString() : "") || "",
                companyId: vehicle?.companyId?.toString() || (companiesData?.length > 0 ? companiesData[0]?.id?.toString() : "") || "",
                fleetTypeId:
                    vehicle?.fleetTypeId?.toString() || (fleetTypesData?.length > 0 ? fleetTypesData[0]?.id?.toString() : "") || "",
                seatLayoutId:
                    vehicle?.seatLayoutId?.toString() || (seatLayoutsData?.length > 0 ? seatLayoutsData[0]?.id?.toString() : "") || "",
                capacity: vehicle?.capacity?.toString() || "",
                registrationNumber: vehicle?.registrationNumber || "",
                engineNumber: vehicle?.engineNumber || "",
                chassisNumber: vehicle?.chassisNumber || "",
                plateNumber: vehicle?.plateNumber ? vehicle.plateNumber.toUpperCase() : "",
                location: vehicle?.location || "",
                isActive: vehicle?.isActive ?? true,
                frontSeatAvailable: vehicle?.frontSeatAvailable || false,
                isLastFullSeat: vehicle?.isLastFullSeat || false,
                isNew: vehicle?.isNew || false,
                isSpecialHire: vehicle?.isSpecialHire || false,
            })
            setActiveTab("details")
            setInternalMode(mode || (vehicle ? "edit" : "create"))
        }
    }, [open, vehicle, form, brandsData, modelsData, companiesData, fleetTypesData, seatLayoutsData, mode])

    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === "plateNumber" && value.plateNumber) {
                form.setValue("plateNumber", value.plateNumber.toUpperCase(), { shouldValidate: true })
            }
        })
        return () => subscription.unsubscribe()
    }, [form])

    function handleClose() {
        setOpen(false)
        form.reset()
        setActiveTab("details")
    }

    async function onSubmitForm(values: z.infer<typeof formSchema>) {
        const formattedData = {
            brandId: Number.parseInt(values.brandId),
            modelId: Number.parseInt(values.modelId),
            companyId: Number.parseInt(values.companyId),
            fleetTypeId: Number.parseInt(values.fleetTypeId),
            seatLayoutId: Number.parseInt(values.seatLayoutId),
            name: values.name,
            capacity: values.capacity ? Number.parseInt(values.capacity) : undefined,
            registrationNumber: values.registrationNumber,
            engineNumber: values.engineNumber,
            chassisNumber: values.chassisNumber,
            frontSeatAvailable: values.frontSeatAvailable,
            isLastFullSeat: values.isLastFullSeat,
            isNew: values.isNew,
            isActive: values.isActive,
            isSpecialHire: values.isSpecialHire,
            location: values.location || "",
            plateNumber: values.plateNumber || values.registrationNumber,
        }
        await onSubmit(formattedData)
    }

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 overflow-hidden border-none shadow-[var(--ds-shadow-raised)] bg-white dark:bg-[#0f1117] flex flex-col h-full outline-none [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{internalMode === "view" ? tr("Vehicle details") : tr("Edit vehicle")}</SheetTitle>
                    <SheetDescription>{tr("Set this vehicle's details.")}</SheetDescription>
                </SheetHeader>

                {/* ── Industrial Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Icon icon={BusIcon} size={30} className="text-[#ffd428]" />
                            </div>
                            
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                            >
                                <Icon icon={Cancel01Icon} size={18} />
                            </Button>
                        </div>

                        <div className="text-left">
                            <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">
                                {isView ? tr("Vehicle details") : internalMode === "edit" ? tr("Edit Vehicle") : tr("Register Vehicle")}
                            </h2>
                            <p className="text-white/50 text-xs font-semibold mt-2">
                                {vehicle ? tr("Registry Reference: {registrationNumber}", { registrationNumber: vehicle.registrationNumber }) : tr("Add vehicle")}
                            </p>
                        </div>
                    </div>

                    <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "details"}
                            onClick={() => setActiveTab("details")}
                            className={cn(
                                "-mb-px px-2 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428]",
                                activeTab === "details" ? "text-white border-[#ffd428]" : "text-white/60 hover:text-white hover:border-white/30 border-transparent"
                            )}
                        >
                            <Icon icon={SteeringIcon} className="size-4" />
                            <span>{tr("Details")}</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "specs"}
                            onClick={() => setActiveTab("specs")}
                            className={cn(
                                "-mb-px px-2 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428]",
                                activeTab === "specs" ? "text-white border-[#ffd428]" : "text-white/60 hover:text-white hover:border-white/30 border-transparent"
                            )}
                        >
                            <Icon icon={Settings01Icon} className="size-4" />
                            <span>{tr("Specifications")}</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "status"}
                            onClick={() => setActiveTab("status")}
                            className={cn(
                                "-mb-px px-2 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428]",
                                activeTab === "status" ? "text-white border-[#ffd428]" : "text-white/60 hover:text-white hover:border-white/30 border-transparent"
                            )}
                        >
                            <Icon icon={ToggleOnIcon} className="size-4" />
                            <span>{tr("Operational")}</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-8 space-y-8"
                                >
                                    {activeTab === "details" && (
                                        <div className="space-y-8">
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                        <Icon icon={IdentityCardIcon} size={12} />
                                                    </div>{tr("Primary Identification")}</h3>
                                                
                                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                                    <FormField
                                                        control={form.control}
                                                        name="name"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-2">
                                                                <FormLabel className="text-xs font-semibold text-slate-500">{tr("Commercial Designation")}</FormLabel>
                                                                <FormControl>
                                                                    <Input disabled={isView} placeholder={tr("e.g. TOYOTA COASTER 2024")} className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold focus:ring-1 focus:ring-blue-500/50 shadow-[var(--ds-shadow-raised)] transition-all" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="registrationNumber"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Registration number (T-number)")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input disabled={isView} placeholder={tr("e.g. T123ABC")} className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-semibold focus:ring-1 focus:ring-[#ffd428]/50 shadow-[var(--ds-shadow-raised)]" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="plateNumber"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Visible Plate Number")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input disabled={isView} placeholder={tr("T-PLATE")} className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-semibold focus:ring-1 focus:ring-emerald-500/50 shadow-[var(--ds-shadow-raised)]" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 text-left">
                                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                        <Icon icon={Briefcase01Icon} size={12} />
                                                    </div>{tr("Company")}</h3>
                                                
                                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                                    <FormField
                                                        control={form.control}
                                                        name="companyId"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-2">
                                                                <FormLabel className="text-xs font-semibold text-slate-500">{tr("Proprietor Company")}</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value} disabled={companyLocked || isView}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-12 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)] focus:ring-1 focus:ring-blue-500/50">
                                                                            <SelectValue placeholder={tr("Select a company")} />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="bg-[#1a1f2b] border-white/10 text-white">
                                                                        {companiesData.map((company) => (
                                                                            <SelectItem key={company.id} value={company.id.toString()} className="focus:bg-[#ffd428] focus:text-[#242a37] font-bold text-[12px]">{company.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="brandId"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Manufacturer Brand")}</FormLabel>
                                                                    <Select disabled={isView} onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-12 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]">
                                                                                <SelectValue placeholder={tr("Select Brand")} />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="bg-[#1a1f2b] border-white/10 text-white">
                                                                            {brandsData.map((brand) => (
                                                                                <SelectItem key={brand.id} value={brand.id.toString()} className="font-bold text-[12px]">{brand.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="modelId"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Model Series")}</FormLabel>
                                                                    <Select disabled={isView} onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-12 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]">
                                                                                <SelectValue placeholder={tr("Select Model")} />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="bg-[#1a1f2b] border-white/10 text-white">
                                                                            {modelsData.map((model) => (
                                                                                <SelectItem key={model.id} value={model.id.toString()} className="font-bold text-[12px]">{model.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "specs" && (
                                        <div className="space-y-8">
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                        <Icon icon={Settings02Icon} size={12} />
                                                    </div>{tr("Technical Specs")}</h3>
                                                
                                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="fleetTypeId"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Fleet type")}</FormLabel>
                                                                    <Select disabled={isView} onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-12 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]">
                                                                                <SelectValue placeholder={tr("Fleet Class")} />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="bg-[#1a1f2b] border-white/10 text-white">
                                                                            {fleetTypesData.map((type) => (
                                                                                <SelectItem key={type.id} value={type.id.toString()} className="font-bold text-[12px]">{type.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="seatLayoutId"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Seating Configuration")}</FormLabel>
                                                                    <Select disabled={isView} onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-12 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]">
                                                                                <SelectValue placeholder={tr("Layout")} />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="bg-[#1a1f2b] border-white/10 text-white">
                                                                            {seatLayoutsData.map((layout) => (
                                                                                <SelectItem key={layout.id} value={layout.id.toString()} className="font-bold text-[12px]">{layout.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="engineNumber"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Engine number")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input disabled={isView} placeholder={tr("e.g. 4HK1-123456")} className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-semibold focus:ring-1 focus:ring-blue-500/50" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="chassisNumber"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Chassis Frame ID")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input disabled={isView} placeholder={tr("CHS-SERIAL")} className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[14px] font-semibold focus:ring-1 focus:ring-blue-500/50" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 text-left">
                                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                        <Icon icon={PinLocation01Icon} size={12} />
                                                    </div>{tr("Settings")}</h3>
                                                
                                                <div className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="capacity"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Net Capacity (PAX)")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input disabled={isView} type="number" placeholder={tr("Total Seats")} className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[15px] font-semibold tabular-nums shadow-[var(--ds-shadow-raised)]" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="location"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel className="text-xs font-semibold text-slate-500">{tr("Main office")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input disabled={isView} placeholder={tr("Base Location")} className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-[13px] font-semibold shadow-[var(--ds-shadow-raised)]" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "status" && (
                                        <div className="space-y-6">
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 ml-1">
                                                    <div className="size-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[#242a37] dark:text-white">
                                                        <Icon icon={Activity01Icon} size={12} />
                                                    </div>{tr("System Permissions")}</h3>
                                                
                                                <div className="grid grid-cols-1 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="isActive"
                                                        render={({ field }) => (
                                                            <div className="flex items-center justify-between p-6 bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] group">
                                                                <div className="text-left">
                                                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Status")}</p>
                                                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Inactive vehicles can't be assigned to trips")}</p>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch disabled={isView} checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500" />
                                                                </FormControl>
                                                            </div>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="isSpecialHire"
                                                        render={({ field }) => (
                                                            <div className="flex items-center justify-between p-6 bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] group">
                                                                <div className="text-left">
                                                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Corporate Charter Hire")}</p>
                                                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Mark as available for specialized transport services")}</p>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch disabled={isView} checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-blue-500" />
                                                                </FormControl>
                                                            </div>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="isNew"
                                                        render={({ field }) => (
                                                            <div className="flex items-center justify-between p-6 bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] group">
                                                                <div className="text-left">
                                                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Acquisition Status")}</p>
                                                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Identify as recent addition to the global fleet")}</p>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch disabled={isView} checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[#ffd428]" />
                                                                </FormControl>
                                                            </div>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="frontSeatAvailable"
                                                        render={({ field }) => (
                                                            <div className="flex items-center justify-between p-6 bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] group">
                                                                <div className="text-left">
                                                                    <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Prime Seating (Front)")}</p>
                                                                    <p className="text-xs text-slate-400 font-bold mt-1">{tr("Allow individual ticketing for cabin seating")}</p>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch disabled={isView} checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-indigo-500" />
                                                                </FormControl>
                                                            </div>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </form>
                    </Form>
                </div>

                {/* ── Footer ── */}
                <div className="p-8 bg-white dark:bg-[#0f1117] border-t border-slate-100 dark:border-white/5 flex items-center gap-4 flex-shrink-0">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="flex-1 h-12 rounded-[var(--ds-radius-small)] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[#242a37] dark:text-white font-semibold text-xs transition-colors border-none"
                    >
                        {isView ? tr("Close") : tr("Cancel")}
                    </Button>

                    {isView ? (canEdit &&
                        <Button
                            onClick={() => setInternalMode("edit")}
                            className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                        >
                            <Icon icon={PencilEdit01Icon} size={20} />{tr("Modify Profile")}</Button>
                    ) : (
                        <Button
                            onClick={form.handleSubmit(onSubmitForm)}
                            disabled={isLoading}
                            className="flex-[1.5] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors flex items-center justify-center gap-2 cursor-pointer border-none"
                        >
                            {isLoading ? (
                                <LoadingSpinner className="h-5 w-5 text-[#242a37]" />
                            ) : (
                                <>
                                    <Icon icon={Tick01Icon} size={20} />
                                    {internalMode === "edit" ? tr("Save changes") : tr("Save vehicle")}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}