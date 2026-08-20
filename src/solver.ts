import { ALL_ITEMS, COMBOS, type Combo, MAX_WORKERS, SLOTS, type Slot, slotOf } from "./data";

export interface SolveRequest {
  workers: number;
  /** Unlocked copies per item name. Missing items are treated as zero. */
  available: Record<string, number>;
  /** Combo names in strict priority order. Only these may be deliberately built. */
  comboPriority: string[];
  /** Item names in priority order, used by the gap-filling stage. */
  itemPriority: string[];
}

export type Loadout = Partial<Record<Slot, string>>;

export interface MiniOh {
  loadout: Loadout;
  combos: string[];
}

export interface SolveResult {
  miniOhs: MiniOh[];
  /** Count of Mini'Ohs holding each combo, including incidental ones. */
  comboCounts: Record<string, number>;
  /** Copies of each item left unused. */
  leftover: Record<string, number>;
  emptySlots: number;
  filledSlots: number;
}

/** A loadout shape that one Mini'Oh may be built to, with the combos it grants. */
interface Pattern {
  loadout: Loadout;
  items: string[];
  /** Requested combos this pattern satisfies. */
  combos: Set<string>;
}

const comboByName = new Map<string, Combo>(COMBOS.map((c) => [c.name, c]));

function requireCombo(name: string): Combo {
  const combo = comboByName.get(name);
  if (!combo) throw new Error(`Unknown combo: ${name}`);
  return combo;
}

function satisfies(loadout: Loadout, combo: Combo): boolean {
  return combo.requires.every((item) => loadout[slotOf(item)] === item);
}

/**
 * Every distinct loadout shape reachable by combining requested combos on one
 * Mini'Oh, plus the bare loadout that holds no combo at all.
 */
function buildPatterns(requested: string[]): Pattern[] {
  const combos = requested.map(requireCombo);

  const seen = new Map<string, Pattern>();
  const add = (loadout: Loadout) => {
    const key = SLOTS.map((slot) => loadout[slot] ?? "").join("|");
    if (seen.has(key)) return;
    const held = new Set(combos.filter((c) => satisfies(loadout, c)).map((c) => c.name));
    seen.set(key, {
      loadout,
      items: SLOTS.map((slot) => loadout[slot]).filter((i): i is string => i !== undefined),
      combos: held,
    });
  };

  add({});
  for (let mask = 1; mask < 1 << combos.length; mask++) {
    const loadout: Loadout = {};
    let consistent = true;
    for (let i = 0; i < combos.length && consistent; i++) {
      if (!(mask & (1 << i))) continue;
      for (const item of combos[i].requires) {
        const slot = slotOf(item);
        if (loadout[slot] !== undefined && loadout[slot] !== item) {
          consistent = false;
          break;
        }
        loadout[slot] = item;
      }
    }
    if (consistent) add(loadout);
  }

  // Patterns holding combos first, bare loadout last: better solutions are found
  // early, which sharpens the pruning bound.
  return [...seen.values()].sort((a, b) => b.combos.size - a.combos.size);
}

interface Stage {
  /** Value contributed by one instance of a pattern. */
  perPattern: (pattern: Pattern) => number;
  /** Combo whose required items cap the achievable total, if any. */
  combo?: Combo;
  /** Whether the gap-filling stage's contribution is part of this objective. */
  countsGapFill: boolean;
}

function comboStage(combo: Combo): Stage {
  return {
    perPattern: (pattern) => (pattern.combos.has(combo.name) ? 1 : 0),
    combo,
    countsGapFill: false,
  };
}

const fillStage: Stage = {
  perPattern: (pattern) => pattern.items.length,
  countsGapFill: true,
};

/** Slots left empty by the chosen patterns that leftover copies could still fill. */
function gapFill(emptyBySlot: Record<Slot, number>, remaining: Record<string, number>): number {
  let filled = 0;
  for (const slot of SLOTS) {
    let copies = 0;
    for (const item of ALL_ITEMS) {
      if (slotOf(item) === slot) copies += remaining[item];
    }
    filled += Math.min(emptyBySlot[slot], copies);
  }
  return filled;
}

/**
 * Maximises `stages[stages.length - 1]` while holding every earlier stage at the
 * value already fixed in `targets`.
 */
