import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  IconHeadset,
  IconCheck,
  IconX,
  IconSun,
  IconSunset2,
  IconMoon,
  IconChevronLeft,
} from '@tabler/icons-react'
import Calendar from '../components/Calendar/Calendar'
import MonthSelector from '../components/Calendar/MonthSelector'
import AvailabilitySelector from '../components/AvailabilitySelector'
import {
  supabase,
  fetchInventory,
  fetchMyClaims,
  claimAvailableShift,
  releaseAvailableShift,
  confirmMyClaims,
  HOLD_TTL_MS,
  type AvailableShiftRow,
  type Slot,
} from '../config/supabase'
import { useAppContext } from '../App'
import type { AvailabilitySlot } from '../api/winterPlan'
import type { Shift, MonthData } from '../types/winterPlan'

const WEBHOOK_URL =
  'https://livomarketing.app.n8n.cloud/webhook/981394b5-166b-4ecd-ad13-340406449379'

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

const SLOT_LABEL: Record<Slot, string> = { TM: 'Mañana', TT: 'Tarde', TN: 'Noche' }

const ACTIVE_SLOT_TO_LABEL: Record<'day' | 'evening' | 'night', Slot> = {
  day: 'TM',
  evening: 'TT',
  night: 'TN',
}

function formatTimeLeft(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

function addDays(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function validateClaim(
  date: string,
  slot: Slot,
  myClaims: AvailableShiftRow[],
  allowedCombinations: string[][],
): { valid: true } | { valid: false; error: string } {
  // Rule 1: per-day combination — only TM, TT, TN alone, or TM+TT.
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

  // Rule 2: no morning right after a night.
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

export default function TurnosDisponibles() {
  const { professionalId } = useAppContext()

  const [specialty, setSpecialty] = useState<Specialty | ''>('')
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [currentMonth, setCurrentMonth] = useState(6) // Julio 2026 (Junio oculto)
  const [currentYear, setCurrentYear] = useState(2026)
  const [activeSlot, setActiveSlot] = useState<
    'all' | 'day' | 'evening' | 'night' | 'delete' | null
  >(null)
  const [inventoryByDate, setInventoryByDate] = useState<Map<string, Map<Slot, number>>>(
    new Map(),
  )
  const [myClaims, setMyClaims] = useState<AvailableShiftRow[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingClaimKey, setPendingClaimKey] = useState<string | null>(null)
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [now, setNow] = useState(() => Date.now())

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
    return ({ TM: '07:10 – 14:10', TT: '14:00 – 21:00', TN: '20:45 – 07:30' } as Record<Slot, string>)[slot]
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

  // Load my claims once on mount (independent of specialty).
  useEffect(() => {
    if (!professionalId) return
    fetchMyClaims(professionalId)
      .then(setMyClaims)
      .catch(err => console.error('fetchMyClaims failed:', err))
  }, [professionalId])

  // Check whitelist whenever specialty changes.
  useEffect(() => {
    if (!specialty) {
      setHasAccess(null)
      return
    }
    setHasAccess(null)
    let cancelled = false
    async function check() {
      try {
        const { data } = await supabase
          .from('specialty_whitelist')
          .select('id')
          .eq('professional_id', professionalId)
          .eq('specialty', specialty as string)
          .maybeSingle()
        if (!cancelled) setHasAccess(data !== null)
      } catch {
        if (!cancelled) setHasAccess(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [specialty, professionalId])

  // Load inventory whenever specialty changes.
  useEffect(() => {
    if (!specialty) {
      setInventoryByDate(new Map())
      return
    }
    setLoading(true)
    fetchInventory(facility, specialty)
      .then(entries => {
        const map = new Map<string, Map<Slot, number>>()
        entries.forEach(({ date, slot, freeCount }) => {
          const inner = map.get(date) ?? new Map<Slot, number>()
          inner.set(slot, freeCount)
          map.set(date, inner)
        })
        setInventoryByDate(map)
      })
      .catch(err => console.error('fetchInventory failed:', err))
      .finally(() => setLoading(false))
  }, [specialty])

  useEffect(() => {
    if (!errorMessage) return
    const t = setTimeout(() => setErrorMessage(null), 4500)
    return () => clearTimeout(t)
  }, [errorMessage])

  // Tick the clock every second whenever there are unconfirmed holds.
  const hasUnconfirmedHolds = useMemo(
    () => myClaims.some(c => !c.confirmed_at),
    [myClaims],
  )
  useEffect(() => {
    if (!hasUnconfirmedHolds) return
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [hasUnconfirmedHolds])

  // Earliest expiry across unconfirmed holds (ms since epoch). NULL if none.
  const earliestExpiryMs = useMemo<number | null>(() => {
    let earliest: number | null = null
    myClaims.forEach(c => {
      if (c.confirmed_at || !c.claimed_at) return
      const expiry = new Date(c.claimed_at).getTime() + HOLD_TTL_MS
      if (earliest === null || expiry < earliest) earliest = expiry
    })
    return earliest
  }, [myClaims])

  const timeLeftMs = earliestExpiryMs === null ? null : Math.max(0, earliestExpiryMs - now)

  // When the timer hits 0, refresh inventory + claims (the reaper will fire server-side).
  useEffect(() => {
    if (timeLeftMs !== 0) return
    fetchMyClaims(professionalId).then(setMyClaims).catch(() => {})
    if (specialty) {
      fetchInventory(facility, specialty)
        .then(entries => {
          const map = new Map<string, Map<Slot, number>>()
          entries.forEach(({ date, slot, freeCount }) => {
            const inner = map.get(date) ?? new Map<Slot, number>()
            inner.set(slot, freeCount)
            map.set(date, inner)
          })
          setInventoryByDate(map)
        })
        .catch(() => {})
    }
  }, [timeLeftMs, professionalId, specialty])

  const myClaimsForSpecialty = useMemo(
    () => (specialty ? myClaims.filter(c => c.specialty === specialty) : []),
    [myClaims, specialty],
  )

  // For the calendar: synthesize "available" availability (gray) from inventory
  // and "claimed" shifts (green) from myClaims.
  const calendarAvailability = useMemo<AvailabilitySlot[]>(() => {
    if (!specialty) return []
    const result: AvailabilitySlot[] = []
    inventoryByDate.forEach((slots, date) => {
      result.push({
        date,
        day: (slots.get('TM') ?? 0) > 0,
        evening: (slots.get('TT') ?? 0) > 0,
        night: (slots.get('TN') ?? 0) > 0,
      })
    })
    return result
  }, [inventoryByDate, specialty])

  const calendarMonths = useMemo<MonthData[]>(() => {
    if (!specialty) return []
    const byMonth = new Map<string, Map<string, Shift[]>>()
    myClaimsForSpecialty.forEach(c => {
      const monthKey = c.date.slice(0, 7)
      const monthMap = byMonth.get(monthKey) ?? new Map<string, Shift[]>()
      const dayShifts = monthMap.get(c.date) ?? []
      dayShifts.push({
        id: String(c.id),
        label: c.slot,
        startTime: c.start_time,
        endTime: c.end_time,
        facilityName: 'Hospital Teknon',
        unit: c.unit,
        field: c.field,
        price: Number(c.price),
        status: 'claimed',
      })
      monthMap.set(c.date, dayShifts)
      byMonth.set(monthKey, monthMap)
    })
    const result: MonthData[] = []
    byMonth.forEach((dayMap, month) => {
      const days = Array.from(dayMap.entries()).map(([date, shifts]) => ({ date, shifts }))
      result.push({ month, days })
    })
    return result
  }, [myClaimsForSpecialty, specialty])

  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const currentMonthData = calendarMonths.find(m => m.month === currentMonthKey)
  const editingHack = useMemo(() => new Map<string, Set<string>>(), [])

  const isClaimedByMe = useCallback(
    (date: string, slot: Slot) =>
      myClaimsForSpecialty.some(c => c.date === date && c.slot === slot),
    [myClaimsForSpecialty],
  )

  const claimSlot = useCallback(
    async (date: string, slot: Slot) => {
      if (!specialty) return
      const validation = validateClaim(date, slot, myClaims, allowedCombinations)
      if (!validation.valid) {
        setErrorMessage(validation.error)
        return
      }
      const key = `${date}|${slot}`
      setPendingClaimKey(key)
      try {
        const id = await claimAvailableShift(professionalId, facility, specialty, date, slot)
        if (id === null) {
          setErrorMessage('Ese turno se acaba de agotar.')
          // Refresh inventory to reflect reality.
          fetchInventory(facility, specialty).then(entries => {
            const map = new Map<string, Map<Slot, number>>()
            entries.forEach(({ date: d, slot: s, freeCount }) => {
              const inner = map.get(d) ?? new Map<Slot, number>()
              inner.set(s, freeCount)
              map.set(d, inner)
            })
            setInventoryByDate(map)
          })
          return
        }
        // Optimistic local update.
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
        const newRow: AvailableShiftRow = {
          id,
          facility,
          specialty,
          date,
          slot,
          unit: UNIT_LABEL[specialty],
          field: FIELD_LABEL[specialty],
          start_time: times.start,
          end_time: times.end,
          price: getDisplayPrice(date, slot),
          claimed_by: professionalId,
          claimed_at: new Date().toISOString(),
          confirmed_at: null,
        }
        let appended = false
        setMyClaims(prev => {
          if (prev.some(c => c.id === id)) return prev
          appended = true
          return [...prev, newRow]
        })
        if (appended) {
          setInventoryByDate(prev => {
            const map = new Map(prev)
            const inner = new Map(map.get(date) ?? new Map<Slot, number>())
            inner.set(slot, Math.max(0, (inner.get(slot) ?? 0) - 1))
            map.set(date, inner)
            return map
          })
        }
        // Re-fetch my claims so prices and the (now-reset) hold countdown are accurate.
        fetchMyClaims(professionalId).then(setMyClaims).catch(() => {})
      } catch (err) {
        console.error(err)
        setErrorMessage('No se pudo reservar el turno. Inténtalo de nuevo.')
      } finally {
        setPendingClaimKey(null)
      }
    },
    [professionalId, specialty, myClaims],
  )

  const releaseSlot = useCallback(
    async (date: string, slot: Slot) => {
      if (!specialty) return
      const mine = myClaimsForSpecialty.find(c => c.date === date && c.slot === slot)
      if (!mine) return
      const key = `${date}|${slot}`
      setPendingClaimKey(key)
      try {
        const ok = await releaseAvailableShift(professionalId, mine.id)
        if (!ok) {
          setErrorMessage('No se pudo liberar el turno.')
          return
        }
        setMyClaims(prev => prev.filter(c => c.id !== mine.id))
        setInventoryByDate(prev => {
          const map = new Map(prev)
          const inner = new Map(map.get(date) ?? new Map<Slot, number>())
          inner.set(slot, (inner.get(slot) ?? 0) + 1)
          map.set(date, inner)
          return map
        })
      } catch (err) {
        console.error(err)
      } finally {
        setPendingClaimKey(null)
      }
    },
    [professionalId, specialty, myClaimsForSpecialty],
  )

  const toggleSlot = useCallback(
    async (date: string, slot: Slot) => {
      if (isClaimedByMe(date, slot)) {
        await releaseSlot(date, slot)
      } else {
        const free = inventoryByDate.get(date)?.get(slot) ?? 0
        if (free <= 0) return
        await claimSlot(date, slot)
      }
    },
    [isClaimedByMe, releaseSlot, claimSlot, inventoryByDate],
  )

  const handleDayClick = (date: string) => {
    if (!specialty) return
    const inv = inventoryByDate.get(date)
    const mineToday = myClaimsForSpecialty.filter(c => c.date === date)
    const hasAnythingHere = (inv && inv.size > 0) || mineToday.length > 0
    if (!hasAnythingHere) return

    if (activeSlot === 'delete') {
      mineToday.forEach(c => releaseSlot(c.date, c.slot))
      return
    }
    if (activeSlot === 'day' || activeSlot === 'evening' || activeSlot === 'night') {
      const slot = ACTIVE_SLOT_TO_LABEL[activeSlot]
      void toggleSlot(date, slot)
      return
    }
    setModalDate(date)
  }

  const claimCount = myClaimsForSpecialty.length

  const handleConfirmSubmit = async () => {
    if (submitting || myClaims.length === 0) return
    setSubmitting(true)

    // First: promote all my holds to confirmed in the DB. If some expired
    // between opening the modal and clicking confirm, they won't be in my
    // claims any more — re-fetch and warn the user.
    try {
      await confirmMyClaims(professionalId)
    } catch (err) {
      console.error('Confirm failed:', err)
      setSubmitting(false)
      setErrorMessage('No se pudo confirmar. Por favor, inténtalo de nuevo.')
      setConfirmOpen(false)
      const fresh = await fetchMyClaims(professionalId).catch(() => [])
      setMyClaims(fresh)
      return
    }

    const fresh = await fetchMyClaims(professionalId).catch(() => myClaims)
    setMyClaims(fresh)
    const confirmed = fresh.filter(c => c.confirmed_at)
    if (confirmed.length < myClaims.length) {
      setErrorMessage(
        `Algunos de tus turnos expiraron y se liberaron. Se han confirmado ${confirmed.length} de ${myClaims.length}.`,
      )
    }

    const webhookPayload = {
      encodedId: professionalId,
      timestamp: new Date().toISOString(),
      flow: 'available-shifts',
      claims: confirmed.map(c => ({
        shiftId: c.id,
        facility: c.facility,
        specialty: c.specialty,
        date: c.date,
        slot: c.slot,
        unit: c.unit,
        field: c.field,
        startTime: c.start_time,
        endTime: c.end_time,
        price: Number(c.price),
      })),
    }
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
        keepalive: true,
      })
    } catch (err) {
      console.error('Webhook failed (continuing):', err)
    }
    setDone(true)
    setTimeout(() => {
      window.location.href = 'https://livo-385512.web.app/app/ShiftStack/Feed?tab=SHIFTS'
    }, 2200)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="sticky top-0 z-50 bg-white">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="w-10" />
            <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
              🏖️ Turnos disponibles 🏖️
            </h1>
            <div className="w-10" />
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <IconCheck size={44} className="text-green-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Listo!</h2>
          <p className="text-base text-gray-700 leading-relaxed mb-2 max-w-sm">
            Hemos guardado tu solicitud de turnos.
          </p>
          <p className="text-base text-gray-600 leading-relaxed max-w-sm">
            El equipo de Livo te confirmará en las próximas{' '}
            <span className="font-semibold text-gray-900">48&nbsp;horas</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="w-10" />
          <h1 className="text-base font-semibold text-gray-900 text-center flex-1">
            🏖️ Turnos disponibles 🏖️
          </h1>
          <button
            onClick={() => {
              window.location.href = 'https://livo-385512.web.app/app/chat'
            }}
            className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <IconHeadset size={20} />
          </button>
        </div>
      </header>

      <div className="px-4">
        <div className="py-4">
          <p className="text-gray-600 text-sm leading-relaxed mb-4 text-center">
            Selecciona tus turnos directamente en{' '}
            <span className="font-semibold text-gray-800">
              {specialty === 'sala-parts' ? 'H. Sant Pau' : 'Hospital Teknon'}
            </span>.
          </p>

          <label className="block text-xs font-semibold text-gray-700 mb-2">Especialidad</label>
          <select
            value={specialty}
            onChange={e => {
              setSpecialty((e.target.value || '') as Specialty | '')
              setActiveSlot(null)
            }}
            className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 text-base font-medium focus:outline-none focus:border-[#2cbeff]"
          >
            <option value="">Selecciona una especialidad…</option>
            <option value="adultos">{SPECIALTY_LABEL.adultos}</option>
            <option value="pediatria">{SPECIALTY_LABEL.pediatria}</option>
            <option value="materno">{SPECIALTY_LABEL.materno}</option>
            <option value="neonatos">{SPECIALTY_LABEL.neonatos}</option>
            <option value="sala-parts">{SPECIALTY_LABEL['sala-parts']}</option>
          </select>
        </div>

        {!specialty ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-600 text-sm">
              Elige una especialidad arriba para empezar a seleccionar turnos.
            </p>
          </div>
        ) : hasAccess === null ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">Verificando acceso…</p>
          </div>
        ) : !hasAccess ? (
          <div className="py-16 text-center px-6">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Sin acceso a esta especialidad
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              No tienes acceso a los turnos de esta especialidad. Contacta con el equipo de Livo para solicitar acceso.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Las franjas <span className="font-semibold">en gris</span> son los turnos que
                puedes reservar. Pulsa una franja arriba y luego un día para seleccionar, o pulsa
                el día directamente para ver el detalle.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed mt-2">
                Los turnos se asignarán en las próximas{' '}
                <span className="font-semibold">48&nbsp;horas</span> por el equipo de Livo.
              </p>
            </div>

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

            {errorMessage && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {loading && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <p className="text-sm text-blue-700">Cargando turnos…</p>
              </div>
            )}

            <MonthSelector
              month={currentMonth}
              year={currentYear}
              onPrevious={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11)
                  setCurrentYear(currentYear - 1)
                } else setCurrentMonth(currentMonth - 1)
              }}
              onNext={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0)
                  setCurrentYear(currentYear + 1)
                } else setCurrentMonth(currentMonth + 1)
              }}
              canGoPrevious={!(currentYear === 2026 && currentMonth === 6)}
              canGoNext={!(currentYear === 2026 && currentMonth === 8)}
              months={[
                { month: 6, year: 2026 },
                { month: 7, year: 2026 },
                { month: 8, year: 2026 },
              ]}
              onSelectMonth={(m, y) => {
                setCurrentMonth(m)
                setCurrentYear(y)
              }}
            />

            <Calendar
              year={currentYear}
              month={currentMonth}
              days={currentMonthData?.days || []}
              onDayClick={handleDayClick}
              availability={calendarAvailability}
              pendingSlotsByDate={editingHack}
            />

            <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-6 mt-8">
              {claimCount > 0 && (
                <div className="text-center mb-3">
                  <p className="text-sm text-gray-600">
                    Has reservado{' '}
                    <span className="font-semibold text-[#2cbeff]">{claimCount}</span>{' '}
                    {claimCount === 1 ? 'turno' : 'turnos'}
                  </p>
                  {timeLeftMs !== null && timeLeftMs > 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      ⏱ Tienes{' '}
                      <span className="font-semibold">{formatTimeLeft(timeLeftMs)}</span>{' '}
                      para confirmar antes de que se liberen.
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={myClaims.length === 0}
                className={`
                  w-full py-4 rounded-full font-semibold text-white text-base
                  flex items-center justify-center gap-2 transition-all duration-200
                  ${myClaims.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#2cbeff] hover:bg-[#1ea8e0] active:scale-98'
                  }
                `}
              >
                <IconCheck size={22} strokeWidth={2.5} />
                <span>Solicita tus turnos</span>
              </button>
              {myClaims.length === 0 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Selecciona al menos un turno
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {modalDate && specialty && (
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
      )}

      {confirmOpen && (
        <ConfirmModal
          claims={myClaims}
          submitting={submitting}
          timeLeftMs={timeLeftMs}
          onBack={() => setConfirmOpen(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  )
}

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
  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const slotsInOrder: Slot[] = ['TM', 'TT', 'TN']
  const SlotIcon = (slot: Slot) =>
    slot === 'TM' ? IconSun : slot === 'TT' ? IconSunset2 : IconMoon

  const visibleSlots = slotsInOrder.filter(s => {
    const free = inventory.get(s) ?? 0
    const claimed = myClaims.some(c => c.slot === s)
    return free > 0 || claimed
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl z-50 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="p-4">
          <div className="py-3 -mt-3">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 capitalize">{formatted}</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="space-y-3 pb-4">
            {visibleSlots.map(slot => {
              const free = inventory.get(slot) ?? 0
              const claimedByMe = myClaims.some(c => c.slot === slot)
              const Icon = SlotIcon(slot)
              const key = `${date}|${slot}`
              const isPending = pendingKey === key
              return (
                <div
                  key={slot}
                  className={`p-4 rounded-xl flex items-stretch gap-3 transition-colors ${
                    claimedByMe ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
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
                  <button
                    onClick={() => onToggle(slot)}
                    disabled={isPending || (!claimedByMe && free === 0)}
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      claimedByMe
                        ? 'bg-green-500 border-2 border-green-500'
                        : free === 0
                        ? 'bg-gray-200 border-2 border-gray-200 cursor-not-allowed'
                        : 'border-2 border-green-500 hover:bg-green-50'
                    } ${isPending ? 'opacity-60 cursor-wait' : ''}`}
                    aria-label={claimedByMe ? 'Cancelar reserva' : 'Reservar'}
                  >
                    {isPending ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin text-green-500" />
                    ) : (
                      <IconCheck
                        size={22}
                        className={
                          claimedByMe ? 'text-white' : free === 0 ? 'text-gray-400' : 'text-green-500'
                        }
                        strokeWidth={claimedByMe ? 3 : 2}
                      />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

interface ConfirmModalProps {
  claims: AvailableShiftRow[]
  submitting: boolean
  timeLeftMs: number | null
  onBack: () => void
  onConfirm: () => void
}

function ConfirmModal({ claims, submitting, timeLeftMs, onBack, onConfirm }: ConfirmModalProps) {
  const ordered = [...claims].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    const order: Record<Slot, number> = { TM: 0, TT: 1, TN: 2 }
    return order[a.slot] - order[b.slot]
  })
  const totalPrice = ordered.reduce((s, c) => s + Number(c.price), 0)
  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  const SlotIcon = (slot: Slot) =>
    slot === 'TM' ? IconSun : slot === 'TT' ? IconSunset2 : IconMoon

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <header className="sticky top-0 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between h-12 px-4">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex items-center gap-1 text-[#2cbeff] font-medium text-sm hover:opacity-80"
          >
            <IconChevronLeft size={20} />
            <span>Volver</span>
          </button>
          <h1 className="text-base font-semibold text-gray-900">Confirma tus turnos</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-amber-900 leading-relaxed">
            <span className="font-semibold">Atención:</span> al confirmar, estos{' '}
            <span className="font-semibold">{ordered.length}</span> turnos te quedarán asignados.
          </p>
          {timeLeftMs !== null && timeLeftMs > 0 && (
            <p className="text-xs text-amber-800 mt-2">
              ⏱ Te quedan{' '}
              <span className="font-semibold">{formatTimeLeft(timeLeftMs)}</span>{' '}
              para confirmar antes de que se liberen y otros profesionales puedan reservarlos.
            </p>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">Tus turnos:</p>
        <div className="space-y-2">
          {ordered.map(c => {
            const Icon = SlotIcon(c.slot)
            return (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-gray-50 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-gray-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                      {formatDate(c.date)} · {SLOT_LABEL[c.slot]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.start_time} – {c.end_time} · {c.unit} · {c.field}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-600 flex-shrink-0">
                  {Number(c.price)}€
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-base text-gray-700">Total</span>
          <span className="text-2xl font-bold text-green-600">{totalPrice}€</span>
        </div>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className={`
            w-full py-4 rounded-full font-semibold text-white text-base
            flex items-center justify-center gap-2 transition-all duration-200
            ${submitting
              ? 'bg-[#2cbeff]/70 cursor-wait'
              : 'bg-[#2cbeff] hover:bg-[#1ea8e0] active:scale-98'
            }
          `}
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Confirmando…</span>
            </>
          ) : (
            <>
              <IconCheck size={22} strokeWidth={2.5} />
              <span>Confirmar y asignar</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
