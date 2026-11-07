"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Prints the page (a manifest to hand the carrier). */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer /> {label}
    </Button>
  );
}
