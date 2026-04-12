# Dwelling SaaS Changes — April 2026

## Overview

Major rebuild to fix plan consistency, add proper Business Dashboard, and implement stars system.

---

## 1. React Router Setup

**Files:** `main.jsx`, `package.json`

Added `react-router-dom` for proper page routing:

- `/` - Home/Landing
- `/dashboard/*` - Business Dashboard (requires Business plan)
- `/saved` - Saved analyses page
- `/terms` - Terms page

---

## 2. Business Dashboard (New)

**Created 9 new components:**

| Component              | Route                 | Description              |
| ---------------------- | --------------------- | ------------------------ |
| `BusinessLayout.jsx`   | `/dashboard/*`        | Main layout with routing |
| `BusinessSidebar.jsx`  | -                     | Sidebar navigation       |
| `BusinessOverview.jsx` | `/dashboard`          | Stats, quick actions     |
| `BusinessSaved.jsx`    | `/dashboard/saved`    | Saved reports grid       |
| `BusinessTeam.jsx`     | `/dashboard/team`     | Team management          |
| `BusinessApiKeys.jsx`  | `/dashboard/api-keys` | API key CRUD             |
| `BusinessUsage.jsx`    | `/dashboard/usage`    | Usage analytics          |
| `BusinessBilling.jsx`  | `/dashboard/billing`  | Subscription             |
| `BusinessSettings.jsx` | `/dashboard/settings` | Brand settings           |

All pages have:

- Proper scrolling (no broken modals)
- Dark theme styling
- Working CRUD operations

---

## 3. Stars System

**Changed:** `PricingCard.jsx`, `PaywallModal.jsx`

- Pro: "200 stars/month" (was 100-150 reports)
- Business: "Up to 1,000 stars/day via API" (was 1,000-3000 reports)
- Business: "Up to 10 team members" (was 3-10)

---

## 4. PDF Export Fix

**Changed:** `App.jsx`

- PDF Export now **Business-only** (was Pro)
- Changed from `{isPro && ...}` to `{isBusiness && ...}`

---

## 5. Navbar Update

**Changed:** `Navbar.jsx`, `App.jsx`

- Added Dashboard link for Business users only
- Shows 📊 icon in navbar when `isBusiness={true}`

---

## 6. Database Schema

**Changed:** `api/auth.js`

Added tables (already existed):

- `teams` — team_id, name, created_at
- `api_keys` — team_id, hashed_key, name, daily_usage_count, last_reset_date
- `usage_logs` — api_key_id, date, usage_count
- `team_id` column on `users`

API endpoints added:

- `createTeam`, `listTeams`
- `createApiKey`, `listApiKeys`, `revokeApiKey`
- `validateApiKey` — rate limits 200/day
- `getUsage` — team usage stats

---

## 7. Logo Upload Fix

**Changed:** `BrandingModal.jsx`

- Replaced URL input with file upload
- Accepts PNG/JPEG only
- Max 2MB
- Preview before save

---

## Summary

| Feature    | Before        | After           |
| ---------- | ------------- | --------------- |
| Pages      | Broken modals | Real routes     |
| PDF Export | Pro-only      | Business-only   |
| Dashboard  | Missing       | Full /dashboard |
| Credits    | "1000-3000"   | "stars"         |
| Navbar     | No link       | 📊 for Business |
| Logo       | URL input     | File upload     |

---

## To Deploy

```bash
npm install   # installs react-router-dom
npm run build
```

Dashboard accessible at `yourapp.com/dashboard`
