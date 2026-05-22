// One-off seeder: expands the CSV-derived inventory into one row per physical
// shift and bulk-inserts into public.available_shifts. Run once.
//
//   node scripts/seed-available-shifts.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SUPABASE_URL = 'https://ptcfhsigyfpoytjmcnlg.supabase.co'
const SUPABASE_KEY = 'sb_publishable_pnPIgTl1tD-rRUIkeIIbFg_m5ZfF-iB'

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

const src = readFileSync(resolve(ROOT, 'src/data/teknonShifts.ts'), 'utf-8')
const datasetBody = src
  .replace(/^[\s\S]*?TEKNON_SHIFTS[^{]*=\s*/, '')
  .replace(/;\s*$/, '')
  .replace(/(\w+):/g, '"$1":')
  .replace(/(["\d}])\s*\n(\s*)"/g, '$1,\n$2"')
const dataset = JSON.parse(datasetBody)

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
console.log(`Expanded to ${rows.length} rows.`)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BATCH = 500
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  const { error } = await supabase.from('available_shifts').insert(slice)
  if (error) {
    console.error(`❌ Batch ${i / BATCH + 1} failed:`, error)
    process.exit(1)
  }
  inserted += slice.length
  console.log(`  batch ${i / BATCH + 1}: ${inserted}/${rows.length}`)
}
console.log('✅ Seed complete.')
