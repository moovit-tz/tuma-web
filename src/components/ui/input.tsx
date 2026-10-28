import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-[var(--ds-border-input)] flex h-10 w-full min-w-0 rounded-[var(--ds-radius-small)] border bg-[var(--ds-background-input)] px-3 py-1 text-sm text-[var(--ds-text)] transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[var(--ds-border-focused)] focus-visible:ring-1 focus-visible:ring-[var(--ds-border-focused)] focus-visible:ring-inset",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
