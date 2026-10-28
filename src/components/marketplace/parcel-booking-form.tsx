"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { MapPin, Package, Calendar, User, ArrowRight, ArrowLeft, CheckCircle, Clock, Shield, Star } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTr } from "@/lib/i18n/portal"

interface ParcelBookingData {
    // Step 1: Route
    fromLocation: string
    toLocation: string

    // Step 2: Parcel Details
    parcelType: string
    weight: string
    dimensions: {
        length: string
        width: string
        height: string
    }
    value: string
    description: string

    // Step 3: Schedule
    pickupDate: string
    pickupTime: string
    deliveryDate: string
    specialRequirements: string[]

    // Step 4: Contact
    senderName: string
    senderPhone: string
    senderEmail: string
    receiverName: string
    receiverPhone: string
    receiverAddress: string
}

const PARCEL_TYPES = [
    { value: "documents", label: "Documents", icon: "📄" },
    { value: "electronics", label: "Electronics", icon: "📱" },
    { value: "clothing", label: "Clothing", icon: "👕" },
    { value: "food", label: "Food Items", icon: "🍎" },
    { value: "fragile", label: "Fragile Items", icon: "🔍" },
    { value: "general", label: "General Cargo", icon: "📦" },
]

const SPECIAL_REQUIREMENTS = [
    "Fragile Handling",
    "Temperature Controlled",
    "Express Delivery",
    "Insurance Required",
    "Signature Required",
    "Photo Proof",
    "Weekend Delivery",
]

const POPULAR_LOCATIONS = ["Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Mbeya", "Morogoro", "Tanga", "Iringa"]

