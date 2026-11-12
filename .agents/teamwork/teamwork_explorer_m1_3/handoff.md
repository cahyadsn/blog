# Handoff Report: Admin CMS UI & PostEditor Media Integration Blueprint (Milestone 1, Agent 3)

**Author**: teamwork_explorer (Milestone 1, Agent 3)  
**State Folder**: `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_3`  
**Date**: 2026-11-12T17:10:00Z  
**Target Files**:
1. `src/app/admin/page.tsx`
2. `src/components/admin/MediaLibrary.tsx`
3. `src/components/admin/MediaDeleteModal.tsx`
4. `src/components/admin/MediaSelectModal.tsx`
5. `src/components/admin/PostEditor.tsx`

---

## 1. Observation

### 1.1 Existing Admin Dashboard Structure (`src/app/admin/page.tsx`)
- **Direct Inspection**: `src/app/admin/page.tsx:35` defines:
  ```typescript
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "subscribers">("posts");
  ```
- **Metrics State**: `src/app/admin/page.tsx:21-31` specifies `AdminMetrics` containing post, comment, and subscriber counters, but currently lacks `totalMedia: number`.
- **Fetch Logic**: `src/app/admin/page.tsx:53-119` fetches metrics in parallel using `Promise.all` across `/api/admin/posts`, `/api/admin/comments`, and `/api/admin/subscribers`.
- **Tab Switcher**: Lines 280-335 render tab buttons for `"posts"`, `"comments"`, and `"subscribers"`.
- **Tab Content**: Lines 338-346 conditionally render `<PostList />`, `<CommentList />`, and `<SubscriberList />`.
- **Icons**: Lines 9-19 import Lucide icons. `ImageIcon` (`Image as ImageIcon`) is not yet imported in `admin/page.tsx`.

### 1.2 Existing PostEditor Structure (`src/components/admin/PostEditor.tsx`)
- **Direct Inspection**: `src/components/admin/PostEditor.tsx:73-83` defines form states (`title`, `slug`, `excerpt`, `content`, `coverImage`, `published`, `tags`, `tagInput`).
- **Textarea Element**: `src/components/admin/PostEditor.tsx:660-675` renders a plain `<textarea>` for markdown content without a `ref` (`textareaRef`).
- **Cursor Insertion**: Currently no mechanism exists to calculate cursor position (`selectionStart`, `selectionEnd`) or insert snippets at the cursor.
- **Image Tooling**: No buttons exist to upload images or pick existing images from media storage.
- **Drag-and-Drop**: The textarea has no `onDragOver`, `onDragLeave`, or `onDrop` event listeners for files.
- **Cover Image Input**: Lines 459-491 render a basic text input with `Input label="URL Gambar Sampul (Opsional)"`. There is no visual thumbnail preview, direct file upload button, or library picker.
- **Cover Image Validation**: Lines 205-211 enforce:
  ```typescript
  if (coverImage && coverImage.trim()) {
    try {
      new URL(coverImage.trim());
    } catch {
      errors.coverImage = "Format URL gambar sampul tidak valid (harus diawali http:// atau https://)";
    }
  }
  ```
  This strictly rejects relative `/uploads/...` paths (triggering a validation failure on local media assets).

