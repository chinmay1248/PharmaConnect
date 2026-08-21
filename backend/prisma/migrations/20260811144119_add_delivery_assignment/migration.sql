-- CreateTable
CREATE TABLE "DeliveryAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerOrderId" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "courierPhone" TEXT,
    "vehicleNumber" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "etaMinutes" INTEGER,
    "lastLocationAt" DATETIME,
    "dispatchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryAssignment_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAssignment_customerOrderId_key" ON "DeliveryAssignment"("customerOrderId");
