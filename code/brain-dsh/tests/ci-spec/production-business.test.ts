import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", async () => (await import("./fake-node-fs.ts")).fakeFsSync);
vi.mock("node:fs/promises", async () => (await import("./fake-node-fs.ts")).fakeFsPromises);

import { fakeNodeFs } from "./fake-node-fs.ts";
import { createProductionCall, memoryDoc, resultIsError, resultText } from "./production-test-utils.ts";

describe("brain-dsh production CI: core write/edit/approval behavior", () => {
  beforeEach(() => fakeNodeFs.reset());

  test.each([
    [0, "BODY"],
    [1, "BODY"],
    [0.5, ""],
  ])("CI-07 accepts legal write boundary importance=%s", async (importance, body) => {
    const call = createProductionCall();
    const write = await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc({ importance, body }),
    });
    expect(resultIsError(write)).toBe(false);

    const l1 = await call("brain_cat", { path: "@/memories/knowledge/x.md" });
    expect(resultIsError(l1)).toBe(false);
    expect(resultText(l1)).toContain(`importance: ${importance}`);
  });

  test.each([
    ["missing-type", "---\nsummary: s\nimportance: 0.5\n---\nBODY"],
    ["bad-type", "---\ntype: other\nsummary: s\nimportance: 0.5\n---\nBODY"],
    ["empty-summary", "---\ntype: knowledge\nsummary: \nimportance: 0.5\n---\nBODY"],
    ["low-importance", "---\ntype: knowledge\nsummary: s\nimportance: -0.1\n---\nBODY"],
    ["high-importance", "---\ntype: knowledge\nsummary: s\nimportance: 1.1\n---\nBODY"],
    ["path-type-mismatch", "---\ntype: skill\nsummary: s\nimportance: 0.5\n---\nBODY"],
  ])("CI-09 invalid create is atomic: %s", async (_label, content) => {
    const call = createProductionCall();
    const write = await call("brain_write", { path: "@/memories/knowledge/x.md", content });
    expect(resultIsError(write)).toBe(true);

    const read = await call("brain_cat", { path: "@/memories/knowledge/x.md" });
    expect(resultIsError(read)).toBe(true);
  });

  test("CI-09 invalid overwrite preserves the old document", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc({ body: "OLD" }),
    }))).toBe(false);

    const overwrite = await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc({ type: "skill", body: "NEW" }),
    });
    expect(resultIsError(overwrite)).toBe(true);

    const read = await call("brain_cat", { path: "@/memories/knowledge/x.md", offset: 1, limit: 100 });
    expect(resultIsError(read)).toBe(false);
    expect(resultText(read)).toContain("OLD");
    expect(resultText(read)).not.toContain("NEW");
  });

  test("CI-10 legal targeted edit changes only the requested fragment", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc({ body: "A\nB\nC" }),
    }))).toBe(false);

    const edit = await call("brain_edit", {
      path: "@/memories/knowledge/x.md",
      edits: [{ oldText: "B", newText: "B-NEW" }],
    });
    expect(resultIsError(edit)).toBe(false);

    const read = await call("brain_cat", { path: "@/memories/knowledge/x.md", offset: 1, limit: 100 });
    const output = resultText(read);
    expect(output).toContain("A");
    expect(output).toContain("B-NEW");
    expect(output).toContain("C");
  });

  test("CI-10 invalid resulting edit leaves the old document intact", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc({ body: "OLD" }),
    }))).toBe(false);

    const edit = await call("brain_edit", {
      path: "@/memories/knowledge/x.md",
      edits: [{ oldText: "importance: 0.5", newText: "importance: 2" }],
    });
    expect(resultIsError(edit)).toBe(true);

    const l1 = await call("brain_cat", { path: "@/memories/knowledge/x.md" });
    expect(resultText(l1)).toContain("importance: 0.5");
  });

  test.each([
    ["correct", "importance: 0.5", "importance: 0.6"],
    ["adopt", "importance: 0.5", "importance: 0.4"],
    ["attribute", "importance: 0.5", "importance: 0.6"],
  ])("CI-11 rejects wrong feedback direction: %s", async (feedback, oldText, newText) => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc(),
    }))).toBe(false);

    const edit = await call("brain_edit", {
      path: "@/memories/knowledge/x.md",
      edits: [{ oldText, newText }],
      feedback,
    });
    expect(resultIsError(edit)).toBe(true);

    const l1 = await call("brain_cat", { path: "@/memories/knowledge/x.md" });
    expect(resultText(l1)).toContain("importance: 0.5");
  });

  test("CI-11 clamps a correct-direction adopt delta at the configured legal boundary", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc(),
    }))).toBe(false);

    const edit = await call("brain_edit", {
      path: "@/memories/knowledge/x.md",
      edits: [{ oldText: "importance: 0.5", newText: "importance: 0.9" }],
      feedback: "adopt",
    });
    expect(resultIsError(edit)).toBe(false);

    const l1 = await call("brain_cat", { path: "@/memories/knowledge/x.md" });
    expect(resultText(l1)).toContain("importance: 0.7");
  });

  test("CI-04 replaces a core document and exposes the new document immediately", async () => {
    const call = createProductionCall();
    const edit = await call("brain_edit", { path: "@core/project.md", content: "PROJECT-CORE" });
    expect(resultIsError(edit)).toBe(false);

    const cat = await call("brain_cat", { path: "@core/project.md" });
    expect(resultText(cat)).toBe("PROJECT-CORE");

    const think = await call("brain_think", {});
    expect(resultIsError(think)).toBe(false);
    expect(resultText(think)).toContain("PROJECT-CORE");
  });

  test("CI-17 core cannot be removed", async () => {
    const call = createProductionCall();
    expect(resultIsError(await call("brain_edit", { path: "@core/project.md", content: "CORE" }))).toBe(false);

    const rm = await call("brain_rm", { path: "@core/project.md" });
    expect(resultIsError(rm)).toBe(true);

    const cat = await call("brain_cat", { path: "@core/project.md" });
    expect(resultText(cat)).toBe("CORE");
  });

  test("CI-18 protect mode returns pending with zero side effect, then confirmed retry applies", async () => {
    const call = createProductionCall({ askMode: "protect" });
    const args = {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc({ body: "NEW" }),
    };

    const pending = await call("brain_write", args);
    expect(resultIsError(pending)).toBe(false);
    expect(resultText(pending).toLowerCase()).toContain("approval");

    const before = await call("brain_cat", { path: args.path });
    expect(resultIsError(before)).toBe(true);

    const confirmed = await call("brain_write", { ...args, confirmed: true });
    expect(resultIsError(confirmed)).toBe(false);

    const after = await call("brain_cat", { path: args.path, offset: 1, limit: 100 });
    expect(resultText(after)).toContain("NEW");
  });

  test("CI-20 concurrent successful writes remain simultaneously observable", async () => {
    const call = createProductionCall();

    const [a, b] = await Promise.all([
      call("brain_write", {
        path: "@/memories/knowledge/a.md",
        content: memoryDoc({ summary: "A", body: "BODY-A" }),
      }),
      call("brain_write", {
        path: "@/memories/knowledge/b.md",
        content: memoryDoc({ summary: "B", body: "BODY-B" }),
      }),
    ]);
    expect(resultIsError(a)).toBe(false);
    expect(resultIsError(b)).toBe(false);

    const readA = await call("brain_cat", { path: "@/memories/knowledge/a.md", offset: 1, limit: 100 });
    const readB = await call("brain_cat", { path: "@/memories/knowledge/b.md", offset: 1, limit: 100 });
    expect(resultText(readA)).toContain("BODY-A");
    expect(resultText(readB)).toContain("BODY-B");
  });
});
