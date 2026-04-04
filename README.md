# PharmaConnect

PharmaConnect is a role-based pharmaceutical supply chain platform designed around one connected business flow:

Company -> Wholeseller -> Retailer -> Customer

The repository currently contains the customer-facing mobile prototype, structured project documents, and design reference assets for the larger platform vision.

## Repository Layout

```text
PharmaConnect/
|-- assets/
|   `-- references/                  Branding and flow reference images
|-- backend/                         Express + Prisma backend foundation
|-- docs/
|   |-- planning/                    Core project planning documents
|   `-- reports/                     Progress reports and daily status updates
|-- mobile/                          Expo React Native customer app prototype
|-- LICENSE
`-- README.md
```

## What Exists Today

- Customer mobile frontend prototype in Expo + React Native
- Backend foundation in Express + Prisma
- Mock medicine discovery, comparison, cart, prescription, payment, delivery, tracking, and invoice flow
- Centralized theme, reusable UI components, and coded PharmaConnect branding
- Project planning documents for customer, retailer, wholeseller, and company modules

## Important Folders

### `mobile/`

Current working application code.

- `src/components/` reusable UI building blocks
- `src/data/` mock business data
- `src/screens/` customer module screens
- `src/theme/` shared theme tokens
- `src/utils/` shared helper functions

### `backend/`

Production backend foundation.

- `src/config/` environment and backend config
- `src/modules/` domain-wise API modules
- `src/routes/` top-level API routing
- `prisma/` database schema

### `docs/planning/`

Project vision and business-flow documents.

- `PharmaConnect_Project_Document.txt`
- `PharmaConnect_Pathway_Checklist.txt`
- `PharmaConnect_Retailer_Wholesaler_Company.txt`

### `docs/reports/`

Progress-oriented documentation.

- `PharmaConnect_Customer_Module_Progress_Report.txt`
- `PharmaConnect_Current_Status_And_Future_Work.txt`

### `assets/references/`

Reference images used for planning and design alignment.

## Run The Customer App

From the `mobile` folder:

```bash
npm install
npm run web
```

Then open the local Expo web URL shown in the terminal.

## Current Status

The repository is still in prototype stage, not production stage.

Already available:

- customer-side frontend
- backend skeleton
- initial Prisma data model
- mock business data
- local app build setup
- structured planning documentation

Still pending for the full platform:

- backend
- authentication
- real database migrations and data access
- retailer module
- wholeseller module
- company module
- real payment and prescription integrations
- deployment pipeline

## Repo Management Notes

- The root folder is now limited to high-level project files only.
- Documents and reference assets are separated into dedicated folders.
- Editor-specific files are ignored to keep the repo cleaner.
- Future Git commits in this repository should use the `chinmay1248` identity.
