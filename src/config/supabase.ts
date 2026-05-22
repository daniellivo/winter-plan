import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ptcfhsigyfpoytjmcnlg.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pnPIgTl1tD-rRUIkeIIbFg_m5ZfF-iB'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

export interface SummerPlanningRow {
  professional_id: string
  date: string
  morning: boolean
  evening: boolean
  night: boolean
  center: string
  specialty: string
}

export async function upsertSummerPlanning(rows: SummerPlanningRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('summer_planning')
    .upsert(rows, { onConflict: 'professional_id,date,center,specialty' })
  if (error) {
    console.error('❌ Supabase upsert failed:', error)
    throw error
  }
  console.log(`✅ Supabase upsert OK (${rows.length} rows)`)
}

export interface SummerPageViewRow {
  professional_id: string
  center: string
  specialty: string
}

export async function insertSummerPageView(row: SummerPageViewRow): Promise<void> {
  const { error } = await supabase.from('summer_page_views').insert(row)
  if (error) {
    console.error('❌ Supabase page_view insert failed:', error)
    throw error
  }
  console.log('✅ Supabase page_view recorded')
}

// ============================================
// Available shifts inventory (generic across facilities)
// ============================================

export type Slot = 'TM' | 'TT' | 'TN'

export interface AvailableShiftRow {
  id: number
  facility: string
  specialty: string
  date: string
  slot: Slot
  unit: string
  field: string
  start_time: string
  end_time: string
  price: number
  claimed_by: string | null
  claimed_at: string | null
  confirmed_at: string | null
}

export const HOLD_TTL_MS = 5 * 60 * 1000

export async function releaseExpiredHolds(): Promise<number> {
  const { data, error } = await supabase.rpc('release_expired_holds')
  if (error) {
    console.error('❌ releaseExpiredHolds failed:', error)
    return 0
  }
  return (data as number) ?? 0
}

export async function confirmMyClaims(professionalId: string): Promise<number> {
  const { data, error } = await supabase.rpc('confirm_my_claims', {
    p_professional_id: professionalId,
  })
  if (error) {
    console.error('❌ confirmMyClaims failed:', error)
    throw error
  }
  return (data as number) ?? 0
}

export interface InventoryEntry {
  date: string
  slot: Slot
  freeCount: number
}

export async function fetchInventory(
  facility: string,
  specialty: string,
): Promise<InventoryEntry[]> {
  await releaseExpiredHolds()
  const { data, error } = await supabase
    .from('available_shifts')
    .select('date, slot')
    .eq('facility', facility)
    .eq('specialty', specialty)
    .is('claimed_by', null)
  if (error) {
    console.error('❌ fetchInventory failed:', error)
    throw error
  }
  const counts = new Map<string, number>()
  ;(data ?? []).forEach((r: { date: string; slot: Slot }) => {
    const k = `${r.date}|${r.slot}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  })
  return Array.from(counts.entries()).map(([k, freeCount]) => {
    const [date, slot] = k.split('|')
    return { date, slot: slot as Slot, freeCount }
  })
}

export async function fetchMyClaims(professionalId: string): Promise<AvailableShiftRow[]> {
  await releaseExpiredHolds()
  const { data, error } = await supabase
    .from('available_shifts')
    .select('*')
    .eq('claimed_by', professionalId)
  if (error) {
    console.error('❌ fetchMyClaims failed:', error)
    throw error
  }
  return (data ?? []) as AvailableShiftRow[]
}

export async function claimAvailableShift(
  professionalId: string,
  facility: string,
  specialty: string,
  date: string,
  slot: Slot,
): Promise<number | null> {
  const { data, error } = await supabase.rpc('claim_available_shift', {
    p_professional_id: professionalId,
    p_facility: facility,
    p_specialty: specialty,
    p_date: date,
    p_slot: slot,
  })
  if (error) {
    console.error('❌ claimAvailableShift failed:', error)
    throw error
  }
  return (data as number | null) ?? null
}

export async function releaseAvailableShift(
  professionalId: string,
  shiftId: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('release_available_shift', {
    p_professional_id: professionalId,
    p_shift_id: shiftId,
  })
  if (error) {
    console.error('❌ releaseAvailableShift failed:', error)
    throw error
  }
  return data !== null
}
