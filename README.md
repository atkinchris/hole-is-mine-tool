# Hole is Mine tool

Equipment optimiser for [Hole is Mine](https://store.steampowered.com/app/4508020/Hole_Is_Mine/).

Tell it how many Mini'Ohs you have, how much equipment you've unlocked, and which combos you care about most - it tells you what to equip.

## Data

- `equipment.yaml` - the catalogue: the four slots, every item, and every combo with the items it requires. This is the single source of truth for the equipment lists that used to live in this README.
- "request" - the input to the optimiser, for the combos and equipment to prioritise.

## Rules

### Mini'Ohs and slots

- Each Mini'Oh has exactly four equipment slots: Head, Back, Tool and Mask.
- Each slot may hold at most one item, and only an item of that slot's type. Slots may be left empty.
- The number of Mini'Ohs must be between 0 and 16.
- Mini'Ohs are interchangeable (nothing distinguishes worker 3 from worker 7, for example).

### Equipment

- Each item belongs to exactly one slot, declared in `equipment.yaml`.
- Item names are unique across all slots and serve as identifiers. Combo names are likewise unique identifiers.
- The number of unlocked copies of each item is limited to four.
- An item worn by one Mini'Oh is unavailable to another. Across all Mini'Ohs, the number wearing a given item must not exceed the number of unlocked copies.
- No item is required to be used - not all items need to be worn (there is more equipment than slots across all Mini'Ohs).

### Combos

- A combo is a named bonus requiring a specific set of items, listed in `equipment.yaml`.
- Combos must require either three or four items. A three-item combo leaves its Mini'Oh's fourth slot free for any suitable item.
- A combo counts only when a single Mini'Oh wears every required item at the same time. Required items spread across several Mini'Ohs do not count.
- A combo may be applied as many times as available equipment allows.
- A Mini'Oh may hold more than one combo at once when its items satisfy both.
- Only combos listed in the request may be pursued. A combo omitted from the request must never be deliberately built, though it may still be reported if it arises incidentally from the solution.
- A combo must not appear twice in the request.

### How conflicts are settled

- Combo priority is strictly lexicographic. The solver maximises the number of Mini'Ohs wearing the first listed combo, fixes that count, then maximises the second under that constraint, and so on down the list.
- No quantity of lower-priority combos may displace a single higher-priority combo. If putting Holy Hole on a Whole Demon costs two Festive Dragons and Whole Demon is listed first, the Whole Demon must be selected.
- Ties within a priority level are resolved by later entries in the list, then by the gap-filling stage.

### Filling gaps

- Once every combo in the priority list has been settled, a final stage must fill as many remaining empty slots as possible with leftover equipment.
- Gap filling must never compromise a combo: combo counts are fixed as hard constraints before it runs.
- Items placed by this stage are arbitrary among equally good options. Their purpose is to avoid an empty slot, not to identify the best pick.
- When the available equipment is insufficient to fill all slots, the remaining slots must stay empty and their number must be reported in the summary.
