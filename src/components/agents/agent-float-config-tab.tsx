"use client"
import { Icon } from "@/components/ui/icon"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { cn } from "@/lib/utils"
import { 
    Wallet01Icon,
    Money01Icon,
    PercentCircleIcon,
    Settings01Icon,
    Shield01Icon,
    InformationCircleIcon,
    Activity01Icon,
    ArrowRight01Icon,
    CheckListIcon,
} from "@hugeicons/core-free-icons"
import type { User as UserType } from "@/types/user"
import { userService } from "@/lib/services/user"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useTr } from "@/lib/i18n/portal"

interface AgentFloatConfigTabProps {
    agent: UserType | null
    formData: {
        isUsingFloat: boolean
        floatType: "INDIVIDUAL" | "POOL_MAIN" | "POOL_LINKED" | ""
        configurationType: "FULL_AMOUNT" | "COMMISSION_BASED" | ""
        commissionType: "PERCENTAGE" | "AMOUNT" | ""
        commissionPercentage: number | null
        commissionAmount: number | null
        mainPoolId: number | null
    }
    onInputChange: (field: string, value: any) => void
    onFieldBlur: (field: string, value: any) => void
    getFieldError: (field: string) => string | null
    showAutosaveAlert: boolean
    onRestoreAutosave: () => void
    onDiscardAutosave: () => void
}

