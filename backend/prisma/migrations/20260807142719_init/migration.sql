-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HOME',
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "gstNumber" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wholeseller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "gstNumber" TEXT,
    "serviceArea" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wholeseller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "rating" REAL NOT NULL DEFAULT 0,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Retailer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailerWholesellerLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerId" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailerWholesellerLink_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetailerWholesellerLink_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wholesellerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierLink_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "brandName" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "packSize" TEXT NOT NULL,
    "description" TEXT,
    "medicineType" TEXT NOT NULL DEFAULT 'OTC',
    "mrp" DECIMAL NOT NULL,
    "isGeneric" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Medicine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicineSearchAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicineSearchAlias_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaltComposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "MedicineComposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineId" TEXT NOT NULL,
    "saltCompositionId" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    CONSTRAINT "MedicineComposition_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicineComposition_saltCompositionId_fkey" FOREIGN KEY ("saltCompositionId") REFERENCES "SaltComposition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Disease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "MedicineDisease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    CONSTRAINT "MedicineDisease_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicineDisease_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailerInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "salePrice" DECIMAL NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailerInventory_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetailerInventory_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailerInventoryBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerInventoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailerInventoryBatch_retailerInventoryId_fkey" FOREIGN KEY ("retailerInventoryId") REFERENCES "RetailerInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WholesellerInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wholesellerId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "salePrice" DECIMAL NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WholesellerInventory_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WholesellerInventory_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WholesellerInventoryBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wholesellerInventoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WholesellerInventoryBatch_wholesellerInventoryId_fkey" FOREIGN KEY ("wholesellerInventoryId") REFERENCES "WholesellerInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "deliveryAddressId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_RETAILER_APPROVAL',
    "deliveryMethod" TEXT NOT NULL,
    "subtotalAmount" DECIMAL NOT NULL,
    "deliveryFee" DECIMAL NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "rejectionReason" TEXT,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerOrder_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerOrder_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Address" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "lineTotal" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerOrderItem_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "medicineId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "originalFileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "retailerNotes" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prescription_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prescription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prescription_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerOrderId" TEXT,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL NOT NULL,
    "gatewayReference" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentRecord_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerOrderId" TEXT,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "pdfUrl" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceRecord_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceRecord_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceRecord_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryTrackingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerOrderId" TEXT NOT NULL,
    "createdByRetailerId" TEXT,
    "statusLabel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryTrackingEvent_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryTrackingEvent_createdByRetailerId_fkey" FOREIGN KEY ("createdByRetailerId") REFERENCES "Retailer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailerPurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerId" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "subtotalAmount" DECIMAL NOT NULL,
    "schemeDiscountAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL NOT NULL,
    "rejectionReason" TEXT,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailerPurchaseOrder_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RetailerPurchaseOrder_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailerPurchaseOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerPurchaseOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "lineTotal" DECIMAL NOT NULL,
    CONSTRAINT "RetailerPurchaseOrderItem_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetailerPurchaseOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WholesellerPurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wholesellerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "subtotalAmount" DECIMAL NOT NULL,
    "offerDiscountAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL NOT NULL,
    "rejectionReason" TEXT,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WholesellerPurchaseOrder_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WholesellerPurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WholesellerPurchaseOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wholesellerPurchaseOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "lineTotal" DECIMAL NOT NULL,
    CONSTRAINT "WholesellerPurchaseOrderItem_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WholesellerPurchaseOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "B2BShipmentTrackingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "statusLabel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "B2BShipmentTrackingEvent_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "B2BShipmentTrackingEvent_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "wholesellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "discountType" TEXT,
    "discountValue" DECIMAL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wholesellerId" TEXT NOT NULL,
    "retailerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "discountType" TEXT,
    "discountValue" DECIMAL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scheme_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scheme_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "retailerId" TEXT,
    "wholesellerId" TEXT,
    "companyId" TEXT,
    "customerOrderId" TEXT,
    "retailerPurchaseOrderId" TEXT,
    "wholesellerPurchaseOrderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feedback_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feedback_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feedback_retailerPurchaseOrderId_fkey" FOREIGN KEY ("retailerPurchaseOrderId") REFERENCES "RetailerPurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feedback_wholesellerPurchaseOrderId_fkey" FOREIGN KEY ("wholesellerPurchaseOrderId") REFERENCES "WholesellerPurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "referenceKind" TEXT,
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "retailerId" TEXT,
    "wholesellerId" TEXT,
    "companyId" TEXT,
    "metricKey" TEXT NOT NULL,
    "metricValue" DECIMAL NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsSnapshot_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsSnapshot_wholesellerId_fkey" FOREIGN KEY ("wholesellerId") REFERENCES "Wholeseller" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerInventoryId" TEXT,
    "wholesellerInventoryId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "InventoryAlert_retailerInventoryId_fkey" FOREIGN KEY ("retailerInventoryId") REFERENCES "RetailerInventory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryAlert_wholesellerInventoryId_fkey" FOREIGN KEY ("wholesellerInventoryId") REFERENCES "WholesellerInventory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE INDEX "B2BShipmentTrackingEvent_wholesellerPurchaseOrderId_createdAt_idx" ON "B2BShipmentTrackingEvent"("wholesellerPurchaseOrderId", "createdAt");

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
