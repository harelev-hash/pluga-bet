@AGENTS.md

# פלוגה ב' — Military Unit Management System

A full-stack web app for IDF unit (Platoon B) management: personnel, attendance, equipment, MELM (resupply), and operations.

## Tech Stack

- **Next.js 16.2.1** with App Router (React 19) — see AGENTS.md for breaking changes
- **TypeScript 5** throughout
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL + Auth + Row Level Security)
- **XLSX** for Excel import/export
- **Lucide React** for icons, **React Hot Toast** for notifications

## Project Structure

```
app/(dashboard)/        # All main pages (28+ routes)
  soldiers/             # Personnel registry
  attendance/           # Daily attendance
  equipment/            # Inventory, assignments, green-eyes
  melm/                 # MELM resupply requests
  ops/                  # Operational assignments & guard posts
  tracking/             # Open issues follow-up
  admin/                # User management, periods, dept admin
components/             # Reusable UI (sidebar, etc.)
lib/                    # Supabase clients, types, utils
```

## Database

Schema is in `schema.sql` + incremental migrations `migration_v1_*.sql` through `migration_v10_*.sql`.

Key tables: `soldiers`, `departments`, `app_users`, `reserve_periods`, `daily_attendance`, `tracking_events`, `tracking_entries`, `equipment_types`, `equipment_items`, `equipment_assignments`, `equipment_transactions`, `soldier_equipment`, `equipment_templates`, `green_eyes_reports`, `melm_requests`, `melm_items`, `guard_posts`, `operational_assignments`, `operational_summaries`.

When making schema changes, always write a new `migration_vN_*.sql` file — never modify the base `schema.sql`.

## User Roles

Defined in `lib/utils.ts`:
- `sys_admin` — full access
- `hr` — departments, periods
- `rsfp` — equipment officer
- `commander` — operational data
- `viewer` — read-only

RLS policies enforce these at the database level.

## Key Conventions

- **Hebrew / RTL** throughout — all UI text is Hebrew, layouts use `dir="rtl"`
- **Supabase client**: use `createClient()` from `lib/supabase/client.ts` (browser) or `lib/supabase/server.ts` (server components/actions)
- **No raw SQL in components** — all DB access via Supabase client
- **Equipment ownership types**: `personal`, `platoon`, `battalion`
- **Attendance statuses**: `present`, `absent`, `sick`, `approved_absence`, `vacation`, `excused`, `weekend`

## UX Standards

### Excel Import Screens
Every page that imports Excel and maps rows to soldiers **must** include:
1. **SoldierPicker for unmatched rows** — inline search by name/rank/ID, click to assign, X to clear. Reference: `app/(dashboard)/equipment/import-kits/import-kits-form.tsx`
2. **Progress bar during import** — show current row / total rows (percentage or animated bar). No silent spinners.

### Soldier Display
- Show rank **only** in: main soldiers table (`/soldiers`), soldier profile page, import preview
- **Everywhere else** (dropdowns, cards, assignments, tracking, equipment): show `full_name` only — no rank prefix

## Git Workflow

Always `git push` immediately after every `git commit` — no need to ask. Only skip push if explicitly told not to.

## Dev Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # ESLint check
```

Environment: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
