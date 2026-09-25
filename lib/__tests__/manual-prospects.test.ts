import { describe, expect, it } from "vitest";
import { prepareManualProspect } from "@/lib/manual-prospects";

describe("manual prospect contact links", () => {
  it("stores a wa.me number as phone instead of website", () => {
    const prepared = prepareManualProspect({
      name: "Negocio demo",
      city: "Mérida",
      type: "Servicios",
      website: "https://wa.me/529381573988?text=Hola",
    });

    expect(prepared.phone).toBe("529381573988");
    expect(prepared.website).toBe("");
  });
});
