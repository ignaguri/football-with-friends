# MVP Tasks – Football With Friends

A concise checklist of remaining MVP tasks. Check off each item as you complete it.

---

## Player Signup/Payment Flow (PayPal Integration)
- [ ] Backend: API endpoint to initiate PayPal payment and handle confirmation (update player status in match sheet)
- [ ] Frontend: "Sign Up & Pay" button, PayPal checkout integration, update UI after payment, show payment status/history
- [ ] Automate WhatsApp notification to admin after user pays (if possible with PayPal IPN/webhook)
- [ ] Ensure user's spot is only confirmed (vacancy reduced) after admin marks as paid
- [ ] Show cancellation and punctuality warning before payment

## Rules/Info Page (Static)
- [ ] Add static rules, pot, and summary stats content in the codebase
- [ ] Frontend: `/rules` or `/info` page, mobile-friendly, accessible from main navigation

## Organizer Dashboard
- [ ] Backend: API endpoints for adding/editing matches, updating costs, canceling matches, and fetching financial summaries
- [ ] Frontend: Dashboard page (organizer-only), forms for match management, financial summary table
- [ ] Add court number field to match creation/edit forms and data model
- [ ] Allow admin to manually mark a user as 'cancelled' and free up their spot
- [ ] Add 'cancelled' state for users in a match
- [ ] Implement a metadata (master) sheet to store and manage all match-level information, and integrate it with admin actions and match listing

## Invite a Friend / Guest Management
- [ ] Allow a user to pay for themselves + a friend (guest)
- [ ] Add guest to participant list as 'guest' (no registration required)
- [ ] Adjust available spots accordingly

## API for Costs & Summary Data
- [ ] Extend backend to read/write costs and summary data per match sheet (if needed for dashboard/financials)

## Polish & Deploy
- [ ] Audit and optimize Web Vitals (LCP, CLS, FID)
- [ ] Optimize images (WebP, lazy loading, size data)
- [ ] Final deploy to Vercel 