export function AgentFloatConfigTab({
    agent,
    formData,
    onInputChange,
    onFieldBlur,
    getFieldError,
    showAutosaveAlert,
    onRestoreAutosave,
    onDiscardAutosave,
}: AgentFloatConfigTabProps) {
    const tr = useTr()
    const { toast } = useToast()

    const { data: poolMainUsers = [], isLoading: isLoadingPoolMainUsers } = useQuery({
        queryKey: ["poolMainUsers"],
        queryFn: async () => {
            const response = await userService.getPoolMainUsers()
            return response || []
        },
        enabled: !!agent?.id && formData.floatType === "POOL_LINKED",
    })

    if (!agent) return null

    return (
        <div className="space-y-10">
            {/* Status Integration Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: tr("Float_Status"), val: agent.isUsingFloat ? "Active" : "Locked", icon: Shield01Icon, color: agent.isUsingFloat ? "text-emerald-500" : "text-rose-500" },
                    { label: tr("Account_Ident"), val: agent.floatAccountNumber || "---", icon: Wallet01Icon, color: "text-blue-500" },
                    { label: tr("Current_Protocol"), val: agent.floatSettings?.floatType || "None", icon: Activity01Icon, color: "text-[#ffd428]" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                        <div className="flex items-center gap-3 mb-2">
                            <Icon icon={stat.icon} size={14} className="text-slate-300" />
                            <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
                        </div>
                        <p className={cn("text-lg font-semibold", stat.color)}>{stat.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                <Card className="p-8 rounded-[var(--ds-radius-large)] bg-slate-900 border border-white/5 shadow-[var(--ds-shadow-raised)] overflow-hidden relative group">
                    <div className="absolute right-0 top-0 p-6 opacity-5 scale-125 transition-transform duration-300">
                        <Icon icon={Wallet01Icon} size={100} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 rounded-[var(--ds-radius-small)] bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <Icon icon={Money01Icon} size={20} />
                            </div>
                            <span className="text-xs font-semibold text-white/40">{tr("Reserved_Capital")}</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-4xl font-bold text-white">{(agent?.floatBalance || 0).toLocaleString()}</span>
                            <span className="text-xs font-semibold text-white/40 font-mono">XRT</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold text-[#ffd428]">{tr("Liquid_Buffer_Secure")}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-[var(--ds-radius-small)] bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Icon icon={PercentCircleIcon} size={20} />
                            </div>
                            <span className="text-xs font-semibold text-slate-400">{tr("Commission")}</span>
                        </div>
                        <Icon icon={Settings01Icon} size={16} className="text-slate-200 transition-transform" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formData.commissionType === "PERCENTAGE" ? `${formData.commissionPercentage || 0}%` : `TZS ${(formData.commissionAmount || 0).toLocaleString()}`}
                        </p>
                        <p className="text-xs font-semibold text-slate-400 mt-1">{tr("Type:")}{" "}<span className="text-blue-500">{formData.commissionType === "PERCENTAGE" ? tr("Percentage") : formData.commissionType ? tr("Fixed amount") : tr("Not set")}</span></p>
                    </div>
                </Card>

                <Card className="p-8 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-[var(--ds-radius-small)] bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Icon icon={Shield01Icon} size={20} />
                            </div>
                            <span className="text-xs font-semibold text-slate-400">{tr("Protocol_Type")}</span>
                        </div>
                        <Icon icon={InformationCircleIcon} size={16} className="text-slate-200 hover:text-purple-500 transition-colors" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{formData.floatType || "INDIVIDUAL"}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1">{tr("Architecture:")}{" "}<span className="text-purple-500">{tr("Main branch")}</span></p>
                    </div>
                </Card>
            </div>

            {/* Protocol Activation */}
            <div className="bg-slate-900 rounded-[var(--ds-radius-large)] p-6 relative overflow-hidden group shadow-[var(--ds-shadow-raised)]">
                <div className="absolute right-0 top-0 p-8 opacity-5 scale-150 rotate-12">
                    <Icon icon={Wallet01Icon} size={120} className="text-white" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{tr("Float account")}</h3>
                        <p className="text-xs font-semibold text-white/40">{tr("Let this agent take payments from a float balance")}</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-[var(--ds-radius-large)] border border-white/5">
                        <span className="text-xs font-semibold text-white/60">{formData.isUsingFloat ? tr("Enabled") : tr("Disabled")}</span>
                        <Switch 
                            checked={formData.isUsingFloat} 
                            onCheckedChange={v => onInputChange("isUsingFloat", v)}
                            className={cn(formData.isUsingFloat && "data-[state=checked]:bg-[#ffd428]")}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {formData.isUsingFloat && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            {/* Architecture Mapping */}
                            <Card className="rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] p-8 shadow-[var(--ds-shadow-raised)] space-y-8">
                                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-white/5 pb-6">
                                    <Icon icon={Settings01Icon} className="size-5 text-blue-500" />
                                    <h4 className="text-lg font-semibold">{tr("Float setup")}</h4>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-semibold text-slate-400">{tr("Float type *")}</Label>
                                        <Select value={formData.floatType} onValueChange={v => onInputChange("floatType", v)}>
                                            <SelectTrigger className="h-14 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 px-6 font-semibold text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INDIVIDUAL" className="font-bold">{tr("Individual float")}</SelectItem>
                                                <SelectItem value="POOL_MAIN" className="font-bold">{tr("Main pool")}</SelectItem>
                                                <SelectItem value="POOL_LINKED" className="font-bold">{tr("Linked to a pool")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    {formData.floatType === "POOL_LINKED" && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t border-slate-50 dark:border-white/5">
                                            <Label className="text-xs font-semibold text-slate-400 font-mono">Main pool account *</Label>
                                            <Select value={formData.mainPoolId?.toString()} onValueChange={v => onInputChange("mainPoolId", parseInt(v))}>
                                                <SelectTrigger className="h-14 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.02] border-blue-500/20 px-6 font-semibold text-xs"><SelectValue placeholder={tr("Search offices…")} /></SelectTrigger>
                                                <SelectContent>
                                                    {poolMainUsers.map((u: any) => (
                                                        <SelectItem key={u.id} value={u.id.toString()} className="font-bold">
                                                            {u.fullName} (@{u.username})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </motion.div>
                                    )}
                                </div>
                            </Card>

                            {/* Yield Logic Calibration */}
                            <Card className="rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f2b] p-8 shadow-[var(--ds-shadow-raised)] space-y-8">
                                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-white/5 pb-6">
                                    <Icon icon={CheckListIcon} className="size-5 text-[#ffd428]" />
                                    <h4 className="text-lg font-semibold">{tr("Commission settings")}</h4>
                                </div>
                                <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.01] group/hub">
                                    <div className="flex flex-col items-center gap-4 transition-transform">
                                        <Icon icon={CheckListIcon} size={40} className="text-slate-200 dark:text-white/10 group-hover:text-emerald-500/30 transition-colors" />
                                        <p className="text-xs font-semibold text-slate-400">{tr("Choose a company to configure commission")}</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-semibold text-slate-400">{tr("Transfer mode *")}</Label>
                                        <Select value={formData.configurationType} onValueChange={v => onInputChange("configurationType", v)}>
                                            <SelectTrigger className="h-14 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 px-6 font-semibold text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="FULL_AMOUNT" className="font-bold">{tr("Full amount")}</SelectItem>
                                                <SelectItem value="COMMISSION_BASED" className="font-bold">{tr("Commission only")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.configurationType === "COMMISSION_BASED" && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-6 pt-4 border-t border-slate-50 dark:border-white/5">
                                            <div className="space-y-4">
                                                <Label className="text-xs font-semibold text-slate-400">{tr("Commission type")}</Label>
                                                <div className="flex gap-2">
                                                    {["PERCENTAGE", "AMOUNT"].map(t => (
                                                        <Button 
                                                            key={t}
                                                            variant="outline" 
                                                            className={cn("h-12 flex-1 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all", formData.commissionType === t ? "bg-slate-900 dark:bg-[#ffd428] text-white dark:text-slate-900 border-none shadow-[var(--ds-shadow-raised)]" : "border-slate-200 dark:border-white/5 opacity-50 hover:opacity-100")}
                                                            onClick={() => onInputChange("commissionType", t)}
                                                        >
                                                            {t === "PERCENTAGE" ? <Icon icon={PercentCircleIcon} className="mr-2 size-4" /> : <Icon icon={Money01Icon} className="mr-2 size-4" />}
                                                            {t}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-xs font-semibold text-slate-400">{tr("Quantifiable Factor *")}</Label>
                                                <div className="relative">
                                                    <Input 
                                                        type="number"
                                                        value={formData.commissionType === "PERCENTAGE" ? (formData.commissionPercentage ?? "") : (formData.commissionAmount ?? "")}
                                                        onChange={e => onInputChange(formData.commissionType === "PERCENTAGE" ? "commissionPercentage" : "commissionAmount", e.target.value === "" ? null : Number(e.target.value))}
                                                        className="h-14 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 px-6 font-semibold text-lg"
                                                        placeholder="0.00"
                                                    />
                                                    <div className="h-10 px-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between group-hover/btn:border-emerald-500/50 transition-colors">
                                                        <span className="text-xs font-semibold text-slate-400 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white">{tr("Active float")}</span>
                                                        <div className={cn("size-4 rounded-full flex items-center justify-center transition-all", formData.isUsingFloat ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-white/5")}>
                                                            {formData.isUsingFloat && <Icon icon={ArrowRight01Icon} size={10} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] p-8 border border-slate-200 dark:border-white/5 border-dashed flex items-center gap-6">
                            <div className="size-12 rounded-[var(--ds-radius-large)] bg-[#ffd428]/10 flex items-center justify-center">
                                <Icon icon={InformationCircleIcon} className="size-6 text-[#ffd428]" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 leading-relaxed flex-1">{tr("Changes apply when you save. Transactions already in progress keep their current settings.")}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
