// Backfill Medicine.medicineType (OTC / PRESCRIPTION) on already-seeded rows,
// without a full reseed. Classifies each medicine from its stored `genericName`
// (which holds the composition string, e.g. "Amoxycillin (500mg) + Clavulanic
// Acid (125mg)") against India's drug schedules.
//   node scripts/backfill-medicine-type.mjs --dry     # preview counts only
//   node scripts/backfill-medicine-type.mjs           # apply the updates

import { PrismaClient } from '@prisma/client';
import { classifyMedicineType } from '../prisma/data/drug-schedules.mjs';

const dryRun = process.argv.includes('--dry') || process.argv.includes('--dry-run');
const prisma = new PrismaClient();

function splitComposition(genericName) {
  const parts = String(genericName ?? '')
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [parts[0] ?? '', parts.slice(1).join(' + ')];
}

async function main() {
  const medicines = await prisma.medicine.findMany({
    select: { id: true, brandName: true, genericName: true, medicineType: true },
  });
  console.log(`Loaded ${medicines.length.toLocaleString()} medicines${dryRun ? '  (dry run - no writes)' : ''}`);

  let toPrescription = 0;
  let toOtc = 0;
  let unchanged = 0;
  let unrecognised = 0;
  const updates = [];

  for (const med of medicines) {
    const [comp1, comp2] = splitComposition(med.genericName);
    const { medicineType, recognised } = classifyMedicineType(comp1, comp2, { defaultType: 'OTC' });
    if (!recognised) unrecognised++;

    if (medicineType === med.medicineType) {
      unchanged++;
      continue;
    }
    if (medicineType === 'PRESCRIPTION') toPrescription++;
    else toOtc++;
    updates.push({ id: med.id, medicineType });
  }

  console.log('');
  console.log(`Would set PRESCRIPTION : ${toPrescription.toLocaleString()}`);
  console.log(`Would set OTC          : ${toOtc.toLocaleString()}`);
  console.log(`Unchanged              : ${unchanged.toLocaleString()}`);
  console.log(`No ingredient recognised (kept as-is / OTC default): ${unrecognised.toLocaleString()}`);

  if (dryRun || updates.length === 0) {
    console.log(dryRun ? '\nDry run - nothing written.' : '\nNothing to update.');
    return;
  }


  console.log(`\nApplying ${updates.length.toLocaleString()} updates...`);
  const BATCH = 500;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    await prisma.$transaction(
      slice.map((u) =>
        prisma.medicine.update({ where: { id: u.id }, data: { medicineType: u.medicineType } }),
      ),
    );
    process.stdout.write(`  ${Math.min(i + BATCH, updates.length)}/${updates.length}\r`);
  }
  console.log(`\nDone. Updated ${updates.length.toLocaleString()} medicines.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