function maximise(
  patterns: Pattern[],
  workers: number,
  available: Record<string, number>,
  stages: Stage[],
  targets: number[],
): { value: number; counts: number[] } | null {
  const objective = stages.length - 1;
  const counts = new Array<number>(patterns.length).fill(0);
  const remaining: Record<string, number> = { ...available };
  const current = new Array<number>(stages.length).fill(0);

  let best = -1;
  let bestCounts: number[] | null = null;

  const emptyBySlot: Record<Slot, number> = { head: 0, back: 0, tool: 0, mask: 0 };

  const upperBound = (stage: Stage, depth: number, workersLeft: number): number => {
    if (stage.countsGapFill) {
      let copies = 0;
      let empty = 0;
      for (const item of ALL_ITEMS) copies += remaining[item];
      for (const slot of SLOTS) empty += emptyBySlot[slot];
      return Math.min(workersLeft * SLOTS.length + empty, copies);
    }
    let reachable = false;
    for (let i = depth; i < patterns.length; i++) {
      if (stage.perPattern(patterns[i]) > 0) {
        reachable = true;
        break;
      }
    }
    if (!reachable) return 0;
    let cap = workersLeft;
    if (stage.combo) {
      for (const item of stage.combo.requires) cap = Math.min(cap, remaining[item]);
    }
    return cap;
  };

  const recurse = (depth: number, workersLeft: number) => {
    for (let s = 0; s < stages.length; s++) {
      const bound = current[s] + upperBound(stages[s], depth, workersLeft);
      if (s < objective) {
        if (current[s] > targets[s] || bound < targets[s]) return;
      } else if (bound <= best) {
        return;
      }
    }

    if (depth === patterns.length) {
      const value =
        current[objective] +
        (stages[objective].countsGapFill ? gapFill(emptyBySlot, remaining) : 0);
      if (value > best) {
        best = value;
        bestCounts = [...counts];
      }
      return;
    }

    const pattern = patterns[depth];
    let max = workersLeft;
    for (const item of pattern.items) max = Math.min(max, remaining[item]);

    for (let n = max; n >= 0; n--) {
      for (const item of pattern.items) remaining[item] -= n;
      for (const slot of SLOTS) {
        if (pattern.loadout[slot] === undefined) emptyBySlot[slot] += n;
      }
      for (let s = 0; s < stages.length; s++) current[s] += n * stages[s].perPattern(pattern);
      counts[depth] = n;

      recurse(depth + 1, workersLeft - n);

      counts[depth] = 0;
      for (let s = 0; s < stages.length; s++) current[s] -= n * stages[s].perPattern(pattern);
      for (const slot of SLOTS) {
        if (pattern.loadout[slot] === undefined) emptyBySlot[slot] -= n;
      }
      for (const item of pattern.items) remaining[item] += n;
    }
  };

  recurse(0, workers);
  return bestCounts === null ? null : { value: best, counts: bestCounts };
}

/** Leftover items in the order the gap-filling stage should reach for them. */
function fillOrder(itemPriority: string[]): string[] {
  const ranked = new Map<string, number>();
  itemPriority.forEach((item, index) => {
    ranked.set(item, index);
  });
  return [...ALL_ITEMS].sort((a, b) => {
    const ra = ranked.get(a) ?? Number.MAX_SAFE_INTEGER;
    const rb = ranked.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

export function solve(request: SolveRequest): SolveResult {
  if (request.workers < 0 || request.workers > MAX_WORKERS) {
    throw new Error(`The number of Mini'Ohs must be between 0 and ${MAX_WORKERS}`);
  }
  if (new Set(request.comboPriority).size !== request.comboPriority.length) {
    throw new Error("A combo must not appear twice in the request");
  }

  const available: Record<string, number> = {};
  for (const item of ALL_ITEMS) available[item] = request.available[item] ?? 0;

  const patterns = buildPatterns(request.comboPriority);

  // Strict lexicographic priority: maximise each combo in turn, pin the result,
  // then move on. Filling gaps is the last tiebreak.
  const stages: Stage[] = [];
  const targets: number[] = [];
  for (const name of request.comboPriority) {
    stages.push(comboStage(requireCombo(name)));
    const solved = maximise(patterns, request.workers, available, stages, targets);
    targets.push(solved ? solved.value : 0);
  }
  stages.push(fillStage);
  const final = maximise(patterns, request.workers, available, stages, targets);
  const counts = final ? final.counts : patterns.map(() => 0);

  const miniOhs: MiniOh[] = [];
  const leftover = { ...available };
  counts.forEach((n, index) => {
    const pattern = patterns[index];
    for (let i = 0; i < n; i++) {
      miniOhs.push({ loadout: { ...pattern.loadout }, combos: [] });
      for (const item of pattern.items) leftover[item] -= 1;
    }
  });
  while (miniOhs.length < request.workers) miniOhs.push({ loadout: {}, combos: [] });

  for (const item of fillOrder(request.itemPriority)) {
    const slot = slotOf(item);
    for (const miniOh of miniOhs) {
      if (leftover[item] <= 0) break;
      if (miniOh.loadout[slot] !== undefined) continue;
      miniOh.loadout[slot] = item;
      leftover[item] -= 1;
    }
  }

  const comboCounts: Record<string, number> = {};
  for (const combo of COMBOS) comboCounts[combo.name] = 0;
  let filledSlots = 0;
  for (const miniOh of miniOhs) {
    for (const slot of SLOTS) if (miniOh.loadout[slot] !== undefined) filledSlots++;
    for (const combo of COMBOS) {
      if (satisfies(miniOh.loadout, combo)) {
        miniOh.combos.push(combo.name);
        comboCounts[combo.name] += 1;
      }
    }
  }

  return {
    miniOhs,
    comboCounts,
    leftover,
    emptySlots: request.workers * SLOTS.length - filledSlots,
    filledSlots,
  };
}
