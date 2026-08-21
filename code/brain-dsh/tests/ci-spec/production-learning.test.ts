import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("node:fs", async () => (await import("./fake-node-fs.ts")).fakeFsSync);
vi.mock("node:fs/promises", async () => (await import("./fake-node-fs.ts")).fakeFsPromises);

import { fakeNodeFs } from "./fake-node-fs.ts";
import { createProductionCall, memoryDoc, resultIsError, resultText } from "./production-test-utils.ts";

function candidateLine(output: string, path: string): string | undefined {
  return output.split("\n").find((line) => line.includes(path));
}

type PublicCall = ReturnType<typeof createProductionCall>;

async function adoptsUntilPromotion(call: PublicCall, path: string, sessionId: string) {
  // Safety guard only prevents a broken implementation from looping forever;
  // the asserted behavior never fixes the promotion threshold to this value.
  for (let count = 1; count <= 100; count += 1) {
    const adopt = await call("brain_edit", { path, edits: [], feedback: "adopt" });
    expect(resultIsError(adopt)).toBe(false);

    const think = await call("brain_think", { session_id: sessionId });
    expect(resultIsError(think)).toBe(false);
    const output = resultText(think);
    if (output.includes(`promotion-candidate: ${path}`)) return { count, output };
  }
  throw new Error("promotion signal did not appear within the test safety guard");
}

describe("brain-dsh production CI: questioned / learning / signals", () => {
  beforeEach(() => fakeNodeFs.reset());

  test("CI-12 correct is questioned and down-ranked, attribute stays active, rm exits discovery", async () => {
    const call = createProductionCall();

    for (const [name, importance] of [["a", 0.5], ["b", 0.4], ["c", 0.4]] as const) {
      expect(resultIsError(await call("brain_write", {
        path: `@/memories/knowledge/${name}.md`,
        content: memoryDoc({ importance, summary: `${name} memory`, body: name.toUpperCase() }),
      }))).toBe(false);
    }

    const correct = await call("brain_edit", {
      path: "@/memories/knowledge/a.md",
      edits: [{ oldText: "importance: 0.5", newText: "importance: 0.4" }],
      feedback: "correct",
    });
    expect(resultIsError(correct)).toBe(false);

    const attribute = await call("brain_edit", {
      path: "@/memories/knowledge/b.md",
      edits: [],
      feedback: "attribute",
    });
    expect(resultIsError(attribute)).toBe(false);

    const removed = await call("brain_rm", { path: "@/memories/knowledge/c.md" });
    expect(resultIsError(removed)).toBe(false);

    const think = await call("brain_think", {});
    expect(resultIsError(think)).toBe(false);
    const output = resultText(think);

    const activeLine = candidateLine(output, "@/memories/knowledge/b.md");
    const questionedLine = candidateLine(output, "@/memories/knowledge/a.md");
    expect(activeLine).toBeDefined();
    expect(questionedLine).toBeDefined();
    expect(questionedLine?.toLowerCase()).toContain("questioned");
    expect(activeLine?.toLowerCase()).not.toContain("questioned");
    expect(output.indexOf(activeLine!)).toBeLessThan(output.indexOf(questionedLine!));
    expect(output).not.toContain("@/memories/knowledge/c.md");
  });

  test("CI-06 EOF L2 does not reduce the adopt count needed for promotion", async () => {
    const path = "@/sessions/s1/memories/knowledge/x.md";

    fakeNodeFs.reset();
    const eofCall = createProductionCall({ sessionId: "s1" });
    expect(resultIsError(await eofCall("brain_write", {
      path,
      content: memoryDoc({ summary: "EOF branch", body: "BODY" }),
    }))).toBe(false);
    const eof = await eofCall("brain_cat", { path, offset: 9999, limit: 10 });
    expect(resultIsError(eof)).toBe(false);
    expect(resultText(eof)).toContain("no more lines");
    const afterEof = await adoptsUntilPromotion(eofCall, path, "s1");

    fakeNodeFs.reset();
    const baselineCall = createProductionCall({ sessionId: "s1" });
    expect(resultIsError(await baselineCall("brain_write", {
      path,
      content: memoryDoc({ summary: "baseline branch", body: "BODY" }),
    }))).toBe(false);
    const baseline = await adoptsUntilPromotion(baselineCall, path, "s1");

    expect(afterEof.count).toBe(baseline.count);
  });

  test("CI-13 L0/L2 exposure does not reduce the successful-use adoption requirement", async () => {
    const path = "@/sessions/s1/memories/knowledge/x.md";

    fakeNodeFs.reset();
    const exposedCall = createProductionCall({ sessionId: "s1" });
    expect(resultIsError(await exposedCall("brain_write", {
      path,
      content: memoryDoc({ summary: "exposed branch", body: "BODY-LINE" }),
    }))).toBe(false);

    for (let i = 0; i < 2; i += 1) {
      const think = await exposedCall("brain_think", { session_id: "s1" });
      expect(resultIsError(think)).toBe(false);
      expect(resultText(think)).toContain(path);

      const l2 = await exposedCall("brain_cat", { path, offset: 1, limit: 100 });
      expect(resultIsError(l2)).toBe(false);
      expect(resultText(l2)).toContain("BODY-LINE");
    }
    const exposed = await adoptsUntilPromotion(exposedCall, path, "s1");

    fakeNodeFs.reset();
    const baselineCall = createProductionCall({ sessionId: "s1" });
    expect(resultIsError(await baselineCall("brain_write", {
      path,
      content: memoryDoc({ summary: "baseline branch", body: "BODY-LINE" }),
    }))).toBe(false);
    const baseline = await adoptsUntilPromotion(baselineCall, path, "s1");

    expect(exposed.count).toBe(baseline.count);
  });

  test("CI-16 promotion is a signal and does not move the memory automatically", async () => {
    const call = createProductionCall({ sessionId: "s1" });
    const path = "@/sessions/s1/memories/knowledge/x.md";
    expect(resultIsError(await call("brain_write", {
      path,
      content: memoryDoc({ summary: "promotion subject", body: "STAYS-HERE" }),
    }))).toBe(false);

    const promoted = await adoptsUntilPromotion(call, path, "s1");
    expect(promoted.output).toContain(`promotion-candidate: ${path}`);

    const stillThere = await call("brain_cat", { path, offset: 1, limit: 100 });
    expect(resultIsError(stillThere)).toBe(false);
    expect(resultText(stillThere)).toContain("STAYS-HERE");
  });

  test("CI-16 demotion is a signal and does not delete the memory automatically", async () => {
    const call = createProductionCall();
    const path = "@/memories/knowledge/low.md";
    expect(resultIsError(await call("brain_write", {
      path,
      content: memoryDoc({ importance: 0, summary: "low value", body: "STILL-ACTIVE" }),
    }))).toBe(false);

    let signalOutput: string | undefined;
    for (let safety = 0; safety < 100; safety += 1) {
      const think = await call("brain_think", {});
      expect(resultIsError(think)).toBe(false);
      const output = resultText(think);
      if (output.includes(`demotion-candidate: ${path}`)) {
        signalOutput = output;
        break;
      }
    }
    expect(signalOutput).toContain(`demotion-candidate: ${path}`);

    const stillThere = await call("brain_cat", { path, offset: 1, limit: 100 });
    expect(resultIsError(stillThere)).toBe(false);
    expect(resultText(stillThere)).toContain("STILL-ACTIVE");
  });
});
