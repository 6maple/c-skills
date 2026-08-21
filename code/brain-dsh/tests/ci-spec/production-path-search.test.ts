import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", () => ({
  existsSync: () => false,
  realpathSync: { native: (path: string) => path },
}));

vi.mock("node:fs/promises", () => {
  const unexpected = async () => {
    throw new Error("unexpected filesystem access in path/search CI test");
  };
  return {
    mkdir: vi.fn(unexpected),
    readFile: vi.fn(unexpected),
    readdir: vi.fn(unexpected),
    rename: vi.fn(unexpected),
    rm: vi.fn(unexpected),
    writeFile: vi.fn(unexpected),
  };
});

import { registerBrainTools } from "../../src/index.ts";
import type { PiToolLike } from "../../src/tools/pi-adapt.ts";

type Handler = (args: Record<string, unknown>, extra?: Record<string, unknown>) => Promise<unknown>;

function resultText(result: unknown): string {
  return ((result as { content?: Array<{ text?: string }> }).content ?? [])
    .map((item) => item.text ?? "")
    .join("\n");
}

function isError(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true || /^\s*error:/im.test(resultText(result));
}

function createHandlers() {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool: vi.fn((name: string, _config: unknown, handler: Handler) => {
      handlers.set(name, handler);
    }),
  };

  const grepExecute = vi.fn(async (_id: string, args: Record<string, unknown>) => {
    const physical = String(args.path);
    const name = args.literal ? "literal.md" : "regex.md";
    return { content: [{ type: "text", text: `${physical}\\knowledge\\${name}:1: matched` }] };
  });
  const lsExecute = vi.fn(async (_id: string, _args: Record<string, unknown>) => ({
    content: [{ type: "text", text: "decision/\nintention/\nknowledge/\nskill/" }],
  }));

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
    piTools: {
      grep: { name: "grep", description: "fake grep resource", execute: grepExecute } as PiToolLike,
      ls: { name: "ls", description: "fake ls resource", execute: lsExecute } as PiToolLike,
    },
  });

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const handler = handlers.get(name);
    if (!handler) throw new Error(`missing handler ${name}`);
    return handler(args, {});
  };

  return { call, grepExecute, lsExecute };
}

describe("brain-dsh production CI: path / discovery / search", () => {
  beforeEach(() => vi.clearAllMocks());

  test.each([
    ["brain_cat", { path: "C:\\outside\\x.md" }],
    ["brain_cat", { path: "memories/knowledge/x.md" }],
    ["brain_cat", { path: "@/__private__/mechanism" }],
    ["brain_think", { session_id: ".." }],
    ["brain_think", { session_id: "a/b" }],
    ["brain_write", { path: "@/memories/knowledge", content: "---\ntype: knowledge\nsummary: valid\nimportance: 0.5\n---\nBODY" }],
    ["brain_write", { path: "@/memories/knowledge/x.txt", content: "---\ntype: knowledge\nsummary: valid\nimportance: 0.5\n---\nBODY" }],
    ["brain_mv", { src: "@/memories/knowledge", dst: "@/memories/knowledge/x.md" }],
  ])("CI-03 rejects invalid public addressing for %s", async (name, args) => {
    const { call } = createHandlers();
    const result = await call(name, args);
    expect(isError(result)).toBe(true);
    expect(resultText(result)).not.toContain("C:\\virtual\\project");
    expect(resultText(result)).not.toContain("C:\\virtual\\global");
  });

  test("CI-05 brain_ls delegates only the resolved public memory directory", async () => {
    const { call, lsExecute } = createHandlers();
    const result = await call("brain_ls", { path: "@/memories" });

    expect(isError(result)).toBe(false);
    expect(resultText(result)).toContain("knowledge/");
    expect(lsExecute).toHaveBeenCalledTimes(1);
    const forwarded = lsExecute.mock.calls[0]![1];
    expect(String(forwarded.path)).toMatch(/[\\/]\.brain-data[\\/]memories$/);
  });

  test("CI-05 literal and regex grep preserve public semantics while hiding physical paths", async () => {
    const { call, grepExecute } = createHandlers();

    const literal = await call("brain_grep", {
      pattern: "auth-token-42",
      path: "@/memories",
      literal: true,
    });
    expect(isError(literal)).toBe(false);
    expect(resultText(literal)).toContain("@/memories/knowledge/literal.md");
    expect(resultText(literal)).not.toContain("C:\\virtual\\project");
    expect(grepExecute.mock.calls[0]![1].literal).toBe(true);

    const regex = await call("brain_grep", {
      pattern: "^task-[0-9]+$",
      path: "@/memories",
      literal: false,
    });
    expect(isError(regex)).toBe(false);
    expect(resultText(regex)).toContain("@/memories/knowledge/regex.md");
    expect(grepExecute.mock.calls[1]![1].literal).toBe(false);
  });
});
