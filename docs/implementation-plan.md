# Fútbol con los pibes – Implementation Plan

## 1. Project Overview

A simple, modern web app (React + Bun, deployable on Vercel) that acts as a UI for a Google Sheets-based football match organizer. The app will:

- Display upcoming matches, players, and payment status.
- Allow players to sign up for matches and mark themselves as paid (via PayPal).
- Let the organizer add new matches (dates/times).
- Show match costs, rules, and other info.
- Use the Google Sheet as the source of truth (read/write).
- **[NEW] Each match is stored in a separate sheet (tab) within the spreadsheet.**

---

## 2. Core Features

### 2.1. Match List & Details

- List all upcoming matches (date, time, status).
- For each match, show:
  - List of secured players (paid).
  - List of pending players (not paid).
  - Number of players needed/confirmed.
  - Match cost breakdown (court, shirts, etc.).
  - Payment status for each player.

### 2.2. Player Signup & Payment

- Allow a user to sign up for a match.
- Integrate PayPal payment (redirect or embedded).
- After payment, mark the player as "secured" for that match.
- Optionally, allow users to see their own payment/sign-up history.

### 2.3. Organizer Tools

- Add new matches (date/time).
- Mark matches as canceled.
- Edit match details (costs, etc.).
- See total collected, outstanding, and per-match financials.

### 2.4. Rules & Info

- Display static rules (e.g., late fee, 2x1, etc.).
- Show current "pozo" (pot) and other summary stats.

---

## 3. Architecture

### 3.1. Tech Stack

- **Frontend:** React (with TypeScript, Tailwind for styling)
- **Backend:** Bun (API routes for Google Sheets interaction)
- **Deployment:** Vercel
- **Data Source:** Google Sheets API (read/write to the spreadsheet)

### 3.2. Data Flow

- **[NEW] Each match is a separate sheet (tab) in the spreadsheet.**
- There is a **master sheet** (or use the spreadsheet's sheet list) to list all matches and their metadata (date, status, etc.).
- All player signups, payments, and match-specific data are stored in the corresponding match's sheet.
- The app will use Google Sheets API (with service account) to:
  - List all match sheets (from master sheet or sheet list).
  - Read/write player/payment data in each match sheet.
  - Add new match sheets.
  - Allow the organizer to add/edit matches.

---

## 4. Authentication & Authorization

- **Authentication:**
  - All users sign in with Google (OAuth).
  - No separate registration—anyone with a Google account can log in.
- **Authorization:**
  - Organizer actions (add/edit matches) can be restricted to specific Google accounts (by email).
  - All other users can sign up and pay for matches.

---

## 5. Implementation Steps

### 5.1. Setup

- [x] Initialize Bun + React + TypeScript project.
- [x] Set up Tailwind CSS.
- [x] Prepare Vercel deployment config.
- [x] Set up Google Sheets API access (service account, credentials).

### 5.2. Authentication

- [x] Integrate Google OAuth (NextAuth.js or compatible for Bun).
- [x] Store user's Google email and name in session.
- [x] Use session for identifying players and authorizing organizer actions.

### 5.3. Google Sheets Integration

- [x] Write backend API routes for:
  - Fetching match list and details (from master sheet or sheet list).
  - [x] Adding/updating player signups (add/update row in the match's sheet).
  - [x] Adding new matches (create a new sheet for each match).
  - [ ] Fetching/writing costs, rules, and summary data (per match sheet).

### 5.4. UI Components

- [x] Match List Page
- [x] Match Details Page (with player list, sign-up/payment button)
- [ ] Player Signup/Payment Flow (PayPal integration)
- [ ] Organizer Dashboard (add/edit matches, see financials)
- [ ] Rules/Info Page (static, no API needed)

### 5.5. Polish & Deploy

- [x] Responsive/mobile-first design
- [ ] Web Vitals optimization
- [ ] Image optimization (if needed)
- [ ] Deploy to Vercel

### 5.6. Remaining MVP Steps (Detailed)

#### Player Signup/Payment Flow (PayPal Integration)
- Backend: API endpoint to initiate PayPal payment and handle confirmation (update player status in match sheet).
- Frontend: "Sign Up & Pay" button, PayPal checkout integration, update UI after payment, show payment status/history.

#### Rules/Info Page (Static)
- No backend API needed; rules, pozo, and summary stats are stored as static content in the codebase.
- Frontend: `/rules` or `/info` page, mobile-friendly, accessible from main navigation.

#### Organizer Dashboard
- Backend: API endpoints for adding/editing matches, updating costs, canceling matches, and fetching financial summaries.
- Frontend: Dashboard page (organizer-only), forms for match management, financial summary table.

#### API for Costs & Summary Data
- Extend backend to read/write costs and summary data per match sheet (if needed for dashboard/financials).

#### Polish & Deploy
- Audit and optimize Web Vitals (LCP, CLS, FID).
- Optimize images (WebP, lazy loading, size data).
- Final deploy to Vercel.

---

## 6. Stretch Goals

- Notifications (email/WhatsApp) for match reminders or payment confirmations.
- Player stats/history.
- Export to PDF/CSV.

---

## 7. Open Questions

- Any additional payment methods needed beyond PayPal?
- Should we allow anonymous viewing of matches, or require login for all access? -> Login required
- **[NEW] Should the master sheet include all match metadata, or just rely on the sheet list?**
