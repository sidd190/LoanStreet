'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/lib/auth'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

interface LoginCredentials {
  email: string
  password: string
}

interface UseAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  checkAuth: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })
  const router = useRouter()

  const setUser = useCallback((user: AuthUser | null) => {
    setState(prev => ({ ...prev, user, loading: false, error: null }))
  }, [])

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('userRole', data.user.role)
        
        setUser(data.user)
        return true
      } else {
        setError(data.message || 'Login failed')
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error occurred')
      return false
    }
  }, [setUser, setError, setLoading])

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout endpoint to clear server-side session
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage
      localStorage.removeItem('adminToken')
      localStorage.removeItem('userRole')
      
      setUser(null)
      router.push('/admin')
    }
  }, [setUser, router])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('adminToken', data.token)
        setUser(data.user)
        return true
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
      return false
    }
  }, [setUser, logout])

  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('adminToken')
      
      if (!token) {
        setUser(null)
        return
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.user)
        } else {
          throw new Error('Invalid token')
        }
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshToken()
        if (!refreshed) {
          setUser(null)
        }
      } else {
        throw new Error('Authentication check failed')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('userRole')
      setUser(null)
    }
  }, [setUser, refreshToken])

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Set up token refresh interval
  useEffect(() => {
    if (state.user) {
      // Refresh token every 20 minutes (tokens expire in 24 hours)
      const interval = setInterval(() => {
        refreshToken()
      }, 20 * 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [state.user, refreshToken])

  return {
    ...state,
    login,
    logout,
    refreshToken,
    checkAuth
  }
}