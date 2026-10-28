"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useToast } from "@/components/ui/use-toast"
import { X, Upload, Plus, Package, AlertCircle } from "lucide-react"
import type { CreateCargoRequest, CargoType } from "@/types/cargo"
import { cargoService } from "@/lib/services/cargo"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTr } from "@/lib/i18n/portal"

interface CargoFormProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

const CARGO_TYPES: { value: CargoType; label: string }[] = [
    { value: "GENERAL", label: "General Cargo" },
    { value: "FRAGILE", label: "Fragile Items" },
    { value: "PERISHABLE", label: "Perishable Goods" },
    { value: "HAZARDOUS", label: "Hazardous Materials" },
    { value: "ELECTRONICS", label: "Electronics" },
    { value: "DOCUMENTS", label: "Documents" },
    { value: "FURNITURE", label: "Furniture" },
    { value: "AUTOMOTIVE", label: "Automotive Parts" },
    { value: "TEXTILES", label: "Textiles" },
    { value: "FOOD", label: "Food Items" },
    { value: "MEDICAL", label: "Medical Supplies" },
    { value: "OTHER", label: "Other" },
]

const SPECIAL_REQUIREMENTS = [
    "Temperature Controlled",
    "Fragile Handling",
    "Insurance Required",
    "Express Delivery",
    "Signature Required",
    "Photo Proof",
    "GPS Tracking",
    "Security Escort",
    "Weekend Delivery",
    "Evening Delivery",
]

