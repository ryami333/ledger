import { paginateItems } from "./paginateItems.ts";
import { describe, expect, it } from "vitest";

const items = ["a", "b", "c", "d", "e"];

describe("paginateItems", () => {
  it("gives the items of a page", () => {
    expect(paginateItems({ items, page: 1, pageSize: 2 })).toEqual({
      pageItems: ["a", "b"],
      page: 1,
      pageCount: 3,
    });
    expect(paginateItems({ items, page: 3, pageSize: 2 })).toEqual({
      pageItems: ["e"],
      page: 3,
      pageCount: 3,
    });
  });

  it("keeps the page in the range", () => {
    expect(paginateItems({ items, page: 9, pageSize: 2 }).page).toBe(3);
    expect(paginateItems({ items, page: 0, pageSize: 2 }).page).toBe(1);
  });

  it("gives one empty page for an empty list", () => {
    expect(paginateItems({ items: [], page: 2, pageSize: 50 })).toEqual({
      pageItems: [],
      page: 1,
      pageCount: 1,
    });
  });
});
