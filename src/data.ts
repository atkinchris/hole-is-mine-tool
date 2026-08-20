export type Slot = "head" | "back" | "tool" | "mask";

export const SLOTS: Slot[] = ["head", "back", "tool", "mask"];

export const SLOT_LABELS: Record<Slot, string> = {
  head: "Head",
  back: "Back",
  tool: "Tool",
  mask: "Mask",
};

export const EQUIPMENT: Record<Slot, string[]> = {
  head: ["Holy Hole", "Bravery Helmet", "Plasticky Hat", "Sonic Helmet", "Merchant Hat"],
  back: ["Friendship Wool", "Bouncy Float", "Lost Anchor", "Infinite Dynamite", "Holy Wings"],
  tool: ["Golden Pickaxe", "Mending Crutch", "Heavy Tool", "Holy Harp", "Battered Wand"],
  mask: ["Wolf Skin", "Wrestling Mask", "Kloning Gasmask", "Dragoon Face", "Evil Mask"],
};

export interface Combo {
  name: string;
  requires: string[];
}

export const COMBOS: Combo[] = [
  { name: "Whole Demon", requires: ["Holy Hole", "Holy Wings", "Holy Harp", "Evil Mask"] },
  { name: "Wee Ooo Wee Ooo!", requires: ["Bravery Helmet", "Mending Crutch", "Kloning Gasmask"] },
  { name: "Festive Dragon", requires: ["Holy Hole", "Infinite Dynamite", "Dragoon Face"] },
  { name: "Blood and Sand", requires: ["Plasticky Hat", "Bouncy Float", "Wrestling Mask"] },
  { name: "Movie Star", requires: ["Merchant Hat", "Heavy Tool", "Wrestling Mask"] },
  { name: "Whywolf", requires: ["Merchant Hat", "Mending Crutch", "Wolf Skin"] },
  { name: "Free Kite", requires: ["Holy Harp", "Friendship Wool", "Bravery Helmet"] },
  { name: "Deep Miner", requires: ["Lost Anchor", "Sonic Helmet", "Golden Pickaxe"] },
  { name: "Clumsy Pilot", requires: ["Plasticky Hat", "Holy Wings", "Mending Crutch"] },
];

export const MAX_WORKERS = 16;
export const MAX_COPIES = 4;

const SLOT_BY_ITEM = new Map<string, Slot>(
  SLOTS.flatMap((slot) => EQUIPMENT[slot].map((item): [string, Slot] => [item, slot])),
);

export function slotOf(item: string): Slot {
  const slot = SLOT_BY_ITEM.get(item);
  if (slot === undefined) throw new Error(`Unknown item: ${item}`);
  return slot;
}

export const ALL_ITEMS: string[] = SLOTS.flatMap((slot) => EQUIPMENT[slot]);
