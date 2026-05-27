# Sala de Partos — Matronas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "H. Sant Pau — Sala de partos" as a new specialty in the TurnosDisponibles dropdown, with DIA/NIT slots (stored as TM/TN), correct times (09:00–21:15 / 21:00–09:15), and day-type pricing (273–597€) based on day of week and Catalan festivos.

**Architecture:** Reuse the existing TM/TN slot types for DIA/NIT shifts — labels and times are overridden in the UI when `specialty === 'sala-parts'`. A new `SPECIALTY_FACILITY` map routes sant-pau inventory separately from teknon. Prices are pre-computed at seed time using a Node.js build script that applies the Catalan retribution table.

**Tech Stack:** React + TypeScript (Vite), Supabase (available_shifts table), Node.js (build script), SQL seed file.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/components/AvailabilitySelector.tsx` | Modify | Add `dayLabel` prop |
| `src/pages/TurnosDisponibles.tsx` | Modify | Add `sala-parts` specialty, facility map, slot label/time overrides, allowed combos, unit label, display price helper |
| `scripts/build-santpau-data.mjs` | Create | Generates seed SQL from hardcoded CSV data + pricing logic |
| `scripts/seed-santpau-shifts.sql` | Create (generated) | INSERT rows for sant-pau/sala-parts |

---

## Task 1: Add `dayLabel` prop to AvailabilitySelector

**Files:**
- Modify: `src/components/AvailabilitySelector.tsx`

- [ ] **Step 1: Add the prop to the interface and use it in the button**

In `src/components/AvailabilitySelector.tsx`, add `dayLabel?: string` to the interface and replace the hardcoded "Mañana" label:

```typescript
// Line 3 — interface change
interface AvailabilitySelectorProps {
  activeSlot: 'all' | 'day' | 'evening' | 'night' | 'delete' | null
  onSlotSelect: (slotType: 'all' | 'day' | 'evening' | 'night' | 'delete') => void
  onSave: () => void
  isSaving: boolean
  hideAllDay?: boolean
  hideSaveButton?: boolean
  allowedCombinations?: string[][]
  title?: string
  dayLabel?: string
}

