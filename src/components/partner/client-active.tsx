"use client";
import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { setClientActiveAction } from "@/app/actions/partner";

export function ClientActiveToggle({ id, active }: { id: string; active: boolean }) {
  const { dict } = useI18n();
  const c = dict.partner.clients;
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      disabled={pending}
      title={active ? c.archivedNote : undefined}
      onClick={() =>
        start(async () => {
          const r = await setClientActiveAction(id, !active);
          if (r.ok) toast.success(c.saved);
          else toast.error(r.error);
        })
      }
    >
      {active ? <Archive /> : <ArchiveRestore />} {active ? c.archive : c.restore}
    </Button>
  );
}
