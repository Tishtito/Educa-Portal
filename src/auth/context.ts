import { createContext } from 'react'
import type { LoginResponse, User } from '@/lib/api/types'
import { clientPlatform, describeDevice } from '@/lib/device'
import type { Permission } from '@/lib/permissions'


/** Which app a session belongs to, on the signed-in devices list. */
export const APP_ID = 'portal'

/** What this device says about itself when it signs in (the API records it on the session). */
export const deviceFields = () => ({ device_name: describeDevice(), app: APP_ID, platform: clientPlatform() })

export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'offline'

export interface LoginInput {
  /** Username or email address. There is no school code: both are unique platform-wide. */
  identity: string
  password: string
}

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  school: { slug: string; name: string } | null
  mustChangePassword: boolean
  /** Whether the user holds ANY of these permissions (the API's `can:`). */
  can: (...permissions: Permission[]) => boolean
  login: (input: LoginInput) => Promise<User>
  /** Signs in with an ID token from Google. The API finds the account; it never creates one. */
  loginWithGoogle: (idToken: string) => Promise<User>
  /** Adopts a token from an invitation or password reset. Throws NotStaffError for administrator-only accounts. */
  signInWithToken: (result: LoginResponse) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  changePassword: (input: { current_password: string; password: string; password_confirmation: string }) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export class NotStaffError extends Error {
  constructor() {
    super('Your account cannot use Educa Staff. School administrators use Educa Admin.')
    this.name = 'NotStaffError'
  }
}

/** The staff portal is for whoever may use it, whatever their role is called. */
export const mayUsePortal = (user: Pick<User, 'permissions'>) => user.permissions.includes('access_staff_portal')
