import { describe, it, expect } from "vitest";
import { topologicalSort, resolveInputs, extractStringUrl, type AppNode, type AppEdge } from "./workflowExecution";

function node(id: string, type = "text"): AppNode {
  return { id, type, position: { x: 0, y: 0 }, data: {} };
}

describe("topologicalSort", () => {
  it("puts independent nodes in the first layer", () => {
    const nodes = [node("a"), node("b")];
    const layers = topologicalSort(nodes, []);
    expect(layers).toEqual([[node("a"), node("b")]]);
  });

  it("orders a linear chain into successive layers", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges: AppEdge[] = [
      { id: "e1", source: "a", sourceHandle: "output", target: "b", targetHandle: "in" },
      { id: "e2", source: "b", sourceHandle: "output", target: "c", targetHandle: "in" },
    ];
    const layers = topologicalSort(nodes, edges);
    expect(layers.map(l => l.map(n => n.id))).toEqual([["a"], ["b"], ["c"]]);
  });

  it("groups a diamond's parallel branches into the same layer", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")];
    const edges: AppEdge[] = [
      { id: "e1", source: "a", sourceHandle: "output", target: "b", targetHandle: "in" },
      { id: "e2", source: "a", sourceHandle: "output", target: "c", targetHandle: "in" },
      { id: "e3", source: "b", sourceHandle: "output", target: "d", targetHandle: "in" },
      { id: "e4", source: "c", sourceHandle: "output", target: "d", targetHandle: "in" },
    ];
    const layers = topologicalSort(nodes, edges);
    expect(layers.map(l => l.map(n => n.id).sort())).toEqual([["a"], ["b", "c"], ["d"]]);
  });

  it("drops cyclic nodes from every layer instead of hanging or duplicating them", () => {
    // a -> b -> a is a cycle; c is independent and acyclic
    const nodes = [node("a"), node("b"), node("c")];
    const edges: AppEdge[] = [
      { id: "e1", source: "a", sourceHandle: "output", target: "b", targetHandle: "in" },
      { id: "e2", source: "b", sourceHandle: "output", target: "a", targetHandle: "in" },
    ];
    const layers = topologicalSort(nodes, edges);
    const executed = layers.flat().map(n => n.id);
    expect(executed).toEqual(["c"]);
  });
});

describe("resolveInputs", () => {
  it("merges the node's own data with resolved upstream output", () => {
    const target = node("llm");
    target.data = { model: "llama-3.1-8b-instant" };
    const edges: AppEdge[] = [{ id: "e1", source: "text", sourceHandle: "output", target: "llm", targetHandle: "user_message" }];
    const outputs = new Map([["text", { output: "hello" }]]);
    const resolved = resolveInputs(target, edges, outputs);
    expect(resolved.model).toBe("llama-3.1-8b-instant");
    expect(resolved.user_message).toBe("hello");
  });

  it("flattens an object output to a string for URL-carrying handles", () => {
    const target = node("crop-image");
    const edges: AppEdge[] = [{ id: "e1", source: "upload", sourceHandle: "output", target: "crop-image", targetHandle: "imageUrl" }];
    const outputs = new Map([["upload", { output: "https://cdn.example.com/img.jpg", imageUrl: "https://cdn.example.com/img.jpg" }]]);
    const resolved = resolveInputs(target, edges, outputs);
    expect(resolved.imageUrl).toBe("https://cdn.example.com/img.jpg");
  });

  it("appends to the images array rather than overwriting it for multiple image edges", () => {
    const target = node("llm");
    const edges: AppEdge[] = [
      { id: "e1", source: "img1", sourceHandle: "output", target: "llm", targetHandle: "images" },
      { id: "e2", source: "img2", sourceHandle: "output", target: "llm", targetHandle: "images" },
    ];
    const outputs = new Map([
      ["img1", { output: "https://cdn.example.com/1.jpg" }],
      ["img2", { output: "https://cdn.example.com/2.jpg" }],
    ]);
    const resolved = resolveInputs(target, edges, outputs);
    expect(resolved.images).toEqual(["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"]);
  });

  it("reports a warning instead of throwing when an image input can't be resolved", () => {
    const target = node("llm");
    const edges: AppEdge[] = [{ id: "e1", source: "text", sourceHandle: "output", target: "llm", targetHandle: "images" }];
    const outputs = new Map([["text", { output: 12345 }]]); // not a string, not an object with a known field
    const warnings: string[] = [];
    const resolved = resolveInputs(target, edges, outputs, w => warnings.push(w.message));
    expect(resolved.images).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("leaves the node's data untouched when no edges target it", () => {
    const target = node("text");
    target.data = { text: "static value" };
    const resolved = resolveInputs(target, [], new Map());
    expect(resolved).toEqual({ text: "static value" });
  });
});

describe("extractStringUrl", () => {
  it("passes through a plain string", () => {
    expect(extractStringUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
  });

  it("prefers imageUrl over other object fields", () => {
    expect(extractStringUrl({ imageUrl: "a", videoUrl: "b", output: "c" })).toBe("a");
  });

  it("returns an empty string for values with no recognizable field", () => {
    expect(extractStringUrl({ foo: "bar" })).toBe("");
    expect(extractStringUrl(42)).toBe("");
    expect(extractStringUrl(null)).toBe("");
  });
});
