import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/client";
import { getDict } from "@/i18n";
import { isLocale, LOCALES } from "@/domain/types";
import { fontVars } from "../../fonts";
import { THEME_SCRIPT } from "@/lib/theme";
import { OfflineBar } from "@/components/shell/offline-bar";
import "../../globals.css";

export const metadata: Metadata = {
  title: { default: "Tuma", template: "%s · Tuma" },
  description: "Parcel and cargo tracking and reporting by Hudumika.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${fontVars} antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies the chosen theme before paint (no light flash for a dark choice). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh" suppressHydrationWarning>
        <I18nProvider dict={getDict(locale)} locale={locale}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" />
          <OfflineBar />
        </I18nProvider>
      </body>
    </html>
  );
}
