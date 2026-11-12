# Dispatch: Admin CMS UI & PostEditor Integration Blueprint (Milestone 1, Agent 3)

You are a read-only exploration agent (teamwork_explorer).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_explorer_m1_3
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

## Objective
Read ORIGINAL_REQUEST.md and PROJECT.md first. Formulate an exact, production-ready blueprint for the Admin CMS UI and PostEditor integration:
1. `src/app/admin/page.tsx`:
   - Adding `"media"` to `activeTab` union state.
   - Adding "Pustaka Media" tab button with `ImageIcon` and badge count.
   - Rendering `<MediaLibrary />` when `activeTab === "media"`.
2. `src/components/admin/MediaLibrary.tsx`:
   - Complete client component with upload area (drag-and-drop & button, client-side validation), search bar, refresh button.
   - Responsive grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`).
   - Image thumbnail preview, formatted size (KB/MB), formatted date.
   - Copy public URL button (`/uploads/...`) with checkmark feedback.
   - Copy Markdown snippet button (`![filename](/uploads/...)`) with checkmark feedback.
   - Delete button opening confirmation modal.
3. `src/components/admin/MediaDeleteModal.tsx`:
   - Modal confirmation dialog displaying thumbnail preview, filename, and warning.
4. `src/components/admin/MediaSelectModal.tsx`:
   - Image picker modal allowing selection of an existing media item inside PostEditor.
5. `src/components/admin/PostEditor.tsx`:
   - Adding `textareaRef = useRef<HTMLTextAreaElement>(null)`.
   - Adding `insertMarkdownAtCursor(markdownSnippet)`.
   - Editor toolbar with "Unggah Gambar" and "Pilih dari Pustaka".
   - Drag-and-drop upload directly on editor area with automatic markdown insertion at cursor.
   - Cover image section: "Pilih dari Pustaka" modal button, "Unggah Sampul" direct upload button, 16:9 thumbnail preview with "Hapus Sampul".
   - Form validation allowing `/uploads/...` paths.

DO NOT write or modify code directly. Deliver your blueprint and code snippets in `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_3\handoff.md`.
Use send_message to notify the orchestrator when finished.


## 2026-11-12T17:01:25Z
You are a read-only exploration agent (teamwork_explorer).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_explorer_m1_3
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

Follow all instructions in d:\c\blog\.agents\teamwork\teamwork_explorer_m1_3\DISPATCH.md.
Read ORIGINAL_REQUEST.md and PROJECT.md first. Formulate an exact, production-ready blueprint for the Admin CMS UI and PostEditor integration:
1. src/app/admin/page.tsx: adding "media" to activeTab union state, tab button with ImageIcon and badge count, rendering <MediaLibrary /> when activeTab === "media".
2. src/components/admin/MediaLibrary.tsx: full client component with upload area (drag-and-drop & button, client-side validation), search bar, refresh button, responsive grid, thumbnail preview, formatted size (KB/MB), formatted date, copy URL button, copy Markdown snippet button, delete confirmation trigger.
3. src/components/admin/MediaDeleteModal.tsx: accessible modal confirmation dialog with image preview and delete warning.
4. src/components/admin/MediaSelectModal.tsx: modal image picker used inside PostEditor.
5. src/components/admin/PostEditor.tsx: textareaRef, insertMarkdownAtCursor, editor toolbar with "Unggah Gambar" and "Pilih dari Pustaka", drag-and-drop upload directly on editor area, cover image section with "Pilih dari Pustaka" modal button, "Unggah Sampul" direct upload button, 16:9 thumbnail preview, and validation allowing /uploads/... paths.

DO NOT write or modify code directly. Deliver your blueprint and code snippets in d:\c\blog\.agents\teamwork\teamwork_explorer_m1_3\handoff.md.
When finished, send a message to the orchestrator.
