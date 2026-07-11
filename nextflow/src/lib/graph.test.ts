import { describe, it, expect } from "vitest";
import { wouldCreateCycle, findCyclicNodeIds, downstreamNodeIds } from "./graph";

describe("wouldCreateCycle", () => {
  it("allows the first edge in an empty graph", () => {
    expect(wouldCreateCycle([], "a", "b")).toBe(false);
  });

  it("rejects a direct self-loop", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("rejects an edge that would close a 2-node loop", () => {
    const edges = [{ source: "a", target: "b" }];
    expect(wouldCreateCycle(edges, "b", "a")).toBe(true);
  });

  it("rejects an edge that would close a longer loop (a->b->c, proposed c->a)", () => {
    const edges = [{ source: "a", target: "b" }, { source: "b", target: "c" }];
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("allows a fan-in edge that doesn't close a loop", () => {
    const edges = [{ source: "a", target: "b" }, { source: "c", target: "b" }];
    expect(wouldCreateCycle(edges, "d", "b")).toBe(false);
  });
});

describe("findCyclicNodeIds", () => {
  it("returns an empty set for an acyclic graph", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ source: "a", target: "b" }, { source: "b", target: "c" }];
    expect(findCyclicNodeIds(nodes, edges)).toEqual(new Set());
  });

  it("flags every node in a simple cycle", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ source: "a", target: "b" }, { source: "b", target: "c" }, { source: "c", target: "a" }];
    expect(findCyclicNodeIds(nodes, edges)).toEqual(new Set(["a", "b", "c"]));
  });

  it("only flags the cyclic subset, leaving acyclic nodes eligible to run", () => {
    // d -> a <-> b (cycle), c is independent and acyclic
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [
      { source: "d", target: "a" },
      { source: "a", target: "b" },
      { source: "b", target: "a" },
    ];
    expect(findCyclicNodeIds(nodes, edges)).toEqual(new Set(["a", "b"]));
  });

  it("does not flag a diamond dependency (a->b, a->c, b->d, c->d) as cyclic", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [
      { source: "a", target: "b" }, { source: "a", target: "c" },
      { source: "b", target: "d" }, { source: "c", target: "d" },
    ];
    expect(findCyclicNodeIds(nodes, edges)).toEqual(new Set());
  });
});

describe("downstreamNodeIds", () => {
  it("finds all transitive downstream nodes", () => {
    const edges = [{ source: "a", target: "b" }, { source: "b", target: "c" }, { source: "a", target: "d" }];
    expect(downstreamNodeIds(edges, "a")).toEqual(new Set(["b", "c", "d"]));
  });

  it("returns an empty set for a leaf node", () => {
    const edges = [{ source: "a", target: "b" }];
    expect(downstreamNodeIds(edges, "b")).toEqual(new Set());
  });
});
