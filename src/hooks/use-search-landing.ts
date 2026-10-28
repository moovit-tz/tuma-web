"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/*
 * Landing from the portal search (Ctrl/⌘+K): the result's page opens with
 * ?search=<name> and, for a single result, &open=<id>. This fills the page's
 * search box, switches to its list tab, and opens that item's details once it
 * is in the loaded rows (or fetched with fetchOne when it isn't). `open` is
 * then dropped from the URL so a refresh doesn't reopen it.
 */
export function useSearchLanding<T>({
    setSearch,
    showList,
    items,
    idOf = (item: any) => item?.id,
    onOpen,
    fetchOne,
    ready = true,
}: {
    setSearch: (value: string) => void
    /** Switch to the tab that holds the list */
    showList?: () => void
    /** Rows currently loaded on the page */
    items?: T[] | null
    idOf?: (item: T) => unknown
    onOpen?: (item: T) => void
    /** Loads the item when it isn't among the loaded rows */
    fetchOne?: (id: string) => Promise<T | null | undefined>
    /** False while the rows are still loading */
    ready?: boolean
}) {
    const params = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const search = params.get("search")
    const open = params.get("open")
    const pending = useRef<string | null>(null)
    const fetching = useRef(false)

    // A new landing (also when already on this page)
    useEffect(() => {
        if (search == null && open == null) return
        if (search != null) setSearch(search)
        showList?.()
        // Pages that rewrite their own URL drop `open`; keep what is pending
        if (open != null) {
            pending.current = open
            fetching.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, open])

    useEffect(() => {
        const id = pending.current
        if (!id || !onOpen || !ready) return
        const done = (item: T) => {
            pending.current = null
            onOpen(item)
            const next = new URLSearchParams(params.toString())
            next.delete("open")
            router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false })
        }
        const found = items?.find((item) => String(idOf(item)) === id)
        if (found) return done(found)
        if (fetchOne && !fetching.current) {
            fetching.current = true
            fetchOne(id).then((item) => { if (item && pending.current === id) done(item) }).catch(() => { pending.current = null })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, ready, open])
}
