"use client";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { saveVehicleAction } from "@/app/actions/partner";
import { EntityDialog } from "./entity-dialog";

/** `branches`: [id, label] pairs; the branch field shows when the company has more than one branch. */
export function VehicleDialog({ initial, branches = [] }: { initial?: Record<string, string>; branches?: [string, string][] }) {
  const { dict } = useI18n();
  const v = dict.partner.vehicles;
  const editing = Boolean(initial?.id);
  return (
    <EntityDialog
      title={editing ? v.edit : v.add}
      savedMessage={v.saved}
      initial={initial ?? { kind: "truck", status: "available" }}
      submit={(values) => saveVehicleAction(values) as Promise<{ ok: true } | { ok: false; error: string; fields?: Record<string, string> }>}
      trigger={
        editing ? (
          <Button variant="ghost" size="sm" aria-label={`${v.edit} ${initial?.plate}`}>
            <Pencil /> {dict.common.edit}
          </Button>
        ) : (
          <Button>
            <Plus /> {v.add}
          </Button>
        )
      }
      fields={[
        { name: "plate", label: v.plate, required: true, half: true, mono: true },
        { name: "kind", label: v.kind, type: "select", half: true, options: Object.entries(v.kinds) },
        { name: "make", label: v.make },
        { name: "capacityKg", label: v.capacity, type: "number", required: true, half: true },
        { name: "volumeM3", label: v.volume, type: "number", half: true },
        { name: "status", label: v.status, type: "select", options: Object.entries(v.statuses), half: branches.length > 1 },
        ...(branches.length > 1 ? [{ name: "branchId", label: dict.branches.branch, type: "select" as const, half: true, options: [["", "—"], ...branches] as [string, string][] }] : []),
        { name: "driverName", label: v.driver, half: true },
        { name: "driverPhone", label: v.driverPhone, type: "tel", half: true },
        { name: "insuranceExpiry", label: v.insurance, type: "date", half: true },
        { name: "inspectionExpiry", label: v.inspection, type: "date", half: true },
      ]}
    />
  );
}
