"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTitle } from "@/context/TitleContext"
import { useAccess } from "@/hooks/use-access"
import { RolesPermissions } from "@/components/settings/roles-permissions"
import { AppVersionsSettings } from "@/components/settings/settings-tables"
import { useTr } from "@/lib/i18n/portal"

const TABS = [
    { value: "roles", label: "Roles & permissions" },
    { value: "apps", label: "App versions" },
] as const

function SettingsContent() {
    const tr = useTr()
    const { setTitle } = useTitle()
    useEffect(() => setTitle("Settings"), [setTitle])
    const { can, isLoading } = useAccess()
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()
    const tab = TABS.some((t) => t.value === params.get("tab")) ? (params.get("tab") as string) : "roles"

    if (!isLoading && !can("settings.manage")) {
        return (
            <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Only admins can change settings")}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Settings")}</h2>
                <p className="text-xs font-bold text-slate-400 mt-1">{tr("Who can do what, and which app versions are live")}</p>
            </div>
            <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })} className="space-y-6">
                {/* Same look as the other portal tab bars; not pinned, since the roles panel below has its own pinned parts */}
                <TabsList className="flex bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto border-none">
                    {TABS.map((t) => (
                        <TabsTrigger key={t.value} value={t.value} className="flex-1 h-11 text-xs font-semibold cursor-pointer rounded-[var(--ds-radius-small)] data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-[#242a37] after:hidden">
                            {tr(t.label)}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="roles"><RolesPermissions /></TabsContent>
                <TabsContent value="apps"><AppVersionsSettings /></TabsContent>
            </Tabs>
        </div>
    )
}

// useSearchParams needs a Suspense boundary in the App Router
export default function SettingsPage() {
    return (
        <Suspense fallback={null}>
            <SettingsContent />
        </Suspense>
    )
}
