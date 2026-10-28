"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useToast } from "@/components/ui/use-toast"
import { Gavel, DollarSign, AlertCircle, MapPin, Package, Calendar } from "lucide-react"
import type { Cargo, CreateBidRequest } from "@/types/cargo"
import { cargoService } from "@/lib/services/cargo"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTr } from "@/lib/i18n/portal"

interface BidModalProps {
    isOpen: boolean
    onClose: () => void
    cargo: Cargo | null
    onSuccess?: () => void
}

export function BidModal({ isOpen, onClose, cargo, onSuccess }: BidModalProps) {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [formData, setFormData] = useState<CreateBidRequest>({
        cargoId: 0,
        amount: 0,
        currency: "TZS",
        estimatedDeliveryTime: 24,
        message: "",
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const createBidMutation = useMutation({
        mutationFn: cargoService.createBid,
        onSuccess: () => {
            toast({
                title: tr("Bid Placed Successfully!"),
                description: tr("Your bid has been submitted. The cargo owner will review it shortly."),
            })
            queryClient.invalidateQueries({ queryKey: ["cargos"] })
            queryClient.invalidateQueries({ queryKey: ["cargo", cargo?.id] })
            onSuccess?.()
            handleClose()
        },
        onError: (error: any) => {
            toast({
                title: tr("Error"),
                description: error.message || "Failed to place bid. Please try again.",
                variant: "destructive",
            })
        },
    })

    React.useEffect(() => {
        if (cargo && isOpen) {
            setFormData({
                cargoId: cargo.id,
                amount: 0,
                currency: cargo.currency,
                estimatedDeliveryTime: 24,
                message: "",
            })
            setErrors({})
        }
    }, [cargo, isOpen])

    const handleClose = () => {
        if (!createBidMutation.isPending) {
            setFormData({
                cargoId: 0,
                amount: 0,
                currency: "TZS",
                estimatedDeliveryTime: 24,
                message: "",
            })
            setErrors({})
            onClose()
        }
    }

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }))
        }
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (formData.amount <= 0) {
            newErrors.amount = "Bid amount must be greater than 0"
        }

        if (formData.estimatedDeliveryTime <= 0) {
            newErrors.estimatedDeliveryTime = "Delivery time must be greater than 0"
        }

        // Check if bid is competitive
        if (cargo && cargo.bids.length > 0) {
            const lowestBid = Math.min(...cargo.bids.map((b) => b.amount))
            if (formData.amount >= lowestBid) {
                newErrors.amount = `Your bid should be lower than the current best bid (${cargo.currency} ${lowestBid.toLocaleString()})`
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (validateForm()) {
            createBidMutation.mutate(formData)
        }
    }

    if (!cargo) return null

    const currentBestBid = cargo.bids.length > 0 ? Math.min(...cargo.bids.map((b) => b.amount)) : null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold flex items-center">
                        <Gavel className="h-5 w-5 mr-2 text-yellow-500" />{tr("Place Your Bid")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Cargo Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 mb-3">{cargo.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <span>
                  {cargo.pickupLocation} → {cargo.deliveryLocation}
                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span>{tr("{weight} kg", { weight: cargo.weight })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{tr("Pickup: {toLocaleDateString}", { toLocaleDateString: new Date(cargo.pickupDate).toLocaleDateString() })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-500" />
                                <span>
                  {tr("Value: {currency} {cargo}", { currency: cargo.currency, cargo: cargo.value.toLocaleString() })}</span>
                            </div>
                        </div>

                        {currentBestBid && (
                            <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-yellow-800">{tr("Current Best Bid:")}</span>
                                    <span className="text-lg font-bold text-yellow-900">
                    {cargo.currency} {currentBestBid.toLocaleString()}
                  </span>
                                </div>
                                <p className="text-xs text-yellow-700 mt-1">{tr("Your bid should be competitive to win this cargo")}</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Bid Amount */}
                        <div>
                            <Label htmlFor="amount">{tr("Your Bid Amount *")}</Label>
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
                                    id="amount"
                                    type="number"
                                    value={formData.amount || ""}
                                    onChange={(e) => handleInputChange("amount", Number(e.target.value))}
                                    placeholder={tr("Enter your bid amount")}
                                    className={`flex-1 ${errors.amount ? "border-red-500" : ""}`}
                                />
                            </div>
                            {errors.amount && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {errors.amount}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{tr("This is the total amount you'll charge for the delivery service")}</p>
                        </div>

                        {/* Estimated Delivery Time */}
                        <div>
                            <Label htmlFor="estimatedDeliveryTime">{tr("Estimated Delivery Time (hours) *")}</Label>
                            <Input
                                id="estimatedDeliveryTime"
                                type="number"
                                value={formData.estimatedDeliveryTime || ""}
                                onChange={(e) => handleInputChange("estimatedDeliveryTime", Number(e.target.value))}
                                placeholder="24"
                                className={errors.estimatedDeliveryTime ? "border-red-500" : ""}
                            />
                            {errors.estimatedDeliveryTime && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {errors.estimatedDeliveryTime}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{tr("How many hours from pickup to delivery?")}</p>
                        </div>

                        {/* Message */}
                        <div>
                            <Label htmlFor="message">{tr("Message to Cargo Owner (Optional)")}</Label>
                            <Textarea
                                id="message"
                                value={formData.message}
                                onChange={(e) => handleInputChange("message", e.target.value)}
                                placeholder={tr("Tell the cargo owner why they should choose your service...")}
                                rows={3}
                            />
                            <p className="text-xs text-gray-500 mt-1">{tr("Highlight your experience, special equipment, or competitive advantages")}</p>
                        </div>

                        {/* Bid Summary */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">{tr("Bid Summary")}</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-blue-700">{tr("Your Bid:")}</span>
                                    <span className="font-medium text-blue-900">
                    {formData.currency} {formData.amount.toLocaleString()}
                  </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700">{tr("Delivery Time:")}</span>
                                    <span className="font-medium text-blue-900">{tr("{estimatedDeliveryTime} hours", { estimatedDeliveryTime: formData.estimatedDeliveryTime })}</span>
                                </div>
                                {currentBestBid && (
                                    <div className="flex justify-between pt-2 border-t border-blue-200">
                                        <span className="text-blue-700">{tr("vs Current Best:")}</span>
                                        <span
                                            className={`font-medium ${formData.amount < currentBestBid ? "text-green-600" : "text-red-600"}`}
                                        >
                      {formData.amount < currentBestBid ? tr("Better") : tr("Higher")}{" "}{tr("by")}{" "}{formData.currency}{" "}
                                            {Math.abs(formData.amount - currentBestBid).toLocaleString()}
                    </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={createBidMutation.isPending}>{tr("Cancel")}</Button>
                            <Button
                                type="submit"
                                disabled={createBidMutation.isPending}
                                className="bg-yellow-500 hover:bg-yellow-600 text-black"
                            >
                                {createBidMutation.isPending ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />{tr("Placing Bid...")}</>
                                ) : (
                                    <>
                                        <Gavel className="h-4 w-4 mr-2" />{tr("Place Bid")}</>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
