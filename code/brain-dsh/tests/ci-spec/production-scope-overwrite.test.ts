import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", async () => (await import("./fake-node-fs.ts")).fakeFsSync);
vi.mock("node:fs/promises", async () => (await import("./fake-node-fs.ts")).fakeFsPromises);

import type { PiToolLike } from "../../src/tools/pi-adapt.ts";
import { fakeNodeFs } from "./fake-node-fs.ts";
import { createProductionCall, memoryDoc, resultIsError, resultText } from "./production-test-utils.ts";

function listingTool(): PiToolLike {
  return {
    name: "ls",
    description: "fake listing resource",
    async execute(_id, args) {
      const physical = String(args.path).replace(/\\/g, "/");
      if (physical.includes("/sessions/s1/")) {
        return { content: [{ type: "text", text: `${physical}/knowledge/session.md` }] };
      }
      if (physical.startsWith("C:/virtual/global")) {
        return { content: [{ type: "text", text: `${physical}/knowledge/global.md` }] };
      }
      return { content: [{ type: "text", text: `${physical}/knowledge/project.md` }] };
    },
  } as PiToolLike;
}

describe("brain-dsh production CI: scope / anchor / overwrite continuity", () => {
  beforeEach(() => fakeNodeFs.reset());

  test("CI-02 think returns global -> project -> session core and direct global scope is allowed", async () => {
    const call = createProductionCall({
      sessionId: "s1",
      piTools: { ls: listingTool() },
    });

    expect(resultIsError(await call("brain_edit", { path: "@core/global.md", content: "GLOBAL-CORE" }))).toBe(false);
    expect(resultIsError(await call("brain_edit", { path: "@core/project.md", content: "PROJECT-CORE" }))).toBe(false);
    expect(resultIsError(await call("brain_edit", { path: "@core/sessions/s1.md", content: "SESSION-CORE" }))).toBe(false);

    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/project.md",
      content: memoryDoc({ summary: "project summary", body: "PROJECT-BODY-ONLY" }),
    }))).toBe(false);
    expect(resultIsError(await call("brain_write", {
      path: "@/sessions/s1/memories/knowledge/session.md",
      content: memoryDoc({ summary: "session summary", body: "SESSION-BODY-ONLY" }),
    }))).toBe(false);

    const think = await call("brain_think", { session_id: "s1" });
    expect(resultIsError(think)).toBe(false);
    const output = resultText(think);
    const globalAt = output.indexOf("GLOBAL-CORE");
    const projectAt = output.indexOf("PROJECT-CORE");
    const sessionAt = output.indexOf("SESSION-CORE");
    expect(globalAt).toBeGreaterThanOrEqual(0);
    expect(projectAt).toBeGreaterThan(globalAt);
    expect(sessionAt).toBeGreaterThan(projectAt);
    expect(output).toContain("project summary");
    expect(output).toContain("session summary");
    expect(output).not.toContain("PROJECT-BODY-ONLY");
    expect(output).not.toContain("SESSION-BODY-ONLY");

    const globalWrite = await call("brain_write", {
      path: "@global/memories/knowledge/global.md",
      content: memoryDoc({ summary: "global summary", body: "GLOBAL-BODY" }),
    });
    expect(resultIsError(globalWrite)).toBe(false);

    const globalLs = await call("brain_ls", { path: "@global/memories" });
    const projectLs = await call("brain_ls", { path: "@/memories" });
    const sessionLs = await call("brain_ls", { path: "@/sessions/s1/memories" });
    expect(resultText(globalLs)).toContain("@global/memories/knowledge/global.md");
    expect(resultText(projectLs)).toContain("@/memories/knowledge/project.md");
    expect(resultText(sessionLs)).toContain("@/sessions/s1/memories/knowledge/session.md");
    expect(resultText(globalLs) + resultText(projectLs) + resultText(sessionLs)).not.toContain("C:/virtual/");
  });

  test("CI-08 whole-document overwrite preserves observable questioned history", async () => {
    const call = createProductionCall();
    const path = "@/memories/knowledge/x.md";

    expect(resultIsError(await call("brain_write", {
      path,
      content: memoryDoc({ importance: 0.5, summary: "old summary", body: "OLD-BODY" }),
    }))).toBe(false);
    expect(resultIsError(await call("brain_edit", {
      path,
      edits: [{ oldText: "importance: 0.5", newText: "importance: 0.4" }],
      feedback: "correct",
    }))).toBe(false);

    const before = await call("brain_think", {});
    expect(resultText(before)).toContain("questioned");

    const overwrite = await call("brain_write", {
      path,
      content: memoryDoc({ importance: 0.8, summary: "new summary", body: "NEW-BODY" }),
    });
    expect(resultIsError(overwrite)).toBe(false);

    const body = await call("brain_cat", { path, offset: 1, limit: 100 });
    expect(resultText(body)).toContain("NEW-BODY");
    expect(resultText(body)).not.toContain("OLD-BODY");

    const after = await call("brain_think", {});
    const line = resultText(after).split("\n").find((candidate) => candidate.includes(path));
    expect(line).toContain("new summary");
    expect(line?.toLowerCase()).toContain("questioned");
  });
});
