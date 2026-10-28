"use client"
import { Icon } from "@/components/ui/icon"

import { useState, useEffect } from "react"
import { X as XIcon, Loader2, CheckCircle2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { getUserProfile, updateUserProfile, changeUserPassword } from "@/lib/services/user"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { UserCircleIcon, SecurityCheckIcon, Clock01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { DetailSkeleton } from "@/components/ui/skeletons"
import { SheetSection, DetailList, StatGrid, SheetEmpty } from "@/components/sheets/sheet-blocks"
import { useTr } from "@/lib/i18n/portal"

interface UserProfile {
    id: number
    uuid: string
    fullName: string
    username: string
    email: string
    phoneNumber: string
    role: string
    roles: string[]
    userType: "admin" | "user"
    profileImage?: string
    createdAt: string
    updatedAt: string
    isActive: boolean
    company?: {
        id: number
        name: string
        phoneNumber: string
        address: string
        email: string
    } | null
    activities: Array<{
        id: number
        activity: string
        createdAt: string
    }>
    parcelStatistics: {
        sent: number
        received: number
        dispatched: number
        delivered: number
        recentActivity: number
    }
    accountSummary: {
        accountAge: number
        isFirstLogin: boolean
        lastLoginAt: string | null
        isActive: boolean
        isUsingFloat: boolean
        emailVerified: boolean
    }
}

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

type ProfileTab = "info" | "activity" | "security"

const when = (d?: string | null, withTime = false) =>
    d
        ? new Date(d).toLocaleString("en-GB", withTime
            ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
            : { day: "2-digit", month: "short", year: "numeric" })
        : "—"

const roleLabel = (role?: string) =>
    role ? role.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—"

/** The signed-in user's own profile — same sheet design as agents, parcels and vehicles. */
export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const tr = useTr()
    const { toast } = useToast()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [tab, setTab] = useState<ProfileTab>("info")
    const [password, setPassword] = useState({ current: "", new: "", confirm: "" })

    useEffect(() => {
        if (isOpen) {
            setTab("info")
            setPassword({ current: "", new: "", confirm: "" })
            loadUserProfile()
        }
    }, [isOpen])

    const loadUserProfile = async () => {
        try {
            setLoading(true)
            const response = await getUserProfile()
            if (response.success && response.user) {
                setProfile(response.user)
            }
        } catch (error) {
            console.error("Error loading profile:", error)
            toast({ title: tr("Couldn't load your profile"), description: tr("Please try again."), variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleProfileUpdate = async () => {
        if (!profile) return
        try {
            setUpdating(true)
            await updateUserProfile({
                fullName: profile.fullName,
                username: profile.username,
                email: profile.email,
                phoneNumber: profile.phoneNumber,
                uuid: profile.uuid,
            })
            toast({ title: tr("Profile saved"), description: tr("Your details have been updated.") })
            loadUserProfile()
        } catch (error: any) {
            toast({ title: tr("Couldn't save your profile"), description: error.message, variant: "destructive" })
        } finally {
            setUpdating(false)
        }
    }

    const handlePasswordUpdate = async () => {
        if (password.new !== password.confirm) {
            toast({ title: tr("Passwords don't match"), description: tr("Type the same new password twice."), variant: "destructive" })
            return
        }
        try {
            setUpdating(true)
            await changeUserPassword({ currentPassword: password.current, newPassword: password.new })
            toast({ title: tr("Password changed"), description: tr("Use your new password next time you sign in.") })
            setPassword({ current: "", new: "", confirm: "" })
        } catch (error: any) {
            toast({ title: tr("Couldn't change your password"), description: error.message, variant: "destructive" })
        } finally {
            setUpdating(false)
        }
    }

    const isActive = profile ? (profile.accountSummary?.isActive ?? profile.isActive) !== false : true

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="[&>button]:hidden flex h-full w-full flex-col overflow-hidden border-l p-0 outline-none sm:max-w-[640px] bg-white dark:bg-[#0f1117]"
            >
                <SheetTitle className="sr-only">{tr("Your profile")}</SheetTitle>
                <SheetDescription className="sr-only">{tr("Your details, recent activity and password.")}</SheetDescription>

                {loading ? (
                    <div className="flex-1 overflow-hidden">
                        <div className="h-48 bg-[#242a37]" />
                        <DetailSkeleton className="p-8" />
                    </div>
                ) : !profile ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#f1f3f6] p-8 text-center dark:bg-[#0a0c10]">
                        <Icon icon={InformationCircleIcon} size={32} className="text-slate-400" />
                        <div>
                            <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load your profile")}</p>
                            <p className="mt-1 text-sm text-slate-500">{tr("Check your connection and try again.")}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose}>{tr("Close")}</Button>
                            <Button onClick={loadUserProfile}>{tr("Try again")}</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Header — same layout as the agent sheet; one close button ── */}
                        <div className="shrink-0 bg-[#242a37] text-white">
                            <div className="p-5 pt-6 sm:p-8 sm:pt-10">
                                <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                    <div className="flex size-14 items-center justify-center overflow-hidden rounded-[var(--ds-radius-small)] bg-[#ffd428]">
                                        {profile.profileImage ? (
                                            <img src={profile.profileImage} alt="" className="size-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-bold text-[#242a37]">{profile.fullName?.charAt(0) || "?"}</span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={onClose}
                                        aria-label={tr("Close")}
                                        className="flex size-9 items-center justify-center rounded-full border-none bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
                                    >
                                        <XIcon size={18} />
                                    </Button>
                                </div>
                                <div className="flex items-end justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-2xl font-bold leading-none">{profile.fullName}</h2>
                                        <p className="mt-2 flex items-center gap-2 truncate text-xs font-semibold text-white/50">
                                            {roleLabel(profile.role)} <span className="text-white/20">•</span> @{profile.username}
                                        </p>
                                    </div>
                                    <Badge
                                        className={cn(
                                            "h-7 shrink-0 rounded-[var(--ds-radius-large)] border-none px-3 text-xs font-semibold",
                                            isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
                                        )}
                                    >
                                        {isActive ? "ACTIVE" : "INACTIVE"}
                                    </Badge>
                                </div>
                            </div>
                            <div role="tablist" className="custom-scrollbar flex gap-1 overflow-x-auto border-t border-white/10 px-6">
                                {([
                                    { id: "info", label: tr("Info"), icon: UserCircleIcon },
                                    { id: "activity", label: tr("Activity"), icon: Clock01Icon },
                                    { id: "security", label: tr("Security"), icon: SecurityCheckIcon },
                                ] as const).map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === t.id}
                                        onClick={() => setTab(t.id)}
                                        className={cn(
                                            "-mb-px flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-2 py-3 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428]",
                                            tab === t.id ? "border-[#ffd428] text-white" : "border-transparent text-white/60 hover:border-white/30 hover:text-white",
                                        )}
                                    >
                                        <Icon icon={t.icon} className="size-4" />
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Body ── */}
                        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                            {tab === "info" && (
                                <>
                                    <StatGrid
                                        columns={3}
                                        tiles={[
                                            { label: tr("Parcels booked"), value: (profile.parcelStatistics?.sent ?? 0).toLocaleString(), hint: tr("All time"), emphasis: true },
                                            { label: tr("Parcels received"), value: (profile.parcelStatistics?.received ?? 0).toLocaleString(), hint: tr("All time") },
                                            { label: tr("Member for"), value: `${(profile.accountSummary?.accountAge ?? 0).toLocaleString()} days`, hint: tr("Since {when}", { when: when(profile.createdAt) }) },
                                        ]}
                                    />

                                    <SheetSection title={tr("Your details")} icon={UserCircleIcon}>
                                        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                                            {([
                                                { key: "fullName", label: tr("Full name"), type: "text" },
                                                { key: "username", label: tr("Username"), type: "text" },
                                                { key: "email", label: tr("Email"), type: "email" },
                                                { key: "phoneNumber", label: tr("Phone"), type: "tel" },
                                            ] as const).map((f) => (
                                                <div key={f.key} className="space-y-1.5">
                                                    <Label htmlFor={`profile-${f.key}`} className="text-xs font-semibold text-slate-500">{f.label}</Label>
                                                    <Input
                                                        id={`profile-${f.key}`}
                                                        type={f.type}
                                                        value={profile[f.key] ?? ""}
                                                        onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                                                        className="h-10 rounded-[var(--ds-radius-small)] border-slate-200 bg-white text-sm dark:border-white/10 dark:bg-[#0f1117]"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end border-t border-slate-100 px-5 py-3 dark:border-white/5">
                                            <Button onClick={handleProfileUpdate} disabled={updating} className="gap-2 bg-[#242a37] text-white hover:bg-[#1a1f2b]">
                                                {updating ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-[#ffd428]" />}
                                                {updating ? tr("Saving…") : tr("Save changes")}
                                            </Button>
                                        </div>
                                    </SheetSection>

                                    <SheetSection title={tr("Account")}>
                                        <DetailList
                                            rows={[
                                                { label: tr("Role"), value: (profile.roles?.length ? profile.roles : [profile.role]).map(roleLabel).join(", ") },
                                                { label: tr("Company"), value: profile.company?.name || "—" },
                                                { label: tr("Joined"), value: when(profile.createdAt) },
                                                { label: tr("Last sign-in"), value: when(profile.accountSummary?.lastLoginAt, true) },
                                                { label: tr("Float"), value: profile.accountSummary?.isUsingFloat ? "Enabled" : "Not enabled" },
                                                { label: tr("Email verified"), value: profile.accountSummary?.emailVerified ? "Yes" : "No" },
                                            ]}
                                        />
                                    </SheetSection>
                                </>
                            )}

                            {tab === "activity" && (
                                <SheetSection title={tr("Recent activity")} icon={Clock01Icon}>
                                    {(profile.activities?.length ?? 0) === 0 ? (
                                        <SheetEmpty icon={Clock01Icon} title={tr("No activity yet")} description={tr("Things you do in the portal will be listed here.")} />
                                    ) : (
                                        <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                            {profile.activities.slice(0, 25).map((a) => (
                                                <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-3">
                                                    <p className="min-w-0 text-sm font-medium text-[#242a37] dark:text-white">{a.activity}</p>
                                                    <p className="shrink-0 text-xs tabular-nums text-slate-500">{when(a.createdAt, true)}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </SheetSection>
                            )}

                            {tab === "security" && (
                                <SheetSection title={tr("Change password")} icon={SecurityCheckIcon}>
                                    <div className="space-y-4 p-5">
                                        {([
                                            { key: "current", label: tr("Current password") },
                                            { key: "new", label: tr("New password") },
                                            { key: "confirm", label: tr("Confirm new password") },
                                        ] as const).map((f) => (
                                            <div key={f.key} className="space-y-1.5">
                                                <Label htmlFor={`password-${f.key}`} className="text-xs font-semibold text-slate-500">{f.label}</Label>
                                                <Input
                                                    id={`password-${f.key}`}
                                                    type="password"
                                                    autoComplete={f.key === "current" ? "current-password" : "new-password"}
                                                    value={password[f.key]}
                                                    onChange={(e) => setPassword({ ...password, [f.key]: e.target.value })}
                                                    className="h-10 rounded-[var(--ds-radius-small)] border-slate-200 bg-white text-sm dark:border-white/10 dark:bg-[#0f1117]"
                                                />
                                            </div>
                                        ))}
                                        {password.confirm && password.new !== password.confirm && (
                                            <p className="text-xs font-semibold text-rose-600">{tr("The new passwords don't match.")}</p>
                                        )}
                                    </div>
                                    <div className="flex justify-end border-t border-slate-100 px-5 py-3 dark:border-white/5">
                                        <Button
                                            onClick={handlePasswordUpdate}
                                            disabled={updating || !password.current || !password.new || password.new !== password.confirm}
                                            className="gap-2 bg-[#242a37] text-white hover:bg-[#1a1f2b]"
                                        >
                                            {updating ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4 text-[#ffd428]" />}
                                            {updating ? tr("Saving…") : tr("Change password")}
                                        </Button>
                                    </div>
                                </SheetSection>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
