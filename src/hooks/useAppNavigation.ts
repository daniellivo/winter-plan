import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Custom hook to handle navigation while preserving ENCODED_PROFESSIONAL_ID and token
 * All navigation in the app should use this hook instead of useNavigate directly
 */
export function useAppNavigation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const navigateWithParams = useCallback((path: string) => {
    // Support both ENCODED_PROFESSIONAL_ID (new) and professionalId (legacy)
    const professionalId = searchParams.get('ENCODED_PROFESSIONAL_ID') || searchParams.get('professionalId')
    const token = searchParams.get('token')
    
    // Build query string with new format
    const params = new URLSearchParams()
    if (professionalId) params.set('ENCODED_PROFESSIONAL_ID', professionalId)
    if (token) params.set('token', token)
    
    const queryString = params.toString()
    const fullPath = queryString ? `${path}?${queryString}` : path
    
    navigate(fullPath)
  }, [navigate, searchParams])

  return navigateWithParams
}