### 1.3 Modal UI Conventions (`src/components/admin/CommentReplyModal.tsx`)
- **Direct Inspection**: `src/components/admin/CommentReplyModal.tsx:121-132` demonstrates established modal conventions:
  - Overlay: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200`
  - Backdrop dismissal: `onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}`
  - Keyboard accessibility: `window.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen && !isSubmitting) onClose(); })`
  - Accessibility attributes: `role="dialog" aria-modal="true" aria-labelledby="..."`
  - Container: `relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden`

### 1.4 Peer API Contracts (Milestone 1, Agent 2 Handoff & `PROJECT.md`)
- `POST /api/admin/media/upload`:
  - Request: `multipart/form-data` with field `file` (`File` / `Blob`).
  - Response (201 Created):
    ```json
    {
      "success": true,
      "url": "/uploads/1731427200000-abcd-banner.png",
      "media": {
        "name": "1731427200000-abcd-banner.png",
        "url": "/uploads/1731427200000-abcd-banner.png",
        "size": 102400,
        "type": "image/png",
        "createdAt": "2026-11-12T17:00:00.000Z"
      }
    }
    ```
  - Response (400 Bad Request): `{ "success": false, "error": "Pesan error" }`.
- `GET /api/admin/media`:
  - Response (200 OK):
    ```json
    {
      "success": true,
      "media": [
        {
          "name": "1731427200000-abcd-banner.png",
          "url": "/uploads/1731427200000-abcd-banner.png",
          "size": 102400,
          "type": "image/png",
          "createdAt": "2026-11-12T17:00:00.000Z"
        }
      ]
    }
    ```
- `DELETE /api/admin/media/[id]`:
  - Request: Dynamic path parameter `id` = `encodeURIComponent(media.name)`.
  - Response (200 OK): `{ "success": true, "message": "Berkas berhasil dihapus" }`.

---

## 2. Logic Chain

1. **Dashboard Tab Integration (`src/app/admin/page.tsx`)**:
   - *Premise (Observation 1.1)*: `activeTab` only supports `"posts" | "comments" | "subscribers"`.
   - *Inference*: Extending `activeTab` to `"posts" | "comments" | "subscribers" | "media"` allows tab-level switching without altering routing or breaking existing tabs.
   - *Inference*: Querying `fetch("/api/admin/media")` inside `fetchMetrics` populates `totalMedia` in `AdminMetrics`, providing badge feedback `{metrics.totalMedia}` on the tab button and an informational summary card.
   - *Inference*: Conditionally rendering `<MediaLibrary onMediaCountChange={handleMediaCountsUpdate} />` keeps the dashboard responsive to real-time additions and deletions.

2. **Full Client Media Library (`src/components/admin/MediaLibrary.tsx`)**:
   - *Premise (Observation 1.4)*: The backend expects multipart form-data for uploads, returns an array of media metadata for listing, and deletes by filename.
   - *Inference*: Client-side pre-validation (validating MIME against `["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]` and file size `<= 5MB`) prevents unnecessary server requests and provides instant user feedback.
   - *Inference*: Providing clipboard actions for both raw public URL (`/uploads/...`) and Markdown snippet (`![name](/uploads/...)`) with temporary checkmark visual feedback (`2000ms`) directly satisfies Requirement R3.
   - *Inference*: Separating file deletion into an accessible confirmation modal (`MediaDeleteModal`) prevents catastrophic accidental deletions.

3. **Delete Confirmation Dialog (`src/components/admin/MediaDeleteModal.tsx`)**:
   - *Premise (Observation 1.3)*: Destructive actions in the CMS must follow modal accessibility conventions (`dialog`, `aria-modal`, keyboard escape).
   - *Inference*: Showing a thumbnail preview and metadata inside the dialog reassures the admin of the exact file being removed. Displaying an explicit warning about broken links in published articles ensures informed consent.

4. **Editor Media Selector Dialog (`src/components/admin/MediaSelectModal.tsx`)**:
   - *Premise (Observation 1.2)*: Authors need to pick existing assets or upload new ones without leaving the PostEditor interface.
   - *Inference*: Building a reusable modal picker that displays thumbnails, supports real-time filename search, provides an instant upload button, and passes the selected `MediaItem` back to the editor via `onSelect(media)` satisfies both in-content insertion and cover image selection.

5. **PostEditor Cursor Insertion & Cover Image Support (`src/components/admin/PostEditor.tsx`)**:
   - *Premise (Observation 1.2)*: Textarea lacks cursor tracking, toolbar buttons, drag-and-drop file listeners, and rejects `/uploads/...` paths.
   - *Inference*: Attaching `textareaRef = useRef<HTMLTextAreaElement>(null)` enables calculating `selectionStart` and `selectionEnd`. Inserting `${markdownSnippet}` between `textBefore` and `textAfter` with proper newline padding, then updating cursor position and refocusing the textarea, provides a seamless writing experience.
   - *Inference*: Textarea drag-and-drop listeners (`onDragOver`, `onDragLeave`, `onDrop`) intercept dropped image files, invoke the upload pipeline, and automatically insert markdown at the cursor.
   - *Inference*: Updating `validateForm` to allow strings starting with `/uploads/` alongside HTTP/HTTPS URLs resolves the form rejection bug for local media while continuing to reject invalid strings (`bukan-url-valid`).
   - *Inference*: Adding a 16:9 preview container (`aspect-video max-w-md`) with a "Hapus Sampul" button allows authors to visually verify and manage cover images.

---

## 3. Caveats

1. **Client-Safe Utilities**:
   - `src/lib/media.ts` contains Node.js modules (`fs`, `path`). Client components (`"use client"`) MUST NOT import Node.js server modules.
   - *Resolution*: Client components use self-contained, client-safe helpers (`formatFileSize` and `formatMediaDate`) defined directly in `MediaLibrary.tsx` and exported for peer client components.
2. **Next.js Image vs Standard `<img>`**:
   - Using Next.js `<Image />` on user-uploaded static files can require specific loader configurations or size constraints. Using native `<img>` with `loading="lazy"` and `onError` fallback inside administrative panels guarantees 100% reliable rendering without optimization overhead.
3. **Double Encoding on Delete**:
   - Filenames may contain hyphens, numbers, or slugs. Passing `encodeURIComponent(media.name)` to `/api/admin/media/${encodeURIComponent(name)}` ensures clean URL routing without path traversal false-positives.
4. **Markdown Cursor Restoration**:
   - React state update (`setContent`) is asynchronous. Refocusing and setting `setSelectionRange` inside `setTimeout(..., 0)` guarantees the DOM textarea has updated its value before cursor placement.

---

## 4. Conclusion & Production Blueprint

Below are the exact, production-ready code blueprints for all 5 files.

### 4.1 `src/app/admin/page.tsx`
```tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostList } from "@/components/admin/PostList";
import { CommentList, CommentCounts } from "@/components/admin/CommentList";
import { SubscriberList } from "@/components/admin/SubscriberList";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import {
  FileText,
  EyeOff,
  Clock,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Layers,
  Users,
  Image as ImageIcon,
} from "lucide-react";

interface AdminMetrics {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalComments: number;
  pendingComments: number;
  approvedComments: number;
  spamComments: number;
  totalSubscribers: number;
  activeSubscribers: number;
  totalMedia: number;
}

export default function AdminDashboardPage() {
  // Active Tab: "posts" | "comments" | "subscribers" | "media"
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "subscribers" | "media">("posts");

  // Metrics State
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalComments: 0,
    pendingComments: 0,
    approvedComments: 0,
    spamComments: 0,
    totalSubscribers: 0,
    activeSubscribers: 0,
    totalMedia: 0,
  });

  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);

  // Fetch summary metrics from posts, comments, subscribers, and media APIs
  const fetchMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const [postsRes, commentsRes, subscribersRes, mediaRes] = await Promise.all([
        fetch("/api/admin/posts?status=all"),
        fetch("/api/admin/comments?status=ALL"),
        fetch("/api/admin/subscribers"),
        fetch("/api/admin/media"),
      ]);

      const [postsData, commentsData, subscribersData, mediaData] = await Promise.all([
        postsRes.json(),
        commentsRes.json(),
        subscribersRes.json(),
        mediaRes.ok ? mediaRes.json().catch(() => ({ success: false, media: [] })) : { success: false, media: [] },
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

      const totalSubscribers =
        subscribersData.success && typeof subscribersData.totalCount === "number"
          ? subscribersData.totalCount
          : Array.isArray(subscribersData.subscribers)
          ? subscribersData.subscribers.length
          : 0;

      const activeSubscribers =
        subscribersData.success && typeof subscribersData.activeCount === "number"
          ? subscribersData.activeCount
          : Array.isArray(subscribersData.subscribers)
          ? subscribersData.subscribers.filter((s: { active: boolean }) => s.active).length
          : 0;

      const totalMedia =
        mediaData.success && Array.isArray(mediaData.media)
          ? mediaData.media.length
          : 0;

      setMetrics({
        totalPosts,
        publishedPosts,
        draftPosts,
        totalComments,
        pendingComments,
        approvedComments,
        spamComments,
        totalSubscribers,
        activeSubscribers,
        totalMedia,
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

  // Callback to sync subscriber count updates from SubscriberList
  const handleSubscriberCountsUpdate = (counts: { total: number; active: number }) => {
    setMetrics((prev) => ({
      ...prev,
      totalSubscribers: counts.total,
      activeSubscribers: counts.active,
    }));
  };

  // Callback to sync media count updates from MediaLibrary
  const handleMediaCountsUpdate = (count: number) => {
    setMetrics((prev) => ({
      ...prev,
      totalMedia: count,
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

          {/* Card 5: Pelanggan Newsletter */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pelanggan Newsletter
                </p>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {isLoadingMetrics ? "..." : metrics.totalSubscribers}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {metrics.activeSubscribers} pelanggan aktif
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Pustaka Media */}
          <Card className="hover:border-violet-300 dark:hover:border-violet-800 transition-all">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pustaka Media
                </p>
                <div className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                  {isLoadingMetrics ? "..." : metrics.totalMedia}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Berkas gambar aktif
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-sm">
                <ImageIcon className="w-6 h-6" />
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

          <button
            type="button"
            onClick={() => setActiveTab("subscribers")}
            className={`flex items-center gap-2.5 pb-3 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "subscribers"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pelanggan Newsletter</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
              {metrics.totalSubscribers}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-2.5 pb-3 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "media"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Pustaka Media</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
              {metrics.totalMedia}
            </Badge>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="pt-2">
          {activeTab === "posts" && <PostList />}
          {activeTab === "comments" && (
            <CommentList onCountsUpdate={handleCommentCountsUpdate} />
          )}
          {activeTab === "subscribers" && (
            <SubscriberList onCountsUpdate={handleSubscriberCountsUpdate} />
          )}
          {activeTab === "media" && (
            <MediaLibrary onMediaCountChange={handleMediaCountsUpdate} />
          )}
        </div>
      </section>
    </div>
  );
}
```

---

### 4.2 `src/components/admin/MediaLibrary.tsx`
```tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MediaDeleteModal } from "@/components/admin/MediaDeleteModal";
import {
  UploadCloud,
  Search,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileCode,
  HardDrive,
  X,
} from "lucide-react";

