import { ShieldOff } from "lucide-react";
import { getDict } from "@/i18n";

export function NoAccess({ locale }: { locale: string }) {
  const t = getDict(locale);
  return (
    <div className="bg-card mx-auto mt-10 max-w-md rounded-lg border p-8 text-center">
      <ShieldOff className="text-muted-foreground mx-auto size-8" aria-hidden />
      <h1 className="font-display mt-4 text-xl font-semibold">{t.common.forbidden}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t.common.forbiddenHint}</p>
    </div>
  );
}
