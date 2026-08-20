import { describe, expect, it } from "vitest";
import {
  ALL_ITEMS,
  COMBOS,
  EQUIPMENT,
  MAX_COPIES,
  MAX_WORKERS,
  SLOT_LABELS,
  SLOTS,
  slotOf,
} from "./data";

const duplicates = (names: string[]): string[] =>
  names.filter((name, index) => names.indexOf(name) !== index);

describe("slots", () => {
  it("are the four the game gives each Mini'Oh", () => {
    expect(SLOTS).toEqual(["head", "back", "tool", "mask"]);
  });

  it("all have an equipment list and a label, with nothing left over", () => {
    expect(Object.keys(EQUIPMENT).sort()).toEqual([...SLOTS].sort());
    expect(Object.keys(SLOT_LABELS).sort()).toEqual([...SLOTS].sort());
  });
});

describe("equipment", () => {
  it("has no empty or untrimmed names", () => {
    for (const item of ALL_ITEMS) {
      expect(item).not.toBe("");
      expect(item).toBe(item.trim());
    }
  });

  it("has names unique across every slot", () => {
    expect(duplicates(ALL_ITEMS)).toEqual([]);
  });

  it("lists every item exactly once in ALL_ITEMS", () => {
    const counted = SLOTS.flatMap((slot) => EQUIPMENT[slot]);
    expect([...ALL_ITEMS].sort()).toEqual([...counted].sort());
  });

  it("puts every item in the slot it is listed under", () => {
    for (const slot of SLOTS) {
      for (const item of EQUIPMENT[slot]) expect(slotOf(item)).toBe(slot);
    }
  });

  it("rejects an unknown item rather than guessing a slot", () => {
    expect(() => slotOf("Trilby of Doom")).toThrow(/Unknown item/);
  });
});

describe("combos", () => {
  it("have no empty or untrimmed names", () => {
    for (const combo of COMBOS) {
      expect(combo.name).not.toBe("");
      expect(combo.name).toBe(combo.name.trim());
    }
  });

  it("have names unique among themselves", () => {
    expect(duplicates(COMBOS.map((combo) => combo.name))).toEqual([]);
  });

  it("do not reuse an equipment name as a combo name", () => {
    for (const combo of COMBOS) expect(ALL_ITEMS).not.toContain(combo.name);
  });

  it.each(COMBOS.map((combo) => [combo.name, combo] as const))(
    "%s requires only items that exist",
    (_name, combo) => {
      for (const item of combo.requires) expect(ALL_ITEMS).toContain(item);
    },
  );

  it.each(COMBOS.map((combo) => [combo.name, combo] as const))(
    "%s requires three or four items",
    (_name, combo) => {
      expect(combo.requires.length).toBeGreaterThanOrEqual(3);
      expect(combo.requires.length).toBeLessThanOrEqual(SLOTS.length);
    },
  );

  it.each(COMBOS.map((combo) => [combo.name, combo] as const))(
    "%s names no item twice",
    (_name, combo) => {
      expect(duplicates(combo.requires)).toEqual([]);
    },
  );

  it.each(COMBOS.map((combo) => [combo.name, combo] as const))(
    "%s uses each slot at most once, so one Mini'Oh can wear it",
    (_name, combo) => {
      const slots = combo.requires.map(slotOf);
      expect(duplicates(slots)).toEqual([]);
    },
  );

  it("has no two combos requiring exactly the same items", () => {
    const signatures = COMBOS.map((combo) => [...combo.requires].sort().join("|"));
    expect(duplicates(signatures)).toEqual([]);
  });
});

describe("limits", () => {
  it("match the game's caps", () => {
    expect(MAX_COPIES).toBe(4);
    expect(MAX_WORKERS).toBe(16);
  });
});
