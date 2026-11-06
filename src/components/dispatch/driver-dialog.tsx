"use client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { addDriverAction } from "@/app/actions/dispatch";
import { EntityDialog } from "@/components/partner/entity-dialog";

export function AddDriverDialog({ regions }: { regions: string[] }) {
  const { dict } = useI18n();
  const d = dict.drivers;
  return (
    <EntityDialog
      title={d.add}
      savedMessage={d.added}
      initial={{ vehicleKind: "boda", region: "Dar es Salaam" }}
      submit={(values) => addDriverAction(values) as Promise<{ ok: true } | { ok: false; error: string; fields?: Record<string, string> }>}
      trigger={
        <Button>
          <Plus /> {d.add}
        </Button>
      }
      fields={[
        { name: "name", label: d.name, required: true },
        { name: "phone", label: d.phone, type: "tel", required: true, half: true },
        { name: "plate", label: d.plate, half: true, mono: true },
        { name: "vehicleKind", label: d.vehicle, type: "select", half: true, options: Object.entries(d.vehicles) as [string, string][] },
        { name: "region", label: d.region, type: "select", half: true, options: regions.map((r) => [r, r] as [string, string]) },
      ]}
    />
  );
}
