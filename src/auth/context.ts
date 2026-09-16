import { createContext } from 'react'
import type { LoginResponse, RoleSlug, User } from '@/lib/api/types'

/** Roles that do their work in this app. Administrators use Educa Admin. */
export const STAFF_ROLES: RoleSlug[] = ['class_teacher', 'examiner']

/** The name this app's API tokens carry (visible to the API as the device). */
export const DEVICE_NAME = 'educa-portal'

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
  isClassTeacher: boolean
  isExaminer: boolean
  login: (input: LoginInput) => Promise<User>
  /** Adopts a token from an invitation or password reset. Throws NotStaffError for administrator-only accounts. */
  signInWithToken: (result: LoginResponse) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  changePassword: (input: { current_password: string; password: string; password_confirmation: string }) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export class NotStaffError extends Error {
  constructor() {
    super('This app is for class teachers and examiners. School administrators use Educa Admin.')
    this.name = 'NotStaffError'
  }
}

export const hasStaffRole = (user: Pick<User, 'roles'>) => user.roles.some((role) => STAFF_ROLES.includes(role))
