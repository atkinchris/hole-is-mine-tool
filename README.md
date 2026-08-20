# Hole is Mine tool

Equipment optimiser for [Hole is Mine](https://store.steampowered.com/app/4508020/Hole_Is_Mine/).

Tell it how many Mini'Ohs you have, how much equipment you've unlocked, and which combos you care about most - it tells you what to equip.

## Data

- `equipment.yaml` - the catalogue: the four slots, every item, and every combo with the items it requires. This is the single source of truth for the equipment lists that used to live in this README.
- "request" - the input to the optimiser, for the combos and equipment to prioritise.

## Rules

### Mini'Ohs and slots

- A Mini'Oh has exactly four equipment slots: Head, Back, Tool and Mask.
- Each slot holds at most one item, and only an item of that slot's type. A slot may be left empty.
- You can have between 0 and 16 Mini'Ohs.
- Mini'Ohs are interchangeable (nothing distinguishes worker 3 from worker 7, for example).

### Equipment

- Every item belongs to exactly one slot, declared in `equipment.yaml`.
- Item names are unique across all slots and are the identifier. The same goes for combo names.
- You can unlock a limited number of copies of each item, up to four.
- An item worn by one Mini'Oh is not available to another. Across all Mini'Ohs, the number wearing a given item can never exceed the copies you own.
- There is no requirement to use an item at all - not all items need to be worn (there's more equipment than slots across all Mini'Ohs).

### Combos

- A combo is a named bonus that requires a specific set of items, listed in `equipment.yaml`.
- Combos can either require three or four items. A three item combo leaves its Mini'Oh's fourth slot free for anything.
- A combo only counts if a single Mini'Oh wears every item it requires at the same time. Spreading the items across several Mini'Ohs achieves nothing.
- A combo can be applied as many times as you have the equipment for. If you own the parts for three Whole Demons and have three Mini'Ohs spare, you get three.
- One Mini'Oh can hold more than one combo at once if their items happen to satisfy both.
- Only combos listed in the request should be pursued. A combo left off the list is never deliberately built, though it may still be reported if it falls out of the solution by accident.
- A combo may not appear twice in the priority list.

### How conflicts are settled

- Combo priority is strictly lexicographic. The solver maximises how many Mini'Ohs wear the first combo in your list, freezes that count, then maximises the second under that constraint, and so on down the list.
- No quantity of lower-priority combos can displace a single higher-priority one. If putting Holy Hole on a Whole Demon costs you two Festive Dragons, and Whole Demon is listed first, you get the Whole Demon.
- Ties within a priority level are broken by whatever comes later in the list, then by the gap-filling stage.

### Filling gaps

- Once every combo in the priority list has been settled, a final stage fills as many remaining empty slots as possible with leftover equipment.
- Gap filling never compromises a combo: the combo counts are already fixed as hard constraints by the time it runs.
- Items placed by this stage are arbitrary among equally good options. They are there to avoid an empty slot, not because that item is the best pick.
- If you own less equipment than you have slots to fill, the leftover slots stay empty and the summary reports how many.
