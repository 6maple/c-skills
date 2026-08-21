import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", async () => (await import("./fake-node-fs.ts")).fakeFsSync);
vi.mock("node:fs/promises", async () => (await import("./fake-node-fs.ts")).fakeFsPromises);

import { registerBrainTools } from "../../src/index.ts";
import type { PiToolLike } from "../../src/tools/pi-adapt.ts";
import { fakeNodeFs } from "./fake-node-fs.ts";

type Handler = (args: Record<string, unknown>, extra?: Record<string, unknown>) => Promise<unknown>;

function text(result: unknown): string {
  return ((result as { content?: Array<{ text?: string }> }).content ?? []).map((x) => x.text ?? "").join("\n");
}

function isError(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true || /^\s*error:/im.test(text(result));
}

function memoryDoc(importance = 0.5, body = "BODY"): string {
  return `---\ntype: knowledge\nsummary: test memory\nimportance: ${importance}\n---\n${body}`;
}

function createHandlers() {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool: vi.fn((name: string, _config: unknown, handler: Handler) => handlers.set(name, handler)),
  };
  const noopTool = {
    name: "noop",
    description: "test resource",
    execute: vi.fn(async () => ({ content: [{ type: "text", text: "" }] })),
  } as unknown as PiToolLike;

  registerBrainTools(server as never, {
    roots: {
      projectRoot: "C:\\virtual\\project",
      globalRoot: "C:\\virtual\\global",
      sessionId: "default",
    },
    askMode: "none",
    env: {
      BRAIN_PROJECT_ROOT: "C:\\virtual\\project",
      BRAIN_HOME: "C:\\virtual\\global",
    },
    piTools: { ls: noopTool, grep: noopTool },
  });

  return async (name: string, args: Record<string, unknown> = {}) => {
    const handler = handlers.get(name);
    if (!handler) throw new Error(`missing handler ${name}`);
    return handler(args, {});
  };
}

describe("brain-dsh production CI: write / edit / feedback", () => {
  beforeEach(() => fakeNodeFs.reset());

  test("CI-11 feedback-only adopt accepts edits=[] and preserves document content", async () => {
    const call = createHandlers();

    const write = await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc(),
    });
    expect(isError(write)).toBe(false);

    const adopt = await call("brain_edit", {
      path: "@/memories/knowledge/x.md",
      edits: [],
      feedback: "adopt",
    });
    expect(isError(adopt)).toBe(false);

    const read = await call("brain_cat", {
      path: "@/memories/knowledge/x.md",
      offset: 1,
      limit: 100,
    });
    expect(isError(read)).toBe(false);
    expect(text(read)).toContain("BODY");
  });

  test("CI-11 feedback-only attribute accepts edits=[] and keeps item out of questioned", async () => {
    const call = createHandlers();

    expect(isError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc(),
    }))).toBe(false);

    const attribute = await call("brain_edit", {
      path: "@/memories/knowledge/x.md",
      edits: [],
      feedback: "attribute",
    });
    expect(isError(attribute)).toBe(false);

    const think = await call("brain_think", {});
    expect(isError(think)).toBe(false);
    expect(text(think)).toContain("@/memories/knowledge/x.md");
    expect(text(think)).not.toContain("status=questioned");
  });

  test("CI-11 zero-delta correct rejects and leaves item active", async () => {
    const call = createHandlers();

    expect(isError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc(),
    }))).toBe(false);

    const correct = await call("brain_edit", {
      path: "@/memories/knowledge/x.md",
      edits: [],
      feedback: "correct",
    });
    expect(isError(correct)).toBe(true);

    const think = await call("brain_think", {});
    expect(isError(think)).toBe(false);
    expect(text(think)).toContain("@/memories/knowledge/x.md");
    expect(text(think)).not.toContain("status=questioned");
  });
});
