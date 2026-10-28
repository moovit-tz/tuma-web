"use client"
import { Icon } from "@/components/ui/icon"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { 
    UserGroupIcon,
    UserAccountIcon,
    Shield01Icon,
    Building03Icon,
    Tick01Icon,
    Cancel01Icon,
    InformationCircleIcon,
    Search01Icon,
    Settings01Icon,
    CheckListIcon,
    MapsLocation01Icon,
    Wallet01Icon,
    PercentCircleIcon,
    Money01Icon,
    Tick02Icon
} from "@hugeicons/core-free-icons"
import { getCompanies } from "@/lib/services/company"
import { getRegions, getBookingOffices } from "@/lib/services/location"
import { getBeneficiaries, type Beneficiary } from "@/lib/services/beneficiary"
import { userService } from "@/lib/services/user"
import type { User as UserType } from "@/types/user"
import { motion, AnimatePresence } from "framer-motion"
import { CountryCodePicker } from "@/components/ui/country-code-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useTr } from "@/lib/i18n/portal"

const formSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    username: z.string().min(3, "Username must be at least 3 characters."),
    phoneNumber: z.string().min(9, "Invalid phone number."),
    email: z.string().email("Invalid email address.").or(z.literal("")).optional(),
    companyId: z.string().min(1, "Please select a company."),
    roles: z.string().default("AGENT"),
    gender: z.string().default("MALE"),
    regionId: z.string().min(1, "Please select a region."),
    bookingOfficeId: z.string().min(1, "Please select an office."),
    isActive: z.boolean().default(true),
    enableFloat: z.boolean().default(false),
    floatType: z.string().optional(),
    configurationType: z.string().optional(),
    commissionType: z.string().optional(),
    commissionPercentage: z.string().optional(),
    commissionAmount: z.string().optional(),
    mainPoolId: z.string().optional(),
    enableBeneficiaries: z.boolean().default(false),
    beneficiaryIds: z.array(z.number()).default([]),
})

interface AgentEditModalProps {
    isOpen: boolean
    onClose: () => void
    agent: UserType | null
    onSave: (id: number, formData: any) => Promise<any>
    onAgentRefresh: () => void
    isLoading?: boolean
}

