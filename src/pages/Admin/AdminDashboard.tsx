import { useState, useEffect, useCallback } from 'react'
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

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)
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

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('specialty_whitelist')
      .select('id, professional_id, specialty')
      .order('created_at', { ascending: true })
    if (!error && data) setEntries(data as WhitelistEntry[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(specialty: Specialty) {
    const professionalId = inputs[specialty].trim()
    if (!professionalId) return
    setErrors(prev => ({ ...prev, [specialty]: undefined }))
    setAdding(specialty)
    const { error } = await supabase
      .from('specialty_whitelist')
      .insert({ professional_id: professionalId, specialty })
    setAdding(null)
    if (error) {
      setErrors(prev => ({
        ...prev,
        [specialty]: error.code === '23505' ? 'Ya está en la lista' : 'Error al añadir',
      }))
      return
    }
    setInputs(prev => ({ ...prev, [specialty]: '' }))
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

      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPECIALTIES.map(specialty => {
          const list = bySpecialty(specialty)
          const isAdding = adding === specialty
          const inputVal = inputs[specialty]
          const err = errors[specialty]

          return (
            <div key={specialty} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-gray-800">{SPECIALTY_LABEL[specialty]}</h2>

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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={e => {
                      setInputs(prev => ({ ...prev, [specialty]: e.target.value }))
                      if (err) setErrors(prev => ({ ...prev, [specialty]: undefined }))
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAdd(specialty)}
                    placeholder="ENCODED_PROFESSIONAL_ID"
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2cbeff] focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAdd(specialty)}
                    disabled={!inputVal.trim() || isAdding}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#2cbeff] hover:bg-[#1aa8e8] text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Añadir"
                  >
                    <IconPlus size={14} />
                  </button>
                </div>
                {err && <p className="text-xs text-red-500">{err}</p>}
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
