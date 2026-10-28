"use client"

import { useEffect } from "react"
import { useTitle } from "@/context/TitleContext"
import { useAccess } from "@/hooks/use-access"
import { IntegrationsSettings } from "@/components/settings/integrations"
import { useTr } from "@/lib/i18n/portal"

export default function Page() {
    const tr = useTr()
    const { setTitle } = useTitle()
    useEffect(() => setTitle("Integrations"), [setTitle])
    const { can, isLoading } = useAccess()

    if (!isLoading && !can("settings.manage")) {
        return (
            <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Only admins can open integrations")}</p>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-300">
            <IntegrationsSettings />
        </div>
    )
}
