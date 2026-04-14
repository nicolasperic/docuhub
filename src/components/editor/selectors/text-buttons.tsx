"use client";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import type { SelectorItem } from "./node-selector";
import { Button } from "@/components/ui/button";

const items: SelectorItem[] = [
  {
    name: "bold",
    isActive: (editor) => editor.isActive("bold"),
    command: (editor) => editor.chain().focus().toggleBold().run(),
    icon: Bold,
  },
  {
    name: "italic",
    isActive: (editor) => editor.isActive("italic"),
    command: (editor) => editor.chain().focus().toggleItalic().run(),
    icon: Italic,
  },
  {
    name: "underline",
    isActive: (editor) => editor.isActive("underline"),
    command: (editor) => editor.chain().focus().toggleUnderline().run(),
    icon: Underline,
  },
  {
    name: "strike",
    isActive: (editor) => editor.isActive("strike"),
    command: (editor) => editor.chain().focus().toggleStrike().run(),
    icon: Strikethrough,
  },
  {
    name: "code",
    isActive: (editor) => editor.isActive("code"),
    command: (editor) => editor.chain().focus().toggleCode().run(),
    icon: Code,
  },
];

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="flex">
      {items.map((item) => (
        <EditorBubbleItem
          key={item.name}
          onSelect={(editor) => {
            item.command(editor);
          }}
        >
          <Button
            size="sm"
            className="rounded-none"
            variant="ghost"
          >
            <item.icon
              className={`h-4 w-4 ${
                item.isActive(editor) ? "text-blue-500" : ""
              }`}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
