import { fontVars } from "../../../fonts";
import "../../../globals.css";

export const metadata = { title: "ComplyOS (development stub)" };

export default function ComplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVars} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>{children}</body>
    </html>
  );
}
