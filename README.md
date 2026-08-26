# PharmaConnect

PharmaConnect is a pharmaceutical supply-chain platform for India that connects `Company -> Wholesaler -> Retailer -> Customer`.

It consists of a React Native + Expo app in `mobile/` that serves all four roles, and an Express + Prisma backend in `backend/`.

## Current Status

All four modules run against the live backend behind real authentication. A customer can register, order, pay, track a courier in real time, and download an invoice; a pharmacy can review prescriptions, fulfil orders, manage inventory, and restock from a wholesaler; wholesalers and manufacturers can work their own order books and offers.

### Completed Work

**Authentication and access control**

- One sign-in screen for every role. The backend decides the role and the app opens the matching module; there is no role switcher.
- Signed, expiring session tokens (HMAC-SHA256) issued on sign-in and verified by `requireAuth` middleware.
- Sessions persist through AsyncStorage on device and in the browser, and are revalidated against the backend on launch. An expired or revoked token returns to the sign-in screen instead of a half-loaded dashboard.
- Every private route is scoped to its owner: customers reach only their own orders, addresses, invoices, prescriptions, and notifications; a pharmacy reaches only its own queue, inventory, and analytics; the same holds for wholesalers and manufacturers.
- Prescription images and invoice PDFs are private, served through short-lived signed links so an `<Image>` tag or browser download works without an Authorization header. Signed links are minted fresh on every read, so a pharmacy reviewing an order hours later still gets a working link.

**Customer**

- Splash, home, search, medicine detail, pharmacy comparison, cart, prescription upload, payment, delivery, tracking, invoice, orders, notifications, and account screens.
- Live medicine catalogue, search, detail, and retailer comparison against 4,900+ real medicines seeded from `indian_medicine_data.csv`.
- Order placement with stock reservation, prescription attachment, Razorpay or COD payment, and generated PDF invoices.
- Multiple saved delivery addresses with add, edit, delete, and default selection.

**Pharmacy, wholesaler, and manufacturer**

- Pharmacy dashboard, order queue with approve/reject and prescription review, fulfilment status transitions, inventory with batches, and B2B restock ordering.
- Wholesaler dashboard, retailer-order fulfilment, and company-buying screens.
- Manufacturer dashboard, wholesaler-order fulfilment, and offer management.

**Notifications and tracking**

- Push notification delivery through the Expo push service, wired to every order lifecycle event. Pushes are scheduled only after the order transaction commits, so a rolled-back order never sends one.
- Devices register per signed-in user and detach on sign-out, so a shared device never inherits the previous account's notifications.
- Tapping a push opens the order it refers to; notifications arriving in the foreground refresh the inbox badge.
- Live courier tracking: dispatching an order opens a courier record, the pharmacy shares position and ETA from the delivery device, and the customer's tracking screen polls a lightweight endpoint every 10 seconds.

**Storage**

- Prescription uploads and invoice PDFs write to S3 when `S3_BUCKET_NAME` is configured, and to `backend/storage` on disk otherwise. Both paths serve through the same link shape.

### Verified

- `backend`: `npm run build`
- `mobile`: `npx tsc --noEmit` and `npx expo export --platform web`
- `backend`: `npm run smoke` — 61 end-to-end checks covering authentication, authorization boundaries between all four roles, the full customer order lifecycle, live tracking, invoices, notifications, B2B restocking, and prescription privacy.

### Not Started Yet

- Production deployment (Railway/Vercel/EAS build and store submission)
- Firebase phone OTP sign-in; the platform currently uses email or phone plus password
- Analytics charts and CSV/PDF report exports for the B2B dashboards

## Repository Structure

