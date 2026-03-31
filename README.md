# PharmaConnect

PharmaConnect is a role-based pharma supply chain platform designed around one connected business chain:

Company -> Wholeseller -> Retailer -> Customer

This repository currently focuses on the customer-facing frontend prototype and the product documents used to shape the larger platform.

## Current Scope

- Customer mobile frontend prototype in Expo / React Native
- Project documents for customer, retailer, wholeseller, and company flows
- Coded PharmaConnect branding and Amazon-inspired commerce layout direction
- Prototype checkout flow with medicine search, pharmacy comparison, prescription branch, payment, delivery, tracking, and invoice

## Repository Structure

```text
PharmaConnect/
├─ mobile/                                   Expo React Native customer app
├─ PharmaConnect_Project_Document.txt        Core project overview
├─ PharmaConnect_Pathway_Checklist.txt       Customer pathway details
├─ PharmaConnect_Retailer_Wholesaler_Company.txt
├─ PharmaConnect_Customer_Module_Progress_Report.txt
└─ design reference images and diagrams
```

## Mobile App Highlights

- White / black / blue theme system with dark mode default
- Animated coded PharmaConnect logo
- Compact logo in the app header after login
- Interactive cards, chips, buttons, and bottom navigation with hover zoom and pressed feedback
- Functional customer tabs:
  - Home
  - Search
  - Orders
  - Cart
  - Account

## Run Locally

From the `mobile` folder:

```bash
npm install
npm run web
```

Then open the local Expo web URL shown in the terminal.

## Technology

- Expo
- React Native
- TypeScript
- React Native Web
- Expo Vector Icons

## Project Status

This is still a prototype frontend, not a production deployment.

Already present:

- customer UI flow
- mock medicine and pharmacy data
- navigation between key customer screens
- invoice and order flow prototype

Still needed for production:

- backend APIs
- database
- authentication
- prescription file storage
- retailer workflow integration
- real payment gateway
- notifications
- deployment pipeline

## Notes

- All future Git commits for this repository are configured to use the `chinmay1248` identity.
- The current codebase is focused on making the customer flow understandable, clickable, and easy to extend.
