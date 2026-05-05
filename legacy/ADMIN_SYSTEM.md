# Admin System Documentation

## Overview
The Kindling Portal now includes a comprehensive admin dashboard for managing note registrations, participant approvals, and payment tracking.

## Admin Access

### Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`
- **Access URL:** http://localhost:5000/admin

### Demo Lender Credentials  
- **Username:** `kdavidsh`
- **Password:** `demo123`

## Features

### 1. Registration Management
- View all note registrations
- Approve/reject participant applications
- Automatically creates user accounts upon approval
- Sends welcome email with temporary password
- Notifies accounting team of new investments

### 2. Payment Status Tracking
- Track funding status for all participations
- Three-stage workflow:
  - **Received:** Funds received from lender
  - **Deposited:** Funds deposited to account
  - **Cleared:** Funds cleared and confirmed
- Sends confirmation email when funds are cleared
- Real-time status badges and counters

### 3. Note Management (Future)
- Create new notes
- Edit existing note details
- Update note status

## Email Configuration

### Gmail Setup Required
1. Go to https://myaccount.google.com/apppasswords
2. Generate a new app-specific password for "Kindling Portal"
3. Update `.env` file with:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-digit-app-password
   ACCOUNTING_EMAIL=accounting@yourdomain.com
   ```

### Email Notifications
- **Welcome Email:** Sent when registration is approved
  - Includes username and temporary password
  - Login instructions
- **Accounting Notification:** Sent when new investment is approved
  - Participation details
  - Amount and lender information
  - Note details
- **Payment Confirmation:** Sent when funds are cleared
  - Investment confirmed
  - Amount and date

## Workflow

### Participant Registration Flow
1. Participant fills out note registration form
2. Registration appears in Admin Dashboard (Registrations tab)
3. Admin reviews application details:
   - Personal information
   - Investment amount
   - Banking details
   - Entity type
4. Admin clicks "Approve & Create User"
5. System automatically:
   - Creates user account with role "lender"
   - Generates temporary password
   - Sends welcome email to participant
   - Sends notification to accounting team
   - Updates registration status to "Approved"

### Payment Processing Flow
1. Lender submits investment funds
2. Investment appears in Admin Dashboard (Payments tab)
3. Admin checks funding status boxes:
   - ✅ Funds Received
   - ✅ Funds Deposited  
   - ✅ Funds Cleared
4. When "Cleared" is checked:
   - System sends confirmation email to lender
   - Badge updates to show "Cleared" status

## Technical Details

### Backend Endpoints
- `GET /api/admin/users` - List all users
- `GET /api/admin/registrations` - List all registrations
- `POST /api/admin/registrations/:id/approve` - Approve registration
- `GET /api/admin/participations` - List all participations
- `PATCH /api/admin/participations/:id/funding-status` - Update funding status
- `POST /api/admin/notes` - Create new note
- `PATCH /api/admin/notes/:id` - Update note

### Authentication
All admin endpoints require the `requireAdmin` middleware which checks for:
- Valid user with `role: "admin"`
- Currently uses `x-username` header (development mode)
- Production should use JWT/session tokens

### Database Schema Updates
- **User:** Added `role` field ("admin" | "lender")
- **Participation:** Added `fundingStatus` object with `received`, `deposited`, `cleared` booleans

## Development

### Running the App
```bash
npm run dev
```

### Reseeding Database
```bash
npm run seed
```
This creates:
- Admin user (admin/admin123)
- Demo lender (kdavidsh/demo123)
- 6 sample notes
- 4 sample participations

### Testing Workflow
1. Start server: `npm run dev`
2. Login as admin at http://localhost:5000/admin
3. View pending registrations and participations
4. Test approval workflow
5. Test payment status updates

## Integration Notes

### QuickBooks
Currently, accounting notifications are sent via email. QuickBooks API integration is planned but not yet implemented. The admin should:
1. Receive accounting notification email
2. Manually enter data in QuickBooks
3. Mark funding status in admin portal

### Airtable
Previous Airtable automation can be replaced by this system. Email notifications serve the same purpose as Airtable workflows.

## Security Considerations

### Production Checklist
- [ ] Replace mock authentication with proper JWT/session system
- [ ] Implement role-based access control middleware
- [ ] Add CSRF protection
- [ ] Use HTTPS in production
- [ ] Implement rate limiting on admin endpoints
- [ ] Add audit logging for admin actions
- [ ] Secure password generation (longer, more complex)
- [ ] Implement password reset functionality
- [ ] Add 2FA for admin accounts

### Email Security
- Never commit Gmail credentials to git
- Use environment variables only
- Rotate app passwords periodically
- Monitor sent email logs

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify Firebase connection
3. Confirm email configuration
4. Test with demo credentials first

## Next Steps

Recommended enhancements:
1. Add user role management UI
2. Implement note creation form in admin panel
3. Add activity log viewer
4. Create reports/analytics dashboard
5. Implement QuickBooks API integration
6. Add document upload and verification
7. Create email template customization
