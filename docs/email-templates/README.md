# Kindling auth email templates

Branded HTML for the Supabase Auth emails. These are **not** wired into the app
build — Supabase renders them. To use one, copy the file's contents into
**Supabase → Authentication → Emails → Templates**, pick the matching template,
paste into the **Message body (HTML)**, set the **Subject** (below), and Save.

| File | Supabase template | Subject |
|------|-------------------|---------|
| `reset-password.html` | Reset Password | `Reset your Kindling password` |
| `invite-user.html` | Invite user | `You're invited to Kindling` |
| `confirm-signup.html` | Confirm signup | `Confirm your email for Kindling` |
| `magic-link.html` | Magic Link | `Your Kindling sign-in link` |
| `change-email.html` | Change Email Address | `Confirm your new Kindling email` |

## Notes

- **Do not edit the `{{ .ConfirmationURL }}`, `{{ .Email }}`, or `{{ .NewEmail }}`
  placeholders** — Supabase substitutes the real link/addresses at send time.
  Everything else is safe to change.
- Delivery goes through **Resend** custom SMTP (sender `noreply@mail.kindling.network`).
- Logo is pulled live from `https://kindling.network/logo.png`.
- Brand colors: primary orange `#EF6939`, charcoal `#21242C` (from `globals.css`
  `--primary: 16 85% 58%` / `--foreground: 220 15% 15%`).
- The **Reauthentication** template is intentionally omitted — it sends a numeric
  code (`{{ .Token }}`), not a link, so it needs a different layout. Add it later
  if that flow gets used.
