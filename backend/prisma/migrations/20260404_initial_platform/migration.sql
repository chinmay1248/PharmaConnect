-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'RETAILER', 'WHOLESELLER', 'COMPANY', 'ADMIN');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'BILLING', 'SHOP', 'WAREHOUSE', 'REGISTERED_OFFICE');

-- CreateEnum
CREATE TYPE "MedicineType" AS ENUM ('OTC', 'PRESCRIPTION');

-- CreateEnum
CREATE TYPE "CustomerOrderStatus" AS ENUM ('PENDING_RETAILER_APPROVAL', 'REJECTED_BY_RETAILER', 'APPROVED_BY_RETAILER', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING_APPROVAL', 'REJECTED', 'APPROVED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CARD', 'BANK_TRANSFER', 'CASH_ON_DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('HOME_DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('NOT_REQUIRED', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'GENERATED', 'SHARED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SchemeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'PAYMENT', 'DELIVERY', 'PRESCRIPTION', 'OFFER', 'SCHEME', 'STOCK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AnalyticsScope" AS ENUM ('RETAILER', 'WHOLESELLER', 'COMPANY', 'PLATFORM');

-- CreateEnum
CREATE TYPE "InventoryAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRY_WARNING', 'EXPIRED_BATCH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'HOME',
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "gstNumber" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wholeseller" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "gstNumber" TEXT,
    "serviceArea" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wholeseller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerWholesellerLink" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerWholesellerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierLink" (
    "id" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "brandName" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "packSize" TEXT NOT NULL,
    "description" TEXT,
    "medicineType" "MedicineType" NOT NULL DEFAULT 'OTC',
    "mrp" DECIMAL(10,2) NOT NULL,
    "isGeneric" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineSearchAlias" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineSearchAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaltComposition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SaltComposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineComposition" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "saltCompositionId" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "MedicineComposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disease" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineDisease" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,

    CONSTRAINT "MedicineDisease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerInventory" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerInventoryBatch" (
    "id" TEXT NOT NULL,
    "retailerInventoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerInventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesellerInventory" (
    "id" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesellerInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesellerInventoryBatch" (
    "id" TEXT NOT NULL,
    "wholesellerInventoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesellerInventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "deliveryAddressId" TEXT,
    "status" "CustomerOrderStatus" NOT NULL DEFAULT 'PENDING_RETAILER_APPROVAL',
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "subtotalAmount" DECIMAL(10,2) NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "rejectionReason" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrderItem" (
    "id" TEXT NOT NULL,
    "customerOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "customerOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "medicineId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "originalFileName" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'UPLOADED',
    "retailerNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "customerOrderId" TEXT,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "gatewayReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceRecord" (
    "id" TEXT NOT NULL,
    "customerOrderId" TEXT,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'GENERATED',
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTrackingEvent" (
    "id" TEXT NOT NULL,
    "customerOrderId" TEXT NOT NULL,
    "createdByRetailerId" TEXT,
    "statusLabel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerPurchaseOrder" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "subtotalAmount" DECIMAL(10,2) NOT NULL,
    "schemeDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "rejectionReason" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerPurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "retailerPurchaseOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "RetailerPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesellerPurchaseOrder" (
    "id" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "subtotalAmount" DECIMAL(10,2) NOT NULL,
    "offerDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "rejectionReason" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesellerPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesellerPurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "wholesellerPurchaseOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "WholesellerPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BShipmentTrackingEvent" (
    "id" TEXT NOT NULL,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "statusLabel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2BShipmentTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "discountType" TEXT,
    "discountValue" DECIMAL(10,2),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "retailerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SchemeStatus" NOT NULL DEFAULT 'DRAFT',
    "discountType" TEXT,
    "discountValue" DECIMAL(10,2),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "retailerId" TEXT,
    "wholesellerId" TEXT,
    "companyId" TEXT,
    "customerOrderId" TEXT,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "referenceKind" TEXT,
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "scope" "AnalyticsScope" NOT NULL,
    "retailerId" TEXT,
    "wholesellerId" TEXT,
    "companyId" TEXT,
    "metricKey" TEXT NOT NULL,
    "metricValue" DECIMAL(14,2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" TEXT NOT NULL,
    "retailerInventoryId" TEXT,
    "wholesellerInventoryId" TEXT,
    "type" "InventoryAlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");

-- CreateIndex
CREATE INDEX "Company_legalName_idx" ON "Company"("legalName");

-- CreateIndex
CREATE UNIQUE INDEX "Wholeseller_userId_key" ON "Wholeseller"("userId");

-- CreateIndex
CREATE INDEX "Wholeseller_businessName_idx" ON "Wholeseller"("businessName");

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_userId_key" ON "Retailer"("userId");

-- CreateIndex
CREATE INDEX "Retailer_businessName_idx" ON "Retailer"("businessName");

-- CreateIndex
CREATE INDEX "Retailer_city_area_idx" ON "Retailer"("city", "area");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerWholesellerLink_retailerId_wholesellerId_key" ON "RetailerWholesellerLink"("retailerId", "wholesellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierLink_wholesellerId_companyId_key" ON "SupplierLink"("wholesellerId", "companyId");

-- CreateIndex
CREATE INDEX "Medicine_brandName_idx" ON "Medicine"("brandName");

-- CreateIndex
CREATE INDEX "Medicine_genericName_idx" ON "Medicine"("genericName");

-- CreateIndex
CREATE INDEX "MedicineSearchAlias_alias_idx" ON "MedicineSearchAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineSearchAlias_medicineId_alias_key" ON "MedicineSearchAlias"("medicineId", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "SaltComposition_name_key" ON "SaltComposition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineComposition_medicineId_saltCompositionId_key" ON "MedicineComposition"("medicineId", "saltCompositionId");

-- CreateIndex
CREATE UNIQUE INDEX "Disease_name_key" ON "Disease"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineDisease_medicineId_diseaseId_key" ON "MedicineDisease"("medicineId", "diseaseId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerInventory_retailerId_medicineId_key" ON "RetailerInventory"("retailerId", "medicineId");

-- CreateIndex
CREATE INDEX "RetailerInventoryBatch_retailerInventoryId_expiryDate_idx" ON "RetailerInventoryBatch"("retailerInventoryId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "WholesellerInventory_wholesellerId_medicineId_key" ON "WholesellerInventory"("wholesellerId", "medicineId");

-- CreateIndex
CREATE INDEX "WholesellerInventoryBatch_wholesellerInventoryId_expiryDate_idx" ON "WholesellerInventoryBatch"("wholesellerInventoryId", "expiryDate");

-- CreateIndex
CREATE INDEX "CustomerOrder_customerId_placedAt_idx" ON "CustomerOrder"("customerId", "placedAt");

-- CreateIndex
CREATE INDEX "CustomerOrder_retailerId_placedAt_idx" ON "CustomerOrder"("retailerId", "placedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_customerOrderId_key" ON "Prescription"("customerOrderId");

-- CreateIndex
CREATE INDEX "PaymentRecord_customerOrderId_idx" ON "PaymentRecord"("customerOrderId");

-- CreateIndex
CREATE INDEX "PaymentRecord_retailerPurchaseOrderId_idx" ON "PaymentRecord"("retailerPurchaseOrderId");

-- CreateIndex
CREATE INDEX "PaymentRecord_wholesellerPurchaseOrderId_idx" ON "PaymentRecord"("wholesellerPurchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceRecord_customerOrderId_key" ON "InvoiceRecord"("customerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceRecord_retailerPurchaseOrderId_key" ON "InvoiceRecord"("retailerPurchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceRecord_wholesellerPurchaseOrderId_key" ON "InvoiceRecord"("wholesellerPurchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceRecord_invoiceNumber_key" ON "InvoiceRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "DeliveryTrackingEvent_customerOrderId_createdAt_idx" ON "DeliveryTrackingEvent"("customerOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "RetailerPurchaseOrder_retailerId_placedAt_idx" ON "RetailerPurchaseOrder"("retailerId", "placedAt");

-- CreateIndex
CREATE INDEX "RetailerPurchaseOrder_wholesellerId_placedAt_idx" ON "RetailerPurchaseOrder"("wholesellerId", "placedAt");

-- CreateIndex
CREATE INDEX "WholesellerPurchaseOrder_wholesellerId_placedAt_idx" ON "WholesellerPurchaseOrder"("wholesellerId", "placedAt");

-- CreateIndex
CREATE INDEX "WholesellerPurchaseOrder_companyId_placedAt_idx" ON "WholesellerPurchaseOrder"("companyId", "placedAt");

-- CreateIndex
CREATE INDEX "B2BShipmentTrackingEvent_retailerPurchaseOrderId_createdAt_idx" ON "B2BShipmentTrackingEvent"("retailerPurchaseOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "B2BShipmentTrackingEvent_wholesellerPurchaseOrderId_created_idx" ON "B2BShipmentTrackingEvent"("wholesellerPurchaseOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_companyId_status_idx" ON "Offer"("companyId", "status");

-- CreateIndex
CREATE INDEX "Offer_wholesellerId_status_idx" ON "Offer"("wholesellerId", "status");

-- CreateIndex
CREATE INDEX "Scheme_wholesellerId_status_idx" ON "Scheme"("wholesellerId", "status");

-- CreateIndex
CREATE INDEX "Scheme_retailerId_status_idx" ON "Scheme"("retailerId", "status");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDevice_deviceToken_key" ON "NotificationDevice"("deviceToken");

-- CreateIndex
CREATE INDEX "NotificationDevice_userId_idx" ON "NotificationDevice"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_scope_periodStart_periodEnd_idx" ON "AnalyticsSnapshot"("scope", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "InventoryAlert_type_createdAt_idx" ON "InventoryAlert"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wholeseller" ADD CONSTRAINT "Wholeseller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerWholesellerLink" ADD CONSTRAINT "RetailerWholesellerLink_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerWholesellerLink" ADD CONSTRAINT "RetailerWholesellerLink_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLink" ADD CONSTRAINT "SupplierLink_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLink" ADD CONSTRAINT "SupplierLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineSearchAlias" ADD CONSTRAINT "MedicineSearchAlias_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineComposition" ADD CONSTRAINT "MedicineComposition_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineComposition" ADD CONSTRAINT "MedicineComposition_saltCompositionId_fkey" FOREIGN KEY ("saltCompositionId") REFERENCES "SaltComposition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDisease" ADD CONSTRAINT "MedicineDisease_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDisease" ADD CONSTRAINT "MedicineDisease_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerInventory" ADD CONSTRAINT "RetailerInventory_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerInventory" ADD CONSTRAINT "RetailerInventory_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerInventoryBatch" ADD CONSTRAINT "RetailerInventoryBatch_retailerInventoryId_fkey" FOREIGN KEY ("retailerInventoryId") REFERENCES "RetailerInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesellerInventory" ADD CONSTRAINT "WholesellerInventory_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesellerInventory" ADD CONSTRAINT "WholesellerInventory_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesellerInventoryBatch" ADD CONSTRAINT "WholesellerInventoryBatch_wholesellerInventoryId_fkey" FOREIGN KEY ("wholesellerInventoryId") REFERENCES "WholesellerInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTrackingEvent" ADD CONSTRAINT "DeliveryTrackingEvent_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTrackingEvent" ADD CONSTRAINT "DeliveryTrackingEvent_createdByRetailerId_fkey" FOREIGN KEY ("createdByRetailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPurchaseOrder" ADD CONSTRAINT "RetailerPurchaseOrder_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPurchaseOrder" ADD CONSTRAINT "RetailerPurchaseOrder_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPurchaseOrderItem" ADD CONSTRAINT "RetailerPurchaseOrderItem_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPurchaseOrderItem" ADD CONSTRAINT "RetailerPurchaseOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesellerPurchaseOrder" ADD CONSTRAINT "WholesellerPurchaseOrder_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesellerPurchaseOrder" ADD CONSTRAINT "WholesellerPurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesellerPurchaseOrderItem" ADD CONSTRAINT "WholesellerPurchaseOrderItem_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesellerPurchaseOrderItem" ADD CONSTRAINT "WholesellerPurchaseOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BShipmentTrackingEvent" ADD CONSTRAINT "B2BShipmentTrackingEvent_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BShipmentTrackingEvent" ADD CONSTRAINT "B2BShipmentTrackingEvent_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDevice" ADD CONSTRAINT "NotificationDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_retailerInventoryId_fkey" FOREIGN KEY ("retailerInventoryId") REFERENCES "RetailerInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_wholesellerInventoryId_fkey" FOREIGN KEY ("wholesellerInventoryId") REFERENCES "WholesellerInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

