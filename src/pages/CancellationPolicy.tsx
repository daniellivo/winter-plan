import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Layout/Header'
import { getCancellationPolicy } from '../api/winterPlan'
import type { CancellationPolicy as CancellationPolicyType } from '../types/winterPlan'

export default function CancellationPolicy() {
  const { policyId } = useParams<{ policyId: string }>()
  const [policy, setPolicy] = useState<CancellationPolicyType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPolicy()
  }, [policyId])

  const loadPolicy = async () => {
    try {
      setLoading(true)
      const data = await getCancellationPolicy(policyId || 'winter_default')
      setPolicy(data)
    } catch {
      console.error('Failed to load policy')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header title="Política de cancelación" showBack />
        <div className="px-5 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header title="Política de cancelación" showBack />
      
      <div className="px-5 py-6">
        {/* Intro */}
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Antes de solicitar el turno queremos confirmar que estás de acuerdo con la política de cancelación.
        </p>

        <p className="text-sm text-gray-700 mb-6">
          Recuerda que si cancelas:
        </p>

        {/* Policy sections */}
        <div className="space-y-0">
          {policy?.sections.map((section, index) => (
            <div 
              key={index}
              className="border-t border-gray-100 py-4"
            >
              <h3 className="font-bold text-gray-900 text-sm mb-2">
                {section.title}:
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

