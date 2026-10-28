import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { type ButtonProps, buttonVariants } from "@/components/ui/button"
import { useTr } from "@/lib/i18n/portal"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => {
    const tr = useTr()
    return ((
    <nav
        role="navigation"
        aria-label={tr("pagination")}
        className={cn("mx-auto flex w-full justify-center", className)}
        {...props}
    />
))
}

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
    ({ className, ...props }, ref) => (
        <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
    ),
)
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
    isActive?: boolean
    disabled?: boolean
} & Pick<ButtonProps, "size"> &
    React.ComponentProps<"a">

const PaginationLink = ({ className, isActive, disabled, size = "icon", ...props }: PaginationLinkProps) => (
    <a
        aria-current={isActive ? "page" : undefined}
        className={cn(
            buttonVariants({
                variant: isActive ? "default" : "outline",
                size,
            }),
            disabled && "pointer-events-none opacity-50",
            className,
        )}
        {...props}
    />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({ className, disabled, ...props }: React.ComponentProps<typeof PaginationLink>) => {
    const tr = useTr()
    return ((
    <PaginationLink
        aria-label={tr("Go to previous page")}
        size="default"
        className={cn("gap-1 pl-2.5", className)}
        disabled={disabled}
        {...props}
    >
        <ChevronLeft className="h-4 w-4" />
        <span>{tr("Previous")}</span>
    </PaginationLink>
))
}
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({ className, disabled, ...props }: React.ComponentProps<typeof PaginationLink>) => {
    const tr = useTr()
    return ((
    <PaginationLink
        aria-label={tr("Go to next page")}
        size="default"
        className={cn("gap-1 pr-2.5", className)}
        disabled={disabled}
        {...props}
    >
        <span>{tr("Next")}</span>
        <ChevronRight className="h-4 w-4" />
    </PaginationLink>
))
}
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => {
    const tr = useTr()
    return ((
    <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">{tr("More pages")}</span>
  </span>
))
}
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
}
