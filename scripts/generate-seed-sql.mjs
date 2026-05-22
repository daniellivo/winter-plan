// Expands the CSV-derived inventory (counts per slot) into one INSERT row per
// physical shift. Prints chunked SQL on stdout — copy into apply_migration.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const FIELD_LABEL = {
  adultos: 'Adultos',
  pediatria: 'Pediatría',
  materno: 'Materno',
}

const SLOT_TIMES = {
  TM: { start: '07:10', end: '14:10' },
  TT: { start: '14:00', end: '21:00' },
  TN: { start: '20:45', end: '07:30' },
}

// Crude TS-to-JSON conversion of the generated dataset (date:, slot:, count: shortcut).
const src = readFileSync(resolve(ROOT, 'src/data/teknonShifts.ts'), 'utf-8')
const datasetBody = src
  .replace(/^[\s\S]*?TEKNON_SHIFTS[^{]*=\s*/, '')
  .replace(/;\s*$/, '')
  .replace(/(\w+):/g, '"$1":')
  .replace(/(["\d}])\s*\n(\s*)"/g, '$1,\n$2"')

let dataset
try {
  dataset = JSON.parse(datasetBody)
} catch (err) {
  console.error('Failed to parse dataset body:', err.message)
  console.error('First 400 chars:\n', datasetBody.slice(0, 400))
  process.exit(1)
}

const rows = []
for (const specialty of Object.keys(dataset)) {
  for (const entry of dataset[specialty]) {
    const times = SLOT_TIMES[entry.slot]
    for (let i = 0; i < entry.count; i++) {
      rows.push({
        facility: 'teknon',
        specialty,
        date: entry.date,
        slot: entry.slot,
        unit: 'Hospitalización',
        field: FIELD_LABEL[specialty],
        start_time: times.start,
        end_time: times.end,
        price: 100,
      })
    }
  }
}

console.log(`Generated ${rows.length} rows total.`)

const esc = s => `'${String(s).replace(/'/g, "''")}'`
const tuple = r =>
  `(${esc(r.facility)}, ${esc(r.specialty)}, ${esc(r.date)}, ${esc(r.slot)}, ${esc(r.unit)}, ${esc(r.field)}, ${esc(r.start_time)}, ${esc(r.end_time)}, ${r.price})`

const CHUNK = 150
const chunks = []
for (let i = 0; i < rows.length; i += CHUNK) {
  const slice = rows.slice(i, i + CHUNK)
  chunks.push(
    `insert into public.available_shifts (facility, specialty, date, slot, unit, field, start_time, end_time, price) values\n  ` +
      slice.map(tuple).join(',\n  ') +
      ';\n',
  )
}

const outPath = resolve(ROOT, 'scripts/seed-available-shifts.sql')
writeFileSync(outPath, chunks.join('\n-- ---\n'))
console.log(`Wrote ${chunks.length} chunks of ≤${CHUNK} rows each to:`)
console.log(`  ${outPath}`)
