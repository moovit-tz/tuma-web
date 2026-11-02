import { getCurrentUser } from "@/server/auth/current-user";
import { clientOptions } from "@/server/services/partner";
import { getDict } from "@/i18n";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { InvoiceBuilder } from "@/components/partner/invoice-builder";

export const instant = false;

export default async function NewInvoicePage({ params, searchParams }: PageProps<"/[locale]/portal/invoices/new">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("partner.finance.manage")) return <NoAccess locale={locale} />;
  const sp = await searchParams;
  const t = getDict(locale);
  const clients = await clientOptions(user);
  return (
    <>
      <PageHeader eyebrow={t.partner.invoices.title} title={t.partner.invoices.new} />
      <InvoiceBuilder clients={clients} initialClient={typeof sp.client === "string" ? sp.client : undefined} />
    </>
  );
}
