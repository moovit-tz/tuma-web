"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { UserCheck, UserX, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { getCurrentUser } from "@/lib/auth"
import { SheetSection } from "@/components/sheets/sheet-blocks"
import { activateUser, deactivateUser, deleteUser, setStaffAccountStatus, deleteStaffAccount } from "@/lib/services/user"
import { useTr } from "@/lib/i18n/portal"

/*
 * Account panel for a sheet: activate/deactivate and delete, with
 * confirmations. "staff" = admin-table accounts (admins, OPS, owners),
 * "agent" = users table. Each kind only ever calls its own endpoints.
 */
export function AccountActions({ kind, account, onChanged, onDeleted }: {
    kind: "staff" | "agent"
    account: { id: number; fullName: string; isActive?: boolean }
    /** After a status change, with the new status */
    onChanged?: (isActive: boolean) => void
    /** After the account was deleted (or archived) */
    onDeleted?: () => void
}) {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { can } = useAccess()
    const [confirm, setConfirm] = useState<"status" | "delete" | null>(null)
    const [typed, setTyped] = useState("")
    const isSelf = kind === "staff" && Number((getCurrentUser() as any)?.id) === account.id
    // Track the status here: the parent's copy of the account may be stale
    const [active, setActive] = useState(!!account.isActive)
    useEffect(() => setActive(!!account.isActive), [account.id, account.isActive])

    const canStatus = (kind === "staff" ? can("staff.manage") : can("agents.manage")) && !isSelf
    const canDelete = (kind === "staff" ? can("staff.manage") : can("agents.delete")) && !isSelf
    // Agents must be deactivated before they can be deleted (the API requires it)
    const deleteBlocked = kind === "agent" && active

    const refresh = () => {
        for (const key of ["admins", "bus-owners", "all-bus-owners-for-charts", "agents", "biz-agents", "all-agents"]) {
            queryClient.invalidateQueries({ queryKey: [key] })
        }
    }

    const statusMutation = useMutation({
        mutationFn: () => (kind === "staff" ? setStaffAccountStatus(account.id, !active) : active ? deactivateUser(account.id) : activateUser(account.id)),
        onSuccess: () => {
            toast({ title: active ? "Account deactivated" : "Account activated", description: account.fullName })
            setConfirm(null)
            setActive(!active)
            refresh()
            onChanged?.(!active)
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't change the status"), description: e?.message }),
    })
    const deleteMutation = useMutation({
        mutationFn: () => (kind === "staff" ? deleteStaffAccount(account.id) : deleteUser(account.id)),
        onSuccess: (res: any) => {
            toast({
                title: res?.archived ? "Agent archived" : "Account deleted",
                description: res?.archived ? `${account.fullName} has parcel history, so they're hidden and can't sign in.` : account.fullName,
            })
            setConfirm(null)
            refresh()
            onDeleted?.()
        },
        onError: (e: any) => toast({ variant: "destructive", title: tr("Couldn't delete the account"), description: e?.message }),
    })

    if (!canStatus && !canDelete) return null

    return (
        <SheetSection title={tr("Account")}>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
                {canStatus && (
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#242a37] dark:text-white">{active ? tr("Deactivate account") : tr("Activate account")}</p>
                            <p className="text-xs text-slate-500">{active ? tr("Signs them out and blocks sign-in until it's activated again.") : tr("Lets them sign in again.")}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setConfirm("status")} disabled={statusMutation.isPending}
                            className={active ? "text-amber-700 hover:text-amber-800" : ""}>
                            {active ? <><UserX className="mr-1.5 size-4" />{" "}{tr("Deactivate")}</> : <><UserCheck className="mr-1.5 size-4" />{" "}{tr("Activate")}</>}
                        </Button>
                    </div>
                )}
                {canDelete && (
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-rose-600">{tr("Delete account")}</p>
                            <p className="text-xs text-slate-500">
                                {deleteBlocked ? tr("Deactivate the agent first.") : kind === "agent" ? tr("Agents with parcel history are archived instead, so records stay intact.") : tr("Removes the account and its sign-in. This can't be undone.")}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setTyped(""); setConfirm("delete") }} disabled={deleteBlocked || deleteMutation.isPending}
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 className="mr-1.5 size-4" />{" "}{tr("Delete")}</Button>
                    </div>
                )}
            </div>

            <AlertDialog open={confirm === "status"} onOpenChange={(o) => !o && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{active ? tr("Deactivate {fullName}?", { fullName: account.fullName }) : tr("Activate {fullName}?", { fullName: account.fullName })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {active ? tr("They'll be signed out and won't be able to sign in until the account is activated again.") : tr("They'll be able to sign in again.")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); statusMutation.mutate() }} disabled={statusMutation.isPending}
                            className={active ? "bg-amber-500 text-[#242a37] hover:bg-amber-400" : ""}>
                            {statusMutation.isPending ? tr("Saving…") : active ? tr("Deactivate") : tr("Activate")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === "delete"} onOpenChange={(o) => !o && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-rose-600">{tr("Delete {fullName}?", { fullName: account.fullName })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {kind === "agent"
                                ? tr("The agent is removed. If they ever handled a parcel, they're archived instead: hidden from lists and unable to sign in, with their parcel history kept.")
                                : tr("The account and its sign-in are removed permanently, and its activity history is cleared. This can't be undone.")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <label htmlFor="confirm-delete" className="text-xs font-semibold text-slate-600">{tr("Type")}{" "}<span className="font-mono">DELETE</span>{" "}{tr("to confirm")}</label>
                        <Input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteMutation.mutate() }} disabled={typed.trim() !== "DELETE" || deleteMutation.isPending}
                            className="bg-rose-600 text-white hover:bg-rose-700">
                            {deleteMutation.isPending ? tr("Deleting…") : tr("Delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SheetSection>
    )
}
