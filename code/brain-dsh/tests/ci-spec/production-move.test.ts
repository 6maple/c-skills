import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", async () => (await import("./fake-node-fs.ts")).fakeFsSync);
vi.mock("node:fs/promises", async () => (await import("./fake-node-fs.ts")).fakeFsPromises);

import { fakeNodeFs } from "./fake-node-fs.ts";
import { createProductionCall, memoryDoc, resultIsError, resultText } from "./production-test-utils.ts";

type PublicCall = ReturnType<typeof createProductionCall>;

async function adoptsUntilPromotion(call: PublicCall, path: string, sessionId: string): Promise<void> {
  for (let count = 0; count < 100; count += 1) {
    const adopt = await call("brain_edit", { path, edits: [], feedback: "adopt" });
    expect(resultIsError(adopt)).toBe(false);
    const think = await call("brain_think", { session_id: sessionId });
    expect(resultIsError(think)).toBe(false);
    if (resultText(think).includes(`promotion-candidate: ${path}`)) return;
  }
  throw new Error("promotion signal did not appear within the test safety guard");
}

describe("brain-dsh production CI: move semantics", () => {
  beforeEach(() => fakeNodeFs.reset());

  test("CI-03 / A10 requires an explicit destination file path", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/source.md",
      content: memoryDoc({ summary: "source memory", body: "SOURCE-BODY" }),
    }))).toBe(false);

    const move = await call("brain_mv", {
      src: "@/memories/knowledge/source.md",
      dst: "@/memories/skill",
    });
    expect(resultIsError(move)).toBe(true);

    const source = await call("brain_cat", {
      path: "@/memories/knowledge/source.md",
      offset: 1,
      limit: 100,
    });
    expect(resultIsError(source)).toBe(false);
    expect(resultText(source)).toContain("SOURCE-BODY");
  });

  test("CI-14 core without archival metadata cannot move to archival", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_edit", {
      path: "@core/project.md",
      content: "CORE WITHOUT ARCHIVAL METADATA",
    }))).toBe(false);

    const move = await call("brain_mv", {
      src: "@core/project.md",
      dst: "@/memories/knowledge/out.md",
    });
    expect(resultIsError(move)).toBe(true);

    expect(resultText(await call("brain_cat", { path: "@core/project.md" }))).toBe("CORE WITHOUT ARCHIVAL METADATA");
    expect(resultIsError(await call("brain_cat", { path: "@/memories/knowledge/out.md" }))).toBe(true);
  });

  test("CI-14 archival -> core replaces core and removes source from active archival", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/source.md",
      content: memoryDoc({ summary: "source", body: "SOURCE-BODY" }),
    }))).toBe(false);
    expect(resultIsError(await call("brain_edit", { path: "@core/project.md", content: "OLD-CORE" }))).toBe(false);

    expect(resultIsError(await call("brain_mv", {
      src: "@/memories/knowledge/source.md",
      dst: "@core/project.md",
    }))).toBe(false);

    const core = await call("brain_cat", { path: "@core/project.md" });
    expect(resultText(core)).toContain("SOURCE-BODY");
    expect(resultText(core)).not.toContain("OLD-CORE");
    expect(resultIsError(await call("brain_cat", { path: "@/memories/knowledge/source.md" }))).toBe(true);
  });

  test("CI-14 semantic core -> archival clears core and creates readable destination", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_edit", {
      path: "@core/project.md",
      content: memoryDoc({ summary: "resident source", body: "RESIDENT-BODY" }),
    }))).toBe(false);

    expect(resultIsError(await call("brain_mv", {
      src: "@core/project.md",
      dst: "@/memories/knowledge/from-core.md",
    }))).toBe(false);

    expect(resultText(await call("brain_cat", { path: "@core/project.md" }))).toBe("(empty)");
    const destination = await call("brain_cat", {
      path: "@/memories/knowledge/from-core.md",
      offset: 1,
      limit: 100,
    });
    expect(resultIsError(destination)).toBe(false);
    expect(resultText(destination)).toContain("RESIDENT-BODY");
  });

  test("CI-14 core -> core replaces destination and clears source", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_edit", { path: "@core/project.md", content: "SOURCE-CORE" }))).toBe(false);
    expect(resultIsError(await call("brain_edit", { path: "@core/global.md", content: "DESTINATION-CORE" }))).toBe(false);

    expect(resultIsError(await call("brain_mv", {
      src: "@core/project.md",
      dst: "@core/global.md",
    }))).toBe(false);

    expect(resultText(await call("brain_cat", { path: "@core/project.md" }))).toBe("(empty)");
    expect(resultText(await call("brain_cat", { path: "@core/global.md" }))).toBe("SOURCE-CORE");
  });

  test.each([
    ["same-layer", "@/memories/knowledge/source.md", "@/memories/knowledge/destination.md"],
    ["cross-layer", "@/sessions/s1/memories/knowledge/source.md", "@/memories/knowledge/destination.md"],
  ])("CI-15 fresh archival move preserves content: %s", async (_label, src, dst) => {
    const call = createProductionCall({ sessionId: "s1" });
    expect(resultIsError(await call("brain_write", {
      path: src,
      content: memoryDoc({ summary: "fresh move", body: "MOVE-BODY" }),
    }))).toBe(false);

    expect(resultIsError(await call("brain_mv", { src, dst }))).toBe(false);
    expect(resultIsError(await call("brain_cat", { path: src }))).toBe(true);
    const destination = await call("brain_cat", { path: dst, offset: 1, limit: 100 });
    expect(resultIsError(destination)).toBe(false);
    expect(resultText(destination)).toContain("MOVE-BODY");
  });

  test("CI-15 replace destination leaves one active destination with source learning semantics", async () => {
    const call = createProductionCall();
    const src = "@/memories/knowledge/source.md";
    const dst = "@/memories/knowledge/destination.md";

    expect(resultIsError(await call("brain_write", {
      path: src,
      content: memoryDoc({ importance: 0.5, summary: "source semantics", body: "SOURCE-BODY" }),
    }))).toBe(false);
    expect(resultIsError(await call("brain_write", {
      path: dst,
      content: memoryDoc({ importance: 0.4, summary: "old destination", body: "OLD-BODY" }),
    }))).toBe(false);
    expect(resultIsError(await call("brain_edit", {
      path: src,
      edits: [{ oldText: "importance: 0.5", newText: "importance: 0.4" }],
      feedback: "correct",
    }))).toBe(false);

    expect(resultIsError(await call("brain_mv", { src, dst }))).toBe(false);
    expect(resultIsError(await call("brain_cat", { path: src }))).toBe(true);

    const destination = await call("brain_cat", { path: dst, offset: 1, limit: 100 });
    expect(resultText(destination)).toContain("SOURCE-BODY");
    expect(resultText(destination)).not.toContain("OLD-BODY");

    const think = await call("brain_think", {});
    const output = resultText(think);
    const destinationLines = output.split("\n").filter((line) => line.includes(dst));
    expect(destinationLines).toHaveLength(1);
    expect(destinationLines[0]?.toLowerCase()).toContain("questioned");
  });

  test("CI-15 session -> project -> session round-trip preserves achieved promotion condition", async () => {
    const call = createProductionCall({ sessionId: "s1" });
    const original = "@/sessions/s1/memories/knowledge/x.md";
    const project = "@/memories/knowledge/x.md";
    const returned = "@/sessions/s1/memories/knowledge/y.md";

    expect(resultIsError(await call("brain_write", {
      path: original,
      content: memoryDoc({ summary: "round trip", body: "ROUND-TRIP" }),
    }))).toBe(false);
    await adoptsUntilPromotion(call, original, "s1");

    expect(resultIsError(await call("brain_mv", { src: original, dst: project }))).toBe(false);
    expect(resultIsError(await call("brain_mv", { src: project, dst: returned }))).toBe(false);

    const think = await call("brain_think", { session_id: "s1" });
    expect(resultIsError(think)).toBe(false);
    expect(resultText(think)).toContain(`promotion-candidate: ${returned}`);

    const read = await call("brain_cat", { path: returned, offset: 1, limit: 100 });
    expect(resultText(read)).toContain("ROUND-TRIP");
  });
});
