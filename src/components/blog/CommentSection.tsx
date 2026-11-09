"use client";

import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, Bot, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface CommentItem {
  id: string;
  authorName: string;
  content: string;
  createdAt: string | Date;
  isAuthorReply: boolean;
  replies?: CommentItem[];
}

export function CommentSection({
  postId,
  initialComments = [],
}: {
  postId: string;
  initialComments: CommentItem[];
}) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          authorName: name,
          authorEmail: email,
          content,
          parentId: replyingTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim komentar.");
      }

      setStatus("success");
      setContent("");
      setReplyingTo(null);

      if (data.comment) {
        if (data.comment.parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === data.comment.parentId
                ? { ...c, replies: [...(c.replies || []), data.comment] }
                : c
            )
          );
        } else {
          setComments((prev) => [data.comment, ...prev]);
        }
      }
    } catch (err: unknown) {
      setStatus("error");
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Terjadi kesalahan tak terduga.");
      }
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-8">
        <MessageSquare className="w-6 h-6 text-indigo-600" />
        <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Diskusi ({comments.length})
        </h3>
      </div>

      {/* Form Komentar */}
      <form
        onSubmit={handleSubmit}
        className="mb-12 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700"
      >
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
          {replyingTo ? "Membalas Komentar" : "Tinggalkan Komentar"}
        </h4>

        {replyingTo && (
          <div className="mb-4 flex items-center justify-between text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg">
            <span>Membalas komentar terpilih</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="font-bold underline cursor-pointer hover:text-indigo-900"
            >
              Batal
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Nama Lengkap"
            placeholder="misal: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email (Privat)"
            type="email"
            placeholder="budi@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <Textarea
            label="Komentar"
            placeholder="Tuliskan pandangan, pertanyaan, atau feedback Anda..."
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        {status === "error" && (
          <p className="mb-4 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {errorMessage}
          </p>
        )}

        {status === "success" && (
          <div className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Komentar Anda berhasil dikirim!</span>
          </div>
        )}

        <Button type="submit" disabled={status === "loading"}>
          <Send className="w-4 h-4 mr-2" />
          {status === "loading" ? "Mengirim..." : "Kirim Komentar"}
        </Button>
      </form>

      {/* Daftar Komentar */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Belum ada komentar. Jadilah yang pertama berkomentar!</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {comment.authorName}
                  </span>
                  {comment.isAuthorReply && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      <Bot className="w-3 h-3" /> Author Bot
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>

              <button
                type="button"
                onClick={() => setReplyingTo(comment.id)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                Balas
              </button>

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-indigo-100 dark:border-indigo-950 space-y-4">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {reply.authorName}
                          </span>
                          {reply.isAuthorReply && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              <Bot className="w-2.5 h-2.5" /> Bot
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400">
                          {new Date(reply.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
