"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { CountryCodePicker } from "@/components/ui/country-code-picker"
import { LoadingSpinner } from "@/components/loading-spinner"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ShieldCheck, Eye, EyeOff } from "lucide-react"
import { getCompanies } from "@/lib/services/company"
import { useTr } from "@/lib/i18n/portal"

const formSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    username: z.string().min(3, "Username must be at least 3 characters."),
    phoneNumber: z.string().min(9, "Invalid phone number."),
    email: z.string().email("Invalid email address.").or(z.literal("")).optional(),
    password: z.string().min(6, "Password must be at least 6 characters."),
    role: z.enum(["ADMIN", "OPS", "OWNER"]).default("ADMIN"),
    companyId: z.string().optional(),
}).refine((data) => data.role !== "OWNER" || !!data.companyId, {
    message: "Please select a company for an owner account.",
    path: ["companyId"],
})

export type AdminFormValues = z.infer<typeof formSchema>

interface AdminModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (formData: AdminFormValues) => Promise<any>
    isLoading?: boolean
}

const ROLE_OPTIONS: { value: "ADMIN" | "OPS" | "OWNER"; label: string; description: string }[] = [
    { value: "ADMIN", label: "Admin", description: "Full system access across the Admin portal" },
    { value: "OPS", label: "Operations", description: "Access to the Operations portal" },
    { value: "OWNER", label: "Owner", description: "Company owner — access to the Owner portal for one company" },
]

export function AdminModal({ isOpen, onClose, onSave, isLoading = false }: AdminModalProps) {
    const tr = useTr()
    const [showPassword, setShowPassword] = useState(false)

    const form = useForm<AdminFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            username: "",
            phoneNumber: "+255",
            email: "",
            password: "",
            role: "ADMIN",
            companyId: "",
        },
    })

    const role = form.watch("role")

    const { data: companiesResponse, isLoading: isLoadingCompanies } = useQuery({
        queryKey: ["companies", "for-admin-modal"],
        queryFn: getCompanies,
        enabled: role === "OWNER",
    })

    const companies = Array.isArray((companiesResponse as any)?.data?.data)
        ? (companiesResponse as any).data.data
        : Array.isArray((companiesResponse as any)?.data)
            ? (companiesResponse as any).data
            : Array.isArray(companiesResponse)
                ? (companiesResponse as any)
                : []

    const handleClose = () => {
        form.reset()
        onClose()
    }

    const onSubmit = async (values: AdminFormValues) => {
        await onSave(values)
        form.reset()
    }

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ShieldCheck className="size-4" />
                        </div>
                        <SheetTitle>{tr("Add System User")}</SheetTitle>
                    </div>
                    <SheetDescription>{tr("Create an Admin, Operations, or Owner account.")}</SheetDescription>
                </SheetHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 pb-6">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Full name")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={tr("e.g. Jane Mwakalinga")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Username")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={tr("e.g. jane-mwakalinga")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Phone number")}</FormLabel>
                                    <FormControl>
                                        <CountryCodePicker value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Email (optional)")}</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="jane@mysafari.co.tz" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Temporary password")}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type={showPassword ? "text" : "password"} placeholder={tr("At least 6 characters")} {...field} />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            >
                                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Role")}</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            if (value !== "OWNER") form.setValue("companyId", "")
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={tr("Select a role")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ROLE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {ROLE_OPTIONS.find((o) => o.value === field.value)?.description}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {role === "OWNER" && (
                            <FormField
                                control={form.control}
                                name="companyId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("Company")}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCompanies}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={isLoadingCompanies ? tr("Loading companies...") : tr("Select a company")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {companies.map((company: any) => (
                                                    <SelectItem key={company.id} value={String(company.id)}>
                                                        {company.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>{tr("Cancel")}</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <LoadingSpinner size="sm" /> : tr("Create User")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}
