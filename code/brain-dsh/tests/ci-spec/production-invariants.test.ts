import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", async () => (await import("./fake-node-fs.ts")).fakeFsSync);
vi.mock("node:fs/promises", async () => (await import("./fake-node-fs.ts")).fakeFsPromises);

import { CANDIDATE_LIMIT } from "../../src/memory/core.ts";
import { CORE_DOC_MAX_CHARS, decay, moveToHistory } from "../../src/memory/store.ts";
import { fakeNodeFs } from "./fake-node-fs.ts";
import { createProductionCall, memoryDoc, resultIsError, resultText } from "./production-test-utils.ts";

describe("brain-dsh production CI: invariants", () => {
  beforeEach(() => {
    fakeNodeFs.reset();
    vi.useRealTimers();
  });

  test("INV-01 candidate selection is bounded by the current Design limit", async () => {
    const call = createProductionCall();

    for (let i = 0; i < CANDIDATE_LIMIT + 3; i += 1) {
      expect(resultIsError(await call("brain_write", {
        path: `@/memories/knowledge/item-${i}.md`,
        content: memoryDoc({ importance: 1 - i / 100, summary: `item ${i}`, body: `BODY-${i}` }),
      }))).toBe(false);
    }

    const think = await call("brain_think", {});
    expect(resultIsError(think)).toBe(false);
    const candidateLines = resultText(think)
      .split("\n")
      .filter((line) => line.startsWith("- @/memories/knowledge/item-"));

    expect(candidateLines).toHaveLength(CANDIDATE_LIMIT);
  });

  test("INV-02 core capacity rejects an oversized edit without replacing the old core", async () => {
    const call = createProductionCall();
    const oldCore = "# old core";

    expect(resultIsError(await call("brain_edit", {
      path: "@core/project.md",
      content: oldCore,
    }))).toBe(false);

    const oversized = await call("brain_edit", {
      path: "@core/project.md",
      content: "x".repeat(CORE_DOC_MAX_CHARS + 1),
    });
    expect(resultIsError(oversized)).toBe(true);

    const after = await call("brain_cat", { path: "@core/project.md" });
    expect(resultIsError(after)).toBe(false);
    expect(resultText(after)).toBe(oldCore);
  });

  test("INV-02 core capacity rejects an oversized archival -> core move atomically", async () => {
    const call = createProductionCall();
    const source = "@/memories/knowledge/large.md";
    const oldCore = "# old core";

    expect(resultIsError(await call("brain_edit", {
      path: "@core/project.md",
      content: oldCore,
    }))).toBe(false);
    expect(resultIsError(await call("brain_write", {
      path: source,
      content: memoryDoc({ summary: "large", body: "x".repeat(CORE_DOC_MAX_CHARS + 1) }),
    }))).toBe(false);

    const move = await call("brain_mv", { src: source, dst: "@core/project.md" });
    expect(resultIsError(move)).toBe(true);

    const sourceAfter = await call("brain_cat", { path: source, offset: 1, limit: CORE_DOC_MAX_CHARS + 100 });
    expect(resultIsError(sourceAfter)).toBe(false);
    expect(resultText(sourceAfter)).toContain("x".repeat(100));

    const coreAfter = await call("brain_cat", { path: "@core/project.md" });
    expect(resultText(coreAfter)).toBe(oldCore);
  });

  test("INV-03 repeated successful brain_think calls are not deduplicated into one event", async () => {
    const call = createProductionCall();
    const path = "@/memories/knowledge/low.md";

    expect(resultIsError(await call("brain_write", {
      path,
      content: memoryDoc({ importance: 0, summary: "event witness", body: "BODY" }),
    }))).toBe(false);

    let signalSeen = false;
    for (let safety = 0; safety < 100; safety += 1) {
      const think = await call("brain_think", {});
      expect(resultIsError(think)).toBe(false);
      if (resultText(think).includes(`demotion-candidate: ${path}`)) {
        signalSeen = true;
        break;
      }
    }

    expect(signalSeen).toBe(true);
  });

  test("INV-04 wall clock alone does not change event-time decay", () => {
    const base = {
      id: "x",
      type: "knowledge" as const,
      importance: 0.5,
      difficulty: 0.4,
      stability: 2,
      retrievability: 1,
      last_at: 3,
      exposure: 0,
      usage: { ok: 0, fail: 0 },
      status: "active" as const,
      at: 0,
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2000-01-01T00:00:00Z"));
    const early = structuredClone(base);
    decay(early, 7);

    vi.setSystemTime(new Date("2099-01-01T00:00:00Z"));
    const late = structuredClone(base);
    decay(late, 7);

    expect(late.retrievability).toBe(early.retrievability);
    expect(late.last_at).toBe(early.last_at);
  });

  test("INV-05 rm leaves recoverable body evidence and auditable reason evidence", async () => {
    const call = createProductionCall();
    const itemPath = "@/memories/knowledge/remove-me.md";
    const bodyMarker = "RECOVERABLE-BODY-MARKER";
    const reasonMarker = "DELETE-REASON-MARKER";

    expect(resultIsError(await call("brain_write", {
      path: itemPath,
      content: memoryDoc({ summary: "remove me", body: bodyMarker }),
    }))).toBe(false);

    const removed = await call("brain_rm", { path: itemPath, reason: reasonMarker });
    expect(resultIsError(removed)).toBe(false);

    const publicRead = await call("brain_cat", { path: itemPath, offset: 1, limit: 100 });
    expect(resultIsError(publicRead)).toBe(true);

    const persisted = [...fakeNodeFs.snapshotFiles().values()];
    expect(persisted.some((content) => content.includes(bodyMarker))).toBe(true);
    expect(persisted.some((content) => content.includes(reasonMarker))).toBe(true);
  });

  test("INV-05 non-deletion archival retirement can explicitly suppress deletion audit", async () => {
    const roots = {
      projectRoot: "C:\\virtual\\project",
      globalRoot: "C:\\virtual\\global",
      sessionId: "default",
    };
    const source = "C:\\virtual\\project\\.brain-data\\memories\\knowledge\\promotion.md";
    fakeNodeFs.seedFile(source, "PROMOTION-BODY");

    const result = await moveToHistory(roots, "project", source, "moved to core", 3, false);

    expect(result.record).toBeNull();
    expect(fakeNodeFs.readSeededFile(result.movedTo)).toBe("PROMOTION-BODY");
  });
});
