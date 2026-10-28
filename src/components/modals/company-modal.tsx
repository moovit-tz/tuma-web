"use client"

import { FormDescription } from "@/components/ui/form"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Company } from "@/types/company"
import { useEffect, useState, useRef } from "react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { X as XIcon } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { OfficeIcon, Message01Icon, Tick02Icon, Delete02Icon, CheckListIcon, Building03Icon, ContactIcon, GridViewIcon, Settings01Icon, Cancel01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { useTr } from "@/lib/i18n/portal"

// Used by the SMS gateway when a company has no sender ID of its own
const DEFAULT_SENDER_ID = "MySAFARI"

// Company Status Badge
function StatusBadge({ status }: { status: string }) {
    const s = (status || "").toUpperCase()
    if (s === "ACTIVE") return (
        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-[11px] font-semibold px-3 py-1 rounded-[var(--ds-radius-small)] uppercase">
            {s}
        </Badge>
    )
    return (
        <Badge className="bg-rose-600 text-white border-none text-[11px] font-bold px-3 py-1 rounded-[var(--ds-radius-small)] uppercase">{s}</Badge>
    )
}

// Company Performance Badge
export function PerformanceBadge({ count, className }: { count: number, className?: string }) {
    const getTier = (c: number) => {
        if (c <= 500) return { label: "BRONZE", color: "text-orange-950", bg: "bg-orange-400", border: "border-orange-500/20" }
        if (c <= 1000) return { label: "SILVER", color: "text-slate-900", bg: "bg-slate-300", border: "border-slate-400/20" }
        if (c <= 1500) return { label: "GOLD", color: "text-amber-950", bg: "bg-amber-400", border: "border-amber-500/20" }
        if (c <= 2000) return { label: "PLATINUM", color: "text-cyan-950", bg: "bg-cyan-300", border: "border-cyan-400/20" }
        return { label: "DIAMOND", color: "text-blue-950", bg: "bg-blue-300", border: "border-blue-400/20" }
    }
    const tier = getTier(count || 0)
    return (
        <Badge className={cn(tier.bg, tier.color, "border-none text-xs font-semibold px-3 py-1 rounded-[var(--ds-radius-small)] shadow-[var(--ds-shadow-raised)]", className)}>
            {tier.label}  TOP
        </Badge>
    )
}

const formSchema = z.object({
    name: z.string().min(2, "Company name must be at least 2 characters."),
    tin: z.string().min(5, "TIN must be at least 5 digits."),
    phoneNumber: z.string().min(7, "Invalid phone number."),
    address: z.string().min(5, "Address must be at least 5 characters."),
    email: z.string().email("Invalid email address.").or(z.literal("")),
    website: z.string().url("Invalid URL").or(z.literal("")).optional(),
    helpDeskPhoneNumber: z.string().optional(),
    // Sender ID the SMS gateway shows on texts to customers (max 11 characters)
    smsSender: z.string().trim().max(11, "A sender ID can be at most 11 characters.").default(DEFAULT_SENDER_ID),
    logoUrl: z.string().optional(),
    isActive: z.boolean().default(true),
    showVehicleOnReceive: z.boolean().default(false),
})

export interface CompanyFormProps {
    company?: Company | null
    onSubmit: (data: any) => Promise<void>
    onDelete?: (company: Company, data?: { reason: string, permanent: boolean }) => void
    isLoading?: boolean
    mode?: "view" | "edit" | "create" | "delete"
    onClose: () => void
}

