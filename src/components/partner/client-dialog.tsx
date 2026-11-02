"use client";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { saveClientAction } from "@/app/actions/partner";
import { EntityDialog } from "./entity-dialog";

/** `labelled`: a full "Edit client" button (client page) instead of the pencil icon (table rows). */
export function ClientDialog({ initial, labelled }: { initial?: Record<string, string>; labelled?: boolean }) {
  const { dict } = useI18n();
  const c = dict.partner.clients;
  const editing = Boolean(initial?.id);
  return (
    <EntityDialog
      title={editing ? c.edit : c.add}
      savedMessage={c.saved}
      initial={initial ?? { creditTermsDays: "14" }}
      submit={(values) => saveClientAction(values) as Promise<{ ok: true } | { ok: false; error: string; fields?: Record<string, string> }>}
      trigger={
        editing && labelled ? (
          <Button variant="outline">
            <Pencil /> {c.edit}
          </Button>
        ) : editing ? (
          <Button variant="ghost" size="sm" aria-label={`${c.edit} ${initial?.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> {c.add}
          </Button>
        )
      }
      fields={[
        { name: "name", label: c.name, required: true },
        { name: "contactName", label: c.contact, half: true },
        { name: "phone", label: dict.forms.phone, type: "tel", half: true },
        { name: "email", label: dict.forms.email, type: "email", half: true },
        { name: "tin", label: c.tin, half: true },
        { name: "region", label: c.region, half: true },
        { name: "creditTermsDays", label: c.terms, type: "number", half: true },
      ]}
    />
  );
}

