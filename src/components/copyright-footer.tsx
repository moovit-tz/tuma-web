import Link from "next/link"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface CopyrightFooterProps {
    className?: string
}

export function CopyrightFooter() {
    const tr = useTr()
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground">
      <p>
        {tr("&copy; {getFullYear} MySafari Parcel. All rights reserved.", { getFullYear: new Date().getFullYear() })}</p>
    </div>
  )
}

