# Handoff Report: Requirement R3 — Admin Media Library CMS & PostEditor Integration Survey

## 1. Observation

### Obs 1.1: Admin Dashboard Navigation Structure (`src/app/admin/page.tsx`)
- In `src/app/admin/page.tsx` (lines 34–35), the active tab state is defined as:
  ```typescript
  // Active Tab: "posts" | "comments" | "subscribers"
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "subscribers">("posts");
  ```
- Lines 279–335 show the unified tab bar switcher with Lucide icons (`Layers`, `MessageSquare`, `Users`), badge counts, and active tab styling:
  ```tsx
  <button
    type="button"
    onClick={() => setActiveTab("posts")}
    className={`flex items-center gap-2.5 pb-3 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
      activeTab === "posts"
        ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
        : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
    }`}
  >
  ```
- Lines 337–346 show the tab content switcher:
  ```tsx
  <div className="pt-2">
    {activeTab === "posts" && <PostList />}
    {activeTab === "comments" && (
      <CommentList onCountsUpdate={handleCommentCountsUpdate} />
    )}
    {activeTab === "subscribers" && (
      <SubscriberList onCountsUpdate={handleSubscriberCountsUpdate} />
    )}
  </div>
  ```
- Lines 21–31 define `AdminMetrics`. The dashboard displays 5 summary cards: Total Artikel, Artikel Draf, Komentar Pending, Komentar Spam, and Pelanggan Newsletter.

### Obs 1.2: PostEditor State & Textarea Management (`src/components/admin/PostEditor.tsx`)
- File location: `src/components/admin/PostEditor.tsx`. (There is no `PostEditor` under `src/components/blog/`).
- Markdown content state (lines 76–78):
  ```typescript
  const [content, setContent] = useState(
    initialPost?.content || "## Pendahuluan\n\nTulis konten artikel Anda di sini..."
  );
  ```
