import { describe, expect, it } from "vitest";
import { matchDistrict, matchRegion, officeFromAddress, toRegistryRecord } from "../brela";

describe("BRELA records", () => {
  it("takes the TIN from BRELA's 9-digit certificate number", () => {
    expect(toRegistryRecord({ number: "169057265", name: "Techtonics Tanzania Limited", kind: "company" }).tin).toBe("169057265");
    expect(toRegistryRecord({ number: "12345", name: "Old Co", kind: "company" }).tin).toBeNull();
  });

  it("knows councils by their old names", () => {
    expect(matchDistrict("Dar es Salaam", "Ilala")).toBe("Dar es Salaam City");
    expect(matchDistrict("Mwanza", "Nyamagana")).toBe("Mwanza City");
    expect(matchDistrict("Mwanza", "Ilemela")).toBe("Ilemela Municipal");
  });

  it("reads region, district and street from a registered address", () => {
    expect(officeFromAddress("Dar Es Salaam, Kinondoni, Mwananyamala, 14108, URSINO ESTATE, BAGAMOYO ROAD, 23, 23, 23")).toEqual({
      region: "Dar es Salaam",
      district: "Kinondoni Municipal",
      street: "Ursino Estate, Bagamoyo Road, Mwananyamala",
    });
  });

  it("matches district names loosely within the region", () => {
    expect(matchRegion("ARUSHA")).toBe("Arusha");
    expect(matchDistrict("Arusha", "Arusha")).toBe("Arusha City");
    expect(matchDistrict("Arusha", "Somewhere New")).toBe("Somewhere New");
    expect(matchDistrict("Iringa", "Iringa CBD")).toBe("Iringa Municipal");
  });

  it("gives up on addresses it can't place, rather than guessing", () => {
    expect(officeFromAddress("P.O. Box 123, Nowhere")).toEqual({});
    expect(officeFromAddress(null)).toEqual({});
  });

  it("maps kind and subtype to the application's business type", () => {
    const c = toRegistryRecord({ number: "65000", name: "VODACOM  TRUST LIMITED", kind: "company", subtype: "Private company Limited by guarantee ", status: "Registered", registeredOn: "2008-04-09T00:00:00" });
    expect(c).toMatchObject({ name: "VODACOM TRUST LIMITED", businessType: "company", registered: true, registeredOn: "2008-04-09" });
    expect(toRegistryRecord({ number: "1", name: "A", kind: "business_name", subtype: "Partnership" }).businessType).toBe("partnership");
    expect(toRegistryRecord({ number: "2", name: "B", kind: "business_name", status: "Struck Off" })).toMatchObject({ businessType: "sole_trader", registered: false });
  });
});
