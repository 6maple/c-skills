import { vi } from "vite-plus/test";
import { registerBrainTools } from "../../src/index.ts";
import type { PiToolLike } from "../../src/tools/pi-adapt.ts";

type Handler = (args: Record<string, unknown>, extra?: Record<string, unknown>) => Promise<unknown>;

export function resultText(result: unknown): string {
  return ((result as { content?: Array<{ text?: string }> }).content ?? [])
    .map((item) => item.text ?? "")
    .join("\n");
}

export function resultIsError(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true || /^\s*error:/im.test(resultText(result));
}

export function memoryDoc(options: {
  type?: "decision" | "knowledge" | "intention" | "skill";
  summary?: string;
  importance?: number;
  body?: string;
} = {}): string {
  const type = options.type ?? "knowledge";
  const summary = options.summary ?? "test memory";
  const importance = options.importance ?? 0.5;
  const body = options.body ?? "BODY";
  return `---\ntype: ${type}\nsummary: ${summary}\nimportance: ${importance}\n---\n${body}`;
}

export function createProductionCall(options: {
  askMode?: "none" | "protect";
  piTools?: Partial<Record<"ls" | "grep", PiToolLike>>;
  sessionId?: string;
} = {}) {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool: vi.fn((name: string, _config: unknown, handler: Handler) => {
      handlers.set(name, handler);
    }),
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
      sessionId: options.sessionId ?? "default",
    },
    askMode: options.askMode ?? "none",
    env: {
      BRAIN_PROJECT_ROOT: "C:\\virtual\\project",
      BRAIN_HOME: "C:\\virtual\\global",
    },
    piTools: {
      ls: options.piTools?.ls ?? noopTool,
      grep: options.piTools?.grep ?? noopTool,
    },
  });

  return async (name: string, args: Record<string, unknown> = {}) => {
    const handler = handlers.get(name);
    if (!handler) throw new Error(`missing handler ${name}`);
    return handler(args, {});
  };
}
