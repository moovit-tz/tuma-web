"use client";
import { Icon } from "@/components/ui/icon"

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountryCodePicker } from "@/components/ui/country-code-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
    UserAccountIcon,
    Wallet01Icon,
    UserGroupIcon,
    Package01Icon,
    Shield01Icon,
    Building03Icon,
    MapsLocation01Icon,
    CallIcon,
    Mail01Icon,
    Tick01Icon,
    Cancel01Icon,
    ArrowRight01Icon,
    ArrowLeft01Icon,
    Money01Icon,
    PercentCircleIcon,
    Activity01Icon,
    InformationCircleIcon,
    Search01Icon,
    CheckListIcon,
    GridViewIcon,
    ContactIcon,
    PackageIcon,
    Settings01Icon,
    Tick02Icon,
    Delete02Icon,
    CheckmarkBadge01Icon,
    NoteIcon,
    WorkflowSquare01Icon
} from "@hugeicons/core-free-icons";
import { usePermissions } from "@/hooks/use-permissions";
import { userService } from "@/lib/services/user";
import { getCompanies } from "@/lib/services/company";
import { getRegions, getBookingOffices } from "@/lib/services/location";
import { getBeneficiaries, type Beneficiary } from "@/lib/services/beneficiary";
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
    enableFloat: z.boolean().default(false),
    floatType: z.string().optional(),
    configurationType: z.string().optional(),
    commissionType: z.string().optional(),
    commissionPercentage: z.string().optional(),
    commissionAmount: z.string().optional(),
    mainPoolId: z.string().optional(),
    enableBeneficiaries: z.boolean().default(false),
    beneficiaryIds: z.array(z.number()).default([]),
});

const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