- Textarea implementation (lines 659–674):
  ```tsx
  <textarea
    value={content}
    onChange={(e) => {
      setContent(e.target.value);
      if (fieldErrors.content) { ... }
    }}
    rows={20}
    placeholder="Tulis artikel dengan sintaks Markdown (heading ##, list -, code ```)..."
    className="w-full font-mono text-sm leading-relaxed p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[480px] resize-y"
  />
  ```
  **Direct Observation**: The `<textarea>` does NOT currently attach a `ref`. To read or manipulate the cursor position (`selectionStart`, `selectionEnd`) or insert text at the cursor position, a `useRef<HTMLTextAreaElement>(null)` must be added.

### Obs 1.3: Cover Image Handling & URL Validation Incompatibility
- In `src/components/admin/PostEditor.tsx` (lines 79, 459–490):
  `coverImage` is stored as `string` and managed via a text input:
  ```tsx
  <Input
    label="URL Gambar Sampul (Opsional)"
    placeholder="https://images.unsplash.com/photo-..."
    value={coverImage}
    onChange={(e) => setCoverImage(e.target.value)}
    error={fieldErrors.coverImage}
  />
  ```
- Client-side validation in `PostEditor.tsx` (lines 205–211):
  ```typescript
  if (coverImage && coverImage.trim()) {
    try {
      new URL(coverImage.trim());
    } catch {
      errors.coverImage = "Format URL gambar sampul tidak valid (harus diawali http:// atau https://)";
    }
  }
  ```
- Server-side validation in `src/lib/validations.ts` (lines 53–59 in `PostAdminSchema`):
  ```typescript
  coverImage: z
    .string()
    .trim()
    .url("URL gambar tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  ```
  **Direct Observation**: Both the client-side `new URL()` validation and the backend `z.string().url()` validation strictly enforce protocol-based absolute URLs (e.g. `http://` or `https://`). A local uploaded media path like `/uploads/1731429812-sample.png` fails `new URL(...)` (throws TypeError) and fails `z.string().url()`!
  This is a critical incompatibility that must be updated in both `PostEditor.tsx` and `src/lib/validations.ts` to allow relative paths starting with `/uploads/`.

### Obs 1.4: Existing UI System, Tokens, Icons & Modal Patterns
- UI primitives exist in `src/components/ui/`: `Button` (variants: `primary`, `secondary`, `outline`, `ghost`, `danger`), `Badge` (variants: `default`, `secondary`, `success`, `warning`, `danger`), `Card`, `CardContent`, `Input`, `Textarea`.
- Icons: `lucide-react` is used throughout the admin dashboard (e.g. `FileText`, `Layers`, `MessageSquare`, `Users`, `Image` as `ImageIcon`, `Sparkles`, `RefreshCw`, `Loader2`, `CheckCircle`, `AlertCircle`, `Trash2`, `Copy`, `Plus`, `Search`, `X`).
- Modals: `src/components/admin/CommentReplyModal.tsx` demonstrates the established modal pattern:
  Backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200`.
  Dialog card: `relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden`.
  Closes on Escape key and backdrop click; keyboard accessible.
- Notification alerts: In-line dismissible cards using `bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800` (success) and `bg-rose-50 dark:bg-rose-950/40 text-rose-800` (error).

### Obs 1.5: Test Suite Baseline
- Executed `npm.cmd test` (Vitest v5.1.0). Result: `Test Files: 14 passed (14)`, `Tests: 236 passed (236)` in 47.75s.
- Existing tests cover posts, comments, subscribers, validations, auth, SEO, newsletter, and likes.

---

## 2. Logic Chain

1. **Tab Integration**:
   - Because `AdminDashboardPage` uses a simple `activeTab` state (`"posts" | "comments" | "subscribers"`), adding `"media"` to the type union (`"posts" | "comments" | "subscribers" | "media"`) allows seamless switching without altering routing or layout.
   - Adding a tab button with `ImageIcon` and `"Pustaka Media"` matches existing styling precisely.

2. **Media Library Component Architecture (`src/components/admin/MediaLibrary.tsx`)**:
   - Following `PostList.tsx` and `SubscriberList.tsx`, `MediaLibrary.tsx` should be a self-contained client component that fetches data from `GET /api/admin/media`.
   - The UI requires:
     a. **Upload Zone / Header Action**:
        - Drag-and-drop area + button to trigger file input (`accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"`).
        - Pre-upload validation: reject files > 5MB or non-whitelisted MIME types client-side with immediate feedback.
        - Send `multipart/form-data` to `POST /api/admin/media/upload`.
     b. **Search & Filter**:
        - Search input to filter media files by name.
        - Refresh button to re-fetch media files.
     c. **Responsive Grid Gallery**:
        - `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`.
        - Thumbnail with `aspect-video` or `h-36`, `object-cover`.
        - Metadata display: filename, human-readable size (e.g. `formatBytes(file.size)`: B, KB, MB), upload date formatted via `Intl.DateTimeFormat("id-ID", ...)`.
     d. **Action Buttons per Item**:
        - **Salin URL**: Copies `/uploads/<filename>` to clipboard via `navigator.clipboard.writeText(...)` with 2-second visual checkmark feedback.
        - **Salin Snippet Markdown**: Copies `![<alt>](/uploads/<filename>)` to clipboard with 2-second visual checkmark feedback.
        - **Hapus**: Triggers a delete confirmation modal (`MediaDeleteModal`).

3. **Delete Confirmation Modal (`src/components/admin/MediaDeleteModal.tsx`)**:
   - Rather than relying solely on native `window.confirm`, a modal following the `CommentReplyModal` pattern gives a high-quality CMS experience.
   - Shows image preview, filename, file size, and warns that existing articles referencing this image might display broken links.
   - On confirmation, calls `DELETE /api/admin/media/[id]` (or query parameter), reloads media list, and shows success banner.

4. **PostEditor Cursor-Position Image Insertion (`src/components/admin/PostEditor.tsx`)**:
   - Adding `const textareaRef = useRef<HTMLTextAreaElement>(null);` to the markdown textarea enables programmatic inspection of `selectionStart` and `selectionEnd`.
   - Insertion algorithm:
     ```typescript
     const insertMarkdownAtCursor = (markdownSnippet: string) => {
       const textarea = textareaRef.current;
       if (!textarea) {
         setContent((prev) => prev + "\n\n" + markdownSnippet);
         return;
       }
       const start = textarea.selectionStart ?? content.length;
       const end = textarea.selectionEnd ?? content.length;
       const next = content.substring(0, start) + markdownSnippet + content.substring(end);
       setContent(next);
       setTimeout(() => {
         textarea.focus();
         const newPos = start + markdownSnippet.length;
         textarea.setSelectionRange(newPos, newPos);
       }, 0);
     };
     ```
   - An editor toolbar above the textarea provides an "Unggah Gambar" button and a "Pilih dari Pustaka" button.
   - Drag-and-drop listener on the textarea container: `onDragOver`, `onDragLeave`, `onDrop`. When an image file is dropped, it uploads immediately to `/api/admin/media/upload` and inserts `![alt](/uploads/filename)` at the cursor position.

5. **Cover Image Selection & Direct Upload Integration**:
   - Provide two action buttons next to the `coverImage` input:
     - **Pilih dari Pustaka Media**: Opens `MediaSelectModal`. Clicking any image sets `coverImage` to `/uploads/<filename>` and closes the modal.
     - **Unggah Sampul**: Dedicated file upload input that uploads the file and automatically fills `coverImage`.
   - Visual Thumbnail Preview:
     - If `coverImage` has a value, render a 16:9 preview box with an `<img>` tag and a "Hapus Sampul" button.
   - **Critical Validation Fix**:
     - In `PostEditor.tsx`:
       ```typescript
       if (coverImage && coverImage.trim()) {
         const val = coverImage.trim();
         const isLocal = val.startsWith("/uploads/");
         if (!isLocal) {
           try {
             new URL(val);
           } catch {
             errors.coverImage = "Format URL tidak valid (harus diawali /uploads/ atau http:// atau https://)";
           }
         }
       }
       ```
     - In `src/lib/validations.ts` (`PostAdminSchema`):
       ```typescript
       coverImage: z
         .string()
         .trim()
         .refine(
           (val) => !val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val),
           { message: "URL gambar sampul harus diawali /uploads/ atau http:// atau https://" }
         )
         .optional()
         .nullable()
         .or(z.literal("")),
       ```

6. **Media Selector Modal (`src/components/admin/MediaSelectModal.tsx`)**:
   - Reusable modal dialog for selecting an image from the library while writing inside `PostEditor`.
   - Can be used both for selecting the `coverImage` and for selecting an image to insert into Markdown at cursor position.

---

## 3. Caveats

1. **Next.js Static Serving (`public/uploads`)**:
   - In Next.js, files written to `public/uploads/` during runtime in development mode (`next dev`) are served by Next.js static asset server.
   - Ensure the image URLs returned by `/api/admin/media/upload` always start with `/uploads/` (not `public/uploads/`).
2. **Client-side Image Caching**:
   - If a file with the same name was deleted and replaced, browser caching could show an old image. However, since Requirement R1 specifies unique filenames (timestamps/UUIDs), filename collisions will not occur.
3. **SVG Rendering Safety**:
   - SVGs may contain `<script>` tags if not sanitized. While this is primarily handled by the storage/upload validation (R1), the UI should render SVGs via `<img>` tags (`<img src="/uploads/..." alt="..." />`), which prevents inline script execution in modern browsers.

---

## 4. Conclusion

The existing codebase layout and design system are well-organized and primed for Requirement R3.
The recommended component implementation plan is:

1. **`src/components/admin/MediaLibrary.tsx`**:
   - The primary component for the "Pustaka Media" tab.
   - Includes upload zone (drag-and-drop & button), search bar, refresh button, grid gallery, file size & date formatters, copy public URL button, copy Markdown snippet button, and delete trigger.
2. **`src/components/admin/MediaDeleteModal.tsx`**:
   - Confirmation dialog for deleting media files, preventing accidental deletion.
3. **`src/components/admin/MediaSelectModal.tsx`**:
   - Modal image picker used inside `PostEditor.tsx` to select existing media for `coverImage` or Markdown insertion.
4. **`src/app/admin/page.tsx` Updates**:
   - Add `"media"` to `activeTab` union type.
   - Add tab button in navigation with `ImageIcon` and badge count.
   - Render `<MediaLibrary onCountUpdate={...} />` when activeTab is `"media"`.
5. **`src/components/admin/PostEditor.tsx` Updates**:
   - Add `textareaRef = useRef<HTMLTextAreaElement>(null)`.
   - Add `insertMarkdownAtCursor` helper.
   - Add editor toolbar above textarea with "Unggah Gambar" button and "Pilih dari Pustaka" button.
   - Add drag-and-drop handlers (`onDragOver`, `onDragLeave`, `onDrop`) to the editor.
   - Add "Pilih dari Pustaka Media" and "Unggah Sampul" buttons to the `coverImage` field with visual preview card.
   - Fix `validateForm()` to allow `/uploads/...` relative paths for `coverImage`.
6. **`src/lib/validations.ts` Coordination**:
   - Coordinate with backend agent to adjust `PostAdminSchema.coverImage` refinement to support `/uploads/...`.

---

## 5. Verification Method

1. **Vitest Baseline Test**:
   ```powershell
   npm.cmd test
   ```
   *Expected*: All 236 tests pass without regression.
2. **New Media Validation & Integration Tests**:
   - Once implementers build R1, R2, and R3, run `npm.cmd test` to ensure new tests pass alongside the 236 baseline tests.
3. **TypeScript & Next.js Production Build**:
   ```powershell
   npm.cmd run build
   ```
   *Expected*: Build completes with exit code 0 and zero TypeScript or Next.js compiler errors.
4. **Files to Inspect for Verification**:
   - `src/app/admin/page.tsx` — Verify tab switching and media badge count.
   - `src/components/admin/MediaLibrary.tsx` — Verify gallery rendering, copy URL, copy Markdown snippet, and delete modal.
   - `src/components/admin/PostEditor.tsx` — Verify textarea cursor insertion, toolbar buttons, drag-and-drop, and cover image picker.
   - `src/lib/validations.ts` — Verify `coverImage` schema accepts `/uploads/...`.
