// The form is generated from the catalogue now, so it cannot drift from it.
// What still needs proving is that reordering a row survives the re-render and
// actually changes the priority the solver is given.
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { ALL_ITEMS, COMBOS, MAX_COPIES, MAX_WORKERS, SLOT_LABELS, slotOf } from "./data";

afterEach(cleanup);

const setUp = () => {
  const { container } = render(<App />);
  const all = <T extends Element>(selector: string) => [...container.querySelectorAll<T>(selector)];
  return {
    container,
    all,
    form: container.querySelector<HTMLFormElement>("#request")!,
    field: (name: string) => container.querySelector<HTMLInputElement>(`[name="${name}"]`)!,
    rows: (list: string) => all<HTMLLIElement>(`#${list} li`),
    solve: () => fireEvent.submit(container.querySelector<HTMLFormElement>("#request")!),
    text: () => container.textContent ?? "",
  };
};

describe("the equipment inputs", () => {
  it("cover every item once, in catalogue order", () => {
    const { all } = setUp();
    const names = all<HTMLInputElement>("input[name^='available-']").map((input) =>
      input.name.replace("available-", ""),
    );
    expect(names).toEqual(ALL_ITEMS);
  });

  it("default to a full set and cannot ask for more than exist", () => {
    const { all } = setUp();
    for (const input of all<HTMLInputElement>("input[name^='available-']")) {
      expect(input.value).toBe(String(MAX_COPIES));
      expect(input.min).toBe("0");
      expect(input.max).toBe(String(MAX_COPIES));
      expect(input.required).toBe(true);
    }
  });

  it("are each labelled with the item they count", () => {
    const { container, field } = setUp();
    for (const item of ALL_ITEMS) {
      const input = field(`available-${item}`);
      expect(container.querySelector(`label[for="${input.id}"]`)?.textContent).toBe(item);
    }
  });
});

describe("the Mini'Oh input", () => {
  it("is bounded by the number of Mini'Ohs the game allows", () => {
    const { field } = setUp();
    expect(field("workers").min).toBe("0");
    expect(field("workers").max).toBe(String(MAX_WORKERS));
    expect(field("workers").required).toBe(true);
  });

  it("defaults to a full crew", () => {
    const { field } = setUp();
    expect(field("workers").value).toBe(String(MAX_WORKERS));
  });
});

describe("the priority lists", () => {
  it("offer every combo, wanted by default, showing the items each needs", () => {
    const { all, container } = setUp();
    const boxes = all<HTMLInputElement>("#combo-priority input[name=combo]");
    expect(boxes.map((box) => box.value)).toEqual(COMBOS.map((combo) => combo.name));
    for (const box of boxes) expect(box.checked).toBe(true);
    for (const combo of COMBOS) {
      const box = boxes.find((entry) => entry.value === combo.name)!;
      expect(container.querySelector(`label[for="${box.id}"]`)?.textContent).toBe(
        `${combo.name} - ${combo.requires.join(", ")}`,
      );
    }
  });

  it("offer every item, none prioritised, naming the slot each competes for", () => {
    const { all, container } = setUp();
    const boxes = all<HTMLInputElement>("#item-priority input[name=item]");
    expect(boxes.map((box) => box.value)).toEqual(ALL_ITEMS);
    for (const box of boxes) expect(box.checked).toBe(false);
    for (const item of ALL_ITEMS) {
      const box = boxes.find((entry) => entry.value === item)!;
      expect(container.querySelector(`label[for="${box.id}"]`)?.textContent).toBe(
        `${item} (${SLOT_LABELS[slotOf(item)]})`,
      );
    }
  });

  it("cannot raise the top row or lower the bottom one", () => {
    const { rows } = setUp();
    const combos = rows("combo-priority");
    const up = (row: Element) => row.querySelector<HTMLButtonElement>("[data-move=up]")!;
    const down = (row: Element) => row.querySelector<HTMLButtonElement>("[data-move=down]")!;
    expect(up(combos[0]).disabled).toBe(true);
    expect(down(combos[0]).disabled).toBe(false);
    expect(down(combos.at(-1)!).disabled).toBe(true);
  });
});

describe("reordering", () => {
  const value = (row: Element) => row.querySelector<HTMLInputElement>("input")!.value;

  it("moves the row it was asked to move", () => {
    const { rows } = setUp();
    const before = rows("combo-priority").map(value);
    fireEvent.click(rows("combo-priority")[0].querySelector("[data-move=down]")!);
    const after = rows("combo-priority").map(value);
    expect(after).toEqual([before[1], before[0], ...before.slice(2)]);
  });

  it("keeps a row's tick when the row moves", () => {
    const { rows } = setUp();
    const first = rows("item-priority")[0];
    const moving = value(first);
    fireEvent.click(first.querySelector<HTMLInputElement>("input")!);
    expect(rows("item-priority")[0].querySelector<HTMLInputElement>("input")!.checked).toBe(true);

    fireEvent.click(rows("item-priority")[0].querySelector("[data-move=down]")!);

    const row = rows("item-priority")[1];
    expect(value(row)).toBe(moving);
    expect(row.querySelector<HTMLInputElement>("input")!.checked).toBe(true);
  });

  it("keeps the numbers a user typed when a row moves", () => {
    const { rows, field, solve, text } = setUp();
    field("available-Holy Hole").value = "1";
    fireEvent.click(rows("combo-priority")[0].querySelector("[data-move=down]")!);
    solve();
    expect(text()).toContain("Slots left empty");
    expect(field("available-Holy Hole").value).toBe("1");
  });
});

describe("the solve", () => {
  /** Festive Dragon and Whole Demon both need Holy Hole, so one Hole means one combo. */
  const contend = (raise: string) => {
    const app = setUp();
    for (const box of app.all<HTMLInputElement>("#combo-priority input[name=combo]")) {
      box.checked = box.value === "Festive Dragon" || box.value === "Whole Demon";
    }
    app.field("available-Holy Hole").value = "1";
    if (raise) {
      const row = app
        .rows("combo-priority")
        .find((entry) => entry.querySelector("input")!.value === raise)!;
      fireEvent.click(row.querySelector("[data-move=up]")!);
    }
    app.solve();
    return app.text();
  };

  it("follows the listed order when two combos want the same item", () => {
    expect(contend("")).toContain("Festive Dragon: 1");
    expect(contend("")).toContain("Whole Demon: 0");
  });

  it("changes its mind when the lower combo is raised above the higher one", () => {
    const text = contend("Whole Demon");
    expect(text).toContain("Whole Demon: 1");
    expect(text).toContain("Festive Dragon: 0");
  });

  it("reports a combo that turned up without being asked for", () => {
    const { all, solve, text } = setUp();
    for (const box of all<HTMLInputElement>("#combo-priority input[name=combo]")) {
      box.checked = false;
    }
    solve();
    expect(text()).toContain("Slots left empty: 0");
  });

  it("refuses a request for more Mini'Ohs than the game allows", () => {
    const { field, solve, text } = setUp();
    field("workers").value = String(MAX_WORKERS + 1);
    solve();
    expect(text()).toContain(`must be between 0 and ${MAX_WORKERS}`);
  });
});
