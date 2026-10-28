"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTr } from "@/lib/i18n/portal"

/** Portal tables show this many rows per page */
export const TABLE_PAGE_SIZE = 10

// One page of rows; back to page 1 when resetKey changes (search, filters)
export function usePaged<T>(rows: T[], resetKey: unknown = null, pageSize = TABLE_PAGE_SIZE) {
    const [page, setPage] = useState(1)
    useEffect(() => setPage(1), [resetKey])
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
    const current = Math.min(page, totalPages)
    const pageRows = useMemo(() => rows.slice((current - 1) * pageSize, current * pageSize), [rows, current, pageSize])
    return { page: current, setPage, totalPages, pageRows, total: rows.length, pageSize }
}

// "1–10 of 31" with previous/next; hidden when everything fits on one page
export function ListPager({ page, totalPages, total, pageSize = TABLE_PAGE_SIZE, onPage }: { page: number; totalPages: number; total: number; pageSize?: number; onPage: (p: number) => void }) {
    const tr = useTr()
    if (total <= pageSize) return null
    const from = (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, total)
    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row dark:border-white/5">
            <p className="text-xs text-slate-500">{tr("{from}–{to} of {total}", { from, to, total: total.toLocaleString() })} · {tr("Page {page} of {totalPages}", { page, totalPages })}</p>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="mr-1 size-4" />{tr("Previous")}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{tr("Next")}<ChevronRight className="ml-1 size-4" /></Button>
            </div>
        </div>
    )
}
