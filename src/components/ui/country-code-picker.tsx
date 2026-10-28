"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTr } from "@/lib/i18n/portal"

const countries = [
    { name: "Tanzania", code: "TZ", dialCode: "+255", flag: "🇹🇿" },
    { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪" },
    { name: "Uganda", code: "UG", dialCode: "+256", flag: "🇺🇬" },
    { name: "Rwanda", code: "RW", dialCode: "+250", flag: "🇷🇼" },
    { name: "Burundi", code: "BI", dialCode: "+257", flag: "🇧🇮" },
    { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
    { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
    { name: "Ghana", code: "GH", dialCode: "+233", flag: "🇬🇭" },
    { name: "Ethiopia", code: "ET", dialCode: "+251", flag: "🇪🇹" },
    { name: "Egypt", code: "EG", dialCode: "+20", flag: "🇪🇬" },
    { name: "Morocco", code: "MA", dialCode: "+212", flag: "🇲🇦" },
    { name: "Algeria", code: "DZ", dialCode: "+213", flag: "🇩🇿" },
    { name: "Tunisia", code: "TN", dialCode: "+216", flag: "🇹🇳" },
    { name: "Libya", code: "LY", dialCode: "+218", flag: "🇱🇾" },
    { name: "Sudan", code: "SD", dialCode: "+249", flag: "🇸🇩" },
    { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
    { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
    { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
    { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
    { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
    { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
    { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
    { name: "Belgium", code: "BE", dialCode: "+32", flag: "🇧🇪" },
    { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭" },
    { name: "Austria", code: "AT", dialCode: "+43", flag: "🇦🇹" },
    { name: "Sweden", code: "SE", dialCode: "+46", flag: "🇸🇪" },
    { name: "Norway", code: "NO", dialCode: "+47", flag: "🇳🇴" },
    { name: "Denmark", code: "DK", dialCode: "+45", flag: "🇩🇰" },
    { name: "Finland", code: "FI", dialCode: "+358", flag: "🇫🇮" },
    { name: "Poland", code: "PL", dialCode: "+48", flag: "🇵🇱" },
    { name: "Czech Republic", code: "CZ", dialCode: "+420", flag: "🇨🇿" },
    { name: "Hungary", code: "HU", dialCode: "+36", flag: "🇭🇺" },
    { name: "Romania", code: "RO", dialCode: "+40", flag: "🇷🇴" },
    { name: "Bulgaria", code: "BG", dialCode: "+359", flag: "🇧🇬" },
    { name: "Greece", code: "GR", dialCode: "+30", flag: "🇬🇷" },
    { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷" },
    { name: "Russia", code: "RU", dialCode: "+7", flag: "🇷🇺" },
    { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳" },
    { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵" },
    { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
    { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
    { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰" },
    { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩" },
    { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰" },
    { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭" },
    { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳" },
    { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾" },
    { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
    { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩" },
    { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭" },
    { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
    { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿" },
    { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
    { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽" },
    { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷" },
    { name: "Argentina", code: "AR", dialCode: "+54", flag: "🇦🇷" },
    { name: "Chile", code: "CL", dialCode: "+56", flag: "🇨🇱" },
    { name: "Colombia", code: "CO", dialCode: "+57", flag: "🇨🇴" },
    { name: "Peru", code: "PE", dialCode: "+51", flag: "🇵🇪" },
    { name: "Venezuela", code: "VE", dialCode: "+58", flag: "🇻🇪" },
    { name: "Ecuador", code: "EC", dialCode: "+593", flag: "🇪🇨" },
    { name: "Bolivia", code: "BO", dialCode: "+591", flag: "🇧🇴" },
    { name: "Paraguay", code: "PY", dialCode: "+595", flag: "🇵🇾" },
    { name: "Uruguay", code: "UY", dialCode: "+598", flag: "🇺🇾" },
]

interface CountryCodePickerProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    className?: string
}

export function CountryCodePicker({ value, onChange, disabled, className }: CountryCodePickerProps) {
    const tr = useTr()
    const [open, setOpen] = React.useState(false)

    const selectedCountry = countries.find((country) => country.dialCode === value) || countries[0]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-[100px] sm:w-[120px] justify-between px-2 sm:px-3 font-normal", className)}
                    disabled={disabled}
                >
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <span className="text-base sm:text-lg flex-shrink-0">{selectedCountry.flag}</span>
                        <span className="text-xs sm:text-sm truncate">{selectedCountry.dialCode}</span>
                    </div>
                    <ChevronDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] sm:w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={tr("Search country...")} className="h-9" />
                    <CommandEmpty>{tr("No country found.")}</CommandEmpty>
                    <CommandList className="max-h-[200px] sm:max-h-[300px]">
                        <CommandGroup>
                            {countries.map((country) => (
                                <CommandItem
                                    key={country.code}
                                    value={`${country.name} ${country.dialCode}`}
                                    onSelect={() => {
                                        onChange(country.dialCode)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
                                        <span className="text-base sm:text-lg flex-shrink-0">{country.flag}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{country.name}</div>
                                            <div className="text-xs text-muted-foreground">{country.dialCode}</div>
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-auto h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0",
                                                selectedCountry.dialCode === country.dialCode ? "opacity-100" : "opacity-0",
                                            )}
                                        />
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
