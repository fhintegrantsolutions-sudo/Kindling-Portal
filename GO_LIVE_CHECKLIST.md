# Go Live Checklist

Items that need to be configured, tested, or activated before launching to real users.

---

## Environment Variables

- [ ] **`APP_URL`** — Set to the production domain (e.g. `https://kindling.network`) so that account setup emails contain the correct link. Currently defaults to `http://localhost:5001`.
- [ ] **`GMAIL_USER`** / **`GMAIL_APP_PASSWORD`** — Confirm Gmail credentials are valid and the Gmail account has App Passwords enabled.
- [ ] **`ACCOUNTING_EMAIL`** — Set to the accounting team's email for investment notifications.
- [ ] **`SESSION_SECRET`** — Use a strong, unique secret in production (not a dev default).

## Account Setup Flow

- [ ] Test the full approval-to-setup-email flow end to end:
  1. Submit a request via `/request-access`
  2. Admin approves in `/portal/admin/access-requests`
  3. Confirm setup email is received with a working link
  4. User visits link, sets password, is redirected to `/portal`
- [ ] Verify setup links expire correctly after 72 hours
- [ ] Verify used tokens cannot be reused

## Email

- [ ] Confirm all transactional emails render correctly (setup, welcome, payment confirmation, accounting notification)
- [ ] Update any `localhost` URLs still hardcoded in email templates (e.g. `sendWelcomeEmail` references `http://localhost:5000/auth`)

## Account Management

- [ ] **Email change** — Currently there is no self-service or admin UI to change a user's login email. Changing it requires manually updating the `users` Firestore document. Review options:
  - Self-service: add an "Update Email" field on the Profile page (requires re-authentication or confirmation email)
  - Admin-only: add an email field to the User Management admin page
- [ ] **Forgot password / password reset** — No reset flow exists yet. If a user forgets their password, an admin must manually intervene. Review options:
  - Email-based reset link (similar to the setup token flow — generate a one-time token, email a reset link, expire after X hours)
  - Admin-initiated reset (admin triggers a new setup email from the User Management page)

## Auth & Security

- [ ] Review and lock down CORS settings for production domain
- [ ] Confirm `x-username` / `x-user-id` dev header bypass is removed or restricted in production
- [ ] Ensure sessions are stored durably (not just in-memory) if running multiple server instances

## Referrals

- [ ] Confirm referral tracking works end to end with production URLs

## General

- [ ] Remove or disable any dev-only test accounts (e.g. `admin@kindling.com` / `admin123`)
- [ ] Set up error monitoring (e.g. Sentry)
- [ ] Configure production Firebase project (separate from dev)
