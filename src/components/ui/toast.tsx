"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            // Bottom of the screen on phones (in thumb reach), bottom-right on larger screens
            "toast-viewport fixed bottom-0 left-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-3 outline-none sm:left-auto sm:p-5 md:max-w-[400px]",
            className,
        )}
        {...props}
    />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
    // White card with a coloured accent and icon; the variant only changes the accent
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-200 bg-white py-3.5 pl-4 pr-10 text-[#242a37] shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] transition-all dark:border-white/10 dark:bg-[#242a37] dark:text-white " +
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none " +
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[swipe=end]:animate-out",
    {
        variants: {
            variant: {
                default: "toast-default",
                destructive: "destructive",
                success: "success",
                warning: "warning",
                info: "info",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
)

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
    return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            "mt-2 inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] border border-slate-200 bg-transparent px-3 text-xs font-semibold transition-colors hover:bg-slate-100 focus:outline-none focus-visible:outline-2 focus-visible:outline-[#242a37] disabled:pointer-events-none disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10",
            className,
        )}
        {...props}
    />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        aria-label="Close"
        className={cn(
            "absolute right-2.5 top-2.5 rounded-[var(--ds-radius-small)] p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#242a37] focus:outline-none focus-visible:outline-2 focus-visible:outline-[#242a37] dark:hover:bg-white/10 dark:hover:text-white",
            className,
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold leading-snug", className)} {...props} />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description ref={ref} className={cn("text-[13px] leading-snug text-slate-500 dark:text-slate-300 break-words", className)} {...props} />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
}
