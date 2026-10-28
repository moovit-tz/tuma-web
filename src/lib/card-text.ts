// Card headline size by length, so long names (e.g. a company name) fit the
// card instead of overflowing; numbers and short names keep the full size.
export function cardValueClass(value: unknown): string {
    const n = String(value ?? "").length
    if (n <= 14) return "text-xl"
    if (n <= 22) return "text-lg"
    if (n <= 34) return "text-base"
    return "text-sm"
}
