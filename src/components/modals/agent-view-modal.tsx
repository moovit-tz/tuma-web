"use client"
import { Icon } from "@/components/ui/icon"
import { AccountActions } from "@/components/sheets/account-actions"
import { AccountPermissionsPanel } from "@/components/sheets/account-permissions"
import { useAccess } from "@/hooks/use-access"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    getAgentProfile,
    getAgentFloatTransactions,
    getAgentFloatBalance,
    getAgentParcelOperations,
    getDetailedPoolInfo,
    getUserBeneficiaries,
    resetAgentPassword,
} from "@/lib/services/user"
import type { User as UserType } from "@/types/user"
import type { Beneficiary } from "@/types/beneficiary"
import {
    SHEET_CARD,
    SheetSection,
    DetailList,
    StatGrid,
    SheetEmpty,
    SheetPager,
    SheetLozenge,
} from "@/components/sheets/sheet-blocks"
import { PoolMainModal } from "./pool-main-modal"
import { PoolLinkedUsersModal } from "./pool-linked-users-modal"
import { motion, AnimatePresence } from "framer-motion"

// Industrial Icon Suite
import { 
    UserAccountIcon,
    Wallet01Icon,
    UserGroupIcon,
    Package01Icon,
    Shield01Icon,
    PencilEdit01Icon,
    ViewIcon,
    ViewOffIcon,
    Copy01Icon,
    Settings01Icon,
    SmartPhone01Icon,
    Mail01Icon,
    Calendar03Icon,
    Building03Icon,
    Location01Icon,
    Activity01Icon,
    InformationCircleIcon,
    Tick01Icon,
    AlertCircleIcon,
    Link01Icon,
    Cancel01Icon,
    Search01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Money01Icon,
    PercentCircleIcon,
    CallIcon,
    ArrowUp01Icon,
    ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { ListSkeleton } from "@/components/ui/skeletons"
import { useTr } from "@/lib/i18n/portal"
import { ExportMenu } from "@/components/export/export-menu"
// Field names the backend may use for a user's one-time password. Neither
// the profile nor the reset response currently returns one; whichever starts
// sending it is picked up without further changes here.
const OTP_KEYS = ["otp", "otpCode", "currentOtp", "oneTimePassword"]
// Only trusted on the reset response — on a profile, "password" could be a hash.
const RESET_OTP_KEYS = [...OTP_KEYS, "tempPassword", "temporaryPassword", "newPassword", "password"]

function extractOtp(source: any, keys: string[] = OTP_KEYS): string | null {
    for (const obj of [source, source?.data, source?.user, source?.agent]) {
        if (!obj || typeof obj !== "object") continue
        for (const key of keys) {
            const value = obj[key]
            if ((typeof value === "string" && value.trim()) || typeof value === "number") return String(value)
        }
    }
    return null
}

interface AgentViewModalProps {
    isOpen: boolean
    onClose: () => void
    agent: UserType | null
    onEdit?: (agent: UserType) => void
}

const PARCEL_STATUS_LABEL: Record<string, string> = { RECEIVED: "Received", DISPATCHED: "Dispatched", OFFLOADED: "Offloaded", DELIVERED: "Delivered", PICKED_UP: "Picked up", CANCELED: "Cancelled" }

export function AgentViewModal({ isOpen, onClose, agent, onEdit }: AgentViewModalProps) {
    const tr = useTr()
    const [activeTab, setActiveTab] = useState("overview")
    const [transactionsPage, setTransactionsPage] = useState(1)
    const [parcelsPage, setParcelsPage] = useState(1)
    const [parcelSearch, setParcelSearch] = useState("")
    const [beneficiariesPage, setBeneficiariesPage] = useState(1)
    const [showComingSoon, setShowComingSoon] = useState(false)
    const [showPoolMainModal, setShowPoolMainModal] = useState(false)
    const [showPoolLinkedUsersModal, setShowPoolLinkedUsersModal] = useState(false)
    const [selectedPoolMainUser, setSelectedPoolMainUser] = useState<UserType | null>(null)
    const [isResettingPassword, setIsResettingPassword] = useState(false)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    // OTP issued by the last reset in this session (backend may return it)
    // Reset needs the agents.reset_password permission (Admin, and Operations by default)
    const { can } = useAccess()
    const canResetOtp = can("agents.reset_password")
    const [issuedOtp, setIssuedOtp] = useState<string | null>(null)
    const [issuedOtpExpiresAt, setIssuedOtpExpiresAt] = useState<string | null>(null)
    const [isOtpVisible, setIsOtpVisible] = useState(false)
    const pageSize = 10
    const { toast } = useToast()

    // Password Reset Mutation
    const resetPasswordMutation = useMutation({
        mutationFn: (userId: number) => resetAgentPassword(userId),
        onSuccess: (result) => {
            const otp = extractOtp(result, RESET_OTP_KEYS)
            if (otp) {
                setIssuedOtp(otp)
                setIssuedOtpExpiresAt((result as any)?.otpExpiresAt ?? null)
                setIsOtpVisible(false)
                setActiveTab("overview")
            }
            toast({
                title: tr("Password reset"),
                description: otp
                    ? "A temporary password was issued and sent by SMS — it's also shown in the Info tab."
                    : "The password was reset and a temporary one sent by SMS.",
            })
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: tr("Couldn't reset password"),
                description: error.message || "Please try again.",
            })
        },
        onSettled: () => {
            setIsResettingPassword(false)
        }
    })

    const confirmResetPassword = () => {
        if (!agent?.id) return
        setIsResettingPassword(true)
        setShowResetConfirm(false)
        resetPasswordMutation.mutate(agent.id)
    }

    // Fetch agent profile
    const {
        data: profileData,
        isLoading: isLoadingProfile,
        error: profileError,
    } = useQuery({
        queryKey: ["agent-profile", agent?.id],
        queryFn: () => getAgentProfile(agent!.id),
        enabled: isOpen && !!agent?.id,
    })

    // Fetch detailed pool float status
    const { data: poolFloatStatus } = useQuery({
        queryKey: ["detailed-pool-status", agent?.id],
        queryFn: () => getDetailedPoolInfo(agent!.id),
        enabled: isOpen && !!agent?.id,
        retry: false,
        staleTime: 30000,
    })

    // Fetch parcel operations with pagination
    const { data: parcelData, isLoading: isLoadingParcels } = useQuery({
        queryKey: ["agent-parcels", agent?.id, parcelsPage],
        queryFn: () => getAgentParcelOperations(agent!.id, { page: parcelsPage, limit: pageSize }),
        enabled: isOpen && !!agent?.id && activeTab === "parcels",
    })

    // Fetch float transactions with pagination
    const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
        queryKey: ["agent-transactions", agent?.id, transactionsPage],
        queryFn: () => getAgentFloatTransactions(agent!.id, { page: transactionsPage, limit: pageSize }),
        // Loaded on open (not only on the tab) so the tab can be hidden when empty
        enabled: isOpen && !!agent?.id && !!(agent?.floatAccountNumber || agent?.isUsingFloat),
    })

    // Fetch beneficiaries assigned to the user with pagination
    const { data: beneficiariesData, isLoading: isLoadingBeneficiaries } = useQuery({
        queryKey: ["user-beneficiaries", agent?.id, beneficiariesPage],
        queryFn: () => getUserBeneficiaries(agent!.id, { page: beneficiariesPage, limit: pageSize }),
        enabled: isOpen && !!agent?.id,
        retry: 1,
    })

    // Fetch float balance
    const {
        data: balanceData,
        isLoading: isLoadingBalance,
    } = useQuery({
        queryKey: ["agent-balance", agent?.id],
        queryFn: () => getAgentFloatBalance(agent!.id),
        enabled: isOpen && !!agent?.id,
        retry: false,
        staleTime: 30000,
    })

    const agentProfile = profileData?.agent
    // Office assignments live in UserOffice (agent.offices); primary office first
    const assignedOffices: string[] = (((agentProfile as any)?.offices ?? (agent as any)?.offices ?? []) as any[])
        .slice()
        .sort((x, y) => Number(!!y.isPrimary) - Number(!!x.isPrimary))
        .map((o) => o.office?.name)
        .filter(Boolean)
    const currentOtp = issuedOtp ?? extractOtp(agentProfile) ?? extractOtp(agent)
    // The backend keeps a reset PIN readable for 24h or until the agent changes it
    const otpExpiresAt: string | null = issuedOtp ? issuedOtpExpiresAt : ((agentProfile as any)?.otpExpiresAt ?? null)

    // Never carry a revealed OTP over to another agent or a reopened sheet.
    useEffect(() => {
        setIssuedOtp(null)
        setIssuedOtpExpiresAt(null)
        setIsOtpVisible(false)
    }, [agent?.id, isOpen])

    const copyOtp = async () => {
        if (!currentOtp) return
        try {
            await navigator.clipboard.writeText(currentOtp)
            toast({ title: tr("Copied"), description: tr("Temporary password copied.") })
        } catch {
            toast({ variant: "destructive", title: tr("Copy failed"), description: tr("Select the password and copy it manually.") })
        }
    }
    const parcels = parcelData?.parcels || []
    const parcelsPagination = parcelData?.pagination
    const transactions = transactionsData?.transactions || []
    const transactionsPagination = transactionsData?.pagination
    const beneficiaries = beneficiariesData?.data || beneficiariesData?.list || beneficiariesData?.beneficiaries || []
    const beneficiariesStatistics = beneficiariesData?.statistics || null
    const beneficiariesPagination = beneficiariesData?.pagination
    const floatBalance = balanceData

    const hasFloatAccount = !!(agent?.floatAccountNumber || agent?.isUsingFloat)

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat("en-TZ", {
            style: "currency",
            currency: "TZS",
            minimumFractionDigits: 0,
        }).format(Number(amount))
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const formatDay = (dateString?: string | null) => {
        if (!dateString) return "—"
        const d = new Date(dateString)
        return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    }

    const getStatusColor = (status: string) => {
        const colors = {
            PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500",
            COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500",
            SUCCESS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500",
            FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-500",
            ERROR: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-500",
            CANCELLED: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-400",
            DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500",
            ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500",
        }
        return colors[status as keyof typeof colors] || "bg-slate-100 text-slate-700"
    }

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    const handleViewPoolMain = () => {
        if (poolFloatStatus?.mainUser) {
            setSelectedPoolMainUser(poolFloatStatus.mainUser)
            setShowPoolMainModal(true)
        }
    }

    const handleViewPoolLinkedUsers = () => {
        setSelectedPoolMainUser(agent)
        setShowPoolLinkedUsersModal(true)
    }

    const handleViewLinkedUser = (user: UserType) => {
        setShowPoolMainModal(false)
        setShowPoolLinkedUsersModal(false)
        if (onEdit) onEdit(user)
    }

    if (!agent) return null;

    const isTripAgent = agent.role === "TRIP_AGENT" || (Array.isArray((agent as any).roles) && (agent as any).roles.includes("TRIP_AGENT"))

    // Only show what applies to this agent: no empty tabs or sections
    const transactionCount = Number(transactionsPagination?.totalItems ?? transactions.length) || 0
    const beneficiaryCount = Number(beneficiariesPagination?.totalItems ?? beneficiaries.length) || 0
    const pc = agent.parcelCounts as any
    const parcelTotal = ["receivedParcels", "dispatchedParcels", "offloadedParcels", "deliveredParcels", "canceledParcels"].reduce((n, k) => n + (Number(pc?.[k]) || 0), 0)
    const inPool = !!poolFloatStatus?.success
    const commissionPct = Number(agent.floatSettings?.commissionPercentage ?? agent.defaultCommissionPercentage ?? 0)
    const commissionAmt = Number(agent.floatSettings?.commissionAmount ?? (agent as any).defaultCommissionAmount ?? 0)
    const tabs = [
        { id: "overview", label: tr("Info"), icon: ViewIcon, show: true },
        { id: "float", label: tr("Float Account"), icon: Money01Icon, show: hasFloatAccount },
        { id: "transactions", label: tr("Transactions"), icon: Activity01Icon, show: hasFloatAccount && transactionCount > 0, count: transactionCount },
        { id: "beneficiaries", label: tr("Beneficiaries"), icon: PercentCircleIcon, show: beneficiaryCount > 0, count: beneficiaryCount },
        { id: "parcels", label: tr("Parcels"), icon: Package01Icon, show: parcelTotal > 0, count: agent.parcelCounts?.receivedParcels || 0 },
    ].filter((t) => t.show)
    const visibleTab = tabs.some((t) => t.id === activeTab) ? activeTab : "overview"

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                    <SheetHeader className="sr-only">
                        <SheetTitle>{tr("Agent Profile")}</SheetTitle>
                        <SheetDescription>{tr("View detailed information and activity for this agent.")}</SheetDescription>
                    </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-[#ffd428] border border-white/20 flex items-center justify-center overflow-hidden">
                                 <Icon icon={UserAccountIcon} size={28} className="text-[#242a37]" />
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                {canResetOtp && (
                                    <Button
                                        variant="outline"
                                        className="h-9 px-4 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] bg-white/10 text-xs font-semibold text-[#ffd428] hover:text-[#ffd428] hover:bg-white/20 transition-colors border-none"
                                        onClick={() => setShowResetConfirm(true)}
                                        disabled={isResettingPassword}
                                    >
                                        <Icon icon={Shield01Icon} className="mr-2 size-4" />{tr("Reset password")}</Button>
                                )}
                                <ExportMenu
                                    label={tr("Report")}
                                    filename={`agent-${String(agent.username || agent.id).toLowerCase()}`}
                                    title={tr("Agent report · {name}", { name: agent.fullName || agent.username })}
                                    subtitle={[agent.phoneNumber, `@${agent.username}`, agent.isActive ? tr("Active") : tr("Inactive"), tr("Latest 500 parcels")].filter(Boolean).join(" · ")}
                                    rows={async () => {
                                        const res: any = await getAgentParcelOperations(agent.id, { page: 1, limit: 500 })
                                        return (res?.parcels ?? []) as any[]
                                    }}
                                    columns={[
                                        [tr("Parcel no."), (p: any) => p.parcelNumber],
                                        [tr("Status"), (p: any) => tr(PARCEL_STATUS_LABEL[String(p.status)] ?? String(p.status ?? ""))],
                                        [tr("From"), (p: any) => p.origin?.name ?? p.origin ?? ""],
                                        [tr("To"), (p: any) => p.destination?.name ?? p.destination ?? ""],
                                        [tr("Recipient"), (p: any) => p.recipientName ?? ""],
                                        [tr("Price (TZS)"), (p: any) => Number(p.price) || 0],
                                        [tr("Date"), (p: any) => (p.createdAt ? formatDay(p.createdAt) : "")],
                                    ]}
                                    summary={(rows: any[]) => [
                                        [tr("Company"), agent.company?.name || "—"],
                                        [tr("Parcels"), rows.length.toLocaleString()],
                                        [tr("Parcel value"), formatCurrency(rows.reduce((s, p) => s + (Number(p.price) || 0), 0))],
                                        [tr("Float balance"), hasFloatAccount ? formatCurrency(floatBalance?.totalBalance || 0) : "—"],
                                    ]}
                                    className="h-9 border-none bg-white/10 text-white hover:bg-white/20 hover:text-white"
                                />
                                {onEdit && (
                                    <Button
                                        onClick={() => onEdit?.(agent!)}
                                        className="h-9 px-4 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border-none shadow-none"
                                    >
                                        <Icon icon={PencilEdit01Icon} size={20} />{tr("Edit Agent")}</Button>
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
                                <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">{agent.fullName}</h2>
                                <p className="text-white/50 text-xs font-semibold mt-2 flex items-center gap-2">{tr("Agent ID: #")}{String(agent.id).padStart(4, '0')} <span className="text-white/20">•</span> @{agent.username}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className={cn(
                                    "h-7 px-3 rounded-[var(--ds-radius-large)] text-xs font-semibold border-none shadow-[var(--ds-shadow-raised)] flex items-center justify-center translate-y-[2px]",
                                    agent.isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                )}>
                                    {agent.isActive ? "ACTIVE" : "INACTIVE"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div role="tablist" className="flex gap-1 px-6 border-t border-white/10 overflow-x-auto custom-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                type="button"
                                role="tab"
                                aria-selected={visibleTab === tab.id}
                                className={cn(
                                    "-mb-px px-2 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428]",
                                    visibleTab === tab.id
                                        ? "text-white border-[#ffd428]"
                                        : "text-white/60 hover:text-white hover:border-white/30 border-transparent"
                                )}
                            >
                                <Icon icon={tab.icon} className="size-4" />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[18px] text-center",
                                        visibleTab === tab.id ? "bg-[#ffd428] text-[#242a37]" : "bg-white/10 text-white/40"
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                    <Tabs value={visibleTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
                        {/* ════════ INFO ════════ */}
                        <TabsContent value="overview" className="mt-0 space-y-6 outline-none">
                            {isLoadingProfile ? (
                                <ListSkeleton rows={6} />
                            ) : (
                                <>
                                    <StatGrid
                                        columns={3}
                                        tiles={
                                            isTripAgent
                                                ? [
                                                    { label: tr("Dispatched"), value: (agent.parcelCounts?.dispatchedParcels ?? 0).toLocaleString(), hint: tr("All time"), emphasis: true },
                                                    { label: tr("Offloaded"), value: (agent.parcelCounts?.offloadedParcels ?? 0).toLocaleString(), hint: tr("All time") },
                                                    { label: tr("Account"), value: agent.isActive ? "Active" : "Inactive", hint: tr("Since {formatDay}", { formatDay: formatDay(agent.createdAt) }) },
                                                ]
                                                : [
                                                    { label: tr("Parcels booked"), value: (agent.parcelCounts?.receivedParcels ?? 0).toLocaleString(), hint: tr("All time"), emphasis: true },
                                                    { label: tr("Dispatched"), value: (agent.parcelCounts?.dispatchedParcels ?? 0).toLocaleString(), hint: tr("All time") },
                                                    { label: tr("Account"), value: agent.isActive ? "Active" : "Inactive", hint: tr("Since {formatDay}", { formatDay: formatDay(agent.createdAt) }) },
                                                ]
                                        }
                                    />

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <SheetSection title={tr("Profile")} icon={UserAccountIcon}>
                                            <DetailList
                                                rows={[
                                                    { label: tr("Full name"), value: agent.fullName },
                                                    { label: tr("Username"), value: `@${agent.username}`, mono: true },
                                                    { label: tr("Role"), value: String(agent.role || "—").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) },
                                                    { label: tr("Company"), value: agent.company?.name || "—" },
                                                    { label: tr("Region"), value: agent.region?.name || "—" },
                                                    {
                                                        label: (assignedOffices.length > 1 ? "Booking offices" : "Booking office"),
                                                        value: assignedOffices.length ? assignedOffices.join(", ") : (agent.bookingOffice?.name || "—"),
                                                    },
                                                ]}
                                            />
                                        </SheetSection>
                                        <SheetSection title={tr("Contact")} icon={CallIcon}>
                                            <DetailList
                                                rows={[
                                                    { label: tr("Phone"), value: agent.phoneNumber || "—", mono: true },
                                                    { label: tr("Email"), value: agent.email ? agent.email.toLowerCase() : "—" },
                                                    { label: tr("Joined"), value: formatDay(agent.createdAt) },
                                                    { label: tr("Last updated"), value: formatDay(agent.updatedAt) },
                                                ]}
                                            />
                                        </SheetSection>
                                    </div>

                                    {/* Temporary password — staff who can reset (ADMIN/OPS) only */}
                                    {canResetOtp && (
                                        <SheetSection title={tr("Temporary password")} icon={Shield01Icon}>
                                            <div className="px-5 py-4">
                                                {currentOtp ? (
                                                    <>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p
                                                                className="select-all font-mono text-lg font-semibold tabular-nums text-[#242a37] dark:text-white"
                                                                aria-label={isOtpVisible ? tr("Temporary password {currentOtp}", { currentOtp }) : tr("Temporary password hidden")}
                                                            >
                                                                {isOtpVisible ? currentOtp : "•".repeat(Math.max(currentOtp.length, 6))}
                                                            </p>
                                                            <div className="flex items-center gap-1">
                                                                <Button variant="ghost" size="sm" onClick={() => setIsOtpVisible((v) => !v)} aria-pressed={isOtpVisible}>
                                                                    <Icon icon={isOtpVisible ? ViewOffIcon : ViewIcon} size={16} />
                                                                    {isOtpVisible ? tr("Hide") : tr("Show")}
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={copyOtp}>
                                                                    <Icon icon={Copy01Icon} size={16} />{tr("Copy")}</Button>
                                                            </div>
                                                        </div>
                                                        <p className="mt-2 text-xs text-slate-500">
                                                            {otpExpiresAt
                                                                ? tr("Valid until {formatDate}, or until the agent sets their own PIN.", { formatDate: formatDate(otpExpiresAt) })
                                                                : tr("Valid until the agent sets their own PIN.")}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{tr("No temporary password")}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{tr("Reset password issues a temporary one. It's shown here for 24 hours, or until they set their own PIN.")}</p>
                                                    </>
                                                )}
                                            </div>
                                        </SheetSection>
                                    )}

                                    {/* Activate / deactivate / delete */}
                                    <AccountPermissionsPanel kind="agent" accountId={agent.id} />
                                    <AccountActions kind="agent" account={agent} onDeleted={onClose} />
                                </>
                            )}
                        </TabsContent>

                        {/* ════════ FLOAT ════════ */}
                        <TabsContent value="float" className="mt-0 space-y-6 outline-none">
                            {!hasFloatAccount ? (
                                <div className={SHEET_CARD}>
                                    <SheetEmpty icon={Wallet01Icon} title={tr("No float account")} description={tr("This agent doesn't have a float account set up.")} />
                                </div>
                            ) : isLoadingBalance ? (
                                <ListSkeleton rows={6} />
                            ) : (
                                <>
                                    <StatGrid
                                        columns={3}
                                        tiles={[
                                            { label: tr("Current balance"), value: formatCurrency(floatBalance?.totalBalance || 0), emphasis: true },
                                            { label: tr("Money in"), value: formatCurrency(floatBalance?.totalAmountIn || 0), hint: tr("All time") },
                                            { label: tr("Money out"), value: formatCurrency(floatBalance?.totalAmountOut || 0), hint: tr("All time") },
                                        ]}
                                    />
                                    <div className={cn("grid grid-cols-1 gap-6", inPool && "md:grid-cols-2")}>
                                        <SheetSection title={tr("Float settings")} icon={Settings01Icon}>
                                            <DetailList
                                                rows={[
                                                    { label: tr("Account number"), value: agent.floatAccountNumber || "—", mono: true },
                                                    agent.defaultFloatType && { label: tr("Float type"), value: agent.defaultFloatType.replace(/_/g, " ").toLowerCase() },
                                                    commissionPct > 0 && { label: tr("Commission"), value: `${commissionPct}%` },
                                                    commissionAmt > 0 && { label: tr("Commission"), value: formatCurrency(commissionAmt) + " per parcel" },
                                                    agent.floatSettings?.configurationType && {
                                                        label: tr("Commission setup"),
                                                        value: agent.floatSettings.configurationType.replace(/_/g, " ").toLowerCase(),
                                                    },
                                                ].filter(Boolean) as { label: string; value: React.ReactNode; mono?: boolean }[]}
                                            />
                                        </SheetSection>
                                        {inPool && (
                                        <SheetSection title={tr("Shared float pool")} icon={UserGroupIcon}>
                                            {(
                                                <div className="space-y-4 px-5 py-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">
                                                            {poolFloatStatus.isPoolMain
                                                                ? tr("Pool owner · {totalLinkedUsers} linked agent{s}", { totalLinkedUsers: poolFloatStatus.totalLinkedUsers, s: poolFloatStatus.totalLinkedUsers === 1 ? "" : "s" })
                                                                : tr("Uses {agent}'s float", { agent: poolFloatStatus.mainUser?.fullName || "another agent" })}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {poolFloatStatus.isPoolMain
                                                                ? tr("Other agents book parcels against this agent's balance.")
                                                                : tr("Parcels this agent books are paid from the pool owner's balance.")}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={poolFloatStatus.isPoolMain ? handleViewPoolLinkedUsers : handleViewPoolMain}
                                                        className="w-full"
                                                    >
                                                        <Icon icon={ViewIcon} size={16} />
                                                        {poolFloatStatus.isPoolMain ? tr("View linked agents") : tr("View pool owner")}
                                                    </Button>
                                                </div>
                                            )}
                                        </SheetSection>
                                        )}
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* ════════ TRANSACTIONS ════════ */}
                        <TabsContent value="transactions" className="mt-0 outline-none">
                            <SheetSection title={tr("Float transactions")} icon={Activity01Icon}>
                                {isLoadingTransactions ? (
                                    <ListSkeleton rows={4} />
                                ) : transactions.length === 0 ? (
                                    <SheetEmpty icon={Activity01Icon} title={tr("No transactions yet")} description={tr("Top-ups and payments from this agent's float will appear here.")} />
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                        {transactions.map((tx: any, idx: number) => (
                                            <li key={tx.id || `tx-${idx}`} className="flex items-center justify-between gap-4 px-5 py-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-mono text-sm font-semibold text-[#242a37] dark:text-white">{tx.transactionReference || "—"}</p>
                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                        {tx.createdAt ? formatDate(tx.createdAt) : "—"}
                                                        {tx.provider?.name ? ` · ${tx.provider.name}` : ""}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-3">
                                                    <p className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{formatCurrency(tx.amount || 0)}</p>
                                                    <SheetLozenge status={tx.status} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <SheetPager
                                    page={transactionsPage}
                                    totalPages={transactionsPagination?.totalPages || 1}
                                    onPage={setTransactionsPage}
                                    summary={transactionsPagination?.totalItems != null ? `${transactionsPagination.totalItems.toLocaleString()} transactions` : undefined}
                                />
                            </SheetSection>
                        </TabsContent>

                        {/* ════════ BENEFICIARIES ════════ */}
                        <TabsContent value="beneficiaries" className="mt-0 space-y-6 outline-none">
                            {beneficiariesStatistics && (
                                <StatGrid
                                    columns={4}
                                    tiles={[
                                        { label: tr("Active"), value: beneficiariesStatistics.activeBeneficiaries || 0, emphasis: true },
                                        { label: tr("Deducted so far"), value: formatCurrency(beneficiariesStatistics.totalDeductionAmount || 0) },
                                        { label: tr("Per day"), value: formatCurrency(beneficiariesStatistics.totalDailyDeduction || 0) },
                                        { label: tr("Per month"), value: formatCurrency(beneficiariesStatistics.totalMonthlyDeduction || 0), hint: tr("Estimate") },
                                    ]}
                                />
                            )}
                            <SheetSection title={tr("Beneficiaries")} icon={PercentCircleIcon}>
                                {isLoadingBeneficiaries ? (
                                    <ListSkeleton rows={4} />
                                ) : beneficiaries.length === 0 ? (
                                    <SheetEmpty icon={UserGroupIcon} title={tr("No beneficiaries")} description={tr("Nobody receives a share of this agent's earnings.")} />
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                        {beneficiaries.map((b: Beneficiary, idx: number) => {
                                            const pct = Math.max(0, Math.min(100, Number((b as any).progress?.percentage) || 0))
                                            return (
                                                <li key={b.id || `ben-${idx}`} className="space-y-2 px-5 py-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{b.name}</p>
                                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                {formatCurrency(b.deduction_amount || 0)} {String(b.deduction_frequency || "").toLowerCase()}
                                                                {tr(" · {v} paid", { v: (b.deduction_count || 0).toLocaleString() })}
                                                                {Number(b.total_deducted) ? tr(" · {formatCurrency} total", { formatCurrency: formatCurrency(b.total_deducted) }) : ""}
                                                            </p>
                                                        </div>
                                                        <SheetLozenge status={b.status} />
                                                    </div>
                                                    {(b as any).progress && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                                                                <div className="h-full rounded-full bg-[#ffd428]" style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-500">{pct}%</span>
                                                        </div>
                                                    )}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                                <SheetPager
                                    page={beneficiariesPage}
                                    totalPages={beneficiariesPagination?.totalPages || 1}
                                    onPage={setBeneficiariesPage}
                                />
                            </SheetSection>
                        </TabsContent>

                        {/* ════════ PARCELS ════════ */}
                        <TabsContent value="parcels" className="mt-0 space-y-6 outline-none">
                            <StatGrid
                                columns={isTripAgent ? 2 : 2}
                                tiles={
                                    isTripAgent
                                        ? [
                                            { label: tr("Dispatched"), value: (agent.parcelCounts?.dispatchedParcels ?? 0).toLocaleString(), hint: tr("All time"), emphasis: true },
                                            { label: tr("Offloaded"), value: (agent.parcelCounts?.offloadedParcels ?? 0).toLocaleString(), hint: tr("All time") },
                                        ]
                                        : [
                                            { label: tr("Parcels booked"), value: (agent.parcelCounts?.receivedParcels ?? 0).toLocaleString(), hint: tr("All time"), emphasis: true },
                                            { label: tr("Dispatched"), value: (agent.parcelCounts?.dispatchedParcels ?? 0).toLocaleString(), hint: tr("All time") },
                                        ]
                                }
                            />
                            <SheetSection
                                title={tr("Parcels")}
                                icon={Package01Icon}
                                action={
                                    <div className="relative w-56">
                                        <Icon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="search"
                                            placeholder={tr("Filter this page")}
                                            aria-label={tr("Filter parcels on this page")}
                                            value={parcelSearch}
                                            onChange={(e) => setParcelSearch(e.target.value)}
                                            className="h-8 w-full rounded-[var(--ds-radius-small)] border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-[#242a37] dark:border-white/10 dark:bg-[#1a1f2b] dark:focus:border-[#ffd428]"
                                        />
                                    </div>
                                }
                            >
                                {isLoadingParcels ? (
                                    <ListSkeleton rows={4} />
                                ) : (() => {
                                    const q = parcelSearch.trim().toLowerCase()
                                    const shown = parcels.filter((p: any) =>
                                        !q ||
                                        (p.parcelNumber || "").toLowerCase().includes(q) ||
                                        (p.name || "").toLowerCase().includes(q) ||
                                        (p.recipientName || "").toLowerCase().includes(q),
                                    )
                                    return shown.length === 0 ? (
                                        <SheetEmpty
                                            icon={Package01Icon}
                                            title={q ? tr("No matches on this page") : tr("No parcels yet")}
                                            description={q ? tr("Try another page, or clear the filter.") : tr("Parcels this agent handles will appear here.")}
                                        />
                                    ) : (
                                        <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                            {shown.map((p: any, i: number) => (
                                                <li key={p.id ?? i} className="flex items-center justify-between gap-4 px-5 py-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-mono text-sm font-semibold text-[#242a37] dark:text-white">{p.parcelNumber || `#${p.id}`}</p>
                                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                                            {p.origin?.name || "—"} → {p.destination?.name || "—"}
                                                            {p.createdAt ? ` · ${formatDay(p.createdAt)}` : ""}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-3">
                                                        <p className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{formatCurrency(p.price || 0)}</p>
                                                        <SheetLozenge status={p.status} />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )
                                })()}
                                <SheetPager page={parcelsPage} totalPages={parcelsPagination?.totalPages || 1} onPage={setParcelsPage} />
                            </SheetSection>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Modals Hierarchy */}
                <PoolMainModal
                    isOpen={showPoolMainModal}
                    onClose={() => setShowPoolMainModal(false)}
                    poolMainUser={selectedPoolMainUser}
                    onViewLinkedUser={handleViewLinkedUser}
                />
                <PoolLinkedUsersModal
                    isOpen={showPoolLinkedUsersModal}
                    onClose={() => setShowPoolLinkedUsersModal(false)}
                    poolMainUser={selectedPoolMainUser}
                    onViewUser={handleViewLinkedUser}
                />

                <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                    <AlertDialogContent className="bg-white dark:bg-[#1a1f2b] border-none rounded-[var(--ds-radius-large)] p-8 shadow-[var(--ds-shadow-raised)]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-bold text-rose-500">{tr("Reset password?")}</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-4">
                                <span className="text-[#242a37] dark:text-white font-semibold">{agent?.fullName}</span>{" "}{tr("will be signed out and sent a temporary 6-digit password by SMS. Their current password stops working.")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-10">
                            <AlertDialogCancel className="h-10 px-8 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5">{tr("Cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault()
                                    confirmResetPassword()
                                }}
                                disabled={isResettingPassword}
                                className="h-10 px-8 rounded-[var(--ds-radius-large)] bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-[var(--ds-shadow-raised)]"
                            >
                                {isResettingPassword ? tr("Resetting…") : tr("Reset password")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SheetContent>
            </Sheet>
        </>
    )
}
