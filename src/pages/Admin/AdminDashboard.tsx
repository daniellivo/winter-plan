import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { IconLogout, IconPlus, IconX } from '@tabler/icons-react'

type Specialty = 'adultos' | 'pediatria' | 'materno' | 'neonatos' | 'sala-parts'

const SPECIALTIES: Specialty[] = ['adultos', 'pediatria', 'materno', 'neonatos', 'sala-parts']

const SPECIALTY_LABEL: Record<Specialty, string> = {
  adultos: 'Teknon — Adultos',
  pediatria: 'Teknon — Pediatría',
  materno: 'Teknon — Materno',
  neonatos: 'Teknon — Neonatos',
  'sala-parts': 'H. Sant Pau — Sala de partos',
}

interface WhitelistEntry {
  id: number
  professional_id: string
  specialty: Specialty
}

// Accepts comma/semicolon/whitespace/newline/tab as separators; dedupes while preserving order.
function parseIds(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const tok of raw.split(/[\s,;]+/)) {
    const t = tok.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

interface BulkResult {
  inserted: number
  duplicates: number
  bySpecialty: { specialty: Specialty; inserted: number; duplicates: number }[]
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Per-specialty add state
  const [inputs, setInputs] = useState<Record<Specialty, string>>({
    adultos: '',
    pediatria: '',
    materno: '',
    neonatos: '',
    'sala-parts': '',
  })
  const [adding, setAdding] = useState<Specialty | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Specialty, string>>>({})
  const [infos, setInfos] = useState<Partial<Record<Specialty, string>>>({})

  // Global bulk state
  const [bulkInput, setBulkInput] = useState('')
  const [bulkSelected, setBulkSelected] = useState<Set<Specialty>>(new Set())
  const [bulkAdding, setBulkAdding] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('specialty_whitelist')
      .select('id, professional_id, specialty')
      .order('created_at', { ascending: true })
    if (!error && data) setEntries(data as WhitelistEntry[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const bulkIds = useMemo(() => parseIds(bulkInput), [bulkInput])

  async function handleAdd(specialty: Specialty) {
    const ids = parseIds(inputs[specialty])
    if (ids.length === 0) return
    setErrors(prev => ({ ...prev, [specialty]: undefined }))
    setInfos(prev => ({ ...prev, [specialty]: undefined }))
    setAdding(specialty)

    const existing = new Set(
      entries.filter(e => e.specialty === specialty).map(e => e.professional_id),
    )
    const duplicates = ids.filter(id => existing.has(id))
    const toInsert = ids.filter(id => !existing.has(id))

    let insertError: string | null = null
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('specialty_whitelist')
        .insert(toInsert.map(id => ({ professional_id: id, specialty })))
      if (error) insertError = 'Error al añadir'
    }
    setAdding(null)

    if (insertError) {
      setErrors(prev => ({ ...prev, [specialty]: insertError }))
      return
    }

    if (duplicates.length > 0 && toInsert.length === 0) {
      setErrors(prev => ({
        ...prev,
        [specialty]: ids.length === 1 ? 'Ya está en la lista' : 'Todos ya estaban en la lista',
      }))
      return
    }

    if (duplicates.length > 0) {
      setInfos(prev => ({
        ...prev,
        [specialty]: `${toInsert.length} añadido${toInsert.length === 1 ? '' : 's'}, ${duplicates.length} ya estaba${duplicates.length === 1 ? '' : 'n'}`,
      }))
    }

    setInputs(prev => ({ ...prev, [specialty]: '' }))
    await load()
  }

  async function handleBulkAdd() {
    const ids = bulkIds
    const specialties = Array.from(bulkSelected)
    if (ids.length === 0 || specialties.length === 0) return

    setBulkError(null)
    setBulkResult(null)
    setBulkAdding(true)

    const existingBySpecialty = new Map<Specialty, Set<string>>()
    specialties.forEach(sp =>
      existingBySpecialty.set(
        sp,
        new Set(entries.filter(e => e.specialty === sp).map(e => e.professional_id)),
      ),
    )

    const rowsToInsert: { professional_id: string; specialty: Specialty }[] = []
    const perSpecialty: BulkResult['bySpecialty'] = []
    for (const sp of specialties) {
      const ex = existingBySpecialty.get(sp)!
      const newOnes = ids.filter(id => !ex.has(id))
      perSpecialty.push({ specialty: sp, inserted: newOnes.length, duplicates: ids.length - newOnes.length })
      newOnes.forEach(id => rowsToInsert.push({ professional_id: id, specialty: sp }))
    }

    if (rowsToInsert.length > 0) {
      const { error } = await supabase.from('specialty_whitelist').insert(rowsToInsert)
      if (error) {
        setBulkAdding(false)
        setBulkError('Error al insertar. Revisa la consola.')
        console.error('bulk insert failed:', error)
        return
      }
    }

    setBulkAdding(false)
    setBulkResult({
      inserted: rowsToInsert.length,
      duplicates: perSpecialty.reduce((s, p) => s + p.duplicates, 0),
      bySpecialty: perSpecialty,
    })
    setBulkInput('')
    setBulkSelected(new Set())
    await load()
  }

  async function handleRemove(entry: WhitelistEntry) {
    setRemoving(entry.id)
    await supabase.from('specialty_whitelist').delete().eq('id', entry.id)
    setRemoving(null)
    await load()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/admin', { replace: true })
  }

  const bySpecialty = (specialty: Specialty) =>
    entries.filter(e => e.specialty === specialty)

  function toggleBulkSpecialty(sp: Specialty) {
    setBulkSelected(prev => {
      const next = new Set(prev)
      if (next.has(sp)) next.delete(sp)
      else next.add(sp)
      return next
    })
    setBulkResult(null)
  }

  const bulkRowCount = bulkIds.length * bulkSelected.size

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Cargando…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between h-12 px-4 max-w-5xl mx-auto">
          <h1 className="text-base font-semibold text-gray-900">Whitelist de acceso</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <IconLogout size={16} />
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Global bulk panel */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Añadir IDs en bulk</h2>
            <p className="text-xs text-gray-500">
              Pega una lista y aplícala a una o varias especialidades a la vez.
            </p>
          </div>

          <textarea
            value={bulkInput}
            onChange={e => {
              setBulkInput(e.target.value)
              setBulkResult(null)
              setBulkError(null)
            }}
            placeholder="Pega aquí los IDs: uno por línea, o separados por comas, espacios o tabs."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2cbeff] focus:border-transparent resize-y"
          />

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-600">Aplicar a:</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(sp => {
                const checked = bulkSelected.has(sp)
                return (
                  <button
                    key={sp}
                    onClick={() => toggleBulkSpecialty(sp)}
                    type="button"
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                      checked
                        ? 'bg-[#2cbeff] border-[#2cbeff] text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {SPECIALTY_LABEL[sp]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">
              {bulkIds.length === 0
                ? 'Sin IDs detectados'
                : `${bulkIds.length} ID${bulkIds.length === 1 ? '' : 's'} detectado${bulkIds.length === 1 ? '' : 's'}`}
              {bulkSelected.size > 0 && bulkIds.length > 0
                ? ` × ${bulkSelected.size} especialidad${bulkSelected.size === 1 ? '' : 'es'} = ${bulkRowCount} fila${bulkRowCount === 1 ? '' : 's'}`
                : ''}
            </p>
            <button
              onClick={handleBulkAdd}
              disabled={bulkIds.length === 0 || bulkSelected.size === 0 || bulkAdding}
              className="px-4 py-2 bg-[#2cbeff] hover:bg-[#1aa8e8] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkAdding ? 'Añadiendo…' : 'Añadir en bulk'}
            </button>
          </div>

          {bulkError && <p className="text-xs text-red-500">{bulkError}</p>}
          {bulkResult && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 flex flex-col gap-1">
              <p>
                <span className="font-semibold text-gray-800">{bulkResult.inserted}</span> insertados ·{' '}
                <span className="font-semibold text-gray-800">{bulkResult.duplicates}</span> ya estaban
              </p>
              {bulkResult.bySpecialty.map(b => (
                <p key={b.specialty} className="text-gray-500">
                  · {SPECIALTY_LABEL[b.specialty]}: +{b.inserted}
                  {b.duplicates > 0 ? ` (${b.duplicates} dup)` : ''}
                </p>
              ))}
            </div>
          )}
        </section>

        {/* Per-specialty grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map(specialty => {
            const list = bySpecialty(specialty)
            const isAdding = adding === specialty
            const inputVal = inputs[specialty]
            const parsed = parseIds(inputVal)
            const err = errors[specialty]
            const info = infos[specialty]

            return (
              <div key={specialty} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-800">{SPECIALTY_LABEL[specialty]}</h2>
                  <span className="text-xs text-gray-400">{list.length}</span>
                </div>

                {/* Professional ID list */}
                <div className="flex flex-col gap-1.5 min-h-[40px]">
                  {list.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin accesos configurados</p>
                  ) : (
                    list.map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-1.5"
                      >
                        <span className="text-xs text-gray-700 font-mono truncate flex-1">
                          {entry.professional_id}
                        </span>
                        <button
                          onClick={() => handleRemove(entry)}
                          disabled={removing === entry.id}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 flex-shrink-0"
                          aria-label="Eliminar"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add input */}
                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={inputVal}
                    onChange={e => {
                      setInputs(prev => ({ ...prev, [specialty]: e.target.value }))
                      if (err) setErrors(prev => ({ ...prev, [specialty]: undefined }))
                      if (info) setInfos(prev => ({ ...prev, [specialty]: undefined }))
                    }}
                    placeholder="ID1, ID2…  o uno por línea"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2cbeff] focus:border-transparent resize-y"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-400">
                      {parsed.length === 0
                        ? 'Sin IDs'
                        : `${parsed.length} ID${parsed.length === 1 ? '' : 's'}`}
                    </span>
                    <button
                      onClick={() => handleAdd(specialty)}
                      disabled={parsed.length === 0 || isAdding}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#2cbeff] hover:bg-[#1aa8e8] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Añadir"
                    >
                      <IconPlus size={12} />
                      {isAdding ? 'Añadiendo…' : 'Añadir'}
                    </button>
                  </div>
                  {err && <p className="text-xs text-red-500">{err}</p>}
                  {!err && info && <p className="text-xs text-gray-500">{info}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