export interface MediaItem {
  name: string;
  url: string;
  size: number;
  type?: string;
  createdAt?: string | Date;
}

export interface MediaLibraryProps {
  onMediaCountChange?: (count: number) => void;
}

/**
 * Client-safe file size formatter
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Client-safe Indonesian date formatter
 */
export function formatMediaDate(dateStr?: string | Date): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "-";
  }
}

export function MediaLibrary({ onMediaCountChange }: MediaLibraryProps) {
  // Media items state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Uploading state & drag drop
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<"url" | "markdown" | null>(null);

  // Delete modal state
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);

  // Fetch media from server
  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat daftar pustaka media");
      }
      const list = Array.isArray(data.media) ? data.media : [];
      setMediaList(list);
      if (onMediaCountChange) {
        onMediaCountChange(list.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat berkas";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [onMediaCountChange]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Client-side file validation and upload execution
  const processUploadFile = async (file: File) => {
    setUploadError(null);
    setSuccessNotice(null);

    // Whitelist check
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Tipe berkas tidak didukung. Harap unggah PNG, JPEG, WebP, GIF, atau SVG.");
      return;
    }

    // Size check (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`Ukuran berkas (${formatFileSize(file.size)}) melebihi batas maksimum 5MB.`);
      return;
    }

    if (file.size === 0) {
      setUploadError("Berkas gambar tidak boleh kosong (0 bytes).");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengunggah berkas");
      }

      setSuccessNotice(`Berkas "${data.media?.name || file.name}" berhasil diunggah!`);
      
      // Prepend newly uploaded item to list
      setMediaList((prev) => {
        const updated = [data.media, ...prev];
        if (onMediaCountChange) {
          onMediaCountChange(updated.length);
        }
        return updated;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle direct file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadFile(files[0]);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadFile(files[0]);
    }
  };

  // Copy Public URL
  const handleCopyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.name);
    setCopiedType("url");
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  // Copy Markdown Snippet
  const handleCopyMarkdown = (item: MediaItem) => {
    const snippet = `![${item.name}](${item.url})`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(item.name);
    setCopiedType("markdown");
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  // Confirm delete handler called from modal
  const handleConfirmDelete = async (item: MediaItem) => {
    const res = await fetch(`/api/admin/media/${encodeURIComponent(item.name)}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Gagal menghapus berkas");
    }

    setMediaList((prev) => {
      const updated = prev.filter((m) => m.name !== item.name);
      if (onMediaCountChange) {
        onMediaCountChange(updated.length);
      }
      return updated;
    });

    setSuccessNotice(`Berkas "${item.name}" berhasil dihapus.`);
    setMediaToDelete(null);
  };

  // Filter media items by search query
  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) return mediaList;
    const query = searchQuery.toLowerCase().trim();
    return mediaList.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        (m.type && m.type.toLowerCase().includes(query))
    );
  }, [mediaList, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Pustaka Media & Unggah Gambar
            </h2>
            <Badge variant="secondary" className="text-xs">
              {mediaList.length} berkas
            </Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Kelola gambar lokal, salin URL publik, atau gunakan snippet Markdown langsung ke artikel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchMedia}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mengunggah...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Unggah Gambar</span>
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs font-semibold">{successNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {(errorMessage || uploadError) && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <p className="text-xs font-semibold">{uploadError || errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setUploadError(null);
            }}
            className="text-rose-600 hover:text-rose-800 dark:hover:text-rose-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.005]"
            : "border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-gray-50/50 dark:bg-gray-900/50"
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {isUploading ? "Sedang Mengunggah Berkas..." : "Tarik & Lepaskan Gambar di Sini"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            atau klik untuk memilih berkas dari komputer Anda. Mendukung PNG, JPEG, WebP, GIF, dan SVG (Maks. 5MB)
          </p>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Cari gambar berdasarkan nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <HardDrive className="w-3.5 h-3.5" />
          <span>
            Menampilkan {filteredMedia.length} dari {mediaList.length} media
          </span>
        </div>
      </div>

      {/* Media Grid / Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-xs">Memuat berkas media...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <Card className="text-center p-12">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {searchQuery ? "Tidak Ada Gambar Ditemukan" : "Pustaka Media Masih Kosong"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ada berkas yang cocok dengan kata kunci "${searchQuery}". Coba gunakan kata kunci lain.`
                : "Unggah gambar pertama Anda untuk disematkan ke dalam artikel blog."}
            </p>
            {searchQuery && (
              <Button type="button" variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Reset Pencarian
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <Card
              key={item.name}
              className="overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail Preview */}
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center border-b border-gray-100 dark:border-gray-800">
                  <img
                    src={item.url}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Extension Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                      {item.name.split(".").pop() || "IMG"}
                    </Badge>
                  </div>
                </div>

                {/* Info Metadata */}
                <div className="p-3.5 space-y-1">
                  <p
                    className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(item.size)}</span>
                    <span>{formatMediaDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-1.5">
                {/* Copy URL */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyUrl(item)}
                  className="flex-1 text-[11px] py-1 px-1.5 h-8 gap-1"
                  title="Salin tautan publik gambar"
                >
                  {copiedId === item.name && copiedType === "url" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>URL</span>
                    </>
                  )}
                </Button>

                {/* Copy Markdown */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyMarkdown(item)}
                  className="flex-1 text-[11px] py-1 px-1.5 h-8 gap-1"
                  title="Salin sintaks Markdown gambar"
                >
                  {copiedId === item.name && copiedType === "markdown" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Markdown</span>
                    </>
                  )}
                </Button>

                {/* Delete Trigger */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMediaToDelete(item)}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 h-8"
                  title="Hapus berkas dari server"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <MediaDeleteModal
        isOpen={Boolean(mediaToDelete)}
        media={mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}

export default MediaLibrary;
```

---

### 4.3 `src/components/admin/MediaDeleteModal.tsx`
```tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MediaItem, formatFileSize, formatMediaDate } from "@/components/admin/MediaLibrary";
import {
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";

export interface MediaDeleteModalProps {
  isOpen: boolean;
  media: MediaItem | null;
  onClose: () => void;
  onConfirmDelete: (media: MediaItem) => Promise<void>;
}

export function MediaDeleteModal({
  isOpen,
  media,
  onClose,
  onConfirmDelete,
}: MediaDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset errors when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsDeleting(false);
    }
  }, [isOpen, media]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !media) {
    return null;
  }

  const handleDelete = async () => {
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await onConfirmDelete(media);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus berkas";
      setErrorMessage(msg);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-delete-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="media-delete-title"
                className="text-base font-bold text-gray-900 dark:text-gray-100"
              >
                Hapus Berkas Media
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Konfirmasi penghapusan permanen dari server
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Target Image Preview Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
            <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
              <img
                src={media.url}
                alt={media.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate" title={media.name}>
                {media.name}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {formatFileSize(media.size)} &bull; {formatMediaDate(media.createdAt)}
              </p>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Peringatan:</span> Berkas ini akan dihapus permanen dari direktori server. Artikel yang menyematkan gambar ini mungkin menampilkan gambar rusak.
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Berkas</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaDeleteModal;
```

---

### 4.4 `src/components/admin/MediaSelectModal.tsx`
```tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MediaItem, formatFileSize, formatMediaDate } from "@/components/admin/MediaLibrary";
import {
  X,
  Search,
  Check,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export interface MediaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  title?: string;
  description?: string;
}

export function MediaSelectModal({
  isOpen,
  onClose,
  onSelect,
  title = "Pilih Gambar dari Pustaka Media",
  description = "Pilih gambar yang sudah ada atau unggah gambar baru untuk disematkan",
}: MediaSelectModalProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch media from server
  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat pustaka media");
      }
      setMediaList(Array.isArray(data.media) ? data.media : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat media";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelectedMedia(null);
      setSearchQuery("");
      setErrorMessage(null);
    }
  }, [isOpen, fetchMedia]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  // Direct upload inside select modal
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Tipe berkas tidak didukung. Harap unggah PNG, JPEG, WebP, GIF, atau SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Ukuran berkas melebihi batas 5MB.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengunggah gambar");
      }

      // Add to list and preselect
      setMediaList((prev) => [data.media, ...prev]);
      setSelectedMedia(data.media);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmSelect = () => {
    if (selectedMedia) {
      onSelect(selectedMedia);
      onClose();
    }
  };

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return mediaList;
    const q = searchQuery.toLowerCase().trim();
    return mediaList.filter((m) => m.name.toLowerCase().includes(q));
  }, [mediaList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-select-title"
    >
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="media-select-title" className="text-base font-bold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari berkas gambar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchMedia}
              disabled={isLoading}
              title="Segarkan daftar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Unggah Baru</span>
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={handleDirectUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Grid Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">Memuat galeri media...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {searchQuery ? "Tidak ada gambar yang cocok" : "Belum ada berkas media"}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Gunakan tombol &quot;Unggah Baru&quot; di atas untuk menambahkan berkas gambar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredList.map((item) => {
                const isSelected = selectedMedia?.name === item.name;
                return (
                  <div
                    key={item.name}
                    onClick={() => setSelectedMedia(item)}
                    onDoubleClick={() => {
                      setSelectedMedia(item);
                      onSelect(item);
                      onClose();
                    }}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all flex flex-col group ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-500/30 shadow-md"
                        : "border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800/80">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatFileSize(item.size)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-sm">
            {selectedMedia ? (
              <span>Terpilih: <strong className="text-gray-900 dark:text-gray-100">{selectedMedia.name}</strong></span>
            ) : (
              <span>Pilih salah satu gambar dari galeri di atas</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!selectedMedia}
              onClick={handleConfirmSelect}
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Gunakan Gambar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaSelectModal;
```

---

### 4.5 `src/components/admin/PostEditor.tsx`
Full replacement blueprint incorporating cursor insertion, toolbar buttons, drag-and-drop file upload, cover image picker/upload, 16:9 thumbnail preview with deletion, and harmonized `/uploads/...` URL validation:

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { generateSlug } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MediaSelectModal } from "@/components/admin/MediaSelectModal";
import { MediaItem } from "@/components/admin/MediaLibrary";
import {
  Sparkles,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  FileCode,
  Columns,
  X,
  Plus,
  Loader2,
  Image as ImageIcon,
  BookOpen,
  Upload,
  FolderOpen,
  Trash2,
} from "lucide-react";

export interface PostTagItem {
  tag?: {
    id?: string;
    name: string;
    slug?: string;
  };
  name?: string;
}

export interface PostItem {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  published: boolean;
  readingTime?: number;
  publishedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  tags?: Array<PostTagItem | string>;
  _count?: {
    comments: number;
  };
}

export interface PostEditorProps {
  initialPost?: PostItem | null;
  onSave?: (savedPost: PostItem) => void;
  onCancel?: () => void;
}

export function PostEditor({ initialPost, onSave, onCancel }: PostEditorProps) {
  // Extract initial tag names from initialPost
  const initialTagNames: string[] = React.useMemo(() => {
    if (!initialPost?.tags) return [];
    return initialPost.tags
      .map((t) => {
        if (typeof t === "string") return t;
        return t.tag?.name || t.name || "";
      })
      .filter(Boolean);
  }, [initialPost]);

  // Form states
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [content, setContent] = useState(
    initialPost?.content || "## Pendahuluan\n\nTulis konten artikel Anda di sini..."
  );
  const [coverImage, setCoverImage] = useState(initialPost?.coverImage || "");
  const [published, setPublished] = useState(initialPost?.published ?? true);
  const [tags, setTags] = useState<string[]>(initialTagNames);
  const [tagInput, setTagInput] = useState("");

  // Editor layout view: "split" (dual pane) | "editor" | "preview"
  const [activeTab, setActiveTab] = useState<"split" | "editor" | "preview">("split");

  // Markdown live preview rendered HTML
  const [previewHtml, setPreviewHtml] = useState<string>("");

  // UI state: loading, error messages, field errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Media upload & cursor refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // In-flight media upload states
  const [isUploadingEditorImage, setIsUploadingEditorImage] = useState<boolean>(false);
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState<boolean>(false);
  const [isDragOverTextarea, setIsDragOverTextarea] = useState<boolean>(false);
  const [coverImageLoadError, setCoverImageLoadError] = useState<boolean>(false);

  // Modal selector state
  const [isMediaSelectOpen, setIsMediaSelectOpen] = useState<boolean>(false);
  const [mediaTarget, setMediaTarget] = useState<"content" | "cover">("content");

  // Configure marked once
  useEffect(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }, []);

  // Live preview parser effect
  useEffect(() => {
    let isMounted = true;
    try {
      const parsed = marked.parse(content || "");
      if (parsed instanceof Promise) {
        parsed
          .then((html) => {
            if (isMounted) setPreviewHtml(html);
          })
          .catch(() => {
            if (isMounted) setPreviewHtml("<p class='text-rose-500'>Gagal merender Markdown.</p>");
          });
      } else {
        setPreviewHtml(parsed);
      }
    } catch {
      if (isMounted) setPreviewHtml("<p class='text-rose-500'>Gagal merender Markdown.</p>");
    }
    return () => {
      isMounted = false;
    };
  }, [content]);

  // Insert markdown snippet at current cursor position in textarea
  const insertMarkdownAtCursor = (markdownSnippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => (prev ? `${prev}\n\n${markdownSnippet}` : markdownSnippet));
      return;
    }

    const startPos = textarea.selectionStart ?? textarea.value.length;
    const endPos = textarea.selectionEnd ?? textarea.value.length;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos);

    const needsLeadingNewline = textBefore.length > 0 && !textBefore.endsWith("\n");
    const needsTrailingNewline = textAfter.length > 0 && !textAfter.startsWith("\n");

    const formattedSnippet =
      (needsLeadingNewline ? "\n\n" : "") +
      markdownSnippet +
      (needsTrailingNewline ? "\n\n" : "");

    const newContent = textBefore + formattedSnippet + textAfter;
    setContent(newContent);

    if (fieldErrors.content) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.content;
        return next;
      });
    }

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + formattedSnippet.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Helper to upload an image file to /api/admin/media/upload
  const uploadImageFile = async (file: File): Promise<MediaItem | null> => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setGeneralError(`Tipe berkas "${file.name}" tidak didukung. Harap unggah PNG, JPEG, WebP, GIF, atau SVG.`);
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      setGeneralError(`Ukuran berkas "${file.name}" melebihi batas maksimum 5MB.`);
      return null;
    }

    if (file.size === 0) {
      setGeneralError(`Berkas "${file.name}" kosong.`);
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/media/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Gagal mengunggah berkas");
    }

    return data.media;
  };

  // Editor toolbar: direct file upload
  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploadingEditorImage(true);
    setGeneralError(null);

    try {
      const uploaded = await uploadImageFile(file);
      if (uploaded) {
        insertMarkdownAtCursor(`![${uploaded.name}](${uploaded.url})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar";
      setGeneralError(`Gagal mengunggah gambar: ${msg}`);
    } finally {
      setIsUploadingEditorImage(false);
      if (editorFileInputRef.current) {
        editorFileInputRef.current.value = "";
      }
    }
  };

  // Editor textarea drag-and-drop upload
  const handleTextareaDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOverTextarea) setIsDragOverTextarea(true);
  };

  const handleTextareaDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverTextarea(false);
  };

  const handleTextareaDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverTextarea(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) return;

    setIsUploadingEditorImage(true);
    setGeneralError(null);

    try {
      for (const file of files) {
        const uploaded = await uploadImageFile(file);
        if (uploaded) {
          insertMarkdownAtCursor(`![${uploaded.name}](${uploaded.url})`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar dropzone";
      setGeneralError(`Gagal mengunggah gambar yang di-drop: ${msg}`);
    } finally {
      setIsUploadingEditorImage(false);
    }
  };

  // Cover image: direct file upload
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploadingCoverImage(true);
    setGeneralError(null);

    try {
      const uploaded = await uploadImageFile(file);
      if (uploaded) {
        setCoverImage(uploaded.url);
        setCoverImageLoadError(false);
        if (fieldErrors.coverImage) {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.coverImage;
            return next;
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar sampul";
      setGeneralError(`Gagal mengunggah gambar sampul: ${msg}`);
    } finally {
      setIsUploadingCoverImage(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  };

  // Callback when an image is selected from MediaSelectModal
  const handleMediaModalSelect = (media: MediaItem) => {
    if (mediaTarget === "cover") {
      setCoverImage(media.url);
      setCoverImageLoadError(false);
      if (fieldErrors.coverImage) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.coverImage;
          return next;
        });
      }
    } else {
      insertMarkdownAtCursor(`![${media.name}](${media.url})`);
    }
    setIsMediaSelectOpen(false);
  };

  // Auto-generate slug from title
  const handleAutoGenerateSlug = () => {
    if (!title.trim()) {
      setFieldErrors((prev) => ({ ...prev, slug: "Masukkan judul terlebih dahulu untuk membuat slug" }));
      return;
    }
    const generated = generateSlug(title);
    setSlug(generated);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.slug;
      return next;
    });
  };

  // Add tag handler
  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, "");
    if (!cleanTag) return;

    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput("");
  };

  // Remove tag handler
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Tag input keydown
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Client-side validation harmonized with /uploads/...
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = "Judul artikel wajib diisi";
    } else if (title.trim().length < 5) {
      errors.title = "Judul artikel minimal 5 karakter";
    } else if (title.trim().length > 200) {
      errors.title = "Judul artikel maksimal 200 karakter";
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slug.trim()) {
      errors.slug = "Slug URL wajib diisi";
    } else if (slug.trim().length < 3) {
      errors.slug = "Slug minimal 3 karakter";
    } else if (slug.trim().length > 120) {
      errors.slug = "Slug maksimal 120 karakter";
    } else if (!slugRegex.test(slug.trim())) {
      errors.slug = "Slug hanya boleh berisi huruf kecil, angka, dan strip (-)";
    }

    if (!excerpt.trim()) {
      errors.excerpt = "Ringkasan (excerpt) wajib diisi";
    } else if (excerpt.trim().length < 10) {
      errors.excerpt = "Ringkasan minimal 10 karakter";
    } else if (excerpt.trim().length > 300) {
      errors.excerpt = "Ringkasan maksimal 300 karakter";
    }

    if (!content.trim()) {
      errors.content = "Konten artikel wajib diisi";
    } else if (content.trim().length < 20) {
      errors.content = "Konten artikel minimal 20 karakter";
    }

    if (coverImage && coverImage.trim()) {
      const trimmed = coverImage.trim();
      const isLocalUpload = trimmed.startsWith("/uploads/");
      const isValidHttpUrl = /^https?:\/\//i.test(trimmed);

      if (!isLocalUpload && !isValidHttpUrl) {
        errors.coverImage = "Format URL gambar sampul tidak valid (harus diawali /uploads/ atau http:// atau https://)";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save handler (POST for create, PUT for update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      setGeneralError("Harap perbaiki kolom yang belum memenuhi syarat sebelum menyimpan.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content: content,
      coverImage: coverImage.trim() || null,
      published: published,
      tags: tags,
    };

    const isEdit = Boolean(initialPost?.id);
    const endpoint = isEdit ? `/api/admin/posts/${initialPost!.id}` : "/api/admin/posts";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setGeneralError(data.error || "Slug sudah digunakan oleh artikel lain. Gunakan slug yang berbeda.");
          setFieldErrors((prev) => ({ ...prev, slug: "Slug sudah digunakan" }));
        } else {
          setGeneralError(data.error || "Terjadi kesalahan saat menyimpan artikel");
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(isEdit ? "Artikel berhasil diperbarui!" : "Artikel berhasil diterbitkan!");
      if (onSave) {
        onSave(data.post);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Koneksi ke server gagal";
      setGeneralError(`Terjadi kesalahan jaringan: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {initialPost?.id ? "Edit Artikel" : "Buat Artikel Baru"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {initialPost?.id
                ? `Mengedit artikel: ${initialPost.title}`
                : "Tulis artikel blog baru dengan format Markdown dan pratinjau live"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Batal
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Simpan Artikel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Gagal Menyimpan</p>
              <p className="text-xs mt-0.5">{generalError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadata Card */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Informasi Artikel
            </h3>

            {/* Title */}
            <div>
              <Input
                label="Judul Artikel *"
                placeholder="Masukkan judul artikel yang menarik..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.title;
                      return next;
                    });
                  }
                }}
                error={fieldErrors.title}
              />
            </div>

            {/* Slug with Auto-generate */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Slug URL *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="contoh-slug-artikel"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                      if (fieldErrors.slug) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.slug;
                          return next;
                        });
                      }
                    }}
                    error={fieldErrors.slug}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleAutoGenerateSlug}
                  title="Generate otomatis dari judul"
                  className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Auto-Slug
                </Button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Alamat URL artikel: <span className="font-mono text-indigo-600 dark:text-indigo-400">/posts/{slug || "..."}</span>
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <Textarea
                label="Ringkasan Singkat (Excerpt) *"
                placeholder="Tulis ringkasan singkat artikel dalam 1-2 kalimat (10–300 karakter)..."
                rows={3}
                value={excerpt}
                onChange={(e) => {
                  setExcerpt(e.target.value);
                  if (fieldErrors.excerpt) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.excerpt;
                      return next;
                    });
                  }
                }}
                error={fieldErrors.excerpt}
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>Minimal 10 karakter</span>
                <span>{excerpt.length}/300 karakter</span>
              </div>
            </div>

            {/* Cover Image Section with 16:9 Preview, Media Selector, & Direct Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Gambar Sampul (Cover Image)
              </label>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="URL gambar (contoh: /uploads/... atau https://...)"
                    value={coverImage}
                    onChange={(e) => {
                      setCoverImage(e.target.value);
                      setCoverImageLoadError(false);
                      if (fieldErrors.coverImage) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.coverImage;
                          return next;
                        });
                      }
                    }}
                    error={fieldErrors.coverImage}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setMediaTarget("cover");
                      setIsMediaSelectOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Pilih dari Pustaka
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={isUploadingCoverImage}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    {isUploadingCoverImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    Unggah Sampul
                  </Button>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 16:9 Thumbnail Preview with Remove Button */}
              {coverImage && (
                <div className="mt-3 relative aspect-video max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 group shadow-sm">
                  {!coverImageLoadError ? (
                    <img
                      src={coverImage}
                      alt="Pratinjau Sampul"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => setCoverImageLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                      <AlertCircle className="w-6 h-6 text-amber-500 mb-1" />
                      <span className="text-xs">Gambar tidak dapat dimuat dari URL ini</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImage("");
                        setCoverImageLoadError(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus Sampul
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Tag / Topik Artikel
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik tag lalu tekan Enter atau koma..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTag()}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </Button>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">Belum ada tag yang ditambahkan</span>
                ) : (
                  tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="inline-flex items-center gap-1.5 pr-1.5 py-1 text-xs"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
                        title="Hapus tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Published Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 mt-4">
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Status Publikasi
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {published
                    ? "Artikel akan langsung dapat diakses dan dibaca oleh publik."
                    : "Artikel disimpan sebagai draf internal (tidak dapat dilihat pembaca)."}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={published ? "success" : "secondary"}>
                  {published ? "Dipublikasikan" : "Draf"}
                </Badge>
                <button
                  type="button"
                  role="switch"
                  aria-checked={published}
                  onClick={() => setPublished(!published)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    published ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      published ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content & Markdown Live Preview Card */}
        <Card>
          <CardContent className="space-y-4">
            {/* View Mode Switcher Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Editor Konten Markdown & Live Preview
                </h3>
              </div>

              {/* View layout selector */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("split")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === "split"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  Split View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === "editor"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Editor Saja
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === "preview"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Pratinjau Saja
                </button>
              </div>
            </div>

            {/* Error Message for Content */}
            {fieldErrors.content && (
              <p className="text-xs text-rose-500 font-medium">{fieldErrors.content}</p>
            )}

            {/* Dual Pane Layout / Tabbed View */}
            <div
              className={
                activeTab === "split"
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
                  : "w-full"
              }
            >
              {/* Left Pane: Markdown Source Textarea */}
              {(activeTab === "split" || activeTab === "editor") && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Markdown Source
                    </span>

                    {/* Editor Action Toolbar */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMediaTarget("content");
                          setIsMediaSelectOpen(true);
                        }}
                        className="h-7 px-2 text-[11px] gap-1"
                        title="Pilih gambar dari pustaka media untuk disisipkan ke posisi kursor"
                      >
                        <FolderOpen className="w-3 h-3 text-indigo-500" />
                        Pilih dari Pustaka
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editorFileInputRef.current?.click()}
                        disabled={isUploadingEditorImage}
                        className="h-7 px-2 text-[11px] gap-1"
                        title="Unggah gambar lokal dan langsung sisipkan ke posisi kursor"
                      >
                        {isUploadingEditorImage ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3 text-emerald-500" />
                        )}
                        Unggah Gambar
                      </Button>
                      <input
                        ref={editorFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={handleEditorImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Textarea with Drag & Drop Listener */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (fieldErrors.content) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.content;
                            return next;
                          });
                        }
                      }}
                      onDragOver={handleTextareaDragOver}
                      onDragLeave={handleTextareaDragLeave}
                      onDrop={handleTextareaDrop}
                      rows={20}
                      placeholder="Tulis artikel dengan sintaks Markdown (heading ##, list -, code ```). Tarik & lepaskan gambar langsung ke area ini untuk mengunggah..."
                      className={`w-full font-mono text-sm leading-relaxed p-4 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[480px] resize-y ${
                        isDragOverTextarea
                          ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20"
                          : "border-gray-300 dark:border-gray-700"
                      }`}
                    />

                    {/* Drag Over Overlay indicator */}
                    {isDragOverTextarea && (
                      <div className="absolute inset-0 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 backdrop-blur-[1px] border-2 border-dashed border-indigo-600 flex items-center justify-center pointer-events-none">
                        <div className="bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          <Upload className="w-4 h-4 animate-bounce" />
                          <span>Lepaskan gambar di sini untuk mengunggah otomatis</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                    <span>Tips: Anda dapat menarik & melepaskan (drag & drop) gambar langsung ke textarea</span>
                    <span>
                      {content.length} karakter &bull; ~
                      {Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200))}{" "}
                      menit baca
                    </span>
                  </div>
                </div>
              )}

              {/* Right Pane: Live Preview Container */}
              {(activeTab === "split" || activeTab === "preview") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      Live Markdown Preview
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      Diperbarui Otomatis
                    </span>
                  </div>
                  <div
                    className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[480px] max-h-[720px] overflow-y-auto shadow-sm prose prose-indigo dark:prose-invert max-w-none text-base leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html:
                        previewHtml ||
                        "<p class='text-gray-400 italic text-sm'>Tulis teks Markdown di editor untuk melihat pratinjau live secara instan...</p>",
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Batal
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {initialPost?.id ? "Perbarui Artikel" : "Terbitkan Artikel"}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Media Selector Modal */}
      <MediaSelectModal
        isOpen={isMediaSelectOpen}
        onClose={() => setIsMediaSelectOpen(false)}
        onSelect={handleMediaModalSelect}
        title={mediaTarget === "cover" ? "Pilih Gambar Sampul Artikel" : "Sisipkan Gambar ke Konten Artikel"}
        description={
          mediaTarget === "cover"
            ? "Pilih gambar dari pustaka media untuk dijadikan sampul artikel (16:9)"
            : "Pilih gambar untuk disisipkan sebagai format Markdown pada posisi kursor"
        }
      />
    </div>
  );
}

