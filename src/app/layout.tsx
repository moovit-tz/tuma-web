import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import QueryProvider from "../providers/QueryProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/providers/AuthProvider"
import { AuthErrorHandler } from "@/components/auth-error-handler"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

// Default metadata for the entire app
export const metadata: Metadata = {
    title: {
        template: "%s | MySafari Parcel",
        default: "MySafari Parcel",
    },
    description: "Africa's Efficient Parcel Management System",
}

/*
 * Development only. A browser extension adds a "docs-creator" class to every
 * link before React loads, so the server HTML no longer matches and Next shows
 * a hydration error that isn't ours. This takes that one class back off until
 * the page has hydrated, then stops. Production pages don't get this script.
 */
const EXTENSION_CLASS_GUARD = `(function(){
  var CLS = "docs-creator";
  var strip = function (el) { if (el && el.classList && el.classList.contains(CLS)) el.classList.remove(CLS) };
  var sweep = function (root) { if (root && root.querySelectorAll) root.querySelectorAll("." + CLS).forEach(strip) };
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) {
      if (m.type === "attributes") strip(m.target);
      else m.addedNodes.forEach(function (n) { strip(n); sweep(n) });
    });
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("load", function () { setTimeout(function () { sweep(document); mo.disconnect() }, 4000) });
})();`

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        {process.env.NODE_ENV === "development" && (
            <head>
                <script dangerouslySetInnerHTML={{ __html: EXTENSION_CLASS_GUARD }} />
            </head>
        )}
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider>
                <QueryProvider>
                    <AuthErrorHandler />
                    {children}
                </QueryProvider>
            </AuthProvider>
        </ThemeProvider>
        </body>
        </html>
    )
}
