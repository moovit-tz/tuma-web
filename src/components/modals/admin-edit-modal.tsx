"use client"

import { useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { CountryCodePicker } from "@/components/ui/country-code-picker"
import { LoadingSpinner } from "@/components/loading-spinner"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { PencilLine } from "lucide-react"
import type { User } from "@/types/user"
import { useTr } from "@/lib/i18n/portal"

const formSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    username: z.string().min(3, "Username must be at least 3 characters."),
    phoneNumber: z.string().min(9, "Invalid phone number."),
    email: z.string().email("Invalid email address.").or(z.literal("")).optional(),
    role: z.enum(["ADMIN", "OPS", "OWNER"]).default("ADMIN"),
    isActive: z.boolean().default(true),
})

const VALID_ROLES = ["ADMIN", "OPS", "OWNER"] as const
const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", OPS: "Operations", OWNER: "Owner" }

export type AdminEditFormValues = z.infer<typeof formSchema>

interface AdminEditModalProps {
    isOpen: boolean
    onClose: () => void
    admin: User | null
    onSave: (id: number, formData: AdminEditFormValues) => Promise<any>
    isLoading?: boolean
}

export function AdminEditModal({ isOpen, onClose, admin, onSave, isLoading = false }: AdminEditModalProps) {
    const tr = useTr()
    const form = useForm<AdminEditFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            username: "",
            phoneNumber: "+255",
            email: "",
            role: "ADMIN",
            isActive: true,
        },
    })

    useEffect(() => {
        if (admin) {
            form.reset({
                fullName: admin.fullName || "",
                username: admin.username || "",
                phoneNumber: admin.phoneNumber || "+255",
                email: admin.email || "",
                role: (VALID_ROLES as readonly string[]).includes(admin.role) ? (admin.role as "ADMIN" | "OPS" | "OWNER") : "ADMIN",
                isActive: admin.isActive ?? true,
            })
        }
    }, [admin, form])

    const handleClose = () => {
        form.reset()
        onClose()
    }

    const onSubmit = async (values: AdminEditFormValues) => {
        if (!admin) return
        await onSave(admin.id, values)
    }

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <PencilLine className="size-4" />
                        </div>
                        <SheetTitle>{tr("Edit System User")}</SheetTitle>
                    </div>
                    <SheetDescription>{tr("Update this account's details, role, or status.")}</SheetDescription>
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
                                        <Input {...field} />
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
                                        <Input {...field} />
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
                                    <FormLabel>{tr("Email")}</FormLabel>
                                    <FormControl>
                                        <Input type="email" {...field} />
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
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={tr("Select a role")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {VALID_ROLES.map((r) => (
                                                <SelectItem key={r} value={r}>
                                                    {ROLE_LABELS[r]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-md border p-3">
                                    <Label htmlFor="admin-active" className="cursor-pointer">{tr("Account active")}</Label>
                                    <FormControl>
                                        <Switch id="admin-active" checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>{tr("Cancel")}</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <LoadingSpinner size="sm" /> : tr("Save Changes")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}
