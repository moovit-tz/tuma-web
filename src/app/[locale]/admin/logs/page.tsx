"use client"

import { useEffect } from "react"
import { useTitle } from "@/context/TitleContext"
import { useAccess } from "@/hooks/use-access"
import { PlatformLogs } from "@/components/settings/platform-logs"
import { useTr } from "@/lib/i18n/portal"

export default function Page() {
    const tr = useTr()
    const { setTitle } = useTitle()
    useEffect(() => setTitle("Platform Logs"), [setTitle])
    const { can, isLoading } = useAccess()

    if (!isLoading && !can("settings.manage")) {
        return (
            <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Only admins can open platform logs")}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Platform Logs")}</h2>
                <p className="text-xs font-bold text-slate-400 mt-1">{tr("Server messages and who did what across the portal and the apps")}</p>
            </div>
            <PlatformLogs />
        </div>
    )
}
