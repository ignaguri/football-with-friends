# MVP Tasks – Fútbol con los pibes

A concise checklist of remaining MVP tasks. Check off each item as you complete it.

---

## Rules/Info Page (Static)

- [x] Add static rules, pot, and summary stats content in the codebase
- [x] Frontend: `/rules` or `/info` page, mobile-friendly, accessible from main navigation

## Organizer Dashboard

- [x] Backend: API endpoints for adding/editing matches, updating costs, canceling matches, and fetching financial summaries
- [x] Frontend: Dashboard page (organizer-only), forms for match management, financial summary table
- [x] Add court number field to match creation/edit forms and data model
- [x] Allow admin to manually mark a user as 'cancelled' and free up their spot
- [x] Add 'cancelled' state for users in a match
- [x] Implement a metadata (master) sheet to store and manage all match-level information, and integrate it with admin actions and match listing

## Invite a Friend / Guest Management

- [x] Allow a user to add one or more guests (with optional name) after signing up
- [x] Add guest to participant list as 'Guest of [User Name]' or '[Guest Name] (Guest of [User Name])' (no registration required)
- [x] Adjust available spots accordingly
- [x] Toast notifications for all actions (signup, cancel, add guest, mark as paid, errors)

## Player Signup/Payment Flow (PayPal Integration)

- [ ] ~~Backend: API endpoint to initiate PayPal payment and handle confirmation (update player status in match sheet)~~
- [ ] ~~Frontend: "Sign Up & Pay" button, PayPal checkout integration, update UI after payment, show payment status/history~~
- [ ] ~~Automate WhatsApp notification to admin after user pays (if possible with PayPal IPN/webhook)~~
- [ ] ~~Ensure user's spot is only confirmed (vacancy reduced) after admin marks as paid~~
- [ ] ~~Show cancellation and punctuality warning before payment~~
- **Note:** PayPal integration was abandoned due to the requirement for a business account and transaction fees, which are not acceptable for this project. Payment will be handled outside the app.

## API for Costs & Summary Data

- [ ] Extend backend to read/write costs and summary data per match sheet (if needed for dashboard/financials)

## Polish & Deploy

- [ ] Audit and optimize Web Vitals (LCP, CLS, FID)
- [ ] Optimize images (WebP, lazy loading, size data)
- [ ] Final deploy to Vercel

## Internationalization (i18n)

- [ ] Backend: Set up i18n support for API responses (if needed)
- [ ] Frontend: Integrate i18n library (e.g., next-intl or next-i18next)
- [ ] Add language switcher to main navigation
- [ ] Translate all static content (rules, buttons, forms, etc.)
- [ ] Ensure locale is preserved in navigation and URLs
