import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--ds-radius-small)] text-sm font-medium transition-colors duration-100 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border-focused)] aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary-dark",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60",
        outline:
          "border border-[var(--ds-border-input)] bg-[var(--ds-surface)] text-[var(--ds-text)] hover:bg-[var(--ds-background-neutral-subtle-hovered)] active:bg-[var(--ds-background-neutral-subtle-pressed)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-[var(--ds-text-subtle)] hover:bg-[var(--ds-background-neutral-subtle-hovered)] active:bg-[var(--ds-background-neutral-subtle-pressed)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 has-[>svg]:px-2.5",
        sm: "h-6 gap-1 px-2 has-[>svg]:px-1.5",
        lg: "h-10 px-4 has-[>svg]:px-3",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
