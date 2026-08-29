import { describe, expect, it } from "vitest";
import { reconcileSelectedVisitor } from "./selection-helpers";

type Visitor = { id?: string; name: string };

describe("reconcileSelectedVisitor", () => {
  it("clears the selected visitor when it is missing from the latest snapshot", () => {
    const previous: Visitor = { id: "deleted", name: "Old visitor" };

    expect(reconcileSelectedVisitor(previous, [])).toBeNull();
  });

  it("uses the refreshed record when the selected visitor still exists", () => {
    const previous: Visitor = { id: "visitor-1", name: "Old name" };
    const refreshed: Visitor = { id: "visitor-1", name: "Updated name" };

    expect(reconcileSelectedVisitor(previous, [refreshed])).toEqual(refreshed);
  });

  it("selects the first visitor when there was no previous selection", () => {
    const first: Visitor = { id: "visitor-1", name: "First visitor" };

    expect(reconcileSelectedVisitor(null, [first])).toEqual(first);
  });
});
