import "../../globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "MySafari Parcel - Login",
    description: "Access the MySafari Parcel management portal to manage your deliveries",
}

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={inter.className}>
            {children}
        </div>
    )
}

