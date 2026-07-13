import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Permission {
  resource: string
  action: string
}

interface AuthContextType {
  user: User | null
  permissions: Permission[]
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  hasPermission: (resource: string, action: string) => boolean
}

// eslint-disable-next-line react-refresh/only-export-components -- テスト（tests/unit/auth.test.tsx）が Provider を直接使うために公開
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// role 名から role_permissions 経由で resource/action 一覧を取得（Issue #22）
const fetchPermissions = async (role: string): Promise<Permission[]> => {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(resource, action), roles!inner(name)')
    .eq('roles.name', role)

  if (error || !data) {
    console.error('Permission fetch error:', error)
    return []
  }

  return (data as unknown as { permissions: Permission | null }[])
    .map((row) => row.permissions)
    .filter((p): p is Permission => p !== null)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as User
          setUser(parsedUser)
          setPermissions(await fetchPermissions(parsedUser.role))
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const userData = await api.post<User>('/api/auth/login', { email, password })

      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      setPermissions(await fetchPermissions(userData.role))

      return { success: true }
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message }
      }
      console.error('Login error:', error)
      return { success: false, message: 'ログインに失敗しました' }
    }
  }

  const logout = async () => {
    localStorage.removeItem('user')
    setUser(null)
    setPermissions([])
  }

  const hasPermission = (resource: string, action: string) =>
    permissions.some((p) => p.resource === resource && p.action === action)

  const value: AuthContextType = {
    user,
    permissions,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider と useAuth の同居は意図的な設計（Context パターン）
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
