import { readonly, ref } from 'vue'

interface ProfileDetails {
  dateOfBirth: string
  phone: string
  country: string
  city: string
  postalCode: string
  photo: string
  jobTitle: string
  department: string
  timeZone: string
  officeLocation: string
}

const emptyDetails: ProfileDetails = {
  dateOfBirth: '', phone: '', country: '', city: '', postalCode: '', photo: '',
  jobTitle: '', department: '', timeZone: '', officeLocation: '',
}

/** Additional profile fields are local until the account API supports them. */
export function useProfileDetails(userId: number) {
  const storageKey = `titanium.profile-details.${userId}`

  function readDetails(): ProfileDetails {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      const details = { ...emptyDetails }
      if (stored && typeof stored === 'object') {
        for (const key of Object.keys(details) as (keyof ProfileDetails)[]) {
          const value = (stored as Record<string, unknown>)[key]
          if (typeof value === 'string') details[key] = value
        }
        if (!Object.hasOwn(stored, 'officeLocation')) {
          details.officeLocation = [details.city, details.country].filter(Boolean).join(', ')
        }
      }
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(details.photo)) details.photo = ''
      if (details.timeZone) {
        try {
          new Intl.DateTimeFormat('en', { timeZone: details.timeZone })
        } catch {
          details.timeZone = ''
        }
      }
      return details
    } catch {
      return { ...emptyDetails }
    }
  }

  const details = ref(readDetails())

  function saveDetails(changes: Partial<ProfileDetails>): void {
    const updated = { ...details.value, ...changes }
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch {
      throw new Error('These details could not be saved on this browser. Check that browser storage is available or try a smaller photo.')
    }
    details.value = updated
  }

  return { details: readonly(details), saveDetails }
}
