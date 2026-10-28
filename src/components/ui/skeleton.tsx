import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[var(--ds-background-neutral-subtle-pressed)] animate-pulse rounded-[var(--ds-radius-small)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
