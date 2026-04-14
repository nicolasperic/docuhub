# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DocuHub is a team-based documentation management app built with Next.js 16 (App Router), React 19, TypeScript, Prisma ORM (PostgreSQL), and NextAuth (JWT sessions).

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — ESLint with Next.js core-web-vitals + TypeScript rules
- `npm run seed` — Seed database (`npx tsx prisma/seed.ts`)
- `npx prisma migrate dev` — Run database migrations
- `npx prisma generate` — Regenerate Prisma client (output: `src/generated/prisma`)

## Architecture

### Routing & Layout

- **App Router** with route groups: `(app)` for protected routes (sidebar layout), `/login`, `/register`, `/setup` for public auth routes
- Pages are async server components by default; use `"use client"` only for interactive components
- Path alias: `@/*` maps to `./src/*`
- Layout: `src/app/(app)/layout.tsx` wraps protected routes with `AppShell` (sidebar + header)

### Authentication

- NextAuth 5 beta with Credentials provider (email/password, bcrypt)
- JWT tokens carry: `id`, `organizationId`, `orgRole`, `organizationSlug`
- Middleware (`src/middleware.ts`) enforces auth on all routes except `/login`, `/register`, `/api/auth/*`
- Users without an organization are redirected to `/setup`
- Auth helpers in `src/lib/session.ts`: `getSessionUser()`, `requireAuth()`, `requireAdmin()`

### Database

- Prisma schema at `prisma/schema.prisma` with PostgreSQL
- Singleton Prisma client at `src/lib/db.ts` (imported as `db`)
- Generated types at `src/generated/prisma`

#### Models Reference

**Core org models:**
- `Organization` — id, name, slug (unique), logo
- `User` — id, email, passwordHash, name, organizationId, orgRole (OWNER|ADMIN|MEMBER)
- `Team` — id, name, description, organizationId, parentId (hierarchical teams)
- `TeamMember` — userId + teamId + role (ADMIN|MEMBER|VIEWER)
- `Role` — id, name, description, organizationId (custom job roles)
- `Client` — id, name, description, organizationId

**Spaces & Documents (the doc system):**
- `Space` — id, name, slug, description, icon, type (ORG_WIDE|TEAM|CLIENT|PERSONAL), organizationId, teamId?
  - Unique on `[organizationId, slug]`
- `Document` — id, title, slug, content, excerpt, status (DRAFT|PUBLISHED|ARCHIVED), spaceId, authorId, parentId (hierarchical)
  - Self-relation: `parent`/`children` via `"DocumentHierarchy"`
  - Unique on `[spaceId, slug]`
  - Relations: DocumentTeam, DocumentRole, DocumentClient, DocumentTag
- `Tag` — id, name, color, organizationId (unique on `[organizationId, name]`)

**Collaboration models:**
- `Comment` — id, content, userId, documentId, parentId (threaded replies)
- `Reaction` — id, emoji, userId, documentId (unique on `[userId, documentId, emoji]`)
- `Favorite` — userId + documentId
- `Activity` — id, type (VIEW|EDIT|SEARCH|CREATE), userId, documentId, metadata (JSON)

**Join tables:** DocumentTeam, DocumentRole, DocumentClient, DocumentTag, TeamClient, UserRole

### API Routes

All API routes follow the same pattern:
```typescript
import { requireAuth } from "@/lib/session";
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  // use db.<model>.findMany(...) etc.
  return NextResponse.json(data);
}
```

**Route map:**
- `/api/auth/[...nextauth]` — NextAuth handler
- `/api/register` — User registration
- `/api/organizations` — Org CRUD
- `/api/spaces`, `/api/spaces/[slug]` — Spaces CRUD
- `/api/spaces/[slug]/tree` — Full recursive document tree for a space
- `/api/documents`, `/api/documents/[id]` — Documents CRUD
- `/api/documents/[id]/comments` — Document comments
- `/api/documents/[id]/reactions` — Document reactions
- `/api/documents/[id]/related` — Related documents
- `/api/comments/[id]` — Single comment management
- `/api/favorites` — Favorites toggle
- `/api/teams`, `/api/teams/[id]` — Teams CRUD
- `/api/members`, `/api/members/[id]` — Members CRUD
- `/api/roles`, `/api/roles/[id]` — Roles CRUD
- `/api/clients`, `/api/clients/[id]` — Clients CRUD
- `/api/tags` — Tags CRUD

