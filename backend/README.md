# Backend

This folder contains the production backend foundation for PharmaConnect.

## Planned Role Coverage

- Customer
- Retailer
- Wholeseller
- Company

## Current Scope In This Phase

- Express API skeleton
- Environment configuration
- Modular route structure
- Prisma schema for core platform entities

## Folder Layout

```text
backend/
|-- prisma/                 Database schema
|-- src/
|   |-- config/             Environment and server config
|   |-- modules/            Business modules grouped by domain
|   |-- routes/             Top-level API routing
|   |-- app.ts              Express app setup
|   `-- server.ts           Server bootstrap
|-- .env.example
|-- package.json
`-- tsconfig.json
```

## First Build Target

The first real backend target is:

1. Customer authentication
2. Medicine catalogue and search
3. Nearby retailer inventory lookup
4. Customer order creation
5. Prescription upload flow
6. Retailer approval/rejection flow
7. Payment and invoice records

## Local Commands

```bash
npm install
npm run prisma:generate
npm run dev
```
