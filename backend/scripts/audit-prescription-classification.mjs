// Dry-run audit of the prescription classifier against the full medicine CSV.
//
// Reads indian_medicine_data.csv (repo root), runs classifyMedicineType on every
// non-discontinued row, and prints:
//   - how many rows come out PRESCRIPTION vs OTC, and how many matched nothing
//   - the schedule breakdown (H / H1 / X)
//   - the most common unrecognised ingredients, so the table can be extended
//   - a sample of classified rows
//
// No database is touched. Run from the backend directory:
//   node scripts/audit-prescription-classification.mjs
//   node scripts/audit-prescription-classification.mjs --unmatched 80
//   node scripts/audit-prescription-classification.mjs --show-rx 40

import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyMedicineType, normalizeSalt } from '../prisma/data/drug-schedules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, '../../indian_medicine_data.csv');

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const unmatchedLimit = Number(flag('unmatched', 60)) || 60;
const showRx = Number(flag('show-rx', 0)) || 0;
const showOtc = Number(flag('show-otc', 0)) || 0;

// Minimal CSV line parser (quotes-aware) - mirrors prisma/seed_csv.ts.
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`CSV not found at ${CSV_PATH}`);
  process.exit(1);
}

const rl = readline.createInterface({
  input: fs.createReadStream(CSV_PATH, { encoding: 'utf-8' }),
  crlfDelay: Infinity,
});

let isHeader = true;
let total = 0;
let discontinued = 0;
let prescription = 0;
let otc = 0;
let unrecognised = 0;
const scheduleCounts = { H: 0, H1: 0, X: 0, OTC: 0 };
/** @type {Map<string, number>} */
const unmatchedFreq = new Map();
const rxSamples = [];
const otcSamples = [];

for await (const line of rl) {
  if (isHeader) {
    isHeader = false;
    continue;
  }
  if (!line.trim()) continue;
  const fields = parseCsvLine(line);
  if (fields.length < 5) continue;
  const [, name, , discontinuedStr, , , , comp1, comp2] = fields;
  if (discontinuedStr?.toUpperCase() === 'TRUE') {
    discontinued++;
    continue;
  }
  if (!name) continue;

  total++;
  const result = classifyMedicineType(comp1, comp2, { defaultType: 'OTC' });

  if (result.schedule) scheduleCounts[result.schedule]++;
  if (!result.recognised) unrecognised++;

  for (const ing of result.unmatched) {
    unmatchedFreq.set(ing, (unmatchedFreq.get(ing) ?? 0) + 1);
  }

  if (result.medicineType === 'PRESCRIPTION') {
    prescription++;
    if (rxSamples.length < showRx) {
      rxSamples.push(`  ${result.schedule.padEnd(3)} ${name}  [${result.matched.map((m) => `${m.ingredient}:${m.schedule}`).join(', ')}]`);
    }
  } else {
    otc++;
    if (otcSamples.length < showOtc) {
      const tag = result.recognised ? 'matched-otc' : 'no-match';
      otcSamples.push(`  ${tag.padEnd(11)} ${name}  (${[comp1, comp2].filter(Boolean).join(' + ')})`);
    }
  }
}

const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

console.log('\n=== Prescription classification audit ===');
console.log(`CSV                : ${CSV_PATH}`);
console.log(`Rows (active)      : ${total.toLocaleString()}   (skipped ${discontinued.toLocaleString()} discontinued)`);
console.log('');
console.log(`PRESCRIPTION       : ${prescription.toLocaleString()}  (${pct(prescription)})`);
console.log(`OTC                : ${otc.toLocaleString()}  (${pct(otc)})`);
console.log('');
console.log('By highest schedule found on the product:');
console.log(`  X  (narcotic)    : ${scheduleCounts.X.toLocaleString()}`);
console.log(`  H1 (registered)  : ${scheduleCounts.H1.toLocaleString()}`);
console.log(`  H  (prescription): ${scheduleCounts.H.toLocaleString()}`);
console.log(`  OTC (recognised) : ${scheduleCounts.OTC.toLocaleString()}`);
console.log(`  no ingredient recognised : ${unrecognised.toLocaleString()}  (${pct(unrecognised)})  -> defaulted to OTC`);

const sortedUnmatched = [...unmatchedFreq.entries()].sort((a, b) => b[1] - a[1]);
const coveredByUnmatched = sortedUnmatched.reduce((s, [, n]) => s + n, 0);
console.log('');
console.log(`Distinct unrecognised ingredients: ${sortedUnmatched.length.toLocaleString()}  (${coveredByUnmatched.toLocaleString()} mentions)`);
console.log(`Top ${Math.min(unmatchedLimit, sortedUnmatched.length)} unrecognised ingredients (extend drug-schedules.mjs to cover these):`);
for (const [ing, n] of sortedUnmatched.slice(0, unmatchedLimit)) {
  console.log(`  ${String(n).padStart(6)}  ${ing}`);
}

if (rxSamples.length) {
  console.log('\nSample PRESCRIPTION rows:');
  console.log(rxSamples.join('\n'));
}
if (otcSamples.length) {
  console.log('\nSample OTC rows:');
  console.log(otcSamples.join('\n'));
}
console.log('');
