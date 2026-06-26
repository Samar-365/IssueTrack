/**
 * AuthContext — provides auth state (user, token, loading) and
 * login/logout functions to the entire app via React Context.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ---- Restore session on mount ----
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('user')
      }
      // Validate the token is still valid on the server
      authAPI.me()
        .then((res) => {
          const freshUser = res.data.user
          setUser(freshUser)
          localStorage.setItem('user', JSON.stringify(freshUser))
        })
        .catch(() => {
          // Token expired / invalid
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // ---- Login ----
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password)
    const { access_token, user: userData } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  // ---- Logout ----
  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch {
      // Even if server logout fails, clear local state
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
