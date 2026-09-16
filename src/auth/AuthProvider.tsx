import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { session } from '@/lib/api/session'
import type { LoginResponse, User } from '@/lib/api/types'
import { AuthContext, DEVICE_NAME, hasStaffRole, NotStaffError, type AuthContextValue, type AuthStatus, type LoginInput } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  const becomeGuest = useCallback(async () => {
    await session.clear()
    queryClient.clear()
    setUser(null)
    setStatus('guest')
  }, [queryClient])

  const loadMe = useCallback(async () => {
    try {
      const me = await api.get<User>('/auth/me', { raw: true })
      if (!hasStaffRole(me)) {
        await becomeGuest()
        return
      }
      setUser(me)
      setStatus('authenticated')
    } catch (error) {
      if (error instanceof ApiError && error.isNetwork) {
        // Keep the token: the device is offline, not signed out.
        setStatus('offline')
        return
      }
      await becomeGuest()
    }
  }, [becomeGuest])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const restored = await session.restore()
      if (cancelled) return
      if (restored.token) await loadMe()
      else setStatus('guest')
    })()
    return () => {
      cancelled = true
    }
  }, [loadMe])

  useEffect(() => {
    const offUnauthorized = session.on('unauthorized', () => void becomeGuest())
    const offPassword = session.on('password-change-required', () =>
      setUser((current) => (current ? { ...current, must_change_password: true } : current)),
    )
    return () => {
      offUnauthorized()
      offPassword()
    }
  }, [becomeGuest])

  /** Adopts a token the API has just issued (sign-in, invitation, password reset). */
  const signInWithToken = useCallback<AuthContextValue['signInWithToken']>(
    async (result) => {
      if (!hasStaffRole(result.user)) {
        // Revoke the token we were just given rather than leave it live.
        await session.setToken(result.token)
        await api.post('/auth/logout', undefined, { raw: true }).catch(() => undefined)
        await session.clear()
        throw new NotStaffError()
      }

      queryClient.clear()
      await session.setToken(result.token)
      setUser(result.user)
      setStatus('authenticated')
      return result.user
    },
    [queryClient],
  )

  const login = useCallback(
    async ({ identity, password }: LoginInput) => {
      const result = await api.post<LoginResponse>('/auth/login', { identity, password, device_name: DEVICE_NAME }, { raw: true })
      return signInWithToken(result)
    },
    [signInWithToken],
  )

  const logout = useCallback(async () => {
    // Tokens never expire server-side, so always revoke.
    await api.post('/auth/logout', undefined, { raw: true }).catch(() => undefined)
    await becomeGuest()
  }, [becomeGuest])

  const changePassword = useCallback<AuthContextValue['changePassword']>(
    async (input) => {
      await api.post('/auth/password', input, { raw: true })
      await loadMe()
    },
    [loadMe],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      school: user?.school ? { slug: user.school.slug, name: user.school.name } : null,
      mustChangePassword: user?.must_change_password ?? false,
      isClassTeacher: user?.roles.includes('class_teacher') ?? false,
      isExaminer: user?.roles.includes('examiner') ?? false,
      login,
      signInWithToken,
      logout,
      refresh: loadMe,
      changePassword,
    }),
    [status, user, login, signInWithToken, logout, loadMe, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
