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
