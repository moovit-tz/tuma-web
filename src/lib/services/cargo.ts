import type { Cargo, CreateCargoRequest, CargoFilter, Bid, CreateBidRequest } from "@/types/cargo"

export const cargoService = {
    async getCargos(filters?: CargoFilter): Promise<Cargo[]> {
        try {
            const params = new URLSearchParams()

            if (filters) {
                if (filters.location) params.append("location", filters.location)
                if (filters.cargoType && filters.cargoType !== "ALL") params.append("cargoType", filters.cargoType)
                if (filters.status) params.append("status", filters.status)
                if (filters.sortBy) params.append("sortBy", filters.sortBy)
                if (filters.sortOrder) params.append("sortOrder", filters.sortOrder)
                if (filters.weightRange) {
                    params.append("minWeight", filters.weightRange.min.toString())
                    params.append("maxWeight", filters.weightRange.max.toString())
                }
                if (filters.valueRange) {
                    params.append("minValue", filters.valueRange.min.toString())
                    params.append("maxValue", filters.valueRange.max.toString())
                }
                if (filters.dateRange) {
                    params.append("fromDate", filters.dateRange.from)
                    params.append("toDate", filters.dateRange.to)
                }
            }

            const endpoint = `/api/proxy/cargos${params.toString() ? `?${params.toString()}` : ""}`
            console.log("Fetching cargos from:", endpoint)

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch cargos: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            console.log("Cargos response:", data)

            return data.data || data || []
        } catch (error) {
            console.error("Error fetching cargos:", error)
            throw error
        }
    },

    async getCargoById(id: number): Promise<Cargo> {
        try {
            const response = await fetch(`/api/proxy/cargos/${id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch cargo: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.data || data
        } catch (error) {
            console.error("Error fetching cargo:", error)
            throw error
        }
    },

    async createCargo(cargoData: CreateCargoRequest): Promise<Cargo> {
        try {
            let body: string | FormData

            if (cargoData.images && cargoData.images.length > 0) {
                const formData = new FormData()
                formData.append("title", cargoData.title)
                formData.append("description", cargoData.description)
                formData.append("pickupLocation", cargoData.pickupLocation)
                formData.append("deliveryLocation", cargoData.deliveryLocation)
                formData.append("pickupDate", cargoData.pickupDate)
                formData.append("deliveryDate", cargoData.deliveryDate)
                formData.append("weight", cargoData.weight.toString())
                formData.append("dimensions", JSON.stringify(cargoData.dimensions))
                formData.append("cargoType", cargoData.cargoType)
                formData.append("value", cargoData.value.toString())
                formData.append("currency", cargoData.currency)

                if (cargoData.specialRequirements) {
                    formData.append("specialRequirements", JSON.stringify(cargoData.specialRequirements))
                }

                cargoData.images.forEach((image, index) => {
                    formData.append(`images[${index}]`, image)
                })

                body = formData
            } else {
                body = JSON.stringify(cargoData)
            }

            const response = await fetch("/api/proxy/cargos", {
                method: "POST",
                body,
                credentials: "include",
                ...(!(body instanceof FormData) && {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Failed to create cargo: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.data || data
        } catch (error) {
            console.error("Error creating cargo:", error)
            throw error
        }
    },

    async updateCargo(id: number, data: Partial<CreateCargoRequest>): Promise<Cargo> {
        try {
            const response = await fetch(`/api/proxy/cargos/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to update cargo: ${response.status}`)
            }

            const result = await response.json()
            return result.data || result
        } catch (error) {
            console.error("Error updating cargo:", error)
            throw error
        }
    },

    async deleteCargo(id: number): Promise<void> {
        try {
            const response = await fetch(`/api/proxy/cargos/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to delete cargo: ${response.status}`)
            }
        } catch (error) {
            console.error("Error deleting cargo:", error)
            throw error
        }
    },

    async getBidsForCargo(cargoId: number): Promise<Bid[]> {
        try {
            const response = await fetch(`/api/proxy/cargos/${cargoId}/bids`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch bids: ${response.status}`)
            }

            const data = await response.json()
            return data.data || data || []
        } catch (error) {
            console.error("Error fetching bids:", error)
            throw error
        }
    },

    async createBid(bidData: CreateBidRequest): Promise<Bid> {
        try {
            const response = await fetch("/api/proxy/bids", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(bidData),
                credentials: "include",
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Failed to create bid: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.data || data
        } catch (error) {
            console.error("Error creating bid:", error)
            throw error
        }
    },

    async updateBid(id: number, data: Partial<CreateBidRequest>): Promise<Bid> {
        try {
            const response = await fetch(`/api/proxy/bids/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to update bid: ${response.status}`)
            }

            const result = await response.json()
            return result.data || result
        } catch (error) {
            console.error("Error updating bid:", error)
            throw error
        }
    },

    async acceptBid(cargoId: number, bidId: number): Promise<Cargo> {
        try {
            const response = await fetch(`/api/proxy/cargos/${cargoId}/bids/${bidId}/accept`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Failed to accept bid: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.data || data
        } catch (error) {
            console.error("Error accepting bid:", error)
            throw error
        }
    },

    async rejectBid(cargoId: number, bidId: number): Promise<void> {
        try {
            const response = await fetch(`/api/proxy/cargos/${cargoId}/bids/${bidId}/reject`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Failed to reject bid: ${response.status} ${response.statusText}`)
            }
        } catch (error) {
            console.error("Error rejecting bid:", error)
            throw error
        }
    },

    async withdrawBid(bidId: number): Promise<void> {
        try {
            const response = await fetch(`/api/proxy/bids/${bidId}/withdraw`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to withdraw bid: ${response.status}`)
            }
        } catch (error) {
            console.error("Error withdrawing bid:", error)
            throw error
        }
    },

    async getUserCargos(): Promise<Cargo[]> {
        try {
            const response = await fetch("/api/proxy/user/cargos", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch user cargos: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.data || data || []
        } catch (error) {
            console.error("Error fetching user cargos:", error)
            throw error
        }
    },

    async getCompanyBids(): Promise<Bid[]> {
        try {
            const response = await fetch("/api/proxy/company/bids", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch company bids: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            return data.data || data || []
        } catch (error) {
            console.error("Error fetching company bids:", error)
            throw error
        }
    },
}
