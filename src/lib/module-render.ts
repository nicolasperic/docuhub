import { marked } from "marked";
import type { ModuleDoc } from "@/generated/prisma/client";

/**
 * Stitch a module's generated + manual markdown (generated block first) and render to
 * HTML. Mirrors the filesystem `apply-readme.php` splice: generated reference on top,
 * human-owned Team Notes below.
 */
export function renderHtml(m: Pick<ModuleDoc, "title" | "generatedMarkdown" | "manualMarkdown">): string {
  const parts = [m.generatedMarkdown ?? ""];
  if (m.manualMarkdown && m.manualMarkdown.trim()) {
    parts.push(m.manualMarkdown);
  }
  const stitched = parts.join("\n\n---\n\n");
  return marked.parse(stitched, { async: false }) as string;
}
