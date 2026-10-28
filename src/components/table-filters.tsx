"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal, Search } from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

type FilterOption = {
    id: string
    label: string
    type: "text" | "select" | "date" | "number"
    options?: { value: string; label: string }[]
}

interface TableFiltersProps {
    onSearch: (term: string) => void
    onFilterChange: (filters: any) => void
    filterOptions?: FilterOption[]
    searchPlaceholder?: string
}

export function TableFilters({
                                 onSearch,
                                 onFilterChange,
                                 filterOptions = [], // Default to empty array
                                 searchPlaceholder = "Search...",
                             }: TableFiltersProps) {
    const tr = useTr()
    const [searchTerm, setSearchTerm] = useState("")
    const [filterValues, setFilterValues] = useState<Record<string, any>>({})
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    const handleSearch = () => {
        onSearch(searchTerm)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    const handleFilterChange = (id: string, value: any) => {
        setFilterValues((prev) => ({
            ...prev,
            [id]: value,
        }))
    }

    const applyFilters = () => {
        onFilterChange(filterValues)
        setIsFilterOpen(false)
    }

    const resetFilters = () => {
        setFilterValues({})
        onFilterChange({})
        setIsFilterOpen(false)
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="relative w-full sm:w-auto flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSearch}>{tr("Search")}</Button>
                {Array.isArray(filterOptions) && filterOptions.length > 0 && (
                    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                                <SlidersHorizontal className="h-4 w-4 mr-2" />{tr("Filters")}</Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{tr("Filters")}</SheetTitle>
                                <SheetDescription>{tr("Apply filters to narrow down your search results.")}</SheetDescription>
                            </SheetHeader>
                            <div className="py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {Array.isArray(filterOptions) && filterOptions.length > 0 ? (
                                        filterOptions.map((option) => (
                                            <div key={option.id} className="space-y-2">
                                                <Label htmlFor={option.id}>{option.label}</Label>
                                                {option.type === "select" && option.options ? (
                                                    <Select
                                                        value={filterValues[option.id] || "all"}
                                                        onValueChange={(value) => handleFilterChange(option.id, value)}
                                                    >
                                                        <SelectTrigger id={option.id}>
                                                            <SelectValue placeholder={tr("Select {label}", { label: option.label })} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">{tr("All")}</SelectItem>
                                                            {option.options.map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : option.type === "date" ? (
                                                    <Input
                                                        id={option.id}
                                                        type="date"
                                                        value={filterValues[option.id] || ""}
                                                        onChange={(e) => handleFilterChange(option.id, e.target.value)}
                                                    />
                                                ) : option.type === "number" ? (
                                                    <Input
                                                        id={option.id}
                                                        type="number"
                                                        value={filterValues[option.id] || ""}
                                                        onChange={(e) => handleFilterChange(option.id, e.target.value)}
                                                    />
                                                ) : (
                                                    <Input
                                                        id={option.id}
                                                        type="text"
                                                        value={filterValues[option.id] || ""}
                                                        onChange={(e) => handleFilterChange(option.id, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center text-muted-foreground">{tr("No filter options available")}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between mt-4">
                                <Button variant="outline" onClick={resetFilters}>{tr("Reset")}</Button>
                                <Button onClick={applyFilters}>{tr("Apply Filters")}</Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                )}
            </div>
        </div>
    )
}
