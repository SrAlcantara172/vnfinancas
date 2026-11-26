import { describe, it, expect } from "vitest";
import { installmentIn, usedLimit, type Data } from "@/lib/vn-store";

const p = { id: "1", cardId: "c", desc: "TV", amount: 1200, installments: 3, month: "2026-11", category: "Outros" };
const d: Data = { incomes: [], bills: [], transfers: [], cards: [], purchases: [p] };
describe("parcelamento", () => {
  it("divide em parcelas nos meses futuros", () => {
    expect(installmentIn(p, "2026-11")).toBe(400);
    expect(installmentIn(p, "2027-01")).toBe(400);
    expect(installmentIn(p, "2027-02")).toBe(0);
  });
  it("limite usado considera parcelas restantes", () => {
    expect(usedLimit(d, "c", "2026-12")).toBe(800);
  });
});