export function AgentEditModal({ isOpen, onClose, agent, onSave, onAgentRefresh, isLoading = false }: AgentEditModalProps) {
    const tr = useTr()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("profile")
    const [companies, setCompanies] = useState<{ id: number; name: string }[]>([])
    const [regions, setRegions] = useState<any[]>([])
    const [bookingOffices, setBookingOffices] = useState<any[]>([])
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
    const [poolMainUsers, setPoolMainUsers] = useState<any[]>([])
    const [poolUserOpen, setPoolUserOpen] = useState(false)
    const [beneficiaryOpen, setBeneficiaryOpen] = useState(false)

    const formatPhoneNumber = (value: string) => {
        if (!value.startsWith("+255")) {
            if (value.startsWith("0")) return "+255" + value.slice(1);
            if (value.startsWith("255")) return "+" + value;
            return "+255" + value;
        }
        return value;
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            username: "",
            phoneNumber: "",
            email: "",
            companyId: "",
            roles: "AGENT",
            gender: "MALE",
            regionId: "",
            bookingOfficeId: "",
            isActive: true,
            enableFloat: false,
            floatType: "INDIVIDUAL",
            configurationType: "FULL_AMOUNT",
            commissionType: "PERCENTAGE",
            commissionPercentage: "",
            commissionAmount: "",
            mainPoolId: "",
            enableBeneficiaries: false,
            beneficiaryIds: [],
        },
    })

    const watchedRegionId = form.watch("regionId")
    const watchedEnableFloat = form.watch("enableFloat")
    const watchedFloatType = form.watch("floatType")
    const watchedCommType = form.watch("commissionType")
    const watchedEnableBen = form.watch("enableBeneficiaries")
    const watchedBenIds = form.watch("beneficiaryIds")

    const filteredOffices = watchedRegionId 
        ? bookingOffices.filter(o => o.regionId?.toString() === watchedRegionId)
        : bookingOffices

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Use allSettled to ensure that one endpoint failing doesn't break the entire modal context
                const results = await Promise.allSettled([
                    getCompanies({ all: true, limit: 1000 }),
                    getRegions({ paginate: false, limit: 1000 }),
                    getBookingOffices({ paginate: false, limit: 1000 }),
                    getBeneficiaries({ limit: 1000 }),
                    userService.getPoolMainUsers()
                ]);

                // Normalize results with safe fallbacks
                const [compRes, regRes, offRes, benRes, poolRes] = results;

                if (compRes.status === 'fulfilled') {
                    const data = compRes.value;
                    const list = data.data || (data as any).companies || data || [];
                    setCompanies(Array.isArray(list) ? list : []);
                }

                // Safe Region Extraction
                if (regRes.status === 'fulfilled') {
                    const data = regRes.value;
                    const list = data.data || (data as any).regions || data || [];
                    setRegions(Array.isArray(list) ? list : []);
                }

                // Safe Office Extraction
                if (offRes.status === 'fulfilled') {
                    const data = offRes.value;
                    const list = data.data || (data as any).bookingOffices || (data as any).offices || data || [];
                    setBookingOffices(Array.isArray(list) ? list : []);
                }

                if (benRes.status === 'fulfilled') {
                    const data = benRes.value;
                    const list = data.data || (data as any).beneficiaries || data || [];
                    setBeneficiaries(Array.isArray(list) ? list : []);
                }

                if (poolRes.status === 'fulfilled') {
                    const data = poolRes.value;
                    const list = data.data || (data as any).users || data || [];
                    setPoolMainUsers(Array.isArray(list) ? list : []);
                }
            } catch (error) {
                console.error("Critical error in AgentEdit data orchestration:", error);
            }
        }
        if (isOpen) loadInitialData()
    }, [isOpen])



    useEffect(() => {
        if (agent && isOpen) {
            const beneficiaryIds = (agent as any).userBeneficiaries?.map((ub: any) => ub.beneficiaryId) || []

            form.reset({
                fullName: agent.fullName || "",
                username: agent.username || "",
                phoneNumber: agent.phoneNumber ? (agent.phoneNumber.startsWith("+") ? agent.phoneNumber : "+" + agent.phoneNumber) : "+255",
                email: agent.email || "",
                companyId: agent.companyId?.toString() || "",
                roles: agent.role || "AGENT",
                gender: agent.gender || "MALE",
                regionId: agent.regionId?.toString() || "",
                bookingOfficeId: agent.bookingOfficeId?.toString() || "",
                isActive: agent.isActive ?? true,
                enableFloat: agent.isUsingFloat ?? false,
                floatType: agent.floatSettings?.floatType || agent.defaultFloatType || "INDIVIDUAL",
                configurationType: agent.floatSettings?.configurationType || agent.defaultFloatConfigurationType || "FULL_AMOUNT",
                commissionType: (agent.floatSettings as any)?.commissionType || (agent.floatSettings?.commissionPercentage !== undefined ? "PERCENTAGE" : "AMOUNT") || "PERCENTAGE",
                commissionPercentage: (agent.floatSettings?.commissionPercentage ?? agent.defaultCommissionPercentage ?? "").toString(),
                commissionAmount: (agent.floatSettings?.commissionAmount ?? agent.defaultCommissionAmount ?? "").toString(),
                mainPoolId: agent.floatSettings?.mainPoolId?.toString() || agent.defaultMainPoolId?.toString() || "",
                enableBeneficiaries: beneficiaryIds.length > 0,
                beneficiaryIds,
            })
        }
    }, [agent, isOpen, form])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!agent?.id) return
        try {
            const updatePayload = {
                fullName: values.fullName.trim(),
                email: values.email?.trim() || null,
                gender: values.gender.toUpperCase(),
                userRegions: [{ regionId: parseInt(values.regionId), isPrimary: true, isActive: true }],
                userOffices: [{ officeId: parseInt(values.bookingOfficeId), isPrimary: true, isActive: true }],
                beneficiaryIds: values.enableBeneficiaries ? values.beneficiaryIds : [],
                isActive: values.isActive,
                phoneNumber: values.phoneNumber.replace("+", ""),
                role: values.roles,
            }

            await userService.updateUser(agent.id, updatePayload)

            const floatPayload = {
                enableFloat: values.enableFloat,
                floatType: values.floatType || null,
                configurationType: values.configurationType || null,
                commissionType: values.commissionType || null,
                commissionPercentage: values.commissionPercentage ? parseFloat(values.commissionPercentage) : null,
                commissionAmount: values.commissionAmount ? parseFloat(values.commissionAmount) : null,
                mainPoolId: values.mainPoolId ? parseInt(values.mainPoolId) : null,
            }
            await userService.updateUserFloatConfig(agent.id, floatPayload)

            toast({
                title: tr("Agent Updated"),
                description: tr("Agent profile has been successfully updated."),
            })
            onAgentRefresh()
            onClose()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: tr("Update Failed"),
                description: error.message || "An error occurred while updating the agent.",
            })
        }
    }

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    if (!agent) return null

    return <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Edit Agent Details")}</SheetTitle>
                    <SheetDescription>{tr("Update the agent's profile and settings.")}</SheetDescription>
                </SheetHeader>
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {/* Header: Brand Standard Design */}
                    <div className="text-white relative p-8 bg-[#242a37] border-b border-white/10 overflow-hidden">
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <Avatar className="size-24 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border-4 border-white dark:border-[#242a37]">
                                        <AvatarFallback className="bg-slate-900 text-white font-bold text-2xl">
                                            {getInitials(agent.fullName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("absolute -right-1.5 -bottom-1.5 size-7 rounded-full border-4 border-white dark:border-[#1a1f2b] shadow-[var(--ds-shadow-raised)] flex items-center justify-center", agent.isActive ? "bg-emerald-500" : "bg-slate-400")}>
                                        {agent.isActive ? <Icon icon={Tick01Icon} size={12} className="text-white" /> : <Icon icon={Cancel01Icon} size={12} className="text-white" />}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-none">
                                            {agent.fullName}
                                        </h2>
                                        <Badge className="bg-blue-500/10 text-blue-600 font-semibold text-[11px] px-3 py-1 rounded-[6px] border-none">{tr("EDIT MODE")}</Badge>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Icon icon={Shield01Icon} className="size-3.5 text-blue-500" />{tr("AGENT PROFILE")}{" "}<span className="text-slate-200 dark:text-white/10"></span> {agent.username}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={onClose}
                                    variant="outline"
                                    className="h-14 w-14 p-0 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-slate-400 hover:text-rose-500 transition-colors hover:bg-rose-500/5 group"
                                >
                                    <Icon icon={Cancel01Icon} className="size-5 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                                    <div className="px-8 bg-white dark:bg-[#1a1f2b] border-b border-slate-200 dark:border-white/5">
                                        <TabsList className="h-16 w-full flex justify-start gap-8 bg-transparent p-0">
                                            {[
                                                { value: "profile", label: tr("Agent Information"), icon: UserAccountIcon },
                                                { value: "liquidity", label: tr("Finance Layer"), icon: Wallet01Icon },
                                                { value: "diversion", label: tr("Payout Rules"), icon: UserGroupIcon },
                                                { value: "finalize", label: tr("Review & Save"), icon: Settings01Icon },
                                            ].map((tab) => (
                                                <TabsTrigger 
                                                    key={tab.value}
                                                    value={tab.value}
                                                    className="h-full border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 text-xs font-semibold text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-blue-500 transition-all flex items-center gap-3"
                                                >
                                                    <Icon icon={tab.icon} size={16} />
                                                    {tab.label}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </div>

                                    <ScrollArea className="flex-1 p-8 bg-slate-50 dark:bg-[#0f1218]">
                                        <AnimatePresence mode="wait">
                                            <TabsContent value="profile" className="m-0 space-y-8 focus:outline-none">
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="fullName"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("Full Name")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} className="h-14 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 font-bold" />
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
                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("Phone Number")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input 
                                                                            {...field} 
                                                                            placeholder="+255..."
                                                                            className="h-14 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 font-bold focus:ring-[#ffd428]" 
                                                                            onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="email"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("Email Address (Optional)")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} type="email" className="h-14 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 font-bold" />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="space-y-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="username"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("Username")}</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} className="h-14 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 font-bold" />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="isActive"
                                                            render={({ field }) => (
                                                                <FormItem className="flex items-center justify-between p-6 bg-white dark:bg-white/5 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/10">
                                                                    <div className="space-y-1">
                                                                        <FormLabel className="text-xs font-semibold leading-none">{tr("Status:")}{" "}{field.value ? "ACTIVE" : "INACTIVE"}</FormLabel>
                                                                        <FormDescription className="text-xs font-bold opacity-50">{tr("Current account accessibility")}</FormDescription>
                                                                    </div>
                                                                    <FormControl>
                                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="roles"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("System Role")}</FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-14 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Icon icon={Shield01Icon} size={18} className="text-purple-500" />
                                                                                    <SelectValue placeholder={tr("SELECT ROLE")} className="text-xs font-semibold" />
                                                                                </div>
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                            <SelectItem value="AGENT" className="rounded-md text-xs font-semibold py-3 font-sans">{tr("FIELD AGENT")}</SelectItem>
                                                                            <SelectItem value="SUPER_AGENT" className="rounded-md text-xs font-semibold py-3 font-sans">{tr("SUPER AGENT")}</SelectItem>
                                                                            <SelectItem value="TRIP_AGENT" className="rounded-md text-xs font-semibold py-3 font-sans">{tr("TRIP OPERATOR")}</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="gender"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("Gender Identity")}</FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-14 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Icon icon={UserAccountIcon} size={18} className="text-blue-500" />
                                                                                    <SelectValue placeholder={tr("SELECT GENDER")} className="text-xs font-semibold" />
                                                                                </div>
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                            <SelectItem value="MALE" className="rounded-md text-xs font-semibold py-3 font-sans">MALE</SelectItem>
                                                                            <SelectItem value="FEMALE" className="rounded-md text-xs font-semibold py-3 font-sans">FEMALE</SelectItem>
                                                                            <SelectItem value="OTHER" className="rounded-md text-xs font-semibold py-3 font-sans">OTHER</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>

                                                <Card className="rounded-[var(--ds-radius-small)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] overflow-hidden shadow-[var(--ds-shadow-raised)] mt-12">
                                                    <CardHeader className="p-8 border-b border-slate-50 dark:border-white/5 flex flex-row items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-10 rounded-[var(--ds-radius-small)] bg-blue-500/10 flex items-center justify-center">
                                                                <Icon icon={CheckListIcon} className="size-5 text-blue-600" />
                                                            </div>
                                                            <CardTitle className="text-xl font-semibold">{tr("Company Assignment")}</CardTitle>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-8 grid grid-cols-2 gap-8">
                                                        <FormField
                                                            control={form.control}
                                                            name="companyId"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("Assigned Company")}</FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-14 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 px-6 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Icon icon={Building03Icon} size={18} className="text-indigo-500" />
                                                                                    <SelectValue placeholder={tr("CHOOSE COMPANY")} className="text-xs font-semibold" />
                                                                                </div>
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                            {companies.map(c => {
                                                                                const region = regions.find(r => r.id === (c as any).regionId || r.id === (c as any).registrationRegionId);
                                                                                const office = bookingOffices.find(o => o.id === (c as any).bookingOfficeId || o.id === (c as any).primaryOfficeId);
                                                                                return (
                                                                                    <SelectItem key={c.id} value={c.id.toString()} className="rounded-md text-xs font-semibold py-3">
                                                                                        <div className="flex flex-col">
                                                                                            <span>{c.name}</span>
                                                                                            {(region || office) && (
                                                                                                <span className="text-xs opacity-40 font-mono mt-0.5">
                                                                                                    [{region?.name || '---'} · {office?.name || '---'}]
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </SelectItem>
                                                                                );
                                                                            })}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="regionId"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-xs font-semibold text-slate-400">{tr("Region")}</FormLabel>
                                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger className="h-14 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 px-6 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <Icon icon={MapsLocation01Icon} size={18} className="text-orange-500" />
                                                                                        <SelectValue placeholder={tr("SELECT REGION")} className="text-xs font-semibold" />
                                                                                    </div>
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                                {regions.map(r => (
                                                                                    <SelectItem key={r.id} value={r.id.toString()} className="rounded-md text-xs font-semibold py-3">{r.name}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="bookingOfficeId"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-xs font-semibold text-slate-400">{tr("Booking Office")}</FormLabel>
                                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger className="h-14 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <Icon icon={CheckListIcon} size={18} className="text-emerald-500" />
                                                                                        <SelectValue placeholder={watchedRegionId ? tr("SELECT OFFICE") : tr("SELECT OFFICE (GLOBAL)")} className="text-xs font-semibold" />
                                                                                    </div>
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                                {!watchedRegionId ? (
                                                                                    bookingOffices.map(o => {
                                                                                        const region = regions.find(r => r.id === o.regionId);
                                                                                        return (
                                                                                            <SelectItem key={o.id} value={o.id.toString()} className="rounded-md text-xs font-semibold py-3 font-sans">
                                                                                                <div className="flex flex-col">
                                                                                                    <span>{o.name}</span>
                                                                                                    <span className="text-xs opacity-40 font-mono mt-0.5">[{region?.name || '---'}]</span>
                                                                                                </div>
                                                                                            </SelectItem>
                                                                                        )
                                                                                    })
                                                                                ) : (
                                                                                    filteredOffices.map(o => (
                                                                                        <SelectItem key={o.id} value={o.id.toString()} className="rounded-md text-xs font-semibold py-3 font-sans">{o.name}</SelectItem>
                                                                                    ))
                                                                                )}
                                                                                {(watchedRegionId ? filteredOffices : bookingOffices).length === 0 && (
                                                                                    <SelectItem value="none" disabled className="text-xs font-semibold py-3 font-sans">{tr("NO OFFICES AVAILABLE")}</SelectItem>
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="liquidity" className="m-0 space-y-8 focus:outline-none">
                                                <div className="flex items-center justify-between p-8 bg-slate-900 rounded-[var(--ds-radius-large)] border border-white/10 shadow-3xl">
                                                    <div className="flex items-center gap-6">
                                                        <div className="size-16 rounded-[var(--ds-radius-large)] bg-blue-600 flex items-center justify-center text-white shadow-[var(--ds-shadow-raised)]">
                                                            <Icon icon={Wallet01Icon} size={32} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-bold text-white leading-none mb-2">{tr("Float Setup")}</h3>
                                                            <p className="text-xs font-semibold text-white/40">{tr("Configure float & commission rules")}</p>
                                                        </div>
                                                    </div>
                                                    <FormField
                                                        control={form.control}
                                                        name="enableFloat"
                                                        render={({ field }) => (
                                                            <FormControl>
                                                                <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-125" />
                                                            </FormControl>
                                                        )}
                                                    />
                                                </div>

                                                <AnimatePresence>
                                                    {watchedEnableFloat && (
                                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                                                            <div className="grid grid-cols-2 gap-8">
                                                                <FormField
                                                                    control={form.control}
                                                                    name="floatType"
                                                                    render={({ field }) => (
                                                                        <FormItem className="space-y-4">
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Float Type")}</FormLabel>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                {["INDIVIDUAL", "POOL"].map((type) => (
                                                                                    <button key={type} type="button" onClick={() => field.onChange(type)} className={cn("h-16 rounded-[var(--ds-radius-small)] border-2 transition-all flex items-center justify-center gap-3", field.value === type ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 hover:border-slate-300")}>
                                                                                        {type === "POOL" ? <Icon icon={UserGroupIcon} size={18} /> : <Icon icon={UserAccountIcon} size={18} />}
                                                                                        <span className="text-xs font-semibold font-mono">{type}</span>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </FormItem>
                                                                    )}
                                                                />

                                                                {watchedFloatType === "POOL" && (
                                                                    <FormField
                                                                        control={form.control}
                                                                        name="mainPoolId"
                                                                        render={({ field }) => (
                                                                            <FormItem className="space-y-4">
                                                                                <FormLabel className="text-xs font-semibold text-slate-400">{tr("Select Main Pool Agent")}</FormLabel>
                                                                                <Popover open={poolUserOpen} onOpenChange={setPoolUserOpen}>
                                                                                    <PopoverTrigger asChild>
                                                                                        <FormControl>
                                                                                            <Button variant="outline" className="w-full h-16 justify-between rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 px-6 font-bold">
                                                                                                {field.value ? poolMainUsers.find(u => u.id.toString() === field.value)?.fullName : tr("Select Pool Agent")}
                                                                                                <Icon icon={Search01Icon} size={16} className="opacity-50" />
                                                                                            </Button>
                                                                                        </FormControl>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0 rounded-[var(--ds-radius-small)] border-none shadow-3xl">
                                                                                        <Command className="rounded-[var(--ds-radius-small)]">
                                                                                            <CommandInput placeholder={tr("Search Agents...")} className="h-14" />
                                                                                            <CommandList className="max-h-[300px] custom-scrollbar">
                                                                                                <CommandEmpty>{tr("No pool agents found.")}</CommandEmpty>
                                                                                                <CommandGroup>
                                                                                                    {poolMainUsers.map(user => (
                                                                                                        <CommandItem key={user.id} value={user.fullName} onSelect={() => { field.onChange(user.id.toString()); setPoolUserOpen(false) }} className="h-12 rounded-[var(--ds-radius-small)] m-1">
                                                                                                            <div className="flex items-center gap-3">
                                                                                                                <div className="size-8 rounded-[4px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-xs">{getInitials(user.fullName)}</div>
                                                                                                                <span className="font-bold">{user.fullName}</span>
                                                                                                            </div>
                                                                                                        </CommandItem>
                                                                                                    ))}
                                                                                                </CommandGroup>
                                                                                            </CommandList>
                                                                                        </Command>
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-8">
                                                                <FormField
                                                                    control={form.control}
                                                                    name="configurationType"
                                                                    render={({ field }) => (
                                                                        <FormItem className="space-y-4">
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Configuration Type")}</FormLabel>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                {["FULL_AMOUNT", "PERCENTAGE"].map((ct) => (
                                                                                    <button key={ct} type="button" onClick={() => field.onChange(ct)} className={cn("h-16 rounded-[var(--ds-radius-small)] border-2 transition-all flex flex-col items-center justify-center", field.value === ct ? "bg-slate-900 text-white border-slate-900" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 hover:border-slate-300")}>
                                                                                        <span className="text-xs font-semibold">{ct.replace("_", " ")}</span>
                                                                                        <span className="text-xs font-bold opacity-40">{tr("System Default")}</span>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </FormItem>
                                                                    )}
                                                                />

                                                                <FormField
                                                                    control={form.control}
                                                                    name="commissionType"
                                                                    render={({ field }) => (
                                                                        <FormItem className="space-y-4">
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Commission Type")}</FormLabel>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                {["PERCENTAGE", "AMOUNT"].map((ct) => (
                                                                                    <button key={ct} type="button" onClick={() => field.onChange(ct)} className={cn("h-16 rounded-[var(--ds-radius-small)] border-2 transition-all flex items-center justify-center gap-3", field.value === ct ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 hover:border-slate-300")}>
                                                                                        {ct === "PERCENTAGE" ? <Icon icon={PercentCircleIcon} size={18} /> : <Icon icon={Money01Icon} size={18} />}
                                                                                        <span className="text-xs font-semibold font-mono">{ct}</span>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-8">
                                                                {watchedCommType === "PERCENTAGE" ? (
                                                                    <FormField
                                                                        control={form.control}
                                                                        name="commissionPercentage"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel className="text-xs font-semibold text-slate-400">{tr("Commission Percentage (%)")}</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input {...field} type="number" step="0.01" className="h-14 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 pl-6 pr-12 font-semibold" />
                                                                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</div>
                                                                                    </div>
                                                                                </FormControl>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                ) : (
                                                                    <FormField
                                                                        control={form.control}
                                                                        name="commissionAmount"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel className="text-xs font-semibold text-slate-400">{tr("Commission Amount (TZS)")}</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input {...field} type="number" className="h-14 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 pl-16 font-semibold" />
                                                                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-500">TZS</div>
                                                                                    </div>
                                                                                </FormControl>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </TabsContent>

                                            <TabsContent value="diversion" className="m-0 space-y-8 focus:outline-none">
                                                <div className="flex items-center justify-between p-8 bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] transition-colors hover:border-blue-500/30">
                                                    <div className="flex items-center gap-6">
                                                        <div className="size-16 rounded-[var(--ds-radius-small)] bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                            <Icon icon={UserGroupIcon} size={32} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-2">{tr("Beneficiaries")}</h3>
                                                            <p className="text-xs font-semibold text-slate-400">{tr("Manage commission splits")}</p>
                                                        </div>
                                                    </div>
                                                    <FormField
                                                        control={form.control}
                                                        name="enableBeneficiaries"
                                                        render={({ field }) => (
                                                            <FormControl>
                                                                <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-125" />
                                                            </FormControl>
                                                        )}
                                                    />
                                                </div>

                                                <AnimatePresence>
                                                    {watchedEnableBen && (
                                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                                                            <div className="p-8 bg-slate-900 rounded-[var(--ds-radius-large)] border border-white/5 shadow-[var(--ds-shadow-raised)] relative overflow-hidden group">
                                                                <FormLabel className="text-xs font-semibold text-white/40 mb-6 block">{tr("Assigned Beneficiaries")}</FormLabel>
                                                                
                                                                <div className="grid grid-cols-2 gap-3 pb-8">
                                                                    {beneficiaries.filter(b => watchedBenIds.includes(b.id)).map(b => (
                                                                        <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[var(--ds-radius-small)] group/item">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="size-8 rounded-[4px] bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">{getInitials(b.name)}</div>
                                                                                <span className="text-xs font-bold text-white truncate max-w-[120px]">{b.name}</span>
                                                                            </div>
                                                                            <button type="button" onClick={() => form.setValue("beneficiaryIds", watchedBenIds.filter(id => id !== b.id))} className="size-6 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 transition-colors">
                                                                                <Icon icon={Cancel01Icon} size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    {watchedBenIds.length === 0 && (
                                                                        <div className="col-span-2 py-4 border border-dashed border-white/10 rounded-[var(--ds-radius-small)] text-center">
                                                                            <p className="text-xs font-semibold text-white/20">{tr("No beneficiaries assigned")}</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <Popover open={beneficiaryOpen} onOpenChange={setBeneficiaryOpen}>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="outline" className="w-full h-14 rounded-[var(--ds-radius-large)] bg-white text-slate-900 font-semibold border-none shadow-[var(--ds-shadow-raised)] transition-colors">{tr("Add Beneficiary")}</Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[min(450px,calc(100vw-2rem))] p-0 rounded-[var(--ds-radius-small)] border-none shadow-3xl">
                                                                        <Command className="rounded-[var(--ds-radius-small)]">
                                                                            <CommandInput placeholder={tr("Search Beneficiaries...")} className="h-16" />
                                                                            <CommandList className="max-h-[350px] custom-scrollbar">
                                                                                <CommandEmpty>{tr("No beneficiaries found.")}</CommandEmpty>
                                                                                <CommandGroup>
                                                                                    {beneficiaries.filter(b => !watchedBenIds.includes(b.id)).map(b => (
                                                                                        <CommandItem key={b.id} value={b.name} onSelect={() => { form.setValue("beneficiaryIds", [...watchedBenIds, b.id]); setBeneficiaryOpen(false) }} className="h-14 rounded-[var(--ds-radius-small)] m-2">
                                                                                            <div className="flex items-center gap-4">
                                                                                                <div className="size-10 rounded-[6px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-xs">{getInitials(b.name)}</div>
                                                                                                <div>
                                                                                                    <p className="font-semibold text-slate-900 dark:text-white">{b.name}</p>
                                                                                                    <p className="text-xs font-bold text-slate-400">{tr("Deduction:")}{" "}{b.deductionAmount || b.deduction_amount} TZS</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        </CommandItem>
                                                                                    ))}
                                                                                </CommandGroup>
                                                                            </CommandList>
                                                                        </Command>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </TabsContent>

                                            <TabsContent value="finalize" className="m-0 flex flex-col items-center justify-center min-h-[400px] focus:outline-none">
                                                <div className="size-32 bg-blue-600/10 rounded-[var(--ds-radius-large)] flex items-center justify-center mb-10 shadow-[var(--ds-shadow-raised)] relative">
                                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-4 border-dashed border-blue-600/20 rounded-[var(--ds-radius-large)]" />
                                                    <Icon icon={Settings01Icon} className="size-16 text-blue-600 animate-pulse" />
                                                </div>
                                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{tr("Save Changes")}</h2>
                                                <p className="text-xs font-semibold text-slate-400 max-w-sm text-center leading-relaxed mb-12">{tr("Confirm and save the updated profile for agent")}{" "}<span className="text-blue-600">@{form.getValues("username")}</span>.</p>
                                                
                                                <div className="bg-slate-900 p-8 rounded-[var(--ds-radius-large)] border border-white/5 w-full max-w-md shadow-3xl">
                                                    <div className="flex items-center gap-6 mb-8">
                                                        <Icon icon={InformationCircleIcon} size={28} className="text-blue-500 shrink-0" />
                                                        <p className="text-xs font-bold text-slate-400 leading-relaxed">{tr("Review all settings before saving. Changes will be applied immediately across the platform.")}</p>
                                                    </div>
                                                    
                                                    <Button 
                                                        type="submit" 
                                                        disabled={isLoading} 
                                                        className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[var(--ds-radius-large)] text-xs font-semibold shadow-[var(--ds-shadow-raised)] group"
                                                    >
                                                        {isLoading ? <LoadingSpinner size="sm" className="mr-3" /> : <Icon icon={Tick02Icon} className="mr-3 size-6 transition-transform" />}{tr("SAVE UPDATES")}</Button>
                                                </div>
                                            </TabsContent>
                                        </AnimatePresence>
                                    </ScrollArea>
                                </Tabs>
                            </form>
                        </Form>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
}