import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Custom hook to handle navigation while preserving professionalId and token
 * All navigation in the app should use this hook instead of useNavigate directly
 */
export function useAppNavigation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const navigateWithParams = useCallback((path: string) => {
    const professionalId = searchParams.get('professionalId')
    const token = searchParams.get('token')
    
    // Build query string
    const params = new URLSearchParams()
    if (professionalId) params.set('professionalId', professionalId)
    if (token) params.set('token', token)
    
    const queryString = params.toString()
    const fullPath = queryString ? `${path}?${queryString}` : path
    
    navigate(fullPath)
  }, [navigate, searchParams])

  return navigateWithParams
}

