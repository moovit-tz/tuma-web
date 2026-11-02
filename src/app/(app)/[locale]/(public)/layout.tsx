import { SupportWidget } from "@/components/brand/support-widget";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SupportWidget />
    </>
  );
}
