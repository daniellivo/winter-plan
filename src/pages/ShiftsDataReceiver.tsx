import { useState } from 'react'
import { receiveShiftsData, clearStoredShiftsData, getStoredShiftsData } from '../api/winterPlan'
import PrimaryButton from '../components/Buttons/PrimaryButton'
import SecondaryButton from '../components/Buttons/SecondaryButton'

/**
 * Utility page to receive and store shifts data
 * This page allows testing the POST functionality by pasting JSON data
 */
export default function ShiftsDataReceiver() {
  const [jsonInput, setJsonInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [storedCount, setStoredCount] = useState(0)

  // Check stored data on mount
  useState(() => {
    const stored = getStoredShiftsData()
    if (stored) {
      setStoredCount(stored.length)
    }
  })

  const handleSubmit = async () => {
    try {
      setStatus('loading')
      setMessage('')

      // Parse JSON
      const data = JSON.parse(jsonInput)

      // Validate it's an array
      if (!Array.isArray(data)) {
        throw new Error('El JSON debe ser un array de turnos')
      }

      // Send data
      const result = await receiveShiftsData(data)
      
      setStatus('success')
      setMessage(`✅ ${result.count} turnos recibidos y almacenados correctamente`)
      setStoredCount(result.count)
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
    const exampleData = [
      {
        "shiftDetails": {
          "id": "shift_101",
          "professionalId": "pro_123",
          "date": "2025-12-05",
          "startTime": "08:00",
          "endTime": "15:00",
          "unit": "Urgencias",
          "field": "Medicina Interna",
          "description": "Turno dinámico en un entorno de alta actividad.",
          "facility": {
            "id": "fac_145",
            "name": "Hospital Clínic de Barcelona",
            "rating": 4.3,
            "reviewsCount": 28,
            "address": "C. Villarroel 170, 08036",
            "city": "Barcelona",
            "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=hospital+clinic"
          },
          "remuneration": {
            "facilityAmount": 230,
            "bonusAmount": 40,
            "total": 270
          },
          "tags": {
            "parking": false,
            "food": true,
            "cafeteria": true,
            "programa": "casiopea"
          }
        }
      },
      {
        "shiftDetails": {
          "id": "shift_102",
          "professionalId": "pro_123",
          "date": "2025-12-14",
          "startTime": "07:00",
          "endTime": "19:00",
          "unit": "UCI",
          "field": "Críticos",
          "description": "Turno de alta especialización en UCI.",
          "facility": {
            "id": "fac_067",
            "name": "Hospital del Mar",
            "rating": 4.0,
            "reviewsCount": 15,
            "address": "Passeig Marítim 25, 08003",
            "city": "Barcelona",
            "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=hospital+del+mar"
          },
          "remuneration": {
            "facilityAmount": 260,
            "bonusAmount": 35,
            "total": 295
          },
          "tags": {
            "parking": true,
            "food": false,
            "cafeteria": true,
            "programa": "casiopea"
          }
        }
      },
      {
        "shiftDetails": {
          "id": "shift_103",
          "professionalId": "pro_123",
          "date": "2025-12-22",
          "startTime": "15:00",
          "endTime": "23:00",
          "unit": "Hospitalización",
          "field": "Planta de Cirugía",
          "description": "Turno estable en planta.",
          "facility": {
            "id": "fac_203",
            "name": "Hospital Sant Pau",
            "rating": 4.4,
            "reviewsCount": 42,
            "address": "C. Sant Quintí 89, 08041",
            "city": "Barcelona",
            "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=hospital+sant+pau"
          },
          "remuneration": {
            "facilityAmount": 200,
            "bonusAmount": 30,
            "total": 230
          },
          "tags": {
            "parking": false,
            "food": false,
            "cafeteria": true,
            "programa": "casiopea"
          }
        }
      }
    ]
    setJsonInput(JSON.stringify(exampleData, null, 2))
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
            Utilidad para recibir y almacenar datos de turnos mediante POST.
            Los datos se guardan en sessionStorage y se usan automáticamente en el calendario.
          </p>
          
          {storedCount > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                📦 Actualmente hay <strong>{storedCount} turnos</strong> almacenados
              </p>
            </div>
          )}
        </div>

        {/* JSON Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            JSON de Turnos (Array)
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[{"shiftDetails": {...}}, ...]'
            className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <div className="flex gap-3 mt-4">
            <PrimaryButton
              onClick={handleSubmit}
              disabled={status === 'loading' || !jsonInput.trim()}
            >
              {status === 'loading' ? 'Procesando...' : 'Recibir y Almacenar Datos'}
            </PrimaryButton>
            
            <SecondaryButton onClick={handleLoadExample}>
              Cargar Ejemplo
            </SecondaryButton>
            
            {storedCount > 0 && (
              <SecondaryButton onClick={handleClear}>
                Limpiar Datos
              </SecondaryButton>
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
            <li>Pega el JSON con el array de turnos en el campo de texto</li>
            <li>Haz clic en "Recibir y Almacenar Datos"</li>
            <li>Los datos se guardarán en sessionStorage</li>
            <li>Ve al calendario para ver los turnos pintados</li>
            <li>Los datos persisten durante toda la sesión del navegador</li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Nota:</strong> Esta página es solo para desarrollo/testing. 
              En producción, los datos vendrán automáticamente desde tu API o webhook de n8n.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

