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
- Customer order creation wired to backend order APIs
- Prescription upload draft flow wired to backend prescription endpoints
- Order history, order tracking, and invoice fetch wired to backend endpoints
- Graceful fallback to local prototype data when backend services are unavailable
- Verified builds:
  - `mobile`: `npx tsc --noEmit`
  - `backend`: `npm run build`

### Partially Complete

- Payment is still a demo confirmation flow, not a real gateway integration
- Prescription upload currently stores metadata and mock file URLs, not real cloud storage
- Download invoice action is still a placeholder in the mobile UI
- Some customer screens still rely on fallback mock data when the related backend service is missing or offline

### Not Started Yet

- Retailer module
- Wholesaler module
- Company module
- Real notifications
- Real-time/live tracking
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

If the backend is unavailable, the customer app will still open in local prototype mode.

## What The Customer Flow Can Do Right Now

- Create or restore a customer account against the backend
- Persist that session across app reloads
- Browse and search medicines
- Open medicine details
- Compare retailer stock and pricing
- Select a retailer and place an order
- Attach prescription metadata for prescription medicines
- Simulate payment confirmation for non-COD orders
- View order history
- View tracking timeline
- View invoice summary

## Next To-Do List

Priority order for the next implementation steps:

1. Replace  demo  payment  confirmation  with  a  real payment  integration  path
2. Add  real  prescription  file  storage  and  order-linked  prescription  review  flow
3. Connect  invoice  download/export  instead  of  the  current  placeholder  button
4. Add  session  token  handling  to  the  API  client  instead  of  relying  on  lightweight  demo  session  behavior
5. Expand customer profile management with editable addresses
6. Build the retailer workflow needed to make the customer flow operational in real business terms
7. Add notifications and richer tracking updates

## Important Notes

- This is still an active prototype, not a production-ready medicine ordering system
- The customer module is the only implemented product area today
- The repository contains both live integrations and local fallback/demo behavior by design