export default PostEditor;
```

---

## 5. Verification Method

To independently verify this implementation blueprint once applied by the implementing agent:

1. **Unit and Integration Test Verification**:
   Run the full Vitest suite to ensure all tests pass:
   ```powershell
   npm.cmd test
   ```
   - Target criteria: All 236 existing tests + new media API tests pass with 0 failures.

2. **TypeScript & Production Build Verification**:
   Run Next.js production build:
   ```powershell
   npm.cmd run build
   ```
   - Target criteria: Exit code 0, 0 TypeScript errors, 0 ESLint errors, clean bundle compilation.

3. **Admin Dashboard UI Tab Verification**:
   - Navigate to `/admin`.
   - Verify the "Pustaka Media" tab button is visible with `ImageIcon` and displays the correct count badge.
   - Verify clicking the tab shows `<MediaLibrary />` without reloading or page jump.
   - Verify uploading a file increments the counter in both the summary card and tab badge.

4. **PostEditor Drag-and-Drop & Cursor Insertion Verification**:
   - Navigate to `/admin` -> "Buat Artikel Baru".
   - Place cursor at line 5 of the markdown editor.
   - Click "Unggah Gambar" or "Pilih dari Pustaka".
   - Verify the snippet `![filename](/uploads/...)` is inserted at that exact cursor location, with proper newline spacing, and focus returns to the textarea.
   - Drag an image file from the desktop and drop it directly onto the textarea; verify automatic upload and insertion.
   - In "Gambar Sampul", click "Pilih dari Pustaka", select an image, and verify the 16:9 thumbnail preview appears and form submission succeeds without URL validation errors.

5. **Invalidation Conditions**:
   - If `npm.cmd run build` complains about client components importing Node.js `fs` or `path`: check that `MediaLibrary.tsx` uses the self-contained `formatFileSize` and does not import `@/lib/media`.
   - If `coverImage` rejects `/uploads/...`: check that `validateForm` in `PostEditor.tsx` contains `trimmed.startsWith("/uploads/")`.
