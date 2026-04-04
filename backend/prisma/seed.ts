import {
  AddressType,
  MedicineType,
  PaymentMethod,
  Prisma,
  UserRole,
} from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';

async function upsertMedicineByBrand(input: {
  brandName: string;
  genericName: string;
  dosage: string;
  packSize: string;
  description: string;
  medicineType: MedicineType;
  mrp: string;
  companyId: string;
}) {
  const existing = await prisma.medicine.findFirst({
    where: { brandName: input.brandName },
  });

  if (existing) {
    return prisma.medicine.update({
      where: { id: existing.id },
      data: {
        companyId: input.companyId,
        genericName: input.genericName,
        dosage: input.dosage,
        packSize: input.packSize,
        description: input.description,
        medicineType: input.medicineType,
        mrp: new Prisma.Decimal(input.mrp),
      },
    });
  }

  return prisma.medicine.create({
    data: {
      companyId: input.companyId,
      brandName: input.brandName,
      genericName: input.genericName,
      dosage: input.dosage,
      packSize: input.packSize,
      description: input.description,
      medicineType: input.medicineType,
      mrp: new Prisma.Decimal(input.mrp),
    },
  });
}

// Seeds a realistic starter dataset so the frontend and API can move off mock-only assumptions.
async function main() {
  const passwordHash = await hashPassword('Pharma@123');

  const customer = await prisma.user.upsert({
    where: { email: 'customer@pharmaconnect.app' },
    update: {
      fullName: 'Chinmay Customer',
      phone: '9000000001',
      passwordHash,
    },
    create: {
      role: UserRole.CUSTOMER,
      fullName: 'Chinmay Customer',
      email: 'customer@pharmaconnect.app',
      phone: '9000000001',
      passwordHash,
      addresses: {
        create: {
          type: AddressType.HOME,
          label: 'Home',
          line1: 'Flat 12, Health Residency',
          area: 'Shivaji Nagar',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411005',
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });

  const retailerUser = await prisma.user.upsert({
    where: { email: 'retailer@pharmaconnect.app' },
    update: {
      fullName: 'Apex Care Retailer',
      phone: '9000000002',
      passwordHash,
    },
    create: {
      role: UserRole.RETAILER,
      fullName: 'Apex Care Retailer',
      email: 'retailer@pharmaconnect.app',
      phone: '9000000002',
      passwordHash,
    },
  });

  const wholesellerUser = await prisma.user.upsert({
    where: { email: 'wholeseller@pharmaconnect.app' },
    update: {
      fullName: 'HealthGrid Wholeseller',
      phone: '9000000003',
      passwordHash,
    },
    create: {
      role: UserRole.WHOLESELLER,
      fullName: 'HealthGrid Wholeseller',
      email: 'wholeseller@pharmaconnect.app',
      phone: '9000000003',
      passwordHash,
    },
  });

  const companyUser = await prisma.user.upsert({
    where: { email: 'company@pharmaconnect.app' },
    update: {
      fullName: 'BlueCross Pharma',
      phone: '9000000004',
      passwordHash,
    },
    create: {
      role: UserRole.COMPANY,
      fullName: 'BlueCross Pharma',
      email: 'company@pharmaconnect.app',
      phone: '9000000004',
      passwordHash,
    },
  });

  const company = await prisma.company.upsert({
    where: { userId: companyUser.id },
    update: {
      legalName: 'BlueCross Pharma Private Limited',
      gstNumber: '27AACCB1111K1Z1',
    },
    create: {
      userId: companyUser.id,
      legalName: 'BlueCross Pharma Private Limited',
      gstNumber: '27AACCB1111K1Z1',
      contactEmail: 'company@pharmaconnect.app',
      contactPhone: '9000000004',
    },
  });

  const wholeseller = await prisma.wholeseller.upsert({
    where: { userId: wholesellerUser.id },
    update: {
      businessName: 'HealthGrid Distribution',
      serviceArea: 'Pune Region',
    },
    create: {
      userId: wholesellerUser.id,
      businessName: 'HealthGrid Distribution',
      gstNumber: '27AACCH2222K1Z2',
      serviceArea: 'Pune Region',
    },
  });

  const retailer = await prisma.retailer.upsert({
    where: { userId: retailerUser.id },
    update: {
      businessName: 'Apex Care Pharmacy',
      area: 'Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411005',
      rating: 4.7,
    },
    create: {
      userId: retailerUser.id,
      businessName: 'Apex Care Pharmacy',
      licenseNumber: 'MH-RX-998877',
      area: 'Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411005',
      rating: 4.7,
      deliveryAvailable: true,
    },
  });

  await prisma.retailerWholesellerLink.upsert({
    where: {
      retailerId_wholesellerId: {
        retailerId: retailer.id,
        wholesellerId: wholeseller.id,
      },
    },
    update: { isPreferred: true },
    create: {
      retailerId: retailer.id,
      wholesellerId: wholeseller.id,
      isPreferred: true,
    },
  });

  await prisma.supplierLink.upsert({
    where: {
      wholesellerId_companyId: {
        wholesellerId: wholeseller.id,
        companyId: company.id,
      },
    },
    update: { status: 'APPROVED' },
    create: {
      wholesellerId: wholeseller.id,
      companyId: company.id,
      status: 'APPROVED',
      notes: 'Initial approved supplier relationship',
    },
  });

  const feverDisease = await prisma.disease.upsert({
    where: { name: 'Fever' },
    update: {},
    create: { name: 'Fever', description: 'Used for reducing fever and mild pain.' },
  });

  const diabetesDisease = await prisma.disease.upsert({
    where: { name: 'Type 2 Diabetes' },
    update: {},
    create: {
      name: 'Type 2 Diabetes',
      description: 'Helps manage blood sugar in type 2 diabetes.',
    },
  });

  const paracetamolSalt = await prisma.saltComposition.upsert({
    where: { name: 'Paracetamol' },
    update: {},
    create: { name: 'Paracetamol' },
  });

  const metforminSalt = await prisma.saltComposition.upsert({
    where: { name: 'Metformin' },
    update: {},
    create: { name: 'Metformin' },
  });

  const glimepirideSalt = await prisma.saltComposition.upsert({
    where: { name: 'Glimepiride' },
    update: {},
    create: { name: 'Glimepiride' },
  });

  const paracip = await upsertMedicineByBrand({
    brandName: 'Paracip 650',
    genericName: 'Paracetamol',
    dosage: '650 mg',
    packSize: '15 tablets',
    description: 'Pain relief and fever reduction tablet.',
    medicineType: MedicineType.OTC,
    mrp: '42.00',
    companyId: company.id,
  });

  const glucozen = await upsertMedicineByBrand({
    brandName: 'Glucozen-M',
    genericName: 'Metformin + Glimepiride',
    dosage: '500 mg / 2 mg',
    packSize: '10 tablets',
    description: 'Oral anti-diabetic combination.',
    medicineType: MedicineType.PRESCRIPTION,
    mrp: '118.00',
    companyId: company.id,
  });

  await prisma.medicineSearchAlias.upsert({
    where: {
      medicineId_alias: {
        medicineId: paracip.id,
        alias: 'paracetamol 650',
      },
    },
    update: {},
    create: {
      medicineId: paracip.id,
      alias: 'paracetamol 650',
    },
  });

  await prisma.medicineSearchAlias.upsert({
    where: {
      medicineId_alias: {
        medicineId: glucozen.id,
        alias: 'metformin glimepiride',
      },
    },
    update: {},
    create: {
      medicineId: glucozen.id,
      alias: 'metformin glimepiride',
    },
  });

  for (const composition of [
    { medicineId: paracip.id, saltId: paracetamolSalt.id, strength: '650', unit: 'mg' },
    { medicineId: glucozen.id, saltId: metforminSalt.id, strength: '500', unit: 'mg' },
    { medicineId: glucozen.id, saltId: glimepirideSalt.id, strength: '2', unit: 'mg' },
  ]) {
    await prisma.medicineComposition.upsert({
      where: {
        medicineId_saltCompositionId: {
          medicineId: composition.medicineId,
          saltCompositionId: composition.saltId,
        },
      },
      update: {
        strength: composition.strength,
        unit: composition.unit,
      },
      create: {
        medicineId: composition.medicineId,
        saltCompositionId: composition.saltId,
        strength: composition.strength,
        unit: composition.unit,
      },
    });
  }

  for (const relation of [
    { medicineId: paracip.id, diseaseId: feverDisease.id },
    { medicineId: glucozen.id, diseaseId: diabetesDisease.id },
  ]) {
    await prisma.medicineDisease.upsert({
      where: {
        medicineId_diseaseId: relation,
      },
      update: {},
      create: relation,
    });
  }

  await prisma.retailerInventory.upsert({
    where: {
      retailerId_medicineId: {
        retailerId: retailer.id,
        medicineId: paracip.id,
      },
    },
    update: {
      salePrice: new Prisma.Decimal('38.00'),
      stockQuantity: 120,
      reservedQuantity: 0,
    },
    create: {
      retailerId: retailer.id,
      medicineId: paracip.id,
      salePrice: new Prisma.Decimal('38.00'),
      stockQuantity: 120,
      reservedQuantity: 0,
      reorderLevel: 20,
      isActive: true,
    },
  });

  await prisma.retailerInventory.upsert({
    where: {
      retailerId_medicineId: {
        retailerId: retailer.id,
        medicineId: glucozen.id,
      },
    },
    update: {
      salePrice: new Prisma.Decimal('104.00'),
      stockQuantity: 60,
      reservedQuantity: 0,
    },
    create: {
      retailerId: retailer.id,
      medicineId: glucozen.id,
      salePrice: new Prisma.Decimal('104.00'),
      stockQuantity: 60,
      reservedQuantity: 0,
      reorderLevel: 10,
      isActive: true,
    },
  });

  await prisma.wholesellerInventory.upsert({
    where: {
      wholesellerId_medicineId: {
        wholesellerId: wholeseller.id,
        medicineId: paracip.id,
      },
    },
    update: {
      salePrice: new Prisma.Decimal('31.00'),
      stockQuantity: 500,
    },
    create: {
      wholesellerId: wholeseller.id,
      medicineId: paracip.id,
      salePrice: new Prisma.Decimal('31.00'),
      stockQuantity: 500,
      reorderLevel: 75,
      isActive: true,
    },
  });

  await prisma.wholesellerInventory.upsert({
    where: {
      wholesellerId_medicineId: {
        wholesellerId: wholeseller.id,
        medicineId: glucozen.id,
      },
    },
    update: {
      salePrice: new Prisma.Decimal('88.00'),
      stockQuantity: 220,
    },
    create: {
      wholesellerId: wholeseller.id,
      medicineId: glucozen.id,
      salePrice: new Prisma.Decimal('88.00'),
      stockQuantity: 220,
      reorderLevel: 40,
      isActive: true,
    },
  });

  const existingOrder = await prisma.customerOrder.findFirst({
    where: { customerId: customer.id, retailerId: retailer.id },
  });

  if (!existingOrder) {
    await prisma.customerOrder.create({
      data: {
        customerId: customer.id,
        retailerId: retailer.id,
        deliveryAddressId: customer.addresses[0]?.id,
        deliveryMethod: 'HOME_DELIVERY',
        status: 'PAID',
        subtotalAmount: new Prisma.Decimal('38.00'),
        deliveryFee: new Prisma.Decimal('35.00'),
        totalAmount: new Prisma.Decimal('73.00'),
        approvedAt: new Date(),
        items: {
          create: {
            medicineId: paracip.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal('38.00'),
            lineTotal: new Prisma.Decimal('38.00'),
          },
        },
        payments: {
          create: {
            method: PaymentMethod.UPI,
            status: 'SUCCESS',
            amount: new Prisma.Decimal('73.00'),
            gatewayReference: 'demo-upi-001',
            paidAt: new Date(),
          },
        },
        invoices: {
          create: {
            invoiceNumber: `INV-${Date.now()}`,
            status: 'GENERATED',
          },
        },
        trackingEvents: {
          create: [
            {
              statusLabel: 'Order placed',
              notes: 'Sample seeded order placed successfully.',
            },
            {
              statusLabel: 'Retailer approved',
              notes: 'Retailer accepted the OTC order.',
              createdByRetailerId: retailer.id,
            },
          ],
        },
      },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed.', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
