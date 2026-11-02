import { fontVars } from "../../../fonts";
import "../../../globals.css";

export const metadata = { title: "Ondi (development stub)" };

export default function OndiLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVars} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>{children}</body>
    </html>
  );
}
