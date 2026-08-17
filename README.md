# Library Management System

A full-stack library management app built with Next.js (App Router), Prisma + SQLite, and NextAuth. Supports three roles: **Admin**, **Staff**, and **Student**.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Demo logins](#demo-logins)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [How borrowing works](#how-borrowing-works)
- [Troubleshooting](#troubleshooting)
- [Deploying / extending](#deploying--extending)

## Features

**Admin portal**
- Manage staff accounts: create, edit, and deactivate/reactivate staff logins.
- Full inventory control: add, edit, and delete books, including category and tags.
- Review and act on borrow requests: assign (approve) or reject.
- See every book currently checked out, with due dates and overdue flags, and mark books as returned.

**Staff portal**
- Everything above except staff account management (admin-only).

**Student portal**
- Sign up for an account, or log in if you already have one.
- Browse the full catalog; search by title/author, or filter by category (Action, Sci-Fi, Fantasy, Mystery, Romance, Non-Fiction, Biography, History) and/or tag (Bestseller, Series, New Arrival, etc.).
- Request to borrow any book with available copies.
- Track the status of every request (pending / approved / rejected / returned) and see due dates for books currently checked out.

Borrowing is a **request → staff approval** workflow, not instant self-checkout: a student requests a book, staff or admin approves it (which issues the book and sets a 14-day due date) or rejects it, and marks it returned once the book comes back.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Routes are protected via `proxy.ts` — Next 16 renamed `middleware.ts` to `proxy.ts`. |
| Language | TypeScript | |
| Styling | Tailwind CSS v4 | |
| Database | SQLite | Local file (`dev.db`), zero external setup. |
| ORM | Prisma 7 | Uses the new mandatory driver-adapter setup (`@prisma/adapter-better-sqlite3`). Generated client lives in `app/generated/prisma` (gitignored — regenerated automatically via the `postinstall` script). |
| Auth | NextAuth v4 | Credentials provider (email + password, hashed with bcrypt), JWT session carrying the user's role. |

All create/update/delete/approve/reject/return actions are Next.js **Server Actions** in `lib/actions.ts`. Each one independently re-checks the caller's role server-side — route protection in `proxy.ts` is a UX convenience, not the only security boundary.

## Getting started

### 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically via a `postinstall` hook.

### 2. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Generate a real secret instead of the placeholder:

```bash
openssl rand -base64 32
```

Set `NEXTAUTH_URL` to **the exact address you'll open in your browser** — see [Troubleshooting](#troubleshooting) for why this matters.

### 3. Set up the database

```bash
npx prisma migrate deploy
npm run db:seed
```

This creates `dev.db` and seeds it with three demo accounts and 12 sample books across 8 categories.

### 4. Run the app

```bash
npm run dev
```

Open the app at whatever address you set `NEXTAUTH_URL` to (default: `http://localhost:3000`).

## Demo logins

| Role    | Email                  | Password     |
|---------|-------------------------|---------------|
| Admin   | admin@library.com       | Admin@123     |
| Staff   | staff@library.com       | Staff@123     |
| Student | student@library.com     | Student@123   |

Students can also sign up for their own account from `/signup`.

## Project structure

```
app/
  admin/          Admin-only pages (staff, inventory, requests, borrowed books)
  staff/          Staff-only pages (inventory, requests, borrowed books)
  student/        Student pages (browse/search/filter, my requests)
  login/, signup/ Auth pages
  api/            NextAuth route handler + signup endpoint
components/       Shared server components (InventoryManager, RequestsManager, BorrowedList, Navbar)
lib/              Prisma client, auth config, session helpers, server actions
prisma/           Schema, migrations, seed script
proxy.ts          Route protection (Next.js 16's replacement for middleware.ts)
```

Inventory, request-approval, and borrowed-book management are each implemented once as a shared component and rendered from both the admin and staff route trees, so there's a single source of truth for that logic even though admin and staff see it at different URLs.

## Data model

Defined in `prisma/schema.prisma`:

- **User** — `role` is one of `ADMIN` / `STAFF` / `STUDENT`; `active` lets admins deactivate staff without deleting history.
- **Book** — belongs to one `Category`, has many `Tag`s via the `BookTag` join table; tracks `totalCopies` vs `availableCopies`.
- **Category**, **Tag** — simple lookup tables, created on the fly when an admin/staff member types a new category or tag name.
- **BorrowRequest** — the request lifecycle: `PENDING` → `APPROVED` (with a `dueDate` set 14 days out) or `REJECTED`, and `APPROVED` → `RETURNED`.

## How borrowing works

1. A logged-in student clicks "Request to borrow" on a book with `availableCopies > 0`. This creates a `BorrowRequest` with status `PENDING`.
2. An admin or staff member sees it under Requests, and either:
   - **Assigns** it — sets status to `APPROVED`, decrements the book's `availableCopies`, and sets a due date 14 days out, or
   - **Rejects** it — sets status to `REJECTED`.
3. Once the book is returned, staff/admin click "Mark returned" on the Books Taken page — sets status to `RETURNED` and increments `availableCopies` back.
4. Students can see all of this on their "My Books" page at any time.

## Troubleshooting

**`npm install` fails with a PowerShell "running scripts is disabled" error (Windows).**
This is a Windows security setting, unrelated to the project. Either run the command from Command Prompt instead of PowerShell, or run this once in PowerShell to allow scripts for your account: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**Login says "Invalid email or password" even with the right credentials, or the sign-in button just hangs.**
This almost always means `NEXTAUTH_URL` doesn't match the address you're actually using in the browser. NextAuth bakes `NEXTAUTH_URL` into the client bundle as the base URL for *every* auth request (login, session check, CSRF token). If you open the app via `http://192.168.x.x:3000` but `NEXTAUTH_URL` is still `http://localhost:3000`, every auth call becomes a cross-origin request and fails unpredictably. Fix: set `NEXTAUTH_URL` in `.env` to exactly the address in your browser's address bar, then restart `npm run dev` (env vars are only read at server startup). Pick one address (either `localhost` or a specific LAN IP) and use it consistently — don't switch between them.

**Accessing the app via a LAN IP (e.g. `http://192.168.x.x:3000`), the page loads but nothing on it responds — buttons and forms just do nothing.**
Next.js 16's dev server blocks cross-origin requests to its own JS/hot-reload assets by default as a security measure — so if you're opening the app from a LAN IP, the browser silently fails to load the client-side JavaScript, and every interactive element (including the login form) is dead on arrival. You'll see warnings like `Blocked cross-origin request to Next.js dev resource ... Cross-origin access to Next.js dev resources is blocked by default for safety` in the terminal running `npm run dev`. Fix: add that IP to `allowedDevOrigins` in `next.config.ts` (already done in this project for `192.168.0.101` — update it if your machine's IP differs) and restart the dev server. This only affects `next dev`; it isn't a concern in production.

**The `User` table doesn't exist / login always fails with no accounts found.**
Migrations haven't been applied, or the database was deleted. Run `npx prisma migrate deploy` followed by `npm run db:seed`.

## Deploying / extending

- **Moving to a hosted database:** swap `provider = "sqlite"` in `prisma/schema.prisma` for `"postgresql"` (or another supported provider), swap the driver adapter accordingly (e.g. `@prisma/adapter-pg`), update `DATABASE_URL`, and set `NEXTAUTH_URL` to your production domain.
- **Notifications:** hook into `approveRequestAction` / `rejectRequestAction` / `markReturnedAction` in `lib/actions.ts` to send email/SMS on status changes.
- **Pagination:** the catalog page (`app/student/page.tsx`) fetches the full filtered list in one query — add `skip`/`take` if the catalog grows large.
