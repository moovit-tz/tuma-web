"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Check, X } from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

// User form schema with validation
const userFormSchema = z.object({
    first_name: z.string().min(2, "First name must be at least 2 characters."),
    last_name: z.string().min(2, "Last name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    phone_number: z.string().optional(),
    id_number: z.string().optional(),
    type: z.enum(["Admin", "Agent", "Driver", "Conductor"], {
        required_error: "Please select a user type.",
    }),
    company_id: z.coerce.number().optional(),
    password: z.string().min(8, "Password must be at least 8 characters.").optional(),
    password_confirmation: z.string().optional(),
    is_active: z.boolean().default(true),
    use_float: z.boolean().default(false),
    otp: z.string().optional(),
    role: z.coerce.number().optional(),
})

// Add password confirmation validation
const createUserSchema = userFormSchema
    .extend({
        password: z.string().min(8, "Password must be at least 8 characters."),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: "Passwords do not match",
        path: ["password_confirmation"],
    })

// For editing, passwords are optional
const editUserSchema = userFormSchema
    .extend({
        password: z.string().min(8, "Password must be at least 8 characters.").optional(),
        password_confirmation: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.password) {
                return data.password === data.password_confirmation
            }
            return true
        },
        {
            message: "Passwords do not match",
            path: ["password_confirmation"],
        },
    )

// Props for the UserForm component
interface UserFormProps {
    initialData?: any
    onSubmit: (data: any) => Promise<boolean>
    companies: any[]
    userType?: string
    isEditMode?: boolean
    roles?: any[]
}

