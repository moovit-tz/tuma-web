import { describe, expect, it } from "vitest";
import { impliedEntity, interpret } from "../search-intent";

describe("search query understanding", () => {
  it("understands entity + filter in English", () => {
    expect(interpret("overdue invoices")).toMatchObject({ entity: "invoices", filters: ["overdue"] });
    expect(interpret("trucks with expired insurance")).toMatchObject({ entity: "vehicles", filters: ["expired"] });
    expect(interpret("show me failed deliveries to Arusha")).toMatchObject({ filters: ["failed"], place: "Arusha" });
  });

  it("understands Swahili and French", () => {
    expect(interpret("ankara zilizopitwa")).toMatchObject({ entity: "invoices" });
    expect(interpret("malipo ambayo hayajalinganishwa")).toMatchObject({ entity: "payments", filters: ["unmatched"] });
    expect(interpret("magari yenye bima iliyoisha")).toMatchObject({ entity: "vehicles", filters: ["expired"] });
    expect(interpret("colis livrés à Mwanza")).toMatchObject({ entity: "shipments", filters: ["delivered"], place: "Mwanza" });
    expect(interpret("factures impayées")).toMatchObject({ entity: "invoices", filters: ["unpaid"] });
  });

  it("tolerates typos and accents", () => {
    expect(interpret("invoces ovredue")).toMatchObject({ entity: "invoices", filters: ["overdue"] });
    expect(interpret("vehicules en panne")).toMatchObject({ entity: "vehicles", filters: ["maintenance"] });
    expect(interpret("dar es salam")).toMatchObject({ place: "Dar es Salaam" });
  });

  it("recognises actions", () => {
    expect(interpret("create invoice").action).toBe("new_invoice");
    expect(interpret("send a parcel").action).toBe("new_shipment");
    expect(interpret("ongeza gari").action).toBe("add_vehicle");
  });

  it("keeps unrecognised words for record lookup and infers the entity from the filter", () => {
    expect(interpret("Arusha Coffee").rest).toContain("coffee");
    expect(impliedEntity(interpret("unmatched").filters)).toBe("payments");
    expect(impliedEntity(interpret("expired").filters)).toBe("vehicles");
  });
});