export function CompanyForm({
                                 company,
                                 onSubmit,
                                 onDelete,
                                 isLoading = false,
                                 mode,
                                 onClose,
                             }: CompanyFormProps) {
    const tr = useTr()
    const [activeTab, setActiveTab] = useState("details")
    const [internalMode, setInternalMode] = useState<"view" | "edit" | "create" | "delete">(mode || (company ? "edit" : "create"))
    const [deleteReason, setDeleteReason] = useState("")
    const [isDeleting, setIsDeleting] = useState(mode === "delete")
    const isView = internalMode === "view"
    const fileInputRef = useRef<HTMLInputElement>(null)
    // The picked logo file, uploaded with the form (the preview uses a data: URL)
    const logoFileRef = useRef<File | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            name: company?.name || "",
            tin: company?.tin || "",
            phoneNumber: company?.phoneNumber || "+255",
            address: company?.address || "",
            email: company?.email || "",
            website: company?.website || "",
            helpDeskPhoneNumber: company?.helpDeskPhoneNumber || "+255",
            smsSender: company?.smsSender || DEFAULT_SENDER_ID,
            logoUrl: company?.logoUrl || "",
            isActive: company?.isActive ?? true,
            showVehicleOnReceive: (company as any)?.showVehicleOnReceive ?? false,
        },
    })

    // Watch for live logo updates to reflect in the header
    const watchedLogoUrl = form.watch("logoUrl")

    useEffect(() => {
        if (company) {
            form.reset({
                name: company?.name || "",
                tin: company?.tin || "",
                phoneNumber: company?.phoneNumber || "+255",
                address: company?.address || "",
                email: company?.email || "",
                website: company?.website || "",
                helpDeskPhoneNumber: company?.helpDeskPhoneNumber || "+255",
                smsSender: company?.smsSender || DEFAULT_SENDER_ID,
                logoUrl: company?.logoUrl || "",
                isActive: company?.isActive ?? true,
                showVehicleOnReceive: (company as any)?.showVehicleOnReceive ?? false,
            })
            setInternalMode(mode || (company ? "edit" : "create"))
            setIsDeleting(mode === "delete")
        }
    }, [company, form, mode])

    const formatPhoneNumber = (value: string) => {
        if (!value.startsWith("+255")) {
            if (value.startsWith("0")) return "+255" + value.slice(1)
            if (value.startsWith("255")) return "+" + value
            return "+255" + value
        }
        return value
    }

    const validateAndNext = async (tab: string, fields: any[]) => {
        const isValid = await form.trigger(fields as any)
        if (isValid) setActiveTab(tab)
    }

    async function onSubmitForm(values: z.infer<typeof formSchema>) {
        try {
            await onSubmit({ ...values, logoFile: logoFileRef.current })
            logoFileRef.current = null
        } catch (error: any) {
            console.error("Form Submission Error:", error)
            toast({ title: tr("Error"), description: error.message || "Failed to process company registry. Please verify all data points.", variant: "destructive" })
        }
    }

    const getHeaderTitle = () => {
        if (isDeleting) return "Remove Company Account"
        if (internalMode === "view") return company?.name || "Company Details"
        if (internalMode === "edit") return "Edit Company"
        return "Register Company"
    }

    const getHeaderSubTitle = () => {
        if (isDeleting) return `Closing: ${company?.name}`
        if (internalMode === "view") return `Registration ID: #${String(company?.id).padStart(4, '0')}`
        return "Company Onboarding"
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className={cn(
                "text-white relative overflow-hidden flex-shrink-0 transition-colors duration-300",
                isDeleting ? "bg-rose-950" : "bg-[#242a37]"
            )}>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
                    <Icon icon={OfficeIcon} size={160} />
                </div>
                <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                    <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                        <div className="size-14 rounded-[var(--ds-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                            {watchedLogoUrl ? (
                                <img src={watchedLogoUrl} alt={tr("Logo")} className="w-full h-full object-contain" />
                            ) : (
                                <Icon icon={OfficeIcon} size={28} className={cn(isDeleting ? "text-white" : "text-[#ffd428]")} />
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                            {internalMode === "view" && (
                                <>
                                    <Button
                                        onClick={() => setInternalMode("edit")}
                                        className="h-9 px-4 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                    >
                                        <Icon icon={OfficeIcon} size={20} />{tr("Edit")}</Button>
                                    <Button
                                        onClick={() => setIsDeleting(true)}
                                        className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                    >
                                        <Icon icon={Delete02Icon} size={20} />{tr("Delete Company")}</Button>
                                </>
                            )}
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-white p-0"
                            >
                                <Icon icon={Cancel01Icon} size={18} />
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-left">
                            <SheetTitle className="sr-only">{tr("Company Control: {id}", { id: company?.id })}</SheetTitle>
                            <h2 className="text-2xl font-bold text-white m-0 p-0">
                                {getHeaderTitle()}
                            </h2>
                            <p className="text-white/50 text-xs font-bold mt-1">
                                {getHeaderSubTitle()}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {(internalMode === "view" || isDeleting) && <StatusBadge status={company?.isActive ? "ACTIVE" : "INACTIVE"} />}
                            {(internalMode === "view" || isDeleting) && (company?.totalParcels !== undefined) && <PerformanceBadge count={company.totalParcels} />}
                        </div>
                    </div>
                </div>
                
                {!isDeleting && (
                    <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto custom-scrollbar">
                        {[
                            { id: "details", label: tr("Company Info"), icon: Building03Icon },
                            { id: "channels", label: tr("Contact Details"), icon: ContactIcon },
                            { id: "branding", label: tr("Branding"), icon: GridViewIcon },
                            ...(internalMode !== "view" ? [{ id: "review", label: tr("Review"), icon: Tick02Icon }] : []),
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                disabled={isView ? false : activeTab !== tab.id && internalMode === "create"}
                                onClick={() => {
                                    if (isView || internalMode === "edit") setActiveTab(tab.id)
                                }}
                                className={cn(
                                    "-mb-px px-2 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428] disabled:opacity-30 disabled:cursor-not-allowed hover:cursor-pointer",
                                    activeTab === tab.id
                                        ? "text-white border-[#ffd428]"
                                        : "text-white/60 hover:text-white hover:border-white/30 border-transparent"
                                )}
                            >
                                <Icon icon={tab.icon} className="size-5" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-0 flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#0f172a]">
                {isDeleting && company ? (
                    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0a0c10]">
                        <div className="p-8 pb-4" />

                        <div className="flex-1 p-4 sm:p-8 pt-0 space-y-8 overflow-y-auto pb-32">
                            <div className="p-6 rounded-[var(--ds-radius-large)] bg-rose-500/5 border border-rose-500/10 space-y-4 text-left">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-[var(--ds-radius-large)] bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-[var(--ds-shadow-raised)]">
                                        <Icon icon={Delete02Icon} size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold text-rose-500">{tr("Important Notice")}</p>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{tr("This action cannot be undone. All company data will be lost.")}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 text-left">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">{tr("REASON FOR CLOSING ACCOUNT")}{" "}<span className="text-rose-500">*</span></label>
                                <textarea 
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    placeholder={tr("PLEASE DESCRIBE WHY YOU ARE REMOVING THIS COMPANY...")}
                                    className="w-full h-40 p-5 bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-large)] text-sm font-medium resize-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 outline-none transition-all shadow-[var(--ds-shadow-raised)]"
                                />
                                <p className="text-xs text-slate-400">{tr("This reason will be saved in the company's activity log.")}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={async () => {
                                        if (!deleteReason) {
                                            toast({ title: tr("Required"), description: tr("Please provide a reason for disabling this account"), variant: "destructive" })
                                            return
                                        }
                                        if (onDelete) await onDelete(company, { reason: deleteReason, permanent: false })
                                    }}
                                    disabled={isLoading || !deleteReason}
                                    className="h-16 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/10 text-[#242a37] dark:text-white font-semibold text-xs hover:border-slate-300 dark:hover:border-white/20 transition-colors flex flex-col items-center justify-center disabled:opacity-50 cursor-pointer"
                                >
                                    <span className="leading-tight">{tr("Temporarily Disable")}</span>
                                    <span className="text-xs opacity-50 font-bold">{tr("Keeps data but hides it from active lists")}</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!deleteReason) {
                                            toast({ title: tr("Required"), description: tr("Please provide a reason for deleting this account"), variant: "destructive" })
                                            return
                                        }
                                        if (onDelete) await onDelete(company, { reason: deleteReason, permanent: true })
                                    }}
                                    disabled={isLoading || !deleteReason}
                                    className="h-16 rounded-[var(--ds-radius-large)] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex flex-col items-center justify-center shadow-[var(--ds-shadow-raised)] disabled:opacity-50 cursor-pointer"
                                >
                                    <span className="leading-tight">{tr("Permanently Delete")}</span>
                                    <span className="text-xs opacity-70 font-bold">{tr("Removes all records from the system")}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitForm)} className="h-full flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
                            <div className="px-4 sm:px-8 py-8 flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar pb-32">
                                <TabsContent value="details" className="m-0 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">{tr("Company Name")}{" "}<span className="text-red-500 font-normal">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input disabled={isView} placeholder={tr("e.g., Global Limited")} className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tin"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">{tr("Tax ID Number")}{" "}<span className="text-red-500 font-normal">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input disabled={isView} placeholder="e.g., 100-200-300" className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">{tr("Address")}{" "}<span className="text-red-500 font-normal">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input disabled={isView} placeholder={tr("e.g. Plot 12, Morogoro Road")} className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">{tr("Phone Number")}{" "}<span className="text-red-500 font-normal">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        disabled={isView} 
                                                        placeholder="+255..." 
                                                        className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white" 
                                                        {...field}
                                                        onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {!isView && (
                                        <div className="pt-4">
                                            <Button 
                                                type="button" 
                                                disabled={!form.watch("name") || !form.watch("tin") || !form.watch("address") || form.watch("phoneNumber").length < 7}
                                                onClick={() => validateAndNext("channels", ["name", "tin", "address", "phoneNumber"])} 
                                                className="w-full h-12 rounded-[var(--ds-radius-small)] bg-[#242a37] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >{tr("Continue to Contact Details")}</Button>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="channels" className="m-0 space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">{tr("Official Email Address")}</FormLabel>
                                                <FormControl>
                                                    <Input disabled={isView} type="email" placeholder="contact@example.com" className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">{tr("Company Website")}</FormLabel>
                                                <FormControl>
                                                    <Input disabled={isView} placeholder="https://www.example.com" className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="helpDeskPhoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">{tr("Help Desk Phone Number")}</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        disabled={isView} 
                                                        placeholder="+255..." 
                                                        className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white" 
                                                        {...field}
                                                        onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {!isView && (
                                        <div className="pt-4 flex gap-3">
                                            <Button type="button" variant="outline" onClick={() => setActiveTab("details")} className="flex-1 h-12 rounded-[var(--ds-radius-small)] font-bold cursor-pointer">{tr("Back")}</Button>
                                            <Button 
                                                type="button" 
                                                disabled={!form.formState.isValid}
                                                onClick={() => validateAndNext("branding", ["email"])} 
                                                className="flex-[2] h-12 rounded-[var(--ds-radius-small)] bg-[#242a37] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >{tr("Branding and Settings")}</Button>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="branding" className="m-0 space-y-6 focus-visible:outline-none">
                                    <Accordion type="single" collapsible defaultValue="sms" className="w-full space-y-4">
                                        <AccordionItem value="sms" className="border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 px-6 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <p className="text-xs font-semibold text-[#242a37] dark:text-[#ffd428]">{tr("SMS Settings")}</p>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-6 pt-2 space-y-6 border-t border-slate-100 dark:border-white/5">
                                                <div className="mt-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="smsSender"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400">{tr("SMS sender ID")}</FormLabel>
                                                                <FormControl>
                                                                    <Input disabled={isView} placeholder={DEFAULT_SENDER_ID} maxLength={11} className="h-12 border border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] focus:ring-2 focus:ring-[#ffd428]/20 focus:border-[#ffd428] bg-slate-50 dark:bg-white/5 transition-all text-slate-900 dark:text-white font-mono" {...field} />
                                                                </FormControl>
                                                                <p className="text-xs text-slate-500">{tr("The name customers see on SMS texts. Defaults to")}{" "}<span className="font-mono font-semibold">{DEFAULT_SENDER_ID}</span>{tr(". A custom sender ID must first be registered with the SMS provider.")}</p>
                                                                {!isView && field.value !== DEFAULT_SENDER_ID && (
                                                                    <button type="button" onClick={() => form.setValue("smsSender", DEFAULT_SENDER_ID, { shouldDirty: true, shouldValidate: true })} className="text-xs font-semibold text-[#242a37] dark:text-[#ffd428] underline underline-offset-4 cursor-pointer">
                                                                        {tr("Use the default ({DEFAULT_SENDER_ID})", { DEFAULT_SENDER_ID })}</button>
                                                                )}
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="logo" className="border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 px-6 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <p className="text-xs font-semibold text-[#242a37] dark:text-[#ffd428]">{tr("Logo and Identity")}</p>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-6 pt-2 border-t border-slate-100 dark:border-white/5">
                                                <div className="mt-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="logoUrl"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400">{tr("Company Logo")}</FormLabel>
                                                                <FormControl>
                                                                    <div className="space-y-4">
                                                                        <div 
                                                                            className={cn(
                                                                                "w-full h-40 rounded-[var(--ds-radius-small)] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
                                                                                field.value ? "border-[#ffd428]/50 bg-[#ffd428]/5" : "border-slate-200 dark:border-white/10 hover:border-[#ffd428]/30 bg-slate-50 dark:bg-white/5"
                                                                            )}
                                                                            onClick={() => !isView && fileInputRef.current?.click()}
                                                                        >
                                                                            {field.value ? (
                                                                                <>
                                                                                    <img src={field.value} alt={tr("Logo Preview")} className="max-h-32 object-contain transitions-all duration-300" />
                                                                                    {!isView && (
                                                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                                            <Button 
                                                                                                type="button" 
                                                                                                variant="ghost" 
                                                                                                className="text-white text-xs font-bold hover:bg-white/20 h-8"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    fileInputRef.current?.click();
                                                                                                }}
                                                                                            >{tr("Change")}</Button>
                                                                                            <Button 
                                                                                                type="button" 
                                                                                                variant="ghost" 
                                                                                                className="text-rose-400 text-xs font-bold hover:bg-rose-500/20 h-8"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    field.onChange("");
                                                                                                    logoFileRef.current = null;
                                                                                                }}
                                                                                            >{tr("Remove")}</Button>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Icon icon={OfficeIcon} size={24} className="text-slate-400 mb-2" />
                                                                                    <p className="text-xs font-bold text-slate-500">{tr("Select Image")}</p>
                                                                                    <p className="text-xs text-slate-400 mt-1">{tr("PNG or JPG, up to 3 MB")}</p>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <input 
                                                                            ref={fileInputRef}
                                                                            type="file" 
                                                                            accept="image/png,image/jpeg" 
                                                                            className="hidden" 
                                                                            disabled={isView}
                                                                            onChange={(e) => {
                                                                                const file = e.target.files?.[0]
                                                                                e.target.value = ""
                                                                                if (file) {
                                                                                    // Same limits as the API: PNG or JPG, up to 3 MB
                                                                                    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
                                                                                        toast({ variant: "destructive", title: tr("Use a PNG or JPG image") })
                                                                                        return
                                                                                    }
                                                                                    if (file.size > 3 * 1024 * 1024) {
                                                                                        toast({ variant: "destructive", title: tr("Logo is too large"), description: tr("Pick an image up to 3 MB.") })
                                                                                        return
                                                                                    }
                                                                                    logoFileRef.current = file
                                                                                    const reader = new FileReader()
                                                                                    reader.onloadend = () => {
                                                                                        field.onChange(reader.result as string)
                                                                                    }
                                                                                    reader.readAsDataURL(file)
                                                                                }
                                                                            }} 
                                                                        />
                                                                    </div>
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value="options" className="border border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 px-6 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <p className="text-xs font-semibold text-[#242a37] dark:text-[#ffd428]">{tr("App Options")}</p>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-6 pt-2 border-t border-slate-100 dark:border-white/5">
                                                <div className="mt-4 space-y-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="showVehicleOnReceive"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-row items-center justify-between p-2">
                                                                <div className="space-y-0.5 text-left">
                                                                    <FormLabel className="text-xs font-bold">{tr("Show Vehicle on Receive")}</FormLabel>
                                                                    <p className="text-xs text-slate-500">{tr("Enable vehicle selection during cargo reception")}</p>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch disabled={isView} checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="isActive"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-row items-center justify-between p-2 border-t border-slate-100 dark:border-white/5 pt-4">
                                                                <div className="space-y-0.5 text-left">
                                                                    <FormLabel className="text-xs font-bold">{tr("Company Status")}</FormLabel>
                                                                    <p className="text-xs text-slate-500">{tr("Inactive companies can't send or receive parcels")}</p>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch disabled={isView} checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>

                                    {!isView && (
                                        <div className="pt-4 flex gap-3">
                                            <Button type="button" variant="outline" onClick={() => setActiveTab("channels")} className="flex-1 h-12 rounded-[var(--ds-radius-small)] font-bold cursor-pointer">{tr("Back")}</Button>
                                            <Button type="button" onClick={() => setActiveTab("review")} className="flex-[2] h-12 rounded-[var(--ds-radius-small)] bg-[#242a37] text-white font-bold cursor-pointer">{tr("Review and Submit")}</Button>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="review" className="m-0 space-y-6">
                                    <div className="bg-white dark:bg-white/5 p-8 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-8">
                                        <div className="text-center space-y-2">
                                            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                                                <Icon icon={Tick02Icon} size={32} />
                                            </div>
                                            <h3 className="text-xl font-semibold">{tr("Final Verification")}</h3>
                                            <p className="text-xs text-slate-500 font-bold">{tr("Please review all company details before submission")}</p>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-10 text-xs border-y border-slate-100 dark:border-white/5 py-8 text-left">
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("Company Name")}</p>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{form.getValues("name") || "---"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("Tax ID (TIN)")}</p>
                                                <p className="font-semibold text-sm font-mono text-blue-500">{form.getValues("tin") || "---"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("Primary Phone")}</p>
                                                <p className="font-semibold text-sm tabular-nums text-slate-900 dark:text-white">{form.getValues("phoneNumber") || "---"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("Official Email")}</p>
                                                <p className="font-semibold text-sm lowercase text-slate-900 dark:text-white">{form.getValues("email") || "---"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("Website")}</p>
                                                <p className="font-semibold text-sm lowercase truncate max-w-[150px] text-slate-900 dark:text-white">{form.getValues("website") || "---"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("Help Desk")}</p>
                                                <p className="font-semibold text-sm tabular-nums text-slate-900 dark:text-white">{form.getValues("helpDeskPhoneNumber") || "---"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("SMS sender ID")}</p>
                                                <p className="font-mono font-semibold text-sm text-slate-900 dark:text-white">{form.getValues("smsSender") || DEFAULT_SENDER_ID}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold mb-1">{tr("Status")}</p>
                                                <Badge className={cn("text-xs font-semibold px-2 py-0.5 rounded", form.getValues("isActive") ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                                                    {form.getValues("isActive") ? tr("Active") : tr("Disabled")}
                                                </Badge>
                                            </div>
                                            <div className="col-span-2 lg:col-span-3">
                                                <p className="text-slate-400 font-bold mb-1">{tr("Official Address")}</p>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white leading-relaxed">{form.getValues("address") || "---"}</p>
                                            </div>
                                        </div>

                                        <div className="col-span-2 lg:col-span-3 pt-4 border-t border-slate-100 dark:border-white/5 space-y-6">
                                            <div>
                                                <p className="text-slate-400 font-bold mb-3 text-xs text-left">{tr("Branding Identity")}</p>
                                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-small)] border border-slate-100 dark:border-white/5 w-max min-w-full text-left">
                                                    {form.getValues("logoUrl") ? (
                                                        <div className="size-16 rounded-[var(--ds-radius-small)] overflow-hidden border border-slate-200 dark:border-white/10 bg-white">
                                                            <img src={form.getValues("logoUrl")} className="size-full object-contain" alt={tr("Logo Preview")} />
                                                        </div>
                                                    ) : (
                                                        <div className="size-16 rounded-[var(--ds-radius-small)] bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-300">
                                                            <Icon icon={OfficeIcon} size={24} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-xs font-semibold text-[#242a37] dark:text-white">{tr("Company details")}</p>
                                                        <p className="text-xs font-bold text-slate-400 mt-1">
                                                            {form.getValues("logoUrl") ? tr("Uploaded") : tr("No Logo Provided (Default Branding)")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4 p-5 bg-[#ffd428]/5 border border-[#ffd428]/20 rounded-[var(--ds-radius-large)] text-left">
                                                <div className="size-8 rounded-full bg-[#ffd428] flex items-center justify-center text-[#242a37] flex-shrink-0">
                                                    <Icon icon={Message01Icon} size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-[#242a37] dark:text-[#ffd428] mb-1">{tr("Communication Channel")}</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">{tr("Customers get SMS texts from")}{" "}<span className="font-mono text-[#242a37] dark:text-white font-semibold">{form.getValues("smsSender") || DEFAULT_SENDER_ID}</span>{(form.getValues("smsSender") || DEFAULT_SENDER_ID) === DEFAULT_SENDER_ID ? tr(" (the default)") : ""}.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!isView && (
                                        <div className="pt-4 flex gap-3 pb-10">
                                            <Button type="button" variant="outline" onClick={() => setActiveTab("branding")} className="flex-1 h-12 rounded-[var(--ds-radius-small)] font-bold cursor-pointer">{tr("Back")}</Button>
                                            <Button 
                                                type="submit" 
                                                disabled={isLoading || !form.formState.isValid} 
                                                className="flex-[2] h-12 rounded-[var(--ds-radius-large)] bg-[#ffd428] hover:bg-[#ffc107] text-[#242a37] font-semibold shadow-[var(--ds-shadow-raised)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                {isLoading ? tr("Executing...") : internalMode === "edit" ? tr("Update Corporate Profile") : tr("Register Logistics Entity")}
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </form>
                </Form>
                )}
            </div>
        </div>
    )
}

interface CompanyModalProps {
    open: boolean
    setOpen: (open: boolean) => void
    company?: Company | null
    onSubmit: (values: any) => Promise<void>
    onDelete?: (company: Company, data?: { reason: string, permanent: boolean }) => void
    isLoading?: boolean
    mode?: "view" | "edit" | "create" | "delete"
}

export function CompanyModal({
                                 open,
                                 setOpen,
                                 company,
                                 onSubmit,
                                 onDelete,
                                 isLoading = false,
                                 mode,
                             }: CompanyModalProps) {
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 overflow-hidden border-0 rounded-none shadow-[var(--ds-shadow-raised)] bg-white dark:bg-[#0f172a] flex flex-col h-full inset-y-0 right-0 outline-none [&>button]:hidden">
                <CompanyForm 
                    company={company}
                    onSubmit={onSubmit}
                    onDelete={onDelete}
                    isLoading={isLoading}
                    mode={mode}
                    onClose={() => setOpen(false)}
                />
            </SheetContent>
        </Sheet>
    )
}