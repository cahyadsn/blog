# Dispatch: Admin CMS UI & Editor Integration Survey

You are a read-only exploration agent (teamwork_explorer).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_explorer_survey_2
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md

## Objective
Read ORIGINAL_REQUEST.md first. Investigate the codebase for Requirement R3:
1. Admin Dashboard: Examine `src/app/admin/page.tsx` and any child components/tabs in `src/components/admin/` or similar. How are tabs structured? How are existing items managed?
2. Media Library Tab: Design/plan the UI for the "Pustaka Media" tab (grid gallery, image previews, size in KB/MB, upload date, copy public URL button, copy Markdown snippet `![alt](/uploads/...)` button, delete file button with confirmation).
3. PostEditor Integration: Examine `src/components/blog/PostEditor.tsx` (or `src/components/admin/PostEditor.tsx` / wherever PostEditor is located). Check how the markdown content state and textarea are managed. How can an "Unggah Gambar" button and/or drag-and-drop area be integrated to upload images and automatically insert `![alt](url)` at the cursor position?
4. Cover Image Selection: How does the editor handle `coverImage`? How can the author choose an existing image from the media library or upload a cover image directly?
5. Component styling, design tokens, Tailwind CSS conventions, and existing toast/modal dialog components.

DO NOT write or modify code. Deliver a structured report to `d:\c\blog\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`.
Use send_message to notify the orchestrator when complete.
