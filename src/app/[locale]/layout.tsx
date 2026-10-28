import type React from "react"
import { NextIntlClientProvider } from "next-intl"
import { locales } from "../../../i18n.config"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { Toaster } from "@/components/ui/toaster"

// Generate static params for build
export function generateStaticParams() {
    return locales.map((locale) => ({ locale }))
}

// Main layout component
export default async function LocaleLayout({
                                               children,
                                               params,
                                           }: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    // Await the params before using them
    const { locale } = await params

    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as any)) {
        notFound()
    }

    // Providing all messages to the client
    const messages = await getMessages({ locale })

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <Toaster />
        </NextIntlClientProvider>
    )
}
