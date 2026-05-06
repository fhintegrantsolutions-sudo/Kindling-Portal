// Note: legacy admin actions for note_registrations were removed in the
// unified-funding refactor. Funding lives on participations now and the
// note_registrations table is an audit log only — no admin workflow runs
// against it.
//
// Active admin actions for the financial loop live in:
//   - src/lib/admin/access-request-actions.ts  (approveAccessRequest, rejectAccessRequest)
//   - src/lib/admin/funding-actions.ts          (updateFundingStatus on participations)
//   - src/lib/admin/participation-invite-action.ts (invite lender once funded)
//   - src/lib/admin/user-actions.ts             (role changes)
//   - src/lib/admin/referral-actions.ts         (referral code grants)
export {};
