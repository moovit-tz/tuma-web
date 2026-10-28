"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useAccess } from "@/hooks/use-access"
import { deleteCountry } from "@/lib/services/country"
import { deleteRegion } from "@/lib/services/region"
import { deleteDistrict } from "@/lib/services/district"
import { deleteBookingOffice } from "@/lib/services/booking-office"
import { useTr } from "@/lib/i18n/portal"

type LocationKind = "country" | "region" | "district" | "office"

const LABEL: Record<LocationKind, string> = { country: "country", region: "region", district: "district", office: "booking office" }
const DELETE: Record<LocationKind, (id: number) => Promise<unknown>> = {
    country: deleteCountry,
    region: deleteRegion,
    district: deleteDistrict,
    office: deleteBookingOffice,
}
// Lists to refresh afterwards (the location pages and the shared lookups)
const QUERY_KEYS = ["countries-registry", "regions-registry", "districts-registry", "booking-offices-registry", "regions-all-for-mapping", "districts-all-for-mapping", "offices-all-for-mapping", "countries", "regions", "districts", "booking-offices"]

const WHY: Record<LocationKind, string> = {
    country: "A country with regions can't be deleted.",
    region: "A region with districts, booking offices or parcels can't be deleted.",
    district: "A district with booking offices can't be deleted.",
    office: "An office that parcels or agents use can't be deleted.",
}

/*
 * Delete button for a location row, with a confirmation. The API refuses
 * (and explains why) while anything still uses the location. Shown only to
 * accounts with locations.delete (Admin by default).
 */
export function LocationDeleteButton({ kind, id, name, onDeleted }: { kind: LocationKind; id: number; name: string; onDeleted?: () => void }) {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { can } = useAccess()
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    if (!can("locations.delete")) return null

    const confirm = async () => {
        setBusy(true)
        try {
            await DELETE[kind](id)
            toast({ title: tr("{kind}{slice} deleted", { kind: LABEL[kind][0].toUpperCase(), slice: LABEL[kind].slice(1) }), description: name })
            for (const key of QUERY_KEYS) queryClient.invalidateQueries({ queryKey: [key] })
            setOpen(false)
            onDeleted?.()
        } catch (e: any) {
            toast({ variant: "destructive", title: tr("Couldn't delete {name}", { name }), description: e?.message || WHY[kind] })
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <Button
                size="icon"
                variant="ghost"
                aria-label={tr("Delete {name}", { name })}
                onClick={(e) => { e.stopPropagation(); setOpen(true) }}
                className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-[var(--ds-radius-small)] transition-colors"
            >
                <Trash2 className="size-[18px]" aria-hidden />
            </Button>
            <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Delete {name}?", { name })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tr("This removes the {kind} permanently. {kind2}", { kind: LABEL[kind], kind2: WHY[kind] })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); confirm() }} disabled={busy} className="bg-rose-600 text-white hover:bg-rose-700">
                            {busy ? tr("Deleting…") : tr("Delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
