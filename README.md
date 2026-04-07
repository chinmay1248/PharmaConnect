# PharmaConnect - Pharmaceutical Supply Chain Platform

## What is PharmaConnect?

PharmaConnect is a complete digital platform for managing the pharmaceutical supply chain in India. It connects all four key players in the medicine distribution process:

**Company** (Manufacturers) → **Wholesaler** (Distributors) → **Retailer** (Pharmacies) → **Customer** (End Users)

The platform allows each participant to manage their part of the supply chain digitally, making medicine ordering, tracking, and delivery more efficient and transparent.

---

## Current Development Status

**What's Built:** Customer-facing mobile app prototype  
**What's In Progress:** Backend foundation and database structure  
**What's Planned:** Retailer, Wholesaler, and Company modules

This is currently a **working prototype**, not a production-ready system. It demonstrates the core features and user experience for the customer side of the platform.

---

## Project Structure

The repository is organized into clear sections:
```text
PharmaConnect/
├── assets/
│   └── references/          Brand logos, design mockups, and workflow diagrams
├── backend/                 Server-side code (Express.js + Prisma)
├── docs/
│   ├── planning/           Project vision and feature plans
│   └── reports/            Development progress updates
├── mobile/                  Customer mobile app (React Native + Expo)
├── LICENSE
└── README.md
```

---

## Detailed Folder Guide

###  `mobile/` - Customer Mobile App

This is the main working application where customers can browse medicines, place orders, and track deliveries.

**Inside this folder:**

- **`src/components/`** - Reusable UI pieces like buttons, cards, and input fields
- **`src/data/`** - Fake data used for testing (medicines, orders, etc.)
- **`src/screens/`** - Different app pages customers see (Home, Cart, Orders, etc.)
- **`src/theme/`** - Colors, fonts, and styling rules used throughout the app
- **`src/utils/`** - Helper functions for common tasks

**Key Features Built:**
- Browse medicines by category
- Search and filter medicines
- Compare prices across pharmacies
- Add items to cart
- Upload prescriptions
- Complete payment flow
- Track delivery status
- View order history and invoices

---

###  `backend/` - Server and Database

This folder contains the server code that will handle data storage, user authentication, and business logic.

**Inside this folder:**

- **`src/config/`** - Server settings and environment variables
- **`src/modules/`** - Organized code for different features (users, orders, medicines)
- **`src/routes/`** - API endpoints that the mobile app will call
- **`prisma/`** - Database structure definitions

**Current Status:**
- Basic server structure is set up
- Database schema is defined
- API routes are outlined
- **Not yet connected to the mobile app** (still using mock data)

---

###  `docs/planning/` - Project Planning Documents

These text files explain the complete vision for PharmaConnect and how all four modules will work together.

**Key Documents:**

1. **`PharmaConnect_Project_Document.txt`**  
   Complete overview of the entire platform, all four user types, and how they interact

2. **`PharmaConnect_Pathway_Checklist.txt`**  
   Step-by-step development roadmap showing what to build and in what order

3. **`PharmaConnect_Retailer_Wholesaler_Company.txt`**  
   Detailed features for the three business-side modules (not yet built)

---

###  `docs/reports/` - Progress Reports

These documents track what's been completed and what's coming next.

**Key Documents:**

1. **`PharmaConnect_Customer_Module_Progress_Report.txt`**  
   Summary of all features completed in the customer mobile app

2. **`PharmaConnect_Current_Status_And_Future_Work.txt`**  
   Current state of the project and next development priorities

---

###  `assets/references/` - Design Assets

This folder contains images used during planning and design:

- PharmaConnect branding and logo
- User flow diagrams
- Screen mockups and wireframes
- Visual references for development

---

## How to Run the Customer App

**Requirements:**
- Node.js installed on your computer
- npm (comes with Node.js)

**Steps:**

1. Open your terminal/command prompt

2. Navigate to the mobile app folder:
```bash
   cd mobile
```

3. Install all required packages:
```bash
   npm install
```

4. Start the development server:
```bash
   npm run web
```

5. Open your web browser and go to the URL shown in the terminal (usually `http://localhost:8081`)

The app will open in your browser as a web version of the mobile interface.

---

## What Works Right Now

**Fully Functional:**
- Customer mobile app interface
- Medicine browsing and search
- Shopping cart functionality
- Prescription upload flow
- Mock payment process
- Order tracking display
- Invoice generation
- Consistent branding and design

**Partially Built:**
- Backend server structure
- Database schema
- API route definitions

---

## What's Still To Be Built

**Customer Module:**
- Real backend integration (currently using fake data)
- User authentication (login/signup)
- Real payment gateway integration
- Real prescription verification
- Push notifications
- Live order tracking

**Retailer Module (Pharmacy Owners):**
- Inventory management
- Order fulfillment interface
- Customer prescription verification
- Sales analytics
- Stock alerts

**Wholesaler Module (Distributors):**
- Bulk order management
- Retailer network management
- Inventory tracking
- Delivery logistics
- Invoice generation

**Company Module (Manufacturers):**
- Product catalog management
- Wholesaler network oversight
- Production planning
- Supply chain analytics
- Quality control tracking

**Platform-Wide:**
- Real database with production data
- User authentication and authorization
- File upload and storage
- Email and SMS notifications
- Payment processing
- Deployment to production servers

---

## The Complete Vision

**For Customers:**
Order medicines easily from local pharmacies with prescription upload, price comparison, and home delivery.

**For Retailers:**
Manage pharmacy inventory, process customer orders, verify prescriptions, and coordinate with wholesalers.

**For Wholesalers:**
Supply medicines to multiple retailers, manage bulk inventory, track deliveries, and coordinate with manufacturers.

**For Companies:**
Monitor product distribution, manage relationships with wholesalers, track supply chain metrics, and ensure quality.

---

## Technology Stack

**Mobile App:**
- React Native (cross-platform mobile development)
- Expo (development framework)
- React Navigation (screen navigation)

**Backend:**
- Node.js (JavaScript runtime)
- Express.js (web server framework)
- Prisma (database toolkit)
- PostgreSQL (planned database)

**Development Tools:**
- Git (version control)
- npm (package management)
- Expo CLI (mobile development tools)

---

## Important Notes

This repository is in **active development** - features are being added regularly

The customer app uses **mock data** - no real medicines or pharmacies are connected yet

**Do not use this for real medical orders** - it's a demonstration prototype

Future updates will connect the frontend to the real backend and add the other three modules

Git commits in this repository should use the identity: **chinmay1248**

---

## Next Development Priorities

1. Connect customer mobile app to real backend APIs
2. Implement user authentication (login/signup)
3. Set up production database with real data
4. Build retailer dashboard interface
5. Create wholesaler management system
6. Develop company oversight platform
7. Integrate real payment gateway
8. Add prescription verification system
9. Deploy to production servers
10. Launch pilot program with real pharmacies

---

## Questions or Contributions?

This is a learning and development project demonstrating a complete supply chain platform for the pharmaceutical industry.

For more details, refer to the planning documents in the `docs/planning/` folder.