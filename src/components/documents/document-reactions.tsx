"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SmilePlus } from "lucide-react";

const EMOJI_MAP: Record<string, string> = {
  thumbsUp: "👍",
  heart: "❤️",
  celebrate: "🎉",
  thinking: "🤔",
  eyes: "👀",
  rocket: "🚀",
};

interface ReactionGroup {
  emoji: string;
  count: number;
  users: { id: string; name: string | null; email: string }[];
  reacted: boolean;
}

interface DocumentReactionsProps {
  documentId: string;
}

export function DocumentReactions({ documentId }: DocumentReactionsProps) {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState<ReactionGroup[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchReactions = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/reactions`);
    if (res.ok) {
      setReactions(await res.json());
    }
  }, [documentId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  async function toggleReaction(emoji: string) {
    const res = await fetch(`/api/documents/${documentId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      // Optimistic update
      const { reacted } = await res.json();
      setReactions((prev) => {
        const existing = prev.find((r) => r.emoji === emoji);
        if (reacted) {
          if (existing) {
            return prev.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    reacted: true,
                    users: [
                      ...r.users,
                      {
                        id: session?.user?.id ?? "",
                        name: session?.user?.name ?? null,
                        email: session?.user?.email ?? "",
                      },
                    ],
                  }
                : r
            );
          }
          return [
            ...prev,
            {
              emoji,
              count: 1,
              reacted: true,
              users: [
                {
                  id: session?.user?.id ?? "",
                  name: session?.user?.name ?? null,
                  email: session?.user?.email ?? "",
                },
              ],
            },
          ];
        } else {
          if (existing && existing.count <= 1) {
            return prev.filter((r) => r.emoji !== emoji);
          }
          return prev.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count - 1,
                  reacted: false,
                  users: r.users.filter((u) => u.id !== session?.user?.id),
                }
              : r
          );
        }
      });
    }
    setPopoverOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reactions.map((r) => (
        <Tooltip key={r.emoji}>
          <TooltipTrigger asChild>
            <Button
              variant={r.reacted ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5 px-3"
              onClick={() => toggleReaction(r.emoji)}
            >
              <span>{EMOJI_MAP[r.emoji]}</span>
              <span className="text-xs">{r.count}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{r.users.map((u) => u.name || u.email).join(", ")}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {Object.entries(EMOJI_MAP).map(([key, char]) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg"
                onClick={() => toggleReaction(key)}
              >
                {char}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