export function UserForm({
                             initialData,
                             onSubmit,
                             companies,
                             roles = [],
                             userType = "system",
                             isEditMode = false,
                         }: UserFormProps) {
    const tr = useTr()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(!isEditMode)
    const [isLoadingRoles, setIsLoadingRoles] = useState(false)
    const [availableRoles, setAvailableRoles] = useState<any[]>(roles)

    // Determine which schema to use
    const formSchema = isEditMode ? editUserSchema : createUserSchema

    // Initialize the form with react-hook-form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            email: initialData?.email || "",
            phone_number: initialData?.phone_number || "",
            id_number: initialData?.id_number || "",
            type: initialData?.type || "Admin",
            company_id: initialData?.company_id || undefined,
            password: "",
            password_confirmation: "",
            is_active: initialData?.is_active ?? true,
            use_float: initialData?.use_float ?? false,
            otp: initialData?.otp || "",
            role: initialData?.role || undefined,
        },
    })

    // Fetch roles if not provided
    useEffect(() => {
        if (roles.length === 0) {
            fetchRoles()
        }
    }, [roles])

    const fetchRoles = async () => {
        setIsLoadingRoles(true)
        try {
            const response = await fetch("/api/proxy/roles")
            if (!response.ok) {
                throw new Error("Failed to fetch roles")
            }
            const data = await response.json()
            setAvailableRoles(data.data || [])
        } catch (error) {
            console.error("Error fetching roles:", error)
        } finally {
            setIsLoadingRoles(false)
        }
    }

    // Handle form submission
    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true)
        try {
            // If passwords are empty on edit, remove them from the data
            if (isEditMode && !values.password) {
                delete values.password
                delete values.password_confirmation
            }

            const success = await onSubmit(values)
            if (success && !isEditMode) {
                // Reset form on successful creation
                form.reset()
            }
        } catch (error) {
            console.error("Form submission error:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Form fields depend on user type
    const selectedType = form.watch("type")
    const isDriverOrConductor = selectedType === "Driver" || selectedType === "Conductor"
    const isAgentOrConductor = selectedType === "Agent" || selectedType === "Conductor"

    // Toggle password fields visibility
    const togglePasswordFields = () => {
        setShowPassword(!showPassword)
        if (!showPassword && isEditMode) {
            form.setValue("password", "")
            form.setValue("password_confirmation", "")
        }
    }

    return (
        <Card className="p-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{tr("Personal Information")}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("First Name *")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={tr("Enter first name")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="last_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("Last Name *")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={tr("Enter last name")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("Email Address *")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={tr("Enter email address")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("Phone Number")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={tr("Enter phone number")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="id_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("ID Number")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={tr("Enter national ID or passport number")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Account Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{tr("Account Information")}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("User Type *")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={tr("Select user type")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Admin">{tr("Administrator")}</SelectItem>
                                                <SelectItem value="Agent">{tr("Agent")}</SelectItem>
                                                <SelectItem value="Conductor">{tr("Conductor")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="company_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("Company")}</FormLabel>
                                        <Select
                                            onValueChange={(value) => field.onChange(Number(value) || undefined)}
                                            defaultValue={field.value?.toString() || "0"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={tr("Select company")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="0">{tr("None")}</SelectItem>
                                                {companies?.map((company) => (
                                                    <SelectItem key={company.id} value={company.id.toString()}>
                                                        {company.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>{tr("Select the company this user belongs to.")}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Role selection */}
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Role")}</FormLabel>
                                    <Select
                                        onValueChange={(value) => field.onChange(Number(value) || undefined)}
                                        defaultValue={field.value?.toString()}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={tr("Select role")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="0">{tr("None")}</SelectItem>
                                            {isLoadingRoles ? (
                                                <SelectItem value="loading" disabled>{tr("Loading roles...")}</SelectItem>
                                            ) : (
                                                availableRoles.map((role) => (
                                                    <SelectItem key={role.id} value={role.id.toString()}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>{tr("Assign a role to this user.")}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Status */}
                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tr("Status")}</FormLabel>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <RadioGroup
                                            onValueChange={(value) => field.onChange(value === "active")}
                                            defaultValue={field.value ? "active" : "inactive"}
                                            className="flex space-x-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="active" id="active" />
                                                <FormLabel htmlFor="active" className="flex items-center">
                                                    <Check className="h-4 w-4 mr-2 text-green-500" />{tr("Active")}</FormLabel>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="inactive" id="inactive" />
                                                <FormLabel htmlFor="inactive" className="flex items-center">
                                                    <X className="h-4 w-4 mr-2 text-red-500" />{tr("Inactive")}</FormLabel>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Use Float option for Drivers and Conductors */}
                        {isDriverOrConductor && (
                            <FormField
                                control={form.control}
                                name="use_float"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>{tr("Enable Float")}</FormLabel>
                                            <FormDescription>{tr("Allow this user to maintain a float balance for transactions.")}</FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    {/* OTP Field for Agent or Conductor */}
                    {isAgentOrConductor && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">{tr("One-Time Password")}</h3>
                            <FormField
                                control={form.control}
                                name="otp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tr("OTP Code")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={tr("Enter OTP code")} {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            {tr("Enter the one-time password for this {selectedType}.", { selectedType: selectedType.toLowerCase() })}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* Password Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">{isEditMode ? tr("Change Password") : tr("Set Password")}</h3>
                            {isEditMode && (
                                <Button type="button" variant="outline" onClick={togglePasswordFields}>
                                    {showPassword ? tr("Cancel") : tr("Change Password")}
                                </Button>
                            )}
                        </div>

                        {showPassword && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{isEditMode ? tr("New Password") : tr("Password")} *</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder={tr("Enter password")} {...field} />
                                            </FormControl>
                                            <FormDescription>{tr("Password must be at least 8 characters.")}</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password_confirmation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{tr("Confirm Password *")}</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder={tr("Confirm password")} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-4 pt-4">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <LoadingSpinner className="mr-2" />
                                    {isEditMode ? tr("Updating...") : tr("Creating...")}
                                </>
                            ) : isEditMode ? (
                                tr("Update User")
                            ) : (
                                tr("Create User")
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </Card>
    )
}
