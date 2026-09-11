# Production readiness — remaining steps

Everything below needs a real account, a paid service, or a business/legal
decision, which is why it wasn't done automatically. Work through it top to
bottom before a real launch.

## 1. Database
- [ ] Provision a hosted Postgres instance (Supabase, Railway Postgres, etc.).
- [ ] In `backend/prisma/schema.prisma`, change the `datasource db` provider
      from `sqlite` to `postgresql`.
- [ ] Point `DATABASE_URL` at the hosted instance and run
      `npx prisma migrate deploy`.
- [ ] Run `npm run seed` (or a trimmed production seed) once against it.

## 2. Backend hosting (e.g. Railway)
- [ ] Push to GitHub, connect the `backend/` folder as a Railway service.
- [ ] Set every variable from `backend/.env.example` in Railway's Variables
      tab — `SESSION_TOKEN_SECRET` and `INVOICE_LINK_SECRET` must be long
      random values, not the placeholder text.
- [ ] Confirm `GET /api/health` returns `200` on the deployed URL.

## 3. File storage
- [ ] Create an S3 bucket, set `S3_BUCKET_NAME`, `AWS_REGION`,
      `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Without these the backend
      falls back to local disk, which does not survive a redeploy on most
      hosts.

## 4. Payments
- [ ] Create a live (or test-mode, for a soft launch) Razorpay account, set
      `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
- [ ] Run one real UPI/card payment end-to-end and confirm the order,
      invoice, and notification all fire correctly.

## 5. Push notifications
- [ ] Set `EXPO_PUSH_ACCESS_TOKEN` (from an Expo account with the project
      linked).
- [ ] Install a build on a real device and confirm at least one of each
      notification type from the checklist in
      `PharmaConnect_Pathway_Checklist.txt` §15.4 actually arrives.

## 6. Mobile app build (EAS)
- [ ] `mobile/eas.json` now exists with development/preview/production
      profiles — replace the placeholder `EXPO_PUBLIC_API_BASE_URL` values
      in it with the real deployed backend URL(s) once step 2 is done.
- [ ] `mobile/app.json` now has a real name/slug/bundle id
      (`app.pharmaconnect.mobile`) — replace `./assets/icon.png`,
      `adaptive-icon.png`, and `splash-icon.png` with final branded artwork
      (they're still the default Expo placeholders).
- [ ] Run `eas build --platform android --profile production`, test the
      resulting build on a real phone.

## 7. Auth model decision
The app currently uses email/phone + password login (no OTP/Firebase phone
verification, no Google sign-in, no refresh-token rotation, no password
reset). Confirm this is the intended final design, or scope OTP-based auth
as a follow-up — it's a meaningfully different auth flow, not a small patch.

## 8. Compliance
- [ ] Confirm what's required to legally verify a retailer/wholesaler/
      company's drug license before they can transact on the platform.
- [ ] Confirm data-handling requirements for prescription images and health
      data under applicable law (e.g. India's DPDP Act) and that the current
      signed-URL prescription storage satisfies them.
- [ ] Add Terms of Service / Privacy Policy screens if none exist yet.

## Already done (see git history)
Backend security headers, rate limiting, request logging (`helmet`,
`express-rate-limit`, `morgan`), and a GitHub Actions CI pipeline that
type-checks both apps and runs the 69-check smoke suite on every push are
already in place and don't need any of the above.
