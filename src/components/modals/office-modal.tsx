"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useTr } from "@/lib/i18n/portal"

interface OfficeModalProps {
    isOpen: boolean
    onClose: () => void
    regions: { id: number; name: string }[]
    companies: { id: number; name: string }[]
    office?: {
        id: number
        name: string
        regionId: number
        districtId: number
        companyId: number
    }
}

export function OfficeModal({ isOpen, onClose, regions, companies, office }: OfficeModalProps) {
    const tr = useTr()
    const isEditing = !!office
    const { toast } = useToast()

    // Mock districts data - in a real app, you would fetch this based on the selected region
    const [districts, setDistricts] = useState<{ id: number; name: string }[]>([
        { id: 1, name: "Ilala" },
        { id: 2, name: "Kinondoni" },
        { id: 3, name: "Temeke" },
        { id: 4, name: "Kigamboni" },
        { id: 5, name: "Ubungo" },
    ])

    const [formData, setFormData] = useState({
        name: office?.name || "",
        regionId: office?.regionId || regions[0]?.id || 0,
        districtId: office?.districtId || districts[0]?.id || 0,
        companyId: office?.companyId || companies[0]?.id || 0,
    })

    // Simulate fetching districts when region changes
    useEffect(() => {
        // In a real app, you would fetch districts based on the selected region
        console.log(`Fetching districts for region ID: ${formData.regionId}`)
        // For now, we'll just use the mock data
    }, [formData.regionId])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value,
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Here you would typically make an API call to save the data
        console.log("Submitting office data:", formData)

        // Show success toast
        toast({
            title: tr("Booking Office {created} successfully", { created: isEditing ? "updated" : "created" }),
            description: tr("{name} has been {added} to the system.", { name: formData.name, added: isEditing ? "updated" : "added" }),
            variant: "success",
        })

        // Close the modal
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#0a0d14] border-[#2a2f3c]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? tr("Edit Booking Office") : tr("Add New Booking Office")}</DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? tr("Update the booking office details below.")
                                : tr("Fill in the booking office details to add it to the system.")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">{tr("Office Name")}{" "}<span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder={tr("Enter office name")}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="companyId" className="text-sm font-medium">{tr("Company")}{" "}<span className="text-red-500">*</span>
                            </label>
                            <select
                                id="companyId"
                                name="companyId"
                                value={formData.companyId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                required
                            >
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="regionId" className="text-sm font-medium">{tr("Region")}{" "}<span className="text-red-500">*</span>
                            </label>
                            <select
                                id="regionId"
                                name="regionId"
                                value={formData.regionId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                required
                            >
                                {regions.map((region) => (
                                    <option key={region.id} value={region.id}>
                                        {region.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="districtId" className="text-sm font-medium">{tr("District")}{" "}<span className="text-red-500">*</span>
                            </label>
                            <select
                                id="districtId"
                                name="districtId"
                                value={formData.districtId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                required
                            >
                                {districts.map((district) => (
                                    <option key={district.id} value={district.id}>
                                        {district.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>{tr("Cancel")}</Button>
                        <Button type="submit">{isEditing ? tr("Update") : tr("Create")}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

