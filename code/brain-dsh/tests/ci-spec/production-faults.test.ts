import path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", async () => (await import("./fake-node-fs.ts")).fakeFsSync);
vi.mock("node:fs/promises", async () => (await import("./fake-node-fs.ts")).fakeFsPromises);

import { layerFiles } from "../../src/memory/store.ts";
import { fakeNodeFs } from "./fake-node-fs.ts";
import { createProductionCall, memoryDoc, resultIsError, resultText } from "./production-test-utils.ts";

const projectRoot = "C:\\virtual\\project";
const globalRoot = "C:\\virtual\\global";
const roots = { projectRoot, globalRoot, sessionId: "default" };

describe("brain-dsh production CI: predictable faults", () => {
  beforeEach(() => fakeNodeFs.reset());

  test("FI-CI-01 predictable commit failure rolls back to the old public state", async () => {
    const call = createProductionCall();
    const itemPath = "@/memories/knowledge/x.md";

    expect(resultIsError(await call("brain_write", {
      path: itemPath,
      content: memoryDoc({ summary: "old", body: "OLD-BODY" }),
    }))).toBe(false);

    fakeNodeFs.failNextRenameTo((destination) => destination.endsWith(`${path.sep}index.json`));

    const edit = await call("brain_edit", {
      path: itemPath,
      edits: [{ oldText: "OLD-BODY", newText: "NEW-BODY" }],
    });
    expect(resultIsError(edit)).toBe(true);
    expect(resultText(edit)).not.toContain("C:\\virtual\\project");

    const after = await call("brain_cat", { path: itemPath, offset: 1, limit: 100 });
    expect(resultIsError(after)).toBe(false);
    expect(resultText(after)).toContain("OLD-BODY");
    expect(resultText(after)).not.toContain("NEW-BODY");
  });

  test("FI-CI-02 corrupt persisted state fails loud instead of becoming an empty first-run state", async () => {
    const call = createProductionCall();
    const files = layerFiles(roots, "project");

    expect(resultIsError(await call("brain_write", {
      path: "@/memories/knowledge/x.md",
      content: memoryDoc({ summary: "subject", body: "BODY" }),
    }))).toBe(false);

    fakeNodeFs.seedFile(files.statePath, '{"tick": 3, "core": [');

    const think = await call("brain_think", {});
    expect(resultIsError(think)).toBe(true);
    expect(resultText(think)).not.toContain("C:\\virtual\\project");
    expect(resultText(think).toLowerCase()).toContain("corrupt");
    expect(resultText(think)).not.toContain("# core memory");
  });

  test("FI-CI-03 conflicting active learning identity fails loud at the public boundary", async () => {
    const call = createProductionCall();
    const files = layerFiles(roots, "project");

    for (const name of ["a", "b"]) {
      expect(resultIsError(await call("brain_write", {
        path: `@/memories/knowledge/${name}.md`,
        content: memoryDoc({ summary: name, body: name.toUpperCase() }),
      }))).toBe(false);
    }

    const index = JSON.parse(fakeNodeFs.readSeededFile(files.indexPath) ?? "[]") as Array<Record<string, unknown>>;
    expect(index).toHaveLength(2);
    index[1] = { ...index[1], id: index[0]?.id };
    fakeNodeFs.seedFile(files.indexPath, JSON.stringify(index));

    const think = await call("brain_think", {});
    expect(resultIsError(think)).toBe(true);
    expect(resultText(think)).not.toContain("C:\\virtual\\project");
    expect(resultText(think).toLowerCase()).toContain("invariant violation");
    expect(resultText(think)).not.toContain("# core memory");
  });
});
