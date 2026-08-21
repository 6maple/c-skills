/**
 * Adapter: pi tool definitions (create*ToolDefinition from
 * @earendil-works/pi-coding-agent) → MCP tool registrations.
 *
 * Core parameter names stay identical to the pi definitions
 * (path/offset/limit/pattern/…); schemas are declared with zod (MCP SDK
 * requirement) while the execution is reused from pi. The @-scheme is
 * resolved to whitelisted fs paths by the tool layer (parseBrainPath —
 * which itself runs assertInsideMemoryTree) before the pi implementation
 * executes; this adapter therefore receives already-whitelisted absolute
 * paths and needs no further path checks.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ResolvedRoots } from "../memory/paths.ts";

/** Structural view of a pi tool definition (we only need these fields). */
export interface PiToolLike {
  name: string;
  description: string;
  execute(
    toolCallId: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
    onUpdate?: unknown,
    ctx?: unknown,
  ): Promise<{
    content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    details?: unknown;
  }>;
}

function extractText(
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>,
): string {
  return content
    .filter(
      (b): b is { type: string; text: string } => b.type === "text" && typeof b.text === "string",
    )
    .map((b) => b.text)
    .join("\n");
}

export interface RegisterPiToolOptions {
  roots: ResolvedRoots;
  /** Base for relative path resolution (the project root). */
  cwd: string;
  /** Exposed MCP tool name. */
  name: string;
  /** English description with the brain-dsh memory semantics. */
  description: string;
  /** zod parameter schema with parameter names matching the pi tool. */
  schema: z.ZodTypeAny;
  /** Optional output rewriter: converts fs paths in pi output to @-scheme. */
  rewrite?: (text: string) => string;
}

/**
 * Register a pi-backed tool on the MCP server. The schema and description are
 * ours (memory semantics); the execution body is pi's. Path validation
 * happens upstream (parseBrainPath in the tool layer).
 */
export function registerPiTool(
  server: McpServer,
  tool: PiToolLike,
  options: RegisterPiToolOptions,
): void {
  server.registerTool(
    options.name,
    {
      title: options.name,
      description: options.description,
      inputSchema: options.schema,
    },
    async (args, extra) => {
      try {
        const result = await tool.execute(
          "brain-dsh",
          args as Record<string, unknown>,
          extra.signal,
          undefined,
          undefined,
        );
        let text = extractText(result.content);
        if (options.rewrite) text = options.rewrite(text);
        return { content: [{ type: "text" as const, text }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
      }
    },
  );
}
