"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Calendar, Weight, Package, Clock, Star, Eye, Gavel } from "lucide-react"
import type { Cargo } from "@/types/cargo"
import { formatDistanceToNow } from "date-fns"
import { useTr } from "@/lib/i18n/portal"

interface CargoCardProps {
    cargo: Cargo
    onViewDetails: (cargo: Cargo) => void
    onPlaceBid?: (cargo: Cargo) => void
    showBidButton?: boolean
}

const CARGO_TYPE_COLORS = {
    GENERAL: "bg-blue-100 text-blue-800",
    FRAGILE: "bg-orange-100 text-orange-800",
    PERISHABLE: "bg-green-100 text-green-800",
    HAZARDOUS: "bg-red-100 text-red-800",
    ELECTRONICS: "bg-purple-100 text-purple-800",
    DOCUMENTS: "bg-gray-100 text-gray-800",
    FURNITURE: "bg-brown-100 text-brown-800",
    AUTOMOTIVE: "bg-indigo-100 text-indigo-800",
    TEXTILES: "bg-pink-100 text-pink-800",
    FOOD: "bg-yellow-100 text-yellow-800",
    MEDICAL: "bg-teal-100 text-teal-800",
    OTHER: "bg-slate-100 text-slate-800",
}

const STATUS_COLORS = {
    POSTED: "bg-blue-100 text-blue-800",
    BIDDING: "bg-yellow-100 text-yellow-800",
    ASSIGNED: "bg-purple-100 text-purple-800",
    IN_TRANSIT: "bg-orange-100 text-orange-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
}

export function CargoCard({ cargo, onViewDetails, onPlaceBid, showBidButton = true }: CargoCardProps) {
    const tr = useTr()
    const formatCargoType = (type: string) => {
        return type
            .replace("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase())
    }

    const formatStatus = (status: string) => {
        return status
            .replace("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase())
    }

    const canPlaceBid = cargo.status === "POSTED" || cargo.status === "BIDDING"

    return (
        <Card className="transition-shadow duration-200">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{cargo.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className={STATUS_COLORS[cargo.status]}>{formatStatus(cargo.status)}</Badge>
                            <Badge className={CARGO_TYPE_COLORS[cargo.cargoType]}>{formatCargoType(cargo.cargoType)}</Badge>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                            {cargo.currency} {cargo.value.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">{tr("Cargo Value")}</div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Route */}
                <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                        <span className="font-medium">{cargo.pickupLocation}</span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="font-medium">{cargo.deliveryLocation}</span>
                    </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                            <div className="font-medium">{tr("Pickup")}</div>
                            <div className="text-gray-600">{new Date(cargo.pickupDate).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                            <div className="font-medium">{tr("Delivery")}</div>
                            <div className="text-gray-600">{new Date(cargo.deliveryDate).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>

                {/* Weight and Dimensions */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-gray-500" />
                        <span>{tr("{weight} kg", { weight: cargo.weight })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span>
              {tr("{dimensionsCount}×{width}×{height} cm", { dimensionsCount: cargo.dimensions.length, width: cargo.dimensions.width, height: cargo.dimensions.height })}</span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2">{cargo.description}</p>

                {/* Special Requirements */}
                {cargo.specialRequirements && cargo.specialRequirements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {cargo.specialRequirements.slice(0, 3).map((req, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                                {req}
                            </Badge>
                        ))}
                        {cargo.specialRequirements.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{cargo.specialRequirements.length - 3}{" "}{tr("more")}</Badge>
                        )}
                    </div>
                )}

                {/* Posted by */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${cargo.postedBy.name}`} />
                            <AvatarFallback>{cargo.postedBy.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-sm font-medium">{cargo.postedBy.name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{cargo.postedBy.rating.toFixed(1)}</span>
                                <span>{tr("({totalCargos} cargos)", { totalCargos: cargo.postedBy.totalCargos })}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(cargo.createdAt), { addSuffix: true })}
                    </div>
                </div>

                {/* Bids info */}
                {cargo.bids.length > 0 && (
                    <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-gray-500" />
                            <span>
                {cargo.bids.length}{" "}{tr("bid")}{cargo.bids.length !== 1 ? "s" : ""}
              </span>
                        </div>
                        {cargo.bids.length > 0 && (
                            <div className="text-green-600 font-medium">{tr("Best:")}{" "}{cargo.currency} {Math.min(...cargo.bids.map((b) => b.amount)).toLocaleString()}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => onViewDetails(cargo)} className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />{tr("View Details")}</Button>
                    {showBidButton && canPlaceBid && onPlaceBid && (
                        <Button
                            size="sm"
                            onClick={() => onPlaceBid(cargo)}
                            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                        >
                            <Gavel className="h-4 w-4 mr-2" />{tr("Place Bid")}</Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
