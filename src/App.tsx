import { useState } from "preact/hooks";
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
import { type SolveResult, solve } from "./solver";

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const COMBO_LABELS = new Map(
  COMBOS.map((combo) => [combo.name, `${combo.name} - ${combo.requires.join(", ")}`]),
);

function moved(order: string[], index: number, delta: number): string[] {
  const next = [...order];
  const [row] = next.splice(index, 1);
  next.splice(index + delta, 0, row);
  return next;
}

/**
 * The only state worth holding: document order is priority order, so the form
 * is read with FormData on submit rather than mirrored into components.
 * Which rows are ticked stays in the DOM; the rank numbers are a CSS counter.
 */
function PriorityList({
  id,
  name,
  order,
  onReorder,
  label,
  wantedByDefault,
}: {
  id: string;
  name: string;
  order: string[];
  onReorder: (order: string[]) => void;
  label: (value: string) => string;
  wantedByDefault: boolean;
}) {
  return (
    <ol class="priority" id={id}>
      {order.map((value, index) => (
        <li class="priority-row" key={value}>
          <span class="priority-rank" />
          <input
            type="checkbox"
            id={`${name}-${slug(value)}`}
            name={name}
            value={value}
            defaultChecked={wantedByDefault}
          />
          <label class="priority-name" for={`${name}-${slug(value)}`}>
            {label(value)}
          </label>
          <button
            type="button"
            class="move"
            data-move="up"
            title="Raise priority"
            disabled={index === 0}
            onClick={() => onReorder(moved(order, index, -1))}
          >
            &uarr;
          </button>
          <button
            type="button"
            class="move"
            data-move="down"
            title="Lower priority"
            disabled={index === order.length - 1}
            onClick={() => onReorder(moved(order, index, 1))}
          >
            &darr;
          </button>
        </li>
      ))}
    </ol>
  );
}

function Results({ result, requested }: { result: SolveResult; requested: Set<string> }) {
  const spare = ALL_ITEMS.filter((item) => result.leftover[item] > 0);
  return (
    <>
      <ul class="summary">
        {COMBOS.filter(
          (combo) => result.comboCounts[combo.name] > 0 || requested.has(combo.name),
        ).map((combo) => (
          <li key={combo.name}>
            {combo.name}: {result.comboCounts[combo.name]}
            {requested.has(combo.name) ? "" : " (not requested)"}
          </li>
        ))}
        <li>Slots filled: {result.filledSlots}</li>
        <li>Slots left empty: {result.emptySlots}</li>
      </ul>

      <table>
        <thead>
          <tr>
            <th>Mini'Oh</th>
            {SLOTS.map((slot) => (
              <th key={slot}>{SLOT_LABELS[slot]}</th>
            ))}
            <th>Combos</th>
          </tr>
        </thead>
        <tbody>
          {result.miniOhs.map((miniOh, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              {SLOTS.map((slot) => (
                <td key={slot} class={miniOh.loadout[slot] ? undefined : "empty"}>
                  {miniOh.loadout[slot] ?? "-"}
                </td>
              ))}
              <td>{miniOh.combos.join(", ") || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Unused equipment</h3>
      <p>
        {spare.length
          ? spare.map((item) => `${item} x${result.leftover[item]}`).join(", ")
          : "None."}
      </p>
    </>
  );
}

export function App() {
  const [comboOrder, setComboOrder] = useState(COMBOS.map((combo) => combo.name));
  const [itemOrder, setItemOrder] = useState(ALL_ITEMS);
  const [outcome, setOutcome] = useState<
    { result: SolveResult; requested: Set<string> } | { error: string } | null
  >(null);

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    // getAll returns values in document order, which is exactly the priority order.
    const comboPriority = data.getAll("combo").map(String);
    try {
      const result = solve({
        workers: Number(data.get("workers")),
        available: Object.fromEntries(
          ALL_ITEMS.map((item) => [item, Number(data.get(`available-${item}`))]),
        ),
        comboPriority,
        itemPriority: data.getAll("item").map(String),
      });
      setOutcome({ result, requested: new Set(comboPriority) });
    } catch (error) {
      setOutcome({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <>
      <h1>Hole is Mine equipment optimiser</h1>

      <form id="request" onSubmit={onSubmit}>
        <div class="columns">
          <div class="column">
            <section class="panel">
              <h2>Mini'Ohs</h2>
              <div class="item-row">
                <input
                  type="number"
                  id="workers"
                  name="workers"
                  min={0}
                  max={MAX_WORKERS}
                  defaultValue="4"
                  required
                />
                <label for="workers">How many Mini'Ohs you have (0 to {MAX_WORKERS})</label>
              </div>
            </section>

            <section class="panel">
              <h2>Equipment unlocked</h2>
              <p class="hint">
                How many copies of each item you own, up to {MAX_COPIES}. Set an item to 0 if you
                have not unlocked it.
              </p>
              <div class="slot-grid">
                {SLOTS.map((slot) => (
                  <div class="slot-column" key={slot}>
                    <h3>{SLOT_LABELS[slot]}</h3>
                    {EQUIPMENT[slot].map((item) => (
                      <div class="item-row" key={item}>
                        <input
                          type="number"
                          id={`available-${slug(item)}`}
                          name={`available-${item}`}
                          min={0}
                          max={MAX_COPIES}
                          defaultValue={String(MAX_COPIES)}
                          required
                        />
                        <label for={`available-${slug(item)}`}>{item}</label>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div class="column">
            <section class="panel">
              <h2>Combo priority</h2>
              <p class="hint">
                Tick the combos worth building and order them. Priority is strict: no number of
                lower combos will displace a higher one. Unticked combos are never built
                deliberately, but may still turn up by accident.
              </p>
              <PriorityList
                id="combo-priority"
                name="combo"
                order={comboOrder}
                onReorder={setComboOrder}
                wantedByDefault
                label={(name) => COMBO_LABELS.get(name) ?? name}
              />
            </section>

            <section class="panel">
              <h2>Gap-filling priority</h2>
              <p class="hint">
                Once the combos are settled, leftover equipment fills the empty slots. Tick and
                order the items you care about; everything else is filled arbitrarily.
              </p>
              <PriorityList
                id="item-priority"
                name="item"
                order={itemOrder}
                onReorder={setItemOrder}
                wantedByDefault={false}
                label={(item) => `${item} (${SLOT_LABELS[slotOf(item)]})`}
              />
            </section>
          </div>
        </div>

        <button type="submit" class="solve">
          Solve
        </button>
      </form>

      <section class="panel results" id="result">
        <h2>Result</h2>
        {outcome === null ? (
          <p class="hint">Press Solve to work out the best loadouts.</p>
        ) : "error" in outcome ? (
          <p class="error">{outcome.error}</p>
        ) : (
          <Results result={outcome.result} requested={outcome.requested} />
        )}
      </section>
    </>
  );
}
