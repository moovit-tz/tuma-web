import React, { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { getCompanies } from "@/lib/services/company"
import { registerAdmin } from "@/lib/services/user"
import {
    UserGroupIcon,
    Mail01Icon,
    ContactIcon,
    LockPasswordIcon,
    Building03Icon,
    Shield01Icon,
    AsteriskIcon,
    RefreshIcon,
    Copy01Icon,
    CheckListIcon,
    UserIcon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { useTr } from "@/lib/i18n/portal"

interface BusOwnerRegistrationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function BusOwnerRegistrationModal({ isOpen, onClose, onSuccess }: BusOwnerRegistrationModalProps) {
    const tr = useTr()
    const { toast } = useToast()
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedField(field)
            toast({
                title: tr("Copied!"),
                description: tr("{field} has been copied to clipboard.", { field }),
            })
            setTimeout(() => setCopiedField(null), 2000)
        } catch (err) {
            toast({
                variant: "destructive",
                title: tr("Failed to copy"),
                description: tr("Manual copy required."),
            })
        }
    }
    const queryClient = useQueryClient()

    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        phoneNumber: "",
        password: "",
        companyId: "",
        requirePasswordChange: true,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    const { data: companiesResponse, isLoading: isLoadingCompanies } = useQuery({
        queryKey: ["companies-for-registration"],
        queryFn: async () => {
            return getCompanies({ limit: 1000, paginate: false })
        },
        enabled: isOpen,
    })

    const companies = React.useMemo(() => {
        if (!companiesResponse) return []
        if (Array.isArray(companiesResponse)) return companiesResponse
        if (companiesResponse.data && Array.isArray(companiesResponse.data)) return companiesResponse.data
        return []
    }, [companiesResponse])

    const generateCredentials = (fullName: string) => {
        if (!fullName.trim()) return

        const baseUsername = fullName
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .join(".")
            .replace(/[^a-z0-9.]/g, "")

        const randomID = Math.floor(1000 + Math.random() * 9000)
        const username = `${baseUsername}.${randomID}`

        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        let password = ""
        for (let i = 0; i < 12; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length))
        }

        setFormData(prev => ({
            ...prev,
            username,
            password
        }))

        if (touched.username) setErrors(prev => ({ ...prev, username: "" }))
        if (touched.password) setErrors(prev => ({ ...prev, password: "" }))
    }

    const handleRegenerate = () => {
        if (formData.fullName) {
            generateCredentials(formData.fullName)
            toast({
                title: tr("Credentials Regenerated"),
                description: tr("New username and password have been generated."),
            })
        }
    }

    useEffect(() => {
        if (isOpen) {
            setFormData({
                fullName: "",
                username: "",
                email: "",
                phoneNumber: "",
                password: "",
                companyId: "",
                requirePasswordChange: true,
            })
            setErrors({})
            setTouched({})
        }
    }, [isOpen])

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.fullName.trim()) newErrors.fullName = "Full name is required"
        if (!formData.username.trim()) newErrors.username = "Username is required"
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required"
        if (!formData.password.trim()) newErrors.password = "Password is required"
        if (!formData.companyId) newErrors.companyId = "Company selection is required"

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    const registerMutation = useMutation({
        mutationFn: registerAdmin,
        onSuccess: () => {
            toast({
                title: tr("Success"),
                description: tr("Owner registered."),
            })
            onSuccess?.()
            onClose()
        },
        onError: (error: any) => {
            toast({
                title: tr("Registration Failed"),
                description: error.message || "An error occurred during registration",
                variant: "destructive",
            })
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
        setTouched(allTouched)

        if (!validateForm()) return

        registerMutation.mutate({
            ...formData,
            isFirstLogin: formData.requirePasswordChange
        })
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[720px] p-0 border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full inset-y-0 right-0 outline-none overflow-hidden [&>button]:hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Register owner")}</SheetTitle>
                    <SheetDescription>{tr("Add a new owner account.")}</SheetDescription>
                </SheetHeader>

                {/* ── Header ── */}
                <div className="bg-[#242a37] text-white relative overflow-hidden flex-shrink-0">
                    
                    <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                            <div className="size-14 rounded-[var(--ds-radius-small)] bg-[#ffd428] border border-white/20 flex items-center justify-center overflow-hidden">
                                 <Icon icon={Shield01Icon} size={28} className="text-[#242a37]" />
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
                                <h2 className="text-2xl font-bold leading-none m-0 p-0 text-white">{tr("Add owner")}</h2>
                                <p className="text-white/50 text-xs font-semibold mt-2 flex items-center gap-2">{tr("Security")}{" "}<span className="text-white/20">•</span>{" "}{tr("New account")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="h-7 px-3 rounded-[var(--ds-radius-large)] bg-[#ffd428] text-[#242a37] text-[11px] font-semibold uppercase border-none shadow-[var(--ds-shadow-raised)] flex items-center justify-center translate-y-[2px]">{tr("NEW REGISTRATION")}</Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar bg-[#f1f3f6] dark:bg-[#0a0c10]">
                    <form onSubmit={handleSubmit} className="space-y-10 max-w-2xl mx-auto">
                        <div className="space-y-8">
                            {/* Personal Info Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/5 pb-4">
                                    <div className="size-8 rounded-[var(--ds-radius-small)] bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Icon icon={UserIcon} size={18} />
                                    </div>
                                    <h3 className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Basic Information")}</h3>
                                </div>

                                <div className="space-y-4">
                                    <Label htmlFor="owner-full-name" className="text-xs font-semibold text-slate-400">{tr("Full Legal Identity")}</Label>
                                    <Input
                                        id="owner-full-name"
                                        value={formData.fullName}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setFormData(prev => ({ ...prev, fullName: val }))
                                            if (val.trim().length >= 3) {
                                                generateCredentials(val)
                                            }
                                        }}
                                        onBlur={() => handleBlur("fullName")}
                                        placeholder={tr("E.G. ABDALLAH DOO")}
                                        className={cn(
                                            "h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all",
                                            touched.fullName && errors.fullName && "border-red-500 ring-2 ring-red-500/10"
                                        )}
                                    />
                                    {touched.fullName && errors.fullName && <p className="text-xs text-red-500 font-semibold">{errors.fullName}</p>}
                                </div>

                                <div className="space-y-4">
                                    <Label htmlFor="owner-phone-number" className="text-xs font-semibold text-slate-400">{tr("Primary Dial Link")}</Label>
                                    <Input
                                        id="owner-phone-number"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                        onBlur={() => handleBlur("phoneNumber")}
                                        placeholder={tr("+255 7XX XXX XXX")}
                                        className={cn(
                                            "h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all",
                                            touched.phoneNumber && errors.phoneNumber && "border-red-500 ring-2 ring-red-500/10"
                                        )}
                                    />
                                    {touched.phoneNumber && errors.phoneNumber && <p className="text-xs text-red-500 font-semibold">{errors.phoneNumber}</p>}
                                </div>
                            </div>

                            {/* Node Auth Section */}
                            {(formData.username || formData.password) && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white dark:bg-[#1a1f2b] p-6 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs">
                                            <Icon icon={LockPasswordIcon} size={14} className="text-[#ffd428]" />{tr("Access keys")}</div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRegenerate}
                                            className="h-8 px-3 rounded-lg text-slate-400 hover:text-[#ffd428] hover:bg-[#ffd428]/5 transition-colors text-xs font-semibold"
                                        >
                                            <Icon icon={RefreshIcon} size={14} className="mr-2" />{tr("Regenerate")}</Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-400 font-semibold">{tr("Access Hook")}</Label>
                                            <div className="relative group">
                                                <div className="bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 px-4 py-3 rounded-lg text-xs font-mono font-semibold text-slate-900 dark:text-white break-all pr-10">
                                                    {formData.username}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(formData.username, "Username")}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#ffd428]/10 text-slate-400 hover:text-[#ffd428] rounded-lg"
                                                >
                                                    {copiedField === "Username" ? <Icon icon={CheckListIcon} size={14} className="text-emerald-500" /> : <Icon icon={Copy01Icon} size={14} />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-400 font-semibold">{tr("Auth Secret")}</Label>
                                            <div className="relative group">
                                                <div className="bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 px-4 py-3 rounded-lg text-xs font-mono font-semibold text-slate-900 dark:text-white break-all pr-10">
                                                    {formData.password}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(formData.password, "Password")}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#ffd428]/10 text-slate-400 hover:text-[#ffd428] rounded-lg"
                                                >
                                                    {copiedField === "Password" ? <Icon icon={CheckListIcon} size={14} className="text-emerald-500" /> : <Icon icon={Copy01Icon} size={14} />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 flex items-center gap-3">
                                        <Icon icon={AsteriskIcon} size={10} className="text-[#ffd428]" />
                                        <p className="text-xs text-slate-400 font-semibold leading-none">{tr("MANDATORY SECURITY RESET REQUIRED ON INITIAL HANDSHAKE")}</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Network Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/5 pb-4">
                                    <div className="size-8 rounded-[var(--ds-radius-small)] bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <Icon icon={Building03Icon} size={18} />
                                    </div>
                                    <h3 className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Network Association")}</h3>
                                </div>

                                <div className="space-y-4">
                                    <Label htmlFor="owner-company-id" className="text-xs font-semibold text-slate-400">{tr("Company Group")}</Label>
                                    <Select
                                        value={formData.companyId}
                                        onValueChange={(val) => {
                                            setFormData(prev => ({ ...prev, companyId: val }))
                                            if (touched.companyId) setErrors(prev => ({ ...prev, companyId: "" }))
                                        }}
                                    >
                                        <SelectTrigger className={cn(
                                            "h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all",
                                            touched.companyId && errors.companyId && "border-red-500 ring-2 ring-red-500/10"
                                        )}>
                                            <SelectValue placeholder={tr("UNIFIED NETWORK SELECTOR")} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-[var(--ds-radius-large)] border-slate-200 dark:border-white/10 shadow-[var(--ds-shadow-raised)] p-1 bg-white dark:bg-[#0f172a]">
                                            {companies?.map((company) => (
                                                <SelectItem key={company.id} value={company.id.toString()} className="rounded-lg py-3">
                                                    <span className="text-xs font-semibold">{company.name}</span>
                                                </SelectItem>
                                            ))}
                                            {companies?.length === 0 && <SelectItem value="none" disabled>{tr("NO COMPANIES AVAILABLE")}</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                    {touched.companyId && errors.companyId && <p className="text-xs text-red-500 font-semibold">{errors.companyId}</p>}
                                </div>

                                <motion.div 
                                    className="flex items-center space-x-4 p-5 bg-white dark:bg-white/5 rounded-[var(--ds-radius-large)] border border-slate-200 dark:border-white/5 transition-colors hover:border-[#ffd428]/30 group cursor-pointer shadow-[var(--ds-shadow-raised)]"
                                    onClick={() => setFormData(p => ({ ...p, requirePasswordChange: !p.requirePasswordChange }))}
                                >
                                    <Checkbox
                                        id="require-password-change"
                                        checked={formData.requirePasswordChange}
                                        onCheckedChange={(checked) => setFormData(p => ({ ...p, requirePasswordChange: !!checked }))}
                                        className="h-5 w-5 rounded border-slate-200 dark:border-white/10 data-[state=checked]:bg-[#ffd428] data-[state=checked]:border-[#ffd428] data-[state=checked]:text-[#242a37]"
                                    />
                                    <div className="grid gap-0.5 leading-none">
                                        <Label htmlFor="require-password-change" className="text-xs font-semibold text-[#242a37] dark:text-white cursor-pointer group-hover:text-[#ffd428] transition-colors">{tr("Force Handshake Update")}</Label>
                                        <p className="text-xs text-slate-400 font-bold mt-1 opacity-70">{tr("Security enforcement: User must refresh auth token on first entry")}</p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-10">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 h-12 rounded-[var(--ds-radius-small)] text-slate-400 font-semibold text-xs border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                            >{tr("Cancel")}</Button>
                            <Button
                                type="submit"
                                disabled={registerMutation.isPending}
                                className="flex-[2] h-12 rounded-[var(--ds-radius-large)] bg-[#242a37] hover:bg-[#2a3241] text-[#ffd428] font-semibold text-xs shadow-[var(--ds-shadow-raised)] transition-colors"
                            >
                                {registerMutation.isPending ? tr("Saving…") : tr("Register")}
                            </Button>
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