export function ParcelBookingForm() {
    const tr = useTr()
    const { toast } = useToast()
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<ParcelBookingData>({
        fromLocation: "",
        toLocation: "",
        parcelType: "",
        weight: "",
        dimensions: { length: "", width: "", height: "" },
        value: "",
        description: "",
        pickupDate: "",
        pickupTime: "",
        deliveryDate: "",
        specialRequirements: [],
        senderName: "",
        senderPhone: "",
        senderEmail: "",
        receiverName: "",
        receiverPhone: "",
        receiverAddress: "",
    })

    const updateFormData = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const updateDimensions = (dimension: keyof typeof formData.dimensions, value: string) => {
        setFormData((prev) => ({
            ...prev,
            dimensions: { ...prev.dimensions, [dimension]: value },
        }))
    }

    const toggleSpecialRequirement = (requirement: string) => {
        setFormData((prev) => ({
            ...prev,
            specialRequirements: prev.specialRequirements.includes(requirement)
                ? prev.specialRequirements.filter((r) => r !== requirement)
                : [...prev.specialRequirements, requirement],
        }))
    }

    const nextStep = () => {
        if (validateCurrentStep()) {
            setCurrentStep((prev) => Math.min(prev + 1, 5))
        }
    }

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1))
    }

    const validateCurrentStep = () => {
        switch (currentStep) {
            case 1:
                if (!formData.fromLocation || !formData.toLocation) {
                    toast({
                        title: tr("Missing Information"),
                        description: tr("Please select both pickup and delivery locations."),
                        variant: "destructive",
                    })
                    return false
                }
                if (formData.fromLocation === formData.toLocation) {
                    toast({
                        title: tr("Invalid Route"),
                        description: tr("Pickup and delivery locations cannot be the same."),
                        variant: "destructive",
                    })
                    return false
                }
                return true
            case 2:
                if (!formData.parcelType || !formData.weight) {
                    toast({
                        title: tr("Missing Information"),
                        description: tr("Please provide parcel type and weight."),
                        variant: "destructive",
                    })
                    return false
                }
                return true
            case 3:
                if (!formData.pickupDate || !formData.pickupTime) {
                    toast({
                        title: tr("Missing Information"),
                        description: tr("Please select pickup date and time."),
                        variant: "destructive",
                    })
                    return false
                }
                return true
            case 4:
                if (!formData.senderName || !formData.senderPhone || !formData.receiverName || !formData.receiverPhone) {
                    toast({
                        title: tr("Missing Information"),
                        description: tr("Please provide sender and receiver contact details."),
                        variant: "destructive",
                    })
                    return false
                }
                return true
            default:
                return true
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000))

            toast({
                title: tr("Booking Submitted!"),
                description: tr("We'll connect you with available transporters shortly."),
            })

            setCurrentStep(5) // Success step
        } catch (error) {
            toast({
                title: tr("Booking Failed"),
                description: tr("Please try again or contact support."),
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-6">
                            <MapPin className="h-8 w-8 text-[#FFD428] mx-auto mb-2" />
                            <h3 className="text-xl font-semibold text-white mb-2">{tr("Where are you sending?")}</h3>
                            <p className="text-gray-300 text-sm">{tr("Select your pickup and delivery locations")}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="from" className="text-white mb-2 block">{tr("From (Pickup Location)")}</Label>
                                <Select value={formData.fromLocation} onValueChange={(value) => updateFormData("fromLocation", value)}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue placeholder={tr("Select pickup location")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {POPULAR_LOCATIONS.map((location) => (
                                            <SelectItem key={location} value={location}>
                                                {location}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-center">
                                <div className="w-8 h-8 rounded-full bg-[#FFD428]/20 flex items-center justify-center">
                                    <ArrowRight className="h-4 w-4 text-[#FFD428]" />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="to" className="text-white mb-2 block">{tr("To (Delivery Location)")}</Label>
                                <Select value={formData.toLocation} onValueChange={(value) => updateFormData("toLocation", value)}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue placeholder={tr("Select delivery location")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {POPULAR_LOCATIONS.filter((loc) => loc !== formData.fromLocation).map((location) => (
                                            <SelectItem key={location} value={location}>
                                                {location}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.fromLocation && formData.toLocation && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#FFD428]/10 rounded-lg p-4 border border-[#FFD428]/20"
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-300">{tr("Estimated Distance:")}</span>
                                        <span className="text-[#FFD428] font-medium">{tr("~450 km")}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="text-gray-300">{tr("Estimated Time:")}</span>
                                        <span className="text-[#FFD428] font-medium">{tr("1-2 days")}</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )

            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-6">
                            <Package className="h-8 w-8 text-[#FFD428] mx-auto mb-2" />
                            <h3 className="text-xl font-semibold text-white mb-2">{tr("Parcel Details")}</h3>
                            <p className="text-gray-300 text-sm">{tr("Tell us about your parcel")}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-white mb-3 block">{tr("What are you sending?")}</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {PARCEL_TYPES.map((type) => (
                                        <Card
                                            key={type.value}
                                            className={`cursor-pointer transition-all duration-200 ${
                                                formData.parcelType === type.value
                                                    ? "bg-[#FFD428]/20 border-[#FFD428]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                            }`}
                                            onClick={() => updateFormData("parcelType", type.value)}
                                        >
                                            <CardContent className="p-3 text-center">
                                                <div className="text-2xl mb-1">{type.icon}</div>
                                                <div className="text-white text-sm font-medium">{type.label}</div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="weight" className="text-white mb-2 block">{tr("Weight (kg)")}</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        placeholder="0"
                                        value={formData.weight}
                                        onChange={(e) => updateFormData("weight", e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="value" className="text-white mb-2 block">{tr("Value (TZS)")}</Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        placeholder="0"
                                        value={formData.value}
                                        onChange={(e) => updateFormData("value", e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-white mb-2 block">{tr("Dimensions (cm) - Optional")}</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input
                                        placeholder={tr("Length")}
                                        value={formData.dimensions.length}
                                        onChange={(e) => updateDimensions("length", e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                    <Input
                                        placeholder={tr("Width")}
                                        value={formData.dimensions.width}
                                        onChange={(e) => updateDimensions("width", e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                    <Input
                                        placeholder={tr("Height")}
                                        value={formData.dimensions.height}
                                        onChange={(e) => updateDimensions("height", e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-white mb-2 block">{tr("Description - Optional")}</Label>
                                <Textarea
                                    id="description"
                                    placeholder={tr("Describe your parcel...")}
                                    value={formData.description}
                                    onChange={(e) => updateFormData("description", e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </motion.div>
                )

            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-6">
                            <Calendar className="h-8 w-8 text-[#FFD428] mx-auto mb-2" />
                            <h3 className="text-xl font-semibold text-white mb-2">{tr("Schedule Pickup")}</h3>
                            <p className="text-gray-300 text-sm">{tr("When should we collect your parcel?")}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="pickupDate" className="text-white mb-2 block">{tr("Pickup Date")}</Label>
                                    <Input
                                        id="pickupDate"
                                        type="date"
                                        value={formData.pickupDate}
                                        onChange={(e) => updateFormData("pickupDate", e.target.value)}
                                        min={new Date().toISOString().split("T")[0]}
                                        className="bg-white/10 border-white/20 text-white"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="pickupTime" className="text-white mb-2 block">{tr("Pickup Time")}</Label>
                                    <Select value={formData.pickupTime} onValueChange={(value) => updateFormData("pickupTime", value)}>
                                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                            <SelectValue placeholder={tr("Select time")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="morning">{tr("Morning (8AM - 12PM)")}</SelectItem>
                                            <SelectItem value="afternoon">{tr("Afternoon (12PM - 5PM)")}</SelectItem>
                                            <SelectItem value="evening">{tr("Evening (5PM - 8PM)")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="deliveryDate" className="text-white mb-2 block">{tr("Preferred Delivery Date - Optional")}</Label>
                                <Input
                                    id="deliveryDate"
                                    type="date"
                                    value={formData.deliveryDate}
                                    onChange={(e) => updateFormData("deliveryDate", e.target.value)}
                                    min={formData.pickupDate || new Date().toISOString().split("T")[0]}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>

                            <div>
                                <Label className="text-white mb-3 block">{tr("Special Requirements - Optional")}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {SPECIAL_REQUIREMENTS.map((req) => (
                                        <Badge
                                            key={req}
                                            variant={formData.specialRequirements.includes(req) ? "default" : "outline"}
                                            className={`cursor-pointer transition-all duration-200 ${
                                                formData.specialRequirements.includes(req)
                                                    ? "bg-[#FFD428] text-[#242a37] hover:bg-[#e0b800]"
                                                    : "border-white/30 text-white hover:bg-white/10"
                                            }`}
                                            onClick={() => toggleSpecialRequirement(req)}
                                        >
                                            {req}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )

            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-6">
                            <User className="h-8 w-8 text-[#FFD428] mx-auto mb-2" />
                            <h3 className="text-xl font-semibold text-white mb-2">{tr("Contact Details")}</h3>
                            <p className="text-gray-300 text-sm">{tr("Who's sending and receiving?")}</p>
                        </div>

                        <div className="space-y-6">
                            {/* Sender Details */}
                            <div className="space-y-4">
                                <h4 className="text-white font-medium flex items-center gap-2">
                                    <User className="h-4 w-4" />{tr("Sender Details")}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="senderName" className="text-white mb-2 block">{tr("Full Name")}</Label>
                                        <Input
                                            id="senderName"
                                            placeholder={tr("Your full name")}
                                            value={formData.senderName}
                                            onChange={(e) => updateFormData("senderName", e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="senderPhone" className="text-white mb-2 block">{tr("Phone Number")}</Label>
                                        <Input
                                            id="senderPhone"
                                            placeholder={tr("+255 XXX XXX XXX")}
                                            value={formData.senderPhone}
                                            onChange={(e) => updateFormData("senderPhone", e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="senderEmail" className="text-white mb-2 block">{tr("Email - Optional")}</Label>
                                    <Input
                                        id="senderEmail"
                                        type="email"
                                        placeholder="your.email@example.com"
                                        value={formData.senderEmail}
                                        onChange={(e) => updateFormData("senderEmail", e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Receiver Details */}
                            <div className="space-y-4">
                                <h4 className="text-white font-medium flex items-center gap-2">
                                    <Package className="h-4 w-4" />{tr("Receiver Details")}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="receiverName" className="text-white mb-2 block">{tr("Full Name")}</Label>
                                        <Input
                                            id="receiverName"
                                            placeholder={tr("Receiver's full name")}
                                            value={formData.receiverName}
                                            onChange={(e) => updateFormData("receiverName", e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="receiverPhone" className="text-white mb-2 block">{tr("Phone Number")}</Label>
                                        <Input
                                            id="receiverPhone"
                                            placeholder={tr("+255 XXX XXX XXX")}
                                            value={formData.receiverPhone}
                                            onChange={(e) => updateFormData("receiverPhone", e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="receiverAddress" className="text-white mb-2 block">{tr("Delivery Address")}</Label>
                                    <Textarea
                                        id="receiverAddress"
                                        placeholder={tr("Full delivery address...")}
                                        value={formData.receiverAddress}
                                        onChange={(e) => updateFormData("receiverAddress", e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )

            case 5:
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6"
                    >
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">{tr("Booking Submitted!")}</h3>
                            <p className="text-gray-300">{tr("We're connecting you with available transporters")}</p>
                        </div>

                        <div className="bg-white/10 rounded-lg p-6 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{tr("Booking ID:")}</span>
                                <span className="text-[#FFD428] font-mono">#MS{Date.now().toString().slice(-6)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{tr("Route:")}</span>
                                <span className="text-white">
                  {formData.fromLocation} → {formData.toLocation}
                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{tr("Pickup:")}</span>
                                <span className="text-white">
                  {formData.pickupDate} ({formData.pickupTime})
                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-white/5 rounded-lg p-4">
                                <Clock className="h-6 w-6 text-[#FFD428] mx-auto mb-2" />
                                <div className="text-white text-sm font-medium">{tr("Quick Response")}</div>
                                <div className="text-gray-400 text-xs">{tr("Within 30 mins")}</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4">
                                <Shield className="h-6 w-6 text-[#FFD428] mx-auto mb-2" />
                                <div className="text-white text-sm font-medium">{tr("Secure Delivery")}</div>
                                <div className="text-gray-400 text-xs">{tr("Fully insured")}</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4">
                                <Star className="h-6 w-6 text-[#FFD428] mx-auto mb-2" />
                                <div className="text-white text-sm font-medium">{tr("Top Rated")}</div>
                                <div className="text-gray-400 text-xs">{tr("Verified drivers")}</div>
                            </div>
                        </div>

                        <Button
                            onClick={() => {
                                setCurrentStep(1)
                                setFormData({
                                    fromLocation: "",
                                    toLocation: "",
                                    parcelType: "",
                                    weight: "",
                                    dimensions: { length: "", width: "", height: "" },
                                    value: "",
                                    description: "",
                                    pickupDate: "",
                                    pickupTime: "",
                                    deliveryDate: "",
                                    specialRequirements: [],
                                    senderName: "",
                                    senderPhone: "",
                                    senderEmail: "",
                                    receiverName: "",
                                    receiverPhone: "",
                                    receiverAddress: "",
                                })
                            }}
                            className="bg-[#FFD428] text-[#242a37] hover:bg-[#e0b800]"
                        >{tr("Send Another Parcel")}</Button>
                    </motion.div>
                )

            default:
                return null
        }
    }

    if (currentStep === 5) {
        return <div className="max-w-md mx-auto">{renderStepContent()}</div>
    }

    return (
        <div className="max-w-md mx-auto">
            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">{tr("Step {currentStep} of 4", { currentStep })}</span>
                    <span className="text-sm text-[#FFD428]">{Math.round((currentStep / 4) * 100)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                        className="bg-[#FFD428] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStep / 4) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

            {/* Navigation Buttons */}
            {currentStep < 5 && (
                <div className="flex justify-between mt-8">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="bg-transparent border-white/30 text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />{tr("Back")}</Button>

                    {currentStep < 4 ? (
                        <Button onClick={nextStep} className="bg-[#FFD428] text-[#242a37] hover:bg-[#e0b800]">{tr("Next")}<ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-[#FFD428] text-[#242a37] hover:bg-[#e0b800]"
                        >
                            {isSubmitting ? tr("Submitting...") : tr("Submit Booking")}
                            <Package className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