```text
PharmaConnect/
|-- assets/                    Reference branding and diagrams
|-- backend/                   Express + Prisma backend
|   |-- prisma/                Schema, migrations, and seeds
|   |-- scripts/smoke-test.mjs End-to-end API smoke test
|   `-- src/
|       |-- config/            Environment validation
|       |-- lib/               Tokens, signed links, storage, push, notifications
|       |-- middleware/        Authentication and ownership scoping
|       `-- modules/           One router per domain
|-- docs/                      Planning notes and progress reports
|-- mobile/                    Expo app for all four roles
|   `-- src/
|       |-- screens/           AuthGate plus one module per role
|       `-- services/          API client, session, push, tracking
|-- indian_medicine_data.csv   Medicine catalogue used by the seed
|-- LICENSE
`-- README.md
```

## How To Run Locally

### Backend

1. Go to `backend/`
2. Install dependencies with `npm install`
3. Copy `.env.example` to `.env`. The defaults run against a local SQLite file and need no further setup. For a hosted database, set `DATABASE_URL` and change the `provider` in `prisma/schema.prisma` to `postgresql`.
4. Generate the Prisma client: `npm run prisma:generate`
5. Apply migrations: `npm run prisma:migrate`
6. Seed the demo accounts and platform data: `npm run seed`
7. Seed the real medicine catalogue: `npm run seed:csv`. This reads `indian_medicine_data.csv` from the repository root; set `MEDICINE_CSV_PATH` if you keep it elsewhere. The file is 31 MB and is not committed, so pull it into place before seeding.
8. Start the backend: `npm run dev`

The API runs on `http://localhost:4000` by default.

To verify the whole system end to end while the backend is running:

```powershell
npm run smoke
```

### Mobile App

1. Go to `mobile/`
2. Install dependencies with `npm install`
3. Point the app at the backend:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:4000/api"
```

4. Start the app with `npm run web` or `npm run start`

Sign in with any seeded account; the app opens the module for that account's role.

| Role         | Email                            | Password     |
| ------------ | -------------------------------- | ------------ |
| Customer     | `customer@pharmaconnect.app`     | `Pharma@123` |
| Pharmacy     | `retailer@pharmaconnect.app`     | `Pharma@123` |
| Wholesaler   | `wholeseller@pharmaconnect.app`  | `Pharma@123` |
| Manufacturer | `company@pharmaconnect.app`      | `Pharma@123` |

New customers can register from the Create Account tab. Pharmacy, wholesaler, and manufacturer accounts are onboarded by the platform team rather than self-registered.

Push notifications and courier location need a real device, so they require a development build rather than Expo web:

```powershell
npx expo prebuild
npx expo run:android
```

Use `npx expo run:ios` on macOS. Native Razorpay checkout needs the same development build; Expo web uses the existing web checkout path.

## Configuration

Everything below is optional for local development. See `backend/.env.example` for the full list.

| Variable                                  | Purpose                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `SESSION_TOKEN_SECRET`                    | Signs session tokens. Required in production; development falls back to a shared secret with a warning. |
| `SESSION_TOKEN_TTL_DAYS`                  | Session lifetime, 30 days by default.                                          |
| `INVOICE_LINK_SECRET`                     | Signs invoice and prescription download links.                                 |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Enables live checkout. Without them, payment falls back to demo confirmation.   |
| `S3_BUCKET_NAME` and AWS credentials      | Stores uploads in S3 instead of `backend/storage` on disk.                      |
| `PUSH_DELIVERY_ENABLED`                   | Set to `false` to record notifications in the inbox without sending pushes.     |
| `CLIENT_ORIGIN`                           | Comma-separated browser origins allowed by CORS. Any localhost origin is allowed outside production. |

## Next To-Do List

1. Deploy the backend and database, and produce an EAS build for store submission
2. Add Firebase phone OTP as an alternative sign-in method
3. Add the analytics charts and report exports described in the planning documents

## Important Notes

- This is a pilot-stage system, not a regulated production medicine service. Review the pharmacy licensing, data protection, and prescription handling requirements that apply before serving real patients.
- Some customer screens still fall back to local prototype data when the related backend service is offline, which is deliberate for demos.
