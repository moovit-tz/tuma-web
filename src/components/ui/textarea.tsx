import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-[var(--ds-border-input)] placeholder:text-muted-foreground focus-visible:border-[var(--ds-border-focused)] focus-visible:ring-1 focus-visible:ring-[var(--ds-border-focused)] focus-visible:ring-inset aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-[var(--ds-radius-small)] border bg-[var(--ds-background-input)] px-3 py-2 text-sm text-[var(--ds-text)] transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
