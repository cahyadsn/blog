# Antigravity Multi-Agent Blog 🚀

A modern, production-grade, full-stack blog application engineered and maintained by an **autonomous Multi-Agent System** using **Google Antigravity**, **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS**, and **Prisma ORM**.

Now featuring **Interactive Like/Clap Counter**, **Newsletter Subscription Suite**, **SEO & RSS Syndication**, **Full-Text Article Search**, **Interactive Dark/Light Mode**, and **Protected Admin Authentication**, alongside the complete **Admin CMS Dashboard** and autonomous operations.

---

## 📋 Overview

This project showcases how specialized AI subagents can collaborate across the entire software development and operations lifecycle:
1. **Engineering Lifecycle**: UI Design Tokens, Database Architecture, Secure Backend APIs, Responsive Frontend, Unit/Integration Testing, Technical Documentation, and DevOps/CI-CD.
2. **Interactive User Experience**: Real-time full-text article search with tag filters, and persistent dark/light theme switching with zero flash of unstyled content.
3. **Protected Admin CMS Suite**: Role-protected web dashboard (`/admin`) guarded by session authentication (`/admin/login`), live Markdown editor, publication controls, and comment moderation with threaded author replies.
4. **Autonomous Operations**: Scheduled daily technical article creation, automated reader comment moderation/replying, and documentation generation.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    User["Lead Orchestrator (Antigravity)"]

    subgraph Dev_Agents ["Engineering & Docs Agents (Lifecycle)"]
        A1["1. Design System Agent\n(Tailwind, Typography, Dark/Light Mode)"]
        A2["2. Database Agent\n(Prisma Schema, SQLite/Postgres, Migrations)"]
        A3["3. Backend API Agent\n(Auth, Public & Admin REST Routes, Zod Validation)"]
        A4["4. Frontend UI/UX Agent\n(Next.js App Router, Search, Markdown/Prose, Admin CMS)"]
        A5["5. Testing & QA Agent\n(Vitest, 108+ Multi-Tier Unit & E2E Lifecycle Tests)"]
        A6["6. Technical Writer Agent\n(Docs, User Guide, API Specs)"]
        A7["7. DevOps Agent\n(Git Setup, CI/CD Pipeline)"]
    end

    subgraph User_Facing ["User Interfaces"]
        UI1["Public Blog (/)\n(Full-Text Search, Theme Toggle, Article Reader)"]
        UI2["Admin Login (/admin/login)\n(Protected Session Cookie Authentication)"]
        UI3["Admin Dashboard (/admin)\n(Markdown Editor Live Preview, Comment Moderation)"]
    end

    subgraph Ops_Agents ["Autonomous Operations (Scheduled)"]
        A8["8. Content Creator & Editor Agent\n(Daily Technical Post Generator)"]
        A9["9. Comment Responder & Moderator Agent\n(Spam Detection & AI Contextual Replies)"]
    end

    User --> Dev_Agents
    User --> Ops_Agents
    Dev_Agents --> User_Facing
    User_Facing -->|Prisma SQLite| DB[("Database")]
    A8 -->|Publish Post| DB
    A9 -->|Reply Comment| DB