export function AgentModal({ isOpen, onClose, companies: companiesProp, regions: regionsProp, bookingOffices: bookingOfficesProp, onSave, onViewAgent, isLoading = false }: {
    isOpen: boolean;
    onClose: () => void;
    companies?: { id: number; name: string }[];
    regions?: any[];
    bookingOffices?: any[];
    onSave: (formData: any) => Promise<any>;
    onViewAgent?: (agent: any) => void;
    isLoading?: boolean;
}) {
    const tr = useTr()
    const { toast } = useToast();
    const { hasRole } = usePermissions();
    const [currentStep, setCurrentStep] = useState(0);
    const [createdAgent, setCreatedAgent] = useState<any>(null);
    const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [bookingOffices, setBookingOffices] = useState<any[]>([]);
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [poolMainUsers, setPoolMainUsers] = useState<any[]>([]);
    const [poolUserOpen, setPoolUserOpen] = useState(false);
    const [beneficiaryOpen, setBeneficiaryOpen] = useState(false);

    const formatPhoneNumber = (value: string) => {
        if (!value.startsWith("+255")) {
            if (value.startsWith("0")) return "+255" + value.slice(1);
            if (value.startsWith("255")) return "+" + value;
            return "+255" + value;
        }
        return value;
    };

    const steps = [
        { id: 0, label: tr("Personal Details"), icon: UserAccountIcon, description: tr("Contact & Location") },
        { id: 1, label: tr("Financial Setup"), icon: Wallet01Icon, description: tr("Float & Commissions") },
        { id: 2, label: tr("Review & Create"), icon: CheckListIcon, description: tr("Final Confirmation") },
    ];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            username: "",
            phoneNumber: "+255",
            email: "",
            companyId: "",
            roles: "AGENT",
            gender: "MALE",
            regionId: "",
            bookingOfficeId: "",
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
    });

    const watchedFullName = form.watch("fullName");
    const watchedRegionId = form.watch("regionId");
    const watchedEnableFloat = form.watch("enableFloat");
    const watchedFloatType = form.watch("floatType");
    const watchedConfigurationType = form.watch("configurationType");
    const watchedCommissionType = form.watch("commissionType");
    const watchedEnableBen = form.watch("enableBeneficiaries");
    const watchedBenIds = form.watch("beneficiaryIds");

    useEffect(() => {
        if (watchedFullName.trim() && !form.getValues("username")) {
            const base = watchedFullName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
            const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
            form.setValue("username", `${base}${suffix}`);
        }
    }, [watchedFullName, form]);

    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;

            // Prefer whatever the parent page already fetched — ops/agents,
            // for one, keeps a working, cached copy of exactly these three
            // lists (same underlying calls) for its own filters/table. Reuse
            // it instead of re-fetching independently, and only fall back to
            // fetching a resource ourselves if the parent didn't supply it.
            if (companiesProp && companiesProp.length > 0) setCompanies(companiesProp);
            if (regionsProp && regionsProp.length > 0) setRegions(regionsProp);
            if (bookingOfficesProp && bookingOfficesProp.length > 0) setBookingOffices(bookingOfficesProp);

            try {
                const [compResp, regResp, offResp, poolResp, benResp] = await Promise.allSettled([
                    (companiesProp && companiesProp.length > 0) ? Promise.resolve(null) : getCompanies({ limit: 1000, all: true }),
                    (regionsProp && regionsProp.length > 0) ? Promise.resolve(null) : getRegions({ paginate: false, limit: 1000 }),
                    (bookingOfficesProp && bookingOfficesProp.length > 0) ? Promise.resolve(null) : getBookingOffices({ paginate: false, limit: 1000 }),
                    userService.getPoolMainUsers(),
                    getBeneficiaries({ limit: 1000 })
                ]);

                // Safely extract company data (skipped — null — when the prop already covered it)
                if (compResp.status === 'fulfilled' && compResp.value !== null) {
                    const data = compResp.value;
                    const list = data.data || (data as any).companies || data || [];
                    setCompanies(Array.isArray(list) ? list : []);
                } else if (compResp.status === 'rejected') {
                    console.error("Companies Fetch Failed:", compResp.reason);
                }

                // Safely extract region data
                if (regResp.status === 'fulfilled' && regResp.value !== null) {
                    const data = regResp.value;
                    const list = data.data || (data as any).regions || data || [];
                    setRegions(Array.isArray(list) ? list : []);
                } else if (regResp.status === 'rejected') {
                    console.error("Regions Fetch Failed:", regResp.reason);
                }

                // Safely extract office data
                if (offResp.status === 'fulfilled' && offResp.value !== null) {
                    const data = offResp.value;
                    const list = data.data || (data as any).bookingOffices || (data as any).offices || data || [];
                    setBookingOffices(Array.isArray(list) ? list : []);
                } else if (offResp.status === 'rejected') {
                    console.error("Booking Offices Fetch Failed:", offResp.reason);
                }

                // Safely extract pool users
                if (poolResp.status === 'fulfilled') {
                    const data = poolResp.value;
                    const list = data.data || (data as any).users || data || [];
                    setPoolMainUsers(Array.isArray(list) ? list : []);
                } else {
                    console.error("Pool Users Fetch Failed:", poolResp.reason);
                }

                // Safely extract beneficiaries
                if (benResp.status === 'fulfilled') {
                    const data = benResp.value;
                    const list = data.data || (data as any).beneficiaries || data || [];
                    setBeneficiaries(Array.isArray(list) ? list : []);
                } else {
                    console.error("Beneficiaries Fetch Failed:", benResp.reason);
                }
            } catch (error) {
                console.error("Data Fetch Logic Error:", error);
            }
        };
        fetchData();
        if (isOpen) {
            setCurrentStep(0);
            setCreatedAgent(null);
            form.reset();
        }
    }, [isOpen, form, companiesProp, regionsProp, bookingOfficesProp]);

    const filteredOffices = useMemo(() => {
        if (!watchedRegionId) return [];
        return bookingOffices.filter(o => String(o.regionId) === watchedRegionId);
    }, [watchedRegionId, bookingOffices]);

    const handleNext = async () => {
        let fieldsToValidate: any[] = [];
        if (currentStep === 0) {
            fieldsToValidate = ["fullName", "username", "phoneNumber", "companyId", "regionId", "bookingOfficeId"];
        } else if (currentStep === 1) {
            if (watchedEnableFloat && watchedFloatType === "POOL_LINKED") {
                fieldsToValidate = ["mainPoolId"];
            }
        }

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
        } else {
            toast({ variant: "destructive", title: tr("Missing Information"), description: tr("Please fill in all required fields to continue.") });
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const payload = {
                fullName: values.fullName,
                username: values.username,
                phoneNumber: values.phoneNumber,
                email: values.email || undefined,
                companyId: values.companyId,
                roles: [values.roles],
                gender: values.gender,
                userRegions: [{ regionId: Number(values.regionId), isPrimary: true, isActive: true }],
                userOffices: [{ officeId: Number(values.bookingOfficeId), isPrimary: true, isActive: true }],
                enableFloat: values.enableFloat,
                beneficiaryIds: values.enableBeneficiaries ? values.beneficiaryIds : [],
                ...(values.enableFloat && {
                    floatType: values.floatType,
                    configurationType: values.configurationType,
                    ...(values.floatType === "POOL_LINKED" && { mainPoolId: Number(values.mainPoolId) }),
                }),
            };
            const result = await onSave(payload);
            setCreatedAgent(result);
            toast({ title: tr("Success"), description: tr("Agent account created successfully.") });
        } catch (err: any) {
            toast({ variant: "destructive", title: tr("Error"), description: err.message || "Failed to create agent account. Please try again." });
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Add Agent")}</SheetTitle>
                    <SheetDescription>{tr("Enter the details to add a new agent to the system.")}</SheetDescription>
                </SheetHeader>
                
                <div className="flex flex-col h-full w-full overflow-hidden">
                    {/* Header: Brand Standard Design */}
                    <div className="text-white relative overflow-hidden flex-shrink-0 bg-[#242a37] border-b border-white/10 transition-colors duration-300">
                        <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10 pb-8">
                            <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        <div className="size-12 rounded-[var(--ds-radius-small)] bg-[#ffd428] flex items-center justify-center overflow-hidden">
                                            <Icon icon={UserAccountIcon} size={24} className="text-[#242a37]" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold m-0 p-0 leading-none">
                                                {createdAgent ? tr("Agent Created") : tr("New Agent")}
                                            </h2>
                                            <div className="text-slate-400 text-xs font-semibold mt-1.5 flex items-center gap-2">
                                                <div className="size-1.5 rounded-full bg-[#ffd428]" />{tr("Registration Flow")}</div>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="size-10 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded-full flex items-center justify-center transition cursor-pointer border-none outline-none text-slate-500 dark:text-white p-0"
                                >
                                    <Icon icon={Cancel01Icon} size={20} />
                                </Button>
                            </div>
                        </div>

                        {!createdAgent && (
                            <div className="flex border-t border-white/10 bg-black/20">
                                {steps.map((step, idx) => (
                                    <button
                                        key={step.id}
                                        type="button"
                                        disabled={currentStep < idx}
                                        onClick={() => {
                                            if (currentStep > idx) setCurrentStep(idx);
                                        }}
                                        className={cn(
                                            "flex-1 py-4 px-6 transition-all border-b-2 flex items-center gap-4 cursor-pointer group",
                                            idx === currentStep
                                                ? "border-[#ffd428] bg-white/5"
                                                : "border-transparent hover:bg-white/[0.02] disabled:opacity-30 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center transition-all duration-300",
                                            idx === currentStep
                                                ? "bg-[#ffd428] text-[#242a37] shadow-[var(--ds-shadow-raised)] scale-110"
                                                : idx < currentStep
                                                    ? "bg-emerald-500/10 text-emerald-500"
                                                    : "bg-white/5 text-white/40"
                                        )}>
                                            {idx < currentStep ? <Icon icon={Tick02Icon} className="size-5" /> : <Icon icon={step.icon} className="size-5" />}
                                        </div>

                                        <div className="flex flex-col text-left">
                                            <span className={cn(
                                                "text-xs font-semibold transition-colors",
                                                idx === currentStep ? "text-[#ffd428]" : idx < currentStep ? "text-emerald-500" : "text-white/40"
                                            )}>{step.label}</span>
                                            <span className="text-xs font-bold text-white/20 truncate max-w-[120px]">{step.description}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden relative bg-[#fafbfc] dark:bg-[#0f172a]">
                        {!createdAgent ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                                    <div className="flex-1 px-8 py-10 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10] custom-scrollbar pb-32">
                                        <Tabs value={currentStep.toString()} className="flex-1">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={currentStep}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                                    className="space-y-10 max-w-3xl mx-auto"
                                                >
                                                    <TabsContent value="0" className="m-0 border-none p-0 focus-visible:ring-0">
                                                        <div className="space-y-12">
                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                                                                    <div className="size-8 rounded-[var(--ds-radius-small)] bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                                        <Icon icon={ContactIcon} size={18} />
                                                                    </div>
                                                                    <h3 className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Basic Information")}</h3>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Full Name")}</FormLabel>
                                                                            <FormControl><Input placeholder={tr("e.g. John Doe")} className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold focus:ring-[#ffd428] transition-all" {...field} /></FormControl>
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                    <FormField control={form.control} name="username" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Username")}</FormLabel>
                                                                            <FormControl><Input placeholder={tr("e.g. jdoe123")} className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold" {...field} /></FormControl>
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Phone Number")}</FormLabel>
                                                                            <FormControl>
                                                                                <Input 
                                                                                    placeholder="+255..." 
                                                                                    className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold focus:ring-[#ffd428] transition-all" 
                                                                                    {...field}
                                                                                    onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                    <FormField control={form.control} name="email" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Email Address (Optional)")}</FormLabel>
                                                                            <FormControl><Input placeholder="email@example.com" className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold" {...field} /></FormControl>
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                                                                    <div className="size-8 rounded-[var(--ds-radius-small)] bg-orange-500/10 flex items-center justify-center text-orange-500">
                                                                        <Icon icon={GridViewIcon} size={18} />
                                                                    </div>
                                                                    <h3 className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Role & Location")}</h3>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <FormField control={form.control} name="roles" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Agent Role")}</FormLabel>
                                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <Icon icon={Shield01Icon} size={18} className="text-purple-500" />
                                                                                            <SelectValue placeholder={tr("SELECT ROLE")} className="text-xs font-semibold" />
                                                                                        </div>
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                                    <SelectItem value="AGENT" className="rounded-md text-xs font-semibold py-3">{tr("FIELD AGENT")}</SelectItem>
                                                                                    <SelectItem value="SUPER_AGENT" className="rounded-md text-xs font-semibold py-3">{tr("SUPER AGENT")}</SelectItem>
                                                                                    <SelectItem value="TRIP_AGENT" className="rounded-md text-xs font-semibold py-3">{tr("TRIP OPERATOR")}</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                    <FormField control={form.control} name="gender" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Gender")}</FormLabel>
                                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
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
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                </div>
                                                                 <FormField control={form.control} name="companyId" render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-xs font-semibold text-slate-400">{tr("Assigned Company")}</FormLabel>
                                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <Icon icon={Building03Icon} size={18} className="text-indigo-500" />
                                                                                        <SelectValue placeholder={tr("CHOOSE COMPANY")} className="text-xs font-semibold" />
                                                                                    </div>
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                                {companies.length === 0 ? (
                                                                                    <SelectItem value="none" disabled className="text-xs font-semibold py-3">{tr("NO COMPANIES LOADED")}</SelectItem>
                                                                                ) : companies.map(c => {
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
                                                                        <FormMessage className="text-xs font-semibold" />
                                                                    </FormItem>
                                                                )} />
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <FormField control={form.control} name="regionId" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Region")}</FormLabel>
                                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <Icon icon={MapsLocation01Icon} size={18} className="text-orange-500" />
                                                                                            <SelectValue placeholder={tr("SELECT REGION")} className="text-xs font-semibold" />
                                                                                        </div>
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 font-bold overflow-hidden p-1 shadow-[var(--ds-shadow-raised)]">
                                                                                    {regions.length === 0 ? (
                                                                                        <SelectItem value="none" disabled className="text-xs font-semibold py-3">{tr("NO REGIONS LOADED")}</SelectItem>
                                                                                    ) : regions.map(r => (
                                                                                        <SelectItem key={r.id} value={r.id.toString()} className="rounded-md text-xs font-semibold py-3">{r.name}</SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                    <FormField control={form.control} name="bookingOfficeId" render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Assigned Booking Office")}</FormLabel>
                                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold outline-none focus:ring-1 focus:ring-[#ffd428]/50 text-left">
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
                                                                            <FormMessage className="text-xs font-semibold" />
                                                                        </FormItem>
                                                                    )} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TabsContent>

                                                    <TabsContent value="1" className="m-0 border-none p-0 focus-visible:ring-0">
                                                        <div className="space-y-12">
                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                                                                    <div className="size-8 rounded-[var(--ds-radius-small)] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                                        <Icon icon={Money01Icon} size={18} />
                                                                    </div>
                                                                    <h3 className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Float Configuration")}</h3>
                                                                </div>
                                                                <FormField control={form.control} name="enableFloat" render={({ field }) => (
                                                                    <FormItem className="flex items-center justify-between p-8 bg-white dark:bg-white/5 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/10 shadow-[var(--ds-shadow-raised)]">
                                                                        <div className="space-y-1 text-left">
                                                                            <FormLabel className="text-sm font-semibold leading-none">{tr("Enable Float Balance")}</FormLabel>
                                                                            <FormDescription className="text-xs font-bold text-slate-400">{tr("Allow this agent to manage and maintain a wallet balance")}</FormDescription>
                                                                        </div>
                                                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                                    </FormItem>
                                                                )} />
                                                                {watchedEnableFloat && (
                                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-8 pl-4 border-l-2 border-[#ffd428]">
                                                                        <FormField control={form.control} name="floatType" render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel className="text-xs font-semibold text-slate-400">{tr("Float Management Type")}</FormLabel>
                                                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                                                    {[
                                                                                        { v: "INDIVIDUAL", l: "Private Wallet", i: UserAccountIcon },
                                                                                        { v: "POOL_LINKED", l: "Shared Pool", i: UserGroupIcon }
                                                                                    ].map((t) => (
                                                                                        <button key={t.v} type="button" onClick={() => field.onChange(t.v)} className={cn("h-16 rounded-[var(--ds-radius-small)] border-2 transition-all flex flex-col items-center justify-center gap-1 group", field.value === t.v ? "bg-[#242a37] text-[#ffd428] border-[#242a37]" : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20")}>
                                                                                            <Icon icon={t.i} size={18} className={cn("transition-transform", field.value === t.v ? "text-[#ffd428]" : "text-slate-300")} />
                                                                                            <span className="text-xs font-semibold">{t.l}</span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </FormItem>
                                                                        )} />
                                                                        {watchedFloatType === "POOL_LINKED" && (
                                                                            <FormField control={form.control} name="mainPoolId" render={({ field }) => (
                                                                                <FormItem className="space-y-2">
                                                                                    <FormLabel className="text-xs font-semibold text-slate-400">{tr("Link to Master Pool User")}</FormLabel>
                                                                                    <Popover open={poolUserOpen} onOpenChange={setPoolUserOpen}>
                                                                                        <PopoverTrigger asChild>
                                                                                            <FormControl><Button variant="outline" className="w-full h-10 justify-between rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold px-6 text-sm">
                                                                                                {field.value ? poolMainUsers.find(u => String(u.id) === field.value)?.fullName : tr("Search for a pool user...")}
                                                                                                <Icon icon={Search01Icon} className="size-4 opacity-50" />
                                                                                            </Button></FormControl>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent className="w-[min(450px,calc(100vw-2rem))] p-0 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border-white/10 overflow-hidden" align="start">
                                                                                            <Command>
                                                                                                <CommandInput placeholder={tr("Type to search...")} className="h-14 font-bold" />
                                                                                                <CommandList className="max-h-[350px]">
                                                                                                    <CommandEmpty className="py-4 text-center text-xs font-bold text-slate-400">{tr("No users found.")}</CommandEmpty>
                                                                                                    <CommandGroup className="p-2">
                                                                                                        {poolMainUsers.map(u => (
                                                                                                            <CommandItem key={u.id} onSelect={() => { field.onChange(String(u.id)); setPoolUserOpen(false) }} className="h-10 rounded-[var(--ds-radius-small)] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 px-4">
                                                                                                                <div className="flex flex-col text-left">
                                                                                                                    <span className="font-semibold text-xs">{u.fullName}</span>
                                                                                                                    <span className="text-xs text-slate-400 font-bold">{tr("User ID: #{id}", { id: u.id })}</span>
                                                                                                                </div>
                                                                                                            </CommandItem>
                                                                                                        ))}
                                                                                                    </CommandGroup>
                                                                                                </CommandList>
                                                                                            </Command>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                    <FormMessage className="text-xs font-semibold" />
                                                                                </FormItem>
                                                                            )} />
                                                                        )}

                                                                        <FormField control={form.control} name="configurationType" render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel className="text-xs font-semibold text-slate-400">{tr("Float Payout Structure")}</FormLabel>
                                                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                                                    {[
                                                                                        { v: "FULL_AMOUNT", l: "Full Amount", i: Money01Icon },
                                                                                        { v: "COMMISSION_BASED", l: "Commission Based", i: PercentCircleIcon }
                                                                                    ].map((t) => (
                                                                                        <button key={t.v} type="button" onClick={() => field.onChange(t.v)} className={cn("h-16 rounded-[var(--ds-radius-small)] border-2 transition-all flex flex-col items-center justify-center gap-1 group", field.value === t.v ? "bg-[#242a37] text-[#ffd428] border-[#242a37]" : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20")}>
                                                                                            <Icon icon={t.i} size={18} className={cn("transition-transform", field.value === t.v ? "text-[#ffd428]" : "text-slate-300")} />
                                                                                            <span className="text-xs font-semibold">{t.l}</span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </FormItem>
                                                                        )} />

                                                                        {watchedConfigurationType === "COMMISSION_BASED" && (
                                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-6 pl-4 border-l-2 border-[#ffd428]">
                                                                                <FormField control={form.control} name="commissionType" render={({ field }) => (
                                                                                    <FormItem>
                                                                                        <FormLabel className="text-xs font-semibold text-slate-400">{tr("Commission Type")}</FormLabel>
                                                                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                                                                            {[
                                                                                                { v: "PERCENTAGE", l: "Percentage" },
                                                                                                { v: "AMOUNT", l: "Fixed Amount" }
                                                                                            ].map((t) => (
                                                                                                <button key={t.v} type="button" onClick={() => field.onChange(t.v)} className={cn("h-12 rounded-[var(--ds-radius-small)] border-2 transition-all flex items-center justify-center text-xs font-semibold", field.value === t.v ? "bg-[#242a37] text-[#ffd428] border-[#242a37]" : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20")}>
                                                                                                    {t.l}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </FormItem>
                                                                                )} />

                                                                                {watchedCommissionType === "AMOUNT" ? (
                                                                                    <FormField control={form.control} name="commissionAmount" render={({ field }) => (
                                                                                        <FormItem className="space-y-2">
                                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Commission Amount (TZS)")}</FormLabel>
                                                                                            <FormControl>
                                                                                                <Input type="number" min="0" placeholder="e.g. 500" {...field} className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold" />
                                                                                            </FormControl>
                                                                                            <FormMessage className="text-xs font-semibold" />
                                                                                        </FormItem>
                                                                                    )} />
                                                                                ) : (
                                                                                    <FormField control={form.control} name="commissionPercentage" render={({ field }) => (
                                                                                        <FormItem className="space-y-2">
                                                                                            <FormLabel className="text-xs font-semibold text-slate-400">{tr("Commission Percentage (%)")}</FormLabel>
                                                                                            <FormControl>
                                                                                                <Input type="number" min="0" max="100" step="0.1" placeholder="e.g. 2.5" {...field} className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold" />
                                                                                            </FormControl>
                                                                                            <FormMessage className="text-xs font-semibold" />
                                                                                        </FormItem>
                                                                                    )} />
                                                                                )}
                                                                            </motion.div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                            </div>

                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                                                                    <div className="size-8 rounded-[var(--ds-radius-small)] bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                                        <Icon icon={UserGroupIcon} size={18} />
                                                                    </div>
                                                                    <h3 className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Earnings & Beneficiaries")}</h3>
                                                                </div>
                                                                <FormField control={form.control} name="enableBeneficiaries" render={({ field }) => (
                                                                    <FormItem className="flex items-center justify-between p-8 bg-white dark:bg-white/5 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/10 shadow-[var(--ds-shadow-raised)]">
                                                                        <div className="space-y-1 text-left">
                                                                            <FormLabel className="text-sm font-semibold leading-none">{tr("Automated Payouts")}</FormLabel>
                                                                            <FormDescription className="text-xs font-bold text-slate-400">{tr("Link beneficiaries to automatically share earnings from transactions")}</FormDescription>
                                                                        </div>
                                                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                                    </FormItem>
                                                                )} />
                                                                {watchedEnableBen && (
                                                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                                                                        <div className="flex flex-wrap gap-3 min-h-[60px] p-6 bg-slate-50 dark:bg-white/[0.03] rounded-[var(--ds-radius-large)] border-2 border-dashed border-slate-200 dark:border-white/10 items-center justify-center">
                                                                            {watchedBenIds.length === 0 ? (
                                                                                <p className="text-xs font-semibold text-slate-400">{tr("No beneficiaries linked yet")}</p>
                                                                            ) : (
                                                                                beneficiaries.filter(b => watchedBenIds.includes(b.id)).map(b => (
                                                                                    <Badge key={b.id} className="h-10 pl-4 pr-1.5 bg-slate-900 border-none text-white rounded-[var(--ds-radius-small)] flex items-center gap-3 group">
                                                                                        <div className="flex flex-col text-left">
                                                                                            <span className="text-xs font-semibold leading-none">{b.name}</span>
                                                                                            <span className="text-xs font-bold text-[#ffd428]">{b.deductionAmount || b.deduction_amount} TZS</span>
                                                                                        </div>
                                                                                        <Button variant="ghost" type="button" onClick={() => form.setValue("beneficiaryIds", watchedBenIds.filter(id => id !== b.id))} className="size-7 p-0 hover:bg-white/10 rounded-md text-white/50 hover:text-white transition-colors">
                                                                                            <Icon icon={Cancel01Icon} size={12} />
                                                                                        </Button>
                                                                                    </Badge>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                        <Popover open={beneficiaryOpen} onOpenChange={setBeneficiaryOpen}>
                                                                            <PopoverTrigger asChild>
                                                                                <Button variant="outline" className="w-full h-12 rounded-[var(--ds-radius-small)] border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-[#ffd428] hover:text-[#ffd428] transition-colors font-semibold text-xs bg-transparent">
                                                                                    <Icon icon={UserGroupIcon} className="mr-3" size={16} />{tr("Add Beneficiary")}</Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-[min(500px,calc(100vw-2rem))] p-0 rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border-white/10 overflow-hidden" align="center">
                                                                                <Command>
                                                                                    <CommandInput placeholder={tr("Search beneficiaries...")} className="h-16 font-semibold" />
                                                                                    <CommandList className="max-h-[350px]">
                                                                                        <CommandGroup className="p-3">
                                                                                            {beneficiaries.filter(b => !watchedBenIds.includes(b.id)).map(b => (
                                                                                                <CommandItem key={b.id} onSelect={() => { form.setValue("beneficiaryIds", [...watchedBenIds, b.id]); setBeneficiaryOpen(false) }} className="h-16 rounded-[var(--ds-radius-small)] m-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 px-4 mb-2">
                                                                                                    <div className="flex items-center justify-between w-full">
                                                                                                        <div className="flex flex-col text-left">
                                                                                                            <span className="font-semibold text-sm text-[#242a37] dark:text-white">{b.name}</span>
                                                                                                            <span className="text-xs text-slate-400 font-bold">{tr("Type:")}{" "}{b.type || tr("Fixed Amount")}</span>
                                                                                                        </div>
                                                                                                        <div className="text-right">
                                                                                                            <span className="block text-xs font-semibold text-[#ffd428]">{b.deductionAmount || b.deduction_amount} TZS</span>
                                                                                                            <span className="text-xs font-semibold text-slate-400">{tr("Per Parcel")}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </CommandItem>
                                                                                            ))}
                                                                                        </CommandGroup>
                                                                                    </CommandList>
                                                                                </Command>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TabsContent>

                                                    <TabsContent value="2" className="m-0 border-none p-0 focus-visible:ring-0">
                                                        <div className="space-y-10 text-left">
                                                            <div className="text-center space-y-3 mb-12">
                                                                <div className="size-16 rounded-[var(--ds-radius-large)] bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-[var(--ds-shadow-raised)]">
                                                                    <Icon icon={CheckListIcon} size={32} />
                                                                </div>
                                                                <h3 className="text-2xl font-bold text-[#242a37] dark:text-white">{tr("Review Registration")}</h3>
                                                                <p className="text-xs font-bold text-slate-400">{tr("Please confirm the information below is correct")}</p>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-8">
                                                                <Card className="rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-[var(--ds-shadow-raised)] overflow-hidden">
                                                                    <CardHeader className="bg-slate-50 dark:bg-white/5 py-4 border-b border-slate-200 dark:border-white/5">
                                                                        <div className="flex items-center gap-2">
                                                                            <Icon icon={ContactIcon} size={14} className="text-slate-400" />
                                                                            <CardTitle className="text-xs font-semibold text-slate-500">{tr("Contact Info")}</CardTitle>
                                                                        </div>
                                                                    </CardHeader>
                                                                    <CardContent className="p-6 space-y-4">
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Name:")}</span><span className="text-sm font-semibold text-[#242a37] dark:text-white">{form.getValues("fullName")}</span></div>
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("User:")}</span><span className="text-xs font-semibold text-[#ffd428]">@{form.getValues("username")}</span></div>
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Phone:")}</span><span className="text-xs font-semibold">{form.getValues("phoneNumber")}</span></div>
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Role:")}</span><Badge variant="outline" className="text-xs font-semibold py-0.5 rounded-md">{form.getValues("roles")}</Badge></div>
                                                                    </CardContent>
                                                                </Card>

                                                                <Card className="rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-[var(--ds-shadow-raised)] overflow-hidden">
                                                                    <CardHeader className="bg-slate-50 dark:bg-white/5 py-4 border-b border-slate-200 dark:border-white/5">
                                                                        <div className="flex items-center gap-2">
                                                                            <Icon icon={MapsLocation01Icon} size={14} className="text-slate-400" />
                                                                            <CardTitle className="text-xs font-semibold text-slate-500">{tr("Assignment")}</CardTitle>
                                                                        </div>
                                                                    </CardHeader>
                                                                    <CardContent className="p-6 space-y-4">
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Company:")}</span><span className="text-sm font-semibold text-[#242a37] dark:text-white truncate max-w-[140px]">{companies.find(c => String(c.id) === form.getValues("companyId"))?.name}</span></div>
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Region:")}</span><span className="text-xs font-semibold">{regions.find(r => String(r.id) === form.getValues("regionId"))?.name}</span></div>
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Office:")}</span><span className="text-xs font-semibold">{bookingOffices.find(o => String(o.id) === form.getValues("bookingOfficeId"))?.name}</span></div>
                                                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("System:")}</span><Badge className="bg-emerald-500 text-white border-none text-xs font-semibold py-0.5 rounded-md">{tr("Validated")}</Badge></div>
                                                                    </CardContent>
                                                                </Card>

                                                                <Card className="col-span-2 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-[var(--ds-shadow-raised)] overflow-hidden">
                                                                    <CardHeader className="bg-slate-50 dark:bg-white/5 py-4 border-b border-slate-200 dark:border-white/5">
                                                                        <div className="flex items-center gap-2">
                                                                            <Icon icon={Wallet01Icon} size={14} className="text-slate-400" />
                                                                            <CardTitle className="text-xs font-semibold text-slate-500">{tr("Financial Setup Overview")}</CardTitle>
                                                                        </div>
                                                                    </CardHeader>
                                                                    <CardContent className="p-8 grid grid-cols-2 gap-12">
                                                                        <div className="space-y-4">
                                                                            <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Float Status:")}</span><Badge className={cn("text-xs font-semibold border-none py-1 px-3 rounded-md", watchedEnableFloat ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>{watchedEnableFloat ? "ENABLED" : "DISABLED"}</Badge></div>
                                                                            {watchedEnableFloat && (
                                                                                <>
                                                                                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Wallet Type:")}</span><span className="text-xs font-semibold text-[#ffd428]">{watchedFloatType === "INDIVIDUAL" ? tr("Private") : tr("Pooled")}</span></div>
                                                                                    {watchedFloatType === "POOL_LINKED" && <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Pool Admin:")}</span><span className="text-xs font-semibold truncate max-w-[150px]">{poolMainUsers.find(u => String(u.id) === form.getValues("mainPoolId"))?.fullName}</span></div>}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-4">
                                                                            <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">{tr("Beneficiaries:")}</span><Badge className={cn("text-xs font-semibold border-none py-1 px-3 rounded-md", watchedEnableBen ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400")}>{watchedEnableBen ? "ACTIVE" : "NONE"}</Badge></div>
                                                                            {watchedEnableBen && (
                                                                                <div className="flex flex-wrap gap-1.5 justify-end">
                                                                                    {watchedBenIds.length === 0 ? <span className="text-xs text-slate-400 font-bold">{tr("No entries")}</span> : beneficiaries.filter(b => watchedBenIds.includes(b.id)).map(b => (
                                                                                        <Badge key={b.id} className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-none text-xs font-semibold py-0.5 rounded-md">{b.name}</Badge>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            </div>

                                                            <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[var(--ds-radius-large)] flex items-start gap-4">
                                                                <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                                                                    <Icon icon={InformationCircleIcon} size={20} />
                                                                </div>
                                                                <div className="space-y-1 text-left">
                                                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{tr("Terms & Conditions")}</p>
                                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">{tr("By creating this agent account, you confirm that all information provided is accurate and complies with the Mizigo platform policies. The agent will be granted access to the assigned company and office immediately upon successful registration.")}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TabsContent>
                                                </motion.div>
                                            </AnimatePresence>
                                        </Tabs>
                                        {/* Step Controls - Moved inside scroll area */}
                                        <div className="pt-12 pb-20">
                                            <div className="flex gap-6 max-w-3xl mx-auto">
                                                {currentStep === 0 ? (
                                                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" onClick={onClose}>{tr("Cancel")}</Button>
                                                ) : (
                                                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 text-xs font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" onClick={handleBack}>
                                                        <Icon icon={ArrowLeft01Icon} size={16} />{tr("Previous")}</Button>
                                                )}

                                                {currentStep < steps.length - 1 ? (
                                                    <Button type="button" className="flex-[2] h-12 bg-[#242a37] dark:bg-[#ffd428] text-white dark:text-[#242a37] rounded-[var(--ds-radius-large)] text-xs font-semibold shadow-[var(--ds-shadow-raised)] group flex items-center justify-center gap-3" onClick={handleNext}>
                                                        {currentStep === 0 ? tr("Continue to Financial Setup") : tr("Review and Verify")}
                                                        <Icon icon={ArrowRight01Icon} className="transition-transform" size={16} />
                                                    </Button>
                                                ) : (
                                                    <Button type="submit" disabled={isLoading} className="flex-[2] h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[var(--ds-radius-large)] text-xs font-semibold shadow-[var(--ds-shadow-raised)] group flex items-center justify-center gap-3">
                                                        {isLoading ? <LoadingSpinner size="sm" /> : (
                                                            <>{tr("Create Agent")}<Icon icon={Tick02Icon} className="transition-transform" size={18} />
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center">
                                <div className="size-24 rounded-[var(--ds-radius-large)] bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20 shadow-[var(--ds-shadow-raised)]">
                                    <Icon icon={Tick02Icon} size={48} />
                                </div>
                                <h3 className="text-3xl font-bold mb-4 text-[#242a37] dark:text-white">{tr("Agent Added Successfully")}</h3>
                                <p className="text-sm font-bold text-slate-400 mb-12 leading-relaxed max-w-sm">{tr("The new agent account has been created and is now active in the system.")}</p>
                                
                                <div className="flex gap-4 w-full max-w-md">
                                    <Button className="flex-1 h-12 bg-[#ffd428] text-[#242a37] rounded-[var(--ds-radius-large)] text-xs font-semibold shadow-[var(--ds-shadow-raised)]" onClick={() => onViewAgent && onViewAgent(createdAgent)}>{tr("View Agent Profile")}</Button>
                                    <Button variant="outline" className="flex-1 h-12 border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-small)] text-xs font-semibold" onClick={onClose}>{tr("Done")}</Button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
