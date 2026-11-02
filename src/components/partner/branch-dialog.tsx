"use client";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { saveBranchAction } from "@/app/actions/partner";
import { EntityDialog } from "./entity-dialog";

export function BranchDialog({ initial }: { initial?: Record<string, string> }) {
  const { dict } = useI18n();
  const b = dict.branches;
  const editing = Boolean(initial?.id);
  return (
    <EntityDialog
      title={editing ? b.edit : b.add}
      savedMessage={b.saved}
      initial={initial ?? { active: "true" }}
      submit={(values) => saveBranchAction(values) as Promise<{ ok: true } | { ok: false; error: string; fields?: Record<string, string> }>}
      trigger={
        editing ? (
          <Button variant="ghost" size="sm" aria-label={`${b.edit} ${initial?.name}`}>
            <Pencil /> {dict.common.edit}
          </Button>
        ) : (
          <Button>
            <Plus /> {b.add}
          </Button>
        )
      }
      fields={[
        { name: "name", label: b.name, required: true },
        { name: "code", label: `${b.code} · ${b.codeHint}`, required: true, half: true, mono: true },
        { name: "region", label: b.region, required: true, half: true },
        { name: "district", label: b.district, half: true },
        { name: "phone", label: b.phone, type: "tel", half: true },
        { name: "address", label: b.address },
        ...(editing
          ? [
              {
                name: "active",
                label: b.status,
                type: "select" as const,
                options: [
                  ["true", b.active],
                  ["false", b.closed],
                ] as [string, string][],
              },
            ]
          : []),
      ]}
    />
  );
}
