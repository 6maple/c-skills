import { describe, expect, test, vi } from "vite-plus/test";
import { registerBrainTools } from "../../src/index.ts";

describe("brain-dsh production CI: public contract", () => {
  test("CI-01 registers exactly the public brain_* tool surface", () => {
    const registered = new Map<string, { config: Record<string, unknown>; handler: unknown }>();
    const server = {
      registerTool: vi.fn((name: string, config: Record<string, unknown>, handler: unknown) => {
        registered.set(name, { config, handler });
      }),
    };

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
    });

    expect([...registered.keys()].sort()).toEqual([
      "brain_cat",
      "brain_edit",
      "brain_grep",
      "brain_ls",
      "brain_mv",
      "brain_rm",
      "brain_think",
      "brain_write",
    ]);

    const thinkSchema = registered.get("brain_think")?.config.inputSchema as {
      shape?: Record<string, unknown>;
    };
    expect(Object.keys(thinkSchema.shape ?? {})).toEqual(["session_id"]);
    expect(typeof registered.get("brain_think")?.config.description).toBe("string");

    for (const name of ["brain_write", "brain_edit", "brain_rm", "brain_mv"]) {
      const schema = registered.get(name)?.config.inputSchema as { shape?: Record<string, unknown> };
      expect(Object.keys(schema.shape ?? {})).toContain("confirmed");
    }
  });
});