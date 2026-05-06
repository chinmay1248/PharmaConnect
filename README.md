# PharmaConnect

PharmaConnect is a pharmaceutical supply-chain platform for India that connects `Company -> Wholesaler -> Retailer -> Customer`.

The codebase currently focuses on the customer module first: a React Native + Expo app in `mobile/` and an Express + Prisma backend in `backend/`.

## Current Status

The repository is no longer just a UI prototype. It now has a working backend foundation, seeded platform data, and a customer flow that mixes live backend integration with local fallback behavior.

### Completed Work

- Customer mobile app shell with splash, signup, home, search, medicine detail, pharmacy comparison, cart, prescription, payment, delivery, tracking, invoice, orders, and account screens
- Backend API foundation with modular Express routes and Prisma data model
- Initial Prisma migration plus seed data for users, medicines, retailers, inventory, and related platform entities
- Live medicine catalogue, search, medicine detail, and retailer comparison APIs
- Backend-linked customer signup/login flow in the mobile app
- Persisted customer session restore on app startup, plus sign-out from the account screen
- Session token handling in the mobile API client for authenticated backend requests
- Editable customer addresses with add, update, delete, and default-address controls
- Customer order creation wired to backend order APIs
- Retailer order operations APIs for queue, approve/reject, fulfilment status, and delivery stock settlement
- Prescription upload draft flow wired to backend prescription endpoints
- Order history, order tracking, and invoice fetch wired to backend endpoints
- Invoice download/export wired to backend invoice links and fallback export endpoint
- Customer notification inbox actions and tracking refresh/polling wired to backend updates
- Customer web sessions register a backend notification device token for future push delivery work
- Graceful fallback to local prototype data when backend services are unavailable
- Verified builds:
  - `mobile`: `npx tsc --noEmit`
  - `backend`: `npm run build`

### Partially Complete

- Payment now has a Razorpay-shaped backend initiation and signature verification path, with demo fallback when gateway credentials are not configured
- Prescription upload now uses the Expo web file picker when available and stores development files under backend local storage; production cloud storage is still pending
- Invoice export now generates PDF downloads with short-lived signed links; durable PDF object storage is still pending
- Retailer app UI exists for dashboard, customer order approval/rejection, prescription review, fulfilment status, inventory, and B2B buying; production navigation/auth polish is still pending
- Production push delivery and live courier/location tracking are still pending
- Some customer screens still rely on fallback mock data when the related backend service is missing or offline

### Not Started Yet

- Wholesaler module
- Company module
- Production deployment

## Repository Structure

```text
PharmaConnect/
|-- assets/                 Reference branding and diagrams
|-- backend/                Express + Prisma backend
|-- docs/                   Planning notes and progress reports
|-- mobile/                 Expo customer app
|-- LICENSE
`-- README.md
```

## How To Run Locally

### Backend

1. Go to `backend/`
2. Install dependencies with `npm install`
3. Create `backend/.env` with at least:

```env
DATABASE_URL=your_database_url
PORT=4000
CLIENT_ORIGIN=http://localhost:8087
RAZORPAY_KEY_ID=optional_razorpay_key_id
RAZORPAY_KEY_SECRET=optional_razorpay_key_secret
INVOICE_LINK_SECRET=replace_with_a_long_random_invoice_link_secret
```

4. Generate Prisma client: `npm run prisma:generate`
5. Run migrations if needed: `npm run prisma:migrate`
6. Seed sample data: `npm run seed`
7. Start the backend: `npm run dev`

The API runs on `http://localhost:4000` by default.

### Mobile App

1. Go to `mobile/`
2. Install dependencies with `npm install`
3. Set the backend URL for Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:4000/api"
```

4. Start the app with `npm run web` or `npm run start`

Customer is the default mobile module. To run the retailer module intentionally:

```powershell
$env:EXPO_PUBLIC_APP_MODULE="retailer"
npm run web
```

If the backend is unavailable, the customer app will still open in local prototype mode.

## What The Customer Flow Can Do Right Now

- Create or restore a customer account against the backend
- Persist that session across app reloads
- Browse and search medicines
- Open medicine details
- Compare retailer stock and pricing
- Select a retailer and place an order
- Attach prescription upload files for prescription medicines, using browser-selected camera/gallery files on Expo web and backend local storage in development
- Initiate non-COD payments through backend gateway endpoints, falling back to demo confirmation when gateway credentials are absent
- View order history
- View tracking timeline with manual refresh and lightweight backend polling
- View invoice summary and download a generated PDF invoice from signed backend links
- Open order-related notifications directly into the tracking screen and mark notifications read
- Register the current web session as a notification device for future push delivery
- Manage multiple saved delivery addresses in account settings

## Next To-Do List

Priority order for the next implementation steps:

1. Add native mobile Razorpay SDK support alongside the implemented Expo web checkout path
2. Add production cloud storage and richer retailer prescription review controls
3. Add durable object storage for generated invoice PDFs
4. Add production push notification delivery and live courier/location tracking

## Important Notes

- This is still an active prototype, not a production-ready medicine ordering system
- The customer module is the only implemented product area today
- The repository contains both live integrations and local fallback/demo behavior by design
