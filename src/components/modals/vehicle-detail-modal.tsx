"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Vehicle } from "@/types/vehicle"
import {
    PrinterIcon,
    InfoIcon,
    Settings2Icon,
    CarIcon,
    CheckCircle,
    XCircle,
    User,
    MapPin,
    Building,
    Calendar,
    FileText,
    Settings,
    Globe,
    Bus
} from "lucide-react"
import { format } from "date-fns"
import { useTr } from "@/lib/i18n/portal"

interface VehicleDetailModalProps {
    open: boolean
    setOpen: (open: boolean) => void
    vehicle: Vehicle
}

export function VehicleDetailModal({ open, setOpen, vehicle }: VehicleDetailModalProps) {
    const tr = useTr()
    const handlePrint = () => {
        window.print()
    }

    if (!vehicle) {
        return null
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] p-0 overflow-hidden">
                <DialogHeader className="px-6 pb-4 pt-6 border-b bg-purple-50 dark:bg-purple-950/30">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[var(--ds-radius-large)] flex items-center justify-center bg-purple-600 text-white shadow-[var(--ds-shadow-raised)]">
                            <CarIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold">{vehicle.name}</DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-1">
                                <span className="font-mono font-semibold">{vehicle.registrationNumber}</span>
                                {vehicle.plateNumber && (
                                    <>
                                        <span>•</span>
                                        <span className="font-mono">Plate: {vehicle.plateNumber}</span>
                                    </>
                                )}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge
                                className={`${
                                    vehicle.isActive
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                                        : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200"
                                } flex items-center gap-1`}
                            >
                                {vehicle.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {vehicle.isActive ? tr("Active") : tr("Inactive")}
                            </Badge>
                            {vehicle.isSpecialHire && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200">{tr("Special Hire")}</Badge>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[calc(85vh-180px)]">
                    <div className="p-6 space-y-6">
                        {/* Header Card */}
                        <Card className="border-2 shadow-[var(--ds-shadow-raised)]">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                        <User className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                                        <p className="text-xs text-muted-foreground">{tr("Capacity")}</p>
                                        <p className="font-bold">{vehicle.capacity || 0}{" "}{tr("seats")}</p>
                                    </div>
                                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                        <CarIcon className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                                        <p className="text-xs text-muted-foreground">{tr("Year")}</p>
                                        <p className="font-bold">{vehicle.yearOfManufacture || "N/A"}</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                                        <Bus className="h-6 w-6 mx-auto mb-1 text-green-600" />
                                        <p className="text-xs text-muted-foreground">{tr("Fleet Type")}</p>
                                        <p className="font-bold text-xs">{vehicle.fleetType?.name || "N/A"}</p>
                                    </div>
                                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                                        <Settings className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                                        <p className="text-xs text-muted-foreground">{tr("Layout")}</p>
                                        <p className="font-bold text-xs">{vehicle.seatLayout?.name || "N/A"}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Vehicle Profile */}
                        <Card className="border-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <InfoIcon className="h-4 w-4 text-blue-600" />{tr("Vehicle Profile")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Vehicle Name")}</p>
                                            <p className="font-semibold">{vehicle.name || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Registration Number")}</p>
                                            <p className="font-semibold font-mono">{vehicle.registrationNumber || "N/A"}</p>
                                        </div>
                                        {vehicle.plateNumber && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Plate Number")}</p>
                                                <p className="font-semibold font-mono">{vehicle.plateNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Company")}</p>
                                            <div className="flex items-center gap-2">
                                                <Building className="h-3 w-3 text-blue-500" />
                                                <p className="font-semibold">{vehicle.company?.name || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Brand / Model")}</p>
                                            <div className="flex items-center gap-2">
                                                <CarIcon className="h-3 w-3 text-green-500" />
                                                <p className="font-semibold">
                                                    {vehicle.brand?.name || "N/A"} / {vehicle.model?.name || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                        {vehicle.location && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Location")}</p>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-3 w-3 text-orange-500" />
                                                    <p className="font-semibold">{vehicle.location}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Vehicle Details */}
                        <Card className="border-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Settings2Icon className="h-4 w-4 text-purple-600" />{tr("Vehicle Details")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        {vehicle.color && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Color")}</p>
                                                <p className="font-semibold">{vehicle.color}</p>
                                            </div>
                                        )}
                                        {vehicle.engineNumber && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Engine Number")}</p>
                                                <p className="font-semibold font-mono">{vehicle.engineNumber}</p>
                                            </div>
                                        )}
                                        {vehicle.insuranceProvider && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Insurance Provider")}</p>
                                                <p className="font-semibold">{vehicle.insuranceProvider}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {vehicle.yearOfManufacture && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Year of Manufacture")}</p>
                                                <p className="font-semibold">{vehicle.yearOfManufacture}</p>
                                            </div>
                                        )}
                                        {vehicle.chassisNumber && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Chassis Number")}</p>
                                                <p className="font-semibold font-mono">{vehicle.chassisNumber}</p>
                                            </div>
                                        )}
                                        {vehicle.insurancePolicyNumber && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">{tr("Policy Number")}</p>
                                                <p className="font-semibold font-mono">{vehicle.insurancePolicyNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Specifications */}
                        <Card className="border-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-green-600" />{tr("Technical Specifications")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Fleet Type")}</p>
                                            <p className="font-semibold">{vehicle.fleetType?.name || tr("Not specified")}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Front Seat Available")}</p>
                                            <Badge variant={vehicle.frontSeatAvailable ? "secondary" : "outline"}>
                                                {vehicle.frontSeatAvailable ? tr("Yes") : tr("No")}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Seat Layout")}</p>
                                            <p className="font-semibold">{vehicle.seatLayout?.name || tr("Not specified")}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{tr("Last Full Seat")}</p>
                                            <Badge variant={vehicle.isLastFullSeat ? "secondary" : "outline"}>
                                                {vehicle.isLastFullSeat ? tr("Yes") : tr("No")}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {vehicle.additionalNotes && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-xs text-muted-foreground mb-2">{tr("Additional Notes")}</p>
                                        <p className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                            {vehicle.additionalNotes}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Documents */}
                        {(vehicle.inspectionCertificateNumber || vehicle.inspectionExpiryDate) && (
                            <Card className="border-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-orange-600" />{tr("Vehicle Documents")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-sm">{tr("Inspection Certificate")}</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {vehicle.inspectionCertificateNumber && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">{tr("Certificate Number")}</p>
                                                    <p className="font-semibold font-mono">{vehicle.inspectionCertificateNumber}</p>
                                                </div>
                                            )}
                                            {vehicle.inspectionExpiryDate && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">{tr("Expiry Date")}</p>
                                                    <p className="font-semibold">{vehicle.inspectionExpiryDate}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Dates */}
                        {vehicle.createdAt && (
                            <Card className="border-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-indigo-600" />{tr("Important Dates")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">{tr("Created")}</p>
                                        <p className="font-semibold">{format(new Date(vehicle.createdAt), "PPP")}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(vehicle.createdAt), "p")}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Status Information */}
                        <Card className="border-2 bg-slate-50 dark:bg-slate-900">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-slate-600" />{tr("Status Information")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg">
                                        <div
                                            className={`w-3 h-3 rounded-full ${
                                                vehicle.isActive ? "bg-emerald-500 shadow-[var(--ds-shadow-raised)]" : "bg-gray-400"
                                            }`}
                                        />
                                        <div>
                                            <p className="text-xs text-muted-foreground">{tr("Active")}</p>
                                            <p className="text-sm font-bold">{vehicle.isActive ? tr("Yes") : tr("No")}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg">
                                        <div
                                            className={`w-3 h-3 rounded-full ${
                                                vehicle.isSpecialHire ? "bg-blue-500 shadow-[var(--ds-shadow-raised)]" : "bg-gray-400"
                                            }`}
                                        />
                                        <div>
                                            <p className="text-xs text-muted-foreground">{tr("Special Hire")}</p>
                                            <p className="text-sm font-bold">{vehicle.isSpecialHire ? tr("Yes") : tr("No")}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-700 rounded-lg">
                                        <div
                                            className={`w-3 h-3 rounded-full ${
                                                vehicle.isNew ? "bg-purple-500 shadow-[var(--ds-shadow-raised)]" : "bg-gray-400"
                                            }`}
                                        />
                                        <div>
                                            <p className="text-xs text-muted-foreground">{tr("New Vehicle")}</p>
                                            <p className="text-sm font-bold">{vehicle.isNew ? tr("Yes") : tr("No")}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
                    <Button
                        variant="outline"
                        onClick={handlePrint}
                        className="mr-auto hover:bg-blue-50"
                    >
                        <PrinterIcon className="mr-2 h-4 w-4" />{tr("Print Details")}</Button>
                    <Button onClick={() => setOpen(false)} className="w-full sm:w-auto">{tr("Close")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}