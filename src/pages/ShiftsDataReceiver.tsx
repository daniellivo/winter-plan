import { useState, useEffect } from 'react'
import { clearStoredShiftsData, getStoredShiftsData } from '../api/winterPlan'
import PrimaryButton from '../components/Buttons/PrimaryButton'
import SecondaryButton from '../components/Buttons/SecondaryButton'
import { useAppNavigation } from '../hooks/useAppNavigation'

// Storage key (same as in winterPlan.ts)
const SHIFTS_STORAGE_KEY = 'winter_plan_shifts_data'

/**
 * Utility page to receive and store shifts data
 * This page allows testing by pasting JSON data in shiftsByDate format
 */
export default function ShiftsDataReceiver() {
  const navigate = useAppNavigation()
  const [jsonInput, setJsonInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [storedCount, setStoredCount] = useState(0)

  // Check stored data on mount
  useEffect(() => {
    const stored = getStoredShiftsData()
    if (stored) {
      if (stored.isN8n) {
        const n8nData = stored.data as { shiftsByDate: Array<{ shifts: unknown[] }> }
        const count = n8nData.shiftsByDate.reduce((acc, day) => acc + day.shifts.length, 0)
        setStoredCount(count)
      } else {
        const legacyData = stored.data as unknown[]
        setStoredCount(legacyData.length)
      }
    }
  }, [])

  const handleSubmit = async () => {
    try {
      setStatus('loading')
      setMessage('')

      // Parse JSON
      const data = JSON.parse(jsonInput)

      let shiftsCount = 0

      // Check format: shiftsByDate (n8n) or legacy array
      if (data.shiftsByDate && Array.isArray(data.shiftsByDate)) {
        // n8n format: { shiftsByDate: [...] }
        shiftsCount = data.shiftsByDate.reduce(
          (acc: number, day: { shifts?: unknown[] }) => acc + (day.shifts?.length || 0), 
          0
        )
        
        // Store directly in sessionStorage
        sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(data))
        
        setStatus('success')
        setMessage(`✅ ${shiftsCount} turnos en ${data.shiftsByDate.length} fechas almacenados correctamente`)
        setStoredCount(shiftsCount)
      } else if (Array.isArray(data)) {
        // Legacy format: [{ shiftDetails: {...} }, ...]
        shiftsCount = data.length
        sessionStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(data))
        
        setStatus('success')
        setMessage(`✅ ${shiftsCount} turnos almacenados correctamente (formato legacy)`)
        setStoredCount(shiftsCount)
      } else {
        throw new Error('Formato inválido. Debe ser { shiftsByDate: [...] } o un array')
      }

      setJsonInput('') // Clear input on success
    } catch (error) {
      setStatus('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleClear = () => {
    clearStoredShiftsData()
    setStoredCount(0)
    setStatus('idle')
    setMessage('🗑️ Datos eliminados')
  }

  const handleLoadExample = () => {
    // Example in n8n shiftsByDate format
    const exampleData = {
      "shiftsByDate": [
        {
          "date": "2025-12-05",
          "shifts": [
            {
              "id": 95776,
              "facility": {
                "id": 9,
                "name": "Clínica Mi Tres Torres",
                "logo": "https://storage.googleapis.com/livo-backend-prod/facility-images/9-Logo.jpg",
                "address": "Carrer del Dr. Roux, 76, 08017",
                "addressCity": "Barcelona",
                "mapLink": "https://goo.gl/maps/example",
                "facilityReview": {
                  "averageRating": 4.9,
                  "totalReviews": 278
                }
              },
              "localStartTime": "21:45",
              "localFinishTime": "08:00",
              "shiftTimeInDay": "NIGHT_SHIFT",
              "specialization": {
                "displayText": "Hospitalización"
              },
              "unit": "Hospitalización medico-quirúrgica",
              "shiftTotalPay": 270,
              "tags": ["livoBonus"]
            }
          ]
        },
        {
          "date": "2025-12-10",
          "shifts": [
            {
              "id": 95777,
              "facility": {
                "id": 15,
                "name": "Hospital Quirónsalud Barcelona",
                "address": "Plaça d'Alfonso Comín, 5, 08023",
                "addressCity": "Barcelona",
                "mapLink": "https://maps.app.goo.gl/example",
                "facilityReview": {
                  "averageRating": 4.7,
                  "totalReviews": 609
                }
              },
              "localStartTime": "08:00",
              "localFinishTime": "15:00",
              "shiftTimeInDay": "MORNING_SHIFT",
              "specialization": {
                "displayText": "UCI"
              },
              "unit": "Unidad de Cuidados Intensivos",
              "shiftTotalPay": 320,
              "tags": []
            },
            {
              "id": 95778,
              "facility": {
                "id": 9,
                "name": "Clínica Mi Tres Torres",
                "address": "Carrer del Dr. Roux, 76, 08017",
                "addressCity": "Barcelona",
                "facilityReview": {
                  "averageRating": 4.9,
                  "totalReviews": 278
                }
              },
              "localStartTime": "15:00",
              "localFinishTime": "22:00",
              "shiftTimeInDay": "AFTERNOON_SHIFT",
              "specialization": {
                "displayText": "Urgencias"
              },
              "unit": "Urgencias",
              "shiftTotalPay": 285,
              "tags": ["livoBonus"]
            }
          ]
        },
        {
          "date": "2025-12-15",
          "shifts": [
            {
              "id": 95779,
              "facility": {
                "id": 20,
                "name": "Hospital del Mar",
                "address": "Passeig Marítim, 25-29",
                "addressCity": "Barcelona",
                "facilityReview": {
                  "averageRating": 4.5,
                  "totalReviews": 420
                }
              },
              "localStartTime": "07:00",
              "localFinishTime": "14:00",
              "shiftTimeInDay": "MORNING_SHIFT",
              "specialization": {
                "displayText": "Quirófano"
              },
              "unit": "Quirófano General",
              "shiftTotalPay": 350,
              "tags": []
            }
          ]
        }
      ]
    }
    setJsonInput(JSON.stringify(exampleData, null, 2))
  }

  const handleGoToCalendar = () => {
    navigate('/calendar')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📥 Receptor de Datos de Turnos
          </h1>
          <p className="text-sm text-gray-600">
            Pega el JSON con los turnos en formato <code className="bg-gray-100 px-1 rounded">shiftsByDate</code> y guárdalos para verlos en el calendario.
          </p>
          
          {storedCount > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-green-800">
                📦 Actualmente hay <strong>{storedCount} turnos</strong> almacenados
              </p>
              <button
                onClick={handleGoToCalendar}
                className="text-sm text-green-700 hover:text-green-900 font-medium underline"
              >
                Ver calendario →
              </button>
            </div>
          )}
        </div>

        {/* JSON Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            JSON de Turnos (formato shiftsByDate)
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"shiftsByDate": [{"date": "2025-12-05", "shifts": [...]}]}'
            className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <div className="flex flex-wrap gap-3 mt-4">
            <PrimaryButton
              onClick={handleSubmit}
              disabled={status === 'loading' || !jsonInput.trim()}
            >
              {status === 'loading' ? 'Procesando...' : 'Guardar Turnos'}
            </PrimaryButton>
            
            <SecondaryButton onClick={handleLoadExample}>
              Cargar Ejemplo
            </SecondaryButton>
            
            {storedCount > 0 && (
              <>
                <SecondaryButton onClick={handleGoToCalendar}>
                  Ver Calendario 📅
                </SecondaryButton>
                <SecondaryButton onClick={handleClear}>
                  Limpiar Datos
                </SecondaryButton>
              </>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`rounded-lg p-4 ${
            status === 'success' ? 'bg-green-50 border border-green-200' :
            status === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${
              status === 'success' ? 'text-green-800' :
              status === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {message}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            📖 Instrucciones
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Pega el JSON con el formato <code className="bg-gray-100 px-1 rounded">shiftsByDate</code></li>
            <li>Haz clic en "Guardar Turnos"</li>
            <li>Ve al calendario para ver los turnos pintados</li>
            <li>Los datos persisten durante toda la sesión del navegador</li>
          </ol>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Formato esperado:</strong>
            </p>
            <pre className="mt-2 text-xs text-blue-700 overflow-x-auto">
{`{
  "shiftsByDate": [
    {
      "date": "2025-12-05",
      "shifts": [
        {
          "id": 12345,
          "facility": { "name": "Hospital..." },
          "localStartTime": "08:00",
          "localFinishTime": "15:00",
          "shiftTotalPay": 270,
          ...
        }
      ]
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