// Line 15 — destructuring change
export default function AvailabilitySelector({
  activeSlot,
  onSlotSelect,
  onSave,
  isSaving,
  hideAllDay = false,
  hideSaveButton = false,
  allowedCombinations,
  title = 'Añade disponibilidad',
  dayLabel = 'Mañana',
}: AvailabilitySelectorProps) {
```

Then at line 74, replace the hardcoded string:
```typescript
// Before:
<span className="text-xs font-medium">Mañana</span>
// After:
<span className="text-xs font-medium">{dayLabel}</span>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AvailabilitySelector.tsx
git commit -m "feat(ui): add dayLabel prop to AvailabilitySelector"
```

---

## Task 2: Add sala-parts specialty to TurnosDisponibles

**Files:**
- Modify: `src/pages/TurnosDisponibles.tsx`

This task has many sub-steps applied to the same file. Apply them all before committing.

- [ ] **Step 1: Extend the Specialty type and its lookup maps (around lines 31–47)**

```typescript
// Replace the existing type + maps
type Specialty = 'adultos' | 'pediatria' | 'materno' | 'neonatos' | 'sala-parts'

const SPECIALTY_LABEL: Record<Specialty, string> = {
  adultos: 'Teknon — Hospitalización Adultos',
  pediatria: 'Teknon — Hospitalización Pediátrica',
  materno: 'Teknon — Hospitalización Materno',
  neonatos: 'Teknon — Hospitalización Neonatal',
  'sala-parts': 'H. Sant Pau — Sala de partos',
}

const FIELD_LABEL: Record<Specialty, string> = {
  adultos: 'Adultos',
  pediatria: 'Pediatría',
  materno: 'Materno',
  neonatos: 'Neonatos',
  'sala-parts': 'Matronas',
}

const UNIT_LABEL: Record<Specialty, string> = {
  adultos: 'Hospitalización',
  pediatria: 'Hospitalización',
  materno: 'Hospitalización',
  neonatos: 'Hospitalización',
  'sala-parts': 'Sala de partos',
}

const SPECIALTY_FACILITY: Record<Specialty, string> = {
  adultos: 'teknon',
  pediatria: 'teknon',
  materno: 'teknon',
  neonatos: 'teknon',
  'sala-parts': 'sant-pau',
}
```

- [ ] **Step 2: Remove the `FACILITY` constant and the static `ALLOWED_COMBINATIONS` constant**

Delete line 31 (`const FACILITY = 'teknon'`) and line 57 (`const ALLOWED_COMBINATIONS: string[][] = ...`). These are replaced by the map above and by a computed value inside the component.

- [ ] **Step 3: Update `validateClaim` to receive allowedCombinations as a parameter (around line 72)**

```typescript
function validateClaim(
  date: string,
  slot: Slot,
  myClaims: AvailableShiftRow[],
  allowedCombinations: string[][],
): { valid: true } | { valid: false; error: string } {
  const slotsToday = new Set<Slot>([slot])
  myClaims.forEach(c => {
    if (c.date === date) slotsToday.add(c.slot)
  })
  const combo = new Set<string>()
  if (slotsToday.has('TM')) combo.add('DAY')
  if (slotsToday.has('TT')) combo.add('EVENING')
  if (slotsToday.has('TN')) combo.add('NIGHT')
  const isAllowed = allowedCombinations.some(
    c => c.length === combo.size && c.every(s => combo.has(s)),
  )
  if (!isAllowed) {
    return {
      valid: false,
      error:
        'No puedes hacer esa combinación el mismo día. Solo mañana, tarde, noche, o mañana + tarde.',
    }
  }

  if (slot === 'TN') {
    const next = addDays(date, 1)
    if (myClaims.some(c => c.date === next && c.slot === 'TM')) {
      return { valid: false, error: 'No puedes encadenar una noche con la mañana del día siguiente.' }
    }
  }
  if (slot === 'TM') {
    const prev = addDays(date, -1)
    if (myClaims.some(c => c.date === prev && c.slot === 'TN')) {
      return {
        valid: false,
        error: 'Tienes una noche el día anterior — no puedes trabajar la mañana siguiente.',
      }
    }
  }

  return { valid: true }
}
```

- [ ] **Step 4: Inside the `TurnosDisponibles` component, add computed values after the state declarations (around line 137)**

Add these after the existing `useState`/`useEffect` hooks block, before `myClaimsForSpecialty`:

```typescript
const facility = specialty ? SPECIALTY_FACILITY[specialty] : 'teknon'

const allowedCombinations: string[][] = specialty === 'sala-parts'
  ? [['DAY'], ['NIGHT']]
  : [['DAY'], ['EVENING'], ['NIGHT'], ['DAY', 'EVENING']]

const slotLabel = (slot: Slot): string => {
  if (specialty === 'sala-parts') return slot === 'TM' ? 'Día' : 'Noche'
  return SLOT_LABEL[slot]
}

const slotTime = (slot: Slot): string => {
  if (specialty === 'sala-parts') {
    return slot === 'TM' ? '09:00 – 21:15' : '21:00 – 09:15'
  }
  return { TM: '07:10 – 14:10', TT: '14:00 – 21:00', TN: '20:45 – 07:30' }[slot]
}

const getDisplayPrice = (date: string, slot: Slot): number => {
  if (specialty !== 'sala-parts') return 100
  const FESTIVOS = new Set(['2026-06-24', '2026-08-15', '2026-09-11'])
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const isFestivo = FESTIVOS.has(date)
  if (slot === 'TM') {
    if (isFestivo || dow === 0) return 416.05
    if (dow === 6) return 322.23
    return 273.92
  }
  const next = addDays(date, 1)
  const nextFestivo = FESTIVOS.has(next)
  if (isFestivo && nextFestivo) return 597.67
  if (isFestivo) return 526.62
  if (nextFestivo) return 491.82
  if (dow === 5) return 420.97
  if (dow === 6) return 503.65
  if (dow === 0) return 419.30
  return 384.49
}
```

- [ ] **Step 5: Replace all `FACILITY` usages with `facility`**

`fetchInventory(FACILITY, specialty)` → `fetchInventory(facility, specialty)` (two occurrences: in the main useEffect and in the timer useEffect)

`claimAvailableShift(professionalId, FACILITY, specialty, date, slot)` → `claimAvailableShift(professionalId, facility, specialty, date, slot)`

The optimistic `newRow` object has `facility: FACILITY` → change to `facility`

- [ ] **Step 6: Update `validateClaim` call inside `claimSlot` to pass `allowedCombinations`**

```typescript
// Around line 280
const validation = validateClaim(date, slot, myClaims, allowedCombinations)
```

- [ ] **Step 7: Update optimistic times and unit in `claimSlot`**

Replace the hardcoded times block (around line 305):

```typescript
const times =
  specialty === 'sala-parts'
    ? slot === 'TM'
      ? { start: '09:00', end: '21:15' }
      : { start: '21:00', end: '09:15' }
    : slot === 'TM'
    ? { start: '07:10', end: '14:10' }
    : slot === 'TT'
    ? { start: '14:00', end: '21:00' }
    : { start: '20:45', end: '07:30' }
```

And update the `unit` field in `newRow`:

```typescript
unit: UNIT_LABEL[specialty],
```

- [ ] **Step 8: Add sala-parts option to the `<select>` dropdown (around line 543)**

```typescript
<option value="sala-parts">{SPECIALTY_LABEL['sala-parts']}</option>
```

Place it after the `neonatos` option.

- [ ] **Step 9: Pass `dayLabel` and updated `allowedCombinations` to `AvailabilitySelector` (around line 571)**

```typescript
<AvailabilitySelector
  activeSlot={activeSlot}
  onSlotSelect={s => setActiveSlot(prev => (prev === s ? null : s))}
  onSave={() => {}}
  isSaving={false}
  hideAllDay
  hideSaveButton
  allowedCombinations={allowedCombinations}
  title="Selecciona tus turnos directamente"
  dayLabel={specialty === 'sala-parts' ? 'Día' : 'Mañana'}
/>
```

- [ ] **Step 10: Update `DayShiftsModal` call to pass `slotLabel`, `slotTime`, `getDisplayPrice`**

The modal is currently called with:
```typescript
<DayShiftsModal
  date={modalDate}
  specialty={specialty}
  inventory={inventoryByDate.get(modalDate) ?? new Map()}
  myClaims={myClaimsForSpecialty.filter(c => c.date === modalDate)}
  pendingKey={pendingClaimKey}
  onToggle={slot => toggleSlot(modalDate, slot)}
  onClose={() => setModalDate(null)}
/>
```

Add three new props:
```typescript
<DayShiftsModal
  date={modalDate}
  specialty={specialty}
  inventory={inventoryByDate.get(modalDate) ?? new Map()}
  myClaims={myClaimsForSpecialty.filter(c => c.date === modalDate)}
  pendingKey={pendingClaimKey}
  onToggle={slot => toggleSlot(modalDate, slot)}
  onClose={() => setModalDate(null)}
  slotLabel={slotLabel}
  slotTime={slotTime}
  getDisplayPrice={getDisplayPrice}
/>
```

- [ ] **Step 11: Update `DayShiftsModalProps` interface and body to use the new props**

Add to `DayShiftsModalProps` (around line 698):
```typescript
interface DayShiftsModalProps {
  date: string
  specialty: Specialty
  inventory: Map<Slot, number>
  myClaims: AvailableShiftRow[]
  pendingKey: string | null
  onToggle: (slot: Slot) => void
  onClose: () => void
  slotLabel: (slot: Slot) => string
  slotTime: (slot: Slot) => string
  getDisplayPrice: (date: string, slot: Slot) => number
}
```

Update the function signature to destructure the new props:
```typescript
function DayShiftsModal({
  date,
  specialty,
  inventory,
  myClaims,
  pendingKey,
  onToggle,
  onClose,
  slotLabel,
  slotTime,
  getDisplayPrice,
}: DayShiftsModalProps) {
```

Remove the hardcoded `slotTimes` and `SLOT_LABEL` usages inside the modal body — replace with the passed functions:

```typescript
// Remove these two constants that were defined inside DayShiftsModal:
// const slotTimes: Record<Slot, string> = { ... }      ← DELETE
// The SLOT_LABEL constant is already at module level ← no change needed but use slotLabel()

// In the slot card render, replace:
//   {SLOT_LABEL[slot]}  →  {slotLabel(slot)}
//   {slotTimes[slot]}   →  {slotTime(slot)}
//   100€                →  {getDisplayPrice(date, slot)}€

// Also replace the unit display:
// 'Hospitalización' · {FIELD_LABEL[specialty]}
// →  {UNIT_LABEL[specialty]} · {FIELD_LABEL[specialty]}
```

Full updated render for the slot card info section:
```typescript
<div className="flex flex-col flex-1 min-w-0">
  <div className="flex items-center gap-2 mb-1">
    <Icon size={16} className="text-gray-700" />
    <span className="text-sm font-semibold text-gray-900">
      {slotLabel(slot)}
    </span>
    <span className="text-sm text-gray-600">· {slotTime(slot)}</span>
  </div>
  <p className="text-sm text-gray-700">
    {UNIT_LABEL[specialty]} · {FIELD_LABEL[specialty]}
  </p>
  <div className="flex items-center gap-2 mt-1">
    <p className="text-sm font-semibold text-green-600">{getDisplayPrice(date, slot)}€</p>
    {!claimedByMe && (
      <p className="text-xs text-gray-500">
        {free === 0 ? 'Sin huecos' : `${free} disponible${free === 1 ? '' : 's'}`}
      </p>
    )}
  </div>
</div>
```

- [ ] **Step 12: Commit**

```bash
git add src/pages/TurnosDisponibles.tsx
git commit -m "feat: add H. Sant Pau — Sala de partos specialty with DIA/NIT slots and dynamic pricing"
```

---

## Task 3: Build the Sant Pau seed script and generate SQL

**Files:**
- Create: `scripts/build-santpau-data.mjs`
- Create: `scripts/seed-santpau-shifts.sql` (generated output)

- [ ] **Step 1: Create `scripts/build-santpau-data.mjs`**

```javascript
import { writeFileSync } from 'fs'

const FESTIVOS_2026 = new Set(['2026-06-24', '2026-08-15', '2026-09-11'])

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function getPrice(date, slot) {
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay() // 0=Sun, 6=Sat
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
// Format: { date: 'YYYY-MM-DD', slot: 'TM' | 'TN', count: N }
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
```

- [ ] **Step 2: Run the build script**

```bash
cd /Users/dani/Desktop/winter-plan/.claude/worktrees/goofy-meninsky-43f404
node scripts/build-santpau-data.mjs
```

Expected output:
```
Generated 1XX rows → scripts/seed-santpau-shifts.sql
```

Verify the file was created:
```bash
wc -l scripts/seed-santpau-shifts.sql
head -5 scripts/seed-santpau-shifts.sql
```

Expected head output (prices will vary by date):
```
-- Auto-generated by scripts/build-santpau-data.mjs
-- Do not edit by hand — re-run `node scripts/build-santpau-data.mjs` after updating shift data.

insert into public.available_shifts (facility, specialty, date, slot, unit, field, start_time, end_time, price) values
  ('sant-pau', 'sala-parts', '2026-08-05', 'TM', 'Sala de partos', 'Matronas', '09:00', '21:15', 273.92),
```

Spot-check a few key prices:
```bash
grep "2026-06-23" scripts/seed-santpau-shifts.sql   # Tue before Sant Joan → 491.82
grep "2026-08-15" scripts/seed-santpau-shifts.sql   # Asunción DIA → 416.05, NIT → 526.62
grep "2026-09-11" scripts/seed-santpau-shifts.sql   # Diada NIT → 526.62
```

- [ ] **Step 3: Commit both files**

```bash
git add scripts/build-santpau-data.mjs scripts/seed-santpau-shifts.sql
git commit -m "feat(data): add Sant Pau sala-parts seed script and SQL (Jun–Sep 2026)"
```

---

## Task 4: Seed Supabase

**Files:**
- Run SQL against `available_shifts` table on the production Supabase project

- [ ] **Step 1: Execute the seed SQL via Supabase MCP**

Use `mcp__supabase__execute_sql` with the full contents of `scripts/seed-santpau-shifts.sql`. The project URL is `https://ptcfhsigyfpoytjmcnlg.supabase.co` (project ref: `ptcfhsigyfpoytjmcnlg`).

- [ ] **Step 2: Verify the rows were inserted**

Run this verification query:
```sql
select slot, count(*) as total_rows, min(price) as min_price, max(price) as max_price
from public.available_shifts
where facility = 'sant-pau' and specialty = 'sala-parts'
group by slot
order by slot;
```

Expected result:
```
 slot | total_rows | min_price | max_price
------+------------+-----------+-----------
 TM   |         28 |    273.92 |    416.05
 TN   |    ~100+   |    384.49 |    597.67
```

- [ ] **Step 3: Smoke-test the new specialty in the dev server**

```bash
npm run dev
```

Open the dev server URL → navigate to `/summer/teknon/turnos-disponibles` → select "H. Sant Pau — Sala de partos" in the dropdown.

Verify:
- Only "Día" and "Noche" buttons appear (no "Tarde")
- July calendar shows night shifts (NIT)
- August calendar shows both day and night shifts
- Day modal shows correct times (09:00–21:15 / 21:00–09:15)
- Day modal shows price labels matching the table (e.g., Aug 5 DIA = 273.92€, Aug 15 DIA = 416.05€)
- "Sala de partos · Matronas" shown in the shift unit/field line
- Confirming reserves works end to end (the webhook payload sends `facility: 'sant-pau'`)

- [ ] **Step 4: Commit verification note (optional)**

No code change — just confirm the smoke test passed before moving on.
