import { Preferences } from '@capacitor/preferences'

/**
 * Persistent key/value storage. Capacitor Preferences uses the platform's
 * native store on Android/iOS and falls back to localStorage on the web, so
 * the same calls work in the PWA and the native shells.
 */
const PREFIX = 'elimupass.portal.'
/** The prefix from when the product was called Educa. */
const OLD_PREFIX = 'educa.portal.'

export const storage = {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key: PREFIX + key })
    if (value !== null) return value

    // Carry a value saved under the old name across once, so the rename does
    // not sign anyone out or forget their preferences.
    const { value: old } = await Preferences.get({ key: OLD_PREFIX + key })
    if (old === null) return null
    await Preferences.set({ key: PREFIX + key, value: old })
    await Preferences.remove({ key: OLD_PREFIX + key })
    return old
  },
  async set(key: string, value: string | null): Promise<void> {
    if (value === null) {
      await Preferences.remove({ key: PREFIX + key })
      // Or get() would bring the old value back.
      await Preferences.remove({ key: OLD_PREFIX + key })
    } else {
      await Preferences.set({ key: PREFIX + key, value })
    }
  },
}

export const StorageKeys = {
  token: 'token',
  /** Unused by the portal (no superadmins); kept so the shared session module compiles unchanged. */
  actingSchool: 'acting_school',
  /** The school slug last typed on the login form. */
} as const
