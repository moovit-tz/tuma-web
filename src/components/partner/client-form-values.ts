/** Initial values for editing a client row (phone shown in local format). */
export function clientFormValues(cl: { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; tin: string | null; region: string | null; creditTermsDays: number }) {
  return {
    id: cl.id,
    name: cl.name,
    contactName: cl.contactName ?? "",
    phone: cl.phone ? "0" + cl.phone.slice(4) : "",
    email: cl.email ?? "",
    tin: cl.tin ?? "",
    region: cl.region ?? "",
    creditTermsDays: String(cl.creditTermsDays),
  };
}
