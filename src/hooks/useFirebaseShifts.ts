import { useState, useEffect, useCallback } from 'react'
import { 
  doc, 
  onSnapshot, 
  Unsubscribe
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../config/firebase'
import type { WinterPlan, Shift } from '../types/winterPlan'

// Interface for n8n shift data format (shiftsByDate structure)
interface N8nShift {
  id: number | string
  facility: {
    id: number | string
    name: string
    logo?: string
    address?: string
    addressCity?: string
    mapLink?: string
    facilityReview?: {
      averageRating: number
      totalReviews: number
    }
    shiftGuidanceDocumentUrl?: string
    generalInfoDocumentUrl?: string
    allowInternalProsToCancelApprovedClaims?: boolean
  }
  localStartTime: string
  localFinishTime: string
  shiftTimeInDay?: 'MORNING_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_SHIFT'
  specialization?: {
    name?: string
    displayText?: string
  }
  unit?: string
  shiftTotalPay: number
  paymentBreakdown?: Array<{
    label: string
    amount: string
  }>
  tags?: string[]
  details?: string
  status?: string
}

interface N8nShiftsByDate {
  date: string
  shifts: N8nShift[]
}

interface N8nData {
  shiftsByDate: N8nShiftsByDate[]
}

interface UseFirebaseShiftsResult {
  winterPlan: WinterPlan | null
  loading: boolean
  error: string | null
  isConnected: boolean
  lastUpdate: Date | null
}

/**
 * Hook to listen to shifts data in real-time from Firebase Firestore
 * Supports the n8n format with shiftsByDate structure
 * Falls back to null if Firebase is not configured
 */
export function useFirebaseShifts(professionalId: string): UseFirebaseShiftsResult {
  const [winterPlan, setWinterPlan] = useState<WinterPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Get shift label based on time of day
  const getShiftLabel = (shift: N8nShift): string => {
    // First try to use shiftTimeInDay if available
    if (shift.shiftTimeInDay) {
      switch (shift.shiftTimeInDay) {
        case 'MORNING_SHIFT': return 'TM'
        case 'AFTERNOON_SHIFT': return 'TT'
        case 'NIGHT_SHIFT': return 'TN'
      }
    }
    
    // Fallback: determine from localStartTime
    const hour = parseInt(shift.localStartTime.split(':')[0])
    if (hour >= 7 && hour < 14) return 'TM'  // Morning
    if (hour >= 14 && hour < 21) return 'TT' // Afternoon
    return 'TN' // Night
  }

  // Transform n8n data (shiftsByDate format) to WinterPlan format
  const transformN8nToWinterPlan = useCallback((data: N8nData): WinterPlan => {
    // Group shifts by month
    const monthsMap = new Map<string, Map<string, Shift[]>>()
    
    data.shiftsByDate.forEach(({ date, shifts }) => {
      const month = date.substring(0, 7) // YYYY-MM
      
      if (!monthsMap.has(month)) {
        monthsMap.set(month, new Map())
      }
      
      const daysMap = monthsMap.get(month)!
      if (!daysMap.has(date)) {
        daysMap.set(date, [])
      }
      
      shifts.forEach(shift => {
        // Skip shifts that are in waiting list
        if (shift.tags?.includes('inWaitingList')) {
          return
        }
        
        daysMap.get(date)!.push({
          id: String(shift.id),
          label: getShiftLabel(shift),
          startTime: shift.localStartTime,
          endTime: shift.localFinishTime,
          facilityName: shift.facility.name,
          unit: shift.unit || shift.specialization?.displayText || '',
          field: shift.specialization?.displayText || '',
          status: 'pending',
          price: shift.shiftTotalPay
        })
      })
    })
    
    // Convert maps to arrays and sort
    const months = Array.from(monthsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, daysMap]) => ({
        month,
        days: Array.from(daysMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, shifts]) => ({
            date,
            shifts: shifts.sort((a, b) => a.startTime.localeCompare(b.startTime))
          }))
      }))
    
    return {
      professionalId,
      status: 'ready',
      generatedAt: new Date().toISOString(),
      months
    }
  }, [professionalId])

  useEffect(() => {
    // If Firebase is not configured, return early
    if (!isFirebaseConfigured() || !db) {
      console.log('⚠️ Firebase not configured, useFirebaseShifts returning null')
      setLoading(false)
      setIsConnected(false)
      return
    }

    if (!professionalId) {
      setLoading(false)
      return
    }

    console.log('🔥 Setting up Firebase listener for professional:', professionalId)
    setLoading(true)
    setError(null)

    let unsubscribe: Unsubscribe | null = null

    try {
      // Listen to the document for this professional
      // Structure: shifts/{professionalId}
      const docRef = doc(db, 'shifts', professionalId)
      
      unsubscribe = onSnapshot(
        docRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data()
            console.log('📥 Received Firebase update:', data)
            
            // Check for n8n format (shiftsByDate)
            if (data.shiftsByDate && Array.isArray(data.shiftsByDate)) {
              console.log('📋 Detected n8n format (shiftsByDate)')
              const plan = transformN8nToWinterPlan(data as N8nData)
              setWinterPlan(plan)
              setLastUpdate(new Date())
              
              // Store in sessionStorage for offline access
              sessionStorage.setItem('winter_plan_shifts_data', JSON.stringify(data))
              console.log('✅ n8n data transformed and cached:', plan.months.length, 'months')
            } else {
              console.log('⚠️ No shiftsByDate found in Firebase document')
              setWinterPlan(null)
            }
          } else {
            console.log('📭 No document found for professional:', professionalId)
            setWinterPlan(null)
          }
          
          setLoading(false)
          setIsConnected(true)
        },
        (err) => {
          console.error('❌ Firebase listener error:', err)
          setError(err.message)
          setLoading(false)
          setIsConnected(false)
        }
      )

      console.log('✅ Firebase listener established')
    } catch (err) {
      console.error('❌ Failed to set up Firebase listener:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
      setIsConnected(false)
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        console.log('🔌 Unsubscribing from Firebase listener')
        unsubscribe()
      }
    }
  }, [professionalId, transformN8nToWinterPlan])

  return {
    winterPlan,
    loading,
    error,
    isConnected,
    lastUpdate
  }
}

export default useFirebaseShifts
