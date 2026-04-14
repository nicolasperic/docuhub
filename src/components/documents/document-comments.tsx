"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Pencil, Trash2, Reply } from "lucide-react";
import { toast } from "sonner";

interface CommentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  parentId: string | null;
  replies: Comment[];
}

interface DocumentCommentsProps {
  documentId: string;
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function DocumentComments({ documentId }: DocumentCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const currentUserId = (session?.user as { id?: string })?.id;

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  }, [documentId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      setNewComment("");
      fetchComments();
    }
    setSubmitting(false);
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return;
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent, parentId }),
    });
    if (res.ok) {
      setReplyingTo(null);
      setReplyContent("");
      fetchComments();
    }
  }

  async function handleEdit(commentId: string) {
    if (!editContent.trim()) return;
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditContent("");
      fetchComments();
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Comment deleted");
      fetchComments();
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditContent(comment.content);
  }

  function renderComment(comment: Comment, isReply = false) {
    const isOwn = comment.user.id === currentUserId;
    const isEdited =
      new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

    return (
      <div key={comment.id} className={isReply ? "ml-10" : ""}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(comment.user.name, comment.user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {comment.user.name || comment.user.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(comment.createdAt)}
              </span>
              {isEdited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            {editingId === comment.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(comment.id)}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
            )}

            {editingId !== comment.id && (
              <div className="mt-1 flex items-center gap-1">
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setReplyingTo(
                        replyingTo === comment.id ? null : comment.id
                      );
                      setReplyContent("");
                    }}
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </Button>
                )}
                {isOwn && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                      onClick={() => startEdit(comment)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {replyingTo === comment.id && (
          <div className="ml-10 mt-3 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleReply(comment.id)}>
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {comment.replies?.map((reply) => (
          <div key={reply.id} className="mt-3">
            {renderComment(reply, true)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h2 className="text-lg font-semibold">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>
      </div>

      <div className="space-y-3">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <Button onClick={handleSubmit} disabled={submitting || !newComment.trim()}>
          {submitting ? "Posting..." : "Post Comment"}
        </Button>
      </div>

      {comments.length > 0 && <Separator />}

      <div className="space-y-6">
        {comments.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
}
