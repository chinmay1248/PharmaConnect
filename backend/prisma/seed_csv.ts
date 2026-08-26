import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, MedicineType, UserRole } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

// Helper to safely parse CSV line taking quotes into account
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function seedFromCsv() {
  console.log('Starting Medicine CSV Import into PharmaConnect DB...');

  // Resolve against this file rather than the working directory so the seed runs from anywhere.
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const csvFilePath = process.env.MEDICINE_CSV_PATH
    ? path.resolve(process.env.MEDICINE_CSV_PATH)
    : path.join(repositoryRoot, 'indian_medicine_data.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found at ${csvFilePath}`);
    console.error('Set MEDICINE_CSV_PATH to point at the medicine catalogue CSV.');
    process.exit(1);
  }

  const passwordHash = await hashPassword('Pharma@123');

  // Ensure default Admin, Customer, Retailer, and Wholeseller users exist
  const customer = await prisma.user.upsert({
    where: { email: 'customer@pharmaconnect.app' },
    update: { passwordHash },
    create: {
      role: UserRole.CUSTOMER,
      fullName: 'Rahul Sharma',
      email: 'customer@pharmaconnect.app',
      phone: '9000000001',
      passwordHash,
    },
  });

  const retailerUser = await prisma.user.upsert({
    where: { email: 'retailer@pharmaconnect.app' },
    update: { passwordHash },
    create: {
      role: UserRole.RETAILER,
      fullName: 'Apex Pharmacy Retailer',
      email: 'retailer@pharmaconnect.app',
      phone: '9000000002',
      passwordHash,
    },
  });

  const retailer = await prisma.retailer.upsert({
    where: { userId: retailerUser.id },
    update: {},
    create: {
      userId: retailerUser.id,
      businessName: 'Apex Care Pharmacy',
      licenseNumber: 'MH-RX-998877',
      area: 'Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411005',
      rating: 4.8,
      deliveryAvailable: true,
    },
  });

  // Create 3 Wholesellers for regional/company segregation
  const wholesellerConfigs = [
    { email: 'wholeseller1@pharmaconnect.app', phone: '9000000103', name: 'HealthGrid Pharma Distribution (West)' },
    { email: 'wholeseller2@pharmaconnect.app', phone: '9000000104', name: 'Apex MediBulk Suppliers' },
    { email: 'wholeseller3@pharmaconnect.app', phone: '9000000105', name: 'National Pharma Logistics' },
  ];

  const wholesellers = [];
  for (const config of wholesellerConfigs) {
    const user = await prisma.user.upsert({
      where: { email: config.email },
      update: { passwordHash },
      create: {
        role: UserRole.WHOLESELLER,
        fullName: config.name,
        email: config.email,
        phone: config.phone,
        passwordHash,
      },
    });

    const ws = await prisma.wholeseller.upsert({
      where: { userId: user.id },
      update: { businessName: config.name },
      create: {
        userId: user.id,
        businessName: config.name,
        gstNumber: `27AACCH${Math.floor(1000 + Math.random() * 9000)}K1Z2`,
        serviceArea: 'Maharashtra & Goa',
      },
    });
    wholesellers.push(ws);
  }

  // Map of Company Name -> Company DB Record
  const companyMap = new Map<string, any>();

  const fileStream = fs.createReadStream(csvFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let count = 0;
  const maxMedicinesToImport = 5000; // Import top 5,000 active medicines for super responsive DB seed
  const batchSize = 100;
  let medicineBatch: any[] = [];

  console.log('Reading CSV and seeding catalog...');

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    if (!line.trim()) continue;

    const fields = parseCsvLine(line);
    // id, name, price(₹), Is_discontinued, manufacturer_name, type, pack_size_label, short_composition1, short_composition2
    if (fields.length < 5) continue;

    const [idStr, name, priceStr, discontinuedStr, manufacturerName, typeStr, packSize, comp1, comp2] = fields;

    // Skip discontinued
    if (discontinuedStr?.toUpperCase() === 'TRUE') continue;
    if (!name || !manufacturerName) continue;

    const cleanCompany = manufacturerName.replace(/["']/g, '').trim();
    if (!cleanCompany) continue;

    // Get or Create Company
    let company = companyMap.get(cleanCompany);
    if (!company) {
      const existingComp = await prisma.company.findFirst({
        where: { legalName: cleanCompany },
      });

      if (existingComp) {
        company = existingComp;
      } else {
        const uniqueSlug = `${cleanCompany.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}_${Math.floor(Math.random() * 100000)}`;
        const companyUserEmail = `company_${uniqueSlug}@pharmaconnect.app`;
        const companyPhone = `8${Math.floor(100000000 + Math.random() * 900000000)}`;
        const compUser = await prisma.user.create({
          data: {
            role: UserRole.COMPANY,
            fullName: cleanCompany,
            email: companyUserEmail,
            phone: companyPhone,
            passwordHash,
          },
        });
        company = await prisma.company.create({
          data: {
            userId: compUser.id,
            legalName: cleanCompany,
            gstNumber: `27AACCB${Math.floor(1000 + Math.random() * 9000)}K1Z1`,
          },
        });
      }
      companyMap.set(cleanCompany, company);
    }

    // Determine compositions
    const compositionList = [comp1, comp2].filter(Boolean).join(' + ').trim();
    const genericName = compositionList || name;
    const mrp = parseFloat(priceStr) || 100.0;
    const isPrescription = typeStr?.toLowerCase().includes('prescription') || false;

    // Check existing medicine
    const existingMed = await prisma.medicine.findFirst({
      where: { brandName: name },
    });

    let medId = existingMed?.id;
    if (!existingMed) {
      const createdMed = await prisma.medicine.create({
        data: {
          companyId: company.id,
          brandName: name,
          genericName: genericName,
          dosage: comp1 || 'Standard',
          packSize: packSize || '1 Strip',
          description: `Formulation: ${compositionList || 'Active compound'}. Manufactured by ${cleanCompany}.`,
          medicineType: isPrescription ? MedicineType.PRESCRIPTION : MedicineType.OTC,
          mrp: mrp,
        },
      });
      medId = createdMed.id;
    }

    // Assign stock to Retailer (Apex Care Pharmacy) for first 150 medicines
    if (count < 150 && medId) {
      const existingRetailerStock = await prisma.retailerInventory.findFirst({
        where: { retailerId: retailer.id, medicineId: medId },
      });
      if (!existingRetailerStock) {
        const rQty = Math.floor(20 + Math.random() * 180);
        await prisma.retailerInventory.create({
          data: {
            retailerId: retailer.id,
            medicineId: medId,
            stockQuantity: rQty,
            salePrice: Math.round(mrp * 0.9 * 100) / 100, // 10% discount
            isActive: true,
            batches: {
              create: {
                batchNumber: `BAT-${Math.floor(10000 + Math.random() * 90000)}`,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                quantity: rQty,
                purchasePrice: Math.round(mrp * 0.75 * 100) / 100,
              },
            },
          },
        });
      }
    }

    // Assign stock to Wholesellers (segregated by company!)
    // Wholeseller 0 gets companies starting with A-G
    // Wholeseller 1 gets companies starting with H-P
    // Wholeseller 2 gets companies starting with Q-Z
    const firstChar = cleanCompany[0].toUpperCase();
    let assignedWsIndex = 0;
    if (firstChar >= 'H' && firstChar <= 'P') assignedWsIndex = 1;
    else if (firstChar >= 'Q') assignedWsIndex = 2;

    const selectedWs = wholesellers[assignedWsIndex];

    // Link Supplier (Wholeseller <-> Company) if not existing
    const existingLink = await prisma.supplierLink.findFirst({
      where: { wholesellerId: selectedWs.id, companyId: company.id },
    });
    if (!existingLink) {
      await prisma.supplierLink.create({
        data: {
          wholesellerId: selectedWs.id,
          companyId: company.id,
          status: 'APPROVED',
        },
      });
    }

    // Add Wholeseller inventory item (company segregated)
    if (medId) {
      const existingWsStock = await prisma.wholesellerInventory.findFirst({
        where: { wholesellerId: selectedWs.id, medicineId: medId },
      });
      if (!existingWsStock) {
        const wsQty = Math.floor(500 + Math.random() * 2000);
        await prisma.wholesellerInventory.create({
          data: {
            wholesellerId: selectedWs.id,
            medicineId: medId,
            stockQuantity: wsQty,
            salePrice: Math.round(mrp * 0.7 * 100) / 100, // 30% wholesale discount
            isActive: true,
            batches: {
              create: {
                batchNumber: `WS-BAT-${Math.floor(10000 + Math.random() * 90000)}`,
                expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000),
                quantity: wsQty,
                purchasePrice: Math.round(mrp * 0.55 * 100) / 100,
              },
            },
          },
        });
      }
    }

    count++;
    if (count % 500 === 0) {
      console.log(`Imported ${count} medicines from CSV...`);
    }

    if (count >= maxMedicinesToImport) break;
  }

  console.log(`✅ Successfully seeded ${count} medicines from CSV!`);
  console.log(`✅ ${companyMap.size} pharma companies created.`);
  console.log('✅ Wholeseller inventory segregated by company.');
  console.log('✅ Retailer inventory populated with real medicines from CSV.');
}

seedFromCsv()
  .catch((err) => {
    console.error('Error seeding CSV:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