```

---

## 🤖 The Multi-Agent Ecosystem

| Agent | Scope & Domain | Execution Type | Deliverables |
|---|---|---|---|
| **Design System Agent** | UI/UX tokens, atomic components, Dark/Light theme | On-demand | `src/components/ui/*`, `ThemeToggle.tsx`, `tailwind.config.ts`, `globals.css` |
| **Database Agent** | Relational schema modeling & migrations | On-demand | `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts` |
| **Backend API Agent** | Auth logic, Admin API, Zod validation | On-demand | `src/app/api/*`, `src/app/api/admin/*`, `src/lib/auth.ts`, `src/middleware.ts` |
| **Frontend UI/UX Agent** | Public blog, SearchBar, Admin CMS, Live Preview | On-demand | `src/app/page.tsx`, `SearchBar.tsx`, `src/app/admin/*`, `src/components/admin/*` |
| **Unit Testing Agent** | Vitest test suites & lifecycle verification | CI / Pre-commit | `tests/*` (**236/236 tests passing 100%**) |
| **Technical Writer Agent** | User guides, API specifications & repository docs | On-demand / Release | `docs/USER_GUIDE.md`, `docs/REPOSITORY_DOCUMENTATION.md` |
| **DevOps Agent** | Git version control & GitHub Actions CI/CD | Push / Pull Request | `.github/workflows/ci.yml` |
| **Content Creator Agent** | Generates in-depth tech articles from backlog | Scheduled (`0 8 * * *`) | `scripts/daily-content.ts`, `content/backlog.json` |
| **Comment Responder Agent** | Moderates spam and publishes contextual replies | Scheduled (`0 * * * *`) | `scripts/reply-comments.ts` |

---

## ⚡ Features & Capabilities

### 1. Reader Blog Interface & Engagement
- **Interactive Like / Clap Counter**: Optimistic client-side feedback with heart-pulse and float-up animations, 500ms debouncing, sliding-window rate limiting on the backend (`POST /api/posts/[id]/like`), and real-time like counts on cards and post headers.
- **Newsletter Subscription System**: Elegant subscription form (`NewsletterForm.tsx`) with instant Zod email validation, idempotent deduplication, and automatic reactivation for returning subscribers (`POST /api/newsletter/subscribe`).
- **SEO & RSS Syndication Suite**:
  - Dynamic XML Sitemap (`/sitemap.xml`) with automatic draft isolation.
  - Search engine crawler directives (`/robots.txt`).
  - RSS 2.0 Feed syndication (`/feed.xml`) with RFC 822 publication dates.
  - Dynamic Open Graph & Twitter Cards with on-the-fly Satori social preview image generation (`/opengraph-image`, `/posts/[slug]/opengraph-image`).
- **Interactive Dark/Light Mode**: Smooth theme toggling saved in `localStorage` with zero flash of unstyled content.
- **Full-Text Article Search**: Instant search bar querying titles, excerpts, and markdown content, paired with quick tag filter chips.
- **Dynamic Prose Renderer**: Native markdown parsing with custom syntax highlighting and reading time indicator.
- **Nested Discussions**: Interactive comment section with direct replies and author badges.

### 2. Protected Admin CMS Suite (`/admin`)
- **Secure Authentication**: Protected by Edge-compatible middleware and HTTP-Only session cookies.
  - Login page: `/admin/login` (Default credentials: `admin` / `admin123`).
  - One-click **Logout** button with session invalidation.
- **Post Lifecycle Management**:
  - Full CRUD: Create, read, update, and delete blog posts.
  - **Interactive Live Markdown Preview**: Split-pane or toggleable real-time preview of formatted text and code blocks.
  - **Publish Status Toggle**: Switch between `Draft` and `Published` instantly.
  - **SEO & Metadata**: Auto slug generation from title, reading time estimation, and tag management.
- **Subscriber Management Center**:
  - View subscriber counts and metrics directly on the dashboard.
  - Tab khusus manajemen pelanggan (`SubscriberList.tsx`) dengan filter status, pencarian email, toggle aktif/nonaktif, dan hapus pelanggan.
- **Comment Moderation Center**:
  - Filter by status: `PENDING`, `APPROVED`, `SPAM`.
  - Quick action buttons: **Approve**, **Mark as Spam**, **Delete**.
  - **Direct Author Reply**: Respond directly to readers with the `isAuthorReply: true` badge.

### 3. Autonomous AI Agents
- **Daily Content Creator**: Autonomous script creating structured technical articles from backlog.
- **Smart Comment Responder**: Automated contextual replier and spam scanner.
- **Technical Writer**: Systematic documenter generating comprehensive user and developer guides.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React Server Components, Server Actions, Middleware)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + `@tailwindcss/typography`
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with SQLite (`prisma/dev.db`) or PostgreSQL
- **Security & Auth**: Edge-compatible Web Crypto HMAC session cookies
- **Data Validation & Sanitization**: [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown Parser**: [Marked](https://marked.js.org/)
- **Testing**: [Vitest](https://vitest.dev/) (236 automated test cases)
- **CI/CD**: GitHub Actions

---

## 📁 Project Directory Structure

```
d:/c/blog/
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI pipeline
├── content/
│   └── backlog.json                   # Topic backlog for Content Creator Agent
├── docs/
│   ├── USER_GUIDE.md                  # Comprehensive User Guide for Readers & Admins
│   ├── REPOSITORY_DOCUMENTATION.md    # Architecture, Data Models, & API Reference
│   ├── blog_draft_v1.md               # Multi-agent conceptual specifications
│   └── multi_agent_blog_implementation_plan.md
├── prisma/
│   ├── schema.prisma                  # Database schema (Post, Tag, PostTag, Comment)
│   └── seed.ts                        # Initial demo articles and comments
├── scripts/
│   ├── daily-content.ts               # Content Creator & Editor Agent runner
│   └── reply-comments.ts              # Comment Responder & Moderator Agent runner
├── src/
│   ├── middleware.ts                  # Edge runtime route protection for /admin
│   ├── app/
│   │   ├── admin/
│   │   │   ├── layout.tsx             # Protected Admin layout with Logout
│   │   │   ├── page.tsx               # Admin Hub (Post List, Post Editor, Comments)
│   │   │   └── login/page.tsx         # Admin Login form
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/route.ts  # Admin session login endpoint
│   │   │   │   │   ├── logout/route.ts # Admin session logout endpoint
│   │   │   │   │   └── me/route.ts     # Session check endpoint
│   │   │   │   ├── comments/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── reply/route.ts # Direct author reply endpoint
│   │   │   │   │   │   └── route.ts       # Approve, spam flag, delete comment
│   │   │   │   │   └── route.ts           # Admin list comments with status filters
│   │   │   │   └── posts/
│   │   │   │       ├── [id]/
│   │   │   │       │   ├── publish/route.ts # Toggle publish/draft status
│   │   │   │       │   └── route.ts        # Update & delete post
│   │   │   │       └── route.ts            # Admin list & create post
│   │   │   ├── comments/route.ts      # Public comment submission endpoint
│   │   │   └── posts/route.ts         # Public post listing endpoint
│   │   ├── globals.css                # Tailwind & Dark/Light mode tokens
│   │   ├── layout.tsx                 # Public layout with Navbar, Theme script & Footer
│   │   ├── page.tsx                   # Homepage with Full-Text SearchBar & Posts
│   │   └── posts/
│   │       └── [slug]/page.tsx        # Article reader & discussion section
│   ├── components/
│   │   ├── admin/                     # Admin CMS Components
│   │   │   ├── CommentList.tsx        # Comment moderation list & quick actions
│   │   │   ├── CommentReplyModal.tsx  # Direct author reply modal
│   │   │   ├── LogoutButton.tsx       # Session termination button
│   │   │   ├── PostEditor.tsx         # Markdown editor with live preview
│   │   │   └── PostList.tsx           # Post management table & publish toggle
│   │   ├── blog/                      # Public Blog Components
│   │   │   ├── CommentSection.tsx     # Interactive reader discussion
│   │   │   ├── Footer.tsx             # Site footer
│   │   │   ├── Navbar.tsx             # Sticky navigation with ThemeToggle & Admin link
│   │   │   ├── PostCard.tsx           # Post summary card
│   │   │   └── SearchBar.tsx          # Full-text search input with tag filters
│   │   └── ui/                        # Reusable atomic UI elements
│   │       ├── ThemeToggle.tsx        # Sun/Moon interactive theme switcher
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── textarea.tsx
│   └── lib/
│       ├── auth.ts                    # Web Crypto HMAC session token generator & verifier
│       ├── db.ts                      # Prisma Client singleton
│       ├── markdown.ts                # Markdown parsing & reading time estimation
│       └── validations.ts             # Zod schemas (Post, Comment, Admin Actions)
├── tests/
│   ├── admin-comments-api.test.ts     # Admin comment moderation API tests (21 tests)
│   ├── admin-integration.test.ts      # Real SQLite DB lifecycle & scenario tests (15 tests)
│   ├── admin-posts-api.test.ts         # Admin post management API tests (26 tests)
│   ├── admin-validations.test.ts      # Admin Zod validation schemas (33 tests)
│   ├── auth.test.ts                   # Admin session & token verification tests (4 tests)
│   ├── markdown.test.ts               # Slug & markdown parser tests (3 tests)
│   └── validations.test.ts            # Public validation tests (6 tests)
├── AGENTS.md                          # Multi-agent system prompts & cron schedules
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher (v24 tested & supported)
- [Git](https://git-scm.com/)

### 2. Installation
```powershell
cd d:\c\blog
npm.cmd install
```

### 3. Database Setup & Seeding
```powershell
# Push Prisma schema to SQLite
npm.cmd run db:push

# Seed demo articles and discussion threads
npm.cmd run db:seed
```

### 4. Running the Application
```powershell
npm.cmd run dev
```
- **Public Blog**: [http://localhost:3000](http://localhost:3000)
- **Admin CMS Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) (redirects to `/admin/login` if not authenticated)
  - **Username**: `admin`
  - **Password**: `admin123`

---

## 🧪 Automated Testing & Quality Assurance

The application features **108 automated tests** across 7 test suites verifying input validation, route security, and real SQLite database lifecycles:

```powershell
npm.cmd run test
```

Test coverage includes:
- **`tests/auth.test.ts` (4 tests)**: Admin session token generation, HMAC verification, expiration, and tampering detection.
- **`tests/admin-validations.test.ts` (33 tests)**: Post creation, slug formatting, update payloads, comment status changes, and author replies.
- **`tests/admin-posts-api.test.ts` (26 tests)**: Admin post CRUD, duplicate slug rejection, tag synchronization, and publish toggling.
- **`tests/admin-comments-api.test.ts` (21 tests)**: Comment status transitions, deletion, and threaded author replies.
- **`tests/admin-integration.test.ts` (15 tests)**: Real SQLite DB constraints, cascade deletions, and end-to-end user workflows.
- **`tests/validations.test.ts` (6 tests)**: Public input sanitization and anti-XSS injection protection.
- **`tests/markdown.test.ts` (3 tests)**: Reading time calculation and markdown-to-HTML rendering.

To verify the production build:
```powershell
npm.cmd run build
```

---

## 🤖 Running Autonomous Operational Agents

### A. Content Creator & Editor Agent
Reads the next available topic from `content/backlog.json`, composes an in-depth technical post with code snippets, conducts an editorial review, saves it to the database, and flags the topic as `PUBLISHED`:
```powershell
npm.cmd run agent:content
```

### B. Comment Responder & Moderation Agent
Scans the database for unanswered reader comments, filters potential spam, analyzes question context, and publishes an author reply with the badge `Author Bot`:
```powershell
npm.cmd run agent:comments
```

### C. Antigravity Scheduling (`/schedule`)
Automate these agents inside Antigravity by scheduling cron triggers:
- **Daily Content Generation (Every day at 08:00 AM)**:
  ```text
  /schedule CronExpression="0 8 * * *" Prompt="Execute npm.cmd run agent:content and summarize newly published article"
  ```
- **Hourly Comment Checking (Every hour)**:
  ```text
  /schedule CronExpression="0 * * * *" Prompt="Execute npm.cmd run agent:comments and moderate pending reader comments"
  ```

---

## 🌐 Deployment to GitHub & Cloud Hosting

### 1. Connecting to GitHub
```powershell
# Add your GitHub remote
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Push to main branch
git push -u origin main
```

### 2. CI/CD Pipeline
Every push and pull request to `main` automatically triggers [`.github/workflows/ci.yml`](.github/workflows/ci.yml) to run dependency auditing, Prisma generation, Vitest test suites (108 tests), and Next.js production builds.

### 3. Deploying to Vercel / Railway
1. Connect your repository to [Vercel](https://vercel.com) or [Railway](https://railway.app).
2. Set `DATABASE_URL` (for serverless hosting, use PostgreSQL / Supabase / Neon or Turso / LibSQL).
3. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` (and optional `ADMIN_SESSION_SECRET`).
4. Deploy!

---

## 📄 Documentation Links

- **[Panduan Pengguna / User Guide](docs/USER_GUIDE.md)**: Panduan lengkap bagi Pembaca dan Administrator (Admin CMS Hub, Live Preview Editor, Moderasi Komentar).
- **[Dokumentasi Teknis Repositori](docs/REPOSITORY_DOCUMENTATION.md)**: Spesifikasi arsitektur teknis, skema Prisma, spesifikasi API lengkap, dan infrastruktur pengujian.
- **[Panduan Sistem Multi-Agent](AGENTS.md)**: Daftar lengkap agen, spesifikasi peran, system prompts, dan panduan menjalankan scheduled task.
- **[Multi-Agent Architecture Concept](docs/blog_draft_v1.md)**: Konsep dan pemisahan domain pada tahap perancangan awal.

---

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
