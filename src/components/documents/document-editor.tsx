"use client";

import { useState, useCallback } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorBubble,
  type JSONContent,
  type useEditor,
} from "novel";
import { defaultExtensions } from "@/components/editor/extensions";
import {
  slashCommand,
  suggestionItems,
} from "@/components/editor/slash-command";
import { NodeSelector } from "@/components/editor/selectors/node-selector";
import { LinkSelector } from "@/components/editor/selectors/link-selector";
import { TextButtons } from "@/components/editor/selectors/text-buttons";
import { Toolbar } from "@/components/editor/toolbar";
import { Separator } from "@/components/ui/separator";
import "@/styles/prosemirror.css";

const extensions = [...defaultExtensions, slashCommand];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface DocumentEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}

type EditorInstance = NonNullable<ReturnType<typeof useEditor>["editor"]>;

export function DocumentEditor({
  initialContent,
  onChange,
  editable = true,
}: DocumentEditorProps) {
  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [editor, setEditor] = useState<EditorInstance | null>(null);

  const handleCreate = useCallback(({ editor: newEditor }: { editor: EditorInstance }) => {
    setEditor(newEditor);
  }, []);

  const handleUpdate = useCallback(({ editor: updatedEditor }: { editor: EditorInstance }) => {
    setEditor(updatedEditor);
    onChange?.(JSON.stringify(updatedEditor.getJSON()));
  }, [onChange]);

  const parsedContent: JSONContent | undefined = initialContent
    ? (() => {
        try {
          return JSON.parse(initialContent);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  return (
    <div className="relative w-full rounded-md border">
      <EditorRoot>
        {editable && <Toolbar editor={editor} />}
        <EditorContent
          extensions={extensions}
          initialContent={parsedContent}
          editable={editable}
          className="min-h-[300px]"
          editorProps={{
            attributes: {
              class:
                "prose prose-sm sm:prose dark:prose-invert prose-headings:font-semibold max-w-none focus:outline-none",
            },
            handleDrop: (view, event, _slice, moved) => {
              if (moved || !event.dataTransfer?.files.length) return false;
              const images = Array.from(event.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/")
              );
              if (!images.length) return false;
              event.preventDefault();
              const coords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              images.forEach((file) => {
                fileToBase64(file).then((src) => {
                  const node = view.state.schema.nodes.image.create({ src });
                  const pos = coords?.pos ?? view.state.selection.anchor;
                  const tr = view.state.tr.insert(pos, node);
                  view.dispatch(tr);
                });
              });
              return true;
            },
            handlePaste: (view, event) => {
              const items = event.clipboardData?.items;
              if (!items) return false;
              const images = Array.from(items).filter((item) =>
                item.type.startsWith("image/")
              );
              if (!images.length) return false;
              event.preventDefault();
              images.forEach((item) => {
                const file = item.getAsFile();
                if (!file) return;
                fileToBase64(file).then((src) => {
                  const node = view.state.schema.nodes.image.create({ src });
                  const tr = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(tr);
                });
              });
              return true;
            },
          }}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          immediatelyRender={false}
        >
          {editable && (
            <>
              <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
                <EditorCommandEmpty className="px-2 text-muted-foreground">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList>
                  {suggestionItems.map((item) => (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={(val) => item.command?.(val)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                      key={item.title}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
              </EditorCommand>

              <EditorBubble
                tippyOptions={{ placement: "top" }}
                className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
              >
                <NodeSelector
                  open={openNode}
                  onOpenChange={setOpenNode}
                />
                <Separator orientation="vertical" />
                <LinkSelector
                  open={openLink}
                  onOpenChange={setOpenLink}
                />
                <Separator orientation="vertical" />
                <TextButtons />
              </EditorBubble>
            </>
          )}
        </EditorContent>
      </EditorRoot>
    </div>
  );
}
