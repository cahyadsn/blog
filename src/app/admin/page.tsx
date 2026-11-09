"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostList } from "@/components/admin/PostList";
import { CommentList, CommentCounts } from "@/components/admin/CommentList";
import {
  FileText,
  EyeOff,
  Clock,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Layers,
} from "lucide-react";

interface AdminMetrics {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalComments: number;
  pendingComments: number;
  approvedComments: number;
  spamComments: number;
}

export default function AdminDashboardPage() {
  // Active Tab: "posts" | "comments"
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");

  // Metrics State
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalComments: 0,
    pendingComments: 0,
    approvedComments: 0,
    spamComments: 0,
  });

  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);

  // Fetch summary metrics from both posts and comments APIs
  const fetchMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const [postsRes, commentsRes] = await Promise.all([
        fetch("/api/admin/posts?status=all"),
        fetch("/api/admin/comments?status=ALL"),
      ]);

      const [postsData, commentsData] = await Promise.all([
        postsRes.json(),
        commentsRes.json(),
      ]);

      const postsList = postsData.success && Array.isArray(postsData.posts) ? postsData.posts : [];
      const commentsList =
        commentsData.success && Array.isArray(commentsData.comments)
          ? commentsData.comments
          : [];

      const totalPosts = postsList.length;
      const publishedPosts = postsList.filter((p: { published: boolean }) => p.published).length;
      const draftPosts = totalPosts - publishedPosts;

      const totalComments = commentsList.length;
      const pendingComments = commentsList.filter(
        (c: { status: string }) => c.status === "PENDING"
      ).length;
      const approvedComments = commentsList.filter(
        (c: { status: string }) => c.status === "APPROVED"
      ).length;
      const spamComments = commentsList.filter(
        (c: { status: string }) => c.status === "SPAM"
      ).length;

      setMetrics({
        totalPosts,
        publishedPosts,
        draftPosts,
        totalComments,
        pendingComments,
        approvedComments,
        spamComments,
      });
    } catch {
      // ignore metrics fetch error, keep default values
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Callback to sync comment count updates from CommentList
  const handleCommentCountsUpdate = (counts: CommentCounts) => {
    setMetrics((prev) => ({
      ...prev,
      totalComments: counts.ALL,
      pendingComments: counts.PENDING,
      approvedComments: counts.APPROVED,
      spamComments: counts.SPAM,
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Metrics Summary Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Ringkasan Aktivitas Blog
            </h2>
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={isLoadingMetrics}
            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
            title="Segarkan statistik"
          >
            <RefreshCw
              className={`w-3 h-3 ${isLoadingMetrics ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Artikel */}
          <Card className="hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Artikel
                </p>
                <div className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                  {isLoadingMetrics ? "..." : metrics.totalPosts}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {metrics.publishedPosts} dipublikasikan
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Artikel Draf */}
          <Card className="hover:border-amber-300 dark:hover:border-amber-800 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Artikel Draf
                </p>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {isLoadingMetrics ? "..." : metrics.draftPosts}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Menunggu rilis
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                <EyeOff className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Komentar Pending */}
          <Card
            className={`transition-all ${
              metrics.pendingComments > 0
                ? "border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20"
                : "hover:border-gray-300 dark:hover:border-gray-700"
            }`}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Komentar Pending
                </p>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {isLoadingMetrics ? "..." : metrics.pendingComments}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {metrics.pendingComments > 0 ? "Perlu ditinjau segera" : "Semua bersih"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Komentar Spam */}
          <Card className="hover:border-rose-300 dark:hover:border-rose-800 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Komentar Spam
                </p>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {isLoadingMetrics ? "..." : metrics.spamComments}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Disaring dari publik
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Unified Tab Switcher Navigation */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2.5 pb-3 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "posts"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Manajemen Artikel</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
              {metrics.totalPosts}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`flex items-center gap-2.5 pb-3 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "comments"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Moderasi Komentar</span>
            {metrics.pendingComments > 0 ? (
              <Badge variant="warning" className="text-[10px] py-0 px-1.5 ml-1 font-bold">
                {metrics.pendingComments} baru
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
                {metrics.totalComments}
              </Badge>
            )}
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="pt-2">
          {activeTab === "posts" && <PostList />}
          {activeTab === "comments" && (
            <CommentList onCountsUpdate={handleCommentCountsUpdate} />
          )}
        </div>
      </section>
    </div>
  );
}
