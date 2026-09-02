/* eslint-disable @typescript-eslint/no-explicit-any */
import { marked } from "marked";

// Convert markdown to the Tiptap/ProseMirror JSON document shape DocuHub stores in
// `Document.content` (the editor does JSON.parse on it). Built on marked's lexer so it
// runs server-side with no DOM. Covers the StarterKit + link/image node set used by the
// editor: headings, paragraphs, bold/italic/code/strike, links, bullet/ordered lists,
// blockquotes, code blocks, horizontal rules, images, hard breaks. Unknown constructs
// (e.g. tables — no table extension is enabled) degrade to a code block so nothing is lost.

type Node = { type: string; attrs?: Record<string, unknown>; content?: Node[]; marks?: any[]; text?: string };
type Mark = { type: string; attrs?: Record<string, unknown> };

function textNode(text: string, marks: Mark[]): Node | null {
  if (!text) return null; // ProseMirror forbids empty text nodes
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

function withMark(marks: Mark[], mark: Mark): Mark[] {
  return marks.some((m) => m.type === mark.type) ? marks : [...marks, mark];
}

function inline(tokens: any[] | undefined, marks: Mark[] = []): Node[] {
  if (!tokens) return [];
  const out: Node[] = [];
  const push = (n: Node | null) => n && out.push(n);
  for (const t of tokens) {
    switch (t.type) {
      case "text":
      case "escape":
      case "html":
        if (t.tokens?.length) out.push(...inline(t.tokens, marks));
        else push(textNode(t.text ?? "", marks));
        break;
      case "strong":
        out.push(...inline(t.tokens ?? [{ type: "text", text: t.text }], withMark(marks, { type: "bold" })));
        break;
      case "em":
        out.push(...inline(t.tokens ?? [{ type: "text", text: t.text }], withMark(marks, { type: "italic" })));
        break;
      case "del":
        out.push(...inline(t.tokens ?? [{ type: "text", text: t.text }], withMark(marks, { type: "strike" })));
        break;
      case "codespan":
        push(textNode(t.text ?? "", withMark(marks, { type: "code" })));
        break;
      case "link":
        out.push(
          ...inline(t.tokens ?? [{ type: "text", text: t.text }], withMark(marks, {
            type: "link",
            attrs: { href: t.href, target: "_blank", rel: "noopener noreferrer nofollow" },
          }))
        );
        break;
      case "image":
        push(textNode(t.text || t.href || "", marks)); // inline image → alt-text fallback
        break;
      case "br":
        out.push({ type: "hardBreak" });
        break;
      default:
        push(textNode(t.text ?? t.raw ?? "", marks));
    }
  }
  return out;
}

function listItemContent(item: any): Node[] {
  const nodes: Node[] = [];
  for (const t of item.tokens ?? []) {
    if (t.type === "text") {
      nodes.push({ type: "paragraph", content: t.tokens ? inline(t.tokens) : inline([{ type: "text", text: t.text }]) });
    } else {
      nodes.push(...blocks([t]));
    }
  }
  if (nodes.length === 0) nodes.push({ type: "paragraph" });
  return nodes;
}

function blocks(tokens: any[]): Node[] {
  const out: Node[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "space":
        break;
      case "heading":
        out.push({ type: "heading", attrs: { level: t.depth }, content: inline(t.tokens) });
        break;
      case "paragraph":
        if (t.tokens?.length === 1 && t.tokens[0].type === "image") {
          const im = t.tokens[0];
          out.push({ type: "image", attrs: { src: im.href, alt: im.text || null, title: im.title || null } });
        } else {
          out.push({ type: "paragraph", content: inline(t.tokens) });
        }
        break;
      case "text":
        out.push({ type: "paragraph", content: t.tokens ? inline(t.tokens) : inline([{ type: "text", text: t.text }]) });
        break;
      case "list":
        out.push({
          type: t.ordered ? "orderedList" : "bulletList",
          ...(t.ordered && t.start && t.start !== 1 ? { attrs: { start: t.start } } : {}),
          content: (t.items ?? []).map((item: any) => ({ type: "listItem", content: listItemContent(item) })),
        });
        break;
      case "blockquote":
        out.push({ type: "blockquote", content: blocks(t.tokens ?? []) });
        break;
      case "code":
        out.push({
          type: "codeBlock",
          ...(t.lang ? { attrs: { language: t.lang } } : {}),
          content: t.text ? [{ type: "text", text: t.text }] : [],
        });
        break;
      case "hr":
        out.push({ type: "horizontalRule" });
        break;
      case "table":
      case "html":
        // No table/raw-HTML node in the editor schema — preserve as a code block.
        out.push({ type: "codeBlock", content: [{ type: "text", text: (t.raw ?? t.text ?? "").trim() }] });
        break;
      default: {
        const text = (t.text ?? t.raw ?? "").trim();
        if (text) out.push({ type: "paragraph", content: [{ type: "text", text }] });
      }
    }
  }
  return out;
}

/** Convert markdown to a Tiptap JSON document object. */
export function markdownToTiptap(md: string): Node {
  const content = blocks(marked.lexer(md ?? ""));
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function plainText(tokens: any[] | undefined): string {
  if (!tokens) return "";
  return tokens
    .map((t) => {
      if (t.tokens?.length) return plainText(t.tokens);
      if (t.type === "br") return " ";
      return t.text ?? "";
    })
    .join("");
}

/** A short plain-text excerpt (first meaningful paragraph, ~200 chars), markdown stripped. */
export function markdownExcerpt(md: string, max = 200): string {
  for (const t of marked.lexer(md ?? "") as any[]) {
    if (t.type === "paragraph" || t.type === "text") {
      const text = plainText(t.tokens) || (t.text ?? "");
      const clean = text.replace(/\s+/g, " ").trim();
      if (clean) return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
    }
  }
  return "";
}
