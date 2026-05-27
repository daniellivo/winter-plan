import { writeFileSync } from 'fs'

const FESTIVOS_2026 = new Set(['2026-06-24', '2026-08-15', '2026-09-11'])

function addDays(dateStr, n) {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, day + n))
  return d.toISOString().slice(0, 10)
}

function getPrice(date, slot) {
  const [y, m, day] = date.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, day))
  const dow = d.getUTCDay() // 0=Sun, 6=Sat
  const isFestivo = FESTIVOS_2026.has(date)

  if (slot === 'TM') {
    if (isFestivo || dow === 0) return 416.05   // festivo / domingo
    if (dow === 6)             return 322.23    // sábado
    return 273.92                               // laborable
  }

  // TN (NIT) — price depends on start day and whether start/end is festivo
  const next = addDays(date, 1)
  const nextFestivo = FESTIVOS_2026.has(next)

  if (isFestivo && nextFestivo) return 597.67  // festiu→festiu
  if (isFestivo)                return 526.62  // festiu start
  if (nextFestivo)              return 491.82  // laborable→festiu
  if (dow === 5)                return 420.97  // vie→sáb
  if (dow === 6)                return 503.65  // sáb→dom
  if (dow === 0)                return 419.30  // dom→lun
  return 384.49                                // lun–jue laborable
}

// Parsed from "Sala parts_Livo_2026 - Sala parts.csv" monthly sections (Jun–Sep 2026)
const SHIFTS = [
  // ── DIA (TM) ────────────────────────────────────────────────
  { date: '2026-08-05', slot: 'TM', count: 2 },
  { date: '2026-08-06', slot: 'TM', count: 2 },
  { date: '2026-08-12', slot: 'TM', count: 2 },
  { date: '2026-08-13', slot: 'TM', count: 2 },
  { date: '2026-08-14', slot: 'TM', count: 2 },
  { date: '2026-08-15', slot: 'TM', count: 1 },
  { date: '2026-08-16', slot: 'TM', count: 1 },
  { date: '2026-08-17', slot: 'TM', count: 1 },
  { date: '2026-08-18', slot: 'TM', count: 2 },
  { date: '2026-08-19', slot: 'TM', count: 1 },
  { date: '2026-08-20', slot: 'TM', count: 1 },
  { date: '2026-08-21', slot: 'TM', count: 1 },
  { date: '2026-08-28', slot: 'TM', count: 1 },
  { date: '2026-08-29', slot: 'TM', count: 2 },
  { date: '2026-09-04', slot: 'TM', count: 1 },
  { date: '2026-09-05', slot: 'TM', count: 1 },
  { date: '2026-09-06', slot: 'TM', count: 1 },
  { date: '2026-09-09', slot: 'TM', count: 1 },
  { date: '2026-09-10', slot: 'TM', count: 2 },
  // ── NIT (TN) ────────────────────────────────────────────────
  // June
  { date: '2026-06-06', slot: 'TN', count: 1 },
  { date: '2026-06-07', slot: 'TN', count: 1 },
  { date: '2026-06-19', slot: 'TN', count: 2 },
  { date: '2026-06-20', slot: 'TN', count: 1 },
  { date: '2026-06-21', slot: 'TN', count: 2 },
  { date: '2026-06-23', slot: 'TN', count: 1 },
  { date: '2026-06-25', slot: 'TN', count: 1 },
  { date: '2026-06-27', slot: 'TN', count: 1 },
  { date: '2026-06-28', slot: 'TN', count: 1 },
  { date: '2026-06-29', slot: 'TN', count: 2 },
  { date: '2026-06-30', slot: 'TN', count: 1 },
  // July
  { date: '2026-07-01', slot: 'TN', count: 1 },
  { date: '2026-07-03', slot: 'TN', count: 3 },
  { date: '2026-07-04', slot: 'TN', count: 2 },
  { date: '2026-07-05', slot: 'TN', count: 1 },
  { date: '2026-07-06', slot: 'TN', count: 1 },
  { date: '2026-07-08', slot: 'TN', count: 1 },
  { date: '2026-07-09', slot: 'TN', count: 1 },
  { date: '2026-07-12', slot: 'TN', count: 2 },
  { date: '2026-07-13', slot: 'TN', count: 2 },
  { date: '2026-07-14', slot: 'TN', count: 2 },
  { date: '2026-07-17', slot: 'TN', count: 3 },
  { date: '2026-07-18', slot: 'TN', count: 1 },
  { date: '2026-07-19', slot: 'TN', count: 2 },
  { date: '2026-07-23', slot: 'TN', count: 1 },
  { date: '2026-07-24', slot: 'TN', count: 1 },
  { date: '2026-07-25', slot: 'TN', count: 1 },
  { date: '2026-07-31', slot: 'TN', count: 2 },
  // August
  { date: '2026-08-01', slot: 'TN', count: 3 },
  { date: '2026-08-02', slot: 'TN', count: 2 },
  { date: '2026-08-04', slot: 'TN', count: 1 },
  { date: '2026-08-10', slot: 'TN', count: 2 },
  { date: '2026-08-11', slot: 'TN', count: 2 },
  { date: '2026-08-14', slot: 'TN', count: 3 },
  { date: '2026-08-15', slot: 'TN', count: 2 },
  { date: '2026-08-16', slot: 'TN', count: 4 },
  { date: '2026-08-17', slot: 'TN', count: 1 },
  { date: '2026-08-18', slot: 'TN', count: 1 },
  { date: '2026-08-19', slot: 'TN', count: 2 },
  { date: '2026-08-20', slot: 'TN', count: 2 },
  { date: '2026-08-21', slot: 'TN', count: 1 },
  { date: '2026-08-22', slot: 'TN', count: 3 },
  { date: '2026-08-23', slot: 'TN', count: 1 },
  { date: '2026-08-25', slot: 'TN', count: 1 },
  { date: '2026-08-28', slot: 'TN', count: 3 },
  { date: '2026-08-29', slot: 'TN', count: 4 },
  { date: '2026-08-30', slot: 'TN', count: 3 },
  // September
  { date: '2026-08-31', slot: 'TN', count: 1 },
  { date: '2026-09-01', slot: 'TN', count: 1 },
  { date: '2026-09-02', slot: 'TN', count: 1 },
  { date: '2026-09-03', slot: 'TN', count: 1 },
  { date: '2026-09-06', slot: 'TN', count: 4 },
  { date: '2026-09-11', slot: 'TN', count: 3 },
  { date: '2026-09-12', slot: 'TN', count: 2 },
  { date: '2026-09-13', slot: 'TN', count: 2 },
]

const rows = []
for (const { date, slot, count } of SHIFTS) {
  const price = getPrice(date, slot)
  const startTime = slot === 'TM' ? '09:00' : '21:00'
  const endTime   = slot === 'TM' ? '21:15' : '09:15'
  for (let i = 0; i < count; i++) {
    rows.push(
      `  ('sant-pau', 'sala-parts', '${date}', '${slot}', 'Sala de partos', 'Matronas', '${startTime}', '${endTime}', ${price})`
    )
  }
}

const sql = `-- Auto-generated by scripts/build-santpau-data.mjs
-- Do not edit by hand — re-run \`node scripts/build-santpau-data.mjs\` after updating shift data.

insert into public.available_shifts (facility, specialty, date, slot, unit, field, start_time, end_time, price) values
${rows.join(',\n')};
`

writeFileSync('scripts/seed-santpau-shifts.sql', sql)
console.log(`Generated ${rows.length} rows → scripts/seed-santpau-shifts.sql`)