### UI & Styling

- **shadcn/ui** (New York style, RSC enabled) — primitives in `src/components/ui/`
- **Tailwind CSS 4** with `@tailwindcss/typography` for prose content
- Use `cn()` from `@/lib/utils` (clsx + tailwind-merge) for conditional classes
- Icons: `lucide-react`
- Toasts: `sonner`
- Dark mode via `next-themes`

### Rich Text Editor

- Built on **Novel** (Tiptap wrapper) with extensions: starter-kit, links, images, task lists, placeholder
- Editor components in `src/components/editor/` — toolbar, slash commands, node/text/link selectors
- Slash command menu for quick element insertion

### Forms

- `react-hook-form` + `zod` (v4) for validation with `@hookform/resolvers`

## File Map

```
src/
├── app/
│   ├── layout.tsx                          # Root layout
│   ├── login/page.tsx                      # Login
│   ├── register/page.tsx                   # Register
│   ├── setup/page.tsx                      # Org setup
│   ├── (app)/
│   │   ├── layout.tsx                      # Protected layout (AppShell)
│   │   ├── page.tsx                        # Dashboard
│   │   ├── spaces/page.tsx                 # Spaces list
│   │   ├── spaces/[slug]/page.tsx          # Space detail (docs list)
│   │   ├── spaces/[slug]/new/page.tsx      # New document
│   │   ├── spaces/[slug]/[docSlug]/page.tsx      # Document viewer
│   │   ├── spaces/[slug]/[docSlug]/edit/page.tsx # Document editor
│   │   ├── favorites/page.tsx              # Favorites
│   │   └── admin/{teams,members,roles,clients}/page.tsx  # Admin pages
│   └── api/                                # See API Routes above
├── components/
│   ├── auth/           # login-form, register-form
│   ├── dashboard/      # for-you-feed, recent-activity, team-updates
│   ├── documents/      # document-editor, document-comments, document-reactions, related-content
│   ├── editor/         # extensions, toolbar, slash-command, selectors/
│   ├── layout/         # app-shell, header, sidebar, mobile-nav, space-doc-tree
│   ├── ui/             # shadcn/ui primitives (button, card, dialog, input, etc.)
│   └── providers.tsx   # App-level providers
├── lib/
│   ├── auth.ts         # Auth utilities
│   ├── auth.config.ts  # NextAuth config
│   ├── db.ts           # Prisma client singleton
│   ├── session.ts      # getSessionUser(), requireAuth(), requireAdmin()
│   ├── types.ts        # TypeScript type definitions
│   └── utils.ts        # cn() helper
└── middleware.ts        # Auth enforcement
```

## Conventions

- Slugs: lowercase, non-alphanumeric replaced with hyphens, uniqueness enforced with counter suffix
- Organization scoping: most queries filter by `user.organizationId`
- Cascade deletes configured in Prisma for referential integrity
- Document hierarchy: `parentId` self-relation, recursive include for tree views
- Sidebar: conditionally shows space document tree when on `/spaces/[slug]` routes

## Seed Data

Run `npm run seed` to populate test data:
- Org: "Aztec Coders" — software factory specializing in e-commerce with Magento/Adobe Commerce
- Users: nico@azteccoders.com (Owner), marcel@azteccoders.com (Admin), sachin@azteccoders.com (Admin) — password: `password123`
- Teams: Engineering (parent), Backend, Frontend, DevOps
- Roles: Magento Backend Developer, Frontend Developer, DevOps Engineer, Tech Lead
- Client: Porrua (Mexican bookstore chain)
- Spaces: General (ORG_WIDE), Magento Development (TEAM), DevOps Runbooks (TEAM), Porrua (CLIENT)
- 7 sample documents with Tiptap JSON content (including document hierarchy and a draft)

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<random-string>
NEXTAUTH_URL=http://localhost:3000
```