export function CargoForm({ isOpen, onClose, onSuccess }: CargoFormProps) {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [formData, setFormData] = useState<CreateCargoRequest>({
        title: "",
        description: "",
        pickupLocation: "",
        deliveryLocation: "",
        pickupDate: "",
        deliveryDate: "",
        weight: 0,
        dimensions: {
            length: 0,
            width: 0,
            height: 0,
        },
        cargoType: "GENERAL",
        value: 0,
        currency: "TZS",
        specialRequirements: [],
        images: [],
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [selectedImages, setSelectedImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [newRequirement, setNewRequirement] = useState("")

    const createCargoMutation = useMutation({
        mutationFn: cargoService.createCargo,
        onSuccess: () => {
            toast({
                title: tr("Success!"),
                description: tr("Your cargo has been posted successfully."),
            })
            queryClient.invalidateQueries({ queryKey: ["cargos"] })
            onSuccess?.()
            handleClose()
        },
        onError: (error: any) => {
            toast({
                title: tr("Error"),
                description: error.message || "Failed to post cargo. Please try again.",
                variant: "destructive",
            })
        },
    })

    const handleClose = () => {
        if (!createCargoMutation.isPending) {
            setFormData({
                title: "",
                description: "",
                pickupLocation: "",
                deliveryLocation: "",
                pickupDate: "",
                deliveryDate: "",
                weight: 0,
                dimensions: { length: 0, width: 0, height: 0 },
                cargoType: "GENERAL",
                value: 0,
                currency: "TZS",
                specialRequirements: [],
                images: [],
            })
            setErrors({})
            setSelectedImages([])
            setImagePreviews([])
            setNewRequirement("")
            onClose()
        }
    }

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }))
        }
    }

    const handleDimensionChange = (dimension: "length" | "width" | "height", value: number) => {
        setFormData((prev) => ({
            ...prev,
            dimensions: { ...prev.dimensions, [dimension]: value },
        }))
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length + selectedImages.length > 5) {
            toast({
                title: tr("Too many images"),
                description: tr("You can upload maximum 5 images."),
                variant: "destructive",
            })
            return
        }

        const newImages = [...selectedImages, ...files]
        setSelectedImages(newImages)
        setFormData((prev) => ({ ...prev, images: newImages }))

        // Create previews
        files.forEach((file) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                setImagePreviews((prev) => [...prev, e.target?.result as string])
            }
            reader.readAsDataURL(file)
        })
    }

    const removeImage = (index: number) => {
        const newImages = selectedImages.filter((_, i) => i !== index)
        const newPreviews = imagePreviews.filter((_, i) => i !== index)
        setSelectedImages(newImages)
        setImagePreviews(newPreviews)
        setFormData((prev) => ({ ...prev, images: newImages }))
    }

    const addSpecialRequirement = (requirement: string) => {
        if (!formData.specialRequirements?.includes(requirement)) {
            const newRequirements = [...(formData.specialRequirements || []), requirement]
            setFormData((prev) => ({ ...prev, specialRequirements: newRequirements }))
        }
    }

    const removeSpecialRequirement = (requirement: string) => {
        const newRequirements = formData.specialRequirements?.filter((req) => req !== requirement) || []
        setFormData((prev) => ({ ...prev, specialRequirements: newRequirements }))
    }

    const addCustomRequirement = () => {
        if (newRequirement.trim() && !formData.specialRequirements?.includes(newRequirement.trim())) {
            addSpecialRequirement(newRequirement.trim())
            setNewRequirement("")
        }
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.title.trim()) newErrors.title = "Title is required"
        if (!formData.description.trim()) newErrors.description = "Description is required"
        if (!formData.pickupLocation.trim()) newErrors.pickupLocation = "Pickup location is required"
        if (!formData.deliveryLocation.trim()) newErrors.deliveryLocation = "Delivery location is required"
        if (!formData.pickupDate) newErrors.pickupDate = "Pickup date is required"
        if (!formData.deliveryDate) newErrors.deliveryDate = "Delivery date is required"
        if (formData.weight <= 0) newErrors.weight = "Weight must be greater than 0"
        if (formData.value <= 0) newErrors.value = "Cargo value must be greater than 0"
        if (formData.dimensions.length <= 0) newErrors.length = "Length must be greater than 0"
        if (formData.dimensions.width <= 0) newErrors.width = "Width must be greater than 0"
        if (formData.dimensions.height <= 0) newErrors.height = "Height must be greater than 0"

        // Date validation
        if (formData.pickupDate && formData.deliveryDate) {
            if (new Date(formData.pickupDate) >= new Date(formData.deliveryDate)) {
                newErrors.deliveryDate = "Delivery date must be after pickup date"
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (validateForm()) {
            createCargoMutation.mutate(formData)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold flex items-center">
                        <Package className="h-5 w-5 mr-2 text-yellow-500" />{tr("Post New Cargo")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{tr("Basic Information")}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label htmlFor="title">{tr("Cargo Title *")}</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange("title", e.target.value)}
                                    placeholder={tr("e.g., Electronics shipment to Dar es Salaam")}
                                    className={errors.title ? "border-red-500" : ""}
                                />
                                {errors.title && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="cargoType">{tr("Cargo Type *")}</Label>
                                <Select
                                    value={formData.cargoType}
                                    onValueChange={(value: CargoType) => handleInputChange("cargoType", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CARGO_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="weight">{tr("Weight (kg) *")}</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    value={formData.weight || ""}
                                    onChange={(e) => handleInputChange("weight", Number(e.target.value))}
                                    placeholder="0"
                                    className={errors.weight ? "border-red-500" : ""}
                                />
                                {errors.weight && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.weight}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">{tr("Description *")}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                placeholder={tr("Describe your cargo in detail...")}
                                rows={3}
                                className={errors.description ? "border-red-500" : ""}
                            />
                            {errors.description && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {errors.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Locations and Dates */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{tr("Pickup & Delivery")}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="pickupLocation">{tr("Pickup Location *")}</Label>
                                <Input
                                    id="pickupLocation"
                                    value={formData.pickupLocation}
                                    onChange={(e) => handleInputChange("pickupLocation", e.target.value)}
                                    placeholder={tr("e.g., Arusha, Tanzania")}
                                    className={errors.pickupLocation ? "border-red-500" : ""}
                                />
                                {errors.pickupLocation && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.pickupLocation}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="deliveryLocation">{tr("Delivery Location *")}</Label>
                                <Input
                                    id="deliveryLocation"
                                    value={formData.deliveryLocation}
                                    onChange={(e) => handleInputChange("deliveryLocation", e.target.value)}
                                    placeholder={tr("e.g., Dar es Salaam, Tanzania")}
                                    className={errors.deliveryLocation ? "border-red-500" : ""}
                                />
                                {errors.deliveryLocation && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.deliveryLocation}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="pickupDate">{tr("Pickup Date *")}</Label>
                                <Input
                                    id="pickupDate"
                                    type="date"
                                    value={formData.pickupDate}
                                    onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                    className={errors.pickupDate ? "border-red-500" : ""}
                                />
                                {errors.pickupDate && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.pickupDate}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="deliveryDate">{tr("Delivery Date *")}</Label>
                                <Input
                                    id="deliveryDate"
                                    type="date"
                                    value={formData.deliveryDate}
                                    onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
                                    min={formData.pickupDate || new Date().toISOString().split("T")[0]}
                                    className={errors.deliveryDate ? "border-red-500" : ""}
                                />
                                {errors.deliveryDate && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.deliveryDate}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dimensions and Value */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{tr("Dimensions & Value")}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>{tr("Dimensions (cm) *")}</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Input
                                            type="number"
                                            value={formData.dimensions.length || ""}
                                            onChange={(e) => handleDimensionChange("length", Number(e.target.value))}
                                            placeholder={tr("Length")}
                                            className={errors.length ? "border-red-500" : ""}
                                        />
                                        {errors.length && <p className="text-red-500 text-xs mt-1">{errors.length}</p>}
                                    </div>
                                    <div>
                                        <Input
                                            type="number"
                                            value={formData.dimensions.width || ""}
                                            onChange={(e) => handleDimensionChange("width", Number(e.target.value))}
                                            placeholder={tr("Width")}
                                            className={errors.width ? "border-red-500" : ""}
                                        />
                                        {errors.width && <p className="text-red-500 text-xs mt-1">{errors.width}</p>}
                                    </div>
                                    <div>
                                        <Input
                                            type="number"
                                            value={formData.dimensions.height || ""}
                                            onChange={(e) => handleDimensionChange("height", Number(e.target.value))}
                                            placeholder={tr("Height")}
                                            className={errors.height ? "border-red-500" : ""}
                                        />
                                        {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="value">{tr("Cargo Value *")}</Label>
                                <div className="flex gap-2">
                                    <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TZS">TZS</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={formData.value || ""}
                                        onChange={(e) => handleInputChange("value", Number(e.target.value))}
                                        placeholder="0"
                                        className={`flex-1 ${errors.value ? "border-red-500" : ""}`}
                                    />
                                </div>
                                {errors.value && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.value}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Special Requirements */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{tr("Special Requirements")}</h3>

                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {SPECIAL_REQUIREMENTS.map((req) => (
                                    <Badge
                                        key={req}
                                        variant={formData.specialRequirements?.includes(req) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            if (formData.specialRequirements?.includes(req)) {
                                                removeSpecialRequirement(req)
                                            } else {
                                                addSpecialRequirement(req)
                                            }
                                        }}
                                    >
                                        {req}
                                        {formData.specialRequirements?.includes(req) && <X className="h-3 w-3 ml-1" />}
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    value={newRequirement}
                                    onChange={(e) => setNewRequirement(e.target.value)}
                                    placeholder={tr("Add custom requirement...")}
                                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomRequirement())}
                                />
                                <Button type="button" onClick={addCustomRequirement} size="sm">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {formData.specialRequirements && formData.specialRequirements.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.specialRequirements.map((req) => (
                                        <Badge
                                            key={req}
                                            variant="secondary"
                                            className="cursor-pointer"
                                            onClick={() => removeSpecialRequirement(req)}
                                        >
                                            {req}
                                            <X className="h-3 w-3 ml-1" />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Images */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{tr("Images (Optional)")}</h3>

                        <div className="space-y-3">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-600 mb-2">{tr("Upload cargo images (max 5)")}</p>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById("image-upload")?.click()}
                                >{tr("Choose Images")}</Button>
                            </div>

                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={preview || "/placeholder.svg"}
                                                alt={tr("Preview {index}", { index: index + 1 })}
                                                className="w-full h-24 object-cover rounded-lg"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white"
                                                onClick={() => removeImage(index)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={createCargoMutation.isPending}>{tr("Cancel")}</Button>
                        <Button
                            type="submit"
                            disabled={createCargoMutation.isPending}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black"
                        >
                            {createCargoMutation.isPending ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />{tr("Posting Cargo...")}</>
                            ) : (
                                <>
                                    <Package className="h-4 w-4 mr-2" />{tr("Post Cargo")}</>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